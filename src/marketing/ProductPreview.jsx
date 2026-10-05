import { TrendingUp, TrendingDown, CheckCheck } from "lucide-react";

/**
 * A hand-built, pixel-crisp depiction of the Leasely dashboard — the
 * glanceable-money view. Not a screenshot: it reuses the real badge/avatar
 * vocabulary so it stays on-brand and sharp at any size. Purely presentational.
 */
const ROWS = [
  { name: "Fatima Al Marri", initials: "FM", unit: "Marina Heights · 1204", amount: "95,000", status: "paid", label: "Paid" },
  { name: "Rajesh Nair", initials: "RN", unit: "Marina Heights · 0808", amount: "72,000", status: "paid", label: "Paid" },
  { name: "Lina Haddad", initials: "LH", unit: "Bay Residences · 1501", amount: "110,000", status: "due", label: "Due in 4d" },
  { name: "Omar Siddiqui", initials: "OS", unit: "Bay Residences · 0302", amount: "68,000", status: "overdue", label: "Overdue" },
];

export default function ProductPreview() {
  return (
    <div className="m-preview-wrap">
      <div className="m-preview-glow" aria-hidden="true" />
      <div className="m-preview" role="img" aria-label="The Leasely dashboard showing this month's collected rent, on-time rate, and each tenant's payment status.">
      <div className="m-preview-chrome" aria-hidden="true">
        <span className="m-preview-dots"><i /><i /><i /></span>
        <span className="m-preview-url">app.leasely.ae/dashboard</span>
      </div>

      <div className="m-preview-body">
        <div className="m-preview-top">
          <div className="m-preview-month">
            October 2026 <span>· rent overview</span>
          </div>
          <span className="m-preview-co"><i />Westwood PM</span>
        </div>

        <div className="m-preview-stats">
          <div className="m-stat">
            <div className="m-stat-k">Collected this month</div>
            <div className="m-stat-v">AED 1.06M</div>
            <div className="m-stat-delta up"><TrendingUp /> 8% vs. Sep</div>
          </div>
          <div className="m-stat">
            <div className="m-stat-k">On-time rate</div>
            <div className="m-stat-v">94%</div>
            <div className="m-stat-delta up"><TrendingUp /> 2 pts</div>
          </div>
          <div className="m-stat">
            <div className="m-stat-k">Overdue</div>
            <div className="m-stat-v">AED 84K</div>
            <div className="m-stat-delta down"><TrendingDown /> 3 tenants</div>
          </div>
        </div>

        <div className="m-preview-table">
          <div className="m-prow m-prow-head" aria-hidden="true">
            <span>Tenant</span>
            <span className="m-prow-unit">Unit</span>
            <span>Annual rent</span>
            <span>Status</span>
          </div>
          {ROWS.map((r) => (
            <div className="m-prow" key={r.name}>
              <span className="m-prow-tenant">
                <span className="avatar">{r.initials}</span>
                <span className="m-prow-name">{r.name}</span>
              </span>
              <span className="m-prow-unit">{r.unit}</span>
              <span className="m-prow-amt tnum">AED {r.amount}</span>
              <span className={`badge badge-dot badge-${r.status}`}>{r.label}</span>
            </div>
          ))}
        </div>
      </div>
      </div>

      <div className="m-preview-chip" aria-hidden="true">
        <span className="m-preview-chip-ic"><CheckCheck /></span>
        <span>
          <span className="m-preview-chip-k">Cheque cleared</span>
          <span className="m-preview-chip-v tnum">+ AED 95,000</span>
        </span>
      </div>
    </div>
  );
}
