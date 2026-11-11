// Valida as migrations do Supabase (0001 + 0002 + 0003) num Postgres de verdade (PGlite, WASM),
// sem precisar de projeto nem de internet: gatilho do Auth, cota de prévias
// (reserve_preview), pedido com conta e endereço de entrega, cascatas e RLS.
//
//   npm run test:sql
//
// Não prova concorrência (o PGlite tem uma conexão só): a trava da linha da conta
// em reserve_preview é conferida no `npm run check:supabase`, num banco real.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../../supabase/migrations/", import.meta.url);
const db = new PGlite();

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "OK   " : "FALHA"} ${name}${!ok && detail ? "  → " + detail : ""}`);
  if (!ok) failures += 1;
};
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const all = async (sql, params) => (await db.query(sql, params)).rows;
const fails = async (sql, params) => {
  try {
    await db.query(sql, params);
    return null;
  } catch (e) {
    return e;
  }
};

// o que o Supabase já traz: schemas auth e storage
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
`);

await db.exec(readFileSync(new URL("0001_init.sql", root), "utf8"));
check("0001 aplica", true);
await db.exec(readFileSync(new URL("0002_contas.sql", root), "utf8"));
check("0002 aplica por cima da 0001", true);
await db.exec(readFileSync(new URL("0003_envio.sql", root), "utf8"));
check("0003 aplica por cima da 0002", true);

// ───────── gatilho do Auth → perfil ─────────
const { id: anaId } = await one(`insert into auth.users (email, raw_user_meta_data) values ('ana@x.com', '{"name":"Ana Souza"}') returning id`);
const profile = await one(`select * from profiles where id = $1`, [anaId]);
check("gatilho: usuário novo do Auth ganha perfil com e-mail e nome", profile?.email === "ana@x.com" && profile?.name === "Ana Souza" && profile?.bonus_previews === 0, JSON.stringify(profile));
const { id: bruId } = await one(`insert into auth.users (email) values ('bru@x.com') returning id`);
check("gatilho: sem nome nos metadados, o nome fica nulo", (await one(`select name from profiles where id = $1`, [bruId])).name === null);

// ───────── reserve_preview ─────────
const reserve = (user, n) =>
  db.query(`select reserve_preview($1::jsonb, 3) as id`, [JSON.stringify({ public_id: `p-${user}-${n}`, user_id: user, ip_hash: "h", options: { sizeId: "media", poseId: "sentado", colorId: "branco" }, image_provider: "mock" })]);

for (let i = 1; i <= 3; i++) await reserve(anaId, i);
check("reserve_preview: as 3 primeiras passam", (await one(`select count(*)::int n from previews where user_id = $1`, [anaId])).n === 3);
const over = await fails(`select reserve_preview($1::jsonb, 3)`, [JSON.stringify({ public_id: "p-4", user_id: anaId, ip_hash: "h", options: {}, image_provider: "mock" })]);
check("reserve_preview: a 4ª é recusada com quota_exceeded", over?.message?.includes("quota_exceeded"), over?.message);
check("reserve_preview: o detalhe traz usadas/limite (o servidor lê)", over?.detail === "3/3", over?.detail);
check("reserve_preview: a recusada não cria linha", (await one(`select count(*)::int n from previews where user_id = $1`, [anaId])).n === 3);
check("reserve_preview: outra conta tem a sua cota", !(await fails(`select reserve_preview($1::jsonb, 3)`, [JSON.stringify({ public_id: "bru-1", user_id: bruId, ip_hash: "h", options: {}, image_provider: "mock" })])));

// quem conta e quem não conta
await db.query(`update previews set status = 'failed' where public_id = 'p-' || $1 || '-1'`, [anaId]);
check("falha libera a vaga", !(await fails(`select reserve_preview($1::jsonb, 3)`, [JSON.stringify({ public_id: "p-5", user_id: anaId, ip_hash: "h", options: {}, image_provider: "mock" })])));
await db.query(`update previews set status = 'rejected' where public_id = 'p-' || $1 || '-2'`, [anaId]);
check("foto recusada libera a vaga", !(await fails(`select reserve_preview($1::jsonb, 3)`, [JSON.stringify({ public_id: "p-6", user_id: anaId, ip_hash: "h", options: {}, image_provider: "mock" })])));
const blocked = await fails(`select reserve_preview($1::jsonb, 3)`, [JSON.stringify({ public_id: "p-7", user_id: anaId, ip_hash: "h", options: {}, image_provider: "mock" })]);
check("com 3 contando de novo, volta a recusar", blocked?.message?.includes("quota_exceeded"));
await db.query(`update previews set status = 'expired' where public_id = 'p-' || $1 || '-3'`, [anaId]);
check("prévia expirada continua contando", (await fails(`select reserve_preview($1::jsonb, 3)`, [JSON.stringify({ public_id: "p-8", user_id: anaId, ip_hash: "h", options: {}, image_provider: "mock" })]))?.message?.includes("quota_exceeded"));

