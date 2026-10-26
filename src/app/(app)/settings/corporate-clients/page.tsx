import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import { createCorporateClient, toggleCorporateClientActive, regenerateAccessCode } from "./actions";

const field =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";
const label = "mb-1 block text-sm font-medium text-ink";

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

      <div className="mb-8 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Access Code</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {clients.map((c) => {
              const toggle = toggleCorporateClientActive.bind(null, c.id, !c.active);
              const regenerate = regenerateAccessCode.bind(null, c.id);
              return (
                <tr key={c.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {c.contactName}
                    {c.contactName && (c.contactEmail || c.contactPhone) ? " · " : ""}
                    {c.contactEmail}
                    {c.contactEmail && c.contactPhone ? " · " : ""}
                    {c.contactPhone}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-surface px-2 py-1 text-xs text-brand">{c.accessCode}</code>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium " +
                        (c.active ? "bg-success-surface text-brand" : "bg-canvas text-ink-soft")
                      }
                    >
                      {c.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    <div className="flex justify-end gap-3">
                      <form action={regenerate}>
                        <button className="font-medium text-sky-700 hover:underline">New Code</button>
                      </form>
                      <form action={toggle}>
                        <button className="font-medium text-warning-text hover:underline">
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
                <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">
                  No accredited clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form
        action={createCorporateClient}
        className="max-w-lg space-y-4 rounded-xl border border-line bg-surface p-6"
      >
        <h2 className="text-sm font-semibold text-ink">Add a Corporate Client</h2>
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
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Add Client
        </button>
      </form>
    </div>
  );
}
