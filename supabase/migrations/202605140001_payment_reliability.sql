-- ============================================================
-- Migration: Payment reliability hardening
-- Adds durable webhook event logs, retry state, reconciliation
-- audit events, and a balance-application marker on payments.
-- ============================================================

alter table public.payments
  add column if not exists applied_to_balance boolean not null default true;

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider varchar(32) not null,
  event_id varchar(160),
  idempotency_key varchar(200) not null,
  payload_sha256 char(64) not null,
  signature_header text,
  request_headers text,
  raw_payload text not null,
  status varchar(32) not null default 'received'
    check (status in ('received','processed','duplicate','retry_scheduled','failed')),
  payment_id uuid references public.payments(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  attempt_count integer not null default 0,
  last_error text,
  next_retry_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, idempotency_key)
);

create unique index if not exists uq_payment_webhook_events_provider_event
  on public.payment_webhook_events(provider, event_id)
  where event_id is not null and event_id <> '';

create index if not exists idx_payment_webhook_events_status_retry
  on public.payment_webhook_events(status, next_retry_at);

create index if not exists idx_payment_webhook_events_created
  on public.payment_webhook_events(created_at desc);

drop trigger if exists trg_payment_webhook_events_updated_at on public.payment_webhook_events;
create trigger trg_payment_webhook_events_updated_at
before update on public.payment_webhook_events
for each row execute function public.set_updated_at();

create table if not exists public.payment_audit_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete set null,
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  actor_type varchar(32) not null,
  action varchar(80) not null,
  previous_payment_status public.payment_status,
  new_payment_status public.payment_status,
  previous_paid_amount numeric(10,2),
  new_paid_amount numeric(10,2),
  notes text,
  metadata text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_audit_events_order_created
  on public.payment_audit_events(order_id, created_at desc);

create index if not exists idx_payment_audit_events_payment_created
  on public.payment_audit_events(payment_id, created_at desc);

create index if not exists idx_payment_audit_events_created
  on public.payment_audit_events(created_at desc);

alter table public.payment_webhook_events enable row level security;
alter table public.payment_audit_events enable row level security;

drop policy if exists "payment webhook events admin read" on public.payment_webhook_events;
create policy "payment webhook events admin read" on public.payment_webhook_events
  for select using (public.current_app_role() = 'admin');

drop policy if exists "payment audit events admin read" on public.payment_audit_events;
create policy "payment audit events admin read" on public.payment_audit_events
  for select using (public.current_app_role() = 'admin');

do $$ begin
  alter publication supabase_realtime add table public.payment_webhook_events;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.payment_audit_events;
exception when duplicate_object then null; end $$;
