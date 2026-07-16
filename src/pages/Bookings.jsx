import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Plus, Trash2, CalendarCheck, Hourglass, CheckCircle2, AlertTriangle, FileText,
  Check, Ban, ArrowRight, RotateCcw,
} from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll, unitRows, daysUntil } from "../lib/domain";
import { fmtDateLong, todayISO, isoOf, phoneMatch } from "../lib/format";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import TowerFilter from "../components/TowerFilter";
import { useConfirm } from "../components/ConfirmDialog";
import SearchSelect from "../components/SearchSelect";
import NewFlag from "../components/NewFlag";

const titleCase = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());
const STATUS_FILTERS = ["all", "held", "confirmed", "converted", "cancelled"];
const RANK = { held: 0, confirmed: 1, converted: 2, cancelled: 3 };
const isActive = (st) => st === "held" || st === "confirmed";

export default function Bookings() {
  const { db, companyId, markSeen } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const ix = indexAll(s);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [towerFilter, setTowerFilter] = useState("all");
  const [searchParams] = useSearchParams();
  const [openId, setOpenId] = useState(() => searchParams.get("open"));
  const [addOpen, setAddOpen] = useState(false);

  const rows = s.bookings.map((b) => {
    const unit = ix.units[b.unitId];
    return { b, unit, tower: ix.towers[unit?.towerId], prospect: ix.contacts[b.contactId] };
  });

  const filtered = rows.filter((r) => {
    if (towerFilter !== "all" && r.unit?.towerId !== towerFilter) return false;
    if (status !== "all" && r.b.status !== status) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (r.prospect?.name || "").toLowerCase().includes(q) || (r.unit?.label || "").toLowerCase().includes(q) ||
      (r.tower?.name || "").toLowerCase().includes(q) || phoneMatch(r.prospect?.phone, q);
  }).sort((a, b) => (RANK[a.b.status] - RANK[b.b.status]) || a.b.expiresAt.localeCompare(b.b.expiresAt));

  const sum = (arr) => arr.reduce((acc, b) => acc + b.amount, 0);
  const held = s.bookings.filter((b) => b.status === "held");
  const confirmed = s.bookings.filter((b) => b.status === "confirmed");
  const expiring = s.bookings.filter((b) => isActive(b.status) && daysUntil(b.expiresAt) <= 3);
  const converted = s.bookings.filter((b) => b.status === "converted");

  return (
    <div className="page">
      <PageHeader title="Bookings" subtitle={`${s.bookings.length} unit reservation${s.bookings.length === 1 ? "" : "s"}`}
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> New booking</button>} />

      <div className="kpi-grid kpi-4">
        <StatCard label="On hold" Icon={Hourglass} tone="accent" value={held.length} hint={<Money value={sum(held)} />} />
        <StatCard label="Confirmed" Icon={CheckCircle2} tone="primary" value={confirmed.length} hint={<Money value={sum(confirmed)} />} />
        <StatCard label="Expiring soon" Icon={AlertTriangle} tone={expiring.length ? "danger" : "neutral"} value={expiring.length} hint="within 3 days" />
        <StatCard label="Converted" Icon={FileText} tone="success" value={converted.length} hint="became contracts" />
      </div>

      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" placeholder="Search prospect, phone, unit, tower" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="spacer" />
        <TowerFilter towers={s.towers} value={towerFilter} onChange={setTowerFilter} />
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
        <div className="list-cap">{filtered.length} booking{filtered.length === 1 ? "" : "s"} in view</div>
      </div>

      <section className="card card-table">
        <table className="table">
          <thead>
            <tr><th>Unit</th><th>Prospect</th><th className="num">Agreed rent</th><th>Booked</th><th>Expires</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(({ b, unit, tower, prospect }) => {
              const dleft = daysUntil(b.expiresAt);
              const expired = isActive(b.status) && dleft < 0;
              return (
                <tr key={b.id} className={`row-click ${expired ? "row-overdue" : ""} ${b.isNew ? "row-new" : ""}`} onClick={() => { markSeen("bookings", b.id); setOpenId(b.id); }}>
                  <td>
                    <div className="cell-tenant">
                      <span className="mt-ic"><CalendarCheck strokeWidth={1.8} /></span>
                      <div>
                        <div className="tn-name">{tower?.name || "—"}<NewFlag show={b.isNew} /></div>
                        <div className="tn-sub">Unit {unit?.label || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td>{prospect?.name || "—"}</td>
                  <td className="num"><Money value={b.amount} /></td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{fmtDateLong(b.date)}</td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>
                    {fmtDateLong(b.expiresAt)}
                    {isActive(b.status) && (expired ? <span className="t-danger"> · expired</span> : <span> · in {dleft}d</span>)}
                  </td>
                  <td><StatusBadge status={b.status} /></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6}><div className="empty"><CalendarCheck /><p>No bookings match.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </section>

      {openId && <BookingDrawer key={openId} id={openId} s={s} onClose={() => setOpenId(null)} />}
      <AddBookingDrawer open={addOpen} onClose={() => setAddOpen(false)} s={s} />
    </div>
  );
}

function AddBookingDrawer({ open, onClose, s }) {
  const { add, companyId } = useData();
  const activeBookedUnits = new Set(s.bookings.filter((b) => isActive(b.status)).map((b) => b.unitId));
  const vacancies = unitRows(s).filter((u) => u.vacant && !activeBookedUnits.has(u.unit.id));
  const towers = [...new Map(vacancies.map((u) => [u.tower.id, u.tower])).values()];
  const prospects = s.contacts.filter((c) => (c.kind || []).some((k) => ["lead", "buyer", "tenant"].includes(k)));

  const blank = { towerId: "", unitId: "", contactId: "", newProspect: "", amount: "", expiresAt: isoOf(new Date(Date.now() + 7 * 86400000)) };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const unitsInTower = vacancies.filter((u) => u.tower.id === form.towerId);

  function pickUnit(unitId) {
    const u = vacancies.find((x) => x.unit.id === unitId);
    setForm((f) => ({ ...f, unitId, amount: u ? String(u.unit.annualRent) : f.amount }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.unitId) return setError("Choose a vacant unit.");
    if (!form.contactId && !form.newProspect.trim()) return setError("Choose a prospect or enter a new one.");
    if (!Number(form.amount)) return setError("Enter the agreed annual rent.");
    let contactId = form.contactId;
    if (form.newProspect.trim()) contactId = add("contacts", { companyId, name: form.newProspect.trim(), kind: ["lead"] });
    add("bookings", {
      companyId, unitId: form.unitId, contactId, amount: Number(form.amount),
      status: "held", date: todayISO(), expiresAt: form.expiresAt,
    });
    setForm(blank); setError(""); onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="New booking" subtitle="Hold a vacant unit for a prospect"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="add-booking" type="submit">Create booking</button>
      </>}>
      <form id="add-booking" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Tower</span>
          <SearchSelect value={form.towerId} onChange={(v) => setForm((f) => ({ ...f, towerId: v, unitId: "" }))}
            options={towers.map((t) => ({ value: t.id, label: t.name }))} placeholder="Select a tower…" />
        </label>
        <label className="field full"><span>Vacant unit</span>
          <select className="select" value={form.unitId} onChange={(e) => pickUnit(e.target.value)} disabled={!form.towerId}>
            <option value="">{form.towerId ? "Select a unit…" : "Choose a tower first"}</option>
            {unitsInTower.map((u) => <option key={u.unit.id} value={u.unit.id}>{u.unit.label} · {u.unit.unitType}</option>)}
          </select>
          {form.towerId && unitsInTower.length === 0 && <span className="t-faint" style={{ fontSize: 12 }}>No bookable units in this tower.</span>}
        </label>
        <label className="field"><span>Prospect</span>
          <SearchSelect value={form.contactId} onChange={(v) => set("contactId", v)}
            options={prospects.map((c) => ({ value: c.id, label: c.name, sub: c.phone }))} placeholder="Select…" />
        </label>
        <label className="field"><span>…or new prospect</span>
          <input className="input" value={form.newProspect} onChange={(e) => set("newProspect", e.target.value)} placeholder="Full name" /></label>
        <label className="field"><span>Agreed rent (AED/yr)</span>
          <input className="input" type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></label>
        <label className="field"><span>Hold expires</span>
          <input className="input" type="date" min={todayISO()} value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}

function BookingDrawer({ id, s, onClose }) {
  const { update, remove } = useData();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const ix = indexAll(s);
  const b = s.bookings.find((x) => x.id === id);
  const [form, setForm] = useState(() => (b ? { amount: String(b.amount), expiresAt: b.expiresAt } : null));
  if (!b) return <Drawer open={false} onClose={onClose} />;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const unit = ix.units[b.unitId];
  const tower = ix.towers[unit?.towerId];
  const prospect = ix.contacts[b.contactId];
  const dleft = daysUntil(b.expiresAt);
  const expired = isActive(b.status) && dleft < 0;

  function saveDetails(e) {
    e.preventDefault();
    update("bookings", id, { amount: Number(form.amount) || b.amount, expiresAt: form.expiresAt });
    onClose();
  }
  async function cancelBooking() {
    if (await confirm({ title: "Cancel this booking?", message: "The hold is released and the unit becomes available again.", confirmLabel: "Cancel booking" }))
      update("bookings", id, { status: "cancelled" });
  }
  function convert() {
    // Hand off to the Contracts create flow, pre-filled with this booking, so the
    // manager can set installments, dates and deposit before the tenancy is created.
    navigate(`/contracts?book=${id}`);
    onClose();
  }
  async function handleDelete() {
    if (await confirm({ title: "Delete this booking?", message: "This permanently removes the booking record. This can't be undone.", confirmLabel: "Delete booking" })) {
      remove("bookings", id); onClose();
    }
  }

  return (
    <Drawer open onClose={onClose} title={`${tower?.name || "Booking"} · Unit ${unit?.label || ""}`} subtitle={prospect?.name || "Prospect"}
      footer={<>
        <button className="btn btn-danger" type="button" aria-label="Delete booking" title="Delete booking" onClick={handleDelete}><Trash2 /></button>
        <div className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <button className="btn btn-primary" form="edit-booking" type="submit">Save changes</button>
      </>}>
      <div className="drawer-tenant">
        <span className="mt-ic lg"><CalendarCheck strokeWidth={1.7} /></span>
        <div>
          <div className="t-h2">{prospect?.name || "—"}</div>
          <div className="t-muted" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
            <StatusBadge status={b.status} />
            {isActive(b.status) && (expired
              ? <span className="t-danger" style={{ fontSize: 13 }}>· expired</span>
              : <span style={{ fontSize: 13 }}>· expires in {dleft}d</span>)}
          </div>
        </div>
      </div>

      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">Agreed rent</span><span className="v"><Money value={b.amount} /></span></div>
        <div className="detail-row"><span className="k">Tower</span><span className="v">{tower?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">Unit</span><span className="v">{unit?.label || "—"}{unit?.unitType ? ` · ${unit.unitType}` : ""}</span></div>
        <div className="detail-row"><span className="k">Prospect</span><span className="v">{prospect?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">Booked</span><span className="v">{fmtDateLong(b.date)}</span></div>
        <div className="detail-row"><span className="k">Hold expires</span><span className="v">{fmtDateLong(b.expiresAt)}</span></div>
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Status</h3>
      <div className="stage-picker" style={{ marginBottom: 20 }}>
        {b.status === "held" && <button className="btn btn-sm btn-primary" onClick={() => update("bookings", id, { status: "confirmed" })}><Check /> Confirm booking</button>}
        {b.status === "confirmed" && <button className="btn btn-sm btn-primary" onClick={convert}><ArrowRight /> Convert to contract</button>}
        {b.status === "confirmed" && <button className="btn btn-sm btn-ghost" onClick={() => update("bookings", id, { status: "held" })}><RotateCcw /> Undo confirmation</button>}
        {isActive(b.status) && <button className="btn btn-sm btn-ghost" onClick={cancelBooking}><Ban /> Cancel</button>}
        {b.status === "cancelled" && <button className="btn btn-sm btn-ghost" onClick={() => update("bookings", id, { status: "held" })}><RotateCcw /> Reopen</button>}
        {b.status === "converted" && <span className="t-muted" style={{ fontSize: 13 }}>Converted to a contract — see Contracts.</span>}
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Booking details</h3>
      <form id="edit-booking" onSubmit={saveDetails} className="form-grid">
        <label className="field"><span>Agreed rent (AED/yr)</span>
          <input className="input" type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></label>
        <label className="field"><span>Hold expires</span>
          <input className="input" type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} /></label>
      </form>
    </Drawer>
  );
}
