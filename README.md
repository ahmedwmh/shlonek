# شلونك.com

Arabic (Iraqi), RTL life-coaching platform. The product brief and every decision so far are in [PROJECT_BRIEF.md](PROJECT_BRIEF.md).

**Stack:** Next.js 16 (App Router, Cache Components) · Prisma 7 (Postgres via `@prisma/adapter-pg`) · Supabase (Google auth + Postgres) · shadcn/ui (Radix, RTL) · Tailwind CSS 4 · Motion · Zustand · Zod.

## Run locally

```bash
pnpm install
docker compose up -d          # local Postgres on 127.0.0.1:54329
cp .env.example .env          # then set SESSION_SECRET (openssl rand -hex 32)
pnpm db:deploy && pnpm db:seed
pnpm dev
```

Without Supabase keys, use the **dev login** on `/login` (development only):

- `admin@shlonek.local` — owner/admin (listed in `ADMIN_EMAILS`), opens `/admin`
- any other email — a normal member

## Architecture

```
src/
  app/
    (site)/              public site + member area (حسابي) + checkout
    admin/               owner dashboard (staff only, 404 for everyone else)
    api/webhooks/wayl    signed payment webhook
    api/cron/expire      releases expired holds / unpaid orders
    auth/callback        Google (Supabase) OAuth callback
  features/<domain>/     one folder per domain
    queries.ts           server-only reads (cached with `use cache` + tags when public)
    actions.ts           server actions: auth check → zod → service → updateTag
    <service>.ts         business rules (booking, orders, wallet …)
    components/          UI for the domain
    hooks/               client hooks (runner, booking selection …)
  components/            brand, layout, motion, shadcn ui
  hooks/                 generic client hooks
  lib/                   env, db, auth (DAL), format, time, cache tags, email, audit
```

**Rules of the codebase**

- Every read of member data goes through `lib/auth/dal.ts`. Hiding a button is never the access check.
- Public data (`exercises`, `services`, `plans`, `settings`, `public posts`) is cached with tags; admin actions call `updateTag`.
- Request-time data (session, DB per user, the clock) lives behind `<Suspense>`.
- Money is whole IQD (`Int`). Every wallet change writes a ledger row in the same transaction; rows are locked with `FOR UPDATE`.
- Double booking is prevented by a partial unique index on `(coachId, startsAt)` for live bookings.
- Orders are paid only on server confirmation (wallet transaction, signed Wayl webhook, or a server-side Wayl lookup) and fulfilment is idempotent.
- RLS is enabled on every table with no policies, so Supabase's public API can't read anything; the app uses Prisma on the server only.

## Payments

- **Wallet** always works. The admin adds balance from `/admin/members/[id]` after the member pays them outside the site.
- **Wayl** turns on when `WAYL_API_KEY` + `WAYL_WEBHOOK_SECRET` are set (and enabled in admin settings). If the wallet doesn't cover the total, the member pays the rest on Wayl (minimum 1,000 IQD); the wallet part is reserved until Wayl confirms.

## Deploy (Vercel + Supabase)

1. Supabase project → Auth → Google provider (client id/secret from the owner's Google Cloud). Add `https://<domain>/auth/callback` to redirect URLs.
2. Vercel env: `DATABASE_URL` (Supabase pooled, port 6543, `?pgbouncer=true`), `DIRECT_URL` (port 5432), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAILS`, `CRON_SECRET`, and optionally `WAYL_*`, `RESEND_API_KEY`, `EMAIL_FROM`.
3. `vercel.ts` runs migrations on build and schedules the expiry cron every 5 minutes.