// queued há mais de 1 h não conta
await db.query(`update previews set status = 'queued', created_at = now() - interval '2 hours' where public_id = 'p-' || $1 || '-3'`, [anaId]);
check("reserva sem foto há mais de 1 h libera a vaga", !(await fails(`select reserve_preview($1::jsonb, 3)`, [JSON.stringify({ public_id: "p-9", user_id: anaId, ip_hash: "h", options: {}, image_provider: "mock" })])));

// bônus
await db.query(`update profiles set bonus_previews = 2 where id = $1`, [anaId]);
check("bônus soma ao limite", !(await fails(`select reserve_preview($1::jsonb, 3)`, [JSON.stringify({ public_id: "p-10", user_id: anaId, ip_hash: "h", options: {}, image_provider: "mock" })])));
check("bônus não pode ser negativo", !!(await fails(`update profiles set bonus_previews = -1 where id = $1`, [anaId])));

const ghost = await fails(`select reserve_preview($1::jsonb, 3)`, [JSON.stringify({ public_id: "x", user_id: "00000000-0000-4000-8000-000000000000", ip_hash: "h", options: {}, image_provider: "mock" })]);
check("conta que não existe: erro claro", ghost?.message?.includes("profile_not_found"), ghost?.message);

// ───────── create_order com conta ─────────
const { id: previewId } = await one(`select id from previews where user_id = $1 and status = 'queued' limit 1`, [anaId]);
const orderId = (await one(`select create_order($1::jsonb, $2::jsonb) as id`, [
  JSON.stringify({ code: "CP-AAA111", view_token: "tok", user_id: anaId, customer_name: "Ana", consent_at: new Date().toISOString() }),
  JSON.stringify([{ preview_id: previewId, size_id: "media", pose_id: "sentado", color_id: "branco", catalog_version: "t" }]),
])).id;
check("create_order grava a conta que fez o pedido", (await one(`select user_id from orders where id = $1`, [orderId])).user_id === anaId);
const anon = (await one(`select create_order($1::jsonb, '[]'::jsonb) as id`, [JSON.stringify({ code: "CP-BBB222", view_token: "t2", consent_at: new Date().toISOString() })])).id;
check("create_order sem conta continua aceito (pedidos antigos)", (await one(`select user_id from orders where id = $1`, [anon])).user_id === null);

// ───────── envio (0003) ─────────
const address = { cep: "13330000", street: "Rua México", number: "311", neighborhood: "Centro", city: "Indaiatuba", state: "SP" };
const { id: bruPreview } = await one(
  `select reserve_preview($1::jsonb, 3) as id`,
  [JSON.stringify({ public_id: "bru-envio", user_id: bruId, ip_hash: "h", options: {}, image_provider: "mock" })],
);
const shipped = (
  await one(`select create_order($1::jsonb, $2::jsonb) as id`, [
    JSON.stringify({
      code: "CP-CCC333", view_token: "t3", user_id: bruId, customer_name: "Bru", customer_phone: "19999991234",
      city: "Indaiatuba", delivery_method: "entrega", shipping_address: address, consent_at: new Date().toISOString(),
    }),
    JSON.stringify([{ preview_id: bruPreview, size_id: "media", pose_id: "sentado", color_id: "branco", catalog_version: "t" }]),
  ])
).id;
const row = await one(`select delivery_method, shipping_address from orders where id = $1`, [shipped]);
check("create_order grava o modo de entrega e o endereço (JSON)", row.delivery_method === "entrega" && row.shipping_address?.street === "Rua México" && row.shipping_address?.cep === "13330000", JSON.stringify(row));
const pickup = (
  await one(`select create_order($1::jsonb, '[]'::jsonb) as id`, [
    JSON.stringify({ code: "CP-DDD444", view_token: "t4", delivery_method: "retirada", shipping_address: null, consent_at: new Date().toISOString() }),
  ])
).id;
const pickupRow = await one(`select delivery_method, shipping_address from orders where id = $1`, [pickup]);
check("retirada: o endereço nulo vira NULL de verdade (não o JSON 'null')", pickupRow.delivery_method === "retirada" && pickupRow.shipping_address === null, JSON.stringify(pickupRow));
check(
  "modo de entrega inválido é recusado pelo banco",
  !!(await fails(`select create_order($1::jsonb, '[]'::jsonb)`, [JSON.stringify({ code: "CP-EEE555", view_token: "t5", delivery_method: "drone", consent_at: new Date().toISOString() })])),
);

