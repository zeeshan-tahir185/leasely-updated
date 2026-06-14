import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Plus } from "lucide-react";
import { useData } from "../data/store";
import { propertyRows } from "../lib/domain";
import { fmtMoney } from "../lib/format";
import Drawer from "../components/Drawer";

export default function Properties() {
  const { data } = useData();
  const [addOpen, setAddOpen] = useState(false);
  const rows = propertyRows(data);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="page-sub">{rows.length} buildings across your portfolio.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus /> Add property
          </button>
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

      <AddPropertyDrawer open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function AddPropertyDrawer({ open, onClose }) {
  const { addProperty } = useData();
  const navigate = useNavigate();
  const blank = { name: "", address: "", city: "" };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setError("Building name is required.");
    const id = addProperty({ name, address: form.address.trim(), city: form.city.trim() });
    setForm(blank);
    setError("");
    onClose();
    navigate(`/properties/${id}`);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add a property"
      subtitle="Create a building, then add its units"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary" form="add-property" type="submit">Create property</button>
        </>
      }
    >
      <form id="add-property" onSubmit={submit} className="form-grid">
        <label className="field full">
          <span>Building name</span>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Marina Heights" autoFocus />
        </label>
        <label className="field full">
          <span>Address</span>
          <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street, tower, or plot" />
        </label>
        <label className="field full">
          <span>City / area</span>
          <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Dubai Marina" />
        </label>
        {error && <p className="form-error full">{error}</p>}
        <p className="t-faint full" style={{ fontSize: 12, margin: 0 }}>
          You'll add units to this building on its page next.
        </p>
      </form>
    </Drawer>
  );
}
