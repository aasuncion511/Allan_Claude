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
              className="rounded-lg border border-red-900 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950"
            >
              Delete Booking
            </button>
          </form>
        }
      />
      {booking.corporateClient ? (
        <div className="mb-6 rounded-xl border border-sky-900 bg-sky-950/30 p-4 text-sm text-sky-300">
          🏢 Billed to corporate account: <strong>{booking.corporateClient.name}</strong> — not collected through the
          app; invoice separately.
        </div>
      ) : (
        balance > 0 && (
          <div className="mb-6 rounded-xl border border-amber-900 bg-amber-950/30 p-4 text-sm text-amber-300">
            {formatCurrency(balance)} balance still due on this booking.
          </div>
        )
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
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
