import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { getBaseUrl } from "@/lib/url";
import {
  updateStorefrontProfile,
  updatePaymentSettings,
  updateGhlSettings,
  createFaq,
  deleteFaq,
  createTestimonial,
  deleteTestimonial,
} from "./actions";

const field =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-500";
const label = "mb-1 block text-sm font-medium text-slate-300";

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

      <section className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Your Public Booking Site
        </h2>
        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="text-emerald-400 hover:underline"
        >
          {publicUrl}
        </a>
        <p className="mt-1 text-xs text-slate-500">
          Share this link anywhere — social media, ads, your old website.
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
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
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
            Save Profile
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Online Payments (PayMongo)
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Renters pay the reservation fee straight into your own PayMongo
          account — we never touch the money. Create an account at{" "}
          <span className="text-slate-400">paymongo.com</span>, grab your
          keys, and register a webhook pointed at the URL below.
        </p>
        <div className="mb-4 rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-400">
          Webhook URL: <span className="font-mono text-slate-300">{webhookUrl}</span>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Reservation Fee (₱)</label>
              <input
                name="reservationFeeAmount"
                type="number"
                step="0.01"
                defaultValue={org.reservationFeeAmount}
                className={field}
              />
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm text-slate-300">
              <input
                name="paymongoLiveMode"
                type="checkbox"
                defaultChecked={org.paymongoLiveMode}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800"
              />
              Live mode (real money)
            </label>
          </div>
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
            Save Payment Settings
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
          CRM (GoHighLevel)
        </h2>
        <p className="mb-4 text-xs text-slate-500">
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
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
            Save CRM Settings
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          FAQ
        </h2>
        <div className="mb-4 space-y-2">
          {faqs.map((f) => {
            const remove = deleteFaq.bind(null, f.id);
            return (
              <div key={f.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-900 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-100">{f.question}</p>
                  <p className="text-xs text-slate-500">{f.answer}</p>
                </div>
                <form action={remove}>
                  <button type="submit" className="text-xs font-medium text-red-400 hover:underline">
                    Remove
                  </button>
                </form>
              </div>
            );
          })}
          {faqs.length === 0 && <p className="text-sm text-slate-500">No FAQs yet.</p>}
        </div>
        <form action={createFaq} className="space-y-2">
          <input name="question" placeholder="Question" className={field} required />
          <textarea name="answer" placeholder="Answer" rows={2} className={field} required />
          <button type="submit" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
            Add FAQ
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Testimonials
        </h2>
        <div className="mb-4 space-y-2">
          {testimonials.map((t) => {
            const remove = deleteTestimonial.bind(null, t.id);
            return (
              <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-900 px-3 py-2">
                <div>
                  <p className="text-sm text-slate-100">&ldquo;{t.quote}&rdquo;</p>
                  <p className="text-xs text-slate-500">— {t.authorName}</p>
                </div>
                <form action={remove}>
                  <button type="submit" className="text-xs font-medium text-red-400 hover:underline">
                    Remove
                  </button>
                </form>
              </div>
            );
          })}
          {testimonials.length === 0 && <p className="text-sm text-slate-500">No testimonials yet.</p>}
        </div>
        <form action={createTestimonial} className="space-y-2">
          <input name="authorName" placeholder="Customer name" className={field} required />
          <textarea name="quote" placeholder="What they said" rows={2} className={field} required />
          <button type="submit" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
            Add Testimonial
          </button>
        </form>
      </section>
    </div>
  );
}
