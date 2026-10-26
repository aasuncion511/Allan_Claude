import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { getCustomerSessionId } from "@/lib/customer-session";

export { hashPassword, verifyPassword };

/**
 * The renter tied to this browser's session cookie, if any. A customer can
 * be recognized this way whether or not they've ever set a password — the
 * signed cookie (set the moment they give their contact details to book) is
 * proof enough for this device. A password is only needed to sign in from a
 * different device later.
 */
export async function getCurrentCustomer() {
  const customerId = await getCustomerSessionId();
  if (!customerId) return null;
  return prisma.customer.findFirst({
    where: { id: customerId },
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
