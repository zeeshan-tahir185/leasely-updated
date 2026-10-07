// Derives the live alerts feed from company-scoped data: contract renewals,
// cheque clearance/replacement, bounced cheques, overdue bills, urgent
// maintenance, low stock. Pure — recomputed whenever the data changes.
import { byId, isExpiringSoon, chequeDueSoon, chequeOverdue, daysUntil } from "./domain";
import { fmtMoney, fmtDate } from "./format";
import { canAccess } from "./rbac";
import { moduleEnabled } from "./modules";

// Which module each alert type belongs to, so we never surface an alert for a
// screen the current role can't open (e.g. an employee has no Bills/Inventory).
const ALERT_MODULE = {
  renewal: "contracts",
  cheque: "cheques",
  bill: "bills",
  maintenance: "maintenance",
  inventory: "inventory",
  case: "cases",
};

export function buildAlerts(s, role = null) {
  const leadDays = s.settings?.renewalLeadDays ?? 60;
  const chequeDays = s.settings?.chequeAlertDays ?? 7;
  const units = byId(s.units);
  const contacts = byId(s.contacts);
  const towers = byId(s.towers);
  const out = [];

  // Contract renewals before end date
  for (const c of s.contracts) {
    if (!isExpiringSoon(c, leadDays)) continue;
    const tenant = contacts[c.tenantId];
    const unit = units[c.unitId];
    const d = daysUntil(c.endDate);
    out.push({
      id: `al-renew-${c.id}`,
      type: "renewal",
      severity: d <= 14 ? "critical" : "warning",
      title: `Contract expiring in ${d} day${d === 1 ? "" : "s"}`,
      body: `${tenant?.name || "Tenant"} · ${towers[c.towerId]?.name || ""} ${unit?.label || ""} ends ${fmtDate(c.endDate)}`,
      date: c.endDate,
      towerId: c.towerId,
      link: `/contracts?open=${c.id}`,
    });
  }

  // Cheques
  for (const ch of s.cheques) {
    const tenant = contacts[ch.contactId];
    if (ch.status === "bounced") {
      out.push({
        id: `al-bounce-${ch.id}`,
        type: "cheque",
        severity: "critical",
        title: "Cheque bounced — needs replacement",
        body: `${tenant?.name || "Payer"} · ${fmtMoney(ch.amount)} · Cheque #${ch.chequeNo} (${ch.bankName})`,
        date: ch.dueDate,
        towerId: ch.towerId,
        link: `/cheques?open=${ch.id}`,
      });
    } else if (chequeOverdue(ch)) {
      out.push({
        id: `al-chqover-${ch.id}`,
        type: "cheque",
        severity: "warning",
        title: "Cheque past due, not deposited",
        body: `${tenant?.name || "Payer"} · ${fmtMoney(ch.amount)} · was due ${fmtDate(ch.dueDate)}`,
        date: ch.dueDate,
        towerId: ch.towerId,
        link: `/cheques?open=${ch.id}`,
      });
    } else if (chequeDueSoon(ch, chequeDays)) {
      const d = daysUntil(ch.dueDate);
      out.push({
        id: `al-chqdue-${ch.id}`,
        type: "cheque",
        severity: "info",
        title: `Cheque to deposit in ${d} day${d === 1 ? "" : "s"}`,
        body: `${tenant?.name || "Payer"} · ${fmtMoney(ch.amount)} · ${ch.bankName}`,
        date: ch.dueDate,
        towerId: ch.towerId,
        link: `/cheques?open=${ch.id}`,
      });
    }
  }

  // Overdue supplier bills
  for (const b of s.bills) {
    if (b.status === "paid") continue;
    if (daysUntil(b.dueDate) < 0) {
      out.push({
        id: `al-bill-${b.id}`,
        type: "bill",
        severity: "warning",
        title: "Supplier bill overdue",
        body: `${contacts[b.supplierId]?.name || "Supplier"} · ${fmtMoney(b.amount)} · ${b.billNo}`,
        date: b.dueDate,
        towerId: b.towerId,
        link: "/bills",
      });
    }
  }

  // Urgent / new maintenance
  for (const m of s.maintenance) {
    if (["resolved", "closed"].includes(m.status)) continue;
    if (m.priority === "urgent" || m.status === "new") {
      out.push({
        id: `al-mt-${m.id}`,
        type: "maintenance",
        severity: m.priority === "urgent" ? "critical" : "info",
        title: m.priority === "urgent" ? "Urgent maintenance open" : "New maintenance request",
        body: `${m.title} · ${towers[m.towerId]?.name || ""} ${units[m.unitId]?.label || ""}`,
        date: m.createdAt,
        towerId: m.towerId,
        link: "/maintenance",
      });
    }
  }

  // Open legal / police cases
  for (const cs of s.cases || []) {
    if (["won", "lost", "closed"].includes(cs.status)) continue;
    out.push({
      id: `al-case-${cs.id}`,
      type: "case",
      severity: cs.status === "in_court" ? "warning" : "info",
      title: cs.type === "police" ? "Open police case" : "Open legal case",
      body: `${cs.title}${cs.refNo ? ` · ${cs.refNo}` : ""}`,
      date: cs.openedAt,
      towerId: cs.towerId,
      link: "/cases",
    });
  }

  // Low stock
  for (const it of s.inventoryItems) {
    if (it.qty <= it.reorderLevel) {
      out.push({
        id: `al-inv-${it.id}`,
        type: "inventory",
        severity: "info",
        title: "Inventory below reorder level",
        body: `${it.name} · ${it.qty} left (reorder at ${it.reorderLevel})`,
        date: null,
        link: "/inventory",
      });
    }
  }

  const sev = { critical: 0, warning: 1, info: 2 };
  // Only surface alerts for modules that are enabled for the company and that
  // this role can open. Combined with the tower-scoped `s`, an employee sees
  // alerts only for their assigned towers and only for accessible, enabled screens.
  const visible = out.filter((a) => {
    const mod = ALERT_MODULE[a.type];
    if (!mod) return true;
    if (!moduleEnabled(s.settings, mod)) return false;
    if (role && !canAccess(role, mod)) return false;
    return true;
  });
  return visible.sort((a, b) => sev[a.severity] - sev[b.severity] || String(a.date).localeCompare(String(b.date)));
}

export const alertCount = (s) => buildAlerts(s).length;
