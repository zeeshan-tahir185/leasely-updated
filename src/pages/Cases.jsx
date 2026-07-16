import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Plus, Trash2, Scale, Siren, Gavel, Trophy, XCircle, RotateCcw,
} from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll } from "../lib/domain";
import { fmtDateLong, todayISO } from "../lib/format";
import { CASE_TYPES, CASE_STATUSES } from "../lib/constants";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import TowerFilter from "../components/TowerFilter";
import { useConfirm } from "../components/ConfirmDialog";
import SearchSelect from "../components/SearchSelect";
import NewFlag from "../components/NewFlag";

const TYPE_ICON = { legal: Scale, police: Siren };
const typeIcon = (t) => TYPE_ICON[t] || Scale;
const TYPE_LABEL = { legal: "Legal", police: "Police" };
const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const STATUS_FILTERS = ["all", ...CASE_STATUSES];
const RANK = { open: 0, in_court: 1, won: 2, lost: 3, closed: 4 };
const isActive = (st) => st === "open" || st === "in_court";

// Forward transitions (and reopen), mirroring the cheque/maintenance flows.
const NEXT = {
  open: ["in_court", "won", "lost"],
  in_court: ["won", "lost"],
  won: ["closed", "open"],
  lost: ["closed", "open"],
  closed: ["open"],
};
const ACTION = { in_court: "Take to court", won: "Mark won", lost: "Mark lost", closed: "Close case", open: "Reopen" };

