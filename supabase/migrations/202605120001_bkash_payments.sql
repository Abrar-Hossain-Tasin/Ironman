do $$ begin
  alter type public.payment_type add value if not exists 'bkash_merchant';
exception when duplicate_object then null; end $$;

alter table public.payments
  add column if not exists payment_reference text,
  add column if not exists payer_phone text;

create unique index if not exists uq_payments_reference_present
  on public.payments(lower(payment_reference))
  where payment_reference is not null and payment_reference <> '';
