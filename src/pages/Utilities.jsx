import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Plus, Trash2, Gauge, Wallet, CheckCircle2, Coins, Check,
  Zap, Droplets, Snowflake, Flame,
} from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll } from "../lib/domain";
import { fmtDateLong, todayISO } from "../lib/format";
import { METER_TYPES } from "../lib/constants";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import TowerFilter from "../components/TowerFilter";
import NewFlag from "../components/NewFlag";
import { useConfirm } from "../components/ConfirmDialog";
import SearchSelect from "../components/SearchSelect";

const TYPE_ICON = { electricity: Zap, water: Droplets, cooling: Snowflake, gas: Flame };
const typeIcon = (t) => TYPE_ICON[t] || Gauge;
const titleCase = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());
const STATUS_FILTERS = ["all", "due", "settled"];

export default function Utilities() {
  const { db, companyId, markSeen } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const ix = indexAll(s);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [towerFilter, setTowerFilter] = useState("all");
  const [searchParams] = useSearchParams();
  const [openId, setOpenId] = useState(() => searchParams.get("open"));
  const [addOpen, setAddOpen] = useState(false);

  const rows = s.meters.map((m) => {
    const readings = s.readings.filter((r) => r.meterId === m.id).sort((a, b) => b.date.localeCompare(a.date));
    const uncollected = readings.filter((r) => !r.collected).reduce((acc, r) => acc + r.amount, 0);
    return { m, tower: ix.towers[m.towerId], readings, last: readings[0], uncollected };
  });

  const filtered = rows.filter((r) => {
    if (towerFilter !== "all" && r.m.towerId !== towerFilter) return false;
    if (type !== "all" && r.m.type !== type) return false;
    if (status === "due" && r.uncollected <= 0) return false;
    if (status === "settled" && r.uncollected > 0) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (r.m.number || "").toLowerCase().includes(q) || (r.m.type || "").toLowerCase().includes(q) || (r.tower?.name || "").toLowerCase().includes(q);
  });

  const totalUncollectedInView = filtered.reduce((acc, r) => acc + r.uncollected, 0);

  const charges = s.readings.reduce((a, r) => a + r.amount, 0);
  const uncollected = s.readings.filter((r) => !r.collected);
  const uncollectedSum = uncollected.reduce((a, r) => a + r.amount, 0);
  const collectedSum = s.readings.filter((r) => r.collected).reduce((a, r) => a + r.amount, 0);

  return (
    <div className="page">
      <PageHeader title="Utility Meters" subtitle={`${s.meters.length} meter${s.meters.length === 1 ? "" : "s"} across the portfolio`}
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Add meter</button>} />

      <div className="kpi-grid kpi-4">
        <StatCard label="Meters" Icon={Gauge} tone="primary" value={s.meters.length} hint="being read" />
        <StatCard label="Uncollected" Icon={Wallet} tone={uncollectedSum ? "danger" : "neutral"} value={<Money value={uncollectedSum} />} hint={`${uncollected.length} reading${uncollected.length === 1 ? "" : "s"}`} />
        <StatCard label="Collected" Icon={CheckCircle2} tone="success" value={<Money value={collectedSum} />} hint="billed & received" />
        <StatCard label="Total charged" Icon={Coins} tone="accent" value={<Money value={charges} />} hint="all readings" />
      </div>

      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" placeholder="Search meter no, type, tower" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="spacer" />
        <TowerFilter towers={s.towers} value={towerFilter} onChange={setTowerFilter} />
        <div className="period-ctl">
          <Gauge className="period-ic" />
          <select className="select period-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by meter type">
            <option value="all">All types</option>
            {METER_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
          </select>
        </div>
      </div>

      <div className="filter-bar">
        <div className="seg seg-wrap">
          {STATUS_FILTERS.map((st) => (
            <button key={st} data-active={status === st} onClick={() => setStatus(st)}>
              {st === "all" ? "All meters" : titleCase(st)}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className="list-cap">{filtered.length} meter{filtered.length === 1 ? "" : "s"} · uncollected <Money value={totalUncollectedInView} /></div>
      </div>

      <section className="card card-table">
        <table className="table">
          <thead>
            <tr><th>Meter</th><th>Tower</th><th>Rate</th><th className="num">Current reading</th><th>Last read</th><th className="num">Uncollected</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(({ m, tower, last, uncollected }) => {
              const Icon = typeIcon(m.type);
              return (
                <tr key={m.id} className={`row-click ${uncollected > 0 ? "row-overdue" : ""} ${m.isNew ? "row-new" : ""}`} onClick={() => { markSeen("meters", m.id); setOpenId(m.id); }}>
                  <td>
                    <div className="cell-tenant">
                      <span className="mt-ic"><Icon strokeWidth={1.8} /></span>
                      <div>
                        <div className="tn-name">{m.number}<NewFlag show={m.isNew} /></div>
                        <div className="tn-sub">{titleCase(m.type)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="t-muted">{tower?.name || "—"}</td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>AED {m.rate} / unit</td>
                  <td className="num tnum">{(m.lastReading ?? 0).toLocaleString()}</td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{last ? fmtDateLong(last.date) : "—"}</td>
                  <td className="num">{uncollected > 0 ? <Money value={uncollected} /> : <span className="t-faint">—</span>}</td>
                  <td><StatusBadge status={uncollected > 0 ? "due" : "settled"} /></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7}><div className="empty"><Gauge /><p>No meters match.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </section>

      {openId && <MeterDrawer key={openId} id={openId} s={s} onClose={() => setOpenId(null)} />}
      <AddMeterDrawer open={addOpen} onClose={() => setAddOpen(false)} s={s} />
    </div>
  );
}

function AddMeterDrawer({ open, onClose, s }) {
  const { add, companyId } = useData();
  const blank = { type: "", number: "", towerId: "", rate: "", lastReading: "" };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (!form.type) return setError("Choose a meter type.");
    if (!form.number.trim()) return setError("Enter the meter number.");
    if (!form.towerId) return setError("Choose a property.");
    if (!Number(form.rate)) return setError("Enter the per-unit rate.");
    add("meters", {
      companyId, type: form.type, number: form.number.trim(), towerId: form.towerId,
      rate: Number(form.rate), lastReading: Number(form.lastReading) || 0,
    });
    setForm(blank); setError(""); onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add a meter" subtitle="Register a utility meter to read"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="add-meter" type="submit">Add meter</button>
      </>}>
      <form id="add-meter" onSubmit={submit} className="form-grid">
        <label className="field"><span>Type</span>
          <select className="select" value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="">Select type…</option>
            {METER_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
          </select></label>
        <label className="field"><span>Meter number</span>
          <input className="input" value={form.number} onChange={(e) => set("number", e.target.value)} placeholder="e.g. E-228104" /></label>
        <label className="field full"><span>Property</span>
          <SearchSelect value={form.towerId} onChange={(v) => set("towerId", v)} options={s.towers.map((t) => ({ value: t.id, label: t.name }))} placeholder="Select property…" />
        </label>
        <label className="field"><span>Rate (AED / unit)</span>
          <input className="input" type="number" step="0.001" value={form.rate} onChange={(e) => set("rate", e.target.value)} placeholder="e.g. 0.38" /></label>
        <label className="field"><span>Opening reading</span>
          <input className="input" type="number" value={form.lastReading} onChange={(e) => set("lastReading", e.target.value)} placeholder="0" /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}

function MeterDrawer({ id, s, onClose }) {
  const { update, recordReading, deleteMeter } = useData();
  const confirm = useConfirm();
  const ix = indexAll(s);
  const m = s.meters.find((x) => x.id === id);
  const [nr, setNr] = useState({ reading: "", date: todayISO() });
  if (!m) return <Drawer open={false} onClose={onClose} />;
  const tower = ix.towers[m.towerId];
  const Icon = typeIcon(m.type);
  const readings = s.readings.filter((r) => r.meterId === m.id).sort((a, b) => b.date.localeCompare(a.date));
  const uncollected = readings.filter((r) => !r.collected).reduce((acc, r) => acc + r.amount, 0);

  const entered = nr.reading !== "" && !Number.isNaN(Number(nr.reading));
  const below = entered && Number(nr.reading) < (m.lastReading || 0);
  const previewUnits = entered ? Math.max(0, Number(nr.reading) - (m.lastReading || 0)) : 0;
  const previewAmount = Math.round(previewUnits * (m.rate || 0));

  function submitReading() {
    if (!entered || below) return;
    recordReading(m.id, { reading: Number(nr.reading), date: nr.date });
    setNr({ reading: "", date: todayISO() });
  }
  async function handleDelete() {
    if (await confirm({ title: `Delete meter ${m.number}?`, message: "This permanently removes the meter and its entire reading history. This can't be undone.", confirmLabel: "Delete meter" })) {
      deleteMeter(id); onClose();
    }
  }

  return (
    <Drawer open onClose={onClose} title={m.number} subtitle={`${titleCase(m.type)} · ${tower?.name || "—"}`}
      footer={<>
        <button className="btn btn-danger" type="button" aria-label="Delete meter" title="Delete meter" onClick={handleDelete}><Trash2 /></button>
        <div className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
      </>}>
      <div className="drawer-tenant">
        <span className="mt-ic lg"><Icon strokeWidth={1.7} /></span>
        <div>
          <div className="t-h2">{m.number}</div>
          <div className="t-muted" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
            <StatusBadge status={uncollected > 0 ? "due" : "settled"} />
            {uncollected > 0 && <span className="t-danger" style={{ fontSize: 13 }}>· <Money value={uncollected} /> to collect</span>}
          </div>
        </div>
      </div>

      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">Type</span><span className="v">{titleCase(m.type)}</span></div>
        <div className="detail-row"><span className="k">Tower</span><span className="v">{tower?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">Rate</span><span className="v">AED {m.rate} / unit</span></div>
        <div className="detail-row"><span className="k">Current reading</span><span className="v tnum">{(m.lastReading ?? 0).toLocaleString()}</span></div>
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Record a reading</h3>
      <div className="inset-form" style={{ marginBottom: 20 }}>
        <div className="form-grid">
          <label className="field"><span>New reading</span>
            <input className="input" type="number" value={nr.reading} onChange={(e) => setNr((f) => ({ ...f, reading: e.target.value }))} placeholder={`> ${m.lastReading ?? 0}`} /></label>
          <label className="field"><span>Date</span>
            <input className="input" type="date" value={nr.date} onChange={(e) => setNr((f) => ({ ...f, date: e.target.value }))} /></label>
          <div className="full" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span className="t-muted" style={{ fontSize: 13 }}>
              {below ? <span className="t-danger">Reading is below the current value.</span>
                : entered ? <>Consumption <strong className="tnum">{previewUnits.toLocaleString()}</strong> units · <Money value={previewAmount} /></>
                : "Enter the latest meter value."}
            </span>
            <button className="btn btn-primary btn-sm" type="button" disabled={!entered || below} onClick={submitReading}>Record reading</button>
          </div>
        </div>
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Reading history</h3>
      <div className="sched">
        {readings.map((rd) => (
          <div key={rd.id} className={`sched-row ${rd.collected ? "paid" : ""}`}>
            <div>
              <div className="sched-date">{fmtDateLong(rd.date)}</div>
              <div className="t-faint" style={{ fontSize: 12 }}>{rd.units.toLocaleString()} units · reading {rd.reading.toLocaleString()}</div>
            </div>
            <span className="sched-amt"><Money value={rd.amount} /></span>
            <button className={`btn btn-sm ${rd.collected ? "btn-ghost" : "btn-primary"}`} onClick={() => update("readings", rd.id, { collected: !rd.collected })}>
              {rd.collected ? "Undo" : <><Check /> Collected</>}
            </button>
          </div>
        ))}
        {readings.length === 0 && <p className="t-muted" style={{ fontSize: 13 }}>No readings recorded yet.</p>}
      </div>
    </Drawer>
  );
}
