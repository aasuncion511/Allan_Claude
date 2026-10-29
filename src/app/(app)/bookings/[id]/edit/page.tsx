import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { BookingForm } from "@/components/booking-form";
import { ChargeManager } from "../charge-manager";
import { RefundPanel } from "../refund-panel";
import { SecurityDepositPanel } from "../security-deposit-panel";
import { InspectionPanel } from "../inspection-panel";
import { formatCurrency, formatDate } from "@/lib/format";
import { updateBooking, deleteBooking, resendConfirmationEmail, markSignedPhysically } from "../../actions";

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission("bookings");
  const { organizationId } = user;
  const [booking, vehicles, customers, charges, refunds, inspections] = await Promise.all([
    prisma.booking.findFirst({ where: { id, organizationId }, include: { corporateClient: true, customer: true } }),
    prisma.vehicle.findMany({ where: { organizationId }, orderBy: { plateNumber: "asc" } }),
    prisma.customer.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
    prisma.bookingCharge.findMany({ where: { bookingId: id, organizationId }, orderBy: { createdAt: "desc" } }),
    prisma.refund.findMany({ where: { bookingId: id, organizationId }, orderBy: { createdAt: "desc" } }),
    prisma.bookingInspection.findMany({ where: { bookingId: id, organizationId } }),
  ]);
  if (!booking) notFound();

  const releaseInspection = inspections.find((i) => i.type === "RELEASE") ?? null;
  const returnInspection = inspections.find((i) => i.type === "RETURN") ?? null;

  const refunders = await prisma.user.findMany({
    where: { id: { in: refunds.map((r) => r.requestedByUserId) } },
    select: { id: true, name: true },
  });
  const refunderNameById = new Map(refunders.map((u) => [u.id, u.name]));
  const refundsWithNames = refunds.map((r) => ({
    ...r,
    requestedByName: refunderNameById.get(r.requestedByUserId) ?? "—",
  }));
  const refundedSoFar = refunds
    .filter((r) => r.status === "SUCCEEDED")
    .reduce((sum, r) => sum + r.amount, 0);
  const refundable = Math.max(0, booking.amountPaid - refundedSoFar);

  const balance = Math.max(0, booking.totalAmount - booking.amountPaid);

  const action = updateBooking.bind(null, booking.id);
  const remove = deleteBooking.bind(null, booking.id);
  const resendEmail = resendConfirmationEmail.bind(null, booking.id);
  const markSigned = markSignedPhysically.bind(null, booking.id);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Edit Booking"
        actions={
          <form action={remove}>
            <button
              type="submit"
              className="rounded-lg border border-danger-text/40 px-4 py-2 text-sm font-medium text-danger-text hover:bg-danger-surface"
            >
              Delete Booking
            </button>
          </form>
        }
      />
      {booking.corporateClient ? (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
          🏢 Billed to corporate account: <strong>{booking.corporateClient.name}</strong> — not collected through the
          app; invoice separately.
        </div>
      ) : (
        balance > 0 && (
          <div className="mb-6 rounded-xl border border-warning-text/40 bg-warning-surface p-4 text-sm text-warning-text">
            {formatCurrency(balance)} balance still due on this booking.
          </div>
        )
      )}

      <div className="mb-6 rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Contract &amp; Confirmation Email
        </h2>

        <div className="mb-4 text-sm">
          {booking.confirmationEmailSentAt ? (
            <p className="text-success-text">
              ✅ Confirmation email (T&amp;Cs + e-invoice) sent on {formatDate(booking.confirmationEmailSentAt)}.
            </p>
          ) : booking.confirmationEmailError ? (
            <p className="text-danger-text">⚠ Email failed: {booking.confirmationEmailError}</p>
          ) : (
            <p className="text-ink-soft">No confirmation email sent yet.</p>
          )}
          <form action={resendEmail} className="mt-2">
            <button
              type="submit"
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
            >
              {booking.confirmationEmailSentAt ? "Resend" : "Send"} Confirmation Email
            </button>
          </form>
        </div>

        <div className="border-t border-line pt-4 text-sm">
          {booking.signedAt ? (
            <p className="text-success-text">
              ✅ Signed by <strong>{booking.signedName}</strong> on {formatDate(booking.signedAt)} (
              {booking.signedMethod === "PHYSICAL" ? "physical copy at pickup" : "electronically"}).
            </p>
          ) : (
            <>
              <p className="mb-2 text-ink-soft">⚠ Not yet signed.</p>
              <form action={markSigned} className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  name="signedName"
                  placeholder="Full name on the printout"
                  defaultValue={booking.customer?.name}
                  className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
                >
                  Mark as Signed Physically
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {booking.source === "ONLINE" && (
        <div className="mb-6 rounded-xl border border-line bg-surface p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Trip Details (from customer)
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-ink-soft">Rental Option</dt>
              <dd className="text-ink">{booking.rentalOption === "WITH_DRIVER" ? "With Driver" : "Self Drive"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Times</dt>
              <dd className="text-ink">
                {booking.startTime || "—"} → {booking.endTime || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Pick-up</dt>
              <dd className="text-ink">
                {booking.pickupMethod === "DELIVERED" ? `Delivered: ${booking.pickupLocation}` : "At garage"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Drop-off</dt>
              <dd className="text-ink">
                {booking.dropoffMethod === "DELIVERED" ? `Different: ${booking.dropoffLocation}` : "At garage"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Carwash</dt>
              <dd className="text-ink">{booking.carwashRequested ? "Requested" : "No"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Anticipated Excess Hours</dt>
              <dd className="text-ink">{booking.excessHours || 0}h</dd>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-xs text-ink-soft">Destination</dt>
              <dd className="text-ink">{booking.destinationDetails || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Purpose of Travel</dt>
              <dd className="text-ink">{booking.purposeOfTravel || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">How They Found Us</dt>
              <dd className="text-ink">{booking.howFoundUs || "—"}</dd>
            </div>
          </dl>
          {(booking.driverFee > 0 ||
            booking.deliveryFee > 0 ||
            booking.dropoffFee > 0 ||
            booking.carwashFee > 0 ||
            booking.excessTimeFee > 0) && (
            <div className="mt-4 border-t border-line pt-3 text-sm text-ink-soft">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Add-on Fees Included in Total</p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {booking.driverFee > 0 && <span>Driver: {formatCurrency(booking.driverFee)}</span>}
                {booking.deliveryFee > 0 && <span>Delivery: {formatCurrency(booking.deliveryFee)}</span>}
                {booking.dropoffFee > 0 && <span>Drop-off: {formatCurrency(booking.dropoffFee)}</span>}
                {booking.carwashFee > 0 && <span>Carwash: {formatCurrency(booking.carwashFee)}</span>}
                {booking.excessTimeFee > 0 && <span>Excess time: {formatCurrency(booking.excessTimeFee)}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface p-6">
        <BookingForm
          action={action}
          vehicles={vehicles}
          customers={customers}
          defaults={booking}
          submitLabel="Save Changes"
        />
      </div>

      <ChargeManager bookingId={booking.id} charges={charges} />

      <InspectionPanel bookingId={booking.id} release={releaseInspection} return={returnInspection} />

      <SecurityDepositPanel
        bookingId={booking.id}
        amount={booking.securityDeposit}
        status={booking.securityDepositStatus}
        collectedMethod={booking.securityDepositCollectedMethod}
        collectedAt={booking.securityDepositCollectedAt}
        refundMethod={booking.securityDepositRefundMethod}
        refundedAt={booking.securityDepositRefundedAt}
      />

      {booking.paymongoCheckoutId && (
        <RefundPanel
          bookingId={booking.id}
          refundable={refundable}
          refunds={refundsWithNames}
          canRefund={user.role === "OWNER"}
        />
      )}
    </div>
  );
}
