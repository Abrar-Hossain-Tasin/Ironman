-- ============================================================
-- Migration: Align DB schema with Java models (Phase 1)
-- Adds all enums, columns, and tables that the Spring Boot
-- models expect but were not in the initial migration.
-- ============================================================

-- ── Extend order_status enum ────────────────────────────────
do $$ begin
  alter type public.order_status add value if not exists 'delivery_failed';
exception when others then null; end $$;

do $$ begin
  alter type public.order_status add value if not exists 'returned';
exception when others then null; end $$;

do $$ begin
  alter type public.order_status add value if not exists 'disputed';
exception when others then null; end $$;

-- ── Extend payment_method enum ──────────────────────────────
do $$ begin
  alter type public.payment_method add value if not exists 'bkash';
exception when others then null; end $$;

do $$ begin
  alter type public.payment_method add value if not exists 'nagad';
exception when others then null; end $$;

do $$ begin
  alter type public.payment_method add value if not exists 'rocket';
exception when others then null; end $$;

do $$ begin
  alter type public.payment_method add value if not exists 'card';
exception when others then null; end $$;

-- ── New enum types ──────────────────────────────────────────
do $$ begin
  create type public.cod_confirmation_status as enum (
    'pending', 'customer_confirmed', 'delivery_confirmed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discount_type as enum ('percent', 'fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.issue_type as enum (
    'damage', 'missing', 'wrong_item', 'late', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.issue_status as enum (
    'open', 'in_review', 'resolved', 'rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.refund_status as enum ('pending', 'processed', 'failed');
exception when duplicate_object then null; end $$;

-- ── Add columns to orders ───────────────────────────────────
alter table public.orders
  add column if not exists discount_amount   numeric(10,2) not null default 0,
  add column if not exists coupon_code       varchar(64),
  add column if not exists cod_confirmation_status public.cod_confirmation_status not null default 'pending',
  add column if not exists customer_confirmed_at  timestamptz,
  add column if not exists delivery_confirmed_at  timestamptz;

-- ── Add actual_quantity to order_items ──────────────────────
alter table public.order_items
  add column if not exists actual_quantity integer;

-- ── Add actor_role to order_tracking ────────────────────────
alter table public.order_tracking
  add column if not exists actor_role public.user_role;

-- ── Coupons ─────────────────────────────────────────────────
create table if not exists public.coupons (
  id               uuid primary key default gen_random_uuid(),
  code             varchar(64) not null unique,
  description      text,
  discount_type    public.discount_type not null,
  discount_value   numeric(10,2) not null check (discount_value > 0),
  min_order_amount numeric(10,2) not null default 0,
  max_discount_amount numeric(10,2),
  valid_from       timestamptz,
  valid_to         timestamptz,
  max_uses         integer,
  current_uses     integer not null default 0,
  max_uses_per_user integer not null default 1,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists trg_coupons_updated_at on public.coupons;
create trigger trg_coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

-- ── Coupon redemptions ───────────────────────────────────────
create table if not exists public.coupon_redemptions (
  id              uuid primary key default gen_random_uuid(),
  coupon_id       uuid not null references public.coupons(id) on delete cascade,
  order_id        uuid not null unique references public.orders(id) on delete cascade,
  customer_id     uuid not null references public.users(id),
  discount_amount numeric(10,2) not null,
  redeemed_at     timestamptz not null default now()
);

create index if not exists idx_coupon_redemptions_coupon_customer
  on public.coupon_redemptions(coupon_id, customer_id);

-- ── Order issues ─────────────────────────────────────────────
create table if not exists public.order_issues (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  reported_by      uuid not null references public.users(id),
  issue_type       public.issue_type not null,
  description      text not null,
  photo_urls       text,
  status           public.issue_status not null default 'open',
  resolution_notes text,
  refund_amount    numeric(10,2),
  resolved_by      uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz
);

create index if not exists idx_order_issues_order  on public.order_issues(order_id);
create index if not exists idx_order_issues_reporter on public.order_issues(reported_by, created_at desc);
create index if not exists idx_order_issues_status on public.order_issues(status);

-- ── Order reviews ────────────────────────────────────────────
create table if not exists public.order_reviews (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null unique references public.orders(id) on delete cascade,
  customer_id     uuid not null references public.users(id),
  delivery_man_id uuid references public.users(id) on delete set null,
  overall_rating  smallint not null check (overall_rating between 1 and 5),
  service_rating  smallint check (service_rating between 1 and 5),
  delivery_rating smallint check (delivery_rating between 1 and 5),
  comment         text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_order_reviews_delivery_man
  on public.order_reviews(delivery_man_id, created_at desc);

-- ── Order receipts ───────────────────────────────────────────
create table if not exists public.order_receipts (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null unique references public.orders(id) on delete cascade,
  receipt_number varchar(64) not null unique,
  generated_at   timestamptz not null default now(),
  file_path      text,
  generated_by   uuid references public.users(id) on delete set null
);

-- ── Refunds ──────────────────────────────────────────────────
create table if not exists public.refunds (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders(id) on delete cascade,
  amount                numeric(10,2) not null check (amount > 0),
  reason                text,
  status                public.refund_status not null default 'pending',
  original_method       public.payment_method,
  transaction_reference text,
  requested_by          uuid references public.users(id) on delete set null,
  processed_by          uuid references public.users(id) on delete set null,
  requested_at          timestamptz not null default now(),
  processed_at          timestamptz
);

create index if not exists idx_refunds_order  on public.refunds(order_id);
create index if not exists idx_refunds_status on public.refunds(status);

-- ── RLS: new tables ──────────────────────────────────────────
alter table public.coupons            enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.order_issues       enable row level security;
alter table public.order_reviews      enable row level security;
alter table public.order_receipts     enable row level security;
alter table public.refunds            enable row level security;

-- Coupons: admin can do anything; customers can read active coupons
create policy "coupons admin all" on public.coupons
  for all using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "coupons customer read active" on public.coupons
  for select using (is_active = true or public.current_app_role() = 'admin');

-- Coupon redemptions: owner or admin
create policy "coupon_redemptions read scoped" on public.coupon_redemptions
  for select using (customer_id = auth.uid() or public.current_app_role() = 'admin');

create policy "coupon_redemptions insert" on public.coupon_redemptions
  for insert with check (
    customer_id = auth.uid() or public.current_app_role() in ('admin','customer')
  );

-- Order issues
create policy "issues read scoped" on public.order_issues
  for select using (
    reported_by = auth.uid()
    or public.current_app_role() = 'admin'
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );

create policy "issues customer insert" on public.order_issues
  for insert with check (
    reported_by = auth.uid() and public.current_app_role() = 'customer'
  );

create policy "issues admin update" on public.order_issues
  for update using (public.current_app_role() = 'admin');

-- Order reviews
create policy "reviews read scoped" on public.order_reviews
  for select using (
    customer_id = auth.uid()
    or public.current_app_role() in ('admin','delivery_man')
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );

create policy "reviews customer insert" on public.order_reviews
  for insert with check (
    customer_id = auth.uid() and public.current_app_role() = 'customer'
  );

-- Order receipts
create policy "receipts read scoped" on public.order_receipts
  for select using (
    public.current_app_role() = 'admin'
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );

create policy "receipts staff insert" on public.order_receipts
  for insert with check (
    public.current_app_role() in ('admin','delivery_man')
  );

-- Refunds
create policy "refunds read scoped" on public.refunds
  for select using (
    public.current_app_role() = 'admin'
    or requested_by = auth.uid()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );

create policy "refunds admin write" on public.refunds
  for all using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- ── Realtime: order_issues for admin dashboards ──────────────
do $$ begin
  alter publication supabase_realtime add table public.order_issues;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.order_reviews;
exception when duplicate_object then null; end $$;
