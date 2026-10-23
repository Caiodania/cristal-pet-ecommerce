import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MemoryAuth } from "../accounts/memory";
import {
  CUSTOMER,
  OPTIONS,
  USER_PASSWORD,
  adminCookie,
  call,
  fakeJpeg,
  makeCtx,
  readyPreview,
} from "./helpers";

const cookieOf = (res: { headers: Headers }) => res.headers.get("set-cookie")!.split(";")[0];

const signup = (ctx: Parameters<typeof call>[0], over: Record<string, unknown> = {}, ip = "198.51.100.1") =>
  call(ctx, "POST", "/api/auth/signup", {
    anonymous: true,
    ip,
    json: { name: "Maria Souza", email: "maria@exemplo.com", password: USER_PASSWORD, ...over },
  });

describe("cadastro", () => {
  it("cria a conta, já entra (cookie HttpOnly, SameSite=Strict) e mostra a cota", async () => {
    const { ctx } = makeCtx();
    const res = await signup(ctx);
    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, "maria@exemplo.com");
    assert.equal(res.body.user.name, "Maria Souza");
    assert.deepEqual(res.body.quota, { limit: 3, used: 0, remaining: 3 });
    assert.equal(res.body.needsVerification, false);
    const cookie = res.headers.get("set-cookie")!;
    assert.match(cookie, /^cp_user=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Max-Age=2592000/); // 30 dias

    const me = await call(ctx, "GET", "/api/auth/me", { cookie: cookieOf(res) });
    assert.equal(me.body.user.email, "maria@exemplo.com");
    assert.equal(me.body.quota.remaining, 3);
  });

  it("não devolve a senha nem o hash em lugar nenhum", async () => {
    const { ctx } = makeCtx();
    const res = await signup(ctx);
    const text = JSON.stringify(res.body) + (res.headers.get("set-cookie") ?? "");
    assert.ok(!text.includes(USER_PASSWORD));
    assert.ok(!/scrypt/.test(text));
  });

  it("valida e-mail, senha e nome", async () => {
    const { ctx } = makeCtx();
    const cases: [Record<string, unknown>, RegExp][] = [
      [{ email: "sem-arroba" }, /e-mail válido/],
      [{ email: "a@b" }, /e-mail válido/],
      [{ password: "curta1" }, /8 caracteres/],
      [{ password: "12345678" }, /letras/],
      [{ password: "password" }, /comum/],
      [{ password: "a".repeat(73) }, /no máximo 72/],
      [{ name: "" }, /nome/],
      [{ name: "A" }, /nome/],
    ];
    let n = 0;
    for (const [over, message] of cases) {
      // cada tentativa de uma rede diferente: o limite de cadastros por rede é outro teste
      const res = await signup(ctx, over, `198.51.100.${(n += 1)}`);
      assert.equal(res.status, 400, JSON.stringify(over));
      assert.match(res.body.error.message, message);
    }
  });

  it("e-mail é comparado sem diferenciar maiúsculas e espaços", async () => {
    const { ctx } = makeCtx();
    assert.equal((await signup(ctx, { email: "  Maria@Exemplo.COM " })).status, 201);
    const again = await signup(ctx, { email: "maria@exemplo.com" }, "198.51.100.2");
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, "email_taken");
  });

  it("limita cadastros por rede", async () => {
    const { ctx } = makeCtx();
    for (let i = 0; i < 6; i++) {
      assert.equal((await signup(ctx, { email: `p${i}@exemplo.com` })).status, 201);
    }
    const blocked = await signup(ctx, { email: "p7@exemplo.com" });
    assert.equal(blocked.status, 429);
    // outra rede não é afetada
    assert.equal((await signup(ctx, { email: "p8@exemplo.com" }, "198.51.100.77")).status, 201);
  });
});

