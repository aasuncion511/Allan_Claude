import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { BookingForm } from "@/components/booking-form";
import { ChargeManager } from "../charge-manager";
import { formatCurrency } from "@/lib/format";
import { updateBooking, deleteBooking } from "../../actions";

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId } = await requirePermission("bookings");
  const [booking, vehicles, customers, charges] = await Promise.all([
    prisma.booking.findFirst({ where: { id, organizationId }, include: { corporateClient: true } }),
    prisma.vehicle.findMany({ where: { organizationId }, orderBy: { plateNumber: "asc" } }),
    prisma.customer.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
    prisma.bookingCharge.findMany({ where: { bookingId: id, organizationId }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!booking) notFound();

  const balance = Math.max(0, booking.totalAmount - booking.amountPaid);

  const action = updateBooking.bind(null, booking.id);
  const remove = deleteBooking.bind(null, booking.id);

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
    </div>
  );
}
