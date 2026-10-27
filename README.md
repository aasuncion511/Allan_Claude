# Fleet Manager — Car Rental Operations

A multi-tenant SaaS platform for car rental companies: a public booking
website for renters, an internal operations dashboard for staff, and an
owner's view of the whole business — plus subscription billing so it can be
sold as a hosted product.

## Features

### Public booking site (`/r/<company-slug>`)
- Fleet browsing with photos, category, seats, transmission, and daily rate
- Car detail pages, testimonials, FAQ, and a 4-step "how to book" section —
  styled after real-world rental sites like mgcarrentalcdo.com
- Renters must create an account (name, email, phone) before booking —
  this is your lead capture
- Instant, online-confirmed booking: pick dates, pay the reservation fee via
  **PayMongo** (GCash, Maya, cards), and the booking is created and the
  unit's calendar is blocked the moment payment clears — no staff step
  in between
- A customer portal (`/r/<slug>/account`) where renters see their booking
  history

### Staff admin interface
- **Fleet** — units, status, fuel logs, maintenance
- **Bookings** — the full schedule, including the ones renters made online
- **Customers (CRM)** — every renter, whether added by staff or self-registered
- **Expenses**, **Maintenance** — as before
- **Dashboard** — revenue/expense/profit per unit and company-wide, by month
  and year
- **Granular permissions** — the account owner ticks exactly which modules
  each staff login can open (Settings → Team); the sidebar and every page
  enforce it
- **GoHighLevel CRM sync** — connect your own GHL location (Settings →
  Storefront) and new customers/bookings sync over automatically as contacts

### Billing (you ↔ the rental companies using this platform)
- Stripe Checkout + Customer Portal subscriptions, 14-day free trial, soft
  paywall once trial/subscription lapses

### Payments (the rental company ↔ their own renters)
- Each organization connects its **own PayMongo account** (Settings →
  Storefront) — renter payments go straight to them, never through you

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, Turbopack)
- TypeScript, Tailwind CSS
- [Prisma 7](https://www.prisma.io) + SQLite (single-file database — swap
  the datasource for Postgres/MySQL at scale)
- [Stripe](https://stripe.com) — this platform's own subscription billing
- [PayMongo](https://paymongo.com) — each organization's renter payments
  (bring-your-own account)
- [GoHighLevel](https://www.gohighlevel.com) — optional CRM sync
  (bring-your-own location)
- Two independent cookie-based auth systems: staff (`session`) and renters
  (`customer_session`) — a person can be logged into both at once

## Getting started

```bash
npm install
cp .env.example .env    # then edit SESSION_SECRET, admin credentials, etc.
npx prisma migrate deploy
npx prisma db seed      # optional: loads a demo organization + admin login
npm run dev
```

Open http://localhost:3000:
- Owner: sign up a new company at `/signup`, or sign in with the seed owner
  (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`)
- Staff (limited permissions): sign in with the seed staff login
  (`SEED_STAFF_EMAIL` / `SEED_STAFF_PASSWORD` from `.env`)
- Renters: visit the seeded company's public site at
  `/r/yourcarrental-company` and sign up from there

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite file path, e.g. `file:./dev.db` |
| `SESSION_SECRET` | Signs both staff and renter session cookies. Generate with `openssl rand -hex 32` before production. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Owner login created by `npx prisma db seed`. Change the password after first login. |
| `SEED_STAFF_EMAIL` / `SEED_STAFF_PASSWORD` | Staff login (default permissions) created by `npx prisma db seed`. Change the password after first login. |
| `TRIAL_DAYS` | Length of the free trial new signups get (default 14). |
| `NEXT_PUBLIC_APP_URL` | Optional absolute base URL for Stripe/PayMongo redirect links; falls back to the request's Host header. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO` | This platform's own Stripe billing. Leave blank in development to skip. |

PayMongo and GoHighLevel credentials are **not** environment variables —
each organization enters its own under Settings → Storefront, since each
company uses its own accounts.

### Setting up Stripe billing (your SaaS subscription)

See the in-app Settings → Billing page for the webhook URL. Create two
Products with recurring monthly Prices in the Stripe Dashboard, copy their
Price IDs into `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO`, and point a
webhook at `/api/stripe/webhook` (events: `checkout.session.completed`,
`customer.subscription.created|updated|deleted`).

### Setting up PayMongo (a rental company's renter payments)

Each organization does this themselves, from Settings → Storefront, once
they've signed up:
1. Create a PayMongo account at paymongo.com.
2. Copy the Secret Key and Public Key from their Dashboard into Settings →
   Storefront → Online Payments.
3. In PayMongo's Dashboard, register a webhook pointed at the URL shown on
   that same settings page (`/api/paymongo/webhook/<their-org-id>`),
   subscribed to `checkout_session.payment.paid`. Copy the webhook's
   signing secret back into the same settings page.
4. Leave "Live mode" unchecked to test with
   [PayMongo's test cards](https://developers.paymongo.com/docs/testing)
   first.

If PayMongo isn't configured yet, the booking flow shows a friendly
message instead of erroring — the storefront still works for browsing.

### Setting up GoHighLevel CRM sync (optional)

In GHL: Settings → Business Profile for the Location ID, Settings →
Private Integrations for an API token with contacts read/write scope. Enter
both under Settings → Storefront → CRM. New storefront signups and
confirmed online bookings sync to GHL as contacts automatically; sync
failures never block a signup or booking (it's a best-effort nice-to-have).

True "auto-provision a GHL sub-account for every signup" requires becoming
a GHL Agency/SaaS-mode reseller with an approved Marketplace app — a
business relationship with GHL, not something this codebase can set up on
its own. This bring-your-own-location approach is the realistic path until
that's in place.

### Production build

```bash
npm run build
npm run start
```

## Multi-tenancy model

Every signup creates an `Organization` plus an `OWNER` user. All other
tables (`Vehicle`, `Customer`, `Booking`, `Expense`, `MaintenanceLog`,
`FuelLog`, `Faq`, `Testimonial`) carry an `organizationId` foreign key, and
every query/action in the app filters and writes through that column (see
`requireOrgId()` / `requirePermission()` in `src/lib/auth.ts`) — one shared
deployment serves every customer, with no cross-tenant data access.

Staff permissions are a JSON map on `User.permissions` (ignored for
`OWNER`, who always has full access); see `src/lib/permissions.ts` for the
permission keys and `requirePermission()` for how pages and actions enforce
them. The sidebar (`src/components/nav.tsx`) hides links a user can't open.

Renters are rows in the same `Customer` table used by staff-side CRM, just
with a `passwordHash` set when they self-register — so a staff-added
contact and a self-service renter are the same record once they sign up.

## Data model

`prisma/schema.prisma` defines: `Organization`, `User`, `Vehicle`,
`Customer`, `Booking`, `Expense`, `MaintenanceLog`, `FuelLog`, `Faq`,
`Testimonial`. Revenue is derived from booking `totalAmount`; expenses are
the sum of `Expense` + `MaintenanceLog.cost` + `FuelLog.cost`, all
attributed to the unit and month they occurred in (see `src/lib/metrics.ts`).
`Booking.source` distinguishes staff-created bookings from online ones, and
`Booking.paymentStatus` tracks the PayMongo payment separately from the
booking's operational status.
