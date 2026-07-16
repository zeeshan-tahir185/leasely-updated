import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Plus, Trash2, Package, PackageX, Coins, AlertTriangle, ClipboardList, Truck, Check,
  Snowflake, Plug, Droplets, Hammer, Sparkles, Shield, RotateCcw, Ban,
} from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll } from "../lib/domain";
import { fmtDateLong, todayISO } from "../lib/format";
import { INVENTORY_CATEGORIES } from "../lib/constants";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import NewFlag from "../components/NewFlag";
import { useConfirm } from "../components/ConfirmDialog";

const CAT_ICON = {
  HVAC: Snowflake, Electrical: Plug, Plumbing: Droplets, Carpentry: Hammer,
  Cleaning: Sparkles, Safety: Shield, General: Package,
};
const catIcon = (c) => CAT_ICON[c] || Package;
const stockState = (it) => (it.qty <= 0 ? "out" : it.qty <= (it.reorderLevel || 0) ? "low" : "in");
const STOCK_BADGE = {
  in: { cls: "badge-paid", Icon: Check, label: "In stock" },
  low: { cls: "badge-due", Icon: AlertTriangle, label: "Low stock" },
  out: { cls: "badge-overdue", Icon: PackageX, label: "Out of stock" },
};
function StockBadge({ state }) {
  const def = STOCK_BADGE[state];
  const { cls, Icon, label } = def;
  return <span className={`badge ${cls}`}><Icon strokeWidth={2.5} />{label}</span>;
}