export default function Cases() {
  const { db, companyId, markSeen } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const ix = indexAll(s);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [towerFilter, setTowerFilter] = useState("all");
  const [searchParams] = useSearchParams();
  const [openId, setOpenId] = useState(() => searchParams.get("open"));
  const [addOpen, setAddOpen] = useState(false);

  const rows = s.cases.map((c) => ({ c, party: ix.contacts[c.contactId], tower: ix.towers[c.towerId] }));

  const filtered = rows.filter((r) => {
    if (towerFilter !== "all" && r.c.towerId !== towerFilter) return false;
    if (status !== "all" && r.c.status !== status) return false;
    if (type !== "all" && r.c.type !== type) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (r.c.title || "").toLowerCase().includes(q) || (r.c.refNo || "").toLowerCase().includes(q) ||
      (r.party?.name || "").toLowerCase().includes(q) || (r.tower?.name || "").toLowerCase().includes(q);
  }).sort((a, b) => (RANK[a.c.status] - RANK[b.c.status]) || (b.c.openedAt || "").localeCompare(a.c.openedAt || ""));

  const open = s.cases.filter((c) => c.status === "open");
  const inCourt = s.cases.filter((c) => c.status === "in_court");
  const won = s.cases.filter((c) => c.status === "won");
  const lost = s.cases.filter((c) => c.status === "lost");

  return (
    <div className="page">
      <PageHeader title="Legal & Police" subtitle={`${s.cases.length} case${s.cases.length === 1 ? "" : "s"} on file`}
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Open a case</button>} />

      <div className="kpi-grid kpi-4">
        <StatCard label="Open" Icon={Scale} tone={open.length ? "accent" : "neutral"} value={open.length} hint="awaiting action" />
        <StatCard label="In court" Icon={Gavel} tone={inCourt.length ? "danger" : "neutral"} value={inCourt.length} hint="escalated" />
        <StatCard label="Won" Icon={Trophy} tone="success" value={won.length} hint="resolved in favour" />
        <StatCard label="Lost" Icon={XCircle} tone={lost.length ? "danger" : "neutral"} value={lost.length} hint="ruled against" />
      </div>

      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" placeholder="Search title, ref no, party" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="spacer" />
        <TowerFilter towers={s.towers} value={towerFilter} onChange={setTowerFilter} />
        <div className="period-ctl">
          <Scale className="period-ic" />
          <select className="select period-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by case type">
            <option value="all">All types</option>
            {CASE_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
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
        <div className="list-cap">{filtered.length} case{filtered.length === 1 ? "" : "s"} in view</div>
      </div>

      <section className="card card-table">
        <table className="table">
          <thead>
            <tr><th>Case</th><th>Party</th><th>Tower</th><th>Type</th><th>Opened</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(({ c, party, tower }) => {
              const Icon = typeIcon(c.type);
              return (
                <tr key={c.id} className={`row-click ${c.status === "in_court" ? "row-overdue" : ""} ${c.isNew ? "row-new" : ""}`} onClick={() => { markSeen("cases", c.id); setOpenId(c.id); }}>
                  <td>
                    <div className="cell-tenant">
                      <span className="mt-ic"><Icon strokeWidth={1.8} /></span>
                      <div><div className="tn-name">{c.title}<NewFlag show={c.isNew} /></div><div className="tn-sub">{c.refNo || "—"}</div></div>
                    </div>
                  </td>
                  <td>{party?.name || "—"}</td>
                  <td className="t-muted">{tower?.name || "—"}</td>
                  <td><span className="chip">{TYPE_LABEL[c.type] || c.type}</span></td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{fmtDateLong(c.openedAt)}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6}><div className="empty"><Scale /><p>No cases match.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </section>

      {openId && <CaseDrawer key={openId} id={openId} s={s} onClose={() => setOpenId(null)} />}
      <AddCaseDrawer open={addOpen} onClose={() => setAddOpen(false)} s={s} />
    </div>
  );
}

function AddCaseDrawer({ open, onClose, s }) {
  const { add, companyId } = useData();
  const blank = { type: "", title: "", contactId: "", towerId: "", refNo: "" };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Buildings the chosen party actually holds units in (from their contracts).
  // null = no contracts found (e.g. a supplier or former tenant) → don't restrict.
  const tenantTowerIds = useMemo(() => {
    if (!form.contactId) return null;
    const ids = new Set(s.contracts.filter((ct) => ct.tenantId === form.contactId).map((ct) => ct.towerId));
    return ids.size ? ids : null;
  }, [form.contactId, s.contracts]);
  const towerOptions = (tenantTowerIds ? s.towers.filter((t) => tenantTowerIds.has(t.id)) : s.towers)
    .map((t) => ({ value: t.id, label: t.name }));

  // Choosing a party keeps the building in sync: auto-pick when they have exactly
  // one building, and clear a building that isn't theirs.
  function chooseParty(contactId) {
    const ids = new Set(s.contracts.filter((ct) => ct.tenantId === contactId).map((ct) => ct.towerId));
    setForm((f) => {
      let towerId = f.towerId;
      if (ids.size === 1) towerId = [...ids][0];
      else if (ids.size && !ids.has(towerId)) towerId = "";
      return { ...f, contactId, towerId };
    });
  }

  function submit(e) {
    e.preventDefault();
    if (!form.type) return setError("Choose a case type.");
    if (!form.title.trim()) return setError("Describe the case in the title.");
    add("cases", {
      companyId, type: form.type, title: form.title.trim(),
      contactId: form.contactId || undefined, towerId: form.towerId || undefined,
      refNo: form.refNo.trim() || undefined, status: "open", openedAt: todayISO(),
    });
    setForm(blank); setError(""); onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Open a case" subtitle="Log a legal or police matter"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="add-case" type="submit">Open case</button>
      </>}>
      <form id="add-case" onSubmit={submit} className="form-grid">
        <label className="field"><span>Type</span>
          <select className="select" value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="">Select type…</option>
            {CASE_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select></label>
        <label className="field"><span>Reference no.</span>
          <input className="input" value={form.refNo} onChange={(e) => set("refNo", e.target.value)} placeholder="e.g. RDC-2026-1187" /></label>
        <label className="field full"><span>Title</span>
          <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Bounced cheque — tenant name" /></label>
        <label className="field"><span>Party (optional)</span>
          <SearchSelect value={form.contactId} onChange={chooseParty}
            options={s.contacts.map((c) => ({ value: c.id, label: c.name, sub: c.phone }))} placeholder="Select…" />
        </label>
        <label className="field"><span>Tower (optional)</span>
          <SearchSelect value={form.towerId} onChange={(v) => set("towerId", v)} options={towerOptions}
            placeholder={tenantTowerIds ? "This tenant's building…" : "Select…"} />
          {tenantTowerIds && <small style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Showing only buildings this tenant has units in.</small>}
        </label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}

function CaseDrawer({ id, s, onClose }) {
  const { update, remove } = useData();
  const confirm = useConfirm();
  const ix = indexAll(s);
  const c = s.cases.find((x) => x.id === id);
  const [form, setForm] = useState(() => (c ? {
    type: c.type, title: c.title, contactId: c.contactId || "", towerId: c.towerId || "", refNo: c.refNo || "", notes: c.notes || "",
  } : null));
  if (!c) return <Drawer open={false} onClose={onClose} />;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const party = ix.contacts[c.contactId];
  const tower = ix.towers[c.towerId];
  const Icon = typeIcon(c.type);

  function saveDetails(e) {
    e.preventDefault();
    update("cases", id, {
      type: form.type, title: form.title.trim() || c.title, contactId: form.contactId || undefined,
      towerId: form.towerId || undefined, refNo: form.refNo.trim() || undefined, notes: form.notes.trim() || undefined,
    });
    onClose();
  }
  async function handleDelete() {
    if (await confirm({ title: "Delete this case?", message: "This permanently removes the case from the file. This can't be undone.", confirmLabel: "Delete case" })) {
      remove("cases", id); onClose();
    }
  }

  return (
    <Drawer open onClose={onClose} title={c.title} subtitle={`${TYPE_LABEL[c.type] || c.type} · ${c.refNo || "no reference"}`}
      footer={<>
        <button className="btn btn-danger" type="button" aria-label="Delete case" title="Delete case" onClick={handleDelete}><Trash2 /></button>
        <div className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <button className="btn btn-primary" form="edit-case" type="submit">Save changes</button>
      </>}>
      <div className="drawer-tenant">
        <span className="mt-ic lg"><Icon strokeWidth={1.7} /></span>
        <div>
          <div className="t-h2">{c.title}</div>
          <div className="t-muted" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
            <StatusBadge status={c.status} />
            <span className="chip">{TYPE_LABEL[c.type] || c.type}</span>
          </div>
        </div>
      </div>

      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">Party</span><span className="v">{party?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">Tower</span><span className="v">{tower?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">Reference no.</span><span className="v">{c.refNo || "—"}</span></div>
        <div className="detail-row"><span className="k">Opened</span><span className="v">{fmtDateLong(c.openedAt)}</span></div>
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Status</h3>
      <div className="stage-picker" style={{ marginBottom: 20 }}>
        {(NEXT[c.status] || []).map((next) => {
          const reopen = next === "open" && isActive(c.status) === false;
          const primary = next === "won" || next === "in_court";
          return (
            <button key={next} className={`btn btn-sm ${primary ? "btn-primary" : "btn-ghost"}`} onClick={() => update("cases", id, { status: next })}>
              {reopen ? <><RotateCcw /> Reopen</> : <>{next === "won" && <Trophy />}{next === "in_court" && <Gavel />}{ACTION[next]}</>}
            </button>
          );
        })}
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Case details</h3>
      <form id="edit-case" onSubmit={saveDetails} className="form-grid">
        <label className="field"><span>Type</span>
          <select className="select" value={form.type} onChange={(e) => set("type", e.target.value)}>
            {CASE_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select></label>
        <label className="field"><span>Reference no.</span>
          <input className="input" value={form.refNo} onChange={(e) => set("refNo", e.target.value)} /></label>
        <label className="field full"><span>Title</span>
          <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} /></label>
        <label className="field"><span>Party</span>
          <SearchSelect value={form.contactId} onChange={(v) => set("contactId", v)}
            options={s.contacts.map((x) => ({ value: x.id, label: x.name, sub: x.phone }))} placeholder="—" />
        </label>
        <label className="field"><span>Tower</span>
          <SearchSelect value={form.towerId} onChange={(v) => set("towerId", v)} options={s.towers.map((t) => ({ value: t.id, label: t.name }))} placeholder="—" />
        </label>
        <label className="field full"><span>Notes</span>
          <textarea className="input textarea" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Hearing dates, filings, outcomes…" /></label>
      </form>
    </Drawer>
  );
}
