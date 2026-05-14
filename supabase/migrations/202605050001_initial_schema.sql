create extension if not exists pgcrypto;
create extension if not exists citext;

do $$ begin
  create type public.user_role as enum ('admin','customer','delivery_man','wash_man','iron_man','dry_clean_man');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'pending',
    'confirmed',
    'pickup_assigned',
    'picked_up',
    'in_wash',
    'wash_complete',
    'in_dry_clean',
    'dry_clean_complete',
    'waiting_for_iron',
    'in_iron',
    'iron_complete',
    'ready',
    'delivery_assigned',
    'out_for_delivery',
    'delivered',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cod','online');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending','paid','partial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assignment_type as enum ('pickup','delivery','wash','iron','dry_clean');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assignment_status as enum ('pending','accepted','in_progress','completed','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_type as enum ('cod_pickup','cod_delivery','bkash_merchant','advance','partial');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  )
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email citext not null unique,
  phone text not null,
  password_hash text not null,
  role public.user_role not null default 'customer',
  profile_picture_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text not null default 'Home',
  address_line1 text not null,
  address_line2 text,
  area text not null,
  city text not null,
  postal_code text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  default_address_id uuid references public.addresses(id) on delete set null,
  preferred_pickup_time time,
  preferred_delivery_time time,
  total_orders integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon_url text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clothing_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon_url text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_pricing (
  id uuid primary key default gen_random_uuid(),
  service_category_id uuid not null references public.service_categories(id),
  clothing_type_id uuid not null references public.clothing_types(id),
  price numeric(10,2) not null check (price >= 0),
  currency varchar(3) not null default 'BDT',
  effective_from date not null default current_date,
  effective_to date,
  set_by_admin_id uuid references public.users(id) on delete set null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_service_pricing_current
  on public.service_pricing(service_category_id, clothing_type_id)
  where is_current = true;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number varchar(32) not null unique,
  customer_id uuid not null references public.users(id),
  pickup_address_id uuid not null references public.addresses(id),
  delivery_address_id uuid not null references public.addresses(id),
  preferred_pickup_date date not null,
  preferred_pickup_time_slot varchar(32) not null,
  preferred_delivery_date date not null,
  preferred_delivery_time_slot varchar(32) not null,
  special_instructions text,
  status public.order_status not null default 'pending',
  payment_method public.payment_method not null default 'cod',
  payment_status public.payment_status not null default 'pending',
  total_amount numeric(10,2) not null default 0,
  paid_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_customer_status on public.orders(customer_id, status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  clothing_type_id uuid not null references public.clothing_types(id),
  service_category_id uuid not null references public.service_categories(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  notes text
);

create table if not exists public.order_tracking (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status varchar(64) not null,
  status_label varchar(128) not null,
  description text,
  updated_by uuid references public.users(id) on delete set null,
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  timestamp timestamptz not null default now()
);

create index if not exists idx_order_tracking_order_time on public.order_tracking(order_id, timestamp);

create table if not exists public.order_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  assigned_to uuid not null references public.users(id),
  assignment_type public.assignment_type not null,
  assigned_by uuid references public.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  status public.assignment_status not null default 'pending',
  notes text
);

create index if not exists idx_assignments_assignee_status on public.order_assignments(assigned_to, status);

create table if not exists public.delivery_locations (
  id uuid primary key default gen_random_uuid(),
  delivery_man_id uuid not null unique references public.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  accuracy numeric(8,2),
  updated_at timestamptz not null default now()
);

create index if not exists idx_delivery_locations_order on public.delivery_locations(order_id);
create index if not exists idx_delivery_locations_updated_at on public.delivery_locations(updated_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  collected_by uuid references public.users(id) on delete set null,
  amount numeric(10,2) not null check (amount > 0),
  payment_type public.payment_type not null,
  collected_at timestamptz not null default now(),
  payment_reference text,
  payer_phone text,
  notes text,
  is_verified boolean not null default false,
  verified_by uuid references public.users(id) on delete set null,
  verified_at timestamptz
);

create index if not exists idx_payments_order on public.payments(order_id);
create index if not exists idx_payments_collector_time on public.payments(collected_by, collected_at desc);
create unique index if not exists uq_payments_reference_present
  on public.payments(lower(payment_reference))
  where payment_reference is not null and payment_reference <> '';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null,
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_unread on public.notifications(user_id, is_read, created_at desc);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_addresses_updated_at on public.addresses;
create trigger trg_addresses_updated_at before update on public.addresses
for each row execute function public.set_updated_at();

drop trigger if exists trg_customer_profiles_updated_at on public.customer_profiles;
create trigger trg_customer_profiles_updated_at before update on public.customer_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_service_categories_updated_at on public.service_categories;
create trigger trg_service_categories_updated_at before update on public.service_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_clothing_types_updated_at on public.clothing_types;
create trigger trg_clothing_types_updated_at before update on public.clothing_types
for each row execute function public.set_updated_at();

drop trigger if exists trg_service_pricing_updated_at on public.service_pricing;
create trigger trg_service_pricing_updated_at before update on public.service_pricing
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_delivery_locations_updated_at on public.delivery_locations;
create trigger trg_delivery_locations_updated_at before update on public.delivery_locations
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.addresses enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.service_categories enable row level security;
alter table public.clothing_types enable row level security;
alter table public.service_pricing enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_tracking enable row level security;
alter table public.order_assignments enable row level security;
alter table public.delivery_locations enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;

create policy "users read own or admin" on public.users
  for select using (id = auth.uid() or public.current_app_role() = 'admin');
create policy "users update own or admin" on public.users
  for update using (id = auth.uid() or public.current_app_role() = 'admin');

create policy "addresses owner read" on public.addresses
  for select using (user_id = auth.uid() or public.current_app_role() = 'admin');
create policy "addresses owner insert" on public.addresses
  for insert with check (user_id = auth.uid() or public.current_app_role() = 'admin');
create policy "addresses owner update" on public.addresses
  for update using (user_id = auth.uid() or public.current_app_role() = 'admin');
create policy "addresses owner delete" on public.addresses
  for delete using (user_id = auth.uid() or public.current_app_role() = 'admin');

create policy "profiles owner read" on public.customer_profiles
  for select using (user_id = auth.uid() or public.current_app_role() = 'admin');
create policy "profiles owner update" on public.customer_profiles
  for update using (user_id = auth.uid() or public.current_app_role() = 'admin');

create policy "service categories public read" on public.service_categories
  for select using (is_active = true or public.current_app_role() = 'admin');
create policy "clothing types public read" on public.clothing_types
  for select using (is_active = true or public.current_app_role() = 'admin');

create policy "pricing public read" on public.service_pricing
  for select using (is_current = true or public.current_app_role() = 'admin');
create policy "pricing admin write" on public.service_pricing
  for all using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "orders read scoped" on public.orders
  for select using (
    customer_id = auth.uid()
    or public.current_app_role() in ('admin','delivery_man','wash_man','iron_man','dry_clean_man')
  );
create policy "orders customer insert" on public.orders
  for insert with check (customer_id = auth.uid() and public.current_app_role() = 'customer');
create policy "orders scoped update" on public.orders
  for update using (
    public.current_app_role() = 'admin'
    or public.current_app_role() = 'delivery_man'
  );

create policy "order items read scoped" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
      and (o.customer_id = auth.uid() or public.current_app_role() in ('admin','delivery_man','wash_man','iron_man','dry_clean_man'))
    )
  );
