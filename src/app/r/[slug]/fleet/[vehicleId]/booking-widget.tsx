"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { formatCurrency } from "@/lib/format";
import { saveContactAction, type SaveContactState } from "../../customer-actions";
import {
  checkAvailabilityAction,
  createBookingCheckout,
  createCallbackInquiry,
  type BookingCheckoutState,
  type InquiryState,
} from "./actions";

type Step = "dates" | "contact" | "choose" | "requested";

export function BookingWidget({
  slug,
  vehicleId,
  dailyRate,
  reservationFeeAmount,
  holdFeeAmount,
  contactPhone,
  requirementsText,
  initialCustomer,
}: {
  slug: string;
  vehicleId: string;
  dailyRate: number;
  reservationFeeAmount: number;
  holdFeeAmount: number;
  contactPhone: string | null;
  requirementsText: string | null;
  initialCustomer: { name: string; email: string; phone: string; address: string } | null;
}) {
  const [step, setStep] = useState<Step>("dates");
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState<string | undefined>();
  const [checking, startChecking] = useTransition();
  const [agreed, setAgreed] = useState(false);
  const [contact, setContact] = useState(initialCustomer);

  const nights =
    startDate && endDate
      ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000))
      : 0;
  const subtotal = nights * dailyRate;

  function handleContinueFromDates() {
    setDateError(undefined);
    if (!startDate || !endDate || endDate <= startDate) {
      setDateError("Please choose a valid pick-up and drop-off date.");
      return;
    }
    startChecking(async () => {
      const result = await checkAvailabilityAction(vehicleId, startDate, endDate);
      if (!result.available) {
        setDateError(result.error ?? "Those dates aren't available.");
        return;
      }
      setStep(contact ? "choose" : "contact");
    });
  }

  const contactAction = saveContactAction.bind(null, slug);
  const [contactState, contactFormAction, contactPending] = useActionState<SaveContactState, FormData>(
    contactAction,
    undefined
  );
  useEffect(() => {
    // Advancing the wizard on server-action completion, not syncing render state — legitimate use of an effect.
    if (contactState && !contactState.error && contactState.email) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContact({
        name: contactState.name ?? "",
        email: contactState.email,
        phone: contactState.phone ?? "",
        address: contactState.address ?? "",
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("choose");
    }
  }, [contactState]);

  const reservationAction = createBookingCheckout.bind(null, slug, vehicleId, "reservation");
  const [reservationState, reservationFormAction, reservationPending] = useActionState<BookingCheckoutState, FormData>(
    reservationAction,
    undefined
  );

  const holdAction = createBookingCheckout.bind(null, slug, vehicleId, "hold");
  const [holdState, holdFormAction, holdPending] = useActionState<BookingCheckoutState, FormData>(holdAction, undefined);

  const inquiryAction = createCallbackInquiry.bind(null, slug, vehicleId);
  const [inquiryState, inquiryFormAction, inquiryPending] = useActionState<InquiryState, FormData>(
    inquiryAction,
    undefined
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (inquiryState?.success) setStep("requested");
  }, [inquiryState]);

  const field =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500";
  const label = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <div id="book" className="rounded-xl border border-slate-200 bg-white p-6">
      {step === "dates" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Pick your dates</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Pick-up Date</label>
              <input
                type="date"
                required
                min={today}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label className={label}>Drop-off Date</label>
              <input
                type="date"
                required
                min={startDate || today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={field}
              />
            </div>
          </div>
          {nights > 0 && (
            <p className="text-sm text-slate-600">
              {nights} night{nights === 1 ? "" : "s"} · {formatCurrency(subtotal)} total
            </p>
          )}
          {dateError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{dateError}</p>}
          <button
            type="button"
            onClick={handleContinueFromDates}
            disabled={checking}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {checking ? "Checking availability…" : "Book This Car"}
          </button>
        </div>
      )}

      {step === "contact" && (
        <form action={contactFormAction} className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Almost there — who&apos;s booking?</h3>
          <p className="text-sm text-slate-500">
            Just your details, no separate account to set up. We&apos;ll use this to confirm your reservation.
          </p>
          <div>
            <label className={label}>Full Name</label>
            <input name="name" required className={field} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Email</label>
              <input name="email" type="email" required className={field} />
            </div>
            <div>
              <label className={label}>Mobile Number</label>
              <input name="phone" type="tel" required className={field} />
            </div>
          </div>
          <div>
            <label className={label}>Address</label>
            <input name="address" required className={field} />
          </div>
          {contactState?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{contactState.error}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("dates")}
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={contactPending}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {contactPending ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      )}

      {step === "choose" && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Reservation Summary</h3>
            <p className="mt-1 text-sm text-slate-600">
              {startDate} → {endDate} · {nights} night{nights === 1 ? "" : "s"}
            </p>
            <p className="text-sm text-slate-600">Estimated total: {formatCurrency(subtotal)} (balance settled at pick-up)</p>
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-400"
            />
            <span>
              I agree to the rental terms and requirements{requirementsText ? " described below" : ""}, and confirm I
              meet the minimum age and valid license requirement to rent.
            </span>
          </label>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-slate-900">Pay {formatCurrency(reservationFeeAmount)} — Confirm Instantly</p>
            <p className="mt-1 text-xs text-slate-600">Your booking is locked in immediately, no waiting.</p>
            <form action={reservationFormAction} className="mt-3">
              <input type="hidden" name="startDate" value={startDate} />
              <input type="hidden" name="endDate" value={endDate} />
              <button
                type="submit"
                disabled={!agreed || reservationPending}
                className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {reservationPending ? "Redirecting to payment…" : `Pay ${formatCurrency(reservationFeeAmount)} & Reserve`}
              </button>
            </form>
            {reservationState?.error && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{reservationState.error}</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">Pay {formatCurrency(holdFeeAmount)} — Hold for 2 Hours</p>
            <p className="mt-1 text-xs text-slate-600">
              Not ready to commit? Hold these dates for 2 hours. Non-refundable, but credited toward your reservation
              fee if you confirm in time.
            </p>
            <form action={holdFormAction} className="mt-3">
              <input type="hidden" name="startDate" value={startDate} />
              <input type="hidden" name="endDate" value={endDate} />
              <button
                type="submit"
                disabled={!agreed || holdPending}
                className="w-full rounded-lg border border-slate-900 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
              >
                {holdPending ? "Redirecting to payment…" : `Pay ${formatCurrency(holdFeeAmount)} & Hold`}
              </button>
            </form>
            {holdState?.error && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{holdState.error}</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">Request a Callback</p>
            <p className="mt-1 text-xs text-slate-600">
              Prefer to pay cash or bank transfer, or just want to ask something first? We&apos;ll reach out — these dates
              aren&apos;t held while we do.
            </p>
            <form action={inquiryFormAction} className="mt-3 space-y-2">
              <input type="hidden" name="startDate" value={startDate} />
              <input type="hidden" name="endDate" value={endDate} />
              <textarea
                name="message"
                placeholder="Anything we should know? (optional)"
                className={field}
                rows={2}
              />
              <button
                type="submit"
                disabled={!agreed || inquiryPending}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {inquiryPending ? "Sending…" : "Request a Callback"}
              </button>
            </form>
            {inquiryState?.error && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{inquiryState.error}</p>
            )}
            {contactPhone && <p className="mt-2 text-xs text-slate-500">Or call us directly at {contactPhone}.</p>}
          </div>

          <button
            type="button"
            onClick={() => setStep(initialCustomer || contact ? "dates" : "contact")}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            ← Change dates or details
          </button>
        </div>
      )}

      {step === "requested" && (
        <div className="py-6 text-center">
          <div className="mb-3 text-4xl">📞</div>
          <h3 className="text-lg font-semibold text-slate-900">We&apos;ll be in touch!</h3>
          <p className="mt-2 text-sm text-slate-600">
            We&apos;ve received your request for {startDate} → {endDate}. Our team will call or text you shortly to
            confirm. These dates aren&apos;t held yet — if you&apos;d rather lock them in now, you can still pay online above.
          </p>
          <button
            type="button"
            onClick={() => setStep("choose")}
            className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Back to payment options
          </button>
        </div>
      )}
    </div>
  );
}
