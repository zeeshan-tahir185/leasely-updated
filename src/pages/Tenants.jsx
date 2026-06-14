import { useMemo, useState } from "react";
import { Search, Plus, Check, Mail, Phone, FileText, Trash2 } from "lucide-react";
import { useData } from "../data/store";
import { tenantRows, activeLeases, indexes, paymentStatus } from "../lib/domain";
import { fmtMoney, fmtDateLong, initials, CUR_PERIOD, periodLabelLong } from "../lib/format";
import { fileToCompressedDataUrl } from "../lib/image";
import StatusBadge from "../components/StatusBadge";
import Drawer from "../components/Drawer";
import Dropzone from "../components/Dropzone";
import Lightbox from "../components/Lightbox";

const FILTERS = ["all", "paid", "due", "overdue"];

export default function Tenants() {
  const { data } = useData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [openLease, setOpenLease] = useState(null);

  const rows = tenantRows(data);
  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const phone = (r.tenant.phone || "").toLowerCase();
    return (
      r.tenant.name.toLowerCase().includes(q) ||
      r.tenant.email.toLowerCase().includes(q) ||
      phone.includes(q) ||
      phone.replace(/[\s()-]/g, "").includes(q.replace(/[\s()-]/g, "")) ||
      `${r.property.name} ${r.unit.label}`.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="page-sub">{rows.length} active leases.</p>
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
              {f === "all" ? "All" : f[0].toUpperCase() + f.slice(1)}
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
              <th className="num">Monthly rent</th>
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
                <td className="num">{fmtMoney(r.rent)}</td>
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

  const blank = { name: "", email: "", phone: "", unitId: "", rent: "", dueDay: "1" };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const onPickUnit = (unitId) => {
    const u = data.units.find((x) => x.id === unitId);
    setForm((f) => ({ ...f, unitId, rent: u ? String(u.marketRent) : f.rent }));
  };

  function submit(e) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setError("Tenant name is required.");
    if (!form.unitId) return setError("Choose a unit to lease.");
    const rent = Number(form.rent);
    if (!Number.isFinite(rent) || rent <= 0) return setError("Enter a monthly rent.");
    const dueDay = Number(form.dueDay);
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)
      return setError("Due day must be between 1 and 31.");

    const unit = data.units.find((u) => u.id === form.unitId);
    addTenantLease({ ...form, name, rent, dueDay, propertyId: unit.propertyId });
    setForm(blank);
    setError("");
    onClose();
  }

  const propsById = indexes(data).properties;

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
          <span>Unit</span>
          <select className="select" value={form.unitId} onChange={(e) => onPickUnit(e.target.value)}>
            <option value="">Select a vacant unit…</option>
            {vacant.map((u) => (
              <option key={u.id} value={u.id}>
                {propsById[u.propertyId].name} · {u.label} ({fmtMoney(u.marketRent)})
              </option>
            ))}
          </select>
          {vacant.length === 0 && <span className="t-faint" style={{ fontSize: 12 }}>All units are currently leased.</span>}
        </label>
        <label className="field">
          <span>Monthly rent (AED)</span>
          <input className="input" type="number" value={form.rent} onChange={(e) => set("rent", e.target.value)} placeholder="10000" />
        </label>
        <label className="field">
          <span>Rent due day</span>
          <input className="input" type="number" min="1" max="31" value={form.dueDay} onChange={(e) => set("dueDay", e.target.value)} />
        </label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}

