import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CUSTOMER,
  OPTIONS,
  SESSION,
  adminCookie,
  call,
  fakeJpeg,
  makeCtx,
  readyPreview,
} from "./helpers";

describe("config", () => {
  it("avisa que está em modo demonstração quando os provedores são simulados", async () => {
    const { ctx } = makeCtx();
    const res = await call(ctx, "GET", "/api/config");
    assert.equal(res.status, 200);
    assert.equal(res.body.mode, "demo");
    assert.equal(res.body.imageProvider.name, "mock");
    assert.equal(res.body.previewsPerDay, 3);
  });

  it("recusa provedor que não existe, dizendo quais há", () => {
    assert.throws(() => makeCtx({ IMAGE_PROVIDER: "inexistente" }), /não está registrado.*mock/s);
  });

  it("não sobe em produção com os dados em memória", () => {
    assert.throws(
      () => makeCtx({ NODE_ENV: "production" }),
      /não podem ficar em memória/,
    );
  });
});

describe("prévia (foto → imagem da escultura)", () => {
  it("percorre o fluxo inteiro e entrega uma imagem pelo link assinado", async () => {
    const { ctx } = makeCtx();
    const id = await readyPreview(ctx);
    const res = await call(ctx, "GET", `/api/previews/${id}`);
    assert.equal(res.body.status, "ready");
    assert.match(res.body.imageUrl, /^\/api\/files\//);
    const file = await call(ctx, "GET", res.body.imageUrl);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get("content-type"), "image/svg+xml");
    assert.match(file.headers.get("content-security-policy")!, /sandbox/);
    assert.match(await file.raw.text(), /PRÉVIA DE DEMONSTRAÇÃO/);
  });

  it("escapa o nome do pet no SVG (nada de injeção)", async () => {
    const { ctx } = makeCtx();
    const id = await readyPreview(ctx, { options: { ...OPTIONS, petName: `<script>alert(1)</script>` } });
    const res = await call(ctx, "GET", `/api/previews/${id}`);
    const svg = await (await call(ctx, "GET", res.body.imageUrl)).raw.text();
    assert.ok(!svg.includes("<script>"));
    assert.ok(svg.includes("&lt;script&gt;"));
  });

  it("recusa opções que não existem no catálogo", async () => {
    const { ctx } = makeCtx();
    const res = await call(ctx, "POST", "/api/previews", {
      json: { sessionId: SESSION, options: { ...OPTIONS, sizeId: "gigante" } },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "invalid_input");
  });

  it("recusa sessão inválida", async () => {
    const { ctx } = makeCtx();
    const res = await call(ctx, "POST", "/api/previews", { json: { sessionId: "x", options: OPTIONS } });
    assert.equal(res.status, 400);
  });

  it("valida a foto pelos bytes, não pelo que o navegador diz", async () => {
    const { ctx } = makeCtx();
    const created = await call(ctx, "POST", "/api/previews", { json: { sessionId: SESSION, options: OPTIONS } });
    const id = created.body.id;

    const text = await call(ctx, "PUT", `/api/previews/${id}/photo`, {
      body: new Uint8Array(4096).fill(65) as BodyInit,
      headers: { "content-type": "image/jpeg" },
    });
    assert.equal(text.status, 400);
    assert.equal(text.body.error.code, "invalid_photo");

    const tiny = await call(ctx, "PUT", `/api/previews/${id}/photo`, { body: fakeJpeg(100) as BodyInit });
    assert.equal(tiny.status, 400);

    const huge = await call(ctx, "PUT", `/api/previews/${id}/photo`, { body: fakeJpeg(6 * 1024 * 1024) as BodyInit });
    assert.equal(huge.status, 413);
  });

  it("não deixa gerar sem foto, nem enviar duas fotos", async () => {
    const { ctx } = makeCtx();
    const id = (await call(ctx, "POST", "/api/previews", { json: { sessionId: SESSION, options: OPTIONS } })).body.id;
    const early = await call(ctx, "POST", `/api/previews/${id}/start`);
    assert.equal(early.status, 409);
    assert.equal(early.body.error.code, "photo_missing");
    await call(ctx, "PUT", `/api/previews/${id}/photo`, { body: fakeJpeg() as BodyInit });
    const second = await call(ctx, "PUT", `/api/previews/${id}/photo`, { body: fakeJpeg() as BodyInit });
    assert.equal(second.status, 409);
  });

  it("aplica a cota diária por visitante e conta a que resta", async () => {
    const { ctx } = makeCtx({ PREVIEWS_PER_DAY: "2" });
    const first = await call(ctx, "POST", "/api/previews", { json: { sessionId: SESSION, options: OPTIONS } });
    assert.equal(first.body.remaining, 1);
    const second = await call(ctx, "POST", "/api/previews", { json: { sessionId: SESSION, options: OPTIONS } });
    assert.equal(second.body.remaining, 0);
    const third = await call(ctx, "POST", "/api/previews", { json: { sessionId: SESSION, options: OPTIONS } });
    assert.equal(third.status, 429);
    assert.equal(third.body.error.code, "quota_exceeded");
    // outro visitante não é afetado
    const other = await call(ctx, "POST", "/api/previews", {
      json: { sessionId: "outra-sessao-abcdef123456", options: OPTIONS },
    });
    assert.equal(other.status, 201);
  });

  it("a cota volta depois de 24 horas", async () => {
    const { ctx, clock } = makeCtx({ PREVIEWS_PER_DAY: "1" });
    await call(ctx, "POST", "/api/previews", { json: { sessionId: SESSION, options: OPTIONS } });
    const blocked = await call(ctx, "POST", "/api/previews", { json: { sessionId: SESSION, options: OPTIONS } });
    assert.equal(blocked.status, 429);
    clock.ms += 25 * 60 * 60 * 1000;
    const again = await call(ctx, "POST", "/api/previews", { json: { sessionId: SESSION, options: OPTIONS } });
    assert.equal(again.status, 201);
  });

  it("aplica a cota por rede (IP), mesmo trocando de sessão", async () => {
    const { ctx } = makeCtx({ PREVIEWS_PER_DAY_PER_IP: "2", PREVIEWS_PER_DAY: "10" });
    for (let i = 0; i < 2; i++) {
      const r = await call(ctx, "POST", "/api/previews", {
        json: { sessionId: `sessao-numero-${i}-abcdefghij`, options: OPTIONS },
      });
      assert.equal(r.status, 201);
    }
    const blocked = await call(ctx, "POST", "/api/previews", {
      json: { sessionId: "sessao-numero-9-abcdefghij", options: OPTIONS },
    });
    assert.equal(blocked.status, 429);
  });

  it("corta quando o teto diário de gasto com IA é atingido", async () => {
    const { ctx } = makeCtx({ PREVIEW_DAILY_BUDGET_CENTS: "100" });
    // simula um gasto de R$ 1,00 já feito hoje
    const created = await ctx.store.createPreview({
      publicId: "gasto-anterior",
      sessionId: "outra-sessao-abcdef123456",
      ipHash: "x",
      options: OPTIONS,
      imageProvider: "mock",
    });
    await ctx.store.updatePreview(created.publicId, { imageCostCents: 100 });
    const res = await call(ctx, "POST", "/api/previews", { json: { sessionId: SESSION, options: OPTIONS } });
    assert.equal(res.status, 503);
    assert.equal(res.body.error.code, "budget_exceeded");
    assert.match(res.body.error.message, /WhatsApp/);
  });

  it("falha do provedor: avisa e permite tentar de novo", async () => {
    const { ctx } = makeCtx();
    const id = (
      await call(ctx, "POST", "/api/previews", { json: { sessionId: SESSION, options: { ...OPTIONS, petName: "falhaimg" } } })
    ).body.id;
    await call(ctx, "PUT", `/api/previews/${id}/photo`, { body: fakeJpeg() as BodyInit });
    await call(ctx, "POST", `/api/previews/${id}/start`);
    const polled = await call(ctx, "GET", `/api/previews/${id}`);
    assert.equal(polled.body.status, "failed");
    assert.equal(polled.body.errorCode, "provider_error");
    const retry = await call(ctx, "POST", `/api/previews/${id}/start`);
    assert.equal(retry.status, 200);
    assert.equal(retry.body.status, "generating");
  });

  it("foto recusada: NÃO permite repetir com a mesma foto", async () => {
    const { ctx } = makeCtx();
    const id = (
      await call(ctx, "POST", "/api/previews", { json: { sessionId: SESSION, options: { ...OPTIONS, petName: "recusar" } } })
    ).body.id;
    await call(ctx, "PUT", `/api/previews/${id}/photo`, { body: fakeJpeg() as BodyInit });
    await call(ctx, "POST", `/api/previews/${id}/start`);
    const polled = await call(ctx, "GET", `/api/previews/${id}`);
    assert.equal(polled.body.status, "rejected");
    const retry = await call(ctx, "POST", `/api/previews/${id}/start`);
    assert.equal(retry.status, 409);
  });

  it("desiste de uma geração que demora demais", async () => {
    const { ctx, clock } = makeCtx({ MOCK_DELAY_MS: "999999999", GENERATION_TIMEOUT_MS: "60000" });
    const id = (await call(ctx, "POST", "/api/previews", { json: { sessionId: SESSION, options: OPTIONS } })).body.id;
    await call(ctx, "PUT", `/api/previews/${id}/photo`, { body: fakeJpeg() as BodyInit });
    await call(ctx, "POST", `/api/previews/${id}/start`);
    assert.equal((await call(ctx, "GET", `/api/previews/${id}`)).body.status, "generating");
    clock.ms += 61_000;
    const late = await call(ctx, "GET", `/api/previews/${id}`);
    assert.equal(late.body.status, "failed");
    assert.equal(late.body.errorCode, "timeout");
  });

  it("gera outra com a mesma foto e outras opções, sem novo upload", async () => {
    const { ctx } = makeCtx();
    const id = await readyPreview(ctx);
    const again = await call(ctx, "POST", `/api/previews/${id}/regenerate`, {
      json: { sessionId: SESSION, options: { ...OPTIONS, colorId: "preto" } },
    });
    assert.equal(again.status, 201);
    assert.notEqual(again.body.id, id);
    assert.equal(again.body.status, "generating");
    assert.equal(again.body.options.colorId, "preto");
    assert.equal(again.body.remaining, 1); // 3 por dia: já usou 2
    const polled = await call(ctx, "GET", `/api/previews/${again.body.id}`);
    assert.equal(polled.body.status, "ready");
  });

  it("não deixa outro visitante regerar a prévia de alguém", async () => {
    const { ctx } = makeCtx();
    const id = await readyPreview(ctx);
    const res = await call(ctx, "POST", `/api/previews/${id}/regenerate`, {
      json: { sessionId: "intruso-abcdefghijklmnop" },
    });
    assert.equal(res.status, 404);
  });
});

describe("pedido", () => {
  it("cria o pedido, devolve código e token, e o recalcula no servidor", async () => {
    const { ctx } = makeCtx();
    const preview = await readyPreview(ctx);
    const res = await call(ctx, "POST", "/api/orders", {
      json: {
        sessionId: SESSION,
        previewIds: [preview],
        customer: CUSTOMER,
        consent: true,
        // o navegador tenta mandar um preço: deve ser ignorado
        estimateCents: 1,
        items: [{ unitCents: 1 }],
      },
    });
    assert.equal(res.status, 201);
    assert.match(res.body.order.code, /^CP-[A-HJ-NP-Z2-9]{6}$/);
    assert.ok(res.body.token.length >= 30);
    // catálogo provisório sem preços: valor "a combinar"
    assert.equal(res.body.order.estimateCents, null);
    assert.equal(res.body.order.items[0].unitCents, null);
    assert.equal(res.body.order.status, "new");
    assert.equal(res.body.order.items[0].poseId, "sentado");
    assert.equal(res.body.order.items[0].petName, "Thor");
  });

  it("exige o aceite da política de privacidade e um nome", async () => {
    const { ctx } = makeCtx();
    const preview = await readyPreview(ctx);
    const noConsent = await call(ctx, "POST", "/api/orders", {
      json: { sessionId: SESSION, previewIds: [preview], customer: CUSTOMER },
    });
    assert.equal(noConsent.status, 400);
    assert.equal(noConsent.body.error.code, "consent_required");
    const noName = await call(ctx, "POST", "/api/orders", {
      json: { sessionId: SESSION, previewIds: [preview], customer: { phone: "" }, consent: true },
    });
    assert.equal(noName.status, 400);
  });

  it("valida o telefone quando informado", async () => {
    const { ctx } = makeCtx();
    const preview = await readyPreview(ctx);
    const res = await call(ctx, "POST", "/api/orders", {
      json: { sessionId: SESSION, previewIds: [preview], customer: { name: "Ana", phone: "123" }, consent: true },
    });
    assert.equal(res.status, 400);
  });

  it("recusa carrinho vazio, prévia de outra sessão e prévia ainda não pronta", async () => {
    const { ctx } = makeCtx();
    const empty = await call(ctx, "POST", "/api/orders", {
      json: { sessionId: SESSION, previewIds: [], customer: CUSTOMER, consent: true },
    });
    assert.equal(empty.status, 400);

    const preview = await readyPreview(ctx);
    const stolen = await call(ctx, "POST", "/api/orders", {
      json: { sessionId: "intruso-abcdefghijklmnop", previewIds: [preview], customer: CUSTOMER, consent: true },
    });
    assert.equal(stolen.status, 404);

    const pending = (await call(ctx, "POST", "/api/previews", { json: { sessionId: SESSION, options: OPTIONS } })).body.id;
    const notReady = await call(ctx, "POST", "/api/orders", {
      json: { sessionId: SESSION, previewIds: [pending], customer: CUSTOMER, consent: true },
    });
    assert.equal(notReady.status, 409);
    assert.equal(notReady.body.error.code, "preview_not_ready");
  });

  it("uma prévia só vale em um pedido", async () => {
    const { ctx } = makeCtx();
    const preview = await readyPreview(ctx);
    const body = { sessionId: SESSION, previewIds: [preview], customer: CUSTOMER, consent: true };
    assert.equal((await call(ctx, "POST", "/api/orders", { json: body })).status, 201);
    const again = await call(ctx, "POST", "/api/orders", { json: body });
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, "preview_used");
  });

  it("o cliente acompanha com o token e não vê dados internos", async () => {
    const { ctx } = makeCtx();
    const preview = await readyPreview(ctx);
    const created = await call(ctx, "POST", "/api/orders", {
      json: { sessionId: SESSION, previewIds: [preview], customer: CUSTOMER, consent: true },
    });
    const { code } = created.body.order;
    const token = created.body.token;

    const ok = await call(ctx, "GET", `/api/orders/${code}?t=${token}`);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.code, code);
    assert.equal(ok.body.customerName, "Maria Souza");
    assert.ok(!("customerPhone" in ok.body));
    assert.ok(!("adminNotes" in ok.body));
    assert.ok(ok.body.items[0].imageUrl);

    // minúsculas funcionam; token errado, ausente ou código inexistente: mesma resposta 404
    assert.equal((await call(ctx, "GET", `/api/orders/${code.toLowerCase()}?t=${token}`)).status, 200);
    assert.equal((await call(ctx, "GET", `/api/orders/${code}?t=errado`)).status, 404);
    assert.equal((await call(ctx, "GET", `/api/orders/${code}`)).status, 404);
    assert.equal((await call(ctx, "GET", `/api/orders/CP-AAAAAA?t=${token}`)).status, 404);
  });
});

