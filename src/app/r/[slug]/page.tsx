import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { PublicVehicleCard } from "@/components/public-vehicle-card";
import { TripSearchBar } from "@/components/trip-search-bar";

const STEPS = [
  { title: "Choose Your Car", body: "Browse our fleet and pick the unit that fits your trip." },
  { title: "Create an Account", body: "Sign up with your contact details so we can reach you about your booking." },
  { title: "Reserve & Pay", body: "Pay the reservation fee online to lock in your dates instantly." },
  { title: "Pick Up & Drive", body: "Get your car on the agreed date and time, and enjoy your trip!" },
];

export default async function StorefrontHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org) notFound();

  const [featured, faqs, testimonials] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        organizationId: org.id,
        featured: true,
        status: { notIn: ["MAINTENANCE", "OUT_OF_SERVICE"] },
      },
      take: 4,
      orderBy: { dailyRate: "asc" },
    }),
    prisma.faq.findMany({ where: { organizationId: org.id }, orderBy: { order: "asc" } }),
    prisma.testimonial.findMany({
      where: { organizationId: org.id },
      orderBy: { order: "asc" },
      take: 3,
    }),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--store-hero-from)] to-[var(--store-hero-to)]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 sm:grid-cols-2 sm:py-24">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
              {org.tagline || `Car Rental with ${org.name}`}
            </h1>
            <p className="mt-4 max-w-md text-lg text-slate-600">
              {org.aboutText ||
                "Reliable, affordable vehicles for every trip — book online in minutes."}
            </p>
            <div className="mt-8">
              <TripSearchBar slug={org.slug} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/r/${org.slug}/fleet`}
                className="text-sm font-semibold text-[var(--store-accent)] hover:underline"
              >
                Or browse the full fleet →
              </Link>
              {org.contactPhone && (
                <a
                  href={`tel:${org.contactPhone}`}
                  className="text-sm font-semibold text-ink-soft hover:text-ink hover:underline"
                >
                  Call {org.contactPhone}
                </a>
              )}
            </div>
          </div>
          <div className="flex h-64 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-7xl sm:h-80">
            {org.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.heroImageUrl} alt={org.name} className="h-full w-full object-cover" />
            ) : (
              "🚗"
            )}
          </div>
        </div>
      </section>

      {/* Featured fleet */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold text-ink">
            Choose the Perfect Car for Your Journey
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            From compact sedans to spacious vans — all our units are
            well-maintained and ready for the road.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((v) => (
              <PublicVehicleCard key={v.id} slug={org.slug} vehicle={v} />
            ))}
          </div>
          <div className="mt-8">
            <Link
              href={`/r/${org.slug}/fleet`}
              className="font-semibold text-[var(--store-accent)] hover:underline"
            >
              See more cars →
            </Link>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="bg-[var(--store-soft-bg)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold text-ink">
            How to Book Your Car in 4 Easy Steps
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--store-accent)] font-bold text-white">
                  {i + 1}
                </div>
                <p className="font-semibold text-ink">{step.title}</p>
                <p className="mt-1 text-sm text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
          {org.requirementsText && (
            <p className="mt-8 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {org.requirementsText}
            </p>
          )}
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold text-ink">
            What Our Happy Clients Say
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <blockquote
                key={t.id}
                className="rounded-xl border border-line bg-white p-6"
              >
                <p className="text-ink">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 text-sm font-semibold text-ink">
                  {t.authorName}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="bg-[var(--store-soft-bg)]">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <h2 className="text-2xl font-bold text-ink">
              Frequently Asked Questions
            </h2>
            <div className="mt-6 space-y-4">
              {faqs.map((f) => (
                <div key={f.id} className="rounded-xl border border-line bg-white p-5">
                  <p className="font-semibold text-ink">{f.question}</p>
                  <p className="mt-1 text-sm text-slate-600">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <Link
          href={`/r/${org.slug}/fleet`}
          className="inline-block rounded-lg bg-[var(--store-accent)] px-8 py-3 text-base font-semibold text-white hover:bg-[var(--store-accent-dark)]"
        >
          Book Now
        </Link>
      </section>
    </div>
  );
}
