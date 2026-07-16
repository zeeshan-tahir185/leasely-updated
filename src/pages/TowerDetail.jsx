import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Home, FileText, BarChart3, Plus, Pencil, Layers, Trash2 } from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll, unitRows, activeContracts } from "../lib/domain";
import { fmtMoney } from "../lib/format";
import { UNIT_TYPES, bedsForType } from "../lib/constants";
import { buildUnits, BULK_DEFAULTS } from "../lib/units";
import PageHeader from "../components/PageHeader";
import Money from "../components/Money";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import { useConfirm } from "../components/ConfirmDialog";
import Drawer from "../components/Drawer";
import BulkUnitFields from "../components/BulkUnitFields";
import NewFlag from "../components/NewFlag";

const TOWER_TYPES = ["Residential", "Commercial", "Mixed Use", "Retail"];

export default function TowerDetail() {
  const { id } = useParams();
  const { db, companyId, can, update, add, remove, markSeen } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const ix = indexAll(s);
  const tower = ix.towers[id];
  const [editTower, setEditTower] = useState(false);
  const [openUnit, setOpenUnit] = useState(null); // unit id, or "new"
  const [bulkOpen, setBulkOpen] = useState(false);

  if (!tower) {
    return <div className="page"><p>Tower not found. <Link to="/towers">Back to towers</Link></p></div>;
  }

  const units = unitRows(s, id);
  const leased = units.filter((u) => !u.vacant).length;
  const vacant = units.length - leased;
  const occ = units.length ? Math.round((leased / units.length) * 100) : 0;
  const contracts = activeContracts(s).filter((c) => c.towerId === id).length;
  const editingUnit = openUnit && openUnit !== "new" ? s.units.find((u) => u.id === openUnit) : null;
  const editingUnitLeased = editingUnit ? activeContracts(s).some((c) => c.unitId === editingUnit.id) : false;

  const meta = [tower.address, `Plot ${tower.plot}`, `${tower.floors} floors`, `Owner: ${tower.ownerName}`]
    .filter(Boolean).join(" · ");

  return (
    <div className="page">
      <Link to="/towers" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft /> Towers
      </Link>
      <PageHeader title={tower.name} subtitle={meta}
        actions={<>
          <button className="btn" onClick={() => setEditTower(true)}><Pencil /> Edit tower</button>
          <button className="btn" onClick={() => setBulkOpen(true)}><Layers /> Bulk add units</button>
          <button className="btn" onClick={() => setOpenUnit("new")}><Plus /> Add unit</button>
          <Link to={`/accounting?tower=${id}`} className="btn btn-primary"><BarChart3 /> View P&amp;L</Link>
        </>} />

      <div className="kpi-grid">
        <StatCard label="Units" Icon={Building2} tone="primary" value={units.length} hint={`${tower.type}`} />
        <StatCard label="Occupancy" Icon={Home} tone="success" value={`${occ}%`} hint={`${leased} leased`} />
        <StatCard label="Vacant" Icon={Home} tone={vacant ? "danger" : "neutral"} value={vacant} hint={vacant ? "available to lease" : "fully leased"} />
        <StatCard label="Active contracts" Icon={FileText} tone="accent" value={contracts} hint="current tenancies" />
      </div>

      <section className="card">
        <div className="panel-head"><h3 className="t-h3">Units</h3><span className="t-muted">{units.length} total · {leased} leased · tap a unit to edit</span></div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Unit</th><th>Type</th><th>Floor</th><th>Tenant</th><th className="num">Annual rent</th><th>Status</th></tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.unit.id} className={`row-click ${u.unit.isNew ? "row-new" : ""}`} onClick={() => { markSeen("units", u.unit.id); setOpenUnit(u.unit.id); }}>
                  <td><button type="button" className="cell-link" style={{ fontWeight: 600 }} onClick={(e) => { e.stopPropagation(); markSeen("units", u.unit.id); setOpenUnit(u.unit.id); }}>{u.unit.label}</button><NewFlag show={u.unit.isNew} /></td>
                  <td className="t-muted">{u.unit.unitType}</td>
                  <td className="t-muted tnum">{u.unit.floor}</td>
                  <td>{u.tenant ? (
                    u.contract
                      ? <Link to="/contracts" className="cell-link" onClick={(e) => e.stopPropagation()}>{u.tenant.name}</Link>
                      : u.tenant.name
                  ) : <span className="t-faint">—</span>}</td>
                  <td className="num">{u.contract
                    ? <Money value={u.contract.annualRent} />
                    : <span className="t-faint">{can.viewFinancials ? fmtMoney(u.unit.annualRent) : "•••"}</span>}</td>
                  <td><StatusBadge status={u.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editTower && (
        <EditTowerDrawer tower={tower} onClose={() => setEditTower(false)}
          onSave={(patch) => { update("towers", id, patch); setEditTower(false); }} />
      )}
      {openUnit && (
        <UnitDrawer key={openUnit} unit={editingUnit} towerId={id} leased={editingUnitLeased} onClose={() => setOpenUnit(null)}
          onSave={(patch) => update("units", openUnit, patch)}
          onAdd={(rec) => add("units", rec)}
          onDelete={() => { remove("units", openUnit); setOpenUnit(null); }} />
      )}
      {bulkOpen && (
        <BulkUnitDrawer towerName={tower.name} onClose={() => setBulkOpen(false)}
          onAdd={(units) => units.forEach((u) => add("units", { towerId: id, ...u }))} />
      )}
    </div>
  );
}

