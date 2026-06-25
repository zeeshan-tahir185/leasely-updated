import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Plus, Wrench, Snowflake, Droplets, Zap, Hammer, WashingMachine, Bug, Sparkles,
  ChevronsUp, ChevronUp, Minus, ChevronDown, CircleDot, Clock, RefreshCw, CheckCircle2, Flag, Trash2,
} from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll, daysUntil, activeContracts } from "../lib/domain";
import { fmtDate, fmtDateLong, todayISO } from "../lib/format";
import { MAINTENANCE_CATEGORIES, MAINTENANCE_PRIORITIES, MAINTENANCE_STATUSES } from "../lib/constants";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import TowerFilter from "../components/TowerFilter";
import { useConfirm } from "../components/ConfirmDialog";
import SearchSelect from "../components/SearchSelect";
import NewFlag from "../components/NewFlag";

// Map each category to a glyph so a request reads at a glance.
const CAT_ICON = {
  "AC / Cooling": Snowflake,
  Plumbing: Droplets,
  Electrical: Zap,
  Carpentry: Hammer,
  Appliances: WashingMachine,
  "Pest Control": Bug,
  Cleaning: Sparkles,
  General: Wrench,
};
const catIcon = (c) => CAT_ICON[c] || Wrench;

// Priority: colour + icon + word. Rank drives the default sort (urgent first).
const PRIO = {
  urgent: { label: "Urgent", Icon: ChevronsUp, cls: "prio-urgent", rank: 0 },
  high: { label: "High", Icon: ChevronUp, cls: "prio-high", rank: 1 },
  medium: { label: "Medium", Icon: Minus, cls: "prio-medium", rank: 2 },
  low: { label: "Low", Icon: ChevronDown, cls: "prio-low", rank: 3 },
};

const isOpen = (st) => !["resolved", "closed"].includes(st);

// Forward (and reopen) transitions, mirroring the cheque status flow.
const NEXT = {
  new: ["assigned", "in_progress", "resolved"],
  assigned: ["in_progress", "resolved"],
  in_progress: ["resolved"],
  resolved: ["closed", "new"],
  closed: ["new"],
};
const ACTION_LABEL = { assigned: "Assign", in_progress: "Start work", resolved: "Mark resolved", closed: "Close request" };
const STATUS_FILTERS = ["all", ...MAINTENANCE_STATUSES];
const titleCase = (s) => String(s).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const ageDays = (iso) => Math.max(0, -daysUntil(iso));
const STALE_DAYS = 7; // an open request older than this turns its age red

function PriorityChip({ priority }) {
  const p = PRIO[priority] || PRIO.medium;
  const { Icon } = p;
  return <span className={`prio ${p.cls}`}><Icon strokeWidth={2.5} /> {p.label}</span>;
}

