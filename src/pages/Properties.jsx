import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { useData } from "../data/store";
import { propertyRows } from "../lib/domain";
import { fmtMoney } from "../lib/format";

export default function Properties() {
  const { data } = useData();
  const rows = propertyRows(data);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="page-sub">{rows.length} buildings across your portfolio.</p>
        </div>
      </div>

      <div className="prop-grid">
        {rows.map((r) => (
          <Link key={r.property.id} to={`/properties/${r.property.id}`} className="card prop-card">
            <div className="prop-card-head">
              <span className="prop-icon">
                <Building2 strokeWidth={2} />
              </span>
              {r.overdue > 0 ? (
                <span className="badge badge-overdue">{r.overdue} overdue</span>
              ) : (
                <span className="badge badge-paid">On track</span>
              )}
            </div>
            <div className="prop-name">{r.property.name}</div>
            <div className="prop-addr">
              {r.property.address} · {r.property.city}
            </div>

            <div className="prop-stats">
              <div className="prop-stat">
                <div className="k">Units</div>
                <div className="v">{r.occupied}/{r.unitCount} leased</div>
              </div>
              <div className="prop-stat">
                <div className="k">Occupancy</div>
                <div className="v">{r.occupancyPct}%</div>
              </div>
              <div className="prop-stat">
                <div className="k">Monthly rent</div>
                <div className="v">{fmtMoney(r.monthlyRevenue)}</div>
              </div>
              <div className="prop-stat">
                <div className="k">Vacant</div>
                <div className="v">{r.vacant || "None"}</div>
              </div>
            </div>

            <div className="prop-foot">
              <div className="prop-collect">
                <span className="t-muted">Collected this month</span>
                <span className="tnum" style={{ fontWeight: 600 }}>
                  {fmtMoney(r.collected)} / {fmtMoney(r.expected)}
                </span>
              </div>
              <div className="progress">
                <i style={{ width: `${r.collectedPct}%` }} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
