-- Cristal Pet Esculturas: esquema inicial.
--
-- Como aplicar: Supabase > SQL Editor > cole este arquivo > Run
-- (ou `supabase db push`, se usar a CLI do Supabase).
--
-- Segurança: o RLS fica LIGADO e SEM políticas. Resultado: a chave pública
-- (anon) não lê nem escreve nada. Só o servidor (Netlify Functions), com a
-- chave de serviço (service_role), acessa estas tabelas. O navegador nunca
-- fala direto com o banco.

create type preview_status as enum
  ('queued', 'generating', 'ready', 'failed', 'rejected', 'expired');
create type model_status as enum
  ('none', 'queued', 'processing', 'ready', 'failed');
create type order_status as enum
  ('new', 'confirmed', 'in_production', 'ready', 'delivered', 'canceled');

-- ───────── Prévias: foto → imagem da escultura → arquivo 3D ─────────
create table previews (
  id                 uuid primary key default gen_random_uuid(),
  public_id          text not null unique,          -- id opaco das URLs e do polling
  session_id         text not null,                 -- visitante anônimo (guardado no navegador)
  ip_hash            text not null,                 -- hash do IP, nunca o IP
  status             preview_status not null default 'queued',
  options            jsonb not null,                -- {sizeId, poseId, colorId, petName}

  photo_path         text,                          -- foto original (bucket PRIVADO)
  photo_content_type text,

  -- etapa 1: IA de imagem
  image_provider     text not null,
  image_job_id       text,
  image_path         text,
  image_content_type text,
  image_cost_cents   integer not null default 0,
  started_at         timestamptz,
  error_code         text,
  error_message      text,

  -- etapa 2: imagem → modelo 3D pronto para impressão
  model_status       model_status not null default 'none',
  model_provider     text,
  model_job_id       text,
  stl_path           text,
  glb_path           text,
  model_error        text,
  model_cost_cents   integer not null default 0,

  created_at         timestamptz not null default now(),
  expires_at         timestamptz not null default (now() + interval '30 days')
);
create index previews_session_created on previews (session_id, created_at);
create index previews_ip_created      on previews (ip_hash, created_at);
create index previews_created         on previews (created_at);

-- ───────── Pedidos ─────────
create table orders (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,             -- ex.: CP-7K3M9Q
  view_token      text not null,                    -- vai no link do cliente
  status          order_status not null default 'new',
  customer_name   text,
  customer_phone  text,
  city            text,
  notes           text,
  admin_notes     text,                             -- anotações internas do dono
  estimate_cents  integer,                          -- só estimativa; o valor final é do WhatsApp
  discount_cents  integer not null default 0,
  consent_at      timestamptz not null,             -- aceite da política de privacidade
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index orders_status_created on orders (status, created_at desc);

create table order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders (id) on delete cascade,
  preview_id       uuid not null unique references previews (id),  -- uma prévia vale em um pedido só
  size_id          text not null,
  pose_id          text not null,
  color_id         text not null,
  pet_name         text,
  unit_cents       integer,                         -- estimativa congelada (null = a combinar)
  catalog_version  text not null
);
create index order_items_order on order_items (order_id);

-- Linha do tempo do pedido (o cliente vê; o dono alimenta).
create table order_events (
  id        bigint generated always as identity primary key,
  order_id  uuid not null references orders (id) on delete cascade,
  status    order_status not null,
  note      text,
  at        timestamptz not null default now()
);
create index order_events_order on order_events (order_id, at);

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- ───────── Funções usadas pelo servidor ─────────

-- Cria o pedido, os itens e o primeiro evento numa transação só.
-- Se uma prévia já estiver em outro pedido, a constraint unique recusa tudo.
create function create_order(p_order jsonb, p_items jsonb) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  insert into orders (code, view_token, customer_name, customer_phone, city, notes,
                      estimate_cents, discount_cents, consent_at)
  values (p_order->>'code', p_order->>'view_token', p_order->>'customer_name',
          p_order->>'customer_phone', p_order->>'city', p_order->>'notes',
          nullif(p_order->>'estimate_cents', '')::integer,
          coalesce(nullif(p_order->>'discount_cents', '')::integer, 0),
          (p_order->>'consent_at')::timestamptz)
  returning id into v_id;

  insert into order_items (order_id, preview_id, size_id, pose_id, color_id, pet_name,
                           unit_cents, catalog_version)
  select v_id, (i->>'preview_id')::uuid, i->>'size_id', i->>'pose_id', i->>'color_id',
         i->>'pet_name', nullif(i->>'unit_cents', '')::integer, i->>'catalog_version'
  from jsonb_array_elements(p_items) as i;

  insert into order_events (order_id, status) values (v_id, 'new');
  return v_id;
end $$;

-- Custo de IA (imagem + modelo 3D) das prévias criadas desde um instante.
create function sum_costs(p_since timestamptz) returns bigint
language sql stable as $$
  select coalesce(sum(image_cost_cents + model_cost_cents), 0)::bigint
  from previews
  where created_at >= p_since
$$;

-- ───────── RLS: ligado e sem políticas (só a chave de serviço acessa) ─────────
alter table previews     enable row level security;
alter table orders       enable row level security;
alter table order_items  enable row level security;
alter table order_events enable row level security;

-- ───────── Storage: bucket PRIVADO para fotos, imagens e arquivos 3D ─────────
insert into storage.buckets (id, name, public)
values ('cristal-pet', 'cristal-pet', false)
on conflict (id) do nothing;
