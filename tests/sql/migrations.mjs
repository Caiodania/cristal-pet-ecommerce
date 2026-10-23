// Valida as migrations do Supabase (0001 + 0002) num Postgres de verdade (PGlite, WASM),
// sem precisar de projeto nem de internet: gatilho do Auth, cota de prévias
// (reserve_preview), pedido com conta, cascatas e RLS.
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
