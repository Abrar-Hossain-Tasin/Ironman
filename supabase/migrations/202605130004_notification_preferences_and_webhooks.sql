-- ============================================================
-- Migration: Notification preferences + provider settlement types
-- ============================================================

do $$ begin
  alter type public.payment_type add value if not exists 'nagad_merchant';
exception when others then null; end $$;

do $$ begin
  alter type public.payment_type add value if not exists 'rocket_merchant';
exception when others then null; end $$;

do $$ begin
  alter type public.payment_type add value if not exists 'card';
exception when others then null; end $$;

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  channel varchar(32) not null check (channel in ('in_app','email','sms','push')),
  notification_type varchar(64) not null default 'all',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, channel, notification_type)
);

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "notification preferences owner read" on public.notification_preferences
  for select using (user_id = auth.uid() or public.current_app_role() = 'admin');

create policy "notification preferences owner write" on public.notification_preferences
  for all using (user_id = auth.uid() or public.current_app_role() = 'admin')
  with check (user_id = auth.uid() or public.current_app_role() = 'admin');
