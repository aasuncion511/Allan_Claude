import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";

const STATUS_COLOR: Record<string, string> = {
  HOLD: "bg-amber-200 text-amber-900 border border-dashed border-amber-500",
  RESERVED: "bg-sky-200 text-sky-900",
  ACTIVE: "bg-success-surface text-success-text",
  COMPLETED: "bg-canvas text-ink-soft border border-line",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function FleetCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { organizationId } = await requirePermission("bookings");
  const { year: yearParam, month: monthParam } = await searchParams;

  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1; // 1-12

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1); // exclusive, first day of next month
  const daysInMonth = new Date(year, month, 0).getDate();

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  const [vehicles, bookings] = await Promise.all([
    prisma.vehicle.findMany({ where: { organizationId }, orderBy: { plateNumber: "asc" } }),
    prisma.booking.findMany({
      where: {
        organizationId,
        status: { not: "CANCELLED" },
        startDate: { lt: monthEnd },
        endDate: { gt: monthStart },
      },
      include: { customer: true },
    }),
  ]);

  const bookingsByVehicle = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const list = bookingsByVehicle.get(b.vehicleId) ?? [];
    list.push(b);
    bookingsByVehicle.set(b.vehicleId, list);
  }

  // Day-of-month (1-based) within the visible grid, clipped to [1, daysInMonth+1]
  // for spans that start before or end after this month.
  function dayOfMonth(date: Date): number {
    if (date < monthStart) return 1;
    if (date >= monthEnd) return daysInMonth + 1;
    return date.getDate();
  }

  return (
    <div>
      <PageHeader
        title="Fleet Calendar"
        description="Every unit's holds, reservations, and active rentals at a glance."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/bookings/calendar?year=${prevMonth.year}&month=${prevMonth.month}`}
              className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas"
            >
              ← Prev
            </Link>
            <span className="px-2 text-sm font-semibold text-ink">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <Link
              href={`/bookings/calendar?year=${nextMonth.year}&month=${nextMonth.month}`}
              className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas"
            >
              Next →
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-4 text-xs text-ink-soft">
        {Object.entries(STATUS_COLOR).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded ${cls}`} />
            {status === "HOLD" ? "Free hold (unpaid)" : status.charAt(0) + status.slice(1).toLowerCase()}
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <div className="min-w-[900px]">
          {/* Day header row */}
          <div className="flex border-b border-line bg-canvas text-xs text-ink-soft">
            <div className="w-40 flex-none px-3 py-2 font-semibold uppercase tracking-wide">Unit</div>
            <div
              className="grid flex-1"
              style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(24px, 1fr))` }}
            >
              {Array.from({ length: daysInMonth }, (_, i) => (
                <div key={i} className="border-l border-line/50 py-2 text-center">
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle rows */}
          {vehicles.map((v) => {
            const vehicleBookings = bookingsByVehicle.get(v.id) ?? [];
            return (
              <div key={v.id} className="flex border-b border-line last:border-b-0">
                <div className="w-40 flex-none truncate px-3 py-3 text-sm text-ink">
                  <p className="truncate font-medium">{v.plateNumber}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {v.year} {v.make} {v.model}
                  </p>
                </div>
                <div
                  className="relative grid flex-1"
                  style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(24px, 1fr))`, minHeight: "3rem" }}
                >
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <div key={i} className="border-l border-line/30" />
                  ))}
                  {vehicleBookings.map((b) => {
                    const startCol = dayOfMonth(b.startDate);
                    const endCol = dayOfMonth(b.endDate);
                    return (
                      <Link
                        key={b.id}
                        href={`/bookings/${b.id}/edit`}
                        className={`absolute top-1.5 flex items-center overflow-hidden rounded px-1.5 text-[11px] font-medium ${STATUS_COLOR[b.status] ?? "bg-canvas text-ink-soft"}`}
                        style={{
                          left: `calc(${((startCol - 1) / daysInMonth) * 100}% + 2px)`,
                          width: `calc(${((endCol - startCol) / daysInMonth) * 100}% - 4px)`,
                          height: "2.25rem",
                        }}
                        title={`${b.customer.name} — ${b.status}`}
                      >
                        <span className="truncate">{b.customer.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {vehicles.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-ink-soft">No vehicles yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
