import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { PublicVehicleCard } from "@/components/public-vehicle-card";

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
      <section className="bg-gradient-to-b from-emerald-50 to-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 sm:grid-cols-2 sm:py-24">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              {org.tagline || `Car Rental with ${org.name}`}
            </h1>
            <p className="mt-4 max-w-md text-lg text-slate-600">
              {org.aboutText ||
                "Reliable, affordable vehicles for every trip — book online in minutes."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/r/${org.slug}/fleet`}
                className="rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-500"
              >
                Book Your Car Today
              </Link>
              {org.contactPhone && (
                <a
                  href={`tel:${org.contactPhone}`}
                  className="rounded-lg border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Call {org.contactPhone}
                </a>
              )}
            </div>
          </div>
          <div className="flex h-64 items-center justify-center rounded-2xl bg-emerald-100 text-7xl sm:h-80">
            🚗
          </div>
        </div>
      </section>

      {/* Featured fleet */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold text-slate-900">
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
              className="font-semibold text-emerald-700 hover:underline"
            >
              See more cars →
            </Link>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold text-slate-900">
            How to Book Your Car in 4 Easy Steps
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">
                  {i + 1}
                </div>
                <p className="font-semibold text-slate-900">{step.title}</p>
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
          <h2 className="text-2xl font-bold text-slate-900">
            What Our Happy Clients Say
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <blockquote
                key={t.id}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <p className="text-slate-700">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 text-sm font-semibold text-slate-900">
                  {t.authorName}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="bg-slate-50">
          <div className="mx-auto max-w-3xl px-6 py-16">
            <h2 className="text-2xl font-bold text-slate-900">
              Frequently Asked Questions
            </h2>
            <div className="mt-6 space-y-4">
              {faqs.map((f) => (
                <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="font-semibold text-slate-900">{f.question}</p>
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
          className="inline-block rounded-lg bg-emerald-600 px-8 py-3 text-base font-semibold text-white hover:bg-emerald-500"
        >
          Book Now
        </Link>
      </section>
    </div>
  );
}
