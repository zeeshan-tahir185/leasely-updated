import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Building2, Plus, Paperclip } from "lucide-react";
import { useData } from "../data/store";
import { indexes, unitRows, propertyRows, collectionsByMonth, activeLeases, monthStatusFromPays } from "../lib/domain";
import { fmtMoney, initials } from "../lib/format";
import { UNIT_TYPES } from "../lib/constants";
import StatusBadge from "../components/StatusBadge";
import Drawer from "../components/Drawer";
import TenantDetailDrawer from "../components/TenantDetailDrawer";
import CollectionsChart from "../components/charts/CollectionsChart";

const AVAIL = [
  { key: "all", label: "All" },
  { key: "leased", label: "Leased" },
  { key: "available", label: "Available" },
];

export default function PropertyDetail() {
  const { id } = useParams();
  const { data, setPaid } = useData();
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [openUnit, setOpenUnit] = useState(null);
  const [openTenant, setOpenTenant] = useState(null);
  const [avail, setAvail] = useState("all");
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

  const meta = [
    property.type,
    [property.address, property.city].filter(Boolean).join(", "),
    property.plotNumber && `Plot ${property.plotNumber}`,
    property.landlord && `Landlord: ${property.landlord}`,
    property.floors && `${property.floors} floors`,
  ].filter(Boolean).join(" · ");

  const units = unitRows(data, id);
  const months = collectionsByMonth(data, 6, id);
  const hasHistory = months.some((m) => m.expected > 0);
  const leasedCount = units.filter((u) => !u.vacant).length;
  const availableCount = units.length - leasedCount;
  const docs = data.documents || {};

  const shown = units.filter((u) =>
    avail === "all" ? true : avail === "available" ? u.vacant : !u.vacant
  );

  return (
    <div className="page">
      <Link to="/properties" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft /> Properties
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">{property.name}</h1>
          <p className="page-sub">{meta || "—"}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setAddUnitOpen(true)}>
            <Plus /> Add unit
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="card stat-card">
          <span className="t-label">Units leased</span>
          <div className="stat-value tnum">{rollup.occupied}/{rollup.unitCount}</div>
          <div className="stat-hint">{rollup.occupancyPct}% occupancy</div>
        </div>
        <div className="card stat-card">
          <span className="t-label">Due this month</span>
          <div className="stat-value tnum">{fmtMoney(rollup.dueThisMonth)}</div>
          <div className="stat-hint">
            {rollup.dueCount === 0
              ? "no cheques fall this month"
              : `${rollup.dueCount} cheque${rollup.dueCount === 1 ? "" : "s"} due`}
          </div>
        </div>
        <div className="card stat-card">
          <span className="t-label">Collected this month</span>
          <div className="stat-value tnum">{fmtMoney(rollup.collected)}</div>
          <div className="stat-hint">
            {rollup.expected ? `${rollup.collectedPct}% of what's due` : "nothing outstanding"}
          </div>
        </div>
        <div className="card stat-card">
          <span className="t-label">Overdue</span>
          <div className="stat-value tnum">{rollup.overdue}</div>
          <div className="stat-hint">{rollup.overdue ? "needs follow-up" : "all current"}</div>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div>
            <h3 className="t-h3">Collections</h3>
            <p className="t-muted">Expected vs collected, last 6 months</p>
          </div>
        </div>
        <div className="panel-body">
          {hasHistory ? (
            <CollectionsChart data={months} />
          ) : (
            <div className="empty">
              <Building2 />
              <p>No payment history yet. Add units and tenants to start tracking rent.</p>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="panel-head">
          <h3 className="t-h3">Units</h3>
          <div className="seg">
            {AVAIL.map((a) => (
              <button key={a.key} data-active={avail === a.key} onClick={() => setAvail(a.key)}>
                {a.label}
                {a.key === "leased" && ` (${leasedCount})`}
                {a.key === "available" && ` (${availableCount})`}
              </button>
            ))}
          </div>
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
            {shown.map((u) => {
              const docCount = u.vacant
                ? 0
                : ((docs[u.lease.id]?.contract ? 1 : 0) + (docs[u.lease.id]?.cheques?.length || 0));
              return (
                <tr
                  key={u.unit.id}
                  className={`row-click ${u.status === "overdue" ? "row-overdue" : ""}`}
                  onClick={() => setOpenUnit(u.unit.id)}
                >
                  <td>
                    <button
                      type="button"
                      className="cell-link"
                      style={{ fontWeight: 600 }}
                      onClick={(e) => { e.stopPropagation(); setOpenUnit(u.unit.id); }}
                    >
                      {u.unit.label}
                    </button>
                  </td>
                  <td className="t-muted">
                    {u.unit.unitType || (u.unit.beds === 0 ? "Studio" : `${u.unit.beds} bed`)}
                    {u.unit.sqft ? ` · ${u.unit.sqft} sqft` : ""}
                  </td>
                  <td>
                    {u.vacant ? (
                      <span className="t-faint">—</span>
                    ) : (
                      <div className="cell-tenant">
                        <button
                          type="button"
                          className="cell-link cell-link-tenant"
                          onClick={(e) => { e.stopPropagation(); setOpenTenant(u.lease.id); }}
                        >
                          <span className="avatar avatar-sm">{initials(u.tenant.name)}</span>
                          <span className="tn-name">{u.tenant.name}</span>
                        </button>
                        {docCount > 0 && (
                          <span className="doc-chip" title={`${docCount} document${docCount > 1 ? "s" : ""} on file`}>
                            <Paperclip /> {docCount}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="num">{u.vacant ? <span className="t-faint">{fmtMoney(u.unit.marketRent)}</span> : fmtMoney(u.lease.rent)}</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td className="num">
                    {u.currentPaymentId && u.status !== "paid" && (
                      <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setPaid(u.currentPaymentId, true); }}>
                        <Check /> Mark paid
                      </button>
                    )}
                    {u.currentPaymentId && u.status === "paid" && (
                      <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setPaid(u.currentPaymentId, false); }}>
                        Undo
                      </button>
                    )}
                    {!u.vacant && !u.currentPaymentId && (
                      <span className="t-faint">No cheque due</span>
                    )}
                    {u.vacant && (
                      <span className="badge badge-neutral"><Building2 strokeWidth={2.5} /> Available</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty">
                    <Building2 />
                    <p>{avail === "available" ? "No available units — everything is leased." : avail === "leased" ? "No leased units yet." : "No units yet. Add the first one."}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <AddUnitDrawer open={addUnitOpen} onClose={() => setAddUnitOpen(false)} propertyId={id} />
      {openUnit && (
        <UnitDetailDrawer key={openUnit} unitId={openUnit} onClose={() => setOpenUnit(null)} />
      )}
      <TenantDetailDrawer leaseId={openTenant} onClose={() => setOpenTenant(null)} />
    </div>
  );
}

function UnitDetailDrawer({ unitId, onClose }) {
  const { data, updateUnit } = useData();
  const ix = indexes(data);
  const unit = ix.units[unitId];
  const lease = activeLeases(data).find((l) => l.unitId === unitId);
  const tenant = lease ? ix.tenants[lease.tenantId] : null;
  const pays = lease ? data.payments.filter((p) => p.leaseId === lease.id) : [];
  const status = lease ? monthStatusFromPays(pays).status : "vacant";

  const [form, setForm] = useState({
    label: unit.label,
    unitType: unit.unitType || "",
    beds: String(unit.beds ?? 0),
    baths: String(unit.baths ?? 1),
    sqft: String(unit.sqft ?? 0),
    marketRent: String(unit.marketRent ?? 0),
  });
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function save(e) {
    e.preventDefault();
    const label = form.label.trim();
    if (!label) return setError("Unit label is required.");
    updateUnit(unitId, {
      label,
      unitType: form.unitType || undefined,
      beds: Number(form.beds) || 0,
      baths: Number(form.baths) || 1,
      sqft: Number(form.sqft) || 0,
      marketRent: Number(form.marketRent) || 0,
    });
    onClose();
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Unit ${unit.label}`}
      subtitle={ix.properties[unit.propertyId]?.name}
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="edit-unit" type="submit">Save changes</button>
        </>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <StatusBadge status={status} />
      </div>

      {tenant ? (
        <div className="detail-list" style={{ marginBottom: 20 }}>
          <div className="detail-row">
            <span className="k">Tenant</span>
            <span className="v">
              <span className="cell-tenant" style={{ justifyContent: "flex-end" }}>
                <span className="avatar avatar-sm">{initials(tenant.name)}</span>
                {tenant.name}
              </span>
            </span>
          </div>
          <div className="detail-row"><span className="k">Lease rent</span><span className="v">{fmtMoney(lease.rent)}/mo</span></div>
        </div>
      ) : (
        <p className="t-muted" style={{ marginBottom: 18, fontSize: 13 }}>
          This unit is vacant. Add a tenant from the Tenants page to start a lease.
        </p>
      )}

      <h3 className="t-h3" style={{ marginBottom: 12 }}>Unit details</h3>
      <form id="edit-unit" onSubmit={save} className="form-grid">
        <label className="field">
          <span>Unit label</span>
          <input className="input" value={form.label} onChange={(e) => set("label", e.target.value)} />
        </label>
        <label className="field">
          <span>Unit type</span>
          <select className="select" value={form.unitType} onChange={(e) => set("unitType", e.target.value)}>
            <option value="">—</option>
            {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Bedrooms</span>
          <input className="input" type="number" min="0" value={form.beds} onChange={(e) => set("beds", e.target.value)} />
        </label>
        <label className="field">
          <span>Bathrooms</span>
          <input className="input" type="number" min="0" step="0.5" value={form.baths} onChange={(e) => set("baths", e.target.value)} />
        </label>
        <label className="field">
          <span>Size (sqft)</span>
          <input className="input" type="number" min="0" value={form.sqft} onChange={(e) => set("sqft", e.target.value)} />
        </label>
        <label className="field">
          <span>Market rent (AED)</span>
          <input className="input" type="number" min="0" value={form.marketRent} onChange={(e) => set("marketRent", e.target.value)} />
        </label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}

function AddUnitDrawer({ open, onClose, propertyId }) {
  const { addUnit } = useData();
  const blank = { label: "", beds: "1", baths: "1", sqft: "", marketRent: "" };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    const label = form.label.trim();
    if (!label) return setError("Unit label is required (e.g. 1A, 203).");
    const rent = Number(form.marketRent);
    if (!Number.isFinite(rent) || rent <= 0) return setError("Enter a market rent.");
    addUnit({
      propertyId,
      label,
      beds: form.beds || 0,
      baths: form.baths || 1,
      sqft: form.sqft || 0,
      marketRent: rent,
    });
    setForm(blank);
    setError("");
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add a unit"
      subtitle="A rentable unit in this building"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary" form="add-unit" type="submit">Add unit</button>
        </>
      }
    >
      <form id="add-unit" onSubmit={submit} className="form-grid">
        <label className="field full">
          <span>Unit label</span>
          <input className="input" value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="e.g. 1A, 203, TH-4" autoFocus />
        </label>
        <label className="field">
          <span>Bedrooms</span>
          <input className="input" type="number" min="0" value={form.beds} onChange={(e) => set("beds", e.target.value)} placeholder="0 = studio" />
        </label>
        <label className="field">
          <span>Bathrooms</span>
          <input className="input" type="number" min="0" step="0.5" value={form.baths} onChange={(e) => set("baths", e.target.value)} />
        </label>
        <label className="field">
          <span>Size (sqft)</span>
          <input className="input" type="number" min="0" value={form.sqft} onChange={(e) => set("sqft", e.target.value)} placeholder="e.g. 850" />
        </label>
        <label className="field">
          <span>Market rent (AED)</span>
          <input className="input" type="number" min="0" value={form.marketRent} onChange={(e) => set("marketRent", e.target.value)} placeholder="e.g. 12000" />
        </label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}
