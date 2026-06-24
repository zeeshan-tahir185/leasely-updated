import { UNIT_TYPES } from "../lib/constants";
import { buildUnits } from "../lib/units";

// Shared field group for batch-creating units. Parent owns `form` + `set`.
export default function BulkUnitFields({ form, set }) {
  const units = buildUnits(form);
  const sample = units.length > 3
    ? `${units.slice(0, 3).map((u) => u.label).join(", ")} … ${units[units.length - 1].label}`
    : units.map((u) => u.label).join(", ");
  return (
    <>
      <label className="field"><span>Floors</span>
        <input className="input" type="number" min="1" value={form.floors} onChange={(e) => set("floors", e.target.value)} /></label>
      <label className="field"><span>Units per floor</span>
        <input className="input" type="number" min="1" value={form.perFloor} onChange={(e) => set("perFloor", e.target.value)} /></label>
      <label className="field"><span>Start floor</span>
        <input className="input" type="number" value={form.startFloor} onChange={(e) => set("startFloor", e.target.value)} /></label>
      <label className="field"><span>Type</span>
        <select className="select" value={form.unitType} onChange={(e) => set("unitType", e.target.value)}>{UNIT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
      <label className="field"><span>Bathrooms</span>
        <input className="input" type="number" step="0.5" value={form.baths} onChange={(e) => set("baths", e.target.value)} /></label>
      <label className="field"><span>Size (sqft)</span>
        <input className="input" type="number" value={form.sqft} onChange={(e) => set("sqft", e.target.value)} /></label>
      <label className="field"><span>Market rent (AED/yr)</span>
        <input className="input" type="number" value={form.annualRent} onChange={(e) => set("annualRent", e.target.value)} /></label>
      <p className="t-faint full" style={{ fontSize: 12 }}>
        Will create <strong>{units.length}</strong> unit{units.length === 1 ? "" : "s"}: {sample || "—"}
      </p>
    </>
  );
}
