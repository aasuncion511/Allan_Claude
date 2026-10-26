import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";

export default async function CustomersPage() {
  const { organizationId } = await requirePermission("customers");
  const customers = await prisma.customer.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: { _count: { select: { bookings: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${customers.length} customer${customers.length === 1 ? "" : "s"} in your CRM`}
        actions={
          <Link
            href="/customers/new"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            + Add Customer
          </Link>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Bookings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <Link
                    href={`/customers/${c.id}`}
                    className="font-medium text-ink hover:text-brand-dark"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink">{c.phone}</td>
                <td className="px-4 py-3 text-ink">{c.email ?? "—"}</td>
                <td className="px-4 py-3 text-ink">
                  {c._count.bookings}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-ink-soft"
                >
                  No customers yet.{" "}
                  <Link href="/customers/new" className="text-brand">
                    Add your first customer
                  </Link>
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
