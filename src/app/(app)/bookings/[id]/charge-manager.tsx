"use client";

import { useActionState, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { createChargeAndCheckout, cancelCharge, markChargePaidManually, type CreateChargeState } from "./charges-actions";

type Charge = {
  id: string;
  description: string;
  amount: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  paidVia: string | null;
  paidAt: Date | null;
  createdAt: Date;
};

export function ChargeManager({ bookingId, charges }: { bookingId: string; charges: Charge[] }) {
  const action = createChargeAndCheckout.bind(null, bookingId);
  const [state, formAction, pending] = useActionState<CreateChargeState, FormData>(action, undefined);
  const [copied, setCopied] = useState(false);

  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";

  async function copyLink() {
    if (!state?.checkoutUrl) return;
    try {
      await navigator.clipboard.writeText(state.checkoutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. non-HTTPS) — the link is still shown to copy by hand.
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-line bg-surface p-6">
      <h2 className="mb-1 text-sm font-semibold text-ink">Balance & Extra Charges</h2>
      <p className="mb-4 text-xs text-ink-soft">
        Collect the remaining balance at pick-up, or add charges after use (damage, fuel, late return) — each
        generates its own payment link so the customer pays on their own device. Verified instantly, no cash
        handled.
      </p>

      {charges.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {charges.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 text-ink">{c.description}</td>
                  <td className="px-3 py-2 text-ink">{formatCurrency(c.amount)}</td>
                  <td className="px-3 py-2">
                    {c.status === "PAID" && (
                      <span className="text-brand">
                        Paid {c.paidVia === "manual" ? "(manual)" : "(online)"}
                        {c.paidAt ? ` · ${formatDate(c.paidAt)}` : ""}
                      </span>
                    )}
                    {c.status === "PENDING" && <span className="text-warning-text">Pending</span>}
                    {c.status === "CANCELLED" && <span className="text-ink-soft">Cancelled</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {c.status === "PENDING" && (
                      <div className="flex justify-end gap-3">
                        <form action={markChargePaidManually.bind(null, bookingId, c.id)}>
                          <button className="text-sky-700 hover:underline">Mark Paid (Manual)</button>
                        </form>
                        <form action={cancelCharge.bind(null, bookingId, c.id)}>
                          <button className="text-ink-soft hover:underline">Cancel</button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_auto]">
        <input name="description" placeholder="e.g. Balance due, Damage - side mirror" required className={field} />
        <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount (₱)" required className={field} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Creating link…" : "Create Payment Link"}
        </button>
      </form>

      {state?.error && <p className="mt-3 rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger-text">{state.error}</p>}

      {state?.checkoutUrl && (
        <div className="mt-4 rounded-lg border border-success-text bg-success-surface p-4">
          <p className="mb-2 text-sm font-medium text-success-text">
            Payment link ready — show this to the customer so they can pay on their own device.
          </p>
          <div className="flex items-center gap-2">
            <input readOnly value={state.checkoutUrl} className={field + " flex-1"} onFocus={(e) => e.target.select()} />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded-lg border border-brand px-3 py-2 text-xs font-medium text-success-text hover:bg-success-surface"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
