import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Plus } from "lucide-react";
import { useData } from "../data/store";
import { scopeData, activeContracts } from "../lib/domain";
import { buildUnits, BULK_DEFAULTS } from "../lib/units";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import BulkUnitFields from "../components/BulkUnitFields";

const TOWER_TYPES = ["Residential", "Commercial", "Mixed Use", "Retail"];

export default function Towers() {
  const { db, companyId, add } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const [addOpen, setAddOpen] = useState(false);

  const rows = s.towers.map((t) => {
    const units = s.units.filter((u) => u.towerId === t.id);
    const leased = activeContracts(s).filter((c) => c.towerId === t.id).length;
    const occ = units.length ? Math.round((leased / units.length) * 100) : 0;
    return { t, units: units.length, leased, vacant: units.length - leased, occ };
  });

  const totalUnits = rows.reduce((a, r) => a + r.units, 0);

  return (
    <div className="page">
      <PageHeader
        title="Towers & Units"
        subtitle={`${s.towers.length} towers · ${totalUnits} units`}
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Add tower</button>}
      />
      <div className="tower-grid">
        {rows.map(({ t, units, leased, vacant, occ }) => (
          <Link to={`/towers/${t.id}`} key={t.id} className="card tower-card">
            <div className="tower-card-head">
              <span className="co-mark"><Building2 strokeWidth={2.1} /></span>
              <div style={{ minWidth: 0 }}>
                <div className="tower-card-name">{t.name}</div>
                <div className="t-muted">{t.area} · {t.floors} floors · {t.type}</div>
              </div>
            </div>
            <div>
              <div className="tower-occ-head">
                <span className="t-muted">{leased}/{units} leased</span>
                <span className="tnum" style={{ fontWeight: 600 }}>{occ}%</span>
              </div>
              <div className="occ-bar"><i style={{ width: `${occ}%` }} /></div>
            </div>
            <div className="tower-card-stats">
              <div className="tower-stat"><div className="k">Units</div><div className="v tnum">{units}</div></div>
              <div className="tower-stat"><div className="k">Vacant</div><div className="v tnum">{vacant}</div></div>
              <div className="tower-stat"><div className="k">Plot</div><div className="v">{t.plot}</div></div>
            </div>
          </Link>
        ))}
      </div>

      <AddTowerDrawer open={addOpen} onClose={() => setAddOpen(false)}
        onAdd={({ tower, units }) => {
          const towerId = add("towers", { companyId, ...tower });
          units.forEach((u) => add("units", { towerId, ...u }));
        }} />
    </div>
  );
}

function AddTowerDrawer({ open, onClose, onAdd }) {
  const blank = { name: "", area: "", address: "", plot: "", floors: "", type: "Residential", ownerName: "" };
  const [form, setForm] = useState(blank);
  const [addUnits, setAddUnits] = useState(true);
  const [bulk, setBulk] = useState(BULK_DEFAULTS);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setB = (k, v) => setBulk((f) => ({ ...f, [k]: v }));
  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Tower name is required.");
    const tower = { name: form.name.trim(), area: form.area, address: form.address, plot: form.plot, floors: Number(form.floors) || 0, type: form.type, ownerName: form.ownerName };
    onAdd({ tower, units: addUnits ? buildUnits(bulk) : [] });
    setForm(blank); setBulk(BULK_DEFAULTS); setError(""); onClose();
  }
  return (
    <Drawer open={open} onClose={onClose} title="Add a tower" subtitle="A new building — generate its units in one go"
      footer={<><button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="add-tower" type="submit">Add tower</button></>}>
      <form id="add-tower" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Tower name</span><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus /></label>
        <label className="field"><span>Area</span><input className="input" value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Dubai Marina" /></label>
        <label className="field"><span>Plot number</span><input className="input" value={form.plot} onChange={(e) => set("plot", e.target.value)} /></label>
        <label className="field full"><span>Address</span><input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} /></label>
        <label className="field"><span>Floors</span><input className="input" type="number" value={form.floors} onChange={(e) => set("floors", e.target.value)} /></label>
        <label className="field"><span>Type</span>
          <select className="select" value={form.type} onChange={(e) => set("type", e.target.value)}>{TOWER_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="field full"><span>Owner</span><input className="input" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} /></label>

        <div className="full sec-head" style={{ marginTop: 6 }}>
          <h3 className="t-h3">Units</h3>
          <label className="check-inline"><input type="checkbox" checked={addUnits} onChange={(e) => setAddUnits(e.target.checked)} /> Generate units now</label>
        </div>
        {addUnits && <BulkUnitFields form={bulk} set={setB} />}
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}
