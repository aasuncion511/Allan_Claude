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
