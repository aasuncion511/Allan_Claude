import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { getCurrentCustomer } from "@/lib/customer-auth";

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org) notFound();

  const customer = await getCurrentCustomer();
  const signedInHere = customer?.organizationId === org.id;

  return (
    <div className="flex min-h-screen flex-col bg-white text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href={`/r/${org.slug}`} className="flex items-center gap-2">
            <span className="text-2xl">🚗</span>
            <span className="text-lg font-bold">{org.name}</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 sm:flex">
            <Link href={`/r/${org.slug}`} className="hover:text-ink">
              Home
            </Link>
            <Link href={`/r/${org.slug}/fleet`} className="hover:text-ink">
              Our Fleet
            </Link>
            <Link href={`/r/${org.slug}/contact`} className="hover:text-ink">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {signedInHere ? (
              <Link
                href={`/r/${org.slug}/account`}
                className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                My Account
              </Link>
            ) : (
              <>
                <Link
                  href={`/r/${org.slug}/login`}
                  className="text-sm font-medium text-slate-600 hover:text-ink"
                >
                  Sign in
                </Link>
                <Link
                  href={`/r/${org.slug}/fleet`}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Book Now
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-lg font-bold">{org.name}</p>
              {org.tagline && (
                <p className="mt-1 text-sm text-ink-soft">{org.tagline}</p>
              )}
              <div className="mt-3 flex gap-3 text-sm text-ink-soft">
                {org.facebookUrl && (
                  <a href={org.facebookUrl} className="hover:text-ink">
                    Facebook
                  </a>
                )}
                {org.instagramUrl && (
                  <a href={org.instagramUrl} className="hover:text-ink">
                    Instagram
                  </a>
                )}
                {org.tiktokUrl && (
                  <a href={org.tiktokUrl} className="hover:text-ink">
                    TikTok
                  </a>
                )}
              </div>
            </div>
            <div className="text-sm text-ink-soft">
              <p className="mb-2 font-semibold text-ink">Contact</p>
              {org.contactPhone && <p>{org.contactPhone}</p>}
              {org.contactEmail && <p>{org.contactEmail}</p>}
              {org.address && <p>{org.address}</p>}
            </div>
            <div className="text-sm text-ink-soft">
              <p className="mb-2 font-semibold text-ink">Quick Links</p>
              <ul className="space-y-1">
                <li>
                  <Link href={`/r/${org.slug}/fleet`} className="hover:text-ink">
                    Our Fleet
                  </Link>
                </li>
                <li>
                  <Link href={`/r/${org.slug}/contact`} className="hover:text-ink">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-2 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
            <p>
              Powered by:{" "}
              <a
                href="https://portfolio.promdipreneur.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ink hover:underline"
              >
                https://portfolio.promdipreneur.com
              </a>
            </p>
            <p>
              © {new Date().getFullYear()} {org.name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
