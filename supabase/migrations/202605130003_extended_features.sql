-- ============================================================
-- Migration: Extended features — FCM device token, draft orders,
--            in-app chat
-- ============================================================

-- ── FCM device token on users ────────────────────────────────
alter table public.users
  add column if not exists device_token text;

-- ── Draft order support ──────────────────────────────────────
do $$ begin
  alter type public.order_status add value if not exists 'draft' before 'pending';
exception when others then null; end $$;

-- ── In-app chat messages ─────────────────────────────────────
create table if not exists public.order_messages (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  sender_id   uuid not null references public.users(id),
  sender_role public.user_role not null,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_order_messages_order_time
  on public.order_messages(order_id, created_at asc);

alter table public.order_messages enable row level security;

create policy "messages read scoped" on public.order_messages
  for select using (
    public.current_app_role() = 'admin'
    or sender_id = auth.uid()
    or exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.customer_id = auth.uid()
             or public.current_app_role() = 'delivery_man')
    )
  );

create policy "messages insert scoped" on public.order_messages
  for insert with check (
    sender_id = auth.uid()
    and public.current_app_role() in ('customer','delivery_man','admin')
  );

-- Enable Supabase Realtime so the frontend can listen for new messages
do $$ begin
  alter publication supabase_realtime add table public.order_messages;
exception when duplicate_object then null; end $$;
