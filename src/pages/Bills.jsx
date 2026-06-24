import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, Plus, Trash2, Wallet, AlertTriangle, CheckCircle2, CalendarClock, RotateCcw,
  Wrench, Sparkles, Zap, Shield, Umbrella, Briefcase, Receipt, Tag,
} from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll, daysUntil } from "../lib/domain";
import { fmtDate, fmtDateLong, todayISO, TODAY, parseISO } from "../lib/format";
import { BILL_CATEGORIES, BILL_PAY_METHODS } from "../lib/constants";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import TowerFilter from "../components/TowerFilter";
import { useConfirm } from "../components/ConfirmDialog";
import SearchSelect from "../components/SearchSelect";

const CAT_ICON = {
  maintenance: Wrench, cleaning: Sparkles, utility: Zap, security: Shield,
  insurance: Umbrella, management: Briefcase, other: Receipt,
};
const catIcon = (c) => CAT_ICON[c] || Receipt;
const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
const methodLabel = (m) => BILL_PAY_METHODS.find((x) => x.key === m)?.label || titleCase(m);

// Stored status is paid/unpaid; "overdue" is derived from the due date so a
// bill that slips past its date reads as overdue without a manual edit.
function effStatus(b) {
  if (b.status === "paid") return "paid";
  return parseISO(b.dueDate) < TODAY ? "overdue" : "unpaid";
}
const STATUS_FILTERS = ["all", "unpaid", "overdue", "paid"];
const RANK = { overdue: 0, unpaid: 1, paid: 2 };

