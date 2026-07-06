"use client";

import { useActionState } from "react";
import { startCheckout, openBillingPortal } from "@/app/(app)/settings/billing/actions";
import type { Plan } from "@/lib/stripe";
import { formatCurrency } from "@/lib/format";

export function PlanCard({
  plan,
  isCurrent,
}: {
  plan: Plan;
  isCurrent: boolean;
}) {
  const [state, formAction, pending] = useActionState(startCheckout, undefined);

  return (
    <div
      className={`rounded-xl border p-6 ${
        isCurrent ? "border-emerald-600 bg-emerald-600/5" : "border-slate-800 bg-slate-950"
      }`}
    >
      <h3 className="text-lg font-semibold text-slate-50">{plan.name}</h3>
      <p className="mt-1 text-sm text-slate-400">{plan.description}</p>
      <p className="mt-4 text-2xl font-semibold text-slate-50">
        {formatCurrency(plan.monthlyPrice)}
        <span className="text-sm font-normal text-slate-500">/month</span>
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-300">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span className="text-emerald-400">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <form action={formAction} className="mt-6">
        <input type="hidden" name="planId" value={plan.id} />
        {isCurrent ? (
          <span className="block rounded-lg border border-emerald-700 px-4 py-2 text-center text-sm font-medium text-emerald-400">
            Current plan
          </span>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? "Redirecting…" : "Choose plan"}
          </button>
        )}
      </form>
      {state?.error && (
        <p className="mt-2 text-xs text-red-400">{state.error}</p>
      )}
    </div>
  );
}

export function ManageBillingButton() {
  const [state, formAction, pending] = useActionState(
    async () => openBillingPortal(),
    undefined
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Opening…" : "Manage Billing"}
      </button>
      {state?.error && (
        <p className="mt-2 text-xs text-red-400">{state.error}</p>
      )}
    </form>
  );
}
