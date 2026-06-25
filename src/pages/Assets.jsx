import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Plus, Trash2, Boxes, Wallet, TrendingDown, CalendarClock,
  Snowflake, ArrowUpDown, Zap, Droplets, Plug, Armchair, Shield, Box, Ban, RotateCcw,
} from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll } from "../lib/domain";
import { fmtDateLong, todayISO, TODAY, parseISO } from "../lib/format";
import { ASSET_CATEGORIES } from "../lib/constants";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import TowerFilter from "../components/TowerFilter";
import NewFlag from "../components/NewFlag";
import { useConfirm } from "../components/ConfirmDialog";
import SearchSelect from "../components/SearchSelect";

const CAT_ICON = {
  HVAC: Snowflake, Elevator: ArrowUpDown, Power: Zap, Plumbing: Droplets,
  Electrical: Plug, Furniture: Armchair, Security: Shield, Other: Box,
};
const catIcon = (c) => CAT_ICON[c] || Box;
const STATUS_FILTERS = ["all", "active", "disposed"];
const RANK = { active: 0, disposed: 1 };

// Straight-line depreciation to zero salvage over the asset's useful life.
function depreciation(a) {
  const cost = a.cost || 0;
  const life = Math.max(1, a.usefulLifeYears || 1);
  const annual = cost / life;
  const years = Math.max(0, (TODAY - parseISO(a.purchaseDate)) / (365.25 * 86400000));
  const accumulated = a.status === "disposed" ? cost : Math.min(cost, annual * years);
  const book = Math.max(0, cost - accumulated);
  const pct = cost ? Math.round((accumulated / cost) * 100) : 0;
  return { annual, accumulated, book, pct, life };
}

