"use server";

import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export async function signBookingAction(token: string, formData: FormData) {
  const booking = await prisma.booking.findUnique({ where: { signatureToken: token } });
  if (!booking) notFound();

  const signedName = String(formData.get("signedName") ?? "").trim();
  const agreed = formData.get("agree") === "on";
  if (!booking.signedAt && signedName && agreed) {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await prisma.booking.update({
      where: { id: booking.id },
      data: { signedAt: new Date(), signedName, signedMethod: "ONLINE", signedIp: ip },
    });
  }

  redirect(`/sign/${token}`);
}
