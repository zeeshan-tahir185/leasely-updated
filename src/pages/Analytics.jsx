import { Link } from "react-router-dom";
import { Wallet, Building2, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { useData } from "../data/store";
import { summary, collectionsByMonth, propertyRows } from "../lib/domain";
import { fmtMoney, periodLabelLong, CUR_PERIOD } from "../lib/format";
import StatCard from "../components/StatCard";
import CollectionsChart from "../components/charts/CollectionsChart";
import Donut from "../components/charts/Donut";

export default function Analytics() {
  const { data } = useData();
  const s = summary(data);
  const months = collectionsByMonth(data, 6);
  const buildings = propertyRows(data).sort((a, b) => b.annualRent - a.annualRent);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Portfolio performance across {buildings.length} buildings in {periodLabelLong(CUR_PERIOD)}.</p>
        </div>
        <div className="page-actions">
          <Link className="btn" to="/properties">
            View properties <ArrowRight />
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        <StatCard
          label="Due this month"
          value={fmtMoney(s.expected)}
          Icon={TrendingUp}
          tone="accent"
          hint={s.dueCount === 0 ? "no cheques fall this month" : `${s.dueCount} cheque${s.dueCount === 1 ? "" : "s"} due`}
        />
        <StatCard
          label="Collected this month"
          value={`${s.collectedPct}%`}
          Icon={Wallet}
          tone="primary"
          hint={`${fmtMoney(s.collected)} collected`}
        />
        <StatCard
          label="Occupancy"
          value={`${s.occupancyPct}%`}
          Icon={Building2}
          tone="success"
          hint={`${s.occupiedUnits} of ${s.totalUnits} units leased`}
        />
        <StatCard
          label="Outstanding"
          value={fmtMoney(s.outstanding)}
          Icon={AlertTriangle}
          tone={s.overdueCount ? "danger" : "neutral"}
          hint={`${s.overdueCount} overdue across portfolio`}
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

      <section className="card" style={{ overflow: "hidden", marginTop: 18 }}>
        <div className="panel-head">
          <h3 className="t-h3">By building</h3>
          <span className="t-muted">Ranked by annual rent</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Building</th>
              <th className="num">Occupancy</th>
              <th className="num">Annual rent</th>
              <th>Collected this month</th>
              <th className="num">Overdue</th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((b) => (
              <tr key={b.property.id}>
                <td>
                  <Link to={`/properties/${b.property.id}`} className="bld-link">
                    <span className="prop-icon prop-icon-sm"><Building2 strokeWidth={2} /></span>
                    <div>
                      <div className="tn-name">{b.property.name}</div>
                      <div className="tn-sub">{b.property.city}</div>
                    </div>
                  </Link>
                </td>
                <td className="num tnum">{b.occupancyPct}% <span className="t-faint">({b.occupied}/{b.unitCount})</span></td>
                <td className="num tnum">{fmtMoney(b.annualRent)}</td>
                <td>
                  <div className="bld-collect">
                    <div className="progress" style={{ flex: 1 }}>
                      <i style={{ width: `${b.collectedPct}%` }} />
                    </div>
                    <span className="tnum bld-pct">{b.collectedPct}%</span>
                  </div>
                </td>
                <td className="num">
                  {b.overdue > 0 ? (
                    <span className="badge badge-overdue">{b.overdue}</span>
                  ) : (
                    <span className="t-faint">None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
