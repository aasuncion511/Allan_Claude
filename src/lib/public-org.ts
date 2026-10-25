import { cache } from "react";
import { prisma } from "@/lib/db";

const PUBLIC_ORG_SELECT = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  aboutText: true,
  logoUrl: true,
  heroImageUrl: true,
  contactPhone: true,
  contactEmail: true,
  address: true,
  facebookUrl: true,
  instagramUrl: true,
  tiktokUrl: true,
  requirementsText: true,
  reservationFeeAmount: true,
} as const;

export type PublicOrg = NonNullable<
  Awaited<ReturnType<typeof getPublicOrgBySlug>>
>;

/** Storefront-safe organization lookup — never selects secret/billing fields. */
export const getPublicOrgBySlug = cache(async (slug: string) => {
  return prisma.organization.findUnique({
    where: { slug },
    select: PUBLIC_ORG_SELECT,
  });
});
