// Primeira ligação com o Supabase: roda o fluxo da loja contra o SEU projeto e
// diz o que funciona e o que não. Use depois de aplicar a migration e criar o
// projeto (docs/backend.md, "Ligar o Supabase").
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=... npm run check:supabase
//
// O que faz: cria uma prévia, envia uma foto de teste, gera a imagem (IA
// simulada), cria um pedido, lê o pedido de volta pelo painel, gera o arquivo 3D
// (simulado) e BAIXA o arquivo pelo link assinado do Storage. No fim apaga
// tudo o que criou (pedido, prévia, arquivos). Não usa nenhuma IA paga.
//
// O código do armazenamento Supabase (server/store/supabase.ts e
// server/storage/index.ts) foi escrito conforme a migration, mas só este
// script prova que ele funciona de verdade com o banco real.

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
if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY (veja .env.example).");
  process.exit(2);
}

const ctx = createContext({
  ...process.env,
  STORE: "supabase",
  FILES: "supabase",
  IMAGE_PROVIDER: "mock",
  MODEL_PROVIDER: "mock",
  MOCK_DELAY_MS: "0",
  ADMIN_PASSWORD: "check-supabase-" + Math.random().toString(36).slice(2),
  ADMIN_SESSION_SECRET: "check-supabase-" + Math.random().toString(36).slice(2),
  NODE_ENV: "development",
  PREVIEWS_PER_DAY: "100",
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

const session = "check-supabase-" + Math.random().toString(36).slice(2, 12) + "abcdef";
const options = { sizeId: "media", poseId: "sentado", colorId: "branco", petName: "Teste" };
const db = createClient(url, key, { auth: { persistSession: false } });
const created = { orderCode: "", previewIds: [] as string[], paths: [] as string[] };

try {
  // 1. banco: criar prévia
  const preview = await call("POST", "/api/previews", { json: { sessionId: session, options } });
  step("banco: cria a prévia", preview.status === 201, JSON.stringify(preview.data));
  const id = preview.data.id as string;
  created.previewIds.push(id);

  // 2. storage: enviar a foto
  const jpeg = new Uint8Array(4096);
  jpeg.set([0xff, 0xd8, 0xff]);
  const up = await call("PUT", `/api/previews/${id}/photo`, { body: jpeg });
  step("storage: grava a foto no bucket", up.status === 200, JSON.stringify(up.data));

  // 3. gerar e ler de volta
  const started = await call("POST", `/api/previews/${id}/start`);
  step("IA de imagem (simulada): inicia", started.status === 200, JSON.stringify(started.data));
  const done = await call("GET", `/api/previews/${id}`);
  step("a prévia fica pronta e a imagem é gravada no storage", done.data.status === "ready" && !!done.data.imageUrl, JSON.stringify(done.data));
  if (done.data.imageUrl) {
    const image = await fetch(done.data.imageUrl);
    step("o link assinado do storage abre a imagem", image.ok && (image.headers.get("content-type") ?? "").includes("svg"), `status ${image.status}`);
  }

  // 4. pedido (função create_order, atômica)
  const order = await call("POST", "/api/orders", {
    json: { sessionId: session, previewIds: [id], customer: { name: "Teste Automático", city: "Indaiatuba" }, consent: true },
  });
  step("banco: cria o pedido (função create_order)", order.status === 201, JSON.stringify(order.data));
  created.orderCode = order.data.order?.code ?? "";
  const again = await call("POST", "/api/orders", {
    json: { sessionId: session, previewIds: [id], customer: { name: "Teste Automático" }, consent: true },
  });
  step("banco: a mesma prévia em outro pedido é recusada (unique)", again.status === 409, `status ${again.status}`);
  const lookup = await call("GET", `/api/orders/${created.orderCode}?t=${order.data.token}`);
  step("banco: o cliente lê o pedido com o token", lookup.status === 200 && lookup.data.items?.length === 1, JSON.stringify(lookup.data).slice(0, 200));

  // 5. painel
  const login = await call("POST", "/api/admin/login", { json: { password: ctx.config.adminPassword } });
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
  const list = await call("GET", `/api/admin/orders?q=${created.orderCode}`, { cookie });
  step("painel: lista e busca o pedido", list.status === 200 && list.data.total === 1, JSON.stringify(list.data).slice(0, 200));
  const orderId = list.data.orders?.[0]?.id as string;
  const confirmed = await call("PATCH", `/api/admin/orders/${orderId}`, { cookie, json: { status: "confirmed", note: "teste" } });
  step("painel: muda o status e grava o evento", confirmed.status === 200 && confirmed.data.timeline?.length === 2, JSON.stringify(confirmed.data).slice(0, 200));
  const stats = await call("GET", "/api/admin/stats", { cookie });
  step("painel: contagem por status", stats.status === 200 && stats.data.byStatus?.confirmed >= 1);

  // 6. arquivo 3D
  const itemId = confirmed.data.items?.[0]?.id as string;
  const model = `/api/admin/orders/${orderId}/items/${itemId}/model`;
  await call("POST", model, { cookie, json: {} });
  const ready = await call("GET", model, { cookie });
  step("arquivo 3D (simulado) gerado e gravado no storage", ready.data.status === "ready" && !!ready.data.stlUrl, JSON.stringify(ready.data));
  if (ready.data.stlUrl) {
    const stl = await fetch(ready.data.stlUrl);
    const text = await stl.text();
    step("o link assinado do storage baixa o STL", stl.ok && text.startsWith("solid "), `status ${stl.status}`);
  }

  // 7. custos
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
    console.log("(dados de teste apagados)");
  } catch (error) {
    console.error("Não consegui apagar tudo; confira o pedido", created.orderCode, error);
  }
}

console.log(failures ? `\n${failures} verificação(ões) falharam. Veja docs/backend.md.` : "\nTudo certo: o Supabase está pronto para a loja.");
process.exit(failures ? 1 : 0);
