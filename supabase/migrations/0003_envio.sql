-- Cristal Pet Esculturas: dados de envio nos pedidos.
--
-- Como aplicar: Supabase > SQL Editor > cole este arquivo > Run, DEPOIS da 0002.
--
-- O pedido passa a guardar como o cliente quer receber (entrega ou retirada) e o
-- endereço completo (rua, número, bairro, cidade, UF, CEP). O endereço fica num
-- campo JSON: o painel só o exibe (a lista filtra pela coluna `city`, que já existe).

alter table orders add column delivery_method text
  check (delivery_method in ('entrega', 'retirada'));
alter table orders add column shipping_address jsonb;

-- create_order passa a gravar o modo de entrega e o endereço.
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
          -- JSON nulo vira NULL de verdade (só o objeto é guardado)
          case when jsonb_typeof(p_order->'shipping_address') = 'object'
               then p_order->'shipping_address' end,
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
