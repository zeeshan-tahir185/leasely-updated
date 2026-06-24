import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Download, Wallet, Building2, Banknote, CalendarClock, TrendingUp,
} from "lucide-react";
import { useData } from "../data/store";
import {
  scopeData, dashboardSummary, collectionsByMonth, accountingPnl,
  activeContracts, isExpiringSoon, daysUntil, indexAll,
} from "../lib/domain";
import { pnlRange } from "../lib/pnl";
import { fmtDateLong } from "../lib/format";
import { downloadCsv } from "../lib/export";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import CollectionsChart from "../components/charts/CollectionsChart";

const CHQ_STATUS = [
  { key: "cleared", label: "Cleared", color: "var(--success)" },
  { key: "pending", label: "Pending", color: "var(--warning)" },
  { key: "bounced", label: "Bounced", color: "var(--danger-ink)" },
  { key: "replaced", label: "Replaced", color: "var(--faint)" },
];
const AGE_BUCKETS = [
  { key: "upcoming", label: "Not yet due", color: "var(--accent)", test: (d) => d >= 0 },
  { key: "b30", label: "Overdue 1–30 days", color: "var(--warning)", test: (d) => d < 0 && d >= -30 },
  { key: "b60", label: "Overdue 31–60 days", color: "var(--danger)", test: (d) => d < -30 && d >= -60 },
  { key: "b90", label: "Overdue 60+ days", color: "var(--danger-ink)", test: (d) => d < -60 },
];
const pctOf = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export default function Reports() {
  const { db, companyId, company } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const ix = indexAll(s);
  const sum = useMemo(() => dashboardSummary(s), [s]);
  const months = useMemo(() => collectionsByMonth(s, 6), [s]);
  const pnl = useMemo(() => accountingPnl(s, pnlRange("this-year")), [s]);
  const leadDays = s.settings?.renewalLeadDays ?? 60;

  // Cheque status breakdown (incoming only)
  const chqRows = CHQ_STATUS.map((st) => {
    const list = s.cheques.filter((c) => c.kind === "in" && c.status === st.key);
    return { ...st, count: list.length, amount: list.reduce((a, c) => a + c.amount, 0) };
  });
  const chqMax = Math.max(1, ...chqRows.map((r) => r.amount));

  // Occupancy per tower
  const occRows = s.towers.map((t) => {
    const units = s.units.filter((u) => u.towerId === t.id).length;
    const leased = activeContracts(s).filter((c) => c.towerId === t.id).length;
    return { tower: t, units, leased, pct: pctOf(leased, units) };
  }).sort((a, b) => b.pct - a.pct);

  // Aged receivables from pending incoming cheques
  const pendingChq = s.cheques.filter((c) => c.kind === "in" && c.status === "pending");
  const ageRows = AGE_BUCKETS.map((b) => {
    const list = pendingChq.filter((c) => b.test(daysUntil(c.dueDate)));
    return { ...b, count: list.length, amount: list.reduce((a, c) => a + c.amount, 0) };
  });
  const ageTotal = Math.max(1, ageRows.reduce((a, r) => a + r.amount, 0));

  // Expiring contracts (renewals due)
  const expiring = s.contracts
    .filter((c) => isExpiringSoon(c, leadDays))
    .map((c) => ({ c, tenant: ix.contacts[c.tenantId], unit: ix.units[c.unitId], tower: ix.towers[c.towerId], days: daysUntil(c.endDate) }))
    .sort((a, b) => a.days - b.days);

  function exportExpiring() {
    const rows = expiring.map((e) => [e.tenant?.name || "", e.tower?.name || "", e.unit?.label || "", e.c.endDate, e.days, e.c.annualRent]);
    downloadCsv("expiring-contracts.csv", ["Tenant", "Tower", "Unit", "Ends", "Days left", "Annual rent"], rows);
  }
  function exportPnl() {
    const rows = pnl.towerRows.map((t) => [t.tower.name, t.income, t.expense, t.net, t.margin]);
    rows.push(["All towers", pnl.income, pnl.expense, pnl.net, pnl.income ? Math.round((pnl.net / pnl.income) * 100) : 0]);
    downloadCsv("pnl-by-tower.csv", ["Tower", "Income", "Expenses", "Net", "Margin %"], rows);
  }

  return (
    <div className="page">
      <PageHeader title="Reports" subtitle={`Portfolio reporting for ${company.name}: collections, occupancy, cheques and P&L`} />

      <div className="kpi-grid kpi-4">
        <StatCard label="Collection rate" Icon={Wallet} tone="success" value={`${sum.collectedPct}%`}
          hint={<><Money value={sum.collectedThisMonth} /> of <Money value={sum.expectedThisMonth} /></>} />
        <StatCard label="Occupancy" Icon={Building2} tone="primary" value={`${sum.occupancy.pct}%`}
          hint={`${sum.occupancy.occupied}/${sum.occupancy.total} units leased`} />
        <StatCard label="Net P&L · this year" Icon={TrendingUp} tone={pnl.net >= 0 ? "success" : "danger"} value={<Money value={pnl.net} />}
          hint={pnl.income ? `${Math.round((pnl.net / pnl.income) * 100)}% margin` : "—"} />
        <StatCard label="Receivable" Icon={Banknote} tone="accent" value={<Money value={pnl.receivable} />} hint="in pending cheques" />
      </div>

      <div className="dash-cols">
        <section className="card">
          <div className="panel-head">
            <div><h3 className="t-h3">Collections</h3><p className="t-muted">Expected vs collected, last 6 months</p></div>
            <Link to="/accounting" className="btn btn-ghost btn-sm">Accounting <ArrowRight /></Link>
          </div>
          <div className="panel-body"><CollectionsChart data={months} /></div>
        </section>

        <section className="card">
          <div className="panel-head">
            <div><h3 className="t-h3">Cheque status</h3><p className="t-muted">All incoming cheques by state</p></div>
            <Link to="/cheques" className="btn btn-ghost btn-sm">Cheques <ArrowRight /></Link>
          </div>
          <div className="panel-body">
            {chqRows.map((r) => (
              <div className="rep-row" key={r.key}>
                <span className="rep-key"><i className="dot" style={{ background: r.color }} />{r.label}</span>
                <span className="rep-bar"><i style={{ width: `${pctOf(r.amount, chqMax)}%`, background: r.color }} /></span>
                <span className="rep-cap"><strong className="tnum">{r.count}</strong> · <Money value={r.amount} /></span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="dash-cols-2" style={{ marginBottom: 18 }}>
        <section className="card">
          <div className="panel-head">
            <div><h3 className="t-h3">Occupancy by tower</h3><p className="t-muted">Leased units of total</p></div>
            <Link to="/towers" className="btn btn-ghost btn-sm">Towers <ArrowRight /></Link>
          </div>
          <div className="panel-body">
            {occRows.map(({ tower, units, leased, pct }) => (
              <div className="rep-row" key={tower.id}>
                <span className="rep-key" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{tower.name}</span>
                <span className="rep-bar"><i style={{ width: `${pct}%` }} /></span>
                <span className="rep-cap"><strong className="tnum">{leased}/{units}</strong> · {pct}%</span>
              </div>
            ))}
            {occRows.length === 0 && <div className="empty"><p>No towers yet.</p></div>}
          </div>
        </section>

        <section className="card">
          <div className="panel-head">
            <div><h3 className="t-h3">Aged receivables</h3><p className="t-muted">Pending cheques by age</p></div>
            <Link to="/cheques" className="btn btn-ghost btn-sm">Cheques <ArrowRight /></Link>
          </div>
          <div className="panel-body">
            {ageRows.map((r) => (
              <div className="rep-row" key={r.key}>
                <span className="rep-key"><i className="dot" style={{ background: r.color }} />{r.label}</span>
                <span className="rep-bar"><i style={{ width: `${pctOf(r.amount, ageTotal)}%`, background: r.color }} /></span>
                <span className="rep-cap"><strong className="tnum">{r.count}</strong> · <Money value={r.amount} /></span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
        <div className="panel-head">
          <div><h3 className="t-h3">Contracts expiring</h3><p className="t-muted">Renewals due within {leadDays} days</p></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sm" onClick={exportExpiring} disabled={!expiring.length}><Download /> Export</button>
            <Link to="/contracts" className="btn btn-ghost btn-sm">Contracts <ArrowRight /></Link>
          </div>
        </div>
        <table className="table">
          <thead><tr><th>Tenant</th><th>Tower</th><th>Unit</th><th>Ends</th><th>Renewal</th><th className="num">Annual rent</th></tr></thead>
          <tbody>
            {expiring.map(({ c, tenant, unit, tower, days }) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}><Link to={`/contracts?open=${c.id}`} className="cell-link">{tenant?.name || "—"}</Link></td>
                <td className="t-muted">{tower?.name || "—"}</td>
                <td className="t-muted">{unit?.label || "—"}</td>
                <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{fmtDateLong(c.endDate)}</td>
                <td><span className={`badge ${days <= 14 ? "badge-overdue" : "badge-due"}`}><CalendarClock strokeWidth={2.4} /> in {days} day{days === 1 ? "" : "s"}</span></td>
                <td className="num"><Money value={c.annualRent} /></td>
              </tr>
            ))}
            {expiring.length === 0 && <tr><td colSpan={6}><div className="empty"><CalendarClock /><p>No contracts expiring in the next {leadDays} days.</p></div></td></tr>}
          </tbody>
        </table>
      </section>

      <section className="card" style={{ overflow: "hidden" }}>
        <div className="panel-head">
          <div><h3 className="t-h3">P&amp;L by tower</h3><p className="t-muted">Cash basis, this year</p></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sm" onClick={exportPnl}><Download /> Export</button>
            <Link to="/accounting" className="btn btn-ghost btn-sm">Accounting <ArrowRight /></Link>
          </div>
        </div>
        <table className="table">
          <thead><tr><th>Tower</th><th className="num">Income</th><th className="num">Expenses</th><th className="num">Net</th><th className="num">Margin</th></tr></thead>
          <tbody>
            {pnl.towerRows.map((t) => (
              <tr key={t.tower.id}>
                <td style={{ fontWeight: 600 }}><Link to={`/accounting?tower=${t.tower.id}`} className="cell-link">{t.tower.name}</Link></td>
                <td className="num"><Money value={t.income} /></td>
                <td className="num"><Money value={t.expense} /></td>
                <td className="num" style={{ fontWeight: 600, color: t.net >= 0 ? "var(--success-ink)" : "var(--danger-ink)" }}><Money value={t.net} /></td>
                <td className="num tnum">{t.income ? `${t.margin}%` : "—"}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid var(--border-strong)" }}>
              <td style={{ fontWeight: 700 }}>All towers</td>
              <td className="num"><Money value={pnl.income} /></td>
              <td className="num"><Money value={pnl.expense} /></td>
              <td className="num" style={{ fontWeight: 700, color: pnl.net >= 0 ? "var(--success-ink)" : "var(--danger-ink)" }}><Money value={pnl.net} /></td>
              <td className="num tnum">{pnl.income ? `${Math.round((pnl.net / pnl.income) * 100)}%` : "—"}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
