# Fleet Manager — Car Rental Operations

A multi-tenant SaaS web app for car rental companies to run their fleet from
one dashboard: per-unit booking schedule, a lightweight CRM, revenue and
expense tracking per unit (fuel, maintenance, and other costs), maintenance
due dates, a company-wide dashboard with monthly/yearly totals per unit and
grand totals across the fleet, and subscription billing so it can be sold
as a hosted product.

## Features

- **Fleet** — register units (plate, make/model/year, daily rate, odometer,
  status), see each unit's live status (Available / Booked / Reserved /
  Maintenance / Out of Service).
- **Bookings (schedule)** — create/edit bookings per unit and customer;
  total amount is computed automatically; unit status updates automatically
  when a booking becomes active, reserved, completed, or cancelled.
- **Customers (CRM)** — contact info, driver's license, notes, and full
  booking/spend history per customer.
- **Expenses** — log insurance, registration, cleaning, parking/tolls, and
  other costs per unit.
- **Maintenance** — service history per unit plus a fleet-wide upcoming/
  overdue view based on next-due date.
- **Fuel** — log fill-ups per unit with odometer readings; the app computes
  average L/100km consumption automatically.
- **Dashboard** — grand totals for revenue, expenses, and net profit, a
  monthly revenue-vs-expense chart, a fleet status breakdown, and a
  per-unit revenue/expense/profit table with a grand-total row — filterable
  by year.
- **Multi-tenancy** — every rental company signs up as its own Organization;
  all data (fleet, bookings, customers, expenses, etc.) is scoped to the
  organization, so one deployment can serve many customers.
- **Team logins** — the account owner can add staff logins under the same
  organization (Settings → Team).
- **Billing** — Stripe Checkout + Customer Portal subscriptions, a 14-day
  free trial, and a soft paywall once the trial or subscription lapses
  (Settings → Billing).

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, Turbopack)
- TypeScript, Tailwind CSS
- [Prisma 7](https://www.prisma.io) + SQLite (single-file database, no
  external DB server required — swap the datasource for Postgres/MySQL for
  a larger production deployment)
- [Stripe](https://stripe.com) for subscription billing (Checkout + Customer
  Portal + webhooks)
- Recharts for charts
- Cookie-based session auth (HMAC-signed, `bcryptjs` password hashing) —
  no third-party auth service needed

## Getting started

```bash
npm install
cp .env.example .env    # then edit SESSION_SECRET, admin credentials, etc.
npx prisma migrate deploy
npx prisma db seed      # optional: loads a demo organization + admin login
npm run dev
```

Open http://localhost:3000 — sign up a new company at `/signup`, or sign in
with the seed admin credentials from your `.env` (`SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`) to explore the seeded demo organization.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite file path, e.g. `file:./dev.db` |
| `SESSION_SECRET` | Signs session cookies. Generate with `openssl rand -hex 32` before going to production. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Login created by `npx prisma db seed`. Change the password after first login. |
| `TRIAL_DAYS` | Length of the free trial new signups get (default 14). |
| `NEXT_PUBLIC_APP_URL` | Optional absolute base URL for Stripe redirect links; falls back to the request's Host header. |
| `STRIPE_SECRET_KEY` | Enables billing. Leave blank in development to skip Stripe entirely (orgs just keep trial/active access). |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the `/api/stripe/webhook` endpoint. |
| `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO` | Stripe Price IDs for the two plans defined in `src/lib/stripe.ts`. |

### Setting up Stripe billing

1. Create a Stripe account (test mode is fine for development).
2. In the Stripe Dashboard, create two Products, each with one recurring
   monthly Price — these map to the Starter/Pro plans in
   `src/lib/stripe.ts`. Copy each Price ID into `STRIPE_PRICE_STARTER` /
   `STRIPE_PRICE_PRO`.
3. Copy your test **Secret key** into `STRIPE_SECRET_KEY`.
4. Forward webhooks to your local server and copy the printed signing
   secret into `STRIPE_WEBHOOK_SECRET`:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   In production, create a webhook endpoint in the Dashboard pointing at
   `https://yourdomain.com/api/stripe/webhook`, subscribed to
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, and `customer.subscription.deleted`.
5. Use [Stripe's test cards](https://stripe.com/docs/testing) (e.g.
   `4242 4242 4242 4242`) to complete a test checkout from
   Settings → Billing.

If `STRIPE_SECRET_KEY` is unset, billing pages show a friendly "not
configured" message and every organization simply keeps trial/active
access — useful for local development without a Stripe account.

### Production build

```bash
npm run build
npm run start
```

## Multi-tenancy model

Every signup creates an `Organization` plus an `OWNER` user. All other
tables (`Vehicle`, `Customer`, `Booking`, `Expense`, `MaintenanceLog`,
`FuelLog`) carry an `organizationId` foreign key, and every query/action in
the app filters and writes through that column (see `requireOrgId()` in
`src/lib/auth.ts`) — one shared deployment serves every customer, with no
cross-tenant data access. The account owner can add teammate logins
(`STAFF` role) under Settings → Team; only the `OWNER` can manage billing
or remove teammates.

## Data model

`prisma/schema.prisma` defines: `Organization`, `User`, `Vehicle`,
`Customer`, `Booking`, `Expense`, `MaintenanceLog`, `FuelLog`. Revenue is
derived from booking `totalAmount`; expenses are the sum of `Expense` +
`MaintenanceLog.cost` + `FuelLog.cost`, all attributed to the unit and
month they occurred in (see `src/lib/metrics.ts`).