/* ---------- tenant detail ---------- */
function TenantDetailDrawer({ leaseId, onClose }) {
  const { data, setPaid } = useData();
  const detail = useMemo(() => {
    if (!leaseId) return null;
    const ix = indexes(data);
    const lease = ix.leases[leaseId];
    if (!lease) return null;
    const tenant = ix.tenants[lease.tenantId];
    const unit = ix.units[lease.unitId];
    const property = ix.properties[unit.propertyId];
    const payments = data.payments
      .filter((p) => p.leaseId === leaseId)
      .sort((a, b) => b.period.localeCompare(a.period));
    return { lease, tenant, unit, property, payments };
  }, [leaseId, data]);

  if (!detail) return <Drawer open={false} onClose={onClose} />;
  const { lease, tenant, unit, property, payments } = detail;

  return (
    <Drawer open={!!leaseId} onClose={onClose} title="Tenant">
      <div className="drawer-tenant">
        <span className="avatar">{initials(tenant.name)}</span>
        <div>
          <div className="t-h2">{tenant.name}</div>
          <div className="t-muted">{property.name} · Unit {unit.label}</div>
        </div>
      </div>

      <div className="detail-list" style={{ marginBottom: 22 }}>
        <div className="detail-row"><span className="k"><Mail size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Email</span><span className="v">{tenant.email || "—"}</span></div>
        <div className="detail-row"><span className="k"><Phone size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Phone</span><span className="v">{tenant.phone || "—"}</span></div>
        <div className="detail-row"><span className="k">Monthly rent</span><span className="v">{fmtMoney(lease.rent)}</span></div>
        <div className="detail-row"><span className="k">Security deposit</span><span className="v">{fmtMoney(lease.deposit)}</span></div>
        <div className="detail-row"><span className="k">Lease started</span><span className="v">{fmtDateLong(lease.startDate)}</span></div>
        <div className="detail-row"><span className="k">Rent due</span><span className="v">{lease.dueDay}{ordinal(lease.dueDay)} of the month</span></div>
      </div>

      <DocumentsSection leaseId={lease.id} />

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Payment history</h3>
      <div className="sched">
        {payments.map((p) => {
          const st = paymentStatus(p);
          const isCurrent = p.period === CUR_PERIOD;
          return (
            <div key={p.id} className={`sched-row ${st === "overdue" ? "overdue" : ""}`}>
              <div>
                <div className="sched-date">{periodLabelLong(p.period)}</div>
                <div className="t-faint" style={{ fontSize: 12 }}>
                  {st === "paid" ? `Paid ${fmtDateLong(p.paidDate)}` : `Due ${fmtDateLong(p.dueDate)}`}
                </div>
              </div>
              <span className="sched-amt">{fmtMoney(p.amount)}</span>
              {isCurrent || st !== "paid" ? (
                <button
                  className={`btn btn-sm ${p.paidDate ? "btn-ghost" : "btn-primary"}`}
                  onClick={() => setPaid(p.id, !p.paidDate)}
                >
                  {p.paidDate ? "Undo" : <><Check /> Mark paid</>}
                </button>
              ) : (
                <StatusBadge status={st} />
              )}
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}

/* ---------- documents (contract + cheques) ---------- */
function DocumentsSection({ leaseId }) {
  const { data, attachDocument, removeDocument } = useData();
  const docs = (data.documents || {})[leaseId] || { contract: null, cheques: [] };
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function add(kind, files) {
    setBusy(kind);
    setError("");
    try {
      for (const file of files) {
        const dataUrl = await fileToCompressedDataUrl(file);
        attachDocument(leaseId, kind, { name: file.name, dataUrl, addedAt: Date.now() });
      }
    } catch (e) {
      setError(e.message || "Could not add that file.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="docs">
      <h3 className="t-h3" style={{ marginBottom: 10 }}>Documents</h3>

      <div className="doc-group">
        <div className="doc-label"><FileText size={14} /> Tenancy contract</div>
        {docs.contract ? (
          <div className="doc-grid">
            <DocThumb
              doc={docs.contract}
              onOpen={() => setPreview(docs.contract)}
              onRemove={() => removeDocument(leaseId, "contract")}
            />
          </div>
        ) : (
          <Dropzone
            onFiles={(files) => add("contract", files)}
            busy={busy === "contract"}
            hint="Photo or scan of the signed contract"
          />
        )}
      </div>

      <div className="doc-group">
        <div className="doc-label"><FileText size={14} /> Cheques {docs.cheques.length > 0 && <span className="t-faint">· {docs.cheques.length}</span>}</div>
        {docs.cheques.length > 0 && (
          <div className="doc-grid">
            {docs.cheques.map((c, i) => (
              <DocThumb
                key={i}
                doc={c}
                onOpen={() => setPreview(c)}
                onRemove={() => removeDocument(leaseId, "cheque", i)}
              />
            ))}
          </div>
        )}
        <Dropzone
          onFiles={(files) => add("cheque", files)}
          multiple
          busy={busy === "cheque"}
          hint="Add one or more cheque photos"
        />
      </div>

      {error && <p className="form-error">{error}</p>}
      <Lightbox src={preview?.dataUrl} alt={preview?.name} onClose={() => setPreview(null)} />
    </div>
  );
}

function DocThumb({ doc, onOpen, onRemove }) {
  return (
    <figure className="doc-thumb">
      <button type="button" className="doc-thumb-img" onClick={onOpen} aria-label={`Open ${doc.name}`}>
        <img src={doc.dataUrl} alt={doc.name} />
      </button>
      <button
        type="button"
        className="doc-remove icon-btn"
        onClick={onRemove}
        aria-label={`Remove ${doc.name}`}
      >
        <Trash2 />
      </button>
    </figure>
  );
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
