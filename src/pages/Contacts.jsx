import { useMemo, useState } from "react";
import { Search, Plus, Mail, Phone, IdCard, Globe, Building, Pencil, Trash2 } from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll } from "../lib/domain";
import { initials, phoneMatch } from "../lib/format";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatusBadge from "../components/StatusBadge";
import TowerFilter from "../components/TowerFilter";
import { useConfirm } from "../components/ConfirmDialog";
import NewFlag from "../components/NewFlag";

const KINDS = [
  { key: "all", label: "All" },
  { key: "tenant", label: "Tenants" },
  { key: "owner", label: "Owners" },
  { key: "supplier", label: "Suppliers" },
  { key: "lead", label: "Leads" },
  { key: "buyer", label: "Buyers" },
];
const KIND_LABEL = { tenant: "Tenant", owner: "Owner", supplier: "Supplier", lead: "Lead", buyer: "Buyer" };

export default function Contacts() {
  const { db, companyId, add, markSeen } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [towerFilter, setTowerFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  // A contact "belongs" to a tower through a contract (as tenant) or a lead.
  const towerContactIds = useMemo(() => {
    if (towerFilter === "all") return null;
    const set = new Set();
    s.contracts.forEach((c) => c.towerId === towerFilter && set.add(c.tenantId));
    s.leads.forEach((l) => l.towerId === towerFilter && set.add(l.contactId));
    return set;
  }, [s, towerFilter]);

  const filtered = s.contacts.filter((c) => {
    if (kind !== "all" && !(c.kind || []).includes(kind)) return false;
    if (towerContactIds && !towerContactIds.has(c.id)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q) ||
      phoneMatch(c.phone, q) || (c.company || "").toLowerCase().includes(q);
  });

  const countBy = (k) => s.contacts.filter((c) => (c.kind || []).includes(k)).length;

  return (
    <div className="page">
      <PageHeader
        title="Contacts"
        subtitle={`${s.contacts.length} people & companies`}
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Add contact</button>}
      />

      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" placeholder="Search name, email, phone, company" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="spacer" />
        <TowerFilter towers={s.towers} value={towerFilter} onChange={setTowerFilter} />
        <div className="seg">
          {KINDS.map((k) => (
            <button key={k.key} data-active={kind === k.key} onClick={() => setKind(k.key)}>
              {k.label}{k.key !== "all" && ` (${countBy(k.key)})`}
            </button>
          ))}
        </div>
      </div>

      <section className="card card-table">
        <table className="table">
          <thead>
            <tr><th>Contact</th><th>Type</th><th>Phone</th><th>Email</th></tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className={`row-click ${c.isNew ? "row-new" : ""}`} onClick={() => { markSeen("contacts", c.id); setOpenId(c.id); }}>
                <td>
                  <div className="cell-tenant">
                    <span className="avatar avatar-sm">{initials(c.name)}</span>
                    <div>
                      <div className="tn-name">{c.name}<NewFlag show={c.isNew} /></div>
                      {c.company && <div className="tn-sub">{c.company}</div>}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="chips">
                    {(c.kind || []).map((k) => <span key={k} className="badge badge-neutral">{KIND_LABEL[k] || k}</span>)}
                  </div>
                </td>
                <td className="t-muted">{c.phone || "—"}</td>
                <td className="t-muted">{c.email || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4}><div className="empty"><Search /><p>No contacts match your search.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </section>

      <ContactDrawer contact={openId ? s.contacts.find((c) => c.id === openId) : null} s={s} onClose={() => setOpenId(null)} />
      <AddContactDrawer open={addOpen} onClose={() => setAddOpen(false)} onAdd={(rec) => add("contacts", { companyId, ...rec })} />
    </div>
  );
}

