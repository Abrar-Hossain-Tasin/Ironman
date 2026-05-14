# IRONMAN Online Laundry Service Platform

Full-stack scaffold for IRONMAN, an online laundry service platform for customers, admins, delivery staff, and processing workers.

## Stack

- Backend: Spring Boot 3, Java 21, Maven, PostgreSQL, JWT auth
- Frontend: Next.js 14 App Router, TypeScript, Tailwind CSS
- Database: Supabase PostgreSQL, Realtime, RLS, Storage

## Project Layout

```text
ironman/
  backend/      Spring Boot REST API
  frontend/     Next.js app
  supabase/     SQL migrations and seed data
```

## Local Setup

1. Create a Supabase project and run `supabase/migrations/202605050001_initial_schema.sql`.
2. Copy environment values:
   - Backend: `backend/.env.example`
   - Frontend: `frontend/.env.example`
3. Start the backend:

```powershell
cd backend
$env:JAVA_HOME='E:\JDK21'
mvn spring-boot:run
```

4. Start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

## First Login

The migration seeds a first admin so you can enter the management panel:

- Email: `admin@ironman.local`
- Password: `Admin@12345`

Change this password after first login or replace the seeded row before production.

## Dynamic Flows Included

- Public homepage, pricing grid, and order tracker load data from the backend.
- Customer registration/login persists JWT auth in the frontend.
- Customer profile/address management calls `/api/v1/users`.
- Customer order wizard loads live pricing and saved addresses, then posts to `/api/v1/orders`.
- Customer order detail loads items, tracking timeline, and COD payment log.
- Admin dashboard, orders, order detail, pricing, staff, assignments, and payment ledger call protected APIs.
- Delivery dashboard supports accept/start/complete and COD collection.
- Worker dashboard supports start/complete for wash, iron, and dry clean tasks.
- Supabase Realtime subscription is wired on the public tracker when Supabase env vars are present.

## Production Notes

- See `docs/security-and-deployment.md` for the production checklist, required env vars, Supabase Storage buckets/RLS, deployment configs, and observability setup.
- Deploy the backend to Render from `render.yaml`.
- Deploy the frontend to Vercel from `frontend/vercel.json`.
- Keep `JWT_SECRET` as a strong 256-bit random value.
- Restrict `ALLOWED_ORIGINS` to the deployed Vercel URL.
