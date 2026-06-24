// Role-based access. Each role maps to the set of module keys it may open, plus
// coarse action permissions. "*" means every module. The spec calls for reports
// and screens "according to privileges" for employees, managers, and owners.
import { MODULES } from "./modules";

export const ROLES = {
  owner: { label: "Owner", hint: "Full visibility incl. financials & P&L" },
  manager: { label: "Manager", hint: "Runs day-to-day operations & leasing" },
  accountant: { label: "Accountant", hint: "Finance, cheques, accounting, reports" },
  employee: { label: "Employee", hint: "Front-desk: contacts, leads, maintenance" },
};

const ALL = MODULES.map((m) => m.key);

// Module access per role.
export const ROLE_MODULES = {
  owner: ALL,
  manager: ALL,
  accountant: [
    "dashboard", "contacts", "towers", "contracts", "cheques",
    "receipts", "vouchers", "bills", "accounting", "banking", "assets",
    "reports", "notifications", "settings",
  ],
  employee: [
    "dashboard", "contacts", "leads", "towers", "contracts",
    "bookings", "maintenance", "cheques", "notifications",
  ],
};

// Action permissions, kept simple: who can see money, who can administer.
export const ROLE_CAPS = {
  owner: { viewFinancials: true, manageUsers: true, manageCompany: true, post: true },
  manager: { viewFinancials: true, manageUsers: true, manageCompany: false, post: true },
  accountant: { viewFinancials: true, manageUsers: false, manageCompany: false, post: true },
  employee: { viewFinancials: false, manageUsers: false, manageCompany: false, post: false },
};

export function canAccess(role, moduleKey) {
  const allowed = ROLE_MODULES[role] || ROLE_MODULES.employee;
  return allowed.includes(moduleKey);
}

export function caps(role) {
  return ROLE_CAPS[role] || ROLE_CAPS.employee;
}
