"use client";

import { HoldCountdown } from "@/components/hold-countdown";
import { getHoldStateAction } from "../fleet/[vehicleId]/actions";

/** Polls until the webhook confirms payment — redirect URLs alone never
 *  confirm a booking (v2 handoff §2 step 6), so this page can't just trust
 *  "you were sent back here" as proof of payment. */
export function PaymentStatus({
  bookingId,
  serverNowUtc,
  expiresAtUtc,
  vehicleLabel,
  orgName,
}: {
  bookingId: string;
  serverNowUtc: string;
  expiresAtUtc: string;
  vehicleLabel: string;
  orgName: string;
}) {
  return (
    <HoldCountdown
      bookingId={bookingId}
      initialServerNowUtc={serverNowUtc}
      initialExpiresAtUtc={expiresAtUtc}
      getHoldState={getHoldStateAction}
    >
      {({ status }) => {
        if (status === "confirmed") {
          return (
            <>
              <div className="mb-4 text-5xl">✅</div>
              <h1 className="text-2xl font-bold text-ink">Payment received!</h1>
              <p className="mt-2 text-slate-600">
                {vehicleLabel} is reserved — see the full breakdown in your account.
              </p>
            </>
          );
        }
        if (status === "expired") {
          return (
            <>
              <div className="mb-4 text-5xl">⚠️</div>
              <h1 className="text-2xl font-bold text-ink">This hold is no longer active</h1>
              <p className="mt-2 text-slate-600">
                If you completed payment, check your account — otherwise the free hold window closed.
              </p>
            </>
          );
        }
        return (
          <>
            <div className="mb-4 text-5xl">⏳</div>
            <h1 className="text-2xl font-bold text-ink">Confirming your payment…</h1>
            <p className="mt-2 text-slate-600">
              We&rsquo;re verifying your payment for {vehicleLabel} with {orgName} now — this usually takes just a few
              seconds. Please don&apos;t start another booking.
            </p>
          </>
        );
      }}
    </HoldCountdown>
  );
}
