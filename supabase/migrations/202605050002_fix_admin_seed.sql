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
on conflict (email) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  password_hash = excluded.password_hash,
  role = excluded.role,
  is_active = true,
  updated_at = now();
