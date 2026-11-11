-- AUmor de Patas: quadros terceirizados e reserva atômica da geração de imagem.
-- Aplicar DEPOIS de 0003_envio.sql, antes de publicar o código novo na Netlify.
-- Não remove pedidos, prévias, contas ou arquivos. Itens antigos seguem esculturas.

alter table order_items add column product_type text not null default 'escultura';
alter table order_items add column options jsonb;
update order_items set options = jsonb_strip_nulls(jsonb_build_object(
  'productType', 'escultura', 'sizeId', size_id, 'poseId', pose_id,
  'colorId', color_id, 'petName', pet_name
)) where options is null;
alter table order_items alter column options set not null;
alter table order_items alter column pose_id drop not null;
alter table order_items alter column color_id drop not null;
alter table order_items add constraint order_items_product_type_check
  check (product_type in ('escultura', 'quadro'));
alter table order_items add constraint order_items_product_options_check check (
  jsonb_typeof(options) = 'object'
  and options->>'productType' is not null
  and options->>'productType' = product_type
  and options->>'sizeId' is not null
  and options->>'sizeId' = size_id
  and (
    (product_type = 'escultura' and pose_id is not null and color_id is not null
      and options->>'poseId' is not null and options->>'poseId' = pose_id
      and options->>'colorId' is not null and options->>'colorId' = color_id)
    or (product_type = 'quadro' and pose_id is null and color_id is null
      and nullif(options->>'styleId', '') is not null
      and nullif(options->>'frameId', '') is not null)
  )
);
create index order_items_product_type on order_items (product_type);

-- A assinatura continua igual, inclusive para chamadas antigas de esculturas.
create or replace function create_order(p_order jsonb, p_items jsonb) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  insert into orders (code, view_token, user_id, customer_name, customer_phone, city,
                      delivery_method, shipping_address, notes,
                      estimate_cents, discount_cents, consent_at)
  values (p_order->>'code', p_order->>'view_token', nullif(p_order->>'user_id', '')::uuid,
          p_order->>'customer_name', p_order->>'customer_phone', p_order->>'city',
          nullif(p_order->>'delivery_method', ''),
          case when jsonb_typeof(p_order->'shipping_address') = 'object'
               then p_order->'shipping_address' end,
          p_order->>'notes', nullif(p_order->>'estimate_cents', '')::integer,
          coalesce(nullif(p_order->>'discount_cents', '')::integer, 0),
          (p_order->>'consent_at')::timestamptz)
  returning id into v_id;

  insert into order_items (order_id, preview_id, size_id, pose_id, color_id, pet_name,
                           product_type, options, unit_cents, catalog_version)
  select v_id, (i->>'preview_id')::uuid, i->>'size_id', i->>'pose_id', i->>'color_id',
         i->>'pet_name', coalesce(i->>'product_type', 'escultura'),
         case when jsonb_typeof(i->'options') = 'object' then i->'options'
              else jsonb_strip_nulls(jsonb_build_object('productType', 'escultura',
                   'sizeId', i->>'size_id', 'poseId', i->>'pose_id',
                   'colorId', i->>'color_id', 'petName', i->>'pet_name')) end,
         nullif(i->>'unit_cents', '')::integer, i->>'catalog_version'
  from jsonb_array_elements(p_items) as i;

  insert into order_events (order_id, status) values (v_id, 'new');
  return v_id;
end $$;

-- Ao repetir uma geração antiga, o custo acumulado entra conservadoramente
-- na janela atual. Assim um retry não escapa do limite por ter sido criado ontem.
create or replace function sum_costs(p_since timestamptz) returns bigint
language sql stable as $$
  select coalesce(sum(image_cost_cents + model_cost_cents), 0)::bigint
  from previews where greatest(created_at, started_at) >= p_since;
$$;

-- Executa ANTES de chamar o provedor. Duas Functions não pagam pela mesma
-- prévia e tentativas concorrentes não ultrapassam o orçamento reservado.
create function claim_preview_generation(
  p_public_id text, p_provider text, p_cost_cents integer,
  p_budget_cents integer, p_account_limit integer
) returns jsonb
language plpgsql as $$
declare
  v_preview previews%rowtype;
  v_limit integer;
  v_used integer;
  v_counts boolean;
  v_spent bigint;
  v_carried bigint;
begin
  if p_cost_cents < 0 or p_budget_cents < 0 or p_account_limit < 1 then
    raise exception 'invalid_generation_limits';
  end if;
  -- Uma única trava de orçamento para todas as contas, além da trava da conta
  -- compartilhada com reserve_preview. Não há chamada de rede nesta transação.
  perform pg_advisory_xact_lock(74102, 1);
  select * into v_preview from previews where public_id = p_public_id for update;
  if not found then raise exception 'preview_not_found'; end if;
  if not (v_preview.status = 'queued' or
          (v_preview.status = 'failed' and coalesce(v_preview.error_code, '') <> 'rejected')) then
    raise exception 'generation_conflict';
  end if;
  if v_preview.photo_path is null then raise exception 'photo_missing'; end if;
  select p_account_limit + bonus_previews into v_limit
    from profiles where id = v_preview.user_id for update;
  if not found then raise exception 'profile_not_found'; end if;
  select count(*)::integer into v_used from previews where user_id = v_preview.user_id
    and (status in ('ready', 'generating', 'expired')
      or (status = 'queued' and created_at > now() - interval '1 hour'));
  v_counts := v_preview.status in ('ready', 'generating', 'expired')
    or (v_preview.status = 'queued' and v_preview.created_at > now() - interval '1 hour');
  if not v_counts and v_used >= v_limit then
    raise exception 'quota_exceeded' using detail = v_used::text || '/' || v_limit::text;
  end if;
  select sum_costs(now() - interval '24 hours') into v_spent;
  v_carried := case when greatest(v_preview.created_at, v_preview.started_at) < now() - interval '24 hours'
    then v_preview.image_cost_cents + v_preview.model_cost_cents else 0 end;
  if p_budget_cents > 0 and v_spent + v_carried + p_cost_cents > p_budget_cents then
    raise exception 'budget_exceeded';
  end if;
  update previews set status = 'generating', image_provider = p_provider,
    image_job_id = null, image_cost_cents = image_cost_cents + p_cost_cents,
    started_at = now(), error_code = null, error_message = null
    where id = v_preview.id returning * into v_preview;
  return to_jsonb(v_preview);
end $$;

-- A RPC é exclusiva da Function. A chave pública continua sem acesso aos dados.
revoke execute on function claim_preview_generation(text, text, integer, integer, integer) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function claim_preview_generation(text, text, integer, integer, integer) to service_role;
  end if;
end $$;
