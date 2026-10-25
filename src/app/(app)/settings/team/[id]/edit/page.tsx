import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { PermissionCheckboxes } from "@/components/permission-checkboxes";
import { updateTeammatePermissions } from "../../actions";
import type { PermissionMap } from "@/lib/permissions";

export default async function EditTeammatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (user.role !== "OWNER") notFound();

  const member = await prisma.user.findFirst({
    where: { id, organizationId: user.organizationId, role: "STAFF" },
  });
  if (!member) notFound();

  const action = updateTeammatePermissions.bind(null, member.id);

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Permissions for ${member.name}`} description={member.email} />
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <form action={action} className="space-y-6">
          <PermissionCheckboxes defaults={member.permissions as PermissionMap} />
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Save Permissions
          </button>
        </form>
      </div>
    </div>
  );
}
