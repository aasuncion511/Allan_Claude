import { notFound } from "next/navigation";
import { getPublicOrgBySlug } from "@/lib/public-org";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-ink">Contact {org.name}</h1>
      {org.aboutText && <p className="mt-4 text-slate-600">{org.aboutText}</p>}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {org.contactPhone && (
          <div className="rounded-xl border border-line bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Phone
            </p>
            <a href={`tel:${org.contactPhone}`} className="mt-1 block text-lg font-semibold text-[var(--store-accent)]">
              {org.contactPhone}
            </a>
          </div>
        )}
        {org.contactEmail && (
          <div className="rounded-xl border border-line bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Email
            </p>
            <a href={`mailto:${org.contactEmail}`} className="mt-1 block text-lg font-semibold text-[var(--store-accent)]">
              {org.contactEmail}
            </a>
          </div>
        )}
        {org.address && (
          <div className="rounded-xl border border-line bg-white p-5 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Address
            </p>
            <p className="mt-1 text-slate-800">{org.address}</p>
          </div>
        )}
      </div>
    </div>
  );
}
