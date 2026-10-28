---
name: car-rental-client-onboarding
description: Onboard a new car rental business onto this multi-tenant Fleet Manager platform (branding, fleet, payments, CRM, roles) and prep a sales-demo or go-live test run. Use when a new client/prospect needs their own organization set up — same backend logic as every other tenant, personalized storefront content. Also documents the accounting/payment invariants that must never be violated when extending this codebase.
---

# Car Rental Client Onboarding

This platform (Next.js + Prisma/SQLite, repo `aasuncion511/Allan_Claude`) is a **multi-tenant** car
rental fleet management SaaS. One deployment serves every client — each organization gets an
isolated storefront at `/r/<slug>` and its own admin area, with no cross-tenant data access. A new
client is **never** a new codebase or a new deployment — it's a new `Organization` row, personalized
through data (logo, fleet, pricing, FAQs, integrations), not a redesign. "Different website design"
per client currently means different *content* (logo, hero image, photos, tagline, colors are not
yet a theme system) rendered through the one shared template — see "Known limitations" below if a
client needs an actually different layout/visual system.

## What every client gets, out of the box

- **Free 25-minute hold → category reservation payment** flow (not pay-on-book): a customer holds a
  vehicle for free, a server-authoritative countdown starts, then they pay a small non-refundable
  category fee (Sedan/SUV/Pick-up, amounts configurable) via PayMongo to confirm. See
  `src/lib/holds.ts`, `src/lib/reservation-pricing.ts`.
- **Bring-your-own PayMongo** — each org pastes its own secret/public/webhook keys in
  Settings → Storefront → Payment Settings. Nothing works online-payment-wise until they do.
- **Bring-your-own GoHighLevel** — each org connects its own GHL location (Location ID + API token)
  for contact sync, the booking confirmation email, SMS nurture (reminders, birthday/holiday
  greetings, 2-year-inactivity list hygiene), and balance-payment-link email/SMS sends. Nothing on
  the email/SMS side works until they connect this either.
- **Three roles**: Owner (full access), Staff (granular per-feature permissions, see
  `src/lib/permissions.ts` — `fleet`/`bookings`/`customers`/`maintenance` on by default,
  `dashboard`/`storefrontSettings`/`refunds`/`expenses` off), Customer (self-serve account on the
  client's own storefront).
- **Balance collection at pickup/return**: cash (itemized reason dropdown, records instantly, no
  PayMongo needed) or an online link (same dropdown, sendable by email/SMS via GHL, with an inline
  QR code) — see `src/app/(app)/bookings/[id]/charge-manager.tsx`.
- **Admin refund-exception workflow**, gated by its own `refunds` permission, separate from general
  `bookings` access — reservation payments are published as non-refundable; this is the deliberate
  exception path.

## Onboarding checklist for a new client

1. **Gather branding assets** before or during the first call: business name, logo file, tagline,
   contact phone/email, address, Facebook/Instagram links, and ideally 3-4 real fleet photos (far
   more persuasive than stock photos — "that's MY car" is the hook).
2. **Create the organization** — have the client (or you, on their behalf) go through the real
   `/signup` flow on the live production URL. This is their real account from day one; there is no
   separate "demo mode" to migrate out of later. (This sandbox/session typically cannot reach the
   production URL directly — see "Known limitations".)
3. **Settings → Storefront**: tagline, about text, logo, hero image, contact info, social links,
   FAQs, testimonials, requirements text, legal/T&Cs text.
4. **Settings → Storefront → Free Hold & Reservation Pricing**: hold window (default 1500s/25min)
   and the Sedan/SUV/Pick-up reservation fees.
5. **Fleet**: add vehicles with photos (real upload, not a pasted URL — `src/lib/image-upload.ts`)
   and a reservation category (Sedan/SUV/Pick-up) — a vehicle with no reservation category can't be
   held/reserved online.
6. **Settings → Team**: invite staff, set their permission checkboxes.
7. **Payment Settings**: PayMongo secret/public key + webhook (webhook URL is shown directly on
   that page — point PayMongo's dashboard at it, subscribe to `checkout_session.payment.paid` only).
8. **Settings → Storefront → GoHighLevel**: Location ID + API token (needs the Conversations scope
   for email/SMS sends).
9. **SMS Nurturing**: toggle reminders/birthday/holiday greetings, set the inactivity-list window.
10. **Verify all three roles** end to end (owner, staff with limited permissions, a self-registered
    renter) before calling it done — see the Owner Test Run Guide template this skill also produces.

## Accounting invariants — do not reintroduce these bugs

Two real production bugs were found and fixed in this exact area; any future change to money/revenue
logic must preserve these:

- **`amountPaid` is the single source of truth for cash actually collected**, everywhere — Dashboard
  Revenue, the Bookings list, the Collections/outstanding widget, corporate invoicing, the booking
  contract/e-sign page. Never substitute `totalAmount` for "revenue" — `totalAmount` is the rental's
  full price, not what's been collected. (`src/lib/metrics.ts`)
- **A refund must decrement `amountPaid`**, not just flip `paymentStatus`. A full refund must also
  cancel the booking and release the vehicle's calendar (`syncVehicleStatus`, `src/lib/vehicle-status.ts`)
  — otherwise a fully-refunded booking keeps blocking inventory against money that's been returned.
  (`src/lib/refunds.ts`)
- Any new "money changes hands" path (a new charge type, a new payment channel) must update
  `amountPaid` in the same transaction as the status change, exactly like `markChargePaidManually`,
  `recordCashPayment`, and the PayMongo webhook's `handleCharge`/`confirmHoldPayment` all do.

## Known limitations to flag to the client up front

- **Storefront design is data-parameterized, not a theme system** — every client gets the same page
  layout with their own logo/hero/photos/text. A client wanting a genuinely different visual design
  (not just different content) needs real frontend work, not just onboarding.
- **PayMongo account creation availability varies** — it has been observed closed/"upgrading" at
  times. Confirm the client can actually create a PayMongo account before promising a payment-live
  demo date.
- **The hold-expiry cron isn't scheduled by default** — there's a lazy-expiry fallback so correctness
  isn't at risk, but point an external scheduler (cron-job.org or similar) at
  `/api/cron/hold-expiry` every 1-2 minutes, and `/api/cron/sms-run` once a day, for timely behavior.
- **This sandbox/session generally cannot reach the live production URL, PayMongo's API, or GHL's
  API directly** (outbound network policy) — production-side setup steps (signup, Render shell
  commands, live payment testing) have to be executed by a human with real access, not automated
  from here. Give exact copy-paste values/checklists rather than attempting to execute them.

## Producing a Test Run Guide for a new client

Generate a short Markdown/Docx guide per client covering: the three logins and their URLs, a
numbered walkthrough per role (owner/staff/client), and any gaps live at hand-off time (e.g.
PayMongo not yet configured). See this repo's existing Owner Test Run Guide for the exact format to
reuse — same structure, client's own branding/URLs/credentials substituted in.
