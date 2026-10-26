import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { requireCustomerForOrg } from "@/lib/customer-auth";
import { customerLogoutAction } from "../customer-actions";
import { StatusBadge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { ConvertHoldButton } from "../confirmed/convert-hold-button";

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

      {activeHolds.map((hold) => {
        const balance = Math.max(0, org.reservationFeeAmount - hold.amountPaid);
        return (
          <div key={hold.id} className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-5">
            <p className="font-semibold text-ink">
              {hold.vehicle.year} {hold.vehicle.make} {hold.vehicle.model} is held until{" "}
              {hold.holdExpiresAt!.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Confirm now to lock it in — your {formatCurrency(hold.amountPaid)} hold fee is credited toward the total.
            </p>
            {balance > 0 && <ConvertHoldButton slug={slug} bookingId={hold.id} balance={balance} />}
          </div>
        );
      })}

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
