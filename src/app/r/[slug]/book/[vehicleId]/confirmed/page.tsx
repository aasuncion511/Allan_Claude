import { notFound } from "next/navigation";
import { getPublicOrgBySlug } from "@/lib/public-org";

export default async function BookingConfirmedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org) notFound();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-5xl">✅</div>
      <h1 className="text-2xl font-bold text-slate-900">Payment received!</h1>
      <p className="mt-2 text-slate-600">
        We&rsquo;re confirming your reservation with {org.name} now — this
        usually takes just a few seconds. You&rsquo;ll see it in your account
        once it&rsquo;s locked in.
      </p>
      <a
        href={`/r/${slug}/account`}
        className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        View My Bookings
      </a>
    </div>
  );
}
