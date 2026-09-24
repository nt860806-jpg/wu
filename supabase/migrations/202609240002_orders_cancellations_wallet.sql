create table if not exists public.orders (
  id text primary key,
  owner_email text not null,
  data jsonb not null,
  cancellation_status text not null default 'none'
    check (cancellation_status in ('none', 'awaiting_choice', 'wallet_credited', 'refund_contact_requested', 'refund_completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_owner_email_idx on public.orders (owner_email);
create index if not exists orders_cancellation_status_idx on public.orders (cancellation_status);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  order_id text,
  amount integer not null check (amount <> 0),
  transaction_type text not null check (transaction_type in ('cancellation_credit', 'purchase_redemption', 'refund_wallet_restore')),
  description text not null,
  created_at timestamptz not null default now(),
  unique (order_id, transaction_type)
);

create index if not exists wallet_transactions_owner_email_idx on public.wallet_transactions (owner_email, created_at desc);

alter table public.orders enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "Members and admins can read orders" on public.orders;
create policy "Members and admins can read orders" on public.orders
  for select to authenticated
  using (
    lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or lower(coalesce(auth.jwt() ->> 'email', '')) in ('nt860806@gmail.com', 'asd0578236@gmail.com')
  );

drop policy if exists "Members and admins can insert orders" on public.orders;
drop policy if exists "Only admins can insert orders" on public.orders;
create policy "Only admins can insert orders" on public.orders
  for insert to authenticated
  with check (
    lower(coalesce(auth.jwt() ->> 'email', '')) in ('nt860806@gmail.com', 'asd0578236@gmail.com')
  );

drop policy if exists "Only admins can update orders" on public.orders;
create policy "Only admins can update orders" on public.orders
  for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('nt860806@gmail.com', 'asd0578236@gmail.com'))
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) in ('nt860806@gmail.com', 'asd0578236@gmail.com'));

drop policy if exists "Members and admins can read wallet transactions" on public.wallet_transactions;
create policy "Members and admins can read wallet transactions" on public.wallet_transactions
  for select to authenticated
  using (
    lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or lower(coalesce(auth.jwt() ->> 'email', '')) in ('nt860806@gmail.com', 'asd0578236@gmail.com')
  );

grant select, insert, update on public.orders to authenticated;
grant select on public.wallet_transactions to authenticated;

