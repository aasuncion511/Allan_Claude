import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { BookingForm } from "@/components/booking-form";
import { createBooking } from "../actions";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string }>;
}) {
  const { vehicleId } = await searchParams;
  const { organizationId } = await requirePermission("bookings");
  const [vehicles, customers, org] = await Promise.all([
    prisma.vehicle.findMany({ where: { organizationId }, orderBy: { plateNumber: "asc" } }),
    prisma.customer.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="New Booking"
        description="Schedule a unit for a customer"
      />
      <div className="rounded-xl border border-line bg-surface p-6">
        {vehicles.length === 0 || customers.length === 0 ? (
          <p className="text-sm text-ink-soft">
            You need at least one unit and one customer before creating a
            booking.
          </p>
        ) : (
          <BookingForm
            action={createBooking}
            vehicles={vehicles}
            customers={customers}
            defaults={{ vehicleId, securityDeposit: org.securityDepositAmount }}
            submitLabel="Create Booking"
          />
        )}
      </div>
    </div>
  );
}
