import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { getBaseUrl } from "@/lib/url";
import {
  updateStorefrontProfile,
  updatePaymentSettings,
  updateBookingAddOns,
  updateGhlSettings,
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
        <form action={updateStorefrontProfile} className="space-y-4">
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
              <label className={label}>Logo URL</label>
              <input name="logoUrl" defaultValue={org.logoUrl ?? ""} className={field} placeholder="https://…" />
            </div>
            <div>
              <label className={label}>Hero Image URL (homepage banner)</label>
              <input name="heroImageUrl" defaultValue={org.heroImageUrl ?? ""} className={field} placeholder="https://…" />
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
              <input
                name="paymongoSecretKey"
                type="password"
                defaultValue={org.paymongoSecretKey ?? ""}
                className={field}
                placeholder="sk_test_…"
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
            <input
              name="paymongoWebhookSecret"
              type="password"
              defaultValue={org.paymongoWebhookSecret ?? ""}
              className={field}
              placeholder="whsk_…"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>Reservation Fee (₱)</label>
              <input
                name="reservationFeeAmount"
                type="number"
                step="0.01"
                defaultValue={org.reservationFeeAmount}
                className={field}
              />
              <p className="mt-1 text-xs text-ink-soft">Confirms a booking instantly.</p>
            </div>
            <div>
              <label className={label}>2-Hour Hold Fee (₱)</label>
              <input
                name="holdFeeAmount"
                type="number"
                step="0.01"
                defaultValue={org.holdFeeAmount}
                className={field}
              />
              <p className="mt-1 text-xs text-ink-soft">
                Non-refundable, credited toward the reservation fee if confirmed in time.
              </p>
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm text-ink">
              <input
                name="paymongoLiveMode"
                type="checkbox"
                defaultChecked={org.paymongoLiveMode}
                className="h-4 w-4 rounded border-line bg-surface"
              />
              Live mode (real money)
            </label>
          </div>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Save Payment Settings
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
          customers and bookings as contacts. In GHL: Settings → Business
          Profile for your Location ID, and Settings → Private Integrations
          for an API token.
        </p>
        <form action={updateGhlSettings} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>GHL Location ID</label>
              <input name="ghlLocationId" defaultValue={org.ghlLocationId ?? ""} className={field} />
            </div>
            <div>
              <label className={label}>Private Integration Token</label>
              <input
                name="ghlApiToken"
                type="password"
                defaultValue={org.ghlApiToken ?? ""}
                className={field}
              />
            </div>
          </div>
          <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Save CRM Settings
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
