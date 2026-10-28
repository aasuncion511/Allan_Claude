"use client";

import { useActionState, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  createChargeAndCheckout,
  recordCashPayment,
  cancelCharge,
  markChargePaidManually,
  sendChargeLinkEmail,
  sendChargeLinkSms,
  type CreateChargeState,
  type RecordCashState,
  type SendLinkState,
} from "./charges-actions";
import { CHARGE_REASONS } from "@/lib/charge-reasons";
import { CheckoutQr } from "@/components/checkout-qr";

type Charge = {
  id: string;
  description: string;
  amount: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  paidVia: string | null;
  paidAt: Date | null;
  createdAt: Date;
  paymongoCheckoutUrl: string | null;
};

function ReasonFields({ idPrefix }: { idPrefix: string }) {
  const [reason, setReason] = useState("balance_due");
  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  return (
    <>
      <select
        name="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className={field}
        aria-label="Reason"
      >
        {CHARGE_REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <input
        name="detail"
        placeholder={reason === "other" ? "Describe what this is (required)" : "Detail (optional)"}
        required={reason === "other"}
        className={field}
        id={`${idPrefix}-detail`}
      />
    </>
  );
}

function ChargeRowActions({ bookingId, charge }: { bookingId: string; charge: Charge }) {
  const [showQr, setShowQr] = useState(false);
  const emailAction = sendChargeLinkEmail.bind(null, bookingId, charge.id);
  const smsAction = sendChargeLinkSms.bind(null, bookingId, charge.id);
  const [emailState, emailFormAction, emailPending] = useActionState<SendLinkState, FormData>(emailAction, undefined);
  const [smsState, smsFormAction, smsPending] = useActionState<SendLinkState, FormData>(smsAction, undefined);

  if (!charge.paymongoCheckoutUrl) return null;

  return (
    <div className="mt-1 flex flex-col items-end gap-1">
      <div className="flex items-center gap-3 text-xs">
        <form action={emailFormAction}>
          <button className="text-sky-700 hover:underline disabled:opacity-50" disabled={emailPending}>
            {emailPending ? "Sending…" : "Email link"}
          </button>
        </form>
        <form action={smsFormAction}>
          <button className="text-sky-700 hover:underline disabled:opacity-50" disabled={smsPending}>
            {smsPending ? "Sending…" : "Text link"}
          </button>
        </form>
        <button type="button" onClick={() => setShowQr((v) => !v)} className="text-sky-700 hover:underline">
          {showQr ? "Hide QR" : "Show QR"}
        </button>
      </div>
      {emailState?.error && <p className="text-danger-text">{emailState.error}</p>}
      {emailState?.success && <p className="text-success-text">Emailed.</p>}
      {smsState?.error && <p className="text-danger-text">{smsState.error}</p>}
      {smsState?.success && <p className="text-success-text">Texted.</p>}
      {showQr && <CheckoutQr url={charge.paymongoCheckoutUrl} size={140} />}
    </div>
  );
}

export function ChargeManager({ bookingId, charges }: { bookingId: string; charges: Charge[] }) {
  const linkAction = createChargeAndCheckout.bind(null, bookingId);
  const [linkState, linkFormAction, linkPending] = useActionState<CreateChargeState, FormData>(linkAction, undefined);
  const cashAction = recordCashPayment.bind(null, bookingId);
  const [cashState, cashFormAction, cashPending] = useActionState<RecordCashState, FormData>(cashAction, undefined);
  const [copied, setCopied] = useState(false);

  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";

  async function copyLink() {
    if (!linkState?.checkoutUrl) return;
    try {
      await navigator.clipboard.writeText(linkState.checkoutUrl);
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
        Collect the remaining balance at pick-up/return, or add charges after use (damage, fuel, late return).
        Record cash directly, or send an online payment link the customer pays on their own device — either way,
        the booking&apos;s paid amount updates automatically.
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
                      <>
                        <div className="flex justify-end gap-3">
                          <form action={markChargePaidManually.bind(null, bookingId, c.id)}>
                            <button className="text-sky-700 hover:underline">Mark Paid (Manual)</button>
                          </form>
                          <form action={cancelCharge.bind(null, bookingId, c.id)}>
                            <button className="text-ink-soft hover:underline">Cancel</button>
                          </form>
                        </div>
                        <ChargeRowActions bookingId={bookingId} charge={c} />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <form action={cashFormAction} className="space-y-2 rounded-lg border border-line p-3">
          <p className="text-xs font-semibold text-ink">Record Cash Payment</p>
          <ReasonFields idPrefix="cash" />
          <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount (₱)" required className={field} />
          <button
            type="submit"
            disabled={cashPending}
            className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {cashPending ? "Recording…" : "Record Cash Payment"}
          </button>
          {cashState?.error && <p className="text-xs text-danger-text">{cashState.error}</p>}
          {cashState?.success && <p className="text-xs text-success-text">Recorded — balance updated.</p>}
        </form>

        <form action={linkFormAction} className="space-y-2 rounded-lg border border-line p-3">
          <p className="text-xs font-semibold text-ink">Online Payment Link (bank transfer / e-wallet / card)</p>
          <ReasonFields idPrefix="link" />
          <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount (₱)" required className={field} />
          <button
            type="submit"
            disabled={linkPending}
            className="w-full rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-canvas disabled:opacity-50"
          >
            {linkPending ? "Creating link…" : "Create Payment Link"}
          </button>
          {linkState?.error && <p className="text-xs text-danger-text">{linkState.error}</p>}
        </form>
      </div>

      {linkState?.checkoutUrl && (
        <div className="mt-4 rounded-lg border border-success-text bg-success-surface p-4">
          <p className="mb-2 text-sm font-medium text-success-text">
            Payment link ready — show this to the customer, or send/QR it below.
          </p>
          <div className="flex items-center gap-2">
            <input readOnly value={linkState.checkoutUrl} className={field + " flex-1"} onFocus={(e) => e.target.select()} />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded-lg border border-brand px-3 py-2 text-xs font-medium text-success-text hover:bg-success-surface"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
          <div className="mt-3 flex items-start gap-4">
            <CheckoutQr url={linkState.checkoutUrl} size={140} />
            <p className="text-xs text-ink-soft">
              Scan to pay, or use the Email/Text link buttons on the charge above once it appears in the list.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