describe("login e sessão", () => {
  it("entra com e-mail e senha corretos", async () => {
    const { ctx } = makeCtx();
    await signup(ctx);
    const res = await call(ctx, "POST", "/api/auth/login", {
      anonymous: true,
      json: { email: "MARIA@exemplo.com", password: USER_PASSWORD },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, "maria@exemplo.com");
    assert.match(res.headers.get("set-cookie")!, /^cp_user=.+HttpOnly/);
  });

  it("senha errada e e-mail inexistente dão a MESMA resposta (não revela quem tem conta)", async () => {
    const { ctx } = makeCtx();
    await signup(ctx);
    const wrong = await call(ctx, "POST", "/api/auth/login", {
      anonymous: true,
      json: { email: "maria@exemplo.com", password: "outra-senha-errada" },
    });
    const unknown = await call(ctx, "POST", "/api/auth/login", {
      anonymous: true,
      json: { email: "ninguem@exemplo.com", password: "outra-senha-errada" },
    });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
    assert.equal(wrong.headers.get("set-cookie"), null);
  });

  it("limita tentativas de login por conta e por rede", async () => {
    const { ctx } = makeCtx();
    await signup(ctx);
    for (let i = 0; i < 8; i++) {
      const r = await call(ctx, "POST", "/api/auth/login", {
        anonymous: true,
        json: { email: "maria@exemplo.com", password: "errada-errada" },
      });
      assert.equal(r.status, 401);
    }
    // a 9ª tentativa é barrada mesmo com a senha certa
    const blocked = await call(ctx, "POST", "/api/auth/login", {
      anonymous: true,
      json: { email: "maria@exemplo.com", password: USER_PASSWORD },
    });
    assert.equal(blocked.status, 429);
  });

  it("sair encerra a sessão no servidor: o mesmo cookie deixa de valer", async () => {
    const { ctx } = makeCtx();
    const cookie = cookieOf(await signup(ctx));
    const out = await call(ctx, "POST", "/api/auth/logout", { cookie, json: {} });
    assert.equal(out.status, 200);
    assert.match(out.headers.get("set-cookie")!, /Max-Age=0/);
    const me = await call(ctx, "GET", "/api/auth/me", { cookie });
    assert.equal(me.body.user, null);
  });

  it("a sessão vence depois de 30 dias", async () => {
    const { ctx, clock } = makeCtx();
    const cookie = cookieOf(await signup(ctx));
    clock.ms += 29 * 24 * 3600 * 1000;
    assert.ok((await call(ctx, "GET", "/api/auth/me", { cookie })).body.user);
    clock.ms += 2 * 24 * 3600 * 1000;
    assert.equal((await call(ctx, "GET", "/api/auth/me", { cookie })).body.user, null);
  });

  it("cookie inventado ou adulterado não vale", async () => {
    const { ctx } = makeCtx();
    const cookie = cookieOf(await signup(ctx));
    assert.equal((await call(ctx, "GET", "/api/auth/me", { cookie: "cp_user=inventado" })).body.user, null);
    assert.equal((await call(ctx, "GET", "/api/auth/me", { cookie: cookie + "x" })).body.user, null);
    assert.equal((await call(ctx, "GET", "/api/auth/me")).body.user, null);
  });

  it("só o hash do token fica no banco", async () => {
    const { ctx } = makeCtx();
    const res = await signup(ctx);
    const token = decodeURIComponent(cookieOf(res).split("=")[1]);
    const { sha256Hex } = await import("../crypto");
    assert.equal(await ctx.store.getSession(token), null); // o token em si não é a chave
    assert.ok(await ctx.store.getSession(sha256Hex(token)));
  });

  it("recusa chamadas de outro site (CSRF) mesmo com cookie válido", async () => {
    const { ctx } = makeCtx();
    const cookie = cookieOf(await signup(ctx));
    const res = await call(ctx, "POST", "/api/auth/logout", {
      cookie,
      headers: { origin: "https://site-malicioso.example" },
      json: {},
    });
    assert.equal(res.status, 403);
    assert.ok((await call(ctx, "GET", "/api/auth/me", { cookie })).body.user);
  });
});

describe("confirmação de e-mail (como em produção)", () => {
  const outbox = (ctx: Parameters<typeof call>[0]) => (ctx.auth as MemoryAuth).outbox;

  it("sem confirmar não entra; com o link do e-mail, entra", async () => {
    const { ctx } = makeCtx({ AUTH_MEMORY_VERIFY: "1" });
    const res = await signup(ctx);
    assert.equal(res.status, 202);
    assert.equal(res.body.needsVerification, true);
    assert.equal(res.body.user, null);
    assert.equal(res.headers.get("set-cookie"), null);

    const early = await call(ctx, "POST", "/api/auth/login", {
      anonymous: true,
      json: { email: "maria@exemplo.com", password: USER_PASSWORD },
    });
    assert.equal(early.status, 403);
    assert.equal(early.body.error.code, "email_not_verified");

    assert.equal(outbox(ctx).length, 1);
    assert.match(outbox(ctx)[0].link, /\/confirmar#access_token=.+&type=signup/);
    const confirmed = await call(ctx, "POST", "/api/auth/confirm", {
      anonymous: true,
      json: { accessToken: outbox(ctx)[0].token },
    });
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.user.email, "maria@exemplo.com");
    assert.match(confirmed.headers.get("set-cookie")!, /^cp_user=/);

    const later = await call(ctx, "POST", "/api/auth/login", {
      anonymous: true,
      json: { email: "maria@exemplo.com", password: USER_PASSWORD },
    });
    assert.equal(later.status, 200);
  });

  it("cadastrar de novo um e-mail que já existe responde igual (não revela a conta)", async () => {
    const { ctx } = makeCtx({ AUTH_MEMORY_VERIFY: "1" });
    await signup(ctx);
    const again = await signup(ctx, {}, "198.51.100.2");
    assert.equal(again.status, 202);
    assert.equal(again.body.needsVerification, true);
  });

  it("reenvia o e-mail de confirmação, sem dizer se a conta existe", async () => {
    const { ctx } = makeCtx({ AUTH_MEMORY_VERIFY: "1" });
    await signup(ctx);
    const known = await call(ctx, "POST", "/api/auth/resend", { anonymous: true, json: { email: "maria@exemplo.com" } });
    const unknown = await call(ctx, "POST", "/api/auth/resend", { anonymous: true, json: { email: "ninguem@exemplo.com" } });
    assert.equal(known.status, 202);
    assert.equal(unknown.status, 202);
    assert.equal(outbox(ctx).length, 2); // o do cadastro e o reenvio; nada para quem não existe
  });

  it("link inválido ou inventado é recusado", async () => {
    const { ctx } = makeCtx({ AUTH_MEMORY_VERIFY: "1" });
    for (const accessToken of ["curto", "x".repeat(40), "com espaço no meio aqui", undefined]) {
      const res = await call(ctx, "POST", "/api/auth/confirm", { anonymous: true, json: { accessToken } });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, "invalid_token");
    }
  });

  it("o link de confirmação vence depois de 1 hora", async () => {
    const { ctx, clock } = makeCtx({ AUTH_MEMORY_VERIFY: "1" });
    await signup(ctx);
    clock.ms += 61 * 60 * 1000;
    const res = await call(ctx, "POST", "/api/auth/confirm", { anonymous: true, json: { accessToken: outbox(ctx)[0].token } });
    assert.equal(res.status, 400);
  });
});

