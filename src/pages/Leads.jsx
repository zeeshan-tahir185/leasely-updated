import { useMemo, useState } from "react";
import { Plus, Target, ArrowRight, Pencil, RotateCcw, XCircle, Trash2 } from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll } from "../lib/domain";
import { fmtMoney, fmtDate, initials, todayISO } from "../lib/format";

const LOST_REASONS = ["Budget too high", "Chose another property", "Location not suitable", "Went quiet / unresponsive", "Timing not right", "Other"];
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import NewFlag from "../components/NewFlag";
import { useConfirm } from "../components/ConfirmDialog";

const STAGES = [
  { key: "new", label: "New", color: "oklch(0.62 0.13 250)" },
  { key: "contacted", label: "Contacted", color: "oklch(0.65 0.13 200)" },
  { key: "viewing", label: "Viewing", color: "oklch(0.74 0.13 78)" },
  { key: "negotiation", label: "Negotiation", color: "oklch(0.6 0.15 300)" },
  { key: "won", label: "Won", color: "oklch(0.57 0.12 150)" },
  { key: "lost", label: "Lost", color: "oklch(0.62 0.16 28)" },
];

function ago(iso) {
  if (!iso) return "";
  const d = Math.round((Date.now() - new Date(iso)) / 86400000);
  return d <= 0 ? "today" : d === 1 ? "1 day ago" : `${d} days ago`;
}

