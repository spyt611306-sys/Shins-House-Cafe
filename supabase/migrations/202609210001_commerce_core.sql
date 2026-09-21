-- Shin's House commerce core schema
-- Phase 2/6: persistent orders, inventory, consent records and public actions.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.products (
  id bigint primary key,
  name text not null,
  category text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  image text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  public_token_hash text not null,
  customer_name text not null,
  phone_normalized text not null,
  shipping_address text not null,
  delivery_memo text not null default '',
  subtotal integer not null check (subtotal >= 0),
  shipping_fee integer not null check (shipping_fee >= 0),
  total integer not null check (total >= 0),
  status text not null default '입금 대기' check (status in (
    '입금 대기','입금 확인 요청','입금 확인','상품 준비','배송 중','배송 완료','주문 취소','환불 완료'
  )),
  tracking_number text not null default '',
  payment_notice_at timestamptz,
  idempotency_key text not null unique,
  terms_version text not null,
  privacy_version text not null,
  refund_version text not null,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id bigint not null references public.products(id),
  product_name text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0 and quantity <= 20),
  line_total integer not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor text not null default 'system',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.subscription_plans (
  id bigint primary key,
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  quantity_label text not null default '',
  delivery_cycle text not null default '',
  shipping_fee integer not null default 0 check (shipping_fee >= 0),
  subscriber_limit integer not null default 0 check (subscriber_limit >= 0),
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  plan_id bigint not null references public.subscription_plans(id),
  customer_name text not null,
  phone_normalized text not null,
  note text not null default '',
  status text not null default '신청 접수' check (status in ('신청 접수','상담 완료','구독 활성','일시정지','해지')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists orders_lookup_idx on public.orders(phone_normalized, customer_name, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists status_history_order_idx on public.order_status_history(order_id, created_at desc);
create index if not exists subscription_requests_phone_idx on public.subscription_requests(phone_normalized, created_at desc);

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger subscription_plans_set_updated_at
before update on public.subscription_plans
for each row execute function public.set_updated_at();

create trigger subscription_requests_set_updated_at
before update on public.subscription_requests
for each row execute function public.set_updated_at();

insert into public.products (id,name,category,description,price,stock,low_stock_threshold,image,active,sort_order)
values
  (1,'하우스 블렌드 200g','coffee','고소한 단맛과 편안한 여운을 담은 데일리 블렌드',18000,24,3,'assets/asset-11-7ec3ab46.webp',true,1),
  (2,'나이트 디카페인 200g','coffee','부드러운 단맛과 낮은 카페인으로 늦은 시간에도 편안한 커피',21000,18,3,'assets/asset-12-67790ddf.webp',true,2),
  (3,'클래식 크림 머그','goods','매일 편하게 사용할 수 있는 크림 컬러 머그',19000,12,3,'assets/asset-08-409f9713.webp',true,3),
  (4,'신스하우스 선물 세트','gift','원두와 커피 오브젝트를 함께 구성한 선물 세트',39000,9,3,'assets/asset-07-dbd7b39f.webp',true,4)
on conflict (id) do nothing;

insert into public.subscription_plans (id,name,description,price,quantity_label,delivery_cycle,shipping_fee,subscriber_limit,active,sort_order)
values
  (1,'하우스 베이직','매월 원두 한 봉을 취향에 맞춰 안내합니다.',18000,'원두 200g × 1','매월 1회',0,0,false,1),
  (2,'커피 페어','서로 다른 두 가지 원두를 비교해 즐길 수 있습니다.',34000,'원두 200g × 2','매월 1회',0,0,false,2),
  (3,'디카페인 클럽','늦은 시간에도 편안한 디카페인 원두 구성입니다.',21000,'디카페인 200g × 1','매월 1회',0,0,false,3)
on conflict (id) do nothing;

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscription_requests enable row level security;
alter table public.api_rate_limits enable row level security;

revoke all on public.products from anon, authenticated;
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke all on public.order_status_history from anon, authenticated;
revoke all on public.subscription_plans from anon, authenticated;
revoke all on public.subscription_requests from anon, authenticated;
revoke all on public.api_rate_limits from anon, authenticated;

grant all on public.products to service_role;
grant all on public.orders to service_role;
grant all on public.order_items to service_role;
grant all on public.order_status_history to service_role;
grant all on public.subscription_plans to service_role;
grant all on public.subscription_requests to service_role;
grant all on public.api_rate_limits to service_role;

create or replace function public.create_order_transaction(
  p_customer_name text,
  p_phone_normalized text,
  p_shipping_address text,
  p_delivery_memo text,
  p_items jsonb,
  p_idempotency_key text,
  p_terms_version text,
  p_privacy_version text,
  p_refund_version text,
  p_public_token_hash text,
  p_shipping_fee_base integer default 3000,
  p_free_shipping_threshold integer default 50000
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_item_count integer;
  v_distinct_count integer;
  v_product_count integer;
  v_subtotal integer;
  v_shipping_fee integer;
  v_order_number text;
begin
  if coalesce(length(trim(p_customer_name)),0) < 2 or length(trim(p_customer_name)) > 40 then
    raise exception 'INVALID_CUSTOMER_NAME';
  end if;
  if p_phone_normalized !~ '^[0-9]{9,12}$' then
    raise exception 'INVALID_PHONE';
  end if;
  if coalesce(length(trim(p_shipping_address)),0) < 5 or length(trim(p_shipping_address)) > 300 then
    raise exception 'INVALID_ADDRESS';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'INVALID_ITEMS';
  end if;
  if coalesce(length(p_idempotency_key),0) < 16 or length(p_idempotency_key) > 128 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;

  select * into v_order from public.orders where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'id',v_order.id,'order_number',v_order.order_number,'status',v_order.status,
      'subtotal',v_order.subtotal,'shipping_fee',v_order.shipping_fee,'total',v_order.total,
      'created_at',v_order.created_at,'idempotent_replay',true
    );
  end if;

  select count(*), count(distinct x.product_id)
    into v_item_count, v_distinct_count
  from jsonb_to_recordset(p_items) as x(product_id bigint, quantity integer);

  if v_item_count <> v_distinct_count then
    raise exception 'DUPLICATE_PRODUCT';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(product_id bigint, quantity integer)
    where x.product_id is null or x.quantity is null or x.quantity < 1 or x.quantity > 20
  ) then
    raise exception 'INVALID_QUANTITY';
  end if;

  perform p.id
  from public.products p
  join jsonb_to_recordset(p_items) as x(product_id bigint, quantity integer) on x.product_id = p.id
  where p.active = true
  order by p.id
  for update;

  select count(*) into v_product_count
  from public.products p
  join jsonb_to_recordset(p_items) as x(product_id bigint, quantity integer) on x.product_id = p.id
  where p.active = true;

  if v_product_count <> v_item_count then
    raise exception 'PRODUCT_NOT_AVAILABLE';
  end if;

  if exists (
    select 1
    from public.products p
    join jsonb_to_recordset(p_items) as x(product_id bigint, quantity integer) on x.product_id = p.id
    where p.stock < x.quantity
  ) then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  select coalesce(sum(p.price * x.quantity),0)::integer into v_subtotal
  from public.products p
  join jsonb_to_recordset(p_items) as x(product_id bigint, quantity integer) on x.product_id = p.id;

  v_shipping_fee := case when v_subtotal >= p_free_shipping_threshold then 0 else p_shipping_fee_base end;
  v_order_number := 'SH-' || to_char(now(),'YYMMDD') || '-' || upper(substr(encode(gen_random_bytes(5),'hex'),1,10));

  insert into public.orders (
    order_number,public_token_hash,customer_name,phone_normalized,shipping_address,delivery_memo,
    subtotal,shipping_fee,total,status,idempotency_key,terms_version,privacy_version,refund_version
  ) values (
    v_order_number,p_public_token_hash,trim(p_customer_name),p_phone_normalized,trim(p_shipping_address),left(coalesce(p_delivery_memo,''),300),
    v_subtotal,v_shipping_fee,v_subtotal + v_shipping_fee,'입금 대기',p_idempotency_key,p_terms_version,p_privacy_version,p_refund_version
  ) returning * into v_order;

  insert into public.order_items (order_id,product_id,product_name,unit_price,quantity,line_total)
  select v_order.id,p.id,p.name,p.price,x.quantity,p.price*x.quantity
  from public.products p
  join jsonb_to_recordset(p_items) as x(product_id bigint, quantity integer) on x.product_id = p.id;

  update public.products p
  set stock = p.stock - x.quantity
  from jsonb_to_recordset(p_items) as x(product_id bigint, quantity integer)
  where p.id = x.product_id;

  insert into public.order_status_history(order_id,from_status,to_status,actor,note)
  values(v_order.id,null,'입금 대기','customer','주문 생성');

  return jsonb_build_object(
    'id',v_order.id,'order_number',v_order.order_number,'status',v_order.status,
    'subtotal',v_order.subtotal,'shipping_fee',v_order.shipping_fee,'total',v_order.total,
    'created_at',v_order.created_at,'idempotent_replay',false
  );
end;
$$;

create or replace function public.cancel_order_public(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status = '주문 취소' then
    return jsonb_build_object('ok',true,'status','주문 취소','idempotent_replay',true);
  end if;
  if v_order.status <> '입금 대기' then raise exception 'ORDER_NOT_CANCELLABLE'; end if;

  update public.products p
  set stock = p.stock + oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id and oi.product_id = p.id;

  update public.orders set status = '주문 취소' where id = p_order_id;
  insert into public.order_status_history(order_id,from_status,to_status,actor,note)
  values(p_order_id,v_order.status,'주문 취소','customer','고객 직접 취소');

  return jsonb_build_object('ok',true,'status','주문 취소','idempotent_replay',false);
end;
$$;

create or replace function public.payment_notice_public(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status = '입금 확인 요청' then
    return jsonb_build_object('ok',true,'status','입금 확인 요청','idempotent_replay',true);
  end if;
  if v_order.status <> '입금 대기' then raise exception 'PAYMENT_NOTICE_NOT_ALLOWED'; end if;

  update public.orders
  set status = '입금 확인 요청', payment_notice_at = now()
  where id = p_order_id;

  insert into public.order_status_history(order_id,from_status,to_status,actor,note)
  values(p_order_id,v_order.status,'입금 확인 요청','customer','고객 입금 확인 요청');

  return jsonb_build_object('ok',true,'status','입금 확인 요청','idempotent_replay',false);
end;
$$;

create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.api_rate_limits;
  v_now timestamptz := now();
begin
  if p_limit < 1 or p_window_seconds < 1 or length(p_key) > 200 then
    return false;
  end if;

  insert into public.api_rate_limits(key,window_start,request_count,updated_at)
  values(p_key,v_now,0,v_now)
  on conflict(key) do nothing;

  select * into v_row from public.api_rate_limits where key = p_key for update;

  if v_row.window_start + make_interval(secs => p_window_seconds) <= v_now then
    update public.api_rate_limits
    set window_start = v_now, request_count = 1, updated_at = v_now
    where key = p_key;
    return true;
  end if;

  if v_row.request_count >= p_limit then
    return false;
  end if;

  update public.api_rate_limits
  set request_count = request_count + 1, updated_at = v_now
  where key = p_key;
  return true;
end;
$$;

revoke all on function public.create_order_transaction(text,text,text,text,jsonb,text,text,text,text,text,integer,integer) from public, anon, authenticated;
revoke all on function public.cancel_order_public(uuid) from public, anon, authenticated;
revoke all on function public.payment_notice_public(uuid) from public, anon, authenticated;
revoke all on function public.check_rate_limit(text,integer,integer) from public, anon, authenticated;

grant execute on function public.create_order_transaction(text,text,text,text,jsonb,text,text,text,text,text,integer,integer) to service_role;
grant execute on function public.cancel_order_public(uuid) to service_role;
grant execute on function public.payment_notice_public(uuid) to service_role;
grant execute on function public.check_rate_limit(text,integer,integer) to service_role;
