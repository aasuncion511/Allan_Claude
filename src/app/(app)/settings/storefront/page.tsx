import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { getBaseUrl } from "@/lib/url";
import { maskSecret } from "@/lib/format";
import { PasswordInput } from "@/components/password-input";
import { DEFAULT_TERMS_AND_CONDITIONS } from "@/lib/booking-contract";
import {
  updateStorefrontProfile,
  updatePaymentSettings,
  updateReservationPricing,
  updateBookingAddOns,
  updateGhlSettings,
  updateSmsNurtureSettings,
  updateLegalSettings,
  createFaq,
  deleteFaq,
  createTestimonial,
  deleteTestimonial,
} from "./actions";

const field =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";
const label = "mb-1 block text-sm font-medium text-ink";

export default async function StorefrontSettingsPage() {
  const user = await requirePermission("storefrontSettings");
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
  });
  const [faqs, testimonials] = await Promise.all([
    prisma.faq.findMany({ where: { organizationId: org.id }, orderBy: { order: "asc" } }),
    prisma.testimonial.findMany({
      where: { organizationId: org.id },
      orderBy: { order: "asc" },
    }),
  ]);
  const baseUrl = await getBaseUrl();
  const publicUrl = `${baseUrl}/r/${org.slug}`;
  const webhookUrl = `${baseUrl}/api/paymongo/webhook/${org.id}`;

  return (
    <div className="max-w-3xl space-y-10">
      <PageHeader
        title="Storefront & Integrations"
        description="What renters see on your public booking site, plus payments and CRM."
      />

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Your Public Booking Site
        </h2>
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="text-brand hover:underline"
        >
          {publicUrl}
        </a>
        <p className="mt-1 text-xs text-ink-soft">
          Share this link anywhere — social media, ads, your old website.
        </p>
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Public Profile
        </h2>
        <form action={updateStorefrontProfile} encType="multipart/form-data" className="space-y-4">
          <div>
            <label className={label}>Company Name</label>
            <input name="name" required defaultValue={org.name} className={field} placeholder="YourCarRental Company" />
            <p className="mt-1 text-xs text-ink-soft">
              Shown on your storefront, e-invoices, and the e-sign page. Your booking site URL stays the same.
            </p>
          </div>
          <div>
            <label className={label}>Storefront Theme</label>
            <p className="mb-2 text-xs text-ink-soft">
              Changes the accent color and hero background on your public storefront. The admin app you&apos;re using
              right now always looks the same regardless of this choice.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(
                [
                  { value: "CLASSIC", label: "Classic", desc: "Deep green, clean & trustworthy", swatch: "#004c25" },
                  { value: "MODERN", label: "Modern", desc: "Navy & charcoal, minimal", swatch: "#0f172a" },
                  { value: "ADVENTURE", label: "Adventure", desc: "Warm terracotta, travel vibe", swatch: "#9a3412" },
                ] as const
              ).map((t) => (
                <label key={t.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={t.value}
                    defaultChecked={org.theme === t.value}
                    className="peer sr-only"
                  />
                  <div className="rounded-xl border-2 border-line p-3 transition peer-checked:border-brand peer-checked:bg-success-surface">
                    <div className="mb-2 h-6 w-full rounded" style={{ backgroundColor: t.swatch }} />
                    <p className="text-sm font-semibold text-ink">{t.label}</p>
                    <p className="text-xs text-ink-soft">{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={label}>Tagline</label>
            <input name="tagline" defaultValue={org.tagline ?? ""} className={field} placeholder="Travel Made Easy and Fun!" />
          </div>
          <div>
            <label className={label}>About</label>
            <textarea name="aboutText" rows={3} defaultValue={org.aboutText ?? ""} className={field} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Company Logo</label>
              <p className="mb-2 text-xs text-ink-soft">
                Shown on your storefront, the e-sign page, and the booking-confirmation e-invoice. PNG/JPG/WEBP/SVG, up to 1.5MB.
              </p>
              {org.logoUrl && (
                <div className="mb-2 flex items-center gap-3 rounded-lg border border-line bg-canvas p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={org.logoUrl} alt="Current logo" className="h-10 w-auto" />
                  <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                    <input type="checkbox" name="removeLogo" />
                    Remove logo
                  </label>
                </div>
              )}
              <input
                name="logoFile"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className={field}
              />
              <input
                name="logoUrlText"
                defaultValue={org.logoUrl?.startsWith("data:") ? "" : (org.logoUrl ?? "")}
                className={`${field} mt-2`}
                placeholder="…or paste an image URL instead"
              />
            </div>
            <div>
              <label className={label}>Hero Image (homepage banner)</label>
              <p className="mb-2 text-xs text-ink-soft">
                The big photo on your storefront homepage. PNG/JPG/WEBP, up to 3MB — a wide landscape photo works best.
              </p>
              {org.heroImageUrl && (
                <div className="mb-2 flex items-center gap-3 rounded-lg border border-line bg-canvas p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={org.heroImageUrl} alt="Current hero banner" className="h-10 w-auto" />
                  <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                    <input type="checkbox" name="removeHeroImage" />
                    Remove hero image
                  </label>
                </div>
              )}
              <input
                name="heroImageFile"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className={field}
              />
              <input
                name="heroImageUrl"
                defaultValue={org.heroImageUrl?.startsWith("data:") ? "" : (org.heroImageUrl ?? "")}
                className={`${field} mt-2`}
                placeholder="…or paste an image URL instead"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Contact Phone</label>
              <input name="contactPhone" defaultValue={org.contactPhone ?? ""} className={field} />
            </div>
            <div>
              <label className={label}>Contact Email</label>
              <input name="contactEmail" type="email" defaultValue={org.contactEmail ?? ""} className={field} />
            </div>
          </div>
          <div>
            <label className={label}>Address</label>
            <input name="address" defaultValue={org.address ?? ""} className={field} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>Facebook URL</label>
              <input name="facebookUrl" defaultValue={org.facebookUrl ?? ""} className={field} />
            </div>
            <div>
              <label className={label}>Instagram URL</label>
              <input name="instagramUrl" defaultValue={org.instagramUrl ?? ""} className={field} />
            </div>
            <div>
              <label className={label}>TikTok URL</label>
              <input name="tiktokUrl" defaultValue={org.tiktokUrl ?? ""} className={field} />
            </div>
          </div>
          <div>
            <label className={label}>Requirements blurb (shown on your homepage)</label>
            <textarea
              name="requirementsText"
              rows={2}
              defaultValue={org.requirementsText ?? ""}
              className={field}
            />
          </div>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Save Profile
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Online Payments (PayMongo)
        </h2>
        <p className="mb-4 text-xs text-ink-soft">
          Renters pay the reservation fee straight into your own PayMongo
          account — we never touch the money. Create an account at{" "}
          <span className="text-ink-soft">paymongo.com</span>, grab your
          keys, and register a webhook pointed at the URL below.
        </p>
        <div className="mb-4 rounded-lg bg-surface px-3 py-2 text-xs text-ink-soft">
          Webhook URL: <span className="font-mono text-ink">{webhookUrl}</span>
        </div>
        <form action={updatePaymentSettings} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Secret Key</label>
              <PasswordInput
                name="paymongoSecretKey"
                autoComplete="off"
                defaultValue=""
                className={field}
                placeholder={
                  maskSecret(org.paymongoSecretKey)
                    ? `On file (${maskSecret(org.paymongoSecretKey)}) — leave blank to keep`
                    : "sk_test_…"
                }
              />
            </div>
            <div>
              <label className={label}>Public Key</label>
              <input
                name="paymongoPublicKey"
                defaultValue={org.paymongoPublicKey ?? ""}
                className={field}
                placeholder="pk_test_…"
              />
            </div>
          </div>
          <div>
            <label className={label}>Webhook Signing Secret</label>
            <PasswordInput
              name="paymongoWebhookSecret"
              autoComplete="off"
              defaultValue=""
              className={field}
              placeholder={
                maskSecret(org.paymongoWebhookSecret)
                  ? `On file (${maskSecret(org.paymongoWebhookSecret)}) — leave blank to keep`
                  : "whsk_…"
              }
            />
          </div>
          <p className="text-xs text-ink-soft">
            For your security, saved keys are never sent back to this page — only the last 4
            characters are shown. Leave a field blank to keep its current value; enter a new value
            to replace it.
          </p>
          {(org.paymongoSecretKey || org.paymongoWebhookSecret || org.paymongoPublicKey) && (
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              <input name="clearPaymongoKeys" type="checkbox" className="h-4 w-4 rounded border-line bg-surface" />
              Disconnect PayMongo (clear all keys above)
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              name="paymongoLiveMode"
              type="checkbox"
              defaultChecked={org.paymongoLiveMode}
              className="h-4 w-4 rounded border-line bg-surface"
            />
            Live mode (real money)
          </label>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Save Payment Settings
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Free Hold &amp; Reservation Pricing
        </h2>
        <p className="mb-4 text-xs text-ink-soft">
          Renters get a FREE, server-controlled hold on the vehicle (no payment), then pay a non-refundable
          category-specific reservation fee — credited toward the rental total — to confirm. Assign each vehicle a
          category under Fleet → Edit; a vehicle with no category assigned can&apos;t be reserved online yet.
        </p>
        <p className="mb-4 text-xs text-ink-soft">
          Also requires a second scheduler task hitting{" "}
          <code className="rounded bg-canvas px-1 py-0.5 font-mono">{baseUrl}/api/cron/hold-expiry</code> every 1–2
          minutes (same auth as the SMS scheduler below) — it&apos;s what actually releases expired holds and
          resolves payments stuck mid-flight. Without it, expired holds still won&apos;t block new attempts (the app
          checks this live too), but PayMongo checkout sessions never get explicitly closed.
        </p>
        <form action={updateReservationPricing} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className={label}>Sedan Fee (₱)</label>
              <input
                name="sedanReservationFee"
                type="number"
                step="0.01"
                defaultValue={org.sedanReservationFee}
                className={field}
              />
            </div>
            <div>
              <label className={label}>SUV Fee (₱)</label>
              <input
                name="suvReservationFee"
                type="number"
                step="0.01"
                defaultValue={org.suvReservationFee}
                className={field}
              />
            </div>
            <div>
              <label className={label}>Pick-up Fee (₱)</label>
              <input
                name="pickupReservationFee"
                type="number"
                step="0.01"
                defaultValue={org.pickupReservationFee}
                className={field}
              />
            </div>
            <div>
              <label className={label}>Security Deposit (₱, flat per unit)</label>
              <input
                name="securityDepositAmount"
                type="number"
                step="0.01"
                defaultValue={org.securityDepositAmount}
                className={field}
              />
              <p className="mt-1 text-xs text-ink-soft">
                Refundable after turnover — excluded from revenue. Defaults new bookings&apos; deposit field.
              </p>
            </div>
            <div>
              <label className={label}>Free Hold Window (seconds)</label>
              <input
                name="holdWindowSeconds"
                type="number"
                min={60}
                step="1"
                defaultValue={org.holdWindowSeconds}
                className={field}
              />
              <p className="mt-1 text-xs text-ink-soft">1,500 = 25 minutes.</p>
            </div>
          </div>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Save Reservation Pricing
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Booking Add-Ons
        </h2>
        <p className="mb-4 text-xs text-ink-soft">
          Flat, automatic fees your renters see on the booking form — keeps online payment instant since nothing
          needs a manual quote.
        </p>
        <form action={updateBookingAddOns} className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              name="offersDriverService"
              type="checkbox"
              defaultChecked={org.offersDriverService}
              className="h-4 w-4 rounded border-line bg-surface"
            />
            Offer &ldquo;With Driver&rdquo; rentals
          </label>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className={label}>Driver Fee / day (₱)</label>
              <input name="driverFeePerDay" type="number" step="0.01" defaultValue={org.driverFeePerDay} className={field} />
            </div>
            <div>
              <label className={label}>Delivery Fee (₱)</label>
              <input name="deliveryFeeAmount" type="number" step="0.01" defaultValue={org.deliveryFeeAmount} className={field} />
              <p className="mt-1 text-xs text-ink-soft">For &ldquo;delivered to me&rdquo; pick-up.</p>
            </div>
            <div>
              <label className={label}>Drop-off Fee (₱)</label>
              <input name="dropoffFeeAmount" type="number" step="0.01" defaultValue={org.dropoffFeeAmount} className={field} />
              <p className="mt-1 text-xs text-ink-soft">For drop-off at a different location.</p>
            </div>
            <div>
              <label className={label}>Carwash Fee (₱)</label>
              <input name="carwashFeeAmount" type="number" step="0.01" defaultValue={org.carwashFeeAmount} className={field} />
              <p className="mt-1 text-xs text-ink-soft">0 hides the add-on entirely.</p>
            </div>
            <div>
              <label className={label}>Excess Hour Rate (₱/hr)</label>
              <input name="excessHourlyRate" type="number" step="0.01" defaultValue={org.excessHourlyRate} className={field} />
              <p className="mt-1 text-xs text-ink-soft">0 hides the excess-hours field.</p>
            </div>
          </div>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Save Add-On Settings
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          CRM (GoHighLevel)
        </h2>
        <p className="mb-4 text-xs text-ink-soft">
          Connect your existing GHL sub-account to automatically sync new
          customers and bookings as contacts, and to send the automated
          payment-confirmation email (Terms &amp; Conditions, e-sign link,
          e-invoice) below. In GHL: Settings → Business Profile for your
          Location ID, and Settings → Private Integrations for an API token
          — make sure the token includes the <strong>Conversations</strong>{" "}
          scope so it&apos;s allowed to send emails, not just sync contacts.
        </p>
        <form action={updateGhlSettings} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>GHL Location ID</label>
              <input name="ghlLocationId" defaultValue={org.ghlLocationId ?? ""} className={field} />
            </div>
            <div>
              <label className={label}>Private Integration Token</label>
              <PasswordInput
                name="ghlApiToken"
                autoComplete="off"
                defaultValue=""
                className={field}
                placeholder={
                  maskSecret(org.ghlApiToken)
                    ? `On file (${maskSecret(org.ghlApiToken)}) — leave blank to keep`
                    : undefined
                }
              />
            </div>
          </div>
          <p className="text-xs text-ink-soft">
            For your security, the saved token is never sent back to this page. Leave blank to
            keep it, or enter a new one to replace it.
          </p>
          {org.ghlApiToken && (
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              <input name="clearGhlToken" type="checkbox" className="h-4 w-4 rounded border-line bg-surface" />
              Clear the saved token
            </label>
          )}
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Save CRM Settings
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          SMS Nurturing
        </h2>
        <p className="mb-4 text-xs text-ink-soft">
          Sent via your GHL connection above (same Conversations scope as the confirmation email). Requires an
          external scheduler to hit this URL once a day — a free option like{" "}
          <a href="https://cron-job.org" target="_blank" rel="noreferrer" className="text-brand hover:underline">
            cron-job.org
          </a>{" "}
          works well:
        </p>
        <code className="mb-4 block overflow-x-auto rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-ink">
          {baseUrl}/api/cron/sms-run — header <strong>Authorization: Bearer &lt;CRON_SECRET&gt;</strong> (set in
          your Render environment variables)
        </code>
        <form action={updateSmsNurtureSettings} className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="smsRemindersEnabled" defaultChecked={org.smsRemindersEnabled} />
            Day-before pickup &amp; return reminders (includes remaining balance, if any)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="smsBirthdayGreetingsEnabled"
              defaultChecked={org.smsBirthdayGreetingsEnabled}
            />
            Birthday greetings (needs a customer&apos;s birthday on file — Customers → Edit)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="smsHolidayGreetingsEnabled"
              defaultChecked={org.smsHolidayGreetingsEnabled}
            />
            Philippine holiday greetings, sent to your whole customer list
          </label>
          <div className="max-w-xs">
            <label className={label}>Remove from SMS list after (months of no bookings)</label>
            <input
              name="smsInactivityMonths"
              type="number"
              min={1}
              defaultValue={org.smsInactivityMonths}
              className={field}
            />
          </div>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Save SMS Settings
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Terms &amp; Conditions
        </h2>
        <p className="mb-4 text-xs text-ink-soft">
          Included in the automated payment-confirmation email and shown on
          the client&apos;s e-sign page. Leave blank to use a sensible generic
          default until you customize it — edit it to match your actual
          rental contract.
        </p>
        <form action={updateLegalSettings} className="space-y-4">
          <div>
            <label className={label}>Terms &amp; Conditions text</label>
            <textarea
              name="termsAndConditionsText"
              rows={12}
              defaultValue={org.termsAndConditionsText ?? ""}
              placeholder={DEFAULT_TERMS_AND_CONDITIONS}
              className={field}
            />
          </div>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Save Terms &amp; Conditions
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          FAQ
        </h2>
        <div className="mb-4 space-y-2">
          {faqs.map((f) => {
            const remove = deleteFaq.bind(null, f.id);
            return (
              <div key={f.id} className="flex items-start justify-between gap-3 rounded-lg bg-surface px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-ink">{f.question}</p>
                  <p className="text-xs text-ink-soft">{f.answer}</p>
                </div>
                <form action={remove}>
                  <button type="submit" className="text-xs font-medium text-danger-text hover:underline">
                    Remove
                  </button>
                </form>
              </div>
            );
          })}
          {faqs.length === 0 && <p className="text-sm text-ink-soft">No FAQs yet.</p>}
        </div>
        <form action={createFaq} className="space-y-2">
          <input name="question" placeholder="Question" className={field} required />
          <textarea name="answer" placeholder="Answer" rows={2} className={field} required />
          <button type="submit" className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-canvas">
            Add FAQ
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Testimonials
        </h2>
        <div className="mb-4 space-y-2">
          {testimonials.map((t) => {
            const remove = deleteTestimonial.bind(null, t.id);
            return (
              <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg bg-surface px-3 py-2">
                <div>
                  <p className="text-sm text-ink">&ldquo;{t.quote}&rdquo;</p>
                  <p className="text-xs text-ink-soft">— {t.authorName}</p>
                </div>
                <form action={remove}>
                  <button type="submit" className="text-xs font-medium text-danger-text hover:underline">
                    Remove
                  </button>
                </form>
              </div>
            );
          })}
          {testimonials.length === 0 && <p className="text-sm text-ink-soft">No testimonials yet.</p>}
        </div>
        <form action={createTestimonial} className="space-y-2">
          <input name="authorName" placeholder="Customer name" className={field} required />
          <textarea name="quote" placeholder="What they said" rows={2} className={field} required />
          <button type="submit" className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-canvas">
            Add Testimonial
          </button>
        </form>
      </section>
    </div>
  );
}
