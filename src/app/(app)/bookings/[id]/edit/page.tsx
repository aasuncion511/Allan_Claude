import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { BookingForm } from "@/components/booking-form";
import { updateBooking, deleteBooking } from "../../actions";

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [booking, vehicles, customers] = await Promise.all([
    prisma.booking.findUnique({ where: { id } }),
    prisma.vehicle.findMany({ orderBy: { plateNumber: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!booking) notFound();

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
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <BookingForm
          action={action}
          vehicles={vehicles}
          customers={customers}
          defaults={booking}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
