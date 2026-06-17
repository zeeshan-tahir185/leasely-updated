import { Link } from "react-router-dom";
import { Wallet, AlertTriangle, Building2, TrendingUp, ArrowRight, Check } from "lucide-react";
import { useData } from "../data/store";
import { summary, collectionsByMonth, paymentRows } from "../lib/domain";
import { fmtMoney, fmtDate, periodLabelLong, CUR_PERIOD, initials } from "../lib/format";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import CollectionsChart from "../components/charts/CollectionsChart";
import Donut from "../components/charts/Donut";

export default function Dashboard() {
  const { data, setPaid } = useData();
  const s = summary(data);
  const months = collectionsByMonth(data, 6);
  const rows = paymentRows(data, { period: CUR_PERIOD });
  const overdue = rows.filter((r) => r.status === "overdue");
  const dueSoon = rows.filter((r) => r.status === "due");

  const prev = months[months.length - 2];
  const deltaPct =
    prev && prev.collected ? Math.round(((s.collected - prev.collected) / prev.collected) * 100) : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Where rent stands in {periodLabelLong(CUR_PERIOD)}.</p>
        </div>
        <div className="page-actions">
          <Link className="btn" to="/payments">
            View payments <ArrowRight />
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        <StatCard
          label="Collected this month"
          value={fmtMoney(s.collected)}
          Icon={Wallet}
          tone="primary"
          hint={
            <>
              {s.collectedPct}% of what's due
              {deltaPct != null && (
                <>
                  {" · "}
                  <span className={deltaPct >= 0 ? "up" : "down"}>
                    {deltaPct >= 0 ? "+" : ""}
                    {deltaPct}% vs last month
                  </span>
                </>
              )}
            </>
          }
        />
        <StatCard
          label="Outstanding"
          value={fmtMoney(s.outstanding)}
          Icon={AlertTriangle}
          tone={s.overdueCount ? "danger" : "neutral"}
          hint={`${s.overdueCount} overdue · ${dueSoon.length} due soon`}
        />
        <StatCard
          label="Occupancy"
          value={`${s.occupancyPct}%`}
          Icon={Building2}
          tone="success"
          hint={`${s.occupiedUnits} of ${s.totalUnits} units leased`}
        />
        <StatCard
          label="Due this month"
          value={fmtMoney(s.expected)}
          Icon={TrendingUp}
          tone="accent"
          hint={s.dueCount === 0 ? "no cheques fall this month" : `${s.dueCount} cheque${s.dueCount === 1 ? "" : "s"} due`}
        />
      </div>

      <div className="dash-cols">
        <section className="card">
          <div className="panel-head">
            <div>
              <h3 className="t-h3">Collections</h3>
              <p className="t-muted">Expected vs collected, last 6 months</p>
            </div>
          </div>
          <div className="panel-body">
            <CollectionsChart data={months} />
          </div>
        </section>

        <section className="card">
          <div className="panel-head">
            <h3 className="t-h3">This month</h3>
          </div>
          <div className="panel-body">
            <Donut pct={s.collectedPct} collected={s.collected} outstanding={s.outstanding} />
          </div>
        </section>
      </div>

      <div className="dash-cols-2">
        <section className="card">
          <div className="panel-head">
            <h3 className="t-h3">Overdue rent</h3>
            {overdue.length > 0 && (
              <span className="badge badge-overdue">{fmtMoney(s.overdueAmount)}</span>
            )}
          </div>
          <div>
            {overdue.length === 0 ? (
              <div className="empty">
                <Check />
                <p>No overdue rent. Everyone's on time.</p>
              </div>
            ) : (
              overdue.map((r) => (
                <div className="list-row" key={r.id}>
                  <span className="avatar avatar-sm">{initials(r.tenant.name)}</span>
                  <div className="grow">
                    <div className="list-name">{r.tenant.name}</div>
                    <div className="list-sub">
                      {r.property.name} · {r.unit.label} · due {fmtDate(r.dueDate)}
                    </div>
                  </div>
                  <span className="list-amt">{fmtMoney(r.amount)}</span>
                  <button className="btn btn-sm" onClick={() => setPaid(r.id, true)}>
                    <Check /> Mark paid
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <div className="panel-head">
            <h3 className="t-h3">Due soon</h3>
          </div>
          <div>
            {dueSoon.length === 0 ? (
              <div className="empty">
                <Check />
                <p>Nothing else due this month.</p>
              </div>
            ) : (
              dueSoon.map((r) => (
                <div className="list-row" key={r.id}>
                  <span className="avatar avatar-sm">{initials(r.tenant.name)}</span>
                  <div className="grow">
                    <div className="list-name">{r.tenant.name}</div>
                    <div className="list-sub">
                      {r.property.name} · {r.unit.label}
                    </div>
                  </div>
                  <StatusBadge status="due">Due {fmtDate(r.dueDate)}</StatusBadge>
                  <span className="list-amt">{fmtMoney(r.amount)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