export default function Leads() {
  const { db, companyId, add, update, remove, markSeen } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const ix = indexAll(s);
  const [openId, setOpenId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [stage, setStage] = useState("all");

  const stageDef = (k) => STAGES.find((x) => x.key === k) || { label: k, color: "var(--muted)" };
  const countBy = (k) => s.leads.filter((l) => l.stage === k).length;
  const filtered = (stage === "all" ? s.leads : s.leads.filter((l) => l.stage === stage))
    .slice()
    .sort((a, b) => STAGES.findIndex((x) => x.key === a.stage) - STAGES.findIndex((x) => x.key === b.stage)
      || new Date(b.createdAt) - new Date(a.createdAt));
  const lead = openId ? s.leads.find((l) => l.id === openId) : null;
  const pipelineValue = s.leads.filter((l) => !["won", "lost"].includes(l.stage)).reduce((a, l) => a + l.budget, 0);

  return (
    <div className="page">
      <PageHeader
        title="Leads & CRM"
        subtitle={`${s.leads.length} leads · ${fmtMoney(pipelineValue)} open pipeline value`}
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Add lead</button>}
      />

      <div className="toolbar">
        <div className="seg seg-wrap">
          <button data-active={stage === "all"} onClick={() => setStage("all")}>All ({s.leads.length})</button>
          {STAGES.map((st) => (
            <button key={st.key} data-active={stage === st.key} onClick={() => setStage(st.key)}>
              {st.label} ({countBy(st.key)})
            </button>
          ))}
        </div>
      </div>

      <section className="card card-table">
        <table className="table">
          <thead>
            <tr><th>Lead</th><th>Interested in</th><th>Stage</th><th>Source</th><th className="num">Budget</th><th>Added</th></tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const c = ix.contacts[l.contactId];
              const st = stageDef(l.stage);
              return (
                <tr key={l.id} className={`row-click ${l.stage === "lost" ? "row-muted" : ""} ${l.isNew ? "row-new" : ""}`} onClick={() => { markSeen("leads", l.id); setOpenId(l.id); }}>
                  <td>
                    <div className="cell-tenant">
                      <span className="avatar avatar-sm">{initials(c?.name || "?")}</span>
                      <div>
                        <div className="tn-name">{c?.name || "Unknown"}<NewFlag show={l.isNew} /></div>
                        <div className="tn-sub">{c?.phone || ""}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="tn-name" style={{ fontWeight: 500 }}>{l.interest}</div>
                    <div className="tn-sub">{ix.towers[l.towerId]?.name || ""}</div>
                  </td>
                  <td><span className="stage-cell"><span className="crm-dot" style={{ background: st.color }} />{st.label}</span></td>
                  <td className="t-muted">{l.source}</td>
                  <td className="num tnum">{fmtMoney(l.budget)}</td>
                  <td className="t-muted">{ago(l.createdAt)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6}><div className="empty"><Target /><p>No leads in this stage.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </section>

      {lead && (
        <LeadDrawer lead={lead} contact={ix.contacts[lead.contactId]} tower={ix.towers[lead.towerId]} towers={s.towers}
          onStage={(stage) => update("leads", lead.id, { stage })}
          onLose={(reason) => update("leads", lead.id, { stage: "lost", lostReason: reason, lostAt: todayISO() })}
          onReopen={() => update("leads", lead.id, { stage: "contacted", lostReason: undefined, lostAt: undefined })}
          onSave={({ contact: cp, lead: lp }) => { if (cp) update("contacts", lead.contactId, cp); update("leads", lead.id, lp); }}
          onDelete={() => remove("leads", lead.id)}
          onClose={() => setOpenId(null)} />
      )}
      <AddLeadDrawer open={addOpen} onClose={() => setAddOpen(false)}
        onAdd={({ name, email, phone, ...rest }) => {
          const cid = add("contacts", { companyId, name: name.trim(), kind: ["lead"], email, phone });
          add("leads", { companyId, contactId: cid, createdAt: new Date().toISOString().slice(0, 10), ...rest });
        }} />
    </div>
  );
}

function LeadDrawer({ lead, contact, tower, towers, onStage, onLose, onReopen, onSave, onDelete, onClose }) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [losing, setLosing] = useState(false);
  async function handleDelete() {
    if (await confirm({ title: "Delete this lead?", message: "This removes the lead from your pipeline. The contact record is kept.", confirmLabel: "Delete lead" })) { onDelete(); onClose(); }
  }
  return (
    <Drawer open onClose={onClose} title={contact?.name || "Lead"} subtitle={lead.interest}
      footer={editing ? (
        <>
          <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn btn-primary" form="edit-lead" type="submit">Save changes</button>
        </>
      ) : (
        <>
          <button className="btn btn-danger" type="button" onClick={handleDelete}><Trash2 /> Delete</button>
          <div className="spacer" />
          <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        </>
      )}>
      {editing ? (
        <EditLeadForm lead={lead} contact={contact} towers={towers}
          onSubmit={(payload) => { onSave(payload); setEditing(false); }} />
      ) : (
      <>
      <div className="sec-head">
        <h3 className="t-h3">Details</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil /> Edit</button>
      </div>
      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">Budget</span><span className="v tnum">{fmtMoney(lead.budget)}</span></div>
        <div className="detail-row"><span className="k">Source</span><span className="v">{lead.source}</span></div>
        <div className="detail-row"><span className="k">Phone</span><span className="v">{contact?.phone || "—"}</span></div>
        <div className="detail-row"><span className="k">Email</span><span className="v">{contact?.email || "—"}</span></div>
        {tower && <div className="detail-row"><span className="k">Interested in</span><span className="v">{tower.name}</span></div>}
        <div className="detail-row"><span className="k">Created</span><span className="v">{fmtDate(lead.createdAt)}</span></div>
      </div>

      {lead.stage === "lost" && (
        <div className="lost-banner">
          <span>
            <XCircle size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
            <strong>Lead lost</strong>{lead.lostReason ? ` — ${lead.lostReason}` : ""}
            {lead.lostAt ? <span className="t-faint"> · {fmtDate(lead.lostAt)}</span> : null}
          </span>
          <button className="btn btn-sm" onClick={onReopen}><RotateCcw /> Reopen</button>
        </div>
      )}

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Move to stage</h3>
      <div className="stage-picker">
        {STAGES.map((st) => (
          <button key={st.key} className={`btn btn-sm ${lead.stage === st.key ? "btn-primary" : ""}`}
            onClick={() => (st.key === "lost" ? setLosing(true) : onStage(st.key))}>
            {st.label}
          </button>
        ))}
      </div>

      {losing && <LostReasonForm onCancel={() => setLosing(false)} onConfirm={(reason) => { onLose(reason); setLosing(false); }} />}

      {lead.stage === "won" && (
        <p className="t-muted" style={{ fontSize: 13, marginTop: 16 }}>
          <Target size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
          Won lead — create a booking or contract from the Contracts module <ArrowRight size={12} style={{ verticalAlign: -1 }} />
        </p>
      )}
      </>
      )}
    </Drawer>
  );
}

