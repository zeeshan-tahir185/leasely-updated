import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Building2 } from "lucide-react";
import { useData } from "../data/store";
import { indexes, unitRows, propertyRows } from "../lib/domain";
import { fmtMoney, initials } from "../lib/format";
import StatusBadge from "../components/StatusBadge";

export default function PropertyDetail() {
  const { id } = useParams();
  const { data, setPaid } = useData();
  const ix = indexes(data);
  const property = ix.properties[id];
  const rollup = propertyRows(data).find((r) => r.property.id === id);

  if (!property) {
    return (
      <div className="page">
        <p>Property not found. <Link to="/properties">Back to properties</Link></p>
      </div>
    );
  }

  const units = unitRows(data, id);

  return (
    <div className="page">
      <Link to="/properties" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft /> Properties
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">{property.name}</h1>
          <p className="page-sub">{property.address} · {property.city}</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="card stat-card">
          <span className="t-label">Units leased</span>
          <div className="stat-value tnum">{rollup.occupied}/{rollup.unitCount}</div>
          <div className="stat-hint">{rollup.occupancyPct}% occupancy</div>
        </div>
        <div className="card stat-card">
          <span className="t-label">Monthly rent</span>
          <div className="stat-value tnum">{fmtMoney(rollup.monthlyRevenue)}</div>
          <div className="stat-hint">at full collection</div>
        </div>
        <div className="card stat-card">
          <span className="t-label">Collected this month</span>
          <div className="stat-value tnum">{fmtMoney(rollup.collected)}</div>
          <div className="stat-hint">of {fmtMoney(rollup.expected)} due</div>
        </div>
        <div className="card stat-card">
          <span className="t-label">Overdue</span>
          <div className="stat-value tnum">{rollup.overdue}</div>
          <div className="stat-hint">{rollup.overdue ? "needs follow-up" : "all current"}</div>
        </div>
      </div>

      <section className="card">
        <div className="panel-head">
          <h3 className="t-h3">Units</h3>
          <span className="t-muted">{units.length} total</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Type</th>
              <th>Tenant</th>
              <th className="num">Rent</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.unit.id} className={u.status === "overdue" ? "row-overdue" : ""}>
                <td style={{ fontWeight: 600 }}>{u.unit.label}</td>
                <td className="t-muted">
                  {u.unit.beds === 0 ? "Studio" : `${u.unit.beds} bed`} · {u.unit.sqft} sqft
                </td>
                <td>
                  {u.vacant ? (
                    <span className="t-faint">—</span>
                  ) : (
                    <div className="cell-tenant">
                      <span className="avatar avatar-sm">{initials(u.tenant.name)}</span>
                      <span className="tn-name">{u.tenant.name}</span>
                    </div>
                  )}
                </td>
                <td className="num">{u.vacant ? <span className="t-faint">{fmtMoney(u.unit.marketRent)}</span> : fmtMoney(u.lease.rent)}</td>
                <td><StatusBadge status={u.status} /></td>
                <td className="num">
                  {!u.vacant && u.status !== "paid" && (
                    <button className="btn btn-sm" onClick={() => setPaid(u.currentPaymentId, true)}>
                      <Check /> Mark paid
                    </button>
                  )}
                  {!u.vacant && u.status === "paid" && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setPaid(u.currentPaymentId, false)}>
                      Undo
                    </button>
                  )}
                  {u.vacant && (
                    <span className="badge badge-neutral"><Building2 strokeWidth={2.5} /> Available</span>
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