export default function Inventory() {
  const { db, companyId, markSeen } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const [view, setView] = useState("stock");
  const [query, setQuery] = useState("");
  const [searchParams] = useSearchParams();
  const [openItem, setOpenItem] = useState(null);
  const [openPo, setOpenPo] = useState(() => searchParams.get("open"));
  const [addOpen, setAddOpen] = useState(false);

  const items = s.inventoryItems;
  const stockValue = items.reduce((a, it) => a + it.qty * it.unitCost, 0);
  const lowStock = items.filter((it) => stockState(it) === "low");
  const outStock = items.filter((it) => stockState(it) === "out");

  const pos = s.purchaseOrders;
  const openPos = pos.filter((p) => p.status === "ordered");
  const onOrderValue = openPos.reduce((a, p) => a + (p.total || 0), 0);
  const receivedValue = pos.filter((p) => p.status === "received").reduce((a, p) => a + (p.total || 0), 0);

  const q = query.trim().toLowerCase();
  const filteredItems = items.filter((it) => !q || it.name.toLowerCase().includes(q) || (it.sku || "").toLowerCase().includes(q) || (it.category || "").toLowerCase().includes(q));
  const ix = indexAll(s);
  const filteredPos = pos
    .map((p) => ({ p, supplier: ix.contacts[p.supplierId] }))
    .filter(({ p, supplier }) => !q || (p.ref || "").toLowerCase().includes(q) || (supplier?.name || "").toLowerCase().includes(q))
    .sort((a, b) => b.p.date.localeCompare(a.p.date));

  return (
    <div className="page">
      <PageHeader title="Purchasing & Inventory" subtitle={`${items.length} stock item${items.length === 1 ? "" : "s"} · ${pos.length} purchase order${pos.length === 1 ? "" : "s"}`}
        actions={view === "stock"
          ? <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Add item</button>
          : <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> New purchase order</button>} />

      {view === "stock" ? (
        <div className="kpi-grid kpi-4">
          <StatCard label="Stock items" Icon={Package} tone="primary" value={items.length} hint="distinct SKUs" />
          <StatCard label="Stock value" Icon={Coins} tone="accent" value={<Money value={stockValue} />} hint="on hand" />
          <StatCard label="Low stock" Icon={AlertTriangle} tone={lowStock.length ? "danger" : "neutral"} value={lowStock.length} hint="at or below reorder" />
          <StatCard label="Out of stock" Icon={PackageX} tone={outStock.length ? "danger" : "neutral"} value={outStock.length} hint="need ordering" />
        </div>
      ) : (
        <div className="kpi-grid kpi-4">
          <StatCard label="Purchase orders" Icon={ClipboardList} tone="primary" value={pos.length} hint="all time" />
          <StatCard label="Open orders" Icon={Truck} tone={openPos.length ? "accent" : "neutral"} value={openPos.length} hint="awaiting delivery" />
          <StatCard label="On order" Icon={Coins} tone="primary" value={<Money value={onOrderValue} />} hint="committed spend" />
          <StatCard label="Received" Icon={Check} tone="success" value={<Money value={receivedValue} />} hint="delivered" />
        </div>
      )}

      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" placeholder={view === "stock" ? "Search item, SKU, category" : "Search PO ref or supplier"} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="spacer" />
        <div className="seg">
          <button data-active={view === "stock"} onClick={() => setView("stock")}>Stock</button>
          <button data-active={view === "po"} onClick={() => setView("po")}>Purchase orders</button>
        </div>
      </div>

      {view === "stock" ? (
        <section className="card card-table">
          <table className="table">
            <thead>
              <tr><th>Item</th><th>Category</th><th className="num">In stock</th><th className="num">Reorder at</th><th className="num">Unit cost</th><th className="num">Value</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filteredItems.map((it) => {
                const Icon = catIcon(it.category);
                const st = stockState(it);
                return (
                  <tr key={it.id} className={`row-click ${st === "out" ? "row-overdue" : ""} ${it.isNew ? "row-new" : ""}`} onClick={() => { markSeen("inventoryItems", it.id); setOpenItem(it.id); }}>
                    <td>
                      <div className="cell-tenant">
                        <span className="mt-ic"><Icon strokeWidth={1.8} /></span>
                        <div><div className="tn-name">{it.name}<NewFlag show={it.isNew} /></div><div className="tn-sub">{it.sku}</div></div>
                      </div>
                    </td>
                    <td className="t-muted">{it.category}</td>
                    <td className="num tnum">{it.qty}</td>
                    <td className="num tnum t-muted">{it.reorderLevel}</td>
                    <td className="num"><Money value={it.unitCost} /></td>
                    <td className="num"><Money value={it.qty * it.unitCost} /></td>
                    <td><StockBadge state={st} /></td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && <tr><td colSpan={7}><div className="empty"><Package /><p>No items match.</p></div></td></tr>}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="card card-table">
          <table className="table">
            <thead>
              <tr><th>PO</th><th>Supplier</th><th>Date</th><th className="num">Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filteredPos.map(({ p, supplier }) => (
                <tr key={p.id} className={`row-click ${p.isNew ? "row-new" : ""}`} onClick={() => { markSeen("purchaseOrders", p.id); setOpenPo(p.id); }}>
                  <td>
                    <div className="cell-tenant">
                      <span className="mt-ic"><ClipboardList strokeWidth={1.8} /></span>
                      <div className="tn-name">{p.ref || "—"}<NewFlag show={p.isNew} /></div>
                    </div>
                  </td>
                  <td>{supplier?.name || "—"}</td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{fmtDateLong(p.date)}</td>
                  <td className="num"><Money value={p.total} /></td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
              {filteredPos.length === 0 && <tr><td colSpan={5}><div className="empty"><ClipboardList /><p>No purchase orders match.</p></div></td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {openItem && <ItemDrawer key={openItem} id={openItem} s={s} onClose={() => setOpenItem(null)} />}
      {openPo && <PoDrawer key={openPo} id={openPo} s={s} onClose={() => setOpenPo(null)} />}
      {addOpen && view === "stock" && <AddItemDrawer onClose={() => setAddOpen(false)} />}
      {addOpen && view === "po" && <AddPoDrawer s={s} onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function ItemDrawer({ id, s, onClose }) {
  const { update, remove } = useData();
  const confirm = useConfirm();
  const it = s.inventoryItems.find((x) => x.id === id);
  const [form, setForm] = useState(() => (it ? { name: it.name, sku: it.sku || "", category: it.category, unitCost: String(it.unitCost), reorderLevel: String(it.reorderLevel ?? 0) } : null));
  const [adjust, setAdjust] = useState("");
  if (!it) return <Drawer open={false} onClose={onClose} />;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const Icon = catIcon(it.category);
  const st = stockState(it);

  function move(sign) {
    const n = Number(adjust);
    if (!n || n <= 0) return;
    update("inventoryItems", id, { qty: Math.max(0, it.qty + sign * n) });
    setAdjust("");
  }
  function saveDetails(e) {
    e.preventDefault();
    update("inventoryItems", id, {
      name: form.name.trim() || it.name, sku: form.sku.trim(), category: form.category,
      unitCost: Number(form.unitCost) || it.unitCost, reorderLevel: Number(form.reorderLevel) || 0,
    });
    onClose();
  }
  async function handleDelete() {
    if (await confirm({ title: `Delete ${it.name}?`, message: "This permanently removes the stock item. This can't be undone.", confirmLabel: "Delete item" })) {
      remove("inventoryItems", id); onClose();
    }
  }

  return (
    <Drawer open onClose={onClose} title={it.name} subtitle={it.sku}
      footer={<>
        <button className="btn btn-danger" type="button" aria-label="Delete item" title="Delete item" onClick={handleDelete}><Trash2 /></button>
        <div className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <button className="btn btn-primary" form="edit-item" type="submit">Save changes</button>
      </>}>
      <div className="drawer-tenant">
        <span className="mt-ic lg"><Icon strokeWidth={1.7} /></span>
        <div>
          <div className="t-h2">{it.name}</div>
          <div className="t-muted" style={{ marginTop: 2 }}><StockBadge state={st} /></div>
        </div>
      </div>

      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">In stock</span><span className="v tnum">{it.qty}</span></div>
        <div className="detail-row"><span className="k">Reorder at</span><span className="v tnum">{it.reorderLevel}</span></div>
        <div className="detail-row"><span className="k">Category</span><span className="v">{it.category}</span></div>
        <div className="detail-row"><span className="k">Unit cost</span><span className="v"><Money value={it.unitCost} /></span></div>
        <div className="detail-row"><span className="k">Stock value</span><span className="v"><Money value={it.qty * it.unitCost} /></span></div>
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Adjust stock</h3>
      <div className="inset-form" style={{ marginBottom: 20 }}>
        <div className="form-grid">
          <label className="field"><span>Quantity</span>
            <input className="input" type="number" min="1" value={adjust} onChange={(e) => setAdjust(e.target.value)} placeholder="e.g. 12" /></label>
          <div className="field" style={{ alignSelf: "end", flexDirection: "row", gap: 8 }}>
            <button className="btn btn-sm" type="button" onClick={() => move(1)}><Plus /> Receive</button>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => move(-1)}>Issue</button>
          </div>
        </div>
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Item details</h3>
      <form id="edit-item" onSubmit={saveDetails} className="form-grid">
        <label className="field full"><span>Name</span>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="field"><span>SKU</span>
          <input className="input" value={form.sku} onChange={(e) => set("sku", e.target.value)} /></label>
        <label className="field"><span>Category</span>
          <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
            {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
        <label className="field"><span>Unit cost (AED)</span>
          <input className="input" type="number" value={form.unitCost} onChange={(e) => set("unitCost", e.target.value)} /></label>
        <label className="field"><span>Reorder level</span>
          <input className="input" type="number" value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} /></label>
      </form>
    </Drawer>
  );
}

function AddItemDrawer({ onClose }) {
  const { add, companyId } = useData();
  const blank = { name: "", sku: "", category: "", qty: "", unitCost: "", reorderLevel: "" };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name the item.");
    if (!form.category) return setError("Choose a category.");
    add("inventoryItems", {
      companyId, name: form.name.trim(), sku: form.sku.trim(), category: form.category,
      qty: Number(form.qty) || 0, unitCost: Number(form.unitCost) || 0, reorderLevel: Number(form.reorderLevel) || 0,
    });
    onClose();
  }

  return (
    <Drawer open onClose={onClose} title="Add a stock item" subtitle="Register a spare part or consumable"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="add-item" type="submit">Add item</button>
      </>}>
      <form id="add-item" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Name</span>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Split AC filter (24k BTU)" /></label>
        <label className="field"><span>SKU</span>
          <input className="input" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. AC-F-24" /></label>
        <label className="field"><span>Category</span>
          <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Select category…</option>
            {INVENTORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
        <label className="field"><span>Quantity on hand</span>
          <input className="input" type="number" value={form.qty} onChange={(e) => set("qty", e.target.value)} /></label>
        <label className="field"><span>Unit cost (AED)</span>
          <input className="input" type="number" value={form.unitCost} onChange={(e) => set("unitCost", e.target.value)} /></label>
        <label className="field full"><span>Reorder level</span>
          <input className="input" type="number" value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} placeholder="Alert when stock drops to this" /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}

function PoDrawer({ id, s, onClose }) {
  const { update, remove } = useData();
  const confirm = useConfirm();
  const ix = indexAll(s);
  const p = s.purchaseOrders.find((x) => x.id === id);
  const [form, setForm] = useState(() => (p ? { supplierId: p.supplierId || "", ref: p.ref || "", total: String(p.total || ""), date: p.date } : null));
  if (!p) return <Drawer open={false} onClose={onClose} />;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const supplier = ix.contacts[p.supplierId];
  const suppliers = s.contacts.filter((c) => (c.kind || []).includes("supplier"));

  function saveDetails(e) {
    e.preventDefault();
    update("purchaseOrders", id, { supplierId: form.supplierId, ref: form.ref.trim(), total: Number(form.total) || p.total, date: form.date });
    onClose();
  }
  async function handleDelete() {
    if (await confirm({ title: `Delete ${p.ref || "this PO"}?`, message: "This permanently removes the purchase order. This can't be undone.", confirmLabel: "Delete order" })) {
      remove("purchaseOrders", id); onClose();
    }
  }

  return (
    <Drawer open onClose={onClose} title={p.ref || "Purchase order"} subtitle={supplier?.name || "Supplier"}
      footer={<>
        <button className="btn btn-danger" type="button" aria-label="Delete purchase order" title="Delete purchase order" onClick={handleDelete}><Trash2 /></button>
        <div className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <button className="btn btn-primary" form="edit-po" type="submit">Save changes</button>
      </>}>
      <div className="drawer-tenant">
        <span className="mt-ic lg"><ClipboardList strokeWidth={1.7} /></span>
        <div>
          <div className="t-h2">{p.ref || "Purchase order"}</div>
          <div className="t-muted" style={{ marginTop: 2 }}><StatusBadge status={p.status} /></div>
        </div>
      </div>

      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">Supplier</span><span className="v">{supplier?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">Total</span><span className="v"><Money value={p.total} /></span></div>
        <div className="detail-row"><span className="k">Ordered</span><span className="v">{fmtDateLong(p.date)}</span></div>
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Status</h3>
      <div className="stage-picker" style={{ marginBottom: 20 }}>
        {p.status === "ordered" && <button className="btn btn-sm btn-primary" onClick={() => update("purchaseOrders", id, { status: "received" })}><Truck /> Mark received</button>}
        {p.status === "ordered" && <button className="btn btn-sm btn-ghost" onClick={() => update("purchaseOrders", id, { status: "cancelled" })}><Ban /> Cancel</button>}
        {p.status !== "ordered" && <button className="btn btn-sm btn-ghost" onClick={() => update("purchaseOrders", id, { status: "ordered" })}><RotateCcw /> Reopen</button>}
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Order details</h3>
      <form id="edit-po" onSubmit={saveDetails} className="form-grid">
        <label className="field full"><span>Supplier</span>
          <select className="select" value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
            <option value="">Select…</option>
            {suppliers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <label className="field"><span>PO reference</span>
          <input className="input" value={form.ref} onChange={(e) => set("ref", e.target.value)} /></label>
        <label className="field"><span>Total (AED)</span>
          <input className="input" type="number" value={form.total} onChange={(e) => set("total", e.target.value)} /></label>
        <label className="field full"><span>Order date</span>
          <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></label>
      </form>
    </Drawer>
  );
}

function AddPoDrawer({ s, onClose }) {
  const { add, companyId } = useData();
  const suppliers = s.contacts.filter((c) => (c.kind || []).includes("supplier"));
  const blank = { supplierId: "", ref: "", total: "", date: todayISO() };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (!form.supplierId) return setError("Choose a supplier.");
    if (!Number(form.total)) return setError("Enter the order total.");
    add("purchaseOrders", {
      companyId, supplierId: form.supplierId, ref: form.ref.trim() || `PO-${3300 + s.purchaseOrders.length}`,
      total: Number(form.total), date: form.date, status: "ordered",
    });
    onClose();
  }

  return (
    <Drawer open onClose={onClose} title="New purchase order" subtitle="Order parts or services from a supplier"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="add-po" type="submit">Create order</button>
      </>}>
      <form id="add-po" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Supplier</span>
          <select className="select" value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
            <option value="">Select supplier…</option>
            {suppliers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <label className="field"><span>PO reference</span>
          <input className="input" value={form.ref} onChange={(e) => set("ref", e.target.value)} placeholder="auto if blank" /></label>
        <label className="field"><span>Total (AED)</span>
          <input className="input" type="number" value={form.total} onChange={(e) => set("total", e.target.value)} /></label>
        <label className="field full"><span>Order date</span>
          <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}