// ───────── quadros (0004) sobre dados já existentes ─────────
await db.exec(readFileSync(new URL("0004_quadros.sql", root), "utf8"));
check("0004 aplica preservando pedidos existentes", !!(await one(`select id from orders where id = $1`, [orderId])));
const oldItem = await one(`select * from order_items where order_id = $1`, [orderId]);
check("item antigo continua escultura com as opções preservadas", oldItem.product_type === "escultura" && oldItem.options.poseId === "sentado" && oldItem.options.colorId === "branco");
const portraitOptions = { productType: "quadro", sizeId: "30x40", styleId: "aquarela", frameId: "natural", petName: "Mel" };
const portraitPreview = (await one(`select reserve_preview($1::jsonb, 3) as id`, [JSON.stringify({ public_id: "bru-quadro", user_id: bruId, ip_hash: "h", options: portraitOptions, image_provider: "mock" })])).id;
const legacyPreview = (await one(`select id from previews where public_id = 'bru-1'`)).id;
const mixedId = (await one(`select create_order($1::jsonb, $2::jsonb) as id`, [
  JSON.stringify({ code: "CP-MIX111", view_token: "mixed", user_id: bruId, delivery_method: "entrega", shipping_address: address, consent_at: new Date().toISOString() }),
  JSON.stringify([
    { preview_id: portraitPreview, size_id: "30x40", product_type: "quadro", options: portraitOptions, catalog_version: "quadros-1" },
    { preview_id: legacyPreview, size_id: "media", pose_id: "sentado", color_id: "branco", catalog_version: "t" },
  ]),
])).id;
const mixed = await all(`select * from order_items where order_id = $1 order by product_type`, [mixedId]);
check("pedido misto guarda quadro e escultura com opções independentes", mixed.length === 2 && mixed[0].product_type === "escultura" && mixed[1].options.frameId === "natural" && mixed[1].pose_id === null && mixed[1].color_id === null);
check("opções de quadro incompletas são recusadas", !!(await fails(`update order_items set options = options - 'frameId' where order_id = $1 and product_type = 'quadro'`, [mixedId])));
check("tipo de produto inválido é recusado", !!(await fails(`update order_items set product_type = 'outro' where order_id = $1`, [mixedId])));

const generationUser = (await one(`insert into auth.users (email) values ('geracao@x.com') returning id`)).id;
const generationPreview = (await one(`select reserve_preview($1::jsonb, 3) as id`, [JSON.stringify({ public_id: "generation-1", user_id: generationUser, ip_hash: "h", options: portraitOptions, image_provider: "nano-banana" })])).id;
await db.query(`update previews set photo_path = 'photos/test.jpg' where id = $1`, [generationPreview]);
const claimed = (await one(`select claim_preview_generation('generation-1', 'nano-banana', 20, 30, 3) as preview`)).preview;
check("geração reserva estado e custo antes da IA", claimed.status === "generating" && claimed.image_cost_cents === 20 && !!claimed.started_at);
check("mesma geração não pode ser iniciada duas vezes", (await fails(`select claim_preview_generation('generation-1', 'nano-banana', 20, 100, 3)`))?.message.includes("generation_conflict"));
await db.query(`update previews set status = 'failed' where id = $1`, [generationPreview]);
check("nova tentativa não ultrapassa orçamento já reservado", (await fails(`select claim_preview_generation('generation-1', 'nano-banana', 20, 30, 3)`))?.message.includes("budget_exceeded"));
check("tentativa recusada não aumenta custo", (await one(`select image_cost_cents from previews where id = $1`, [generationPreview])).image_cost_cents === 20);
await one(`select claim_preview_generation('generation-1', 'nano-banana', 20, 100, 3)`);
check("retry autorizado acumula o custo", (await one(`select image_cost_cents from previews where id = $1`, [generationPreview])).image_cost_cents === 40);

// ───────── sessões e remoção de conta ─────────
await db.query(`insert into customer_sessions (token_hash, user_id, expires_at) values ('hash1', $1, now() + interval '30 days')`, [anaId]);
check("sessão guarda hash, conta e validade", (await one(`select count(*)::int n from customer_sessions where user_id = $1`, [anaId])).n === 1);
check("sessão exige conta que existe", !!(await fails(`insert into customer_sessions (token_hash, user_id, expires_at) values ('h2', '00000000-0000-4000-8000-000000000000', now())`)));
await db.query(`delete from auth.users where id = $1`, [anaId]);
check("apagar o usuário do Auth leva o perfil e as sessões junto (cascata)", (await one(`select count(*)::int n from profiles where id = $1`, [anaId])).n === 0 && (await one(`select count(*)::int n from customer_sessions where user_id = $1`, [anaId])).n === 0);
check("...e os pedidos e prévias ficam, sem dono (set null)", (await one(`select count(*)::int n from orders where code = 'CP-AAA111' and user_id is null`)).n === 1 && (await one(`select count(*)::int n from previews where user_id is null`)).n >= 1);

// ───────── RLS ─────────
const rls = await all(`select relname, relrowsecurity from pg_class where relname in ('profiles','customer_sessions','previews','orders') order by relname`);
check("RLS ligado nas tabelas novas e nas antigas", rls.length === 4 && rls.every((r) => r.relrowsecurity), JSON.stringify(rls));
const policies = (await one(`select count(*)::int n from pg_policies`)).n;
check("nenhuma política criada (só a chave de serviço acessa)", policies === 0);

console.log(failures ? `\n${failures} FALHA(S)` : "\nTudo certo.");
process.exit(failures ? 1 : 0);
