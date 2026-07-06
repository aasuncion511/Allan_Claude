import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { BookingForm } from "@/components/booking-form";
import { createBooking } from "../actions";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string }>;
}) {
  const { vehicleId } = await searchParams;
  const organizationId = await requireOrgId();
  const [vehicles, customers] = await Promise.all([
    prisma.vehicle.findMany({ where: { organizationId }, orderBy: { plateNumber: "asc" } }),
    prisma.customer.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New Booking"
        description="Schedule a unit for a customer"
      />
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        {vehicles.length === 0 || customers.length === 0 ? (
          <p className="text-sm text-slate-400">
            You need at least one unit and one customer before creating a
            booking.
          </p>
        ) : (
          <BookingForm
            action={createBooking}
            vehicles={vehicles}
            customers={customers}
            defaults={{ vehicleId }}
            submitLabel="Create Booking"
          />
        )}
      </div>
    </div>
  );
}