describe("esqueci a senha", () => {
  const outbox = (ctx: Parameters<typeof call>[0]) => (ctx.auth as MemoryAuth).outbox;

  it("responde igual para e-mail com e sem conta, e só manda e-mail a quem tem", async () => {
    const { ctx } = makeCtx();
    await signup(ctx);
    const known = await call(ctx, "POST", "/api/auth/forgot", { anonymous: true, json: { email: "maria@exemplo.com" } });
    const unknown = await call(ctx, "POST", "/api/auth/forgot", { anonymous: true, json: { email: "ninguem@exemplo.com" } });
    assert.equal(known.status, 202);
    assert.deepEqual(known.body, unknown.body);
    assert.equal(outbox(ctx).length, 1);
    assert.match(outbox(ctx)[0].link, /\/redefinir-senha#access_token=.+&type=recovery/);
  });

  it("redefine a senha com o link, já entra, derruba as outras sessões e o link só vale uma vez", async () => {
    const { ctx } = makeCtx();
    const oldCookie = cookieOf(await signup(ctx));
    await call(ctx, "POST", "/api/auth/forgot", { anonymous: true, json: { email: "maria@exemplo.com" } });
    const token = outbox(ctx)[0].token;

    const reset = await call(ctx, "POST", "/api/auth/reset", {
      anonymous: true,
      json: { accessToken: token, password: "nova-senha-melhor-9" },
    });
    assert.equal(reset.status, 200);
    assert.match(reset.headers.get("set-cookie")!, /^cp_user=/);

    // a sessão antiga caiu; a nova funciona
    assert.equal((await call(ctx, "GET", "/api/auth/me", { cookie: oldCookie })).body.user, null);
    assert.ok((await call(ctx, "GET", "/api/auth/me", { cookie: cookieOf(reset) })).body.user);

    // a senha antiga não serve mais; a nova serve
    const oldLogin = await call(ctx, "POST", "/api/auth/login", {
      anonymous: true,
      json: { email: "maria@exemplo.com", password: USER_PASSWORD },
    });
    assert.equal(oldLogin.status, 401);
    const newLogin = await call(ctx, "POST", "/api/auth/login", {
      anonymous: true,
      json: { email: "maria@exemplo.com", password: "nova-senha-melhor-9" },
    });
    assert.equal(newLogin.status, 200);

    // o mesmo link não vale de novo
    const reuse = await call(ctx, "POST", "/api/auth/reset", {
      anonymous: true,
      json: { accessToken: token, password: "mais-uma-senha-boa-3" },
    });
    assert.equal(reuse.status, 400);
  });

  it("recusa senha fraca na redefinição, sem gastar o link", async () => {
    const { ctx } = makeCtx();
    await signup(ctx);
    await call(ctx, "POST", "/api/auth/forgot", { anonymous: true, json: { email: "maria@exemplo.com" } });
    const token = outbox(ctx)[0].token;
    const weak = await call(ctx, "POST", "/api/auth/reset", { anonymous: true, json: { accessToken: token, password: "123" } });
    assert.equal(weak.status, 400);
    const ok = await call(ctx, "POST", "/api/auth/reset", { anonymous: true, json: { accessToken: token, password: "senha-forte-7a" } });
    assert.equal(ok.status, 200);
  });

  it("um link de confirmação não serve para redefinir senha", async () => {
    const { ctx } = makeCtx({ AUTH_MEMORY_VERIFY: "1" });
    await signup(ctx);
    const res = await call(ctx, "POST", "/api/auth/reset", {
      anonymous: true,
      json: { accessToken: outbox(ctx)[0].token, password: "senha-forte-7a" },
    });
    assert.equal(res.status, 400);
  });

  it("limita pedidos de recuperação por e-mail", async () => {
    const { ctx } = makeCtx();
    for (let i = 0; i < 3; i++) {
      assert.equal((await call(ctx, "POST", "/api/auth/forgot", { anonymous: true, json: { email: "maria@exemplo.com" } })).status, 202);
    }
    assert.equal((await call(ctx, "POST", "/api/auth/forgot", { anonymous: true, json: { email: "maria@exemplo.com" } })).status, 429);
  });
});

describe("cota de prévias da conta", () => {
  it("duas prévias pedidas ao mesmo tempo nunca passam do limite", async () => {
    const { ctx } = makeCtx({ PREVIEWS_PER_ACCOUNT: "3", PREVIEWS_PER_DAY_PER_IP: "100" });
    const cookie = cookieOf(await signup(ctx));
    const results = await Promise.all(
      Array.from({ length: 8 }, () => call(ctx, "POST", "/api/previews", { cookie, json: { options: OPTIONS } })),
    );
    assert.equal(results.filter((r) => r.status === 201).length, 3);
    assert.equal(results.filter((r) => r.status === 403).length, 5);
  });

  it("o dono libera prévias extras e a conta passa a ter mais", async () => {
    const { ctx } = makeCtx({ PREVIEWS_PER_ACCOUNT: "1" });
    const res = await signup(ctx);
    const cookie = cookieOf(res);
    const userId = res.body.user.id as string;
    assert.equal((await call(ctx, "POST", "/api/previews", { cookie, json: { options: OPTIONS } })).status, 201);
    assert.equal((await call(ctx, "POST", "/api/previews", { cookie, json: { options: OPTIONS } })).status, 403);

    const admin = await adminCookie(ctx);
    const granted = await call(ctx, "PATCH", `/api/admin/users/${userId}`, { cookie: admin, json: { bonusPreviews: 2 } });
    assert.equal(granted.status, 200);
    assert.equal(granted.body.previewsLimit, 3);
    assert.equal(granted.body.previewsUsed, 1);

    const me = await call(ctx, "GET", "/api/auth/me", { cookie });
    assert.deepEqual(me.body.quota, { limit: 3, used: 1, remaining: 2 });
    assert.equal((await call(ctx, "POST", "/api/previews", { cookie, json: { options: OPTIONS } })).status, 201);
  });
});

describe("pedido e conta", () => {
  it("pedido exige login", async () => {
    const { ctx } = makeCtx();
    const res = await call(ctx, "POST", "/api/orders", {
      anonymous: true,
      json: { previewIds: ["x"], customer: CUSTOMER, consent: true },
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "login_required");
  });

  it("'meus pedidos' lista só os da conta, com o link de acompanhamento", async () => {
    const { ctx } = makeCtx();
    const mine = await readyPreview(ctx);
    const created = await call(ctx, "POST", "/api/orders", { json: { previewIds: [mine], customer: CUSTOMER, consent: true } });
    assert.equal(created.status, 201);
    const theirs = await readyPreview(ctx, { as: "outra@exemplo.com" });
    await call(ctx, "POST", "/api/orders", { as: "outra@exemplo.com", json: { previewIds: [theirs], customer: CUSTOMER, consent: true } });

    const list = await call(ctx, "GET", "/api/me/orders");
    assert.equal(list.status, 200);
    assert.equal(list.body.orders.length, 1);
    assert.equal(list.body.orders[0].code, created.body.order.code);
    assert.equal(list.body.orders[0].token, created.body.token);
    assert.equal(list.body.orders[0].itemCount, 1);

    const anonymous = await call(ctx, "GET", "/api/me/orders", { anonymous: true });
    assert.equal(anonymous.status, 401);
  });

  it("o painel do dono mostra a conta que fez o pedido e lista as contas", async () => {
    const { ctx } = makeCtx();
    const preview = await readyPreview(ctx);
    const created = await call(ctx, "POST", "/api/orders", { json: { previewIds: [preview], customer: CUSTOMER, consent: true } });
    const admin = await adminCookie(ctx);
    const orders = await call(ctx, "GET", "/api/admin/orders", { cookie: admin });
    const detail = await call(ctx, "GET", `/api/admin/orders/${orders.body.orders[0].id}`, { cookie: admin });
    assert.equal(detail.body.accountEmail, "ana@exemplo.com");
    assert.equal(detail.body.code, created.body.order.code);

    const users = await call(ctx, "GET", "/api/admin/users?q=ana", { cookie: admin });
    assert.equal(users.body.total, 1);
    assert.equal(users.body.users[0].email, "ana@exemplo.com");
    assert.equal(users.body.users[0].previewsUsed, 1);
    assert.equal(users.body.users[0].orderCount, 1);
  });

  it("as rotas de contas do painel exigem o login do dono", async () => {
    const { ctx } = makeCtx();
    const userCookie = cookieOf(await signup(ctx));
    assert.equal((await call(ctx, "GET", "/api/admin/users", { cookie: userCookie })).status, 401);
    assert.equal((await call(ctx, "PATCH", "/api/admin/users/x", { cookie: userCookie, json: { bonusPreviews: 5 } })).status, 401);
    const admin = await adminCookie(ctx);
    const bad = await call(ctx, "PATCH", "/api/admin/users/x", { cookie: admin, json: { bonusPreviews: -1 } });
    assert.equal(bad.status, 400);
    const missing = await call(ctx, "PATCH", "/api/admin/users/00000000-0000-0000-0000-000000000000", {
      cookie: admin,
      json: { bonusPreviews: 1 },
    });
    assert.equal(missing.status, 404);
  });

  it("a foto da prévia continua indo para a conta certa (upload exige login)", async () => {
    const { ctx } = makeCtx();
    const created = await call(ctx, "POST", "/api/previews", { json: { options: OPTIONS } });
    const anon = await call(ctx, "PUT", `/api/previews/${created.body.id}/photo`, { anonymous: true, body: fakeJpeg() as BodyInit });
    assert.equal(anon.status, 401);
  });
});

describe("configuração do login", () => {
  it("o botão do Google só aparece quando ligado e com Supabase configurado", async () => {
    const off = makeCtx({ SUPABASE_URL: "https://abc.supabase.co", SUPABASE_ANON_KEY: "x", AUTH_PROVIDER: "memory" });
    assert.equal((await call(off.ctx, "GET", "/api/config")).body.googleLoginUrl, undefined);

    const on = makeCtx({
      SUPABASE_URL: "https://abc.supabase.co",
      SUPABASE_ANON_KEY: "x",
      AUTH_PROVIDER: "memory",
      AUTH_GOOGLE: "1",
      SITE_URL: "https://loja.example",
    });
    const url = (await call(on.ctx, "GET", "/api/config")).body.googleLoginUrl as string;
    assert.match(url, /^https:\/\/abc\.supabase\.co\/auth\/v1\/authorize\?provider=google&redirect_to=/);
    assert.ok(url.includes(encodeURIComponent("https://loja.example/confirmar")));
  });

  it("em produção não sobe com o login simulado", () => {
    assert.throws(
      () => makeCtx({ NODE_ENV: "production", STORE: "memory", ALLOW_MEMORY_STORE: undefined }),
      /não podem ficar em memória|login não pode ser o simulado/,
    );
    assert.throws(
      () => makeCtx({ AUTH_PROVIDER: "supabase" }),
      /SUPABASE_URL e SUPABASE_ANON_KEY/,
    );
    assert.throws(() => makeCtx({ AUTH_PROVIDER: "outro" }), /AUTH_PROVIDER/);
  });
});
