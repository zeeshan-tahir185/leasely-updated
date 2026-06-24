// Pure, company-scoped selectors over the database. Pages stay thin.
import { TODAY, parseISO, CUR_PERIOD, addMonthsKey, periodLabelShort, monthKey } from "./format";

export const byId = (arr) => Object.fromEntries((arr || []).map((x) => [x.id, x]));

// Collections that belong to the active company. Cross-company rows are dropped
// so every module only ever sees one company's data.
const COMPANY_COLLECTIONS = [
  "towers", "contacts", "contracts", "cheques", "receipts", "vouchers",
  "bills", "maintenance", "leads", "bookings", "cases", "assets", "meters",
  "employees", "payroll", "inventoryItems", "purchaseOrders", "documents", "users",
];

export function scopeData(db, companyId) {
  const out = {};
  for (const key of COMPANY_COLLECTIONS) {
    out[key] = (db[key] || []).filter((r) => !r.companyId || r.companyId === companyId);
  }
  // units & readings carry no companyId — scope them through their parent
  // (a unit belongs to whichever company owns its tower; a reading to its meter).
  const towerIds = new Set(out.towers.map((t) => t.id));
  out.units = (db.units || []).filter((u) => towerIds.has(u.towerId));
  const meterIds = new Set(out.meters.map((m) => m.id));
  out.readings = (db.readings || []).filter((r) => meterIds.has(r.meterId));
  out.settings = db.settings;
  return out;
}

export function indexAll(s) {
  return {
    towers: byId(s.towers),
    units: byId(s.units),
    contacts: byId(s.contacts),
    contracts: byId(s.contracts),
    employees: byId(s.employees),
  };
}

// ---- leasing ----------------------------------------------------------------
export function activeContracts(s) {
  return s.contracts.filter((c) => c.status === "active" || c.status === "expiring");
}

export function isExpiringSoon(contract, leadDays = 60) {
  if (contract.status === "expired" || contract.status === "terminated") return false;
  const end = parseISO(contract.endDate);
  const limit = new Date(TODAY);
  limit.setDate(limit.getDate() + leadDays);
  return end >= TODAY && end <= limit;
}

export function daysUntil(iso) {
  return Math.round((parseISO(iso) - TODAY) / 86400000);
}

// One row per unit with its current contract/tenant/status.
export function unitRows(s, towerId = null) {
  const ix = indexAll(s);
  const active = activeContracts(s);
  return s.units
    .filter((u) => !towerId || u.towerId === towerId)
    .map((unit) => {
      const contract = active.find((c) => c.unitId === unit.id);
      const tenant = contract ? ix.contacts[contract.tenantId] : null;
      return {
        unit,
        tower: ix.towers[unit.towerId],
        vacant: !contract,
        contract,
        tenant,
        status: contract ? (contract.status === "expiring" ? "expiring" : "leased") : "vacant",
      };
    });
}

export function occupancy(s) {
  const occupiedUnits = new Set(activeContracts(s).map((c) => c.unitId));
  const total = s.units.length;
  const occ = occupiedUnits.size;
  return { total, occupied: occ, vacant: total - occ, pct: total ? Math.round((occ / total) * 100) : 0 };
}

// ---- cheques ----------------------------------------------------------------
export function chequeDueSoon(cheque, withinDays = 7) {
  if (cheque.status !== "pending") return false;
  const d = daysUntil(cheque.dueDate);
  return d >= 0 && d <= withinDays;
}

export function chequeOverdue(cheque) {
  return cheque.status === "pending" && daysUntil(cheque.dueDate) < 0;
}

// ---- money / collections ----------------------------------------------------
export function moneyInPeriod(s, period = CUR_PERIOD) {
  return s.receipts.filter((r) => r.date.slice(0, 7) === period).reduce((a, r) => a + r.amount, 0);
}

export function expectedInPeriod(s, period = CUR_PERIOD) {
  return s.cheques.filter((c) => c.kind === "in" && c.dueDate.slice(0, 7) === period).reduce((a, c) => a + c.amount, 0);
}

export function collectionsByMonth(s, n = 6, towerId = null) {
  const periods = Array.from({ length: n }, (_, i) => addMonthsKey(CUR_PERIOD, -(n - 1 - i)));
  const map = Object.fromEntries(periods.map((p) => [p, { expected: 0, collected: 0 }]));
  for (const c of s.cheques) {
    if (c.kind !== "in") continue;
    if (towerId && c.towerId !== towerId) continue;
    const p = c.dueDate.slice(0, 7);
    if (map[p]) map[p].expected += c.amount;
  }
  for (const r of s.receipts) {
    if (towerId && r.towerId !== towerId) continue;
    const p = r.date.slice(0, 7);
    if (map[p]) map[p].collected += r.amount;
  }
  return periods.map((period) => ({
    period, label: periodLabelShort(period), isCurrent: period === CUR_PERIOD, ...map[period],
  }));
}

