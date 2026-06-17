import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { useData } from "../data/store";
import { tenantRows, activeLeases, STATUS_LABEL } from "../lib/domain";
import { fmtMoney, initials, phoneMatch, isoOf, parseISO } from "../lib/format";
import StatusBadge from "../components/StatusBadge";
import Drawer from "../components/Drawer";
import TenantDetailDrawer from "../components/TenantDetailDrawer";

const FILTERS = ["all", "paid", "settled", "due", "overdue", "ended"];

const INSTALLMENT_OPTIONS = [
  { n: 1, label: "1 cheque · annual" },
  { n: 2, label: "2 cheques · every 6 months" },
  { n: 3, label: "3 cheques · every 4 months" },
  { n: 4, label: "4 cheques · quarterly" },
  { n: 6, label: "6 cheques · every 2 months" },
  { n: 12, label: "12 cheques · monthly" },
];

// Summarise the lease that the current form inputs would create: term length and
// how the yearly rent splits into cheques over that term. Returns null if invalid.
function leasePreview({ rent, installments, startDate, endDate }) {
  const annual = Number(rent);
  if (!Number.isFinite(annual) || annual <= 0) return null;
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (Number.isNaN(+start) || Number.isNaN(+end) || end <= start) return null;
  const n = Math.max(1, Number(installments) || 1);
  const monthsPer = Math.max(1, Math.round(12 / n));
  const termMonths = Math.max(
    1,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  );
  return {
    termMonths,
    chequeCount: Math.ceil(termMonths / monthsPer),
    perCheque: Math.round(annual / 12) * monthsPer,
    monthly: Math.round(annual / 12),
    prorated: termMonths % monthsPer !== 0,
  };
}