create or replace function public.create_member_order(p_order jsonb, p_wallet_apply integer default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_order_id text := coalesce(p_order ->> 'id', '');
  v_subtotal integer := 0;
  v_wallet_apply integer := greatest(coalesce(p_wallet_apply, 0), 0);
  v_balance integer;
  v_item_count integer;
  v_valid_item_count integer;
  v_invalid_quantity boolean;
  v_data jsonb;
begin
  if auth.uid() is null or v_email = '' then
    raise exception '請先登入會員再建立訂單';
  end if;
  if v_order_id = '' or jsonb_typeof(p_order -> 'items') <> 'array' then
    raise exception '訂單資料不完整';
  end if;

  v_item_count := jsonb_array_length(p_order -> 'items');
  select count(*)::integer,
         coalesce(sum((product.data ->> 'price')::integer * (item.value ->> 'quantity')::integer), 0)::integer,
         coalesce(bool_or(coalesce((item.value ->> 'quantity')::integer, 0) < 1 or (item.value ->> 'quantity')::integer > 99), false)
    into v_valid_item_count, v_subtotal, v_invalid_quantity
    from jsonb_array_elements(p_order -> 'items') as item(value)
    join public.products as product on product.id = item.value ->> 'productId'
   where coalesce(product.archived, false) = false;
  if v_item_count = 0 or v_valid_item_count <> v_item_count or v_invalid_quantity then
    raise exception '商品已下架或訂單品項資料無效，請重新整理購物車';
  end if;
  if v_wallet_apply > v_subtotal then
    raise exception '購物金折抵金額超過商品金額';
  end if;

  select coalesce(sum(amount), 0)::integer into v_balance
  from public.wallet_transactions
  where lower(owner_email) = v_email;
  if v_wallet_apply > v_balance then
    raise exception '購物金餘額不足，請重新整理後再試';
  end if;

  v_data := p_order || jsonb_build_object(
    'email', v_email,
    'totalAmount', v_subtotal - v_wallet_apply,
    'depositAmountPaid', v_subtotal - v_wallet_apply,
    'remainingAmount', 0,
    'walletCreditApplied', v_wallet_apply,
    'cancellationStatus', 'none'
  );

  insert into public.orders (id, owner_email, data, cancellation_status)
  values (v_order_id, v_email, v_data, 'none');

  if v_wallet_apply > 0 then
    insert into public.wallet_transactions (owner_email, order_id, amount, transaction_type, description)
    values (v_email, v_order_id, -v_wallet_apply, 'purchase_redemption', '訂單折抵購物金');
  end if;

  return v_data;
end;
$$;

create or replace function public.choose_order_cancellation_resolution(p_order_id text, p_resolution text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_order public.orders%rowtype;
  v_amount integer;
  v_restored_wallet integer;
  v_status text;
  v_data jsonb;
begin
  if auth.uid() is null or v_email = '' then
    raise exception '請先登入會員';
  end if;
  if p_resolution not in ('store_credit', 'refund_contact') then
    raise exception '處理方式無效';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id and lower(owner_email) = v_email
  for update;
  if not found then
    raise exception '找不到此會員訂單';
  end if;
  if v_order.cancellation_status <> 'awaiting_choice' then
    raise exception '此取消訂單已完成選擇';
  end if;

  v_amount := greatest(coalesce(nullif(v_order.data ->> 'subtotal', '')::integer, nullif(v_order.data ->> 'totalAmount', '')::integer, 0), 0);
  v_restored_wallet := greatest(coalesce(nullif(v_order.data ->> 'walletCreditApplied', '')::integer, 0), 0);

  if p_resolution = 'store_credit' then
    v_status := 'wallet_credited';
    insert into public.wallet_transactions (owner_email, order_id, amount, transaction_type, description)
    values (v_email, p_order_id, v_amount, 'cancellation_credit', '未買到商品，取消訂單轉入購物金')
    on conflict (order_id, transaction_type) do nothing;
  else
    v_status := 'refund_contact_requested';
    if v_restored_wallet > 0 then
      insert into public.wallet_transactions (owner_email, order_id, amount, transaction_type, description)
      values (v_email, p_order_id, v_restored_wallet, 'refund_wallet_restore', '退款訂單自動返還原折抵購物金')
      on conflict (order_id, transaction_type) do nothing;
    end if;
  end if;

  v_data := v_order.data || jsonb_build_object(
    'cancellationStatus', v_status,
    'cancellationResolvedAt', now(),
    'walletCreditAmount', case when p_resolution = 'store_credit' then v_amount else 0 end,
    'restoredWalletAmount', case when p_resolution = 'refund_contact' then v_restored_wallet else 0 end
  );
  update public.orders
  set cancellation_status = v_status, data = v_data, updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('status', v_status, 'wallet_credit_amount', case when p_resolution = 'store_credit' then v_amount else 0 end);
end;
$$;

create or replace function public.submit_order_bank_code(p_order_id text, p_bank_last_five text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_data jsonb;
begin
  if auth.uid() is null or v_email = '' or p_bank_last_five !~ '^[0-9]{4,5}$' then
    raise exception '請登入會員並輸入有效的匯款末五碼';
  end if;

  update public.orders
  set data = data || jsonb_build_object('bankLastFive', p_bank_last_five, 'orderStatus', 'paid_verifying', 'paymentStatus', 'verifying'), updated_at = now()
  where id = p_order_id and lower(owner_email) = v_email and cancellation_status = 'none'
  returning data into v_data;
  if not found then
    raise exception '找不到可更新的會員訂單';
  end if;
  return v_data;
end;
$$;

grant execute on function public.create_member_order(jsonb, integer) to authenticated;
grant execute on function public.choose_order_cancellation_resolution(text, text) to authenticated;
grant execute on function public.submit_order_bank_code(text, text) to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wallet_transactions') then
    alter publication supabase_realtime add table public.wallet_transactions;
  end if;
end;
$$;
