"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { formatCurrency } from "@/lib/format";
import {
  computeBookingPricing,
  PURPOSE_OF_TRAVEL_OPTIONS,
  HOW_FOUND_US_OPTIONS,
  type RentalOption,
  type BookingLocationMethod,
} from "@/lib/booking-pricing";
import { saveContactAction, type SaveContactState } from "../../customer-actions";
import {
  checkAvailabilityAction,
  createOrResumeHoldAction,
  createReservationCheckoutAction,
  getHoldStateAction,
  createCallbackInquiry,
  createCorporateBooking,
  type HoldActionState,
  type BookingCheckoutState,
  type InquiryState,
  type CorporateBookingState,
} from "./actions";
import { HoldCountdown, formatMMSS } from "@/components/hold-countdown";

type Step = "dates" | "contact" | "trip" | "choose" | "requested";

type TripState = {
  startTime: string;
  endTime: string;
  rentalOption: RentalOption;
  pickupMethod: BookingLocationMethod;
  dropoffMethod: BookingLocationMethod;
  pickupLocation: string;
  dropoffLocation: string;
  carwashRequested: boolean;
  excessHours: number;
  destinationDetails: string;
  purposeOfTravel: string;
  howFoundUs: string;
};

const DEFAULT_TRIP: TripState = {
  startTime: "08:00",
  endTime: "08:00",
  rentalOption: "SELF_DRIVE",
  pickupMethod: "GARAGE",
  dropoffMethod: "GARAGE",
  pickupLocation: "",
  dropoffLocation: "",
  carwashRequested: false,
  excessHours: 0,
  destinationDetails: "",
  purposeOfTravel: "",
  howFoundUs: "",
};

/** Hidden inputs shared by every submit form (reservation, hold, callback, corporate) so each
 *  carries the full trip detail set without repeating ~15 inputs per form. */
function TripHiddenFields({ startDate, endDate, trip }: { startDate: string; endDate: string; trip: TripState }) {
  return (
    <>
      <input type="hidden" name="startDate" value={startDate} />
      <input type="hidden" name="endDate" value={endDate} />
      <input type="hidden" name="startTime" value={trip.startTime} />
      <input type="hidden" name="endTime" value={trip.endTime} />
      <input type="hidden" name="rentalOption" value={trip.rentalOption} />
      <input type="hidden" name="pickupMethod" value={trip.pickupMethod} />
      <input type="hidden" name="dropoffMethod" value={trip.dropoffMethod} />
      <input type="hidden" name="pickupLocation" value={trip.pickupLocation} />
      <input type="hidden" name="dropoffLocation" value={trip.dropoffLocation} />
      <input type="hidden" name="carwashRequested" value={trip.carwashRequested ? "on" : ""} />
      <input type="hidden" name="excessHours" value={trip.excessHours} />
      <input type="hidden" name="destinationDetails" value={trip.destinationDetails} />
      <input type="hidden" name="purposeOfTravel" value={trip.purposeOfTravel} />
      <input type="hidden" name="howFoundUs" value={trip.howFoundUs} />
    </>
  );
}

