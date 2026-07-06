"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, hashPassword } from "@/lib/auth";

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

  await prisma.user.create({
    data: {
      organizationId: user.organizationId,
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "STAFF",
    },
  });

  revalidatePath("/settings/team");
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
