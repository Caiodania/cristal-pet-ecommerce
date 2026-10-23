// Primeira ligação com o Supabase: roda o fluxo da loja contra o SEU projeto e
// diz o que funciona e o que não. Use depois de aplicar as migrations e criar o
// projeto (docs/backend.md, "Ligar o Supabase").
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... npm run check:supabase
//
// O que faz: cria uma conta de teste (já confirmada, pela API de administração
// do Supabase Auth), entra por /api/auth/login, gera uma prévia (foto de teste e
// IA simulada), cria um pedido, lê o pedido de volta pelo painel, gera o arquivo
// 3D (simulado) e BAIXA o arquivo pelo link assinado do Storage. Também prova a
// COTA DE PRÉVIAS no banco real: 8 pedidos ao mesmo tempo, só 3 passam. No fim
// apaga tudo o que criou (conta, pedido, prévias, arquivos). Não usa nenhuma IA
// paga e não manda e-mail.
//
// O código do armazenamento Supabase (server/store/supabase.ts,
// server/storage/index.ts) e do login (server/accounts/supabase.ts) foi escrito
// conforme as migrations e a API do Supabase Auth, mas só este script prova que
// funciona de verdade com o banco real.

import { createClient } from "@supabase/supabase-js";
import { createContext } from "../server/context";
import { handle } from "../server/router";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* sem .env.local */
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
const anon = process.env.SUPABASE_ANON_KEY;
if (!url || !key || !anon) {
  console.error("Defina SUPABASE_URL, SUPABASE_SERVICE_KEY e SUPABASE_ANON_KEY (veja .env.example).");
  process.exit(2);
}

const ctx = createContext({
  ...process.env,
  STORE: "supabase",
  FILES: "supabase",
  AUTH_PROVIDER: "supabase",
  IMAGE_PROVIDER: "mock",
  MODEL_PROVIDER: "mock",
  MOCK_DELAY_MS: "0",
  ADMIN_PASSWORD: "check-supabase-" + Math.random().toString(36).slice(2),
  ADMIN_SESSION_SECRET: "check-supabase-" + Math.random().toString(36).slice(2),
  NODE_ENV: "development",
  PREVIEWS_PER_ACCOUNT: "3",
  PREVIEWS_PER_DAY_PER_IP: "100",
});

let failures = 0;
const step = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "OK   " : "FALHA"} ${name}${detail && !ok ? `  → ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const call = async (method: string, path: string, init: { json?: unknown; body?: Uint8Array; cookie?: string } = {}) => {
  const headers = new Headers({ "x-nf-client-connection-ip": "203.0.113.99" });
  if (init.cookie) headers.set("cookie", init.cookie);
  let body: BodyInit | undefined;
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  } else if (init.body) body = init.body as BodyInit;
  const res = await handle(new Request(`http://localhost:8888${path}`, { method, headers, body }), ctx);
  const text = await res.text();
  let data: any = text; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    data = JSON.parse(text);
  } catch {
    /* não é JSON */
  }
  return { status: res.status, data, headers: res.headers };
};

const email = `check-supabase-${Math.random().toString(36).slice(2, 10)}@example.com`;
const password = "Check-" + Math.random().toString(36).slice(2, 12) + "9";
const options = { sizeId: "media", poseId: "sentado", colorId: "branco", petName: "Teste" };
const db = createClient(url, key, { auth: { persistSession: false } });
const created = { orderCode: "", previewIds: [] as string[], paths: [] as string[], userId: "" };

