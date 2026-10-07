// Shared property/unit vocabulary, used by the add-property, import, and
// unit-edit flows.
export const PROJECT_TYPES = ["Building", "House"];
export const UNIT_TYPES = ["Studio", "1BHK", "2BHK", "3BHK", "4BHK", "Office", "Retail Shop"];

const UNIT_BEDS = { Studio: 0, "1BHK": 1, "2BHK": 2, "3BHK": 3, "4BHK": 4, Office: 0, "Retail Shop": 0 };
export const bedsForType = (t) => (t in UNIT_BEDS ? UNIT_BEDS[t] : 1);

// Banks that commonly issue tenancy cheques in the UAE.
export const UAE_BANKS = [
  "Emirates NBD", "ADCB", "Mashreq", "FAB", "DIB", "RAKBANK", "CBD",
  "Emirates Islamic", "ADIB", "HSBC", "Sharjah Islamic", "Other",
];

export const CHEQUE_STATUSES = ["pending", "deposited", "cleared", "bounced", "replaced"];
export const CONTRACT_TYPES = ["Residential", "Commercial"];

// Maintenance / work-order vocabulary. Statuses mirror the badges in StatusBadge;
// priorities drive sort order and the coloured priority chip.
export const MAINTENANCE_CATEGORIES = [
  "AC / Cooling", "Plumbing", "Electrical", "Carpentry",
  "Appliances", "Pest Control", "Cleaning", "General",
];
export const MAINTENANCE_PRIORITIES = ["urgent", "high", "medium", "low"];
export const MAINTENANCE_STATUSES = ["new", "assigned", "in_progress", "resolved", "closed"];

// Supplier bill vocabulary. Stored status is paid/unpaid; "overdue" is derived
// from the due date. Paying a bill books a payment voucher (money out).
export const BILL_CATEGORIES = ["maintenance", "cleaning", "utility", "security", "insurance", "management", "other"];
export const BILL_PAY_METHODS = [
  { key: "bank", label: "Bank transfer" },
  { key: "cheque", label: "Cheque" },
  { key: "cash", label: "Cash" },
];

// Purchasing & inventory: spare-parts categories and purchase-order statuses.
export const INVENTORY_CATEGORIES = ["HVAC", "Electrical", "Plumbing", "Carpentry", "Cleaning", "Safety", "General"];
export const PO_STATUSES = ["ordered", "received", "cancelled"];

// Legal & police cases — typically a bounced cheque (police) or rent recovery (legal/court).
export const CASE_TYPES = ["legal", "police"];
export const CASE_STATUSES = ["open", "in_court", "won", "lost", "closed"];

// Document archive (DMS) categories.
export const DOC_CATEGORIES = ["Contracts", "Company", "Towers", "Tenants", "Utilities", "Financial", "Maintenance", "Other"];

// HR — departments and the salary breakdown. Employees carry explicit allowance
// and deduction line items; legacy records with only a basic salary fall back to
// the old percentage model so nothing breaks.
export const DEPARTMENTS = ["Management", "Operations", "Leasing", "Finance", "Maintenance", "Administration"];
export const ALLOWANCE_RATE = 0.15;
export const DEDUCTION_RATE = 0.05;

// Common allowance / deduction labels offered as one-tap chips in the HR form.
export const ALLOWANCE_SUGGESTIONS = ["Housing", "Transport", "Bonus", "Phone", "Commission"];
export const DEDUCTION_SUGGESTIONS = ["Loan repayment", "Salary advance", "Absence", "Fine"];

const sumItems = (items) =>
  Array.isArray(items) ? items.reduce((a, x) => a + (Number(x.amount) || 0), 0) : 0;

// Compute an employee's monthly pay. Accepts an employee object (preferred) or a
// bare salary number (back-compat). Returns totals plus the itemised breakdown.
export function payrollLine(emp) {
  if (typeof emp === "number") emp = { salary: emp };
  const basic = Number(emp?.salary) || 0;
  const hasExplicit = Array.isArray(emp?.allowances) || Array.isArray(emp?.deductions);
  const allowanceItems = Array.isArray(emp?.allowances) ? emp.allowances : [];
  const deductionItems = Array.isArray(emp?.deductions) ? emp.deductions : [];
  const allowances = hasExplicit ? sumItems(allowanceItems) : Math.round(basic * ALLOWANCE_RATE);
  const deductions = hasExplicit ? sumItems(deductionItems) : Math.round(basic * DEDUCTION_RATE);
  return { basic, allowances, deductions, net: basic + allowances - deductions, allowanceItems, deductionItems };
}

// Default tenancy clauses, editable per contract. The printed contract falls
// back to these when a contract has no custom clauses set.
export const DEFAULT_CONTRACT_CLAUSES = [
  "The tenant shall pay the rent by the post-dated cheques listed above. A returned cheque entitles the landlord to pursue legal recovery under UAE law.",
  "The tenant shall maintain the premises in good condition and is liable for damage beyond fair wear and tear.",
  "Utility charges (DEWA, cooling) are borne by the tenant unless agreed otherwise in writing.",
  "Either party shall give 90 days' written notice prior to the end date to vary or terminate this contract, per RERA regulations.",
  "This contract is governed by the laws of the Emirate of Dubai and Law No. 26 of 2007 (as amended).",
];
