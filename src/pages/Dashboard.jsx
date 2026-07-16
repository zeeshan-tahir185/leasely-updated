import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Building2, Wallet, Banknote, CalendarClock, Wrench, TrendingUp,
  ArrowRight, Lock, AlertTriangle, Info, ShieldAlert,
} from "lucide-react";
import { useData } from "../data/store";
import {
  scopeData, dashboardSummary, collectionsByMonth, towerFinancials, activeContracts,
} from "../lib/domain";
import { buildAlerts } from "../lib/alerts";
import { fmtMoney, fmtMoneyShort } from "../lib/format";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import CollectionsChart from "../components/charts/CollectionsChart";

const SEV_ICON = { critical: ShieldAlert, warning: AlertTriangle, info: Info };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { db, companyId, company, user, can } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const sum = useMemo(() => dashboardSummary(s), [s]);
  const months = useMemo(() => collectionsByMonth(s, 6), [s]);
  const alerts = useMemo(() => buildAlerts(s), [s]);
  const fin = useMemo(() => towerFinancials(s), [s]);
  const money = (n) => (can.viewFinancials ? fmtMoney(n) : "•••");

  const perTower = s.towers.map((t) => {
    const units = s.units.filter((u) => u.towerId === t.id);
    const leased = activeContracts(s).filter((c) => c.towerId === t.id).length;
    const f = fin.find((x) => x.tower.id === t.id) || { net: 0, income: 0 };
    return { tower: t, units: units.length, leased, net: f.net, income: f.income };
  });

  return (
    <div className="page">
      <PageHeader
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        subtitle={`Here's where ${company.name} stands today.`}
      />

      <div className="kpi-grid kpi-6">
        <StatCard label="Occupancy" Icon={Building2} tone="primary"
          value={`${sum.occupancy.pct}%`}
          hint={`${sum.occupancy.occupied}/${sum.occupancy.total} units leased`} />
        <StatCard label="Collected this month" Icon={Wallet} tone="success"
          value={money(sum.collectedThisMonth)}
          hint={can.viewFinancials ? `${sum.collectedPct}% of ${fmtMoneyShort(sum.expectedThisMonth)} due` : "restricted"} />
        <StatCard label="Cheques due soon" Icon={Banknote} tone="accent"
          value={sum.chequesDueCount}
          hint={can.viewFinancials ? `${money(sum.chequesDueAmount)} to deposit` : "to deposit"} />
        <StatCard label="Contracts expiring" Icon={CalendarClock} tone={sum.expiringCount ? "danger" : "neutral"}
          value={sum.expiringCount}
          hint={`within ${s.settings.renewalLeadDays} days`} />
        <StatCard label="Open maintenance" Icon={Wrench} tone={sum.openMaintenance ? "danger" : "neutral"}
          value={sum.openMaintenance}
          hint={sum.bouncedCount ? `${sum.bouncedCount} cheque(s) bounced` : "active jobs"} />
        <StatCard label="Net (cash) P&L" Icon={TrendingUp} tone="primary"
          value={can.viewFinancials ? money(sum.netPnl) : <Lock size={18} />}
          hint={can.viewFinancials ? "income − payments, all towers" : "owner / manager only"} />
      </div>

      <div className="dash-cols">
        <section className="card">
          <div className="panel-head">
            <div>
              <h3 className="t-h3">Collections</h3>
              <p className="t-muted">Expected vs collected, last 6 months</p>
            </div>
            <Link to="/accounting" className="btn btn-ghost btn-sm">Accounting <ArrowRight /></Link>
          </div>
          <div className="panel-body">
            <CollectionsChart data={months} />
          </div>
        </section>

        <section className="card">
          <div className="panel-head">
            <div>
              <h3 className="t-h3">Alerts</h3>
              <p className="t-muted">{alerts.length} need attention</p>
            </div>
            <Link to="/notifications" className="btn btn-ghost btn-sm">All <ArrowRight /></Link>
          </div>
          <div className="alert-feed">
            {alerts.slice(0, 6).map((a) => {
              const Icon = SEV_ICON[a.severity] || Info;
              return (
                <Link to={a.link || "/notifications"} key={a.id} className={`alert-row sev-${a.severity}`}>
                  <span className="alert-ic"><Icon strokeWidth={2.2} /></span>
                  <span className="alert-body">
                    <span className="alert-title">{a.title}</span>
                    <span className="alert-sub">{a.body}</span>
                  </span>
                </Link>
              );
            })}
            {alerts.length === 0 && <div className="empty"><p>Nothing needs attention. All clear.</p></div>}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="panel-head">
          <div>
            <h3 className="t-h3">Towers</h3>
            <p className="t-muted">Separate account per tower</p>
          </div>
          <Link to="/towers" className="btn btn-ghost btn-sm">View all <ArrowRight /></Link>
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Tower</th><th>Area</th><th className="num">Units</th>
                <th className="num">Leased</th><th className="num">Income (cash)</th><th className="num">Net P&L</th>
              </tr>
            </thead>
            <tbody>
              {perTower.map(({ tower, units, leased, net, income }) => (
                <tr key={tower.id}>
                  <td style={{ fontWeight: 600 }}>
                    <Link to={`/towers/${tower.id}`} className="cell-link">{tower.name}</Link>
                  </td>
                  <td className="t-muted">{tower.area}</td>
                  <td className="num tnum">{units}</td>
                  <td className="num tnum">{leased}</td>
                  <td className="num tnum">{money(income)}</td>
                  <td className="num tnum" style={{ fontWeight: 600, color: net >= 0 ? "var(--success-ink)" : "var(--danger-ink)" }}>
                    {can.viewFinancials ? money(net) : "•••"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
