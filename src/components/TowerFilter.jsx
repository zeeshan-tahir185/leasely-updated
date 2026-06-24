import { Building2 } from "lucide-react";

// Reusable "filter by building" dropdown, styled like the period selector.
export default function TowerFilter({ towers, value, onChange }) {
  return (
    <div className="period-ctl">
      <Building2 className="period-ic" />
      <select className="select period-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filter by tower">
        <option value="all">All towers</option>
        {towers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
  );
}