function ContactDrawer({ contact, s, onClose }) {
  const { update, remove } = useData();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  if (!contact) return <Drawer open={false} onClose={onClose} />;
  const ix = indexAll(s);
  const contracts = s.contracts.filter((c) => c.tenantId === contact.id);
  const leads = s.leads.filter((l) => l.contactId === contact.id);

  // Guard: a contact can only be deleted once nothing references it.
  const refList = [
    ["contract", contracts.length],
    ["cheque", s.cheques.filter((c) => c.contactId === contact.id).length],
    ["receipt", s.receipts.filter((r) => r.contactId === contact.id).length],
    ["payment voucher", s.vouchers.filter((v) => v.payeeId === contact.id).length],
    ["supplier bill", s.bills.filter((b) => b.supplierId === contact.id).length],
    ["maintenance request", s.maintenance.filter((m) => m.reporterId === contact.id).length],
    ["booking", s.bookings.filter((b) => b.contactId === contact.id).length],
    ["lead", leads.length],
    ["case", s.cases.filter((x) => x.contactId === contact.id).length],
    ["purchase order", s.purchaseOrders.filter((p) => p.supplierId === contact.id).length],
  ].filter(([, n]) => n > 0);
  const refTotal = refList.reduce((a, [, n]) => a + n, 0);
  const refSummary = refList.map(([label, n]) => `${n} ${label}${n === 1 ? "" : "s"}`).join(", ");
  async function handleDelete() {
    const ok = await confirm({
      title: `Delete ${contact.name}?`,
      message: "This permanently removes the contact. This can't be undone.",
      confirmLabel: "Delete contact",
    });
    if (ok) { remove("contacts", contact.id); onClose(); }
  }
  return (
    <Drawer open onClose={onClose} title={contact.name} subtitle={(contact.kind || []).map((k) => KIND_LABEL[k] || k).join(" · ")}
      footer={editing ? (
        <>
          <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn btn-primary" form="edit-contact" type="submit">Save changes</button>
        </>
      ) : (
        <>
          <button className="btn btn-danger" type="button" disabled={refTotal > 0}
            title={refTotal > 0 ? "Remove linked records first" : "Delete contact"} onClick={handleDelete}>
            <Trash2 /> Delete
          </button>
          <div className="spacer" />
          <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        </>
      )}>
      {editing ? (
        <EditContactForm contact={contact} onSave={(patch) => { update("contacts", contact.id, patch); setEditing(false); }} />
      ) : (
      <>
      <div className="sec-head">
        <h3 className="t-h3">Details</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil /> Edit</button>
      </div>
      <div className="detail-list" style={{ marginBottom: 18 }}>
        <Row icon={Mail} k="Email" v={contact.email || "—"} />
        <Row icon={Phone} k="Phone" v={contact.phone || "—"} />
        {contact.emiratesId && <Row icon={IdCard} k="Emirates ID" v={contact.emiratesId} />}
        {contact.nationality && <Row icon={Globe} k="Nationality" v={contact.nationality} />}
        {contact.company && <Row icon={Building} k="Company" v={contact.company} />}
      </div>

      {contracts.length > 0 && (
        <>
          <h3 className="t-h3" style={{ marginBottom: 10 }}>Contracts</h3>
          <div className="mini-list" style={{ marginBottom: 18 }}>
            {contracts.map((c) => (
              <div className="mini-row" key={c.id}>
                <span>{ix.towers[c.towerId]?.name} · {ix.units[c.unitId]?.label}</span>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </>
      )}
      {leads.length > 0 && (
        <>
          <h3 className="t-h3" style={{ marginBottom: 10 }}>Leads</h3>
          <div className="mini-list">
            {leads.map((l) => (
              <div className="mini-row" key={l.id}><span>{l.interest}</span><StatusBadge status={l.stage} /></div>
            ))}
          </div>
        </>
      )}
      {contracts.length === 0 && leads.length === 0 && (
        <p className="t-muted" style={{ fontSize: 13 }}>No contracts or leads linked to this contact yet.</p>
      )}
      {refTotal > 0 && (
        <p className="t-faint" style={{ fontSize: 12, marginTop: 16 }}>
          Linked to {refSummary}. Remove those before this contact can be deleted.
        </p>
      )}
      </>
      )}
    </Drawer>
  );
}

function EditContactForm({ contact, onSave }) {
  const [form, setForm] = useState({
    name: contact.name, kind: (contact.kind || ["tenant"])[0], email: contact.email || "",
    phone: contact.phone || "", company: contact.company || "", nationality: contact.nationality || "",
    emiratesId: contact.emiratesId || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  function submit(e) {
    e.preventDefault();
    // keep any extra kinds the contact already had, with the chosen one primary
    const kind = Array.from(new Set([form.kind, ...(contact.kind || [])]));
    onSave({ name: form.name.trim() || contact.name, kind, email: form.email, phone: form.phone, company: form.company, nationality: form.nationality, emiratesId: form.emiratesId });
  }
  return (
    <form id="edit-contact" onSubmit={submit} className="form-grid">
      <label className="field full"><span>Full name / company</span>
        <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
      <label className="field"><span>Primary type</span>
        <select className="select" value={form.kind} onChange={(e) => set("kind", e.target.value)}>
          {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select></label>
      <label className="field"><span>Phone</span>
        <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label>
      <label className="field full"><span>Email</span>
        <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></label>
      <label className="field"><span>Company</span>
        <input className="input" value={form.company} onChange={(e) => set("company", e.target.value)} /></label>
      <label className="field"><span>Nationality</span>
        <input className="input" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} /></label>
      <label className="field full"><span>Emirates ID</span>
        <input className="input" value={form.emiratesId} onChange={(e) => set("emiratesId", e.target.value)} /></label>
    </form>
  );
}

function Row({ icon: Icon, k, v }) {
  return (
    <div className="detail-row">
      <span className="k"><Icon size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

function AddContactDrawer({ open, onClose, onAdd }) {
  const blank = { name: "", kind: "tenant", email: "", phone: "", company: "", nationality: "" };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name is required.");
    onAdd({ ...form, name: form.name.trim(), kind: [form.kind] });
    setForm(blank); setError(""); onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add a contact" subtitle="Tenant, owner, supplier, lead or buyer"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="add-contact" type="submit">Add contact</button>
      </>}>
      <form id="add-contact" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Full name / company</span>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus /></label>
        <label className="field"><span>Type</span>
          <select className="select" value={form.kind} onChange={(e) => set("kind", e.target.value)}>
            {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></label>
        <label className="field"><span>Phone</span>
          <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+971 50 000 0000" /></label>
        <label className="field full"><span>Email</span>
          <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></label>
        <label className="field"><span>Company (optional)</span>
          <input className="input" value={form.company} onChange={(e) => set("company", e.target.value)} /></label>
        <label className="field"><span>Nationality (optional)</span>
          <input className="input" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}