try {
  // 0. conta de teste: criada já confirmada (a confirmação por e-mail é do Supabase; aqui só importa o resto)
  const made = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: "Teste Automático" } });
  step("auth: cria a conta de teste (API de administração)", !made.error, made.error?.message);
  created.userId = made.data.user?.id ?? "";

  const profile = await db.from("profiles").select().eq("id", created.userId).maybeSingle();
  step("banco: o gatilho do Auth criou o perfil com o nome", profile.data?.email === email && profile.data?.name === "Teste Automático", JSON.stringify(profile));

  // 1. login pela NOSSA API (Supabase Auth confere a senha; a sessão é nossa)
  const wrong = await call("POST", "/api/auth/login", { json: { email, password: "senha-errada-123" } });
  step("login: senha errada é recusada (401, sem cookie)", wrong.status === 401 && !wrong.headers.get("set-cookie"), `status ${wrong.status} ${JSON.stringify(wrong.data)}`);
  const login = await call("POST", "/api/auth/login", { json: { email, password } });
  step("login: e-mail e senha certos entram e devolvem o cookie", login.status === 200 && /^cp_user=/.test(login.headers.get("set-cookie") ?? ""), `status ${login.status} ${JSON.stringify(login.data)}`);
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
  const me = await call("GET", "/api/auth/me", { cookie });
  step("sessão: /api/auth/me reconhece a conta e a cota (3)", me.data.user?.email === email && me.data.quota?.limit === 3, JSON.stringify(me.data));
  const anonymous = await call("POST", "/api/previews", { json: { options } });
  step("sem login não gera prévia (401 login_required)", anonymous.status === 401 && anonymous.data.error?.code === "login_required");

  // 2. banco: criar prévia (reserva da cota, função reserve_preview)
  const preview = await call("POST", "/api/previews", { cookie, json: { options } });
  step("banco: reserva a prévia da cota (função reserve_preview)", preview.status === 201 && preview.data.remaining === 2, JSON.stringify(preview.data));
  const id = preview.data.id as string;
  created.previewIds.push(id);

  // 3. storage: enviar a foto
  const jpeg = new Uint8Array(4096);
  jpeg.set([0xff, 0xd8, 0xff]);
  const up = await call("PUT", `/api/previews/${id}/photo`, { cookie, body: jpeg });
  step("storage: grava a foto no bucket", up.status === 200, JSON.stringify(up.data));

  // 4. gerar e ler de volta
  const started = await call("POST", `/api/previews/${id}/start`, { cookie });
  step("IA de imagem (simulada): inicia", started.status === 200, JSON.stringify(started.data));
  const done = await call("GET", `/api/previews/${id}`, { cookie });
  step("a prévia fica pronta e a imagem é gravada no storage", done.data.status === "ready" && !!done.data.imageUrl, JSON.stringify(done.data));
  if (done.data.imageUrl) {
    const image = await fetch(done.data.imageUrl);
    step("o link assinado do storage abre a imagem", image.ok && (image.headers.get("content-type") ?? "").includes("svg"), `status ${image.status}`);
  }

  // 5. COTA no banco real: 8 pedidos ao mesmo tempo, só 2 passam (já usou 1 de 3)
  const burst = await Promise.all(Array.from({ length: 8 }, () => call("POST", "/api/previews", { cookie, json: { options } })));
  const okIds = burst.filter((r) => r.status === 201).map((r) => r.data.id as string);
  created.previewIds.push(...okIds);
  step(
    "cota: 8 pedidos ao mesmo tempo, só 2 passam (a trava da conta em reserve_preview funciona)",
    okIds.length === 2 && burst.filter((r) => r.status === 403).length === 6,
    burst.map((r) => r.status).join(","),
  );
  const exhausted = await call("GET", "/api/auth/me", { cookie });
  step("cota: a conta aparece com 3 de 3 usadas", exhausted.data.quota?.used === 3 && exhausted.data.quota?.remaining === 0, JSON.stringify(exhausted.data.quota));

  // 6. pedido (função create_order, atômica, com a conta)
  const order = await call("POST", "/api/orders", {
    cookie,
    json: { previewIds: [id], customer: { name: "Teste Automático", city: "Indaiatuba" }, consent: true },
  });
  step("banco: cria o pedido (função create_order)", order.status === 201, JSON.stringify(order.data));
  created.orderCode = order.data.order?.code ?? "";
  const again = await call("POST", "/api/orders", {
    cookie,
    json: { previewIds: [id], customer: { name: "Teste Automático" }, consent: true },
  });
  step("banco: a mesma prévia em outro pedido é recusada (unique)", again.status === 409, `status ${again.status}`);
  const lookup = await call("GET", `/api/orders/${created.orderCode}?t=${order.data.token}`);
  step("banco: o cliente lê o pedido com o token", lookup.status === 200 && lookup.data.items?.length === 1, JSON.stringify(lookup.data).slice(0, 200));
  const mine = await call("GET", "/api/me/orders", { cookie });
  step("conta: 'meus pedidos' lista o pedido da conta", mine.status === 200 && mine.data.orders?.[0]?.code === created.orderCode, JSON.stringify(mine.data).slice(0, 200));

  // 7. painel
  const adminLogin = await call("POST", "/api/admin/login", { json: { password: ctx.config.adminPassword } });
  const admin = (adminLogin.headers.get("set-cookie") ?? "").split(";")[0];
  const list = await call("GET", `/api/admin/orders?q=${created.orderCode}`, { cookie: admin });
  step("painel: lista e busca o pedido", list.status === 200 && list.data.total === 1, JSON.stringify(list.data).slice(0, 200));
  const orderId = list.data.orders?.[0]?.id as string;
  const confirmed = await call("PATCH", `/api/admin/orders/${orderId}`, { cookie: admin, json: { status: "confirmed", note: "teste" } });
  step("painel: muda o status e grava o evento", confirmed.status === 200 && confirmed.data.timeline?.length === 2, JSON.stringify(confirmed.data).slice(0, 200));
  step("painel: o pedido mostra a conta que o fez", confirmed.data.accountEmail === email, String(confirmed.data.accountEmail));
  const stats = await call("GET", "/api/admin/stats", { cookie: admin });
  step("painel: contagem por status", stats.status === 200 && stats.data.byStatus?.confirmed >= 1);
  const grant = await call("PATCH", `/api/admin/users/${created.userId}`, { cookie: admin, json: { bonusPreviews: 2 } });
  step("painel: libera 2 prévias extras para a conta", grant.status === 200 && grant.data.previewsLimit === 5 && grant.data.previewsUsed === 3, JSON.stringify(grant.data));
  const after = await call("POST", "/api/previews", { cookie, json: { options } });
  if (after.status === 201) created.previewIds.push(after.data.id);
  step("cota: com o bônus, a conta volta a poder gerar", after.status === 201, `status ${after.status}`);

  // 8. arquivo 3D
  const itemId = confirmed.data.items?.[0]?.id as string;
  const model = `/api/admin/orders/${orderId}/items/${itemId}/model`;
  await call("POST", model, { cookie: admin, json: {} });
  const ready = await call("GET", model, { cookie: admin });
  step("arquivo 3D (simulado) gerado e gravado no storage", ready.data.status === "ready" && !!ready.data.stlUrl, JSON.stringify(ready.data));
  if (ready.data.stlUrl) {
    const stl = await fetch(ready.data.stlUrl);
    const text = await stl.text();
    step("o link assinado do storage baixa o STL", stl.ok && text.startsWith("solid "), `status ${stl.status}`);
  }

  // 9. sair
  const out = await call("POST", "/api/auth/logout", { cookie, json: {} });
  const gone = await call("GET", "/api/auth/me", { cookie });
  step("logout: a sessão deixa de valer", out.status === 200 && gone.data.user === null);

  // 10. custos
  const spent = await ctx.store.sumCosts(new Date(Date.now() - 24 * 3600 * 1000));
  step("banco: a função sum_costs responde", Number.isFinite(spent));
} catch (error) {
  step("execução sem exceção", false, error instanceof Error ? error.message : String(error));
} finally {
  // limpeza: nada do teste fica no seu banco
  try {
    if (created.orderCode) await db.from("orders").delete().eq("code", created.orderCode);
    for (const previewId of created.previewIds) {
      const { data } = await db.from("previews").select("photo_path,image_path,stl_path,glb_path").eq("public_id", previewId).maybeSingle();
      for (const p of Object.values(data ?? {})) if (typeof p === "string") created.paths.push(p);
      await db.from("previews").delete().eq("public_id", previewId);
    }
    if (created.paths.length) await db.storage.from(ctx.config.supabaseBucket).remove(created.paths);
    // apagar o usuário do Auth leva o perfil e as sessões junto (cascata)
    if (created.userId) await db.auth.admin.deleteUser(created.userId);
    console.log("(dados de teste apagados)");
  } catch (error) {
    console.error("Não consegui apagar tudo; confira o pedido", created.orderCode, "e a conta", email, error);
  }
}

console.log(failures ? `\n${failures} verificação(ões) falharam. Veja docs/backend.md.` : "\nTudo certo: o Supabase está pronto para a loja.");
process.exit(failures ? 1 : 0);
