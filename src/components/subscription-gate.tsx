"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SubscriptionGate({
  hasAccess,
  daysLeftInTrial,
  children,
}: {
  hasAccess: boolean;
  daysLeftInTrial: number | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isBillingPage = pathname.startsWith("/settings/billing");

  if (!hasAccess && !isBillingPage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-xl border border-slate-800 bg-slate-950 p-8 text-center">
          <div className="mb-3 text-3xl">⏳</div>
          <h2 className="text-lg font-semibold text-slate-50">
            Your trial has ended
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Subscribe to a plan to keep using your fleet dashboard, bookings,
            and reports.
          </p>
          <Link
            href="/settings/billing"
            className="mt-5 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            View plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {hasAccess && daysLeftInTrial !== null && daysLeftInTrial <= 3 && !isBillingPage && (
        <div className="mb-6 flex items-center justify-between rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <span>
            {daysLeftInTrial === 0
              ? "Your trial ends today."
              : `Your trial ends in ${daysLeftInTrial} day${daysLeftInTrial === 1 ? "" : "s"}.`}
          </span>
          <Link href="/settings/billing" className="font-medium hover:underline">
            Choose a plan →
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
