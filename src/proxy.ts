import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Lets a client point their own domain (e.g. rentals.theirbrand.com) at this
 * app's storefront instead of the default /r/[slug] path. The client CNAMEs
 * their domain to us; once that custom domain is saved on their Organization
 * (Settings → Storefront), any request that arrives on that host gets
 * rewritten onto /r/[slug]/... transparently, so every existing storefront
 * route (home, fleet, booking, login, account, etc.) works unchanged.
 *
 * Requests on the platform's own domain(s) — set via NEXT_PUBLIC_APP_URL,
 * plus localhost and the Render *.onrender.com host — are left untouched so
 * the admin app and path-based /r/[slug] links keep working as-is.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never touch admin/API/internal routes or already-prefixed storefront
  // links — only bare requests on a custom domain need rewriting.
  if (
    pathname.startsWith("/r/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!host || isPlatformHost(host)) {
    return NextResponse.next();
  }

  const org = await prisma.organization.findUnique({
    where: { customDomain: host },
    select: { slug: true },
  });
  if (!org) {
    return NextResponse.next();
  }

  const rewritten = request.nextUrl.clone();
  rewritten.pathname = `/r/${org.slug}${pathname}`;
  return NextResponse.rewrite(rewritten);
}

function isPlatformHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".onrender.com")) return true;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      if (new URL(appUrl).hostname.toLowerCase() === host) return true;
    } catch {
      // malformed env value — fall through and treat host as a custom domain
    }
  }
  return false;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
