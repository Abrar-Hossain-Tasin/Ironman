create table if not exists public.delivery_locations (
  id uuid primary key default gen_random_uuid(),
  delivery_man_id uuid not null unique references public.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  accuracy numeric(8,2),
  updated_at timestamptz not null default now()
);

create index if not exists idx_delivery_locations_order
  on public.delivery_locations(order_id);

create index if not exists idx_delivery_locations_updated_at
  on public.delivery_locations(updated_at desc);

drop trigger if exists trg_delivery_locations_updated_at on public.delivery_locations;
create trigger trg_delivery_locations_updated_at before update on public.delivery_locations
for each row execute function public.set_updated_at();

alter table public.delivery_locations enable row level security;

drop policy if exists "delivery locations read scoped" on public.delivery_locations;
create policy "delivery locations read scoped" on public.delivery_locations
  for select using (
    delivery_man_id = auth.uid()
    or public.current_app_role() = 'admin'
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );

drop policy if exists "delivery locations delivery insert" on public.delivery_locations;
create policy "delivery locations delivery insert" on public.delivery_locations
  for insert with check (
    delivery_man_id = auth.uid()
    and public.current_app_role() = 'delivery_man'
  );

drop policy if exists "delivery locations delivery update" on public.delivery_locations;
create policy "delivery locations delivery update" on public.delivery_locations
  for update using (
    delivery_man_id = auth.uid()
    or public.current_app_role() = 'admin'
  )
  with check (
    delivery_man_id = auth.uid()
    or public.current_app_role() = 'admin'
  );

do $$ begin
  alter publication supabase_realtime add table public.delivery_locations;
exception when duplicate_object then null; end $$;
