import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";
import { DEFAULT_TERMS_AND_CONDITIONS } from "@/lib/booking-contract";
import { signBookingAction } from "./actions";

export default async function SignBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const booking = await prisma.booking.findUnique({
    where: { signatureToken: token },
    include: { organization: true, vehicle: true, customer: true },
  });
  if (!booking) notFound();

  const { organization: org, vehicle, customer } = booking;
  const terms = org.termsAndConditionsText?.trim() || DEFAULT_TERMS_AND_CONDITIONS;
  const addOnFees =
    booking.driverFee + booking.deliveryFee + booking.dropoffFee + booking.carwashFee + booking.excessTimeFee;
  const carRentalFee = booking.totalAmount - addOnFees;
  const balanceDue = Math.max(0, booking.totalAmount - booking.amountPaid);
  const action = signBookingAction.bind(null, token);

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-canvas px-4 py-8 text-ink sm:px-8">
      <div className="mb-6 flex items-center gap-3">
        {org.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logoUrl} alt={org.name} className="h-10 w-auto" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-deep text-lg text-white">
            🚗
          </span>
        )}
        <span className="text-lg font-semibold">{org.name}</span>
      </div>

      <div className="rounded-xl border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold">Rental Agreement</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {vehicle.year} {vehicle.make} {vehicle.model} · {formatDate(booking.startDate)} →{" "}
          {formatDate(booking.endDate)}
        </p>

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-soft">E-Invoice</h2>
        <table className="mt-2 w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1 text-ink-soft">Car Rental Fee</td>
              <td className="py-1 text-right">{formatCurrency(carRentalFee)}</td>
            </tr>
            {booking.driverFee > 0 && (
              <tr>
                <td className="py-1 text-ink-soft">Driver Fee</td>
                <td className="py-1 text-right">{formatCurrency(booking.driverFee)}</td>
              </tr>
            )}
            {booking.deliveryFee > 0 && (
              <tr>
                <td className="py-1 text-ink-soft">Delivery Fee</td>
                <td className="py-1 text-right">{formatCurrency(booking.deliveryFee)}</td>
              </tr>
            )}
            {booking.dropoffFee > 0 && (
              <tr>
                <td className="py-1 text-ink-soft">Drop-off Fee</td>
                <td className="py-1 text-right">{formatCurrency(booking.dropoffFee)}</td>
              </tr>
            )}
            {booking.carwashFee > 0 && (
              <tr>
                <td className="py-1 text-ink-soft">Carwash Fee</td>
                <td className="py-1 text-right">{formatCurrency(booking.carwashFee)}</td>
              </tr>
            )}
            {booking.excessTimeFee > 0 && (
              <tr>
                <td className="py-1 text-ink-soft">Excess Time Fee</td>
                <td className="py-1 text-right">{formatCurrency(booking.excessTimeFee)}</td>
              </tr>
            )}
            <tr className="border-t border-line">
              <td className="py-2 font-semibold">Total Amount</td>
              <td className="py-2 text-right font-semibold">{formatCurrency(booking.totalAmount)}</td>
            </tr>
            <tr>
              <td className="py-1 text-success-text">Amount Paid</td>
              <td className="py-1 text-right text-success-text">{formatCurrency(booking.amountPaid)}</td>
            </tr>
            <tr>
              <td className="py-1 font-semibold">Remaining Balance</td>
              <td className="py-1 text-right font-semibold">{formatCurrency(balanceDue)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-soft">
          This amount does not include any additional charges (e.g. excess mileage, damage, fuel, traffic
          violations) that may apply upon vehicle return, and is not yet final until the unit is returned and
          inspected.
        </p>

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-soft">Terms &amp; Conditions</h2>
        <div className="mt-2 max-h-72 overflow-y-auto whitespace-pre-line rounded-lg border border-line bg-canvas p-4 text-xs leading-relaxed">
          {terms}
        </div>

        {booking.signedAt ? (
          <div className="mt-6 rounded-xl border border-success-text/40 bg-success-surface p-4 text-sm text-success-text">
            ✅ Signed by <strong>{booking.signedName}</strong> on {formatDate(booking.signedAt)}
            {booking.signedMethod === "PHYSICAL" ? " (physical copy at pickup)." : " (electronically)."}
          </div>
        ) : (
          <form action={action} className="mt-6 space-y-3 border-t border-line pt-6">
            <label className="block text-sm font-medium text-ink">
              Type your full legal name to sign
              <input
                type="text"
                name="signedName"
                required
                defaultValue={customer.name}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" name="agree" required className="mt-1" />
              <span>I have read and agree to the Terms &amp; Conditions above.</span>
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Sign Agreement
            </button>
            <p className="text-xs text-ink-soft">
              You may also sign a physical printout with our staff when you pick up the vehicle instead.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
