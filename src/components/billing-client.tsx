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
        isCurrent ? "border-brand bg-brand/5" : "border-line bg-canvas"
      }`}
    >
      <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>
      <p className="mt-1 text-sm text-ink-soft">{plan.description}</p>
      <p className="mt-4 text-2xl font-semibold text-ink">
        {formatCurrency(plan.monthlyPrice)}
        <span className="text-sm font-normal text-ink-soft">/month</span>
      </p>
      <ul className="mt-4 space-y-2 text-sm text-ink">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span className="text-brand">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <form action={formAction} className="mt-6">
        <input type="hidden" name="planId" value={plan.id} />
        {isCurrent ? (
          <span className="block rounded-lg border border-brand px-4 py-2 text-center text-sm font-medium text-brand">
            Current plan
          </span>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {pending ? "Redirecting…" : "Choose plan"}
          </button>
        )}
      </form>
      {state?.error && (
        <p className="mt-2 text-xs text-danger-text">{state.error}</p>
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
        className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-50"
      >
        {pending ? "Opening…" : "Manage Billing"}
      </button>
      {state?.error && (
        <p className="mt-2 text-xs text-danger-text">{state.error}</p>
      )}
    </form>
  );
}
