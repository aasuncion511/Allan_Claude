# Fleet Manager — Car Rental Operations

A multi-page web app for car rental companies to run their fleet from one
dashboard: per-unit booking schedule, a lightweight CRM, revenue and expense
tracking per unit (fuel, maintenance, and other costs), maintenance due
dates, and a company-wide dashboard with monthly/yearly totals per unit and
grand totals across the fleet.

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

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, Turbopack)
- TypeScript, Tailwind CSS
- [Prisma 7](https://www.prisma.io) + SQLite (single-file database, no
  external DB server required)
- Recharts for charts
- Cookie-based session auth (HMAC-signed, `bcryptjs` password hashing) —
  no third-party auth service needed

## Getting started

```bash
npm install
cp .env.example .env    # then edit SESSION_SECRET, admin credentials, etc.
npx prisma migrate deploy
npx prisma db seed      # optional: loads demo data + an admin login
npm run dev
```

Open http://localhost:3000 and sign in with the seed admin credentials from
your `.env` (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite file path, e.g. `file:./dev.db` |
| `SESSION_SECRET` | Signs session cookies. Generate with `openssl rand -hex 32` before going to production. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Login created by `npx prisma db seed`. Change the password after first login. |

### Production build

```bash
npm run build
npm run start
```

Each rental company is meant to run its own instance (own SQLite file, own
login) — there's no cross-tenant data sharing, which keeps the deployment
model simple: one small VM or container per customer, or a single shared
host with one folder/database per client.

## Data model

`prisma/schema.prisma` defines: `User`, `Vehicle`, `Customer`, `Booking`,
`Expense`, `MaintenanceLog`, `FuelLog`. Revenue is derived from booking
`totalAmount`; expenses are the sum of `Expense` + `MaintenanceLog.cost` +
`FuelLog.cost`, all attributed to the unit and month they occurred in (see
`src/lib/metrics.ts`).
