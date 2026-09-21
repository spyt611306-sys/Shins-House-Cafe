-- Shin's House admin operations
-- Phase 3/6: audit trail and validated order status transitions.

create sequence if not exists public.products_id_seq;
select setval('public.products_id_seq', greatest(coalesce((select max(id) from public.products),0),1), true);
alter sequence public.products_id_seq owned by public.products.id;
alter table public.products alter column id set default nextval('public.products_id_seq');

create sequence if not exists public.subscription_plans_id_seq;
select setval('public.subscription_plans_id_seq', greatest(coalesce((select max(id) from public.subscription_plans),0),1), true);
alter sequence public.subscription_plans_id_seq owned by public.subscription_plans.id;
alter table public.subscription_plans alter column id set default nextval('public.subscription_plans_id_seq');

create table if not exists public.admin_audit_logs (
  id bigserial primary key,
  actor_email text not null,
  action text not null,
  target_type text not null,
  target_id text not null default '',
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs(created_at desc);
create index if not exists admin_audit_logs_actor_idx
  on public.admin_audit_logs(actor_email, created_at desc);

alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from anon, authenticated;
grant all on public.admin_audit_logs to service_role;

create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_new_status text,
  p_tracking_number text,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_allowed boolean := false;
  v_restock boolean := false;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  if p_new_status = v_order.status then
    return jsonb_build_object('ok',true,'status',v_order.status,'idempotent_replay',true);
  end if;

  v_allowed := case v_order.status
    when '입금 대기' then p_new_status in ('입금 확인 요청','입금 확인','주문 취소')
    when '입금 확인 요청' then p_new_status in ('입금 확인','주문 취소')
    when '입금 확인' then p_new_status in ('상품 준비','주문 취소','환불 완료')
    when '상품 준비' then p_new_status in ('배송 중','주문 취소','환불 완료')
    when '배송 중' then p_new_status in ('배송 완료','환불 완료')
    when '배송 완료' then p_new_status in ('환불 완료')
    else false
  end;

  if not v_allowed then raise exception 'INVALID_STATUS_TRANSITION'; end if;

  v_restock := p_new_status = '주문 취소' and v_order.status in ('입금 대기','입금 확인 요청','입금 확인','상품 준비');
  if v_restock then
    update public.products p
    set stock = p.stock + oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id and oi.product_id = p.id;
  end if;

  update public.orders
  set status = p_new_status,
      tracking_number = case when p_new_status in ('배송 중','배송 완료') then coalesce(p_tracking_number,'') else tracking_number end
  where id = p_order_id;

  insert into public.order_status_history(order_id,from_status,to_status,actor,note)
  values(p_order_id,v_order.status,p_new_status,coalesce(nullif(p_actor,''),'admin'),'관리자 상태 변경');

  return jsonb_build_object(
    'ok',true,
    'status',p_new_status,
    'tracking_number',case when p_new_status in ('배송 중','배송 완료') then coalesce(p_tracking_number,'') else v_order.tracking_number end,
    'restocked',v_restock,
    'idempotent_replay',false
  );
end;
$$;

revoke all on function public.admin_set_order_status(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.admin_set_order_status(uuid,text,text,text) to service_role;