export default function Tenants() {
  const { data } = useData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [openLease, setOpenLease] = useState(null);

  const rows = tenantRows(data);
  const activeCount = rows.filter((r) => !r.ended).length;
  const endedCount = rows.length - activeCount;
  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.tenant.name.toLowerCase().includes(q) ||
      r.tenant.email.toLowerCase().includes(q) ||
      phoneMatch(r.tenant.phone, q) ||
      `${r.property.name} ${r.unit.label}`.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="page-sub">
            {activeCount} active {activeCount === 1 ? "lease" : "leases"}
            {endedCount > 0 ? ` · ${endedCount} ended` : ""}.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus /> Add tenant
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            className="input"
            placeholder="Search name, email, phone, or unit"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="spacer" />
        <div className="seg">
          {FILTERS.map((f) => (
            <button key={f} data-active={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Unit</th>
              <th className="num">Annual rent</th>
              <th>Status</th>
              <th className="num">Balance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.leaseId} className="row-click" onClick={() => setOpenLease(r.leaseId)}>
                <td>
                  <div className="cell-tenant">
                    <span className="avatar avatar-sm">{initials(r.tenant.name)}</span>
                    <div>
                      <div className="tn-name">{r.tenant.name}</div>
                      <div className="tn-sub">{r.tenant.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="tn-name" style={{ fontWeight: 500 }}>{r.unit.label}</div>
                  <div className="tn-sub">{r.property.name}</div>
                </td>
                <td className="num">{fmtMoney(r.rent * 12)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="num">
                  {r.balance > 0 ? (
                    <span style={{ color: "var(--danger-ink)", fontWeight: 600 }}>{fmtMoney(r.balance)}</span>
                  ) : (
                    <span className="t-faint">{fmtMoney(0)}</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="empty">
                    <Search />
                    <p>No tenants match your search.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <AddTenantDrawer open={addOpen} onClose={() => setAddOpen(false)} />
      <TenantDetailDrawer leaseId={openLease} onClose={() => setOpenLease(null)} />
    </div>
  );
}

/* ---------- add tenant ---------- */
function AddTenantDrawer({ open, onClose }) {
  const { data, addTenantLease } = useData();
  const occupied = new Set(activeLeases(data).map((l) => l.unitId));
  const vacant = data.units.filter((u) => !occupied.has(u.id));

  const today = new Date();
  const oneYearOut = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  const blank = {
    name: "", email: "", phone: "", propertyId: "", unitId: "", rent: "", dueDay: "1",
    installments: "1", startDate: isoOf(today), endDate: isoOf(oneYearOut),
  };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const plan = leasePreview(form);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const onPickProperty = (propertyId) => setForm((f) => ({ ...f, propertyId, unitId: "", rent: "" }));
  const onPickUnit = (unitId) => {
    const u = data.units.find((x) => x.id === unitId);
    // marketRent is monthly; prefill the yearly rent field.
    setForm((f) => ({ ...f, unitId, rent: u ? String(u.marketRent * 12) : f.rent }));
  };
  const vacantInProperty = form.propertyId ? vacant.filter((u) => u.propertyId === form.propertyId) : [];

  function submit(e) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setError("Tenant name is required.");
    if (!form.propertyId) return setError("Choose a property.");
    if (!form.unitId) return setError("Choose a unit to lease.");
    const annualRent = Number(form.rent);
    if (!Number.isFinite(annualRent) || annualRent <= 0) return setError("Enter the yearly rent.");
    const dueDay = Number(form.dueDay);
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)
      return setError("Due day must be between 1 and 31.");
    if (!form.startDate || !form.endDate) return setError("Set the lease start and end dates.");
    if (parseISO(form.endDate) <= parseISO(form.startDate))
      return setError("Lease end must be after the start date.");

    addTenantLease({ ...form, name, annualRent, dueDay, installments: Number(form.installments) });
    setForm(blank);
    setError("");
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add a tenant"
      subtitle="Create a lease and start tracking rent"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary" form="add-tenant" type="submit">Create lease</button>
        </>
      }
    >
      <form id="add-tenant" onSubmit={submit} className="form-grid">
        <label className="field full">
          <span>Tenant name</span>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@email.com" />
        </label>
        <label className="field">
          <span>Phone</span>
          <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+971 50 000 0000" />
        </label>
        <label className="field full">
          <span>Property</span>
          <select className="select" value={form.propertyId} onChange={(e) => onPickProperty(e.target.value)}>
            <option value="">Select a property…</option>
            {data.properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="field full">
          <span>Unit</span>
          <select
            className="select"
            value={form.unitId}
            onChange={(e) => onPickUnit(e.target.value)}
            disabled={!form.propertyId}
          >
            <option value="">{form.propertyId ? "Select a vacant unit…" : "Choose a property first"}</option>
            {vacantInProperty.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}{u.unitType ? ` · ${u.unitType}` : ""} — {fmtMoney(u.marketRent)}/mo
              </option>
            ))}
          </select>
          {form.propertyId && vacantInProperty.length === 0 && (
            <span className="t-faint" style={{ fontSize: 12 }}>No vacant units in this property.</span>
          )}
        </label>
        <label className="field">
          <span>Yearly rent (AED)</span>
          <input className="input" type="number" value={form.rent} onChange={(e) => set("rent", e.target.value)} placeholder="120000" />
        </label>
        <label className="field">
          <span>Rent due day</span>
          <input className="input" type="number" min="1" max="31" value={form.dueDay} onChange={(e) => set("dueDay", e.target.value)} />
        </label>
        <label className="field">
          <span>Lease start</span>
          <input className="input" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </label>
        <label className="field">
          <span>Lease end</span>
          <input className="input" type="date" min={form.startDate} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </label>
        <label className="field full">
          <span>Payment plan (cheques per year)</span>
          <select className="select" value={form.installments} onChange={(e) => set("installments", e.target.value)}>
            {INSTALLMENT_OPTIONS.map((o) => (
              <option key={o.n} value={o.n}>{o.label}</option>
            ))}
          </select>
          {plan && (
            <span className="t-faint" style={{ fontSize: 12 }}>
              {plan.termMonths}-month term · {plan.chequeCount} cheque{plan.chequeCount > 1 ? "s" : ""} of{" "}
              {fmtMoney(plan.perCheque)}{plan.prorated ? " (last pro-rated)" : ""} · {fmtMoney(plan.monthly)}/month
            </span>
          )}
        </label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}