export default function Bills() {
  const { db, companyId } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const ix = indexAll(s);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [towerFilter, setTowerFilter] = useState("all");
  const [searchParams] = useSearchParams();
  const [openId, setOpenId] = useState(() => searchParams.get("open"));
  const [addOpen, setAddOpen] = useState(false);

  const rows = s.bills.map((bill) => ({
    bill, supplier: ix.contacts[bill.supplierId], tower: ix.towers[bill.towerId], st: effStatus(bill),
  }));

  const filtered = rows.filter((r) => {
    if (towerFilter !== "all" && r.bill.towerId !== towerFilter) return false;
    if (status !== "all" && r.st !== status) return false;
    if (category !== "all" && r.bill.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (r.supplier?.name || "").toLowerCase().includes(q) || (r.bill.billNo || "").toLowerCase().includes(q) ||
      (r.bill.category || "").toLowerCase().includes(q) || (r.tower?.name || "").toLowerCase().includes(q);
  }).sort((a, b) => (RANK[a.st] - RANK[b.st]) || a.bill.dueDate.localeCompare(b.bill.dueDate));

  const inViewTotal = filtered.reduce((acc, r) => acc + r.bill.amount, 0);

  const sum = (arr) => arr.reduce((acc, b) => acc + b.amount, 0);
  const open = s.bills.filter((b) => effStatus(b) !== "paid");
  const overdue = s.bills.filter((b) => effStatus(b) === "overdue");
  const dueSoon = s.bills.filter((b) => { if (effStatus(b) === "paid") return false; const d = daysUntil(b.dueDate); return d >= 0 && d <= 30; });
  const paid = s.bills.filter((b) => effStatus(b) === "paid");

  return (
    <div className="page">
      <PageHeader title="Supplier Bills" subtitle={`${s.bills.length} bill${s.bills.length === 1 ? "" : "s"} on record`}
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Add bill</button>} />

      <div className="kpi-grid kpi-4">
        <StatCard label="Outstanding" Icon={Wallet} tone="primary" value={open.length} hint={<Money value={sum(open)} />} />
        <StatCard label="Overdue" Icon={AlertTriangle} tone={overdue.length ? "danger" : "neutral"} value={overdue.length} hint={<Money value={sum(overdue)} />} />
        <StatCard label="Due in 30 days" Icon={CalendarClock} tone="accent" value={dueSoon.length} hint={<Money value={sum(dueSoon)} />} />
        <StatCard label="Paid" Icon={CheckCircle2} tone="success" value={paid.length} hint={<Money value={sum(paid)} />} />
      </div>

      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" placeholder="Search supplier, bill no, category" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="spacer" />
        <TowerFilter towers={s.towers} value={towerFilter} onChange={setTowerFilter} />
        <div className="period-ctl">
          <Tag className="period-ic" />
          <select className="select period-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="all">All categories</option>
            {BILL_CATEGORIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
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
        <div className="list-cap">{filtered.length} bill{filtered.length === 1 ? "" : "s"} in view · <Money value={inViewTotal} /></div>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr><th>Bill</th><th>Supplier</th><th>Tower</th><th>Due date</th><th className="num">Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(({ bill, supplier, tower, st }) => {
              const Icon = catIcon(bill.category);
              const overdueRow = st === "overdue";
              return (
                <tr key={bill.id} className={`row-click ${overdueRow ? "row-overdue" : ""}`} onClick={() => setOpenId(bill.id)}>
                  <td>
                    <div className="cell-tenant">
                      <span className="mt-ic"><Icon strokeWidth={1.8} /></span>
                      <div>
                        <div className="tn-name">{bill.billNo || "—"}</div>
                        <div className="tn-sub">{titleCase(bill.category)}</div>
                      </div>
                    </div>
                  </td>
                  <td>{supplier?.name || "—"}</td>
                  <td className="t-muted">{tower?.name || "—"}</td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>
                    {fmtDateLong(bill.dueDate)}{overdueRow && <span className="t-danger"> · overdue</span>}
                  </td>
                  <td className="num"><Money value={bill.amount} /></td>
                  <td><StatusBadge status={st} /></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6}><div className="empty"><Receipt /><p>No bills match.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </section>

      {openId && <BillDrawer key={openId} id={openId} s={s} onClose={() => setOpenId(null)} />}
      <AddBillDrawer open={addOpen} onClose={() => setAddOpen(false)} s={s} />
    </div>
  );
}

function AddBillDrawer({ open, onClose, s }) {
  const { add, companyId } = useData();
  const suppliers = s.contacts.filter((c) => (c.kind || []).includes("supplier"));
  const blank = { supplierId: "", towerId: "", category: "", billNo: "", amount: "", date: todayISO(), dueDate: todayISO() };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (!form.supplierId) return setError("Choose a supplier.");
    if (!form.towerId) return setError("Choose a property.");
    if (!form.category) return setError("Choose a category.");
    if (!Number(form.amount)) return setError("Enter the bill amount.");
    add("bills", {
      companyId, supplierId: form.supplierId, towerId: form.towerId, category: form.category,
      billNo: form.billNo.trim() || undefined, amount: Number(form.amount),
      date: form.date, dueDate: form.dueDate, status: "unpaid",
    });
    setForm(blank); setError(""); onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add a bill" subtitle="Record a supplier invoice to pay"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="add-bill" type="submit">Add bill</button>
      </>}>
      <form id="add-bill" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Supplier</span>
          <select className="select" value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
            <option value="">Select supplier…</option>
            {suppliers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <label className="field"><span>Property</span>
          <SearchSelect value={form.towerId} onChange={(v) => set("towerId", v)} options={s.towers.map((t) => ({ value: t.id, label: t.name }))} placeholder="Select property…" />
        </label>
        <label className="field"><span>Category</span>
          <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Select category…</option>
            {BILL_CATEGORIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
          </select></label>
        <label className="field"><span>Bill / invoice no.</span>
          <input className="input" value={form.billNo} onChange={(e) => set("billNo", e.target.value)} placeholder="e.g. CT-7782" /></label>
        <label className="field"><span>Amount (AED)</span>
          <input className="input" type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></label>
        <label className="field"><span>Bill date</span>
          <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></label>
        <label className="field full"><span>Due date</span>
          <input className="input" type="date" min={form.date} value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}

function BillDrawer({ id, s, onClose }) {
  const { update, setBillPaid, deleteBill } = useData();
  const confirm = useConfirm();
  const ix = indexAll(s);
  const bill = s.bills.find((b) => b.id === id);
  const [method, setMethod] = useState("bank");
  const [form, setForm] = useState(() => (bill ? {
    category: bill.category, billNo: bill.billNo || "", amount: String(bill.amount), date: bill.date, dueDate: bill.dueDate,
  } : null));
  if (!bill) return <Drawer open={false} onClose={onClose} />;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const supplier = ix.contacts[bill.supplierId];
  const tower = ix.towers[bill.towerId];
  const st = effStatus(bill);
  const Icon = catIcon(bill.category);
  const voucher = s.vouchers.find((v) => v.billId === bill.id);
  const dd = daysUntil(bill.dueDate);

  function saveDetails(e) {
    e.preventDefault();
    update("bills", id, {
      category: form.category, billNo: form.billNo.trim() || undefined,
      amount: Number(form.amount) || bill.amount, date: form.date, dueDate: form.dueDate,
    });
    onClose();
  }
  async function handleDelete() {
    const ok = await confirm({
      title: bill.billNo ? `Delete bill ${bill.billNo}?` : "Delete this bill?",
      message: voucher
        ? "This permanently removes the bill and the payment voucher it booked. This can't be undone."
        : "This permanently removes the bill. This can't be undone.",
      confirmLabel: "Delete bill",
    });
    if (ok) { deleteBill(id); onClose(); }
  }

  return (
    <Drawer open onClose={onClose} title={bill.billNo || "Bill"} subtitle={`${titleCase(bill.category)} · ${supplier?.name || "—"}`}
      footer={<>
        <button className="btn btn-danger" type="button" aria-label="Delete bill" title="Delete bill" onClick={handleDelete}><Trash2 /></button>
        <div className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <button className="btn btn-primary" form="edit-bill" type="submit">Save changes</button>
      </>}>
      <div className="drawer-tenant">
        <span className="mt-ic lg"><Icon strokeWidth={1.7} /></span>
        <div>
          <div className="t-h2">{supplier?.name || "—"}</div>
          <div className="t-muted" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
            <StatusBadge status={st} />
            {st !== "paid" && (dd >= 0
              ? <span style={{ fontSize: 13 }}>· due in {dd}d</span>
              : <span className="t-danger" style={{ fontSize: 13 }}>· {Math.abs(dd)}d overdue</span>)}
          </div>
        </div>
      </div>

      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">Amount</span><span className="v"><Money value={bill.amount} /></span></div>
        <div className="detail-row"><span className="k">Bill no.</span><span className="v">{bill.billNo || "—"}</span></div>
        <div className="detail-row"><span className="k">Category</span><span className="v">{titleCase(bill.category)}</span></div>
        <div className="detail-row"><span className="k">Tower</span><span className="v">{tower?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">Bill date</span><span className="v">{fmtDateLong(bill.date)}</span></div>
        <div className="detail-row"><span className="k">Due date</span><span className="v">{fmtDateLong(bill.dueDate)}</span></div>
        {bill.paidDate && <div className="detail-row"><span className="k">Paid</span><span className="v">{fmtDateLong(bill.paidDate)}</span></div>}
        {voucher && <div className="detail-row"><span className="k">Voucher</span><span className="v">{voucher.voucherNo} · {methodLabel(voucher.method)}</span></div>}
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Payment</h3>
      {st === "paid" ? (
        <div className="stage-picker" style={{ marginBottom: 20, alignItems: "center" }}>
          <span className="t-muted" style={{ fontSize: 13 }}>
            Paid{bill.paidDate ? ` on ${fmtDate(bill.paidDate)}` : ""}{voucher ? ` · voucher ${voucher.voucherNo}` : ""}.
          </span>
          <button className="btn btn-sm btn-ghost" onClick={() => setBillPaid(id, false)}><RotateCcw /> Mark unpaid</button>
        </div>
      ) : (
        <div className="inset-form" style={{ marginBottom: 20 }}>
          <div className="t-label" style={{ marginBottom: 10 }}>Record payment</div>
          <div className="form-grid">
            <label className="field full"><span>Method</span>
              <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
                {BILL_PAY_METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select></label>
            <div className="full" style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary" type="button" onClick={() => setBillPaid(id, true, { method })}><CheckCircle2 /> Mark as paid</button>
            </div>
          </div>
        </div>
      )}

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Bill details</h3>
      <form id="edit-bill" onSubmit={saveDetails} className="form-grid">
        <label className="field"><span>Category</span>
          <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
            {BILL_CATEGORIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
          </select></label>
        <label className="field"><span>Bill / invoice no.</span>
          <input className="input" value={form.billNo} onChange={(e) => set("billNo", e.target.value)} /></label>
        <label className="field"><span>Amount (AED)</span>
          <input className="input" type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></label>
        <label className="field"><span>Bill date</span>
          <input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></label>
        <label className="field full"><span>Due date</span>
          <input className="input" type="date" min={form.date} value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></label>
      </form>
    </Drawer>
  );
}
