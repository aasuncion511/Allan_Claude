import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";

export default async function CustomersPage() {
  const organizationId = await requireOrgId();
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
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            + Add Customer
          </Link>
        }
      />

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Bookings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/customers/${c.id}`}
                    className="font-medium text-slate-100 hover:text-emerald-400"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-300">{c.phone}</td>
                <td className="px-4 py-3 text-slate-300">{c.email ?? "—"}</td>
                <td className="px-4 py-3 text-slate-300">
                  {c._count.bookings}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No customers yet.{" "}
                  <Link href="/customers/new" className="text-emerald-400">
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
