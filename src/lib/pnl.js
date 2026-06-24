// Shared P&L period presets + range resolution, used by the Accounting page and
// the printable P&L statement so both interpret a timeframe identically.
import { isoOf } from "./format";

export const PNL_PERIODS = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "last-3-months", label: "Last 3 months" },
  { key: "this-year", label: "This year" },
  { key: "last-year", label: "Last year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom range…" },
];

export function pnlRange(period, custom = {}) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const eom = (yy, mm) => isoOf(new Date(yy, mm + 1, 0)); // last day of month mm
  switch (period) {
    case "this-month": return { from: isoOf(new Date(y, m, 1)), to: eom(y, m) };
    case "last-month": return { from: isoOf(new Date(y, m - 1, 1)), to: eom(y, m - 1) };
    case "last-3-months": return { from: isoOf(new Date(y, m - 2, 1)), to: eom(y, m) };
    case "this-year": return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "last-year": return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case "custom": return { from: custom.from || null, to: custom.to || null };
    default: return { from: null, to: null };
  }
}

export const pnlPeriodLabel = (key) => PNL_PERIODS.find((p) => p.key === key)?.label || key;

export const INCOME_LABEL = { rent: "Rent", deposit: "Security deposits", commission: "Commission", booking: "Booking amounts", ejari: "Ejari fees", other: "Other income" };
export const EXPENSE_LABEL = { maintenance: "Maintenance", cleaning: "Cleaning", utility: "Utilities", salary: "Salaries", supplier: "Supplier payments", "owner-payout": "Owner payouts", commission: "Commission", misc: "Other expenses" };