function BulkUnitDrawer({ towerName, onClose, onAdd }) {
  const [bulk, setBulk] = useState(BULK_DEFAULTS);
  const setB = (k, v) => setBulk((f) => ({ ...f, [k]: v }));
  function submit(e) {
    e.preventDefault();
    onAdd(buildUnits(bulk));
    onClose();
  }
  return (
    <Drawer open onClose={onClose} title="Bulk add units" subtitle={towerName}
      footer={<><button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="bulk-units" type="submit">Add units</button></>}>
      <form id="bulk-units" onSubmit={submit} className="form-grid">
        <BulkUnitFields form={bulk} set={setB} />
      </form>
    </Drawer>
  );
}

function EditTowerDrawer({ tower, onClose, onSave }) {
  const [form, setForm] = useState({
    name: tower.name, area: tower.area || "", address: tower.address || "", plot: tower.plot || "",
    floors: String(tower.floors || ""), type: tower.type || "Residential", ownerName: tower.ownerName || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  function submit(e) {
    e.preventDefault();
    onSave({ name: form.name.trim() || tower.name, area: form.area, address: form.address, plot: form.plot, floors: Number(form.floors) || 0, type: form.type, ownerName: form.ownerName });
  }
  return (
    <Drawer open onClose={onClose} title="Edit tower" subtitle={tower.name}
      footer={<><button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="edit-tower" type="submit">Save changes</button></>}>
      <form id="edit-tower" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Tower name</span><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="field"><span>Area</span><input className="input" value={form.area} onChange={(e) => set("area", e.target.value)} /></label>
        <label className="field"><span>Plot number</span><input className="input" value={form.plot} onChange={(e) => set("plot", e.target.value)} /></label>
        <label className="field full"><span>Address</span><input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} /></label>
        <label className="field"><span>Floors</span><input className="input" type="number" value={form.floors} onChange={(e) => set("floors", e.target.value)} /></label>
        <label className="field"><span>Type</span>
          <select className="select" value={form.type} onChange={(e) => set("type", e.target.value)}>{TOWER_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="field full"><span>Owner</span><input className="input" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} /></label>
      </form>
    </Drawer>
  );
}

function UnitDrawer({ unit, towerId, leased, onClose, onSave, onAdd, onDelete }) {
  const isNew = !unit;
  const confirm = useConfirm();
  const [form, setForm] = useState(isNew
    ? { label: "", unitType: "1BHK", floor: "", baths: "1", sqft: "", annualRent: "" }
    : { label: unit.label, unitType: unit.unitType || "1BHK", floor: String(unit.floor ?? ""), baths: String(unit.baths ?? 1), sqft: String(unit.sqft ?? 0), annualRent: String(unit.annualRent ?? 0) });
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  function submit(e) {
    e.preventDefault();
    if (!form.label.trim()) return setError("Unit label is required (e.g. 1204).");
    const payload = { label: form.label.trim(), unitType: form.unitType, floor: Number(form.floor) || 0, beds: bedsForType(form.unitType), baths: Number(form.baths) || 1, sqft: Number(form.sqft) || 0, annualRent: Number(form.annualRent) || 0 };
    if (isNew) onAdd({ towerId, ...payload }); else onSave(payload);
    onClose();
  }
  async function del() {
    if (leased) { setError("This unit has an active contract — end the tenancy before deleting it."); return; }
    if (await confirm({ title: `Delete unit ${unit.label}?`, message: "This permanently removes the unit. This can't be undone.", confirmLabel: "Delete unit" })) onDelete();
  }
  return (
    <Drawer open onClose={onClose} title={isNew ? "Add unit" : `Unit ${unit.label}`} subtitle={isNew ? "New unit in this tower" : "Edit unit details"}
      footer={<>
        {!isNew && <button className="btn btn-danger" type="button" onClick={del}><Trash2 /> Delete</button>}
        <div className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="unit-form" type="submit">{isNew ? "Add unit" : "Save changes"}</button>
      </>}>
      <form id="unit-form" onSubmit={submit} className="form-grid">
        <label className="field"><span>Unit label</span><input className="input" value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="e.g. 1204, G-04" autoFocus /></label>
        <label className="field"><span>Type</span>
          <select className="select" value={form.unitType} onChange={(e) => set("unitType", e.target.value)}>{UNIT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="field"><span>Floor</span><input className="input" type="number" value={form.floor} onChange={(e) => set("floor", e.target.value)} /></label>
        <label className="field"><span>Size (sqft)</span><input className="input" type="number" value={form.sqft} onChange={(e) => set("sqft", e.target.value)} /></label>
        <label className="field"><span>Bathrooms</span><input className="input" type="number" step="0.5" value={form.baths} onChange={(e) => set("baths", e.target.value)} /></label>
        <label className="field full"><span>Market annual rent (AED)</span><input className="input" type="number" value={form.annualRent} onChange={(e) => set("annualRent", e.target.value)} /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}
