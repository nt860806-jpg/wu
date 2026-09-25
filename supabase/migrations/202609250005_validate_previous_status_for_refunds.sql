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
  if p_resolution = 'refund_contact'
     and (
       coalesce((v_order.data ->> 'refundEligibleAtCancellation')::boolean, false) is not true
       or (
         v_order.data ? 'cancellationPreviousOrderStatus'
         and v_order.data ->> 'cancellationPreviousOrderStatus' not in ('payment_verifying', 'paid_verifying')
       )
       or (
         not (v_order.data ? 'cancellationPreviousOrderStatus')
         and jsonb_typeof(v_order.data -> 'campaignStatuses') = 'object'
         and jsonb_object_length(v_order.data -> 'campaignStatuses') > 0
         and not exists (
           select 1
           from jsonb_each_text(v_order.data -> 'campaignStatuses') as campaign_status(key, value)
           where campaign_status.value not in ('order_created', 'pending_payment')
         )
       )
     ) then
    raise exception '只有取消時處於匯款核對階段的訂單可以選擇退款';
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