create policy "order items customer insert" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );

create policy "tracking public by scoped order" on public.order_tracking
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
      and (o.customer_id = auth.uid() or public.current_app_role() in ('admin','delivery_man','wash_man','iron_man','dry_clean_man'))
    )
  );
create policy "tracking staff insert" on public.order_tracking
  for insert with check (public.current_app_role() in ('admin','delivery_man','wash_man','iron_man','dry_clean_man','customer'));

create policy "assignments read scoped" on public.order_assignments
  for select using (assigned_to = auth.uid() or public.current_app_role() = 'admin');
create policy "assignments admin insert" on public.order_assignments
  for insert with check (public.current_app_role() = 'admin');
create policy "assignments assignee update" on public.order_assignments
  for update using (assigned_to = auth.uid() or public.current_app_role() = 'admin');

create policy "delivery locations read scoped" on public.delivery_locations
  for select using (
    delivery_man_id = auth.uid()
    or public.current_app_role() = 'admin'
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = auth.uid()
    )
  );
create policy "delivery locations delivery insert" on public.delivery_locations
  for insert with check (
    delivery_man_id = auth.uid()
    and public.current_app_role() = 'delivery_man'
  );
create policy "delivery locations delivery update" on public.delivery_locations
  for update using (
    delivery_man_id = auth.uid()
    or public.current_app_role() = 'admin'
  )
  with check (
    delivery_man_id = auth.uid()
    or public.current_app_role() = 'admin'
  );

