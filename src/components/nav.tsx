"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/login/actions";
import type { PermissionKey } from "@/lib/permissions";

const LINKS: { href: string; label: string; icon: string; permKey: PermissionKey }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", permKey: "dashboard" },
  { href: "/fleet", label: "Fleet", icon: "🚗", permKey: "fleet" },
  { href: "/bookings", label: "Bookings", icon: "📅", permKey: "bookings" },
  { href: "/customers", label: "Customers", icon: "👥", permKey: "customers" },
  { href: "/expenses", label: "Expenses", icon: "🧾", permKey: "expenses" },
  { href: "/maintenance", label: "Maintenance", icon: "🔧", permKey: "maintenance" },
];

const SETTINGS_LINKS = [
  { href: "/settings/team", label: "Team", icon: "🧑‍🤝‍🧑" },
  { href: "/settings/billing", label: "Billing", icon: "💳" },
  { href: "/settings/storefront", label: "Storefront", icon: "🌐", permKey: "storefrontSettings" as PermissionKey },
  {
    href: "/settings/corporate-clients",
    label: "Corporate Clients",
    icon: "🏢",
    permKey: "storefrontSettings" as PermissionKey,
  },
];

export function Nav({
  userName,
  orgName,
  permissions,
}: {
  userName: string;
  orgName: string;
  permissions: Record<PermissionKey, boolean>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const renderLink = (link: { href: string; label: string; icon: string; permKey?: PermissionKey }) => {
    const active = pathname === link.href || pathname.startsWith(link.href + "/");
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-nav-active text-brand-deep"
            : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span>{link.icon}</span>
        {link.label}
      </Link>
    );
  };

  const visibleLinks = LINKS.filter((l) => permissions[l.permKey]);
  const visibleSettingsLinks = SETTINGS_LINKS.filter(
    (l) => !l.permKey || permissions[l.permKey]
  );

  return (
    <>
      <div className="flex items-center justify-between bg-brand-deep px-4 py-3 text-white md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-sm">
            🚗
          </span>
          <span className="text-sm font-semibold">Fleet Manager</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-white/80 hover:bg-white/10"
        >
          ☰
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-none flex-col bg-brand-deep text-white transition-transform duration-200 md:static md:z-auto md:w-60 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base">
                🚗
              </span>
              <span className="font-semibold text-white">Fleet Manager</span>
            </div>
            <p className="mt-1 truncate text-xs text-white/50">{orgName}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 md:hidden"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleLinks.map(renderLink)}
          {visibleSettingsLinks.length > 0 && (
            <div className="my-2 border-t border-white/10" />
          )}
          {visibleSettingsLinks.map(renderLink)}
        </nav>
        <div className="border-t border-white/10 px-4 py-4">
          <p className="mb-2 truncate text-xs text-white/50">
            Signed in as <span className="text-white/80">{userName}</span>
          </p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
