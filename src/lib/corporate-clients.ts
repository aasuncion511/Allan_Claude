import crypto from "crypto";
import { prisma } from "@/lib/db";

/** Public-safe list for the storefront dropdown — names only, never the access code. */
export async function getActiveCorporateClients(organizationId: string) {
  return prisma.corporateClient.findMany({
    where: { organizationId, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** A short, easy-to-relay code (e.g. over phone/email) — not a security-grade secret, just an abuse gate. */
export function generateAccessCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}