create policy "payments read scoped" on public.payments
  for select using (
    collected_by = auth.uid()
    or public.current_app_role() = 'admin'
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy "payments delivery insert" on public.payments
  for insert with check (public.current_app_role() in ('admin','delivery_man'));
create policy "payments admin verify" on public.payments
  for update using (public.current_app_role() = 'admin');

create policy "notifications owner read" on public.notifications
  for select using (user_id = auth.uid() or public.current_app_role() = 'admin');
create policy "notifications owner update" on public.notifications
  for update using (user_id = auth.uid() or public.current_app_role() = 'admin');
create policy "notifications staff insert" on public.notifications
  for insert with check (public.current_app_role() in ('admin','delivery_man','wash_man','iron_man','dry_clean_man','customer'));

insert into storage.buckets (id, name, public)
values
  ('delivery-proofs', 'delivery-proofs', false),
  ('profile-pictures', 'profile-pictures', true),
  ('clothing-type-icons', 'clothing-type-icons', true),
  ('service-icons', 'service-icons', true)
on conflict (id) do nothing;

create policy "delivery proofs staff read" on storage.objects
  for select using (
    bucket_id = 'delivery-proofs'
    and public.current_app_role() in ('admin','delivery_man')
  );
create policy "delivery proofs delivery upload" on storage.objects
  for insert with check (
    bucket_id = 'delivery-proofs'
    and public.current_app_role() in ('admin','delivery_man')
  );
create policy "public image buckets readable" on storage.objects
  for select using (bucket_id in ('profile-pictures','clothing-type-icons','service-icons'));
create policy "public image buckets owner upload" on storage.objects
  for insert with check (bucket_id in ('profile-pictures','clothing-type-icons','service-icons'));

do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.order_tracking;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.order_assignments;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.delivery_locations;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

insert into public.service_categories (name, description, display_order)
values
  ('Wash', 'Everyday washing with careful sorting and folding.', 1),
  ('Dry Clean', 'Gentle dry cleaning for premium garments.', 2),
  ('Iron', 'Sharp pressing and crease care.', 3),
  ('Wash+Iron', 'Complete washing and pressing bundle.', 4),
  ('Steam', 'Steam refresh for delicate garments.', 5)
on conflict (name) do update set
  description = excluded.description,
  display_order = excluded.display_order,
  is_active = true;

insert into public.clothing_types (name, display_order)
values
  ('Shirt', 1),
  ('Pant', 2),
  ('Pajama', 3),
  ('Saree', 4),
  ('Suit', 5),
  ('Shoe', 6),
  ('Jacket', 7)
on conflict (name) do update set
  display_order = excluded.display_order,
  is_active = true;

insert into public.service_pricing (service_category_id, clothing_type_id, price, currency, effective_from, is_current)
select
  sc.id,
  ct.id,
  case
    when sc.name = 'Wash' then case ct.name when 'Shirt' then 35 when 'Pant' then 40 when 'Pajama' then 35 when 'Saree' then 90 when 'Suit' then 180 when 'Shoe' then 120 else 85 end
    when sc.name = 'Iron' then case ct.name when 'Shirt' then 20 when 'Pant' then 25 when 'Pajama' then 20 when 'Saree' then 60 when 'Suit' then 120 when 'Shoe' then 0 else 55 end
    when sc.name = 'Wash+Iron' then case ct.name when 'Shirt' then 50 when 'Pant' then 60 when 'Pajama' then 50 when 'Saree' then 135 when 'Suit' then 260 when 'Shoe' then 0 else 125 end
    when sc.name = 'Dry Clean' then case ct.name when 'Shirt' then 120 when 'Pant' then 140 when 'Pajama' then 100 when 'Saree' then 250 when 'Suit' then 400 when 'Shoe' then 180 else 220 end
    when sc.name = 'Steam' then case ct.name when 'Shirt' then 30 when 'Pant' then 35 when 'Pajama' then 30 when 'Saree' then 80 when 'Suit' then 150 when 'Shoe' then 0 else 70 end
    else 0
  end,
  'BDT',
  current_date,
  true
from public.service_categories sc
cross join public.clothing_types ct
where not (
  ct.name = 'Shoe' and sc.name in ('Iron', 'Wash+Iron', 'Steam')
)
on conflict do nothing;

insert into public.users (id, full_name, email, phone, password_hash, role, is_active)
values (
  '00000000-0000-0000-0000-000000000001',
  'IRONMAN Admin',
  'admin@ironman.local',
  '+8801000000000',
  '$2a$10$4B2sEihRFouUQ5uA/T1rt.g3RCUTxqKeAWGtJWmLshOh.JrELmA/.',
  'admin',
  true
)
on conflict (email) do nothing;
