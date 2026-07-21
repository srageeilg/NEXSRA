import {
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  Users,
  ShoppingCart,
  FileText,
  Wallet,
  Receipt,
  Warehouse,
  UserCog,
  BarChart3,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: Package },
      { label: "Inventory", href: "/inventory", icon: Boxes },
      { label: "Warehouses", href: "/warehouses", icon: Warehouse },
    ],
  },
  {
    title: "Trading",
    items: [
      { label: "Sales / POS", href: "/sales", icon: ShoppingCart },
      { label: "Purchases", href: "/purchases", icon: Truck },
      { label: "Invoices", href: "/invoices", icon: FileText },
    ],
  },
  {
    title: "Relationships",
    items: [
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Suppliers", href: "/suppliers", icon: Truck },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Accounting", href: "/accounting", icon: Wallet },
      { label: "Expenses", href: "/expenses", icon: Receipt },
    ],
  },
  {
    title: "Organization",
    items: [
      { label: "Employees", href: "/employees", icon: UserCog },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Admin", href: "/admin", icon: ShieldCheck },
    ],
  },
];