describe("painel do dono", () => {
  const makeOrder = async (ctx: Parameters<typeof call>[0]) => {
    const preview = await readyPreview(ctx);
    const res = await call(ctx, "POST", "/api/orders", {
      json: { sessionId: SESSION, previewIds: [preview], customer: CUSTOMER, consent: true },
    });
    return { code: res.body.order.code as string, token: res.body.token as string };
  };

  it("exige login em todas as rotas do painel", async () => {
    const { ctx } = makeCtx();
    for (const [method, path] of [
      ["GET", "/api/admin/orders"],
      ["GET", "/api/admin/stats"],
      ["GET", "/api/admin/orders/qualquer-id"],
      ["PATCH", "/api/admin/orders/qualquer-id"],
      ["POST", "/api/admin/orders/x/items/y/model"],
    ]) {
      const res = await call(ctx, method, path, { json: method === "GET" ? undefined : {} });
      assert.equal(res.status, 401, `${method} ${path}`);
    }
    assert.equal((await call(ctx, "GET", "/api/admin/me")).body.admin, false);
  });

  it("login: senha errada 401, certa devolve cookie HttpOnly e SameSite=Strict", async () => {
    const { ctx } = makeCtx();
    const wrong = await call(ctx, "POST", "/api/admin/login", { json: { password: "errada" } });
    assert.equal(wrong.status, 401);
    const ok = await call(ctx, "POST", "/api/admin/login", { json: { password: "senha-de-teste-123" } });
    assert.equal(ok.status, 200);
    const cookie = ok.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.equal((await call(ctx, "GET", "/api/admin/me", { cookie: cookie.split(";")[0] })).body.admin, true);
  });

  it("limita tentativas de login", async () => {
    const { ctx } = makeCtx();
    let last = 0;
    for (let i = 0; i < 8; i++) {
      last = (await call(ctx, "POST", "/api/admin/login", { json: { password: `errada-${i}` } })).status;
    }
    assert.equal(last, 429);
    // e a senha certa também fica bloqueada nesse IP durante a janela
    assert.equal((await call(ctx, "POST", "/api/admin/login", { json: { password: "senha-de-teste-123" } })).status, 429);
  });

  it("painel desligado se não houver senha configurada", async () => {
    const { ctx } = makeCtx({ ADMIN_PASSWORD: "" });
    const res = await call(ctx, "POST", "/api/admin/login", { json: { password: "qualquer" } });
    assert.equal(res.status, 503);
    assert.equal(res.body.error.code, "admin_disabled");
  });

  it("cookie expira e adulterado não vale", async () => {
    const { ctx, clock } = makeCtx({ ADMIN_SESSION_TTL_SECONDS: "60" });
    const cookie = await adminCookie(ctx);
    assert.equal((await call(ctx, "GET", "/api/admin/me", { cookie })).body.admin, true);
    const tampered = cookie.replace(/.$/, (c) => (c === "A" ? "B" : "A"));
    assert.equal((await call(ctx, "GET", "/api/admin/me", { cookie: tampered })).body.admin, false);
    clock.ms += 61_000;
    assert.equal((await call(ctx, "GET", "/api/admin/me", { cookie })).body.admin, false);
  });

  it("recusa mudanças vindas de outro site (CSRF) mesmo com cookie válido", async () => {
    const { ctx } = makeCtx();
    const cookie = await adminCookie(ctx);
    const res = await call(ctx, "POST", "/api/admin/logout", {
      cookie,
      headers: { origin: "https://site-malicioso.example" },
    });
    assert.equal(res.status, 403);
    const same = await call(ctx, "POST", "/api/admin/logout", {
      cookie,
      headers: { origin: "http://localhost:8888" },
    });
    assert.equal(same.status, 200);
  });

  it("lista, filtra, busca e conta os pedidos", async () => {
    const { ctx } = makeCtx();
    const cookie = await adminCookie(ctx);
    await makeOrder(ctx);
    const second = await makeOrder(ctx);

    const list = await call(ctx, "GET", "/api/admin/orders", { cookie });
    assert.equal(list.body.total, 2);
    assert.equal(list.body.orders[0].itemCount, 1);
    assert.ok(list.body.orders[0].thumbUrl);

    const byCode = await call(ctx, "GET", `/api/admin/orders?q=${second.code}`, { cookie });
    assert.equal(byCode.body.total, 1);
    const byName = await call(ctx, "GET", "/api/admin/orders?q=souza", { cookie });
    assert.equal(byName.body.total, 2);
    const none = await call(ctx, "GET", "/api/admin/orders?q=ninguem", { cookie });
    assert.equal(none.body.total, 0);
    assert.equal((await call(ctx, "GET", "/api/admin/orders?status=bogus", { cookie })).status, 400);

    const stats = await call(ctx, "GET", "/api/admin/stats", { cookie });
    assert.equal(stats.body.byStatus.new, 2);
    assert.equal(stats.body.total, 2);
  });

  it("detalhe do pedido traz telefone, foto original e anotações (só para o dono)", async () => {
    const { ctx } = makeCtx();
    const cookie = await adminCookie(ctx);
    await makeOrder(ctx);
    const id = (await call(ctx, "GET", "/api/admin/orders", { cookie })).body.orders[0].id;
    const res = await call(ctx, "GET", `/api/admin/orders/${id}`, { cookie });
    assert.equal(res.body.customerPhone, "19999991234");
    assert.equal(res.body.notes, "Presente");
    assert.ok(res.body.items[0].photoUrl);
    assert.ok(res.body.items[0].imageUrl);
    assert.equal(res.body.items[0].model.status, "none");
  });

  it("muda o status só por transições permitidas e registra a linha do tempo", async () => {
    const { ctx } = makeCtx();
    const cookie = await adminCookie(ctx);
    const { code, token } = await makeOrder(ctx);
    const id = (await call(ctx, "GET", "/api/admin/orders", { cookie })).body.orders[0].id;

    const skip = await call(ctx, "PATCH", `/api/admin/orders/${id}`, { cookie, json: { status: "delivered" } });
    assert.equal(skip.status, 409);
    assert.equal(skip.body.error.code, "invalid_transition");

    const confirmed = await call(ctx, "PATCH", `/api/admin/orders/${id}`, {
      cookie,
      json: { status: "confirmed", note: "Pix recebido", adminNotes: "Cliente prefere entrega aos sábados" },
    });
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.status, "confirmed");
    assert.equal(confirmed.body.adminNotes, "Cliente prefere entrega aos sábados");

    for (const status of ["in_production", "ready", "delivered"]) {
      assert.equal((await call(ctx, "PATCH", `/api/admin/orders/${id}`, { cookie, json: { status } })).status, 200);
    }
    // entregue é final
    assert.equal((await call(ctx, "PATCH", `/api/admin/orders/${id}`, { cookie, json: { status: "canceled" } })).status, 409);

    const customer = await call(ctx, "GET", `/api/orders/${code}?t=${token}`);
    assert.deepEqual(
      customer.body.timeline.map((e: { status: string }) => e.status),
      ["new", "confirmed", "in_production", "ready", "delivered"],
    );
    assert.equal(customer.body.timeline[1].note, "Pix recebido");
    assert.ok(!("adminNotes" in customer.body));
  });

  it("cancelado pode ser reaberto", async () => {
    const { ctx } = makeCtx();
    const cookie = await adminCookie(ctx);
    await makeOrder(ctx);
    const id = (await call(ctx, "GET", "/api/admin/orders", { cookie })).body.orders[0].id;
    await call(ctx, "PATCH", `/api/admin/orders/${id}`, { cookie, json: { status: "canceled" } });
    const reopened = await call(ctx, "PATCH", `/api/admin/orders/${id}`, { cookie, json: { status: "new" } });
    assert.equal(reopened.body.status, "new");
  });

  it("gera o arquivo 3D sob demanda e entrega o STL para baixar", async () => {
    const { ctx } = makeCtx();
    const cookie = await adminCookie(ctx);
    const { code, token } = await makeOrder(ctx);
    const order = (await call(ctx, "GET", "/api/admin/orders", { cookie })).body.orders[0];
    const detail = (await call(ctx, "GET", `/api/admin/orders/${order.id}`, { cookie })).body;
    const itemId = detail.items[0].id;
    const base = `/api/admin/orders/${order.id}/items/${itemId}/model`;

    const started = await call(ctx, "POST", base, { cookie, json: {} });
    assert.equal(started.status, 202);
    assert.equal(started.body.status, "processing");
    // pedir de novo enquanto processa não duplica o trabalho
    assert.equal((await call(ctx, "POST", base, { cookie, json: {} })).body.status, "processing");

    const done = await call(ctx, "GET", base, { cookie });
    assert.equal(done.body.status, "ready");
    assert.match(done.body.stlUrl, /^\/api\/files\//);

    const stl = await call(ctx, "GET", done.body.stlUrl);
    assert.equal(stl.status, 200);
    assert.match(stl.headers.get("content-disposition")!, new RegExp(`attachment; filename="${code}-Thor\\.stl"`));
    const text = await stl.raw.text();
    assert.ok(text.startsWith("solid "));
    assert.ok(text.includes("facet normal"));

    // o custo e o andamento aparecem no detalhe; o cliente NÃO vê notas internas
    const after = (await call(ctx, "GET", `/api/admin/orders/${order.id}`, { cookie })).body;
    assert.equal(after.items[0].model.status, "ready");
    assert.ok(after.timeline.some((e: { note?: string }) => e.note?.startsWith("[interno]")));
    const customer = await call(ctx, "GET", `/api/orders/${code}?t=${token}`);
    assert.ok(customer.body.timeline.every((e: { note?: string }) => !e.note?.startsWith("[interno]")));
  });

  it("falha na geração do arquivo 3D aparece e permite tentar de novo", async () => {
    const { ctx } = makeCtx();
    const cookie = await adminCookie(ctx);
    const preview = await readyPreview(ctx, { options: { ...OPTIONS, petName: "falha3d" } });
    await call(ctx, "POST", "/api/orders", {
      json: { sessionId: SESSION, previewIds: [preview], customer: CUSTOMER, consent: true },
    });
    const order = (await call(ctx, "GET", "/api/admin/orders", { cookie })).body.orders[0];
    const itemId = (await call(ctx, "GET", `/api/admin/orders/${order.id}`, { cookie })).body.items[0].id;
    const base = `/api/admin/orders/${order.id}/items/${itemId}/model`;
    await call(ctx, "POST", base, { cookie, json: {} });
    const failed = await call(ctx, "GET", base, { cookie });
    assert.equal(failed.body.status, "failed");
    assert.match(failed.body.errorMessage, /Falha simulada/);
    const retry = await call(ctx, "POST", base, { cookie, json: {} });
    assert.equal(retry.body.status, "processing");
  });

  it("MODEL_AUTO=order gera o arquivo 3D assim que o pedido chega", async () => {
    const { ctx } = makeCtx({ MODEL_AUTO: "order" });
    const cookie = await adminCookie(ctx);
    await makeOrder(ctx);
    const order = (await call(ctx, "GET", "/api/admin/orders", { cookie })).body.orders[0];
    const detail = (await call(ctx, "GET", `/api/admin/orders/${order.id}`, { cookie })).body;
    assert.equal(detail.items[0].model.status, "processing");
  });

  it("MODEL_AUTO=confirmed gera o arquivo 3D ao confirmar", async () => {
    const { ctx } = makeCtx({ MODEL_AUTO: "confirmed" });
    const cookie = await adminCookie(ctx);
    await makeOrder(ctx);
    const order = (await call(ctx, "GET", "/api/admin/orders", { cookie })).body.orders[0];
    assert.equal((await call(ctx, "GET", `/api/admin/orders/${order.id}`, { cookie })).body.items[0].model.status, "none");
    await call(ctx, "PATCH", `/api/admin/orders/${order.id}`, { cookie, json: { status: "confirmed" } });
    assert.equal((await call(ctx, "GET", `/api/admin/orders/${order.id}`, { cookie })).body.items[0].model.status, "processing");
  });
});

