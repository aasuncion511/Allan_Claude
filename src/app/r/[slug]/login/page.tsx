import { notFound } from "next/navigation";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { CustomerLoginForm } from "./login-form";

export default async function CustomerLoginPage({
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
        Sign in to {org.name}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        View your bookings or reserve a car.
      </p>
      <div className="mt-6 rounded-xl border border-line bg-white p-6">
        <CustomerLoginForm slug={slug} redirectTo={redirectTo} />
      </div>
    </div>
  );
}
