import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Landmark, Search, Download, ArrowDownLeft, ArrowUpRight, Printer,
  Wallet, ScrollText, CheckCheck, Building2,
} from "lucide-react";
import { useData } from "../data/store";
import { scopeData } from "../lib/domain";
import { bankMovements, accountSummaries, accountsForCompany } from "../lib/banking";
import { fmtDateLong } from "../lib/format";
import { PNL_PERIODS, pnlRange, pnlPeriodLabel } from "../lib/pnl";
import { downloadCsv } from "../lib/export";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import Drawer from "../components/Drawer";

const METHOD_LABEL = { bank: "Bank transfer", cheque: "Cheque" };
const DETAIL_LABEL = {
  rent: "Rent", deposit: "Security deposit", commission: "Commission", booking: "Booking",
  ejari: "Ejari fee", other: "Other", maintenance: "Maintenance", cleaning: "Cleaning",
  utility: "Utilities", security: "Security", insurance: "Insurance", management: "Management",
  salary: "Salaries", supplier: "Supplier", "owner-payout": "Owner payout", misc: "Other",
};
const detailLabel = (k) => DETAIL_LABEL[k] || k;

const RECON = [
  { key: "all", label: "All" },
  { key: "unreconciled", label: "Unreconciled" },
  { key: "reconciled", label: "Reconciled" },
];

export default function Banking() {
  const { db, companyId, update } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const accounts = useMemo(() => accountSummaries(s, companyId), [s, companyId]);
  const moves = useMemo(() => bankMovements(s, companyId), [s, companyId]);

  const [account, setAccount] = useState(null); // null = all accounts
  const [period, setPeriod] = useState("this-year");
  const [recon, setRecon] = useState("all");
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState(null);

  const range = pnlRange(period);
  const inRange = (iso) => (!range.from || iso >= range.from) && (!range.to || iso <= range.to);

  const filtered = moves.filter((m) => {
    if (account && m.accountId !== account) return false;
    if (!inRange(m.date)) return false;
    if (recon === "reconciled" && !m.reconciled) return false;
    if (recon === "unreconciled" && m.reconciled) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return m.party.toLowerCase().includes(q) || (m.ref || "").toLowerCase().includes(q) || detailLabel(m.detail).toLowerCase().includes(q);
  });

  const totalBalance = accounts.reduce((a, x) => a + x.balance, 0);
  const inflow = filtered.reduce((a, m) => a + (m.kind === "in" ? m.amount : 0), 0);
  const outflow = filtered.reduce((a, m) => a + (m.kind === "out" ? m.amount : 0), 0);
  const pendingRecon = filtered.filter((m) => !m.reconciled);
  const periodLabel = pnlPeriodLabel(period);
  const acctById = Object.fromEntries(accountsForCompany(companyId).map((a) => [a.id, a]));
  const openMove = openKey ? filtered.find((m) => `${m.entity}-${m.id}` === openKey) || moves.find((m) => `${m.entity}-${m.id}` === openKey) : null;

  function toggleRecon(m) {
    update(m.entity, m.id, { reconciled: !m.reconciled });
  }
  function reconcileAllVisible() {
    pendingRecon.forEach((m) => update(m.entity, m.id, { reconciled: true }));
  }
  function exportCsv() {
    const rows = filtered.map((m) => [
      m.date, m.kind === "in" ? "In" : "Out", m.party, detailLabel(m.detail),
      acctById[m.accountId]?.label || "", METHOD_LABEL[m.method] || m.method,
      m.reconciled ? "Reconciled" : "Unreconciled", m.kind === "in" ? m.amount : -m.amount,
    ]);
    downloadCsv(`bank-movements-${period}.csv`, ["Date", "Direction", "Party", "For", "Account", "Method", "Status", "Amount"], rows);
  }

  return (
    <div className="page">
      <PageHeader title="Banking" subtitle="Account balances, movements and statement reconciliation"
        actions={<button className="btn" onClick={exportCsv}><Download /> Export CSV</button>} />

      <div className="kpi-grid kpi-4">
        <StatCard label="Total bank balance" Icon={Wallet} tone="primary" value={<Money value={totalBalance} />} hint={`${accounts.length} account${accounts.length === 1 ? "" : "s"}`} />
        <StatCard label="Money in" Icon={ArrowDownLeft} tone="success" value={<Money value={inflow} />} hint={periodLabel.toLowerCase()} />
        <StatCard label="Money out" Icon={ArrowUpRight} tone="danger" value={<Money value={outflow} />} hint={periodLabel.toLowerCase()} />
        <StatCard label="Unreconciled" Icon={ScrollText} tone={pendingRecon.length ? "accent" : "neutral"} value={pendingRecon.length} hint={pendingRecon.length ? <Money value={pendingRecon.reduce((a, m) => a + m.amount, 0)} /> : "all matched"} />
      </div>

      <div className="acct-grid">
        {accounts.map(({ account: a, balance, count, unreconciled }) => {
          const selected = account === a.id;
          const select = () => setAccount(selected ? null : a.id);
          return (
            <div key={a.id} className={`acct-card${selected ? " is-sel" : ""}`} role="button" tabIndex={0}
              aria-pressed={selected} onClick={select}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); } }}>
              <div className="acct-card-top">
                <span className="acct-logo"><Landmark strokeWidth={1.8} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="acct-bank">{a.bank}</div>
                  <div className="acct-label">{a.label} · {a.type}</div>
                </div>
                <Link to={`/banking/${a.id}/print`} target="_blank" rel="noreferrer" className="icon-btn" title="Print statement" aria-label={`Print ${a.bank} statement`} onClick={(e) => e.stopPropagation()}><Printer /></Link>
              </div>
              <div>
                <div className="acct-balance"><Money value={balance} /></div>
                <div className="acct-iban" style={{ marginTop: 4 }}>{a.iban}</div>
              </div>
              <div className="acct-foot">
                <span className="t-muted" style={{ fontSize: "0.75rem" }}>{count} movement{count === 1 ? "" : "s"}</span>
                {unreconciled > 0
                  ? <span className="badge badge-accent">{unreconciled} to match</span>
                  : <span className="badge badge-paid"><CheckCheck strokeWidth={2.5} /> Reconciled</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="toolbar">
        <div className="search"><Search /><input className="input" placeholder="Search party, reference or type" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="spacer" />
        {pendingRecon.length > 0 && (
          <button className="btn btn-sm" onClick={reconcileAllVisible}><CheckCheck /> Reconcile {pendingRecon.length} shown</button>
        )}
        <div className="period-ctl">
          <Building2 className="period-ic" />
          <select className="select period-select" value={account || "all"} onChange={(e) => setAccount(e.target.value === "all" ? null : e.target.value)} aria-label="Account">
            <option value="all">All accounts</option>
            {accounts.map(({ account: a }) => <option key={a.id} value={a.id}>{a.bank} · {a.label}</option>)}
          </select>
        </div>
        <select className="select" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period" style={{ minWidth: 150 }}>
          {PNL_PERIODS.filter((p) => p.key !== "custom").map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <div className="seg">{RECON.map((r) => <button key={r.key} data-active={recon === r.key} onClick={() => setRecon(r.key)}>{r.label}</button>)}</div>
      </div>

      <section className="card card-table">
        <table className="table">
          <thead><tr><th>Date</th><th>Description</th><th>Account</th><th>Method</th><th>Statement</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={`${m.entity}-${m.id}`} className="row-click" onClick={() => setOpenKey(`${m.entity}-${m.id}`)}>
                <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{fmtDateLong(m.date)}</td>
                <td>
                  <div className="cell-tenant">
                    <span className={`dir-ic ${m.kind}`}>{m.kind === "in" ? <ArrowDownLeft strokeWidth={2.4} /> : <ArrowUpRight strokeWidth={2.4} />}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 560 }}>{m.party}</div>
                      <div className="list-sub">{detailLabel(m.detail)} · {m.ref}</div>
                    </div>
                  </div>
                </td>
                <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{acctById[m.accountId]?.bank}</td>
                <td className="t-muted">{METHOD_LABEL[m.method] || m.method}</td>
                <td>
                  <button type="button" className={`chip-toggle${m.reconciled ? " is-on" : ""}`} onClick={(e) => { e.stopPropagation(); toggleRecon(m); }}>
                    {m.reconciled ? "Reconciled" : "Mark matched"}
                  </button>
                </td>
                <td className="num">
                  <span className="tnum" style={{ fontWeight: 620, color: m.kind === "in" ? "var(--success-ink)" : "var(--ink)" }}>
                    {m.kind === "in" ? "+" : "−"}<Money value={m.amount} />
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6}><div className="empty"><Landmark /><p>No bank movements match these filters.</p></div></td></tr>}
          </tbody>
        </table>
      </section>

      {openMove && <MovementDrawer m={openMove} account={acctById[openMove.accountId]} onToggle={() => toggleRecon(openMove)} onClose={() => setOpenKey(null)} />}
    </div>
  );
}

