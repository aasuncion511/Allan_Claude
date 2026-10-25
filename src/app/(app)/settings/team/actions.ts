"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";
import { parsePermissionsFromForm } from "@/lib/permissions";

export type InviteState = { error?: string } | undefined;

export async function inviteTeammate(
  _prevState: InviteState,
  formData: FormData
): Promise<InviteState> {
  const user = await requireUser();
  if (user.role !== "OWNER") {
    return { error: "Only the account owner can add teammates." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Name, email, and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "A user with this email already exists." };
  }

  const permissions = parsePermissionsFromForm(formData);

  await prisma.user.create({
    data: {
      organizationId: user.organizationId,
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "STAFF",
      permissions,
    },
  });

  revalidatePath("/settings/team");
}

export async function updateTeammatePermissions(memberId: string, formData: FormData) {
  const user = await requireUser();
  if (user.role !== "OWNER") notFound();

  const permissions = parsePermissionsFromForm(formData);
  await prisma.user.updateMany({
    where: { id: memberId, organizationId: user.organizationId, role: "STAFF" },
    data: { permissions },
  });
  revalidatePath("/settings/team");
  redirect("/settings/team");
}

export async function removeTeammate(memberId: string) {
  const user = await requireUser();
  if (user.role !== "OWNER") notFound();
  if (memberId === user.id) notFound();

  await prisma.user.deleteMany({
    where: { id: memberId, organizationId: user.organizationId, role: "STAFF" },
  });
  revalidatePath("/settings/team");
  redirect("/settings/team");
}
