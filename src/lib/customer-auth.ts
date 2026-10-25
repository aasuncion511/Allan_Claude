import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { getCustomerSessionId } from "@/lib/customer-session";

export { hashPassword, verifyPassword };

/** The logged-in renter, if any — scoped to whichever org they registered with. */
export async function getCurrentCustomer() {
  const customerId = await getCustomerSessionId();
  if (!customerId) return null;
  return prisma.customer.findFirst({
    where: { id: customerId, passwordHash: { not: null } },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });
}

/** Requires a logged-in renter who belongs to this specific storefront. */
export async function requireCustomerForOrg(organizationId: string, slug: string) {
  const customer = await getCurrentCustomer();
  if (!customer || customer.organizationId !== organizationId) {
    redirect(`/r/${slug}/login`);
  }
  return customer;
}
