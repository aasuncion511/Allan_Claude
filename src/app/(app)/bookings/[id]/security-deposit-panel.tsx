"use client";

import { useActionState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  collectSecurityDepositAction,
  refundSecurityDepositAction,
  type DepositActionState,
} from "../actions";

type Props = {
  bookingId: string;
  amount: number;
  status: "NOT_COLLECTED" | "HELD" | "REFUNDED";
  collectedMethod: string | null;
  collectedAt: Date | null;
  refundMethod: string | null;
  refundedAt: Date | null;
};

const COLLECT_LABELS: Record<string, string> = {
  cash: "Cash at pickup/delivery",
  included_in_payment: "Included in full-payment invoice",
};

const REFUND_LABELS: Record<string, string> = {
  cash: "Cash",
  gcash: "GCash",
  bank_transfer: "Bank transfer",
};

export function SecurityDepositPanel({
  bookingId,
  amount,
  status,
  collectedMethod,
  collectedAt,
  refundMethod,
  refundedAt,
}: Props) {
  const collectAction = collectSecurityDepositAction.bind(null, bookingId);
  const refundAction = refundSecurityDepositAction.bind(null, bookingId);
  const [collectState, collectFormAction, collectPending] = useActionState<DepositActionState, FormData>(
    collectAction,
    undefined
  );
  const [refundState, refundFormAction, refundPending] = useActionState<DepositActionState, FormData>(
    refundAction,
    undefined
  );

  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-xs font-medium text-ink-soft";

  if (amount <= 0) return null;

  return (
    <div className="mt-8 rounded-xl border border-line bg-surface p-6">
      <h2 className="mb-1 text-sm font-semibold text-ink">Security Deposit</h2>
      <p className="mb-4 text-xs text-ink-soft">
        {formatCurrency(amount)} — refundable after turnover, never counted as revenue. Tracked separately from the
        rental payment above.
      </p>

      {status === "NOT_COLLECTED" && (
        <form action={collectFormAction} className="space-y-3">
          <div>
            <label className={label}>How was it collected?</label>
            <select name="method" defaultValue="cash" className={field}>
              <option value="cash">Cash at pickup/delivery</option>
              <option value="included_in_payment">Included in full-payment invoice</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={collectPending}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
          >
            {collectPending ? "Saving…" : "Mark Deposit Collected"}
          </button>
          {collectState?.error && (
            <p className="rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger-text">{collectState.error}</p>
          )}
        </form>
      )}

      {status === "HELD" && (
        <>
          <p className="mb-3 text-sm text-success-text">
            ✅ Held — collected via {COLLECT_LABELS[collectedMethod ?? ""] ?? collectedMethod}
            {collectedAt ? ` on ${formatDate(collectedAt)}` : ""}.
          </p>
          <form action={refundFormAction} className="space-y-3">
            <div>
              <label className={label}>Refund method</label>
              <select name="method" defaultValue="cash" className={field}>
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={refundPending}
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50"
            >
              {refundPending ? "Processing…" : "Refund Deposit"}
            </button>
            {refundState?.error && (
              <p className="rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger-text">{refundState.error}</p>
            )}
          </form>
        </>
      )}

      {status === "REFUNDED" && (
        <p className="text-sm text-success-text">
          ✅ Refunded via {REFUND_LABELS[refundMethod ?? ""] ?? refundMethod}
          {refundedAt ? ` on ${formatDate(refundedAt)}` : ""}.
        </p>
      )}
    </div>
  );
}
