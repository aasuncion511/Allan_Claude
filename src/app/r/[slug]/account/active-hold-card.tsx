"use client";

import { useActionState } from "react";
import { formatCurrency } from "@/lib/format";
import { HoldCountdown, formatMMSS } from "@/components/hold-countdown";
import {
  createReservationCheckoutAction,
  getHoldStateAction,
  type BookingCheckoutState,
} from "../fleet/[vehicleId]/actions";

export function ActiveHoldCard({
  slug,
  bookingId,
  vehicleLabel,
  reservationFee,
  serverNowUtc,
  expiresAtUtc,
}: {
  slug: string;
  bookingId: string;
  vehicleLabel: string;
  reservationFee: number;
  serverNowUtc: string;
  expiresAtUtc: string;
}) {
  const action = createReservationCheckoutAction.bind(null, slug, bookingId);
  const [state, formAction, pending] = useActionState<BookingCheckoutState, FormData>(action, undefined);

  return (
    <HoldCountdown
      bookingId={bookingId}
      initialServerNowUtc={serverNowUtc}
      initialExpiresAtUtc={expiresAtUtc}
      getHoldState={getHoldStateAction}
    >
      {({ remainingSeconds, status }) => {
        if (status === "expired") {
          return (
            <div className="mb-6 rounded-xl border border-line bg-surface p-5 text-sm text-ink-soft">
              {vehicleLabel} — your free hold expired.{" "}
              <a href={`/r/${slug}/fleet`} className="text-[var(--store-accent)] hover:underline">
                Check availability again
              </a>
              .
            </div>
          );
        }
        if (status === "confirmed") {
          return (
            <div className="mb-6 rounded-xl border border-success-text/40 bg-success-surface p-5 text-sm text-success-text">
              ✅ {vehicleLabel} is reserved — your payment went through.
            </div>
          );
        }
        if (status === "payment_pending" || status === "checkout_pending") {
          return (
            <div className="mb-6 rounded-xl border border-warning-text/40 bg-warning-surface p-5 text-sm text-warning-text">
              {vehicleLabel} — payment is processing, please don&apos;t start another booking. This usually clears
              within a minute or two.
            </div>
          );
        }
        return (
          <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-5">
            <p className="font-semibold text-ink">
              {vehicleLabel} is held — {formatMMSS(remainingSeconds)} remaining
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Free hold, no payment required. Pay {formatCurrency(reservationFee)} to confirm — non-refundable,
              credited toward your rental total.
            </p>
            <form action={formAction} className="mt-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-[var(--store-accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--store-accent-dark)] disabled:opacity-50"
              >
                {pending ? "Redirecting to payment…" : `Reserve Now — Pay ${formatCurrency(reservationFee)}`}
              </button>
            </form>
            {state?.error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger-text">{state.error}</p>}
          </div>
        );
      }}
    </HoldCountdown>
  );
}