// Per-tower Profit & Loss (cash basis: receipts in, vouchers out).
export function towerFinancials(s) {
  const base = byId(s.towers);
  const rows = {};
  for (const t of s.towers) rows[t.id] = { tower: t, income: 0, expense: 0, byCategory: {} };
  for (const r of s.receipts) if (rows[r.towerId]) rows[r.towerId].income += r.amount;
  for (const v of s.vouchers) {
    const row = rows[v.towerId];
    if (!row) continue;
    row.expense += v.amount;
    row.byCategory[v.category] = (row.byCategory[v.category] || 0) + v.amount;
  }
  return Object.values(rows).map((r) => ({ ...r, net: r.income - r.expense, _tower: base[r.tower.id] }));
}

export function consolidatedPnl(s) {
  const income = s.receipts.reduce((a, r) => a + r.amount, 0);
  const expense = s.vouchers.reduce((a, v) => a + v.amount, 0);
  return { income, expense, net: income - expense };
}

// ---- dashboard summary ------------------------------------------------------
export function dashboardSummary(s) {
  const leadDays = s.settings?.renewalLeadDays ?? 60;
  const chequeDays = s.settings?.chequeAlertDays ?? 7;
  const occ = occupancy(s);
  const expected = expectedInPeriod(s);
  const collected = moneyInPeriod(s);
  const expiring = s.contracts.filter((c) => isExpiringSoon(c, leadDays));
  const chequesDue = s.cheques.filter((c) => chequeDueSoon(c, chequeDays));
  const chequesBounced = s.cheques.filter((c) => c.status === "bounced");
  const openMaintenance = s.maintenance.filter((m) => !["resolved", "closed"].includes(m.status));
  const pnl = consolidatedPnl(s);
  return {
    occupancy: occ,
    expectedThisMonth: expected,
    collectedThisMonth: collected,
    collectedPct: expected ? Math.round((collected / expected) * 100) : 0,
    activeContracts: activeContracts(s).length,
    expiringCount: expiring.length,
    chequesDueCount: chequesDue.length,
    chequesDueAmount: chequesDue.reduce((a, c) => a + c.amount, 0),
    bouncedCount: chequesBounced.length,
    openMaintenance: openMaintenance.length,
    monthlyRevenue: Math.round(activeContracts(s).reduce((a, c) => a + c.annualRent, 0) / 12),
    netPnl: pnl.net,
  };
}

// ---- contracts --------------------------------------------------------------
export function chequesOfContract(s, contractId) {
  return s.cheques.filter((c) => c.contractId === contractId).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function contractRows(s) {
  const ix = indexAll(s);
  return s.contracts.map((c) => {
    const cheques = s.cheques.filter((x) => x.contractId === c.id);
    const collected = cheques.filter((x) => x.status === "cleared").reduce((a, x) => a + x.amount, 0);
    const outstanding = cheques.filter((x) => !["cleared", "replaced"].includes(x.status)).reduce((a, x) => a + x.amount, 0);
    return {
      contract: c, tenant: ix.contacts[c.tenantId], unit: ix.units[c.unitId], tower: ix.towers[c.towerId],
      cheques, collected, outstanding,
    };
  });
}

// ---- accounting / P&L -------------------------------------------------------
// Cash-basis P&L over an optional date range: income from receipts (by what it
// was for), expenses from payment vouchers (by category), split per tower.
export function accountingPnl(s, { from = null, to = null, towerId = null } = {}) {
  const inRange = (iso) => (!from || iso >= from) && (!to || iso <= to);
  const matchTower = (tid) => !towerId || tid === towerId;
  const incomeByCat = {};
  const expenseByCat = {};
  let income = 0;
  let expense = 0;
  const towers = {};
  for (const t of s.towers) if (matchTower(t.id)) towers[t.id] = { tower: t, income: 0, expense: 0 };

  for (const r of s.receipts) {
    if (!inRange(r.date) || !matchTower(r.towerId)) continue;
    income += r.amount;
    const k = r.against || "other";
    incomeByCat[k] = (incomeByCat[k] || 0) + r.amount;
    if (towers[r.towerId]) towers[r.towerId].income += r.amount;
  }
  for (const v of s.vouchers) {
    if (!inRange(v.date) || !matchTower(v.towerId)) continue;
    expense += v.amount;
    expenseByCat[v.category] = (expenseByCat[v.category] || 0) + v.amount;
    if (towers[v.towerId]) towers[v.towerId].expense += v.amount;
  }
  const towerRows = Object.values(towers)
    .map((t) => ({ ...t, net: t.income - t.expense, margin: t.income ? Math.round(((t.income - t.expense) / t.income) * 100) : 0 }))
    .sort((a, b) => b.net - a.net);

  // Accrual context: money still owed to/by the company (or one tower).
  const receivable = s.cheques.filter((c) => c.kind === "in" && c.status === "pending" && matchTower(c.towerId)).reduce((a, c) => a + c.amount, 0);
  const payable = s.bills.filter((b) => b.status !== "paid" && matchTower(b.towerId)).reduce((a, b) => a + b.amount, 0);

  return { income, expense, net: income - expense, incomeByCat, expenseByCat, towerRows, receivable, payable };
}

export const monthKeyOf = (iso) => monthKey(parseISO(iso));
