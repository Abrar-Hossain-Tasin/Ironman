# Security And Deployment Hygiene

This file is the production checklist for the IRONMAN stack before adding more product surface.

## Audit Posture

- Frontend dependencies are patched to `next@15.5.18` and `eslint-config-next@15.5.18`.
- `postcss` is pinned and overridden to `^8.5.14` so Next's nested PostCSS copy resolves to the patched line.
- Use Node `>=20.19.0` for installs, builds, and deploys. Older local Node versions may install with engine warnings.
- Re-check with:

```powershell
cd frontend
npm audit
```

Avoid `npm audit fix --force` unless you are intentionally doing a framework migration review.

## Production Env Validation

Frontend validation runs during Vercel production builds, or anytime `STRICT_ENV_VALIDATION=true`.

Required frontend production env vars:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BKASH_MERCHANT_NAME`
- `NEXT_PUBLIC_BKASH_MERCHANT_NUMBER`
- `NEXT_PUBLIC_SENTRY_DSN`

Backend validation runs when `SPRING_PROFILES_ACTIVE=prod`, `STRICT_ENV_VALIDATION=true`, or Render service metadata is present.

Required backend production env vars:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `AUTH_COOKIE_SECURE=true`
- `AUTH_COOKIE_SAME_SITE=None`
- `PAYMENT_WEBHOOK_SECRET`
- `PAYMENT_WEBHOOK_BKASH_SECRET`
- `PAYMENT_WEBHOOK_NAGAD_SECRET`
- `PAYMENT_WEBHOOK_ROCKET_SECRET`
- `PAYMENT_WEBHOOK_CARD_SECRET`
- `SENTRY_DSN`
- `RESEND_API_KEY` when `MAIL_ENABLED=true`

## Supabase Storage

The current frontend uploads directly to Supabase Storage from `frontend/lib/storage.ts`.

Required buckets:

- `evidence`: public bucket for order, assignment, issue, pickup, delivery, wash, iron, and dry-cleaning photos.
- `avatars`: public bucket for customer profile photos.

Because the app currently authenticates users through the Spring API, not Supabase Auth, browser uploads use the Supabase `anon` role. These policies are the compatibility baseline. For stricter production hardening, move uploads behind the backend and use service-role signed uploads instead of allowing anonymous inserts.

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('evidence', 'evidence', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ironman evidence public read" on storage.objects;
create policy "ironman evidence public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'evidence');

drop policy if exists "ironman evidence browser upload" on storage.objects;
create policy "ironman evidence browser upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'evidence');

drop policy if exists "ironman avatars public read" on storage.objects;
create policy "ironman avatars public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "ironman avatars browser upload" on storage.objects;
create policy "ironman avatars browser upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "ironman avatars browser upsert" on storage.objects;
create policy "ironman avatars browser upsert"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');
```

## Render Backend

The root `render.yaml` defines a Dockerized backend service using `backend/Dockerfile`.

Required Render values:

- Set `ALLOWED_ORIGINS` to the production Vercel origin, plus preview origins only if you intentionally allow them.
- Store all `sync: false` values as Render secrets.
- Configure each payment provider to sign webhooks as
  `HMAC-SHA256(<timestamp> + "." + <raw JSON body>)`, send the signature in
  the configured provider header such as `X-BKash-Signature`, and send the
  timestamp in the matching `X-BKash-Timestamp` header. Keep provider secrets
  different from each other; `PAYMENT_WEBHOOK_SECRET` is retained only as a
  compatibility fallback for local and rolling deployments.
- Keep `SPRING_PROFILES_ACTIVE=prod` and `STRICT_ENV_VALIDATION=true` enabled.
- Health check path is `/api/v1/health`.

## Vercel Frontend

`frontend/vercel.json` configures the Next.js build, Singapore region, and baseline security headers.

Required Vercel production env vars:

- `NEXT_PUBLIC_API_URL=https://<render-service>/api/v1`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BKASH_MERCHANT_NAME`
- `NEXT_PUBLIC_BKASH_MERCHANT_NUMBER`
- `NEXT_PUBLIC_APP_ENV=production`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.10`
- `NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE=0.00`
- `NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE=1.00`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT=production`
- `SENTRY_TRACES_SAMPLE_RATE=0.10`
- `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` if uploading source maps

## Observability

Frontend:

- `@sentry/nextjs` is initialized through `instrumentation-client.ts`, `instrumentation.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`.
- App Router error boundaries call `Sentry.captureException`.
- Vercel Web Analytics and Speed Insights are mounted in `app/layout.tsx`.

Backend:

- `sentry-spring-boot-starter-jakarta` is configured through `sentry.*` properties in `application.yml`.
- Production startup requires `SENTRY_DSN`.

References:

- Sentry Next.js manual setup: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
- Supabase Storage buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