function LostReasonForm({ onCancel, onConfirm }) {
  const [reason, setReason] = useState(LOST_REASONS[0]);
  const [custom, setCustom] = useState("");
  const final = reason === "Other" ? custom.trim() : reason;
  return (
    <div className="inset-form">
      <div className="t-label" style={{ marginBottom: 10 }}>Why was this lead lost?</div>
      <div className="form-grid">
        <label className="field full"><span>Reason</span>
          <select className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
            {LOST_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select></label>
        {reason === "Other" && (
          <label className="field full"><span>Details</span>
            <input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="What happened?" autoFocus /></label>
        )}
        <div className="full" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm" type="button" onClick={() => onConfirm(final || "Other")}>Mark as lost</button>
        </div>
      </div>
    </div>
  );
}

function EditLeadForm({ lead, contact, towers, onSubmit }) {
  const [form, setForm] = useState({
    name: contact?.name || "", phone: contact?.phone || "", email: contact?.email || "",
    interest: lead.interest || "", budget: String(lead.budget || ""), source: lead.source || "Property Finder",
    towerId: lead.towerId || "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  function submit(e) {
    e.preventDefault();
    onSubmit({
      contact: { name: form.name.trim() || contact?.name, phone: form.phone, email: form.email },
      lead: { interest: form.interest, budget: Number(form.budget) || 0, source: form.source, towerId: form.towerId || undefined },
    });
  }
  return (
    <form id="edit-lead" onSubmit={submit} className="form-grid">
      <label className="field full"><span>Lead name</span>
        <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
      <label className="field"><span>Phone</span>
        <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label>
      <label className="field"><span>Email</span>
        <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></label>
      <label className="field"><span>Source</span>
        <select className="select" value={form.source} onChange={(e) => set("source", e.target.value)}>
          {["Property Finder", "Bayut", "Dubizzle", "Referral", "Walk-in", "Website"].map((x) => <option key={x}>{x}</option>)}
        </select></label>
      <label className="field"><span>Budget (AED/yr)</span>
        <input className="input" type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} /></label>
      <label className="field full"><span>Interest</span>
        <input className="input" value={form.interest} onChange={(e) => set("interest", e.target.value)} /></label>
      <label className="field full"><span>Interested in tower</span>
        <select className="select" value={form.towerId} onChange={(e) => set("towerId", e.target.value)}>
          <option value="">—</option>
          {towers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select></label>
    </form>
  );
}

function AddLeadDrawer({ open, onClose, onAdd }) {
  const blank = { name: "", email: "", phone: "", source: "Property Finder", interest: "", budget: "", stage: "new" };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Lead name is required.");
    onAdd({ ...form, budget: Number(form.budget) || 0 });
    setForm(blank); setError(""); onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add a lead" subtitle="New prospect for the pipeline"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="add-lead" type="submit">Add lead</button>
      </>}>
      <form id="add-lead" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Lead name</span>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus /></label>
        <label className="field"><span>Phone</span>
          <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label>
        <label className="field"><span>Email</span>
          <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></label>
        <label className="field"><span>Source</span>
          <select className="select" value={form.source} onChange={(e) => set("source", e.target.value)}>
            {["Property Finder", "Bayut", "Dubizzle", "Referral", "Walk-in", "Website"].map((x) => <option key={x}>{x}</option>)}
          </select></label>
        <label className="field"><span>Budget (AED/yr)</span>
          <input className="input" type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="120000" /></label>
        <label className="field full"><span>Interest</span>
          <input className="input" value={form.interest} onChange={(e) => set("interest", e.target.value)} placeholder="2BHK · Dubai Marina" /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}
