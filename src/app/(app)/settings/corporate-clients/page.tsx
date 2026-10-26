import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import { createCorporateClient, toggleCorporateClientActive, regenerateAccessCode } from "./actions";

const field =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-500";
const label = "mb-1 block text-sm font-medium text-slate-300";

export default async function CorporateClientsPage() {
  const { organizationId } = await requirePermission("storefrontSettings");
  const clients = await prisma.corporateClient.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Corporate Clients"
        description="Accredited companies that can book online with no payment — billed separately. Share each one's access code with them directly; it's required to book."
      />

      <div className="mb-8 overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Access Code</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {clients.map((c) => {
              const toggle = toggleCorporateClientActive.bind(null, c.id, !c.active);
              const regenerate = regenerateAccessCode.bind(null, c.id);
              return (
                <tr key={c.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-slate-100">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {c.contactName}
                    {c.contactName && (c.contactEmail || c.contactPhone) ? " · " : ""}
                    {c.contactEmail}
                    {c.contactEmail && c.contactPhone ? " · " : ""}
                    {c.contactPhone}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-slate-800 px-2 py-1 text-xs text-emerald-400">{c.accessCode}</code>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium " +
                        (c.active ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-500/15 text-slate-400")
                      }
                    >
                      {c.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    <div className="flex justify-end gap-3">
                      <form action={regenerate}>
                        <button className="font-medium text-sky-400 hover:underline">New Code</button>
                      </form>
                      <form action={toggle}>
                        <button className="font-medium text-amber-400 hover:underline">
                          {c.active ? "Disable" : "Enable"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No accredited clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form
        action={createCorporateClient}
        className="max-w-lg space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6"
      >
        <h2 className="text-sm font-semibold text-slate-100">Add a Corporate Client</h2>
        <div>
          <label className={label}>Company Name</label>
          <input name="name" required className={field} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Contact Name</label>
            <input name="contactName" className={field} />
          </div>
          <div>
            <label className={label}>Contact Email</label>
            <input name="contactEmail" type="email" className={field} />
          </div>
          <div>
            <label className={label}>Contact Phone</label>
            <input name="contactPhone" type="tel" className={field} />
          </div>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Add Client
        </button>
      </form>
    </div>
  );
}