function MovementDrawer({ m, account, onToggle, onClose }) {
  const printHref = m.entity === "receipts" ? `/receipts/${m.id}/print` : `/vouchers/${m.id}/print`;
  return (
    <Drawer open onClose={onClose} title={m.party} subtitle={`${m.kind === "in" ? "Money in" : "Money out"} · ${m.ref}`}
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <button className={`btn ${m.reconciled ? "" : "btn-primary"}`} type="button" onClick={onToggle}>
          <CheckCheck /> {m.reconciled ? "Unmatch" : "Mark reconciled"}
        </button>
      </>}>
      <div className="detail-list">
        <div className="detail-row"><span className="k">Amount</span>
          <span className="v" style={{ color: m.kind === "in" ? "var(--success-ink)" : "var(--ink)", fontWeight: 620 }}>{m.kind === "in" ? "+" : "−"}<Money value={m.amount} /></span></div>
        <div className="detail-row"><span className="k">Direction</span><span className="v">{m.kind === "in" ? "Credit (money in)" : "Debit (money out)"}</span></div>
        <div className="detail-row"><span className="k">For</span><span className="v">{detailLabel(m.detail)}</span></div>
        <div className="detail-row"><span className="k">Account</span><span className="v">{account ? `${account.bank} · ${account.label}` : "—"}</span></div>
        {account && <div className="detail-row"><span className="k">IBAN</span><span className="v tnum">{account.iban}</span></div>}
        <div className="detail-row"><span className="k">Method</span><span className="v">{METHOD_LABEL[m.method] || m.method}</span></div>
        <div className="detail-row"><span className="k">Tower</span><span className="v">{m.tower}</span></div>
        <div className="detail-row"><span className="k">Date</span><span className="v">{fmtDateLong(m.date)}</span></div>
        <div className="detail-row"><span className="k">Reference</span><span className="v">{m.ref}</span></div>
        <div className="detail-row"><span className="k">Statement</span><span className="v">{m.reconciled ? "Reconciled" : "Not yet matched"}</span></div>
      </div>
      <div className="sec-head" style={{ marginTop: 18 }}>
        <Link to={printHref} target="_blank" rel="noreferrer" className="btn btn-sm"><Printer /> {m.kind === "in" ? "View receipt" : "View voucher"}</Link>
      </div>
    </Drawer>
  );
}
