import { notFound } from "next/navigation";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { CustomerSignupForm } from "./signup-form";

export default async function CustomerSignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { slug } = await params;
  const { redirectTo } = await searchParams;
  const org = await getPublicOrgBySlug(slug);
  if (!org) notFound();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold text-ink">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Sign up to book a car with {org.name} — we&rsquo;ll use these details
        to confirm your reservation.
      </p>
      <div className="mt-6 rounded-xl border border-line bg-white p-6">
        <CustomerSignupForm slug={slug} redirectTo={redirectTo} />
      </div>
    </div>
  );
}