export function BookingWidget({
  slug,
  vehicleId,
  dailyRate,
  reservationFee,
  holdWindowSeconds,
  contactPhone,
  requirementsText,
  initialCustomer,
  corporateClients,
  offersDriverService,
  driverFeePerDay,
  deliveryFeeAmount,
  dropoffFeeAmount,
  carwashFeeAmount,
  excessHourlyRate,
}: {
  slug: string;
  vehicleId: string;
  dailyRate: number;
  reservationFee: number | null;
  holdWindowSeconds: number;
  contactPhone: string | null;
  requirementsText: string | null;
  initialCustomer: { name: string; email: string; phone: string; address: string } | null;
  corporateClients: { id: string; name: string }[];
  offersDriverService: boolean;
  driverFeePerDay: number;
  deliveryFeeAmount: number;
  dropoffFeeAmount: number;
  carwashFeeAmount: number;
  excessHourlyRate: number;
}) {
  const [step, setStep] = useState<Step>("dates");
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState<string | undefined>();
  const [checking, startChecking] = useTransition();
  const [agreed, setAgreed] = useState(false);
  const [contact, setContact] = useState(initialCustomer);
  const [trip, setTrip] = useState<TripState>(DEFAULT_TRIP);

  const nights =
    startDate && endDate
      ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000))
      : 0;

  const pricing = computeBookingPricing({
    dailyRate,
    days: nights || 1,
    rentalOption: trip.rentalOption,
    pickupMethod: trip.pickupMethod,
    dropoffMethod: trip.dropoffMethod,
    carwashRequested: trip.carwashRequested,
    excessHours: trip.excessHours,
    driverFeePerDay,
    deliveryFeeAmount,
    dropoffFeeAmount,
    carwashFeeAmount,
    excessHourlyRate,
  });

  function handleContinueFromDates() {
    setDateError(undefined);
    if (!startDate || !endDate || endDate <= startDate) {
      setDateError("Please choose a valid pick-up and drop-off date.");
      return;
    }
    if (trip.pickupMethod === "DELIVERED" && !trip.pickupLocation.trim()) {
      setDateError("Please enter where you'd like the car delivered.");
      return;
    }
    if (trip.dropoffMethod === "DELIVERED" && !trip.dropoffLocation.trim()) {
      setDateError("Please enter your drop-off location.");
      return;
    }
    startChecking(async () => {
      const result = await checkAvailabilityAction(vehicleId, startDate, endDate);
      if (!result.available) {
        setDateError(result.error ?? "Those dates aren't available.");
        return;
      }
      setStep(contact ? "trip" : "contact");
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
      setStep("trip");
    }
  }, [contactState]);

  const createHoldAction = createOrResumeHoldAction.bind(null, slug, vehicleId);
  const [holdActionState, holdFormAction, holdPending] = useActionState<HoldActionState, FormData>(
    createHoldAction,
    undefined
  );
  const [heldBooking, setHeldBooking] = useState<
    { bookingId: string; serverNowUtc: string; expiresAtUtc: string; reservationFee: number } | null
  >(null);
  useEffect(() => {
    if (holdActionState?.bookingId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHeldBooking({
        bookingId: holdActionState.bookingId,
        serverNowUtc: holdActionState.serverNowUtc,
        expiresAtUtc: holdActionState.expiresAtUtc,
        reservationFee: holdActionState.reservationFee,
      });
    }
  }, [holdActionState]);

  const reserveAction = createReservationCheckoutAction.bind(null, slug, heldBooking?.bookingId ?? "");
  const [reserveState, reserveFormAction, reservePending] = useActionState<BookingCheckoutState, FormData>(
    reserveAction,
    undefined
  );

  const inquiryAction = createCallbackInquiry.bind(null, slug, vehicleId);
  const [inquiryState, inquiryFormAction, inquiryPending] = useActionState<InquiryState, FormData>(
    inquiryAction,
    undefined
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (inquiryState?.success) setStep("requested");
  }, [inquiryState]);

  const corporateAction = createCorporateBooking.bind(null, slug, vehicleId);
  const [corporateState, corporateFormAction, corporatePending] = useActionState<CorporateBookingState, FormData>(
    corporateAction,
    undefined
  );

  const field =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[var(--store-accent)]";
  const label = "mb-1 block text-sm font-medium text-ink";

  return (
    <div id="book" className="rounded-xl border border-line bg-white p-6">
      {step === "dates" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-ink">Pick your dates</h3>
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
            <div>
              <label className={label}>Pick-up Time</label>
              <input
                type="time"
                value={trip.startTime}
                onChange={(e) => setTrip({ ...trip, startTime: e.target.value })}
                className={field}
              />
            </div>
            <div>
              <label className={label}>Drop-off Time</label>
              <input
                type="time"
                value={trip.endTime}
                onChange={(e) => setTrip({ ...trip, endTime: e.target.value })}
                className={field}
              />
            </div>
          </div>

          {offersDriverService && (
            <div>
              <label className={label}>Rental Option</label>
              <select
                value={trip.rentalOption}
                onChange={(e) => setTrip({ ...trip, rentalOption: e.target.value as RentalOption })}
                className={field}
              >
                <option value="SELF_DRIVE">Self Drive</option>
                <option value="WITH_DRIVER">
                  With Driver (+{formatCurrency(driverFeePerDay)}/day)
                </option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Pick-up</label>
              <select
                value={trip.pickupMethod}
                onChange={(e) => setTrip({ ...trip, pickupMethod: e.target.value as BookingLocationMethod })}
                className={field}
              >
                <option value="GARAGE">At our garage (free)</option>
                <option value="DELIVERED">Delivered to me ({formatCurrency(deliveryFeeAmount)})</option>
              </select>
            </div>
            <div>
              <label className={label}>Drop-off</label>
              <select
                value={trip.dropoffMethod}
                onChange={(e) => setTrip({ ...trip, dropoffMethod: e.target.value as BookingLocationMethod })}
                className={field}
              >
                <option value="GARAGE">At our garage (free)</option>
                <option value="DELIVERED">Different location ({formatCurrency(dropoffFeeAmount)})</option>
              </select>
            </div>
          </div>

          {trip.pickupMethod === "DELIVERED" && (
            <div>
              <label className={label}>Delivery Address</label>
              <input
                value={trip.pickupLocation}
                onChange={(e) => setTrip({ ...trip, pickupLocation: e.target.value })}
                placeholder="Where should we bring the car?"
                className={field}
              />
            </div>
          )}
          {trip.dropoffMethod === "DELIVERED" && (
            <div>
              <label className={label}>Drop-off Address</label>
              <input
                value={trip.dropoffLocation}
                onChange={(e) => setTrip({ ...trip, dropoffLocation: e.target.value })}
                placeholder="Where will you leave the car?"
                className={field}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {carwashFeeAmount > 0 && (
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={trip.carwashRequested}
                  onChange={(e) => setTrip({ ...trip, carwashRequested: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-400"
                />
                Add carwash ({formatCurrency(carwashFeeAmount)})
              </label>
            )}
            {excessHourlyRate > 0 && (
              <div>
                <label className={label}>Anticipated excess hours</label>
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={trip.excessHours}
                  onChange={(e) => setTrip({ ...trip, excessHours: Math.max(0, Math.min(24, Number(e.target.value))) })}
                  className={field}
                />
              </div>
            )}
          </div>

          {nights > 0 && (
            <div className="rounded-lg bg-canvas p-3 text-sm text-ink-soft">
              <div className="flex justify-between">
                <span>
                  Car rental ({nights} night{nights === 1 ? "" : "s"})
                </span>
                <span>{formatCurrency(pricing.carRentalFee)}</span>
              </div>
              {pricing.driverFee > 0 && (
                <div className="flex justify-between">
                  <span>Driver fee</span>
                  <span>{formatCurrency(pricing.driverFee)}</span>
                </div>
              )}
              {pricing.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Delivery fee</span>
                  <span>{formatCurrency(pricing.deliveryFee)}</span>
                </div>
              )}
              {pricing.dropoffFee > 0 && (
                <div className="flex justify-between">
                  <span>Drop-off fee</span>
                  <span>{formatCurrency(pricing.dropoffFee)}</span>
                </div>
              )}
              {pricing.carwashFee > 0 && (
                <div className="flex justify-between">
                  <span>Carwash</span>
                  <span>{formatCurrency(pricing.carwashFee)}</span>
                </div>
              )}
              {pricing.excessTimeFee > 0 && (
                <div className="flex justify-between">
                  <span>Excess time ({trip.excessHours}h)</span>
                  <span>{formatCurrency(pricing.excessTimeFee)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold text-ink">
                <span>Estimated total</span>
                <span>{formatCurrency(pricing.totalAmount)}</span>
              </div>
            </div>
          )}
          {dateError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger-text">{dateError}</p>}
          <button
            type="button"
            onClick={handleContinueFromDates}
            disabled={checking}
            className="w-full rounded-lg bg-[var(--store-accent)] px-4 py-3 text-base font-semibold text-white hover:bg-[var(--store-accent-dark)] disabled:opacity-50"
          >
            {checking ? "Checking availability…" : "Book This Car"}
          </button>
        </div>
      )}

      {step === "contact" && (
        <form action={contactFormAction} className="space-y-4">
          <h3 className="text-lg font-semibold text-ink">Almost there — who&apos;s booking?</h3>
          <p className="text-sm text-ink-soft">
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
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger-text">{contactState.error}</p>
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
              className="flex-1 rounded-lg bg-[var(--store-accent)] px-4 py-3 text-base font-semibold text-white hover:bg-[var(--store-accent-dark)] disabled:opacity-50"
            >
              {contactPending ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      )}

      {step === "trip" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-ink">A couple more details</h3>
          <p className="text-sm text-ink-soft">Helps us prepare for your trip — all optional.</p>
          <div>
            <label className={label}>Where are you headed? (optional)</label>
            <input
              value={trip.destinationDetails}
              onChange={(e) => setTrip({ ...trip, destinationDetails: e.target.value })}
              placeholder="e.g. Dahilayan, Bukidnon"
              className={field}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Purpose of travel</label>
              <select
                value={trip.purposeOfTravel}
                onChange={(e) => setTrip({ ...trip, purposeOfTravel: e.target.value })}
                className={field}
              >
                <option value="">Select…</option>
                {PURPOSE_OF_TRAVEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>How did you find us?</label>
              <select
                value={trip.howFoundUs}
                onChange={(e) => setTrip({ ...trip, howFoundUs: e.target.value })}
                className={field}
              >
                <option value="">Select…</option>
                {HOW_FOUND_US_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep("contact")}
              className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep("choose")}
              className="flex-1 rounded-lg bg-[var(--store-accent)] px-4 py-3 text-base font-semibold text-white hover:bg-[var(--store-accent-dark)]"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "choose" && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-ink">Reservation Summary</h3>
            <p className="mt-1 text-sm text-slate-600">
              {startDate} {trip.startTime} → {endDate} {trip.endTime} · {nights} night{nights === 1 ? "" : "s"}
              {trip.rentalOption === "WITH_DRIVER" ? " · With Driver" : ""}
            </p>
            <div className="mt-2 rounded-lg bg-canvas p-3 text-sm text-ink-soft">
              <div className="flex justify-between">
                <span>Car rental</span>
                <span>{formatCurrency(pricing.carRentalFee)}</span>
              </div>
              {pricing.driverFee > 0 && (
                <div className="flex justify-between">
                  <span>Driver fee</span>
                  <span>{formatCurrency(pricing.driverFee)}</span>
                </div>
              )}
              {pricing.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Delivery fee</span>
                  <span>{formatCurrency(pricing.deliveryFee)}</span>
                </div>
              )}
              {pricing.dropoffFee > 0 && (
                <div className="flex justify-between">
                  <span>Drop-off fee</span>
                  <span>{formatCurrency(pricing.dropoffFee)}</span>
                </div>
              )}
              {pricing.carwashFee > 0 && (
                <div className="flex justify-between">
                  <span>Carwash</span>
                  <span>{formatCurrency(pricing.carwashFee)}</span>
                </div>
              )}
              {pricing.excessTimeFee > 0 && (
                <div className="flex justify-between">
                  <span>Excess time</span>
                  <span>{formatCurrency(pricing.excessTimeFee)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between border-t border-line pt-1 font-semibold text-ink">
                <span>Estimated total</span>
                <span>{formatCurrency(pricing.totalAmount)}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-soft">Balance settled at pick-up — only the amount below is charged now.</p>
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

          {reservationFee == null ? (
            <div className="rounded-lg border border-line p-4 text-sm text-slate-600">
              Online reservation isn&apos;t set up for this vehicle yet — please use Request a Callback below, or call
              us directly to book.
            </div>
          ) : !heldBooking ? (
            <div className="rounded-lg border border-emerald-200 bg-success-surface p-4">
              <p className="font-semibold text-ink">
                Hold This Vehicle — FREE for {Math.round(holdWindowSeconds / 60)} Minutes
              </p>
              <p className="mt-1 text-xs text-slate-600">
                No payment required. Then pay {formatCurrency(reservationFee)} — non-refundable, credited toward your
                rental total — to confirm.
              </p>
              <form action={holdFormAction} className="mt-3">
                <TripHiddenFields startDate={startDate} endDate={endDate} trip={trip} />
                <button
                  type="submit"
                  disabled={!agreed || holdPending}
                  className="w-full rounded-lg bg-[var(--store-accent)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--store-accent-dark)] disabled:opacity-50"
                >
                  {holdPending ? "Holding…" : `Hold This Vehicle — FREE for ${Math.round(holdWindowSeconds / 60)} Minutes`}
                </button>
              </form>
              {holdActionState?.error && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger-text">{holdActionState.error}</p>
              )}
            </div>
          ) : (
            <HoldCountdown
              bookingId={heldBooking.bookingId}
              initialServerNowUtc={heldBooking.serverNowUtc}
              initialExpiresAtUtc={heldBooking.expiresAtUtc}
              getHoldState={getHoldStateAction}
              onExpired={() => setHeldBooking(null)}
            >
              {({ remainingSeconds, status }) => {
                if (status === "confirmed") {
                  return (
                    <div className="rounded-lg border border-emerald-200 bg-success-surface p-4 text-sm text-ink">
                      ✅ Reservation confirmed — your vehicle is booked.
                    </div>
                  );
                }
                if (status === "payment_pending" || status === "checkout_pending") {
                  return (
                    <div className="rounded-lg border border-warning-text/40 bg-warning-surface p-4 text-sm text-warning-text">
                      Payment is processing — please don&apos;t start another booking. This usually clears within a
                      minute or two.
                    </div>
                  );
                }
                if (status === "expired") {
                  return (
                    <div className="rounded-lg border border-line p-4 text-sm text-slate-600">
                      Your free hold expired. Please check availability again.
                    </div>
                  );
                }
                return (
                  <div className="rounded-lg border border-emerald-200 bg-success-surface p-4">
                    <p className="font-semibold text-ink">
                      Vehicle held for {formatMMSS(remainingSeconds)} — complete your {formatCurrency(heldBooking.reservationFee)}{" "}
                      reservation to confirm.
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Non-refundable, subject to our rental terms and applicable law — credited toward your rental
                      total.
                    </p>
                    <form action={reserveFormAction} className="mt-3">
                      <button
                        type="submit"
                        disabled={reservePending}
                        className="w-full rounded-lg bg-[var(--store-accent)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--store-accent-dark)] disabled:opacity-50"
                      >
                        {reservePending
                          ? "Redirecting to payment…"
                          : `Reserve Now — Pay ${formatCurrency(heldBooking.reservationFee)}`}
                      </button>
                    </form>
                    {reserveState?.error && (
                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger-text">{reserveState.error}</p>
                    )}
                  </div>
                );
              }}
            </HoldCountdown>
          )}

          <div className="rounded-lg border border-line p-4">
            <p className="font-semibold text-ink">Request a Callback</p>
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
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-ink hover:bg-slate-50 disabled:opacity-50"
              >
                {inquiryPending ? "Sending…" : "Request a Callback"}
              </button>
            </form>
            {inquiryState?.error && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger-text">{inquiryState.error}</p>
            )}
            {contactPhone && <p className="mt-2 text-xs text-ink-soft">Or call us directly at {contactPhone}.</p>}
          </div>

          {corporateClients.length > 0 && (
            <div className="rounded-lg border border-line p-4">
              <p className="font-semibold text-ink">Corporate Account</p>
              <p className="mt-1 text-xs text-slate-600">
                Accredited company? Book now with no payment — your company is billed separately.
              </p>
              <form action={corporateFormAction} className="mt-3 space-y-2">
                <TripHiddenFields startDate={startDate} endDate={endDate} trip={trip} />
                <select name="corporateClientId" required className={field} defaultValue="">
                  <option value="" disabled>
                    Select your company…
                  </option>
                  {corporateClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input name="accessCode" placeholder="Access code" required className={field} />
                <button
                  type="submit"
                  disabled={!agreed || corporatePending}
                  className="w-full rounded-lg border border-slate-900 px-4 py-3 text-sm font-semibold text-ink hover:bg-slate-50 disabled:opacity-50"
                >
                  {corporatePending ? "Confirming…" : "Book — Confirmed, No Payment"}
                </button>
              </form>
              {corporateState?.error && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger-text">{corporateState.error}</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep("trip")}
            className="text-xs text-ink-soft hover:text-ink"
          >
            ← Change details
          </button>
        </div>
      )}

      {step === "requested" && (
        <div className="py-6 text-center">
          <div className="mb-3 text-4xl">📞</div>
          <h3 className="text-lg font-semibold text-ink">We&apos;ll be in touch!</h3>
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
