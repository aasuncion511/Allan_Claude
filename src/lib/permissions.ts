export const PERMISSION_KEYS = [
  "dashboard",
  "fleet",
  "bookings",
  "customers",
  "expenses",
  "maintenance",
  "storefrontSettings",
  "refunds",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  dashboard: "Dashboard (revenue & reports)",
  fleet: "Fleet (units, fuel)",
  bookings: "Bookings",
  customers: "Customers (CRM)",
  expenses: "Expenses",
  maintenance: "Maintenance",
  storefrontSettings: "Storefront & integrations",
  refunds: "Refunds (policy exceptions)",
};

export type PermissionMap = Partial<Record<PermissionKey, boolean>>;

/** Sensible starting permissions for a newly invited staff member. */
export const DEFAULT_STAFF_PERMISSIONS: PermissionMap = {
  dashboard: false,
  fleet: true,
  bookings: true,
  customers: true,
  expenses: false,
  maintenance: true,
  storefrontSettings: false,
  refunds: false,
};

type PermissionedUser = {
  role: "OWNER" | "STAFF";
  permissions: unknown;
};

export function hasPermission(user: PermissionedUser, key: PermissionKey): boolean {
  if (user.role === "OWNER") return true;
  const perms = (user.permissions ?? {}) as PermissionMap;
  return perms[key] === true;
}

const ROUTE_BY_PERMISSION: Record<PermissionKey, string> = {
  dashboard: "/dashboard",
  fleet: "/fleet",
  bookings: "/bookings",
  customers: "/customers",
  expenses: "/expenses",
  maintenance: "/maintenance",
  storefrontSettings: "/settings/storefront",
  refunds: "/bookings/refunds",
};

/** Where to land a user right after login — the first module they can actually open. */
export function firstAccessibleRoute(user: PermissionedUser): string {
  for (const key of PERMISSION_KEYS) {
    if (hasPermission(user, key)) return ROUTE_BY_PERMISSION[key];
  }
  return "/settings/team";
}

export function parsePermissionsFromForm(formData: FormData): PermissionMap {
  const map: PermissionMap = {};
  for (const key of PERMISSION_KEYS) {
    map[key] = formData.get(`perm_${key}`) === "on";
  }
  return map;
}