export default function Assets() {
  const { db, companyId, markSeen } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const ix = indexAll(s);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [towerFilter, setTowerFilter] = useState("all");
  const [searchParams] = useSearchParams();
  const [openId, setOpenId] = useState(() => searchParams.get("open"));
  const [addOpen, setAddOpen] = useState(false);

  const rows = s.assets.map((a) => ({ a, tower: ix.towers[a.towerId], dep: depreciation(a) }));

  const filtered = rows.filter((r) => {
    if (towerFilter !== "all" && r.a.towerId !== towerFilter) return false;
    if (status !== "all" && (r.a.status || "active") !== status) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (r.a.name || "").toLowerCase().includes(q) || (r.a.category || "").toLowerCase().includes(q) ||
      (r.tower?.name || "").toLowerCase().includes(q);
  }).sort((a, b) => (RANK[a.a.status || "active"] - RANK[b.a.status || "active"]) || b.a.cost - a.a.cost);

  const active = s.assets.filter((a) => (a.status || "active") !== "disposed");
  const totalCost = s.assets.reduce((acc, a) => acc + (a.cost || 0), 0);
  const totalBook = s.assets.reduce((acc, a) => acc + depreciation(a).book, 0);
  const totalAccum = s.assets.reduce((acc, a) => acc + depreciation(a).accumulated, 0);
  const annual = active.reduce((acc, a) => { const d = depreciation(a); return acc + (d.book > 0 ? d.annual : 0); }, 0);

  return (
    <div className="page">
      <PageHeader title="Fixed Assets" subtitle={`${s.assets.length} asset${s.assets.length === 1 ? "" : "s"} on the register`}
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Add asset</button>} />

      <div className="kpi-grid kpi-4">
        <StatCard label="Assets" Icon={Boxes} tone="primary" value={s.assets.length} hint={<Money value={totalCost} />} />
        <StatCard label="Book value" Icon={Wallet} tone="success" value={<Money value={Math.round(totalBook)} />} hint="current net value" />
        <StatCard label="Accumulated depreciation" Icon={TrendingDown} tone="neutral" value={<Money value={Math.round(totalAccum)} />} hint="written down to date" />
        <StatCard label="Annual depreciation" Icon={CalendarClock} tone="accent" value={<Money value={Math.round(annual)} />} hint="yearly charge" />
      </div>

      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" placeholder="Search asset, category, tower" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="spacer" />
        <TowerFilter towers={s.towers} value={towerFilter} onChange={setTowerFilter} />
      </div>

      <div className="filter-bar">
        <div className="seg seg-wrap">
          {STATUS_FILTERS.map((st) => (
            <button key={st} data-active={status === st} onClick={() => setStatus(st)}>
              {st === "all" ? "All statuses" : st[0].toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className="list-cap">{filtered.length} asset{filtered.length === 1 ? "" : "s"} in view</div>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr><th>Asset</th><th>Tower</th><th>Purchased</th><th className="num">Cost</th><th className="num">Book value</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(({ a, tower, dep }) => {
              const Icon = catIcon(a.category);
              return (
                <tr key={a.id} className={`row-click ${a.isNew ? "row-new" : ""}`} onClick={() => { markSeen("assets", a.id); setOpenId(a.id); }}>
                  <td>
                    <div className="cell-tenant">
                      <span className="mt-ic"><Icon strokeWidth={1.8} /></span>
                      <div>
                        <div className="tn-name">{a.name}<NewFlag show={a.isNew} /></div>
                        <div className="tn-sub">{a.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="t-muted">{tower?.name || "—"}</td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{fmtDateLong(a.purchaseDate)}</td>
                  <td className="num"><Money value={a.cost} /></td>
                  <td className="num">
                    <Money value={Math.round(dep.book)} />
                    <div className="t-faint" style={{ fontSize: 11 }}>{dep.pct}% depreciated</div>
                  </td>
                  <td><StatusBadge status={a.status || "active"} /></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6}><div className="empty"><Boxes /><p>No assets match.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </section>

      {openId && <AssetDrawer key={openId} id={openId} s={s} onClose={() => setOpenId(null)} />}
      <AddAssetDrawer open={addOpen} onClose={() => setAddOpen(false)} s={s} />
    </div>
  );
}

function AddAssetDrawer({ open, onClose, s }) {
  const { add, companyId } = useData();
  const blank = { name: "", category: "", towerId: "", cost: "", usefulLifeYears: "", purchaseDate: todayISO() };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name the asset.");
    if (!form.category) return setError("Choose a category.");
    if (!form.towerId) return setError("Choose a property.");
    if (!Number(form.cost)) return setError("Enter the purchase cost.");
    if (!Number(form.usefulLifeYears)) return setError("Enter the useful life in years.");
    add("assets", {
      companyId, name: form.name.trim(), category: form.category, towerId: form.towerId,
      cost: Number(form.cost), usefulLifeYears: Number(form.usefulLifeYears),
      purchaseDate: form.purchaseDate, status: "active",
    });
    setForm(blank); setError(""); onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add an asset" subtitle="Register a building asset for depreciation"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="add-asset" type="submit">Add asset</button>
      </>}>
      <form id="add-asset" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Asset name</span>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Rooftop chiller unit" /></label>
        <label className="field"><span>Category</span>
          <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Select category…</option>
            {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
        <label className="field"><span>Property</span>
          <SearchSelect value={form.towerId} onChange={(v) => set("towerId", v)} options={s.towers.map((t) => ({ value: t.id, label: t.name }))} placeholder="Select property…" />
        </label>
        <label className="field"><span>Cost (AED)</span>
          <input className="input" type="number" value={form.cost} onChange={(e) => set("cost", e.target.value)} /></label>
        <label className="field"><span>Useful life (years)</span>
          <input className="input" type="number" value={form.usefulLifeYears} onChange={(e) => set("usefulLifeYears", e.target.value)} placeholder="e.g. 15" /></label>
        <label className="field full"><span>Purchase date</span>
          <input className="input" type="date" value={form.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}

function AssetDrawer({ id, s, onClose }) {
  const { update, remove } = useData();
  const confirm = useConfirm();
  const ix = indexAll(s);
  const a = s.assets.find((x) => x.id === id);
  const [form, setForm] = useState(() => (a ? {
    name: a.name, category: a.category, towerId: a.towerId, cost: String(a.cost),
    usefulLifeYears: String(a.usefulLifeYears), purchaseDate: a.purchaseDate,
  } : null));
  if (!a) return <Drawer open={false} onClose={onClose} />;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const tower = ix.towers[a.towerId];
  const Icon = catIcon(a.category);
  const dep = depreciation(a);
  const st = a.status || "active";

  function saveDetails(e) {
    e.preventDefault();
    update("assets", id, {
      name: form.name.trim() || a.name, category: form.category, towerId: form.towerId,
      cost: Number(form.cost) || a.cost, usefulLifeYears: Number(form.usefulLifeYears) || a.usefulLifeYears,
      purchaseDate: form.purchaseDate,
    });
    onClose();
  }
  async function dispose() {
    if (await confirm({ title: "Dispose this asset?", message: "It will be marked disposed and written down to zero book value. You can reactivate it later.", confirmLabel: "Dispose asset" }))
      update("assets", id, { status: "disposed" });
  }
  async function handleDelete() {
    if (await confirm({ title: `Delete ${a.name}?`, message: "This permanently removes the asset from the register. This can't be undone.", confirmLabel: "Delete asset" })) {
      remove("assets", id); onClose();
    }
  }

  return (
    <Drawer open onClose={onClose} title={a.name} subtitle={`${a.category} · ${tower?.name || "—"}`}
      footer={<>
        <button className="btn btn-danger" type="button" aria-label="Delete asset" title="Delete asset" onClick={handleDelete}><Trash2 /></button>
        <div className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <button className="btn btn-primary" form="edit-asset" type="submit">Save changes</button>
      </>}>
      <div className="drawer-tenant">
        <span className="mt-ic lg"><Icon strokeWidth={1.7} /></span>
        <div>
          <div className="t-h2">{a.name}</div>
          <div className="t-muted" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
            <StatusBadge status={st} />
            {st === "active" && dep.book <= 0 && <span className="t-muted" style={{ fontSize: 13 }}>· fully depreciated</span>}
          </div>
        </div>
      </div>

      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">Category</span><span className="v">{a.category}</span></div>
        <div className="detail-row"><span className="k">Tower</span><span className="v">{tower?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">Purchased</span><span className="v">{fmtDateLong(a.purchaseDate)}</span></div>
        <div className="detail-row"><span className="k">Useful life</span><span className="v">{dep.life} years</span></div>
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Valuation</h3>
      <div className="detail-list" style={{ marginBottom: 12 }}>
        <div className="detail-row"><span className="k">Cost</span><span className="v"><Money value={a.cost} /></span></div>
        <div className="detail-row"><span className="k">Annual depreciation</span><span className="v"><Money value={Math.round(dep.annual)} /></span></div>
        <div className="detail-row"><span className="k">Accumulated</span><span className="v"><Money value={Math.round(dep.accumulated)} /></span></div>
        <div className="detail-row"><span className="k">Book value</span><span className="v"><Money value={Math.round(dep.book)} /></span></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span className="t-muted">Depreciated</span><span className="tnum">{dep.pct}%</span>
      </div>
      <div className="occ-bar" style={{ marginBottom: 20 }}><i style={{ width: `${dep.pct}%` }} /></div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Status</h3>
      <div className="stage-picker" style={{ marginBottom: 20 }}>
        {st === "active"
          ? <button className="btn btn-sm btn-ghost" onClick={dispose}><Ban /> Dispose asset</button>
          : <button className="btn btn-sm btn-ghost" onClick={() => update("assets", id, { status: "active" })}><RotateCcw /> Reactivate</button>}
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Asset details</h3>
      <form id="edit-asset" onSubmit={saveDetails} className="form-grid">
        <label className="field full"><span>Asset name</span>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="field"><span>Category</span>
          <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
            {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
        <label className="field"><span>Property</span>
          <SearchSelect value={form.towerId} onChange={(v) => set("towerId", v)} options={s.towers.map((t) => ({ value: t.id, label: t.name }))} placeholder="Select property…" />
        </label>
        <label className="field"><span>Cost (AED)</span>
          <input className="input" type="number" value={form.cost} onChange={(e) => set("cost", e.target.value)} /></label>
        <label className="field"><span>Useful life (years)</span>
          <input className="input" type="number" value={form.usefulLifeYears} onChange={(e) => set("usefulLifeYears", e.target.value)} /></label>
        <label className="field full"><span>Purchase date</span>
          <input className="input" type="date" value={form.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} /></label>
      </form>
    </Drawer>
  );
}