export default function Maintenance() {
  const { db, companyId, markSeen } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const ix = indexAll(s);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [towerFilter, setTowerFilter] = useState("all");
  const [searchParams] = useSearchParams();
  const [openId, setOpenId] = useState(() => searchParams.get("open")); // deep-link from an alert
  const [addOpen, setAddOpen] = useState(false);

  const rows = s.maintenance.map((m) => ({
    m,
    reporter: ix.contacts[m.reporterId],
    tower: ix.towers[m.towerId],
    unit: ix.units[m.unitId],
  }));

  const filtered = rows
    .filter((r) => {
      if (towerFilter !== "all" && r.m.towerId !== towerFilter) return false;
      if (status !== "all" && r.m.status !== status) return false;
      if (priority !== "all" && r.m.priority !== priority) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        r.m.title.toLowerCase().includes(q) ||
        (r.m.category || "").toLowerCase().includes(q) ||
        (r.reporter?.name || "").toLowerCase().includes(q) ||
        (r.tower?.name || "").toLowerCase().includes(q) ||
        (r.unit?.label || "").toLowerCase().includes(q)
      );
    })
    // Open before done; then by priority; then oldest first.
    .sort((a, b) => {
      const oa = isOpen(a.m.status), ob = isOpen(b.m.status);
      if (oa !== ob) return oa ? -1 : 1;
      const pr = (PRIO[a.m.priority]?.rank ?? 2) - (PRIO[b.m.priority]?.rank ?? 2);
      if (pr) return pr;
      return (a.m.createdAt || "").localeCompare(b.m.createdAt || "");
    });

  const costInView = filtered.reduce((acc, r) => acc + (r.m.cost || 0), 0);

  // KPIs — the action-oriented cut a manager scans first.
  const open = s.maintenance.filter((m) => isOpen(m.status));
  const pressing = open.filter((m) => m.priority === "urgent" || m.priority === "high");
  const unassigned = s.maintenance.filter((m) => m.status === "new");
  const resolved = s.maintenance.filter((m) => m.status === "resolved");

  return (
    <div className="page">
      <PageHeader
        title="Maintenance"
        subtitle={`${s.maintenance.length} work order${s.maintenance.length === 1 ? "" : "s"} on record`}
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Log request</button>}
      />

      <div className="kpi-grid kpi-4">
        <StatCard label="Open requests" Icon={Wrench} tone="primary" value={open.length} hint={`of ${s.maintenance.length} total`} />
        <StatCard label="Urgent & high" Icon={ChevronsUp} tone={pressing.length ? "danger" : "neutral"} value={pressing.length} hint="open, need attention" />
        <StatCard label="Awaiting triage" Icon={CircleDot} tone={unassigned.length ? "accent" : "neutral"} value={unassigned.length} hint="logged, not assigned" />
        <StatCard label="Resolved" Icon={CheckCircle2} tone="success" value={resolved.length} hint="awaiting close-out" />
      </div>

      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" placeholder="Search title, category, reporter, unit" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="spacer" />
        <TowerFilter towers={s.towers} value={towerFilter} onChange={setTowerFilter} />
        <div className="period-ctl">
          <Flag className="period-ic" />
          <select className="select period-select" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
            <option value="all">All priorities</option>
            {MAINTENANCE_PRIORITIES.map((p) => <option key={p} value={p}>{PRIO[p].label}</option>)}
          </select>
        </div>
      </div>

      <div className="filter-bar">
        <div className="seg seg-wrap">
          {STATUS_FILTERS.map((st) => (
            <button key={st} data-active={status === st} onClick={() => setStatus(st)}>
              {st === "all" ? "All statuses" : titleCase(st)}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className="list-cap">
          {filtered.length} request{filtered.length === 1 ? "" : "s"} in view · spend <Money value={costInView} />
        </div>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr><th>Request</th><th>Property / Unit</th><th>Reported by</th><th>Priority</th><th>Logged</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(({ m, reporter, tower, unit }) => {
              const Icon = catIcon(m.category);
              const age = ageDays(m.createdAt);
              const stale = isOpen(m.status) && age > STALE_DAYS;
              return (
                <tr key={m.id} className={`row-click ${m.isNew ? "row-new" : ""}`} onClick={() => { markSeen("maintenance", m.id); setOpenId(m.id); }}>
                  <td>
                    <div className="cell-tenant">
                      <span className="mt-ic"><Icon strokeWidth={1.8} /></span>
                      <div>
                        <div className="tn-name">{m.title}<NewFlag show={m.isNew} /></div>
                        <div className="tn-sub">{m.category}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="tn-name" style={{ fontWeight: 500 }}>{tower?.name || "—"}</div>
                    {unit && <div className="tn-sub">Unit {unit.label}</div>}
                  </td>
                  <td>{reporter?.name || <span className="t-muted">—</span>}</td>
                  <td><PriorityChip priority={m.priority} /></td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>
                    {fmtDateLong(m.createdAt)}
                    {isOpen(m.status) && <span className={stale ? "t-danger" : ""}> · {age}d open</span>}
                  </td>
                  <td><StatusBadge status={m.status} /></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6}><div className="empty"><Wrench /><p>No work orders match.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </section>

      {openId && <WorkOrderDrawer key={openId} id={openId} s={s} onClose={() => setOpenId(null)} />}
      <AddRequestDrawer open={addOpen} onClose={() => setAddOpen(false)} s={s} />
    </div>
  );
}

function AddRequestDrawer({ open, onClose, s }) {
  const { add, companyId } = useData();
  const blank = {
    towerId: "", unitId: "", reporterId: "",
    category: "", priority: "", title: "", notes: "",
  };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const unitsInTower = s.units.filter((u) => u.towerId === form.towerId);
  const tenants = s.contacts.filter((c) => (c.kind || []).includes("tenant"));
  const active = activeContracts(s);
  // A unit's current tenant becomes the default reporter when that unit is picked.
  const tenantForUnit = (unitId) => active.find((c) => c.unitId === unitId)?.tenantId || "";
  const selectedUnit = unitsInTower.find((u) => u.id === form.unitId);

  function submit(e) {
    e.preventDefault();
    if (!form.towerId) return setError("Choose a property.");
    if (!form.unitId) return setError("Choose the unit the issue is in.");
    if (!form.title.trim()) return setError("Describe the issue in the title.");
    if (!form.category) return setError("Choose a category.");
    if (!form.priority) return setError("Set a priority.");
    add("maintenance", {
      companyId,
      towerId: form.towerId,
      unitId: form.unitId,
      reporterId: form.reporterId || undefined,
      category: form.category,
      priority: form.priority,
      title: form.title.trim(),
      notes: form.notes.trim() || undefined,
      status: "new",
      createdAt: todayISO(),
    });
    setForm(blank); setError(""); onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Log a request" subtitle="Record a maintenance issue for a unit"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="add-mt" type="submit">Log request</button>
      </>}>
      <form id="add-mt" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Title</span>
          <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. AC not cooling in master bedroom" /></label>
        <label className="field"><span>Property</span>
          <SearchSelect value={form.towerId} onChange={(v) => setForm((f) => ({ ...f, towerId: v, unitId: "", reporterId: "" }))}
            options={s.towers.map((t) => ({ value: t.id, label: t.name }))} placeholder="Select property…" />
        </label>
        <label className="field"><span>Unit</span>
          <select className="select" value={form.unitId}
            onChange={(e) => { const unitId = e.target.value; setForm((f) => ({ ...f, unitId, reporterId: tenantForUnit(unitId) })); }}>
            <option value="">Select unit…</option>
            {unitsInTower.map((u) => <option key={u.id} value={u.id}>Unit {u.label}</option>)}
          </select></label>
        <label className="field"><span>Category</span>
          <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Select category…</option>
            {MAINTENANCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
        <label className="field"><span>Priority</span>
          <select className="select" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            <option value="">Select priority…</option>
            {MAINTENANCE_PRIORITIES.map((p) => <option key={p} value={p}>{PRIO[p].label}</option>)}
          </select></label>
        <label className="field full"><span>Reported by (optional)</span>
          <SearchSelect value={form.reporterId} onChange={(v) => set("reporterId", v)}
            options={tenants.map((c) => ({ value: c.id, label: c.name, sub: c.phone }))} placeholder="Select tenant…" />
        </label>
        {selectedUnit && form.reporterId && form.reporterId === tenantForUnit(form.unitId) && (
          <p className="full t-muted" style={{ margin: 0, fontSize: 12 }}>
            Auto-filled from Unit {selectedUnit.label}'s tenant — change it if someone else reported the issue.
          </p>
        )}
        <label className="field full"><span>Notes (optional)</span>
          <textarea className="input textarea" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything the technician should know" /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}

function WorkOrderDrawer({ id, s, onClose }) {
  const { update, remove, can } = useData();
  const confirm = useConfirm();
  const ix = indexAll(s);
  const m = s.maintenance.find((x) => x.id === id);
  const suppliers = useMemo(() => s.contacts.filter((c) => (c.kind || []).includes("supplier")), [s.contacts]);
  const [form, setForm] = useState(() => ({ assignee: m?.assignee || "", cost: m?.cost ?? "", notes: m?.notes || "" }));
  if (!m) return <Drawer open={false} onClose={onClose} />;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const reporter = ix.contacts[m.reporterId];
  const tower = ix.towers[m.towerId];
  const unit = ix.units[m.unitId];
  const Icon = catIcon(m.category);
  const age = ageDays(m.createdAt);

  function setStatus(next) {
    update("maintenance", id, { status: next });
  }
  function saveDetails(e) {
    e.preventDefault();
    update("maintenance", id, {
      assignee: form.assignee.trim() || undefined,
      cost: form.cost === "" ? undefined : Number(form.cost) || undefined,
      notes: form.notes.trim() || undefined,
    });
    onClose();
  }

  return (
    <Drawer open onClose={onClose} title={m.title} subtitle={`${m.category} · logged ${fmtDate(m.createdAt)}`}
      footer={<>
        <button className="btn btn-danger" type="button" aria-label="Delete work order" title="Delete work order" onClick={async () => {
          if (await confirm({ title: "Delete this work order?", message: "This permanently removes the request and its notes. This can't be undone.", confirmLabel: "Delete request" })) { remove("maintenance", id); onClose(); }
        }}><Trash2 /></button>
        <div className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <button className="btn btn-primary" form="edit-mt" type="submit">Save changes</button>
      </>}>
      <div className="drawer-tenant">
        <span className="mt-ic lg"><Icon strokeWidth={1.7} /></span>
        <div>
          <div className="t-h2">{m.title}</div>
          <div className="t-muted" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
            <StatusBadge status={m.status} />
            <PriorityChip priority={m.priority} />
            {isOpen(m.status) && <span style={{ fontSize: 13 }}>· open {age}d</span>}
          </div>
        </div>
      </div>

      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">Property</span><span className="v">{tower?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">Unit</span><span className="v">{unit ? `Unit ${unit.label}` : "Common area"}</span></div>
        <div className="detail-row"><span className="k">Reported by</span><span className="v">{reporter?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">Logged</span><span className="v">{fmtDateLong(m.createdAt)}</span></div>
        {m.assignee && <div className="detail-row"><span className="k">Assigned to</span><span className="v">{m.assignee}</span></div>}
        {can.viewFinancials && m.cost != null && <div className="detail-row"><span className="k">Cost</span><span className="v"><Money value={m.cost} /></span></div>}
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Update status</h3>
      <div className="stage-picker" style={{ marginBottom: 20 }}>
        {(NEXT[m.status] || []).map((next) => {
          const reopen = next === "new";
          const primary = next === "resolved" || next === "closed";
          return (
            <button key={next} className={`btn btn-sm ${primary ? "btn-primary" : "btn-ghost"}`} onClick={() => setStatus(next)}>
              {reopen ? <><RefreshCw /> Reopen</> : <>{next === "in_progress" && <Clock />}{ACTION_LABEL[next]}</>}
            </button>
          );
        })}
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Assignment & details</h3>
      <form id="edit-mt" onSubmit={saveDetails} className="form-grid">
        <label className={`field ${can.viewFinancials ? "" : "full"}`}><span>Assign to</span>
          <select className="select" value={form.assignee} onChange={(e) => set("assignee", e.target.value)}>
            <option value="">Unassigned</option>
            {[...new Set([form.assignee, ...suppliers.map((c) => c.name)].filter(Boolean))].map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select></label>
        {can.viewFinancials && (
          <label className="field"><span>Cost (AED)</span>
            <input className="input" type="number" min="0" value={form.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0" /></label>
        )}
        <label className="field full"><span>Notes</span>
          <textarea className="input textarea" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Work done, parts ordered, follow-up…" /></label>
      </form>
    </Drawer>
  );
}
