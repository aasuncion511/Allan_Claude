"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  const renderLink = (link: { href: string; label: string; icon: string; permKey?: PermissionKey }) => {
    const active = pathname === link.href || pathname.startsWith(link.href + "/");
    return (
      <Link
        key={link.href}
        href={link.href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-emerald-600/15 text-emerald-400"
            : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
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
    <aside className="flex h-screen w-60 flex-none flex-col border-r border-slate-800 bg-slate-950 text-slate-200">
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚗</span>
          <span className="font-semibold text-slate-50">Fleet Manager</span>
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{orgName}</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleLinks.map(renderLink)}
        {visibleSettingsLinks.length > 0 && (
          <div className="my-2 border-t border-slate-800" />
        )}
        {visibleSettingsLinks.map(renderLink)}
      </nav>
      <div className="border-t border-slate-800 px-4 py-4">
        <p className="mb-2 truncate text-xs text-slate-500">
          Signed in as <span className="text-slate-300">{userName}</span>
        </p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
