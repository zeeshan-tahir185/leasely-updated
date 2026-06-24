// Single source of truth for the app's modules: drives the sidebar, routing,
// and role-based access. `key` doubles as the privilege key in rbac.js.
import {
  LayoutDashboard,
  Building2,
  Contact,
  Target,
  FileText,
  CalendarCheck,
  Banknote,
  ReceiptText,
  HandCoins,
  Files,
  Calculator,
  Landmark,
  Boxes,
  Wrench,
  Gauge,
  ShoppingCart,
  Scale,
  Archive,
  Briefcase,
  BarChart3,
  Bell,
  Settings,
} from "lucide-react";

// group order defines how the sidebar is sectioned
export const GROUPS = ["Workspace", "Leasing", "Finance", "Operations", "People", "Admin"];

export const MODULES = [
  { key: "dashboard", label: "Dashboard", path: "/", Icon: LayoutDashboard, group: "Workspace", end: true },
  { key: "contacts", label: "Contacts", path: "/contacts", Icon: Contact, group: "Workspace" },
  { key: "leads", label: "Leads & CRM", path: "/leads", Icon: Target, group: "Workspace" },
  { key: "towers", label: "Towers & Units", path: "/towers", Icon: Building2, group: "Workspace" },

  { key: "contracts", label: "Contracts", path: "/contracts", Icon: FileText, group: "Leasing" },
  { key: "bookings", label: "Bookings", path: "/bookings", Icon: CalendarCheck, group: "Leasing" },
  { key: "cheques", label: "Cheque Management", path: "/cheques", Icon: Banknote, group: "Leasing" },

  { key: "receipts", label: "Receipts", path: "/receipts", Icon: ReceiptText, group: "Finance" },
  { key: "vouchers", label: "Payment Vouchers", path: "/vouchers", Icon: HandCoins, group: "Finance" },
  { key: "bills", label: "Supplier Bills", path: "/bills", Icon: Files, group: "Finance" },
  { key: "accounting", label: "Accounting & P&L", path: "/accounting", Icon: Calculator, group: "Finance" },
  { key: "banking", label: "Banking", path: "/banking", Icon: Landmark, group: "Finance" },
  { key: "assets", label: "Fixed Assets", path: "/assets", Icon: Boxes, group: "Finance" },

  { key: "maintenance", label: "Maintenance", path: "/maintenance", Icon: Wrench, group: "Operations" },
  { key: "utilities", label: "Utility Meters", path: "/utilities", Icon: Gauge, group: "Operations" },
  { key: "inventory", label: "Purchasing & Inventory", path: "/inventory", Icon: ShoppingCart, group: "Operations" },
  { key: "cases", label: "Legal & Police", path: "/cases", Icon: Scale, group: "Operations" },
  { key: "documents", label: "Documents", path: "/documents", Icon: Archive, group: "Operations" },

  { key: "hr", label: "HR & Payroll", path: "/hr", Icon: Briefcase, group: "People" },

  { key: "reports", label: "Reports", path: "/reports", Icon: BarChart3, group: "Admin" },
  { key: "notifications", label: "Notifications", path: "/notifications", Icon: Bell, group: "Admin" },
  { key: "settings", label: "Settings", path: "/settings", Icon: Settings, group: "Admin" },
];

export const MODULE_BY_KEY = Object.fromEntries(MODULES.map((m) => [m.key, m]));
