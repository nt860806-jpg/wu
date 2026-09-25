create or replace function public.create_member_orders(p_orders jsonb, p_wallet_apply integer default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_order jsonb;
  v_saved_order jsonb;
  v_results jsonb := '[]'::jsonb;
  v_wallet_remaining integer := greatest(coalesce(p_wallet_apply, 0), 0);
  v_group_subtotal integer;
  v_wallet_for_group integer;
  v_item_count integer;
  v_valid_item_count integer;
  v_invalid_quantity boolean;
begin
  if auth.uid() is null or v_email = '' then
    raise exception '請先登入會員再建立訂單';
  end if;
  if jsonb_typeof(p_orders) <> 'array' or jsonb_array_length(p_orders) = 0 or jsonb_array_length(p_orders) > 20 then
    raise exception '訂單資料不完整';
  end if;

  for v_order in select value from jsonb_array_elements(p_orders)
  loop
    if v_order ->> 'id' is null or jsonb_typeof(v_order -> 'items') <> 'array' then
      raise exception '訂單資料不完整';
    end if;

    select jsonb_array_length(v_order -> 'items'), count(product.id)::integer,
           coalesce(sum((product.data ->> 'price')::integer * (item.value ->> 'quantity')::integer), 0)::integer,
           coalesce(bool_or(coalesce((item.value ->> 'quantity')::integer, 0) < 1 or (item.value ->> 'quantity')::integer > 99), false)
      into v_item_count, v_valid_item_count, v_group_subtotal, v_invalid_quantity
      from jsonb_array_elements(v_order -> 'items') as item(value)
      left join public.products as product
        on product.id = item.value ->> 'productId'
       and coalesce(product.archived, false) = false;

    if v_item_count = 0 or v_valid_item_count <> v_item_count or v_invalid_quantity then
      raise exception '商品已下架或訂單品項資料無效，請重新整理購物車';
    end if;

    v_wallet_for_group := least(v_wallet_remaining, v_group_subtotal);
    v_wallet_remaining := v_wallet_remaining - v_wallet_for_group;
    v_saved_order := public.create_member_order(v_order, v_wallet_for_group);
    v_results := v_results || jsonb_build_array(v_saved_order);
  end loop;

  if v_wallet_remaining > 0 then
    raise exception '購物金折抵金額超過商品金額';
  end if;

  return v_results;
end;
$$;

grant execute on function public.create_member_orders(jsonb, integer) to authenticated;
