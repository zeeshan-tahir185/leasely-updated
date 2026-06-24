// Bank-side view. The prototype has no stored bank-account collection, so the
// company's own accounts live here and every balance + movement is derived from
// the receipts (money in) and payment vouchers (money out) that clear through a
// bank. Cash never touches the bank, so it's excluded. Reconciliation persists
// as a `reconciled` flag written back onto the source receipt / voucher.
import { byId } from "./domain";

export const BANK_ACCOUNTS = [
  { id: "ba-ww-op", companyId: "co-westwood", bank: "Emirates NBD", label: "Operating account", type: "Current", iban: "AE07 0331 ···· 4471", kind: "operating", opening: 180000 },
  { id: "ba-ww-dep", companyId: "co-westwood", bank: "Mashreq", label: "Tenant deposits", type: "Escrow", iban: "AE49 0210 ···· 9920", kind: "deposit", opening: 0 },
  { id: "ba-marina-op", companyId: "co-marina", bank: "ADCB", label: "Operating account", type: "Current", iban: "AE61 0030 ···· 3308", kind: "operating", opening: 95000 },
];

export const accountsForCompany = (companyId) => BANK_ACCOUNTS.filter((a) => a.companyId === companyId);

// Methods that settle through a bank account. Cash is petty-cash / counter.
const BANK_METHODS = new Set(["bank", "cheque"]);

// Security deposits are held in the escrow account (RERA keeps them separate);
// everything else runs through the operating account.
function routeAccount(accounts, { kind, against }) {
  if (kind === "in" && against === "deposit") {
    const escrow = accounts.find((a) => a.kind === "deposit");
    if (escrow) return escrow.id;
  }
  return (accounts.find((a) => a.kind === "operating") || accounts[0])?.id;
}

// One normalized, newest-first list of bank movements. Each carries its source
// entity + id so the page can toggle reconciliation on the underlying record.
export function bankMovements(s, companyId) {
  const accounts = accountsForCompany(companyId);
  const contacts = byId(s.contacts);
  const towers = byId(s.towers);
  const out = [];
  for (const r of s.receipts) {
    if (!BANK_METHODS.has(r.method)) continue;
    out.push({
      id: r.id, entity: "receipts", kind: "in", date: r.date, amount: r.amount,
      party: contacts[r.contactId]?.name || "—", ref: r.voucherNo, method: r.method,
      detail: r.against || "rent", towerId: r.towerId, tower: towers[r.towerId]?.name || "—",
      reconciled: !!r.reconciled, accountId: routeAccount(accounts, { kind: "in", against: r.against }),
    });
  }
  for (const v of s.vouchers) {
    if (!BANK_METHODS.has(v.method)) continue;
    out.push({
      id: v.id, entity: "vouchers", kind: "out", date: v.date, amount: v.amount,
      party: contacts[v.payeeId]?.name || "—", ref: v.voucherNo, method: v.method,
      detail: v.category, towerId: v.towerId, tower: towers[v.towerId]?.name || "—",
      reconciled: !!v.reconciled, accountId: routeAccount(accounts, { kind: "out" }),
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || (b.id > a.id ? 1 : -1));
}

// Per-account current balance (opening + cleared movements) and flow totals.
export function accountSummaries(s, companyId) {
  const moves = bankMovements(s, companyId);
  return accountsForCompany(companyId).map((account) => {
    const mine = moves.filter((m) => m.accountId === account.id);
    const inflow = mine.reduce((a, m) => a + (m.kind === "in" ? m.amount : 0), 0);
    const outflow = mine.reduce((a, m) => a + (m.kind === "out" ? m.amount : 0), 0);
    return {
      account, inflow, outflow, count: mine.length,
      balance: account.opening + inflow - outflow,
      unreconciled: mine.filter((m) => !m.reconciled).length,
      lastDate: mine[0]?.date || null,
    };
  });
}
