import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { requireCustomerForOrg } from "@/lib/customer-auth";
import { customerLogoutAction } from "../customer-actions";
import { StatusBadge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { ActiveHoldCard } from "./active-hold-card";

export default async function CustomerAccountPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org) notFound();

  const customer = await requireCustomerForOrg(org.id, slug);
  const bookings = await prisma.booking.findMany({
    where: { customerId: customer.id, organizationId: org.id },
    include: { vehicle: true },
    orderBy: { startDate: "desc" },
  });

  const logout = customerLogoutAction.bind(null, slug);
  const now = new Date();
  const activeHolds = bookings.filter((b) => b.status === "HOLD" && b.holdExpiresAt && b.holdExpiresAt > now);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Hi, {customer.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-ink-soft">{customer.email}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Sign out
          </button>
        </form>
      </div>

      {activeHolds.map((hold) => (
        <ActiveHoldCard
          key={hold.id}
          slug={slug}
          bookingId={hold.id}
          vehicleLabel={`${hold.vehicle.year} ${hold.vehicle.make} ${hold.vehicle.model}`}
          reservationFee={hold.reservationFeeDue ?? 0}
          serverNowUtc={now.toISOString()}
          expiresAtUtc={hold.holdExpiresAt!.toISOString()}
        />
      ))}

      <h2 className="mb-3 text-lg font-semibold text-ink">
        Your Bookings
      </h2>
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 text-ink">
                  {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(b.startDate)} – {formatDate(b.endDate)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatCurrency(b.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-soft">
                  No bookings yet.{" "}
                  <a href={`/r/${org.slug}/fleet`} className="text-brand hover:underline">
                    Browse our fleet
                  </a>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
