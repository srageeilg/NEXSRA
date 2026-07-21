import { SystemRole } from "@prisma/client";

// Canonical permission keys: "<module>.<action>"
export const PERMISSION_MODULES = [
  "business",
  "branches",
  "warehouses",
  "departments",
  "employees",
  "roles",
  "products",
  "categories",
  "brands",
  "suppliers",
  "customers",
  "inventory",
  "purchases",
  "sales",
  "pos",
  "invoices",
  "payments",
  "accounting",
  "expenses",
  "reports",
  "settings",
  "users",
  "audit",
] as const;

export const PERMISSION_ACTIONS = ["view", "create", "update", "delete", "approve", "export"] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export function permissionKey(module: PermissionModule, action: PermissionAction): string {
  return `${module}.${action}`;
}

export const ALL_PERMISSIONS: { key: string; module: string; action: string; label: string }[] =
  PERMISSION_MODULES.flatMap((module) =>
    PERMISSION_ACTIONS.map((action) => ({
      key: permissionKey(module, action),
      module,
      action,
      label: `${action[0].toUpperCase()}${action.slice(1)} ${module}`,
    })),
  );

// Default permission sets granted per system role at business creation time.
export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, string[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS.map((p) => p.key),
  BUSINESS_OWNER: ALL_PERMISSIONS.map((p) => p.key),
  MANAGER: ALL_PERMISSIONS.filter((p) => p.module !== "audit").map((p) => p.key),
  ACCOUNTANT: ALL_PERMISSIONS.filter((p) =>
    ["accounting", "expenses", "reports", "invoices", "payments", "customers", "suppliers"].includes(p.module),
  ).map((p) => p.key),
  WAREHOUSE_STAFF: ALL_PERMISSIONS.filter((p) =>
    ["inventory", "products", "warehouses", "purchases"].includes(p.module) &&
    ["view", "create", "update"].includes(p.action),
  ).map((p) => p.key),
  CASHIER: ALL_PERMISSIONS.filter((p) => ["pos", "sales", "invoices", "payments", "customers"].includes(p.module) && p.action !== "delete").map(
    (p) => p.key,
  ),
  EMPLOYEE: ALL_PERMISSIONS.filter((p) => p.action === "view").map((p) => p.key),
};

// SUPER_ADMIN / BUSINESS_OWNER always bypass granular permission checks.
export const UNRESTRICTED_ROLES: SystemRole[] = [SystemRole.SUPER_ADMIN, SystemRole.BUSINESS_OWNER];
