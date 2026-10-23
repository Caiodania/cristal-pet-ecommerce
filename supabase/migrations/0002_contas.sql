-- Cristal Pet Esculturas: contas de clientes e cota de prévias por conta.
--
-- Como aplicar: Supabase > SQL Editor > cole este arquivo > Run, DEPOIS da
-- 0001_init.sql. O login em si (e-mail, senha, confirmação, recuperação) é o
-- Supabase Auth, que já vem no projeto: aqui ficam só os dados da loja.
--
-- Segurança: igual à 0001. RLS ligado e sem políticas; só o servidor (chave de
-- serviço) lê e escreve. O navegador nunca fala direto com o banco.

-- ───────── Contas (um perfil por usuário do Supabase Auth) ─────────
create table profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null,
  name            text,
  bonus_previews  integer not null default 0 check (bonus_previews >= 0),  -- prévias extras liberadas pelo dono
  created_at      timestamptz not null default now(),
  last_login_at   timestamptz
);
create index profiles_email on profiles (lower(email));

-- Todo usuário novo do Auth ganha um perfil (o servidor também garante no login).
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name)
  values (new.id, coalesce(new.email, ''), nullif(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ───────── Sessões de login do cliente ─────────
-- O cookie leva um token aleatório; aqui fica só o hash dele (se o banco vazar,
-- ninguém consegue usar as sessões).
create table customer_sessions (
  token_hash  text primary key,
  user_id     uuid not null references profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index customer_sessions_user    on customer_sessions (user_id);
create index customer_sessions_expires on customer_sessions (expires_at);

-- ───────── Prévias e pedidos passam a ter dono ─────────
alter table previews add column user_id uuid references profiles (id) on delete set null;
alter table previews alter column session_id drop not null;   -- visitantes anônimos não geram mais prévias
create index previews_user_created on previews (user_id, created_at);

alter table orders add column user_id uuid references profiles (id) on delete set null;
create index orders_user_created on orders (user_id, created_at desc);

-- ───────── Funções usadas pelo servidor ─────────

-- Reserva uma prévia para a conta SE ela ainda tem direito a mais uma, numa
-- transação só. A linha da conta fica travada até o fim: duas prévias pedidas
-- ao mesmo tempo passam uma de cada vez e nunca estouram o limite.
-- Conta na cota: prontas, em geração, expiradas e as criadas há menos de 1 h
-- que ainda esperam a foto. Falhas e fotos recusadas NÃO contam.
create function reserve_preview(p_preview jsonb, p_limit integer) returns uuid
language plpgsql as $$
declare
  v_user  uuid := (p_preview->>'user_id')::uuid;
  v_bonus integer;
  v_used  integer;
  v_id    uuid;
begin
  select bonus_previews into v_bonus from profiles where id = v_user for update;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  select count(*) into v_used
  from previews
  where user_id = v_user
    and (status in ('ready', 'generating', 'expired')
         or (status = 'queued' and created_at > now() - interval '1 hour'));

  if v_used >= p_limit + v_bonus then
    raise exception 'quota_exceeded'
      using errcode = 'P0001', detail = v_used::text || '/' || (p_limit + v_bonus)::text;
  end if;

  insert into previews (public_id, user_id, ip_hash, options, image_provider,
                        photo_path, photo_content_type)
  values (p_preview->>'public_id', v_user, p_preview->>'ip_hash', p_preview->'options',
          p_preview->>'image_provider', p_preview->>'photo_path',
          p_preview->>'photo_content_type')
  returning id into v_id;
  return v_id;
end $$;

-- create_order passa a gravar a conta que fez o pedido.
create or replace function create_order(p_order jsonb, p_items jsonb) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  insert into orders (code, view_token, user_id, customer_name, customer_phone, city, notes,
                      estimate_cents, discount_cents, consent_at)
  values (p_order->>'code', p_order->>'view_token', nullif(p_order->>'user_id', '')::uuid,
          p_order->>'customer_name', p_order->>'customer_phone', p_order->>'city',
          p_order->>'notes',
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

-- ───────── RLS: ligado e sem políticas (só a chave de serviço acessa) ─────────
alter table profiles          enable row level security;
alter table customer_sessions enable row level security;
