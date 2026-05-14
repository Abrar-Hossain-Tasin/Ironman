-- Align payment_webhook_events.payload_sha256 with the JPA entity mapping.
-- The column was originally created as char(64); Hibernate maps the String
-- field to varchar, so schema validation fails on a char/varchar mismatch.
alter table public.payment_webhook_events
  alter column payload_sha256 type varchar(64);