describe("HTTP", () => {
  it("404 para rota desconhecida, 405 para método errado, JSON inválido 400", async () => {
    const { ctx } = makeCtx();
    assert.equal((await call(ctx, "GET", "/api/nao-existe")).status, 404);
    assert.equal((await call(ctx, "DELETE", "/api/config")).status, 405);
    const bad = await call(ctx, "POST", "/api/previews", { body: "{ não é json", headers: { "content-type": "application/json" } });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, "invalid_json");
  });

  it("HEAD funciona como GET, sem corpo", async () => {
    const { ctx } = makeCtx();
    const head = await call(ctx, "HEAD", "/api/config");
    assert.equal(head.status, 200);
    assert.equal(await head.raw.text(), "");
    assert.equal((await call(ctx, "HEAD", "/api/previews")).status, 405); // rota só de POST
  });

  it("todas as respostas saem sem cache e com nosniff", async () => {
    const { ctx } = makeCtx();
    const res = await call(ctx, "GET", "/api/config");
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  });

  it("CORS só para origens liberadas (desenvolvimento)", async () => {
    const { ctx } = makeCtx({ ALLOWED_ORIGINS: "http://localhost:3000" });
    const allowed = await call(ctx, "GET", "/api/config", { headers: { origin: "http://localhost:3000" } });
    assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:3000");
    assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");
    const denied = await call(ctx, "GET", "/api/config", { headers: { origin: "https://outro.example" } });
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
  });

  it("link de arquivo adulterado ou expirado não abre", async () => {
    const { ctx } = makeCtx();
    const id = await readyPreview(ctx);
    const url = (await call(ctx, "GET", `/api/previews/${id}`)).body.imageUrl as string;
    assert.equal((await call(ctx, "GET", url)).status, 200);
    assert.equal((await call(ctx, "GET", `${url}x`)).status, 404);
    assert.equal((await call(ctx, "GET", "/api/files/lixo.lixo")).status, 404);
  });
});
