import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function ForbiddenPage() {
  const user = await requireUser();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-xl border border-line bg-surface p-8 text-center">
        <div className="mb-3 text-3xl">🔒</div>
        <h2 className="text-lg font-semibold text-ink">
          You don&rsquo;t have access to this
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Your account doesn&rsquo;t have permission to view this page. Ask your
          account owner to grant it from Settings → Team.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Back to Dashboard
        </Link>
      </div>
      <p className="sr-only">Signed in as {user.email}</p>
    </div>
  );
}
