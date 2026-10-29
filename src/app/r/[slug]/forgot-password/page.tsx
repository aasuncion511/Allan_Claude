import { notFound } from "next/navigation";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { CustomerForgotPasswordForm } from "./forgot-password-form";

export default async function CustomerForgotPasswordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org) notFound();

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold text-ink">Forgot your password?</h1>
      <p className="mt-1 text-sm text-ink-soft">
        We&apos;ll email you a new temporary password for your {org.name} account.
      </p>
      <div className="mt-6 rounded-xl border border-line bg-white p-6">
        <CustomerForgotPasswordForm slug={slug} />
      </div>
    </div>
  );
}
