import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Printer, HandCoins, Hash, TrendingDown, CalendarDays } from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll } from "../lib/domain";
import { fmtDateLong, CUR_PERIOD, periodLabelLong, todayISO, phoneMatch } from "../lib/format";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import TowerFilter from "../components/TowerFilter";

const CAT_LABEL = {
  maintenance: "Maintenance", cleaning: "Cleaning", utility: "Utilities", salary: "Salaries",
  supplier: "Supplier", "owner-payout": "Owner payout", commission: "Commission", misc: "Other",
};
const CATS = [{ key: "all", label: "All" }, ...Object.entries(CAT_LABEL).map(([key, label]) => ({ key, label }))];
const METHODS = ["cash", "cheque", "bank", "card"];
const METHOD_LABEL = { cash: "Cash", cheque: "Cheque", bank: "Bank transfer", card: "Card" };

export default function Vouchers() {
  const { db, companyId, add } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const ix = indexAll(s);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [towerFilter, setTowerFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const rows = s.vouchers
    .map((v) => ({ v, payee: ix.contacts[v.payeeId], tower: ix.towers[v.towerId] }))
    .sort((a, b) => b.v.date.localeCompare(a.v.date));

  const filtered = rows.filter(({ v, payee }) => {
    if (towerFilter !== "all" && v.towerId !== towerFilter) return false;
    if (cat !== "all" && v.category !== cat) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (payee?.name || "").toLowerCase().includes(q) || v.voucherNo.toLowerCase().includes(q) || phoneMatch(payee?.phone, q);
  });

  const monthTotal = s.vouchers.filter((v) => v.date.slice(0, 7) === CUR_PERIOD).reduce((a, v) => a + v.amount, 0);
  const total = s.vouchers.reduce((a, v) => a + v.amount, 0);

  return (
    <div className="page">
      <PageHeader title="Payment Vouchers" subtitle="Money paid out — payment vouchers"
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> New voucher</button>} />

      <div className="kpi-grid">
        <StatCard label={`Paid in ${periodLabelLong(CUR_PERIOD).split(" ")[0]}`} Icon={TrendingDown} tone="danger" value={<Money value={monthTotal} />} hint="this month" />
        <StatCard label="Paid total" Icon={CalendarDays} tone="primary" value={<Money value={total} />} hint="all vouchers" />
        <StatCard label="Vouchers" Icon={Hash} value={s.vouchers.length} hint="issued" />
        <StatCard label="Avg voucher" Icon={HandCoins} tone="accent" value={<Money value={s.vouchers.length ? Math.round(total / s.vouchers.length) : 0} />} hint="per voucher" />
      </div>

      <div className="toolbar">
        <div className="search"><Search /><input className="input" placeholder="Search payee, phone or voucher no" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="spacer" />
        <TowerFilter towers={s.towers} value={towerFilter} onChange={setTowerFilter} />
        <div className="seg seg-wrap">{CATS.map((c) => <button key={c.key} data-active={cat === c.key} onClick={() => setCat(c.key)}>{c.label}</button>)}</div>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead><tr><th>Voucher</th><th>Date</th><th>Pay to</th><th>Category</th><th>Tower</th><th>Method</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {filtered.map(({ v, payee, tower }) => (
              <tr key={v.id} className="row-click" onClick={() => setOpenId(v.id)}>
                <td style={{ fontWeight: 600 }}>{v.voucherNo}</td>
                <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{fmtDateLong(v.date)}</td>
                <td>{payee?.name || "—"}</td>
                <td><span className="badge badge-neutral">{CAT_LABEL[v.category] || v.category}</span></td>
                <td className="t-muted">{tower?.name || "—"}</td>
                <td className="t-muted">{METHOD_LABEL[v.method] || v.method}</td>
                <td className="num"><Money value={v.amount} /></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7}><div className="empty"><HandCoins /><p>No vouchers match.</p></div></td></tr>}
          </tbody>
        </table>
      </section>

      {openId && <VoucherDrawer v={s.vouchers.find((x) => x.id === openId)} s={s} onClose={() => setOpenId(null)} />}
      <AddVoucherDrawer open={addOpen} onClose={() => setAddOpen(false)} s={s}
        onAdd={(rec) => add("vouchers", { companyId, voucherNo: `PV-${9200 + s.vouchers.length}`, ...rec })} />
    </div>
  );
}

function VoucherDrawer({ v, s, onClose }) {
  const ix = indexAll(s);
  if (!v) return <Drawer open={false} onClose={onClose} />;
  return (
    <Drawer open onClose={onClose} title={v.voucherNo} subtitle="Payment voucher"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <Link to={`/vouchers/${v.id}/print`} target="_blank" rel="noreferrer" className="btn btn-primary"><Printer /> Print voucher</Link>
      </>}>
      <div className="detail-list">
        <div className="detail-row"><span className="k">Amount</span><span className="v"><Money value={v.amount} /></span></div>
        <div className="detail-row"><span className="k">Pay to</span><span className="v">{ix.contacts[v.payeeId]?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">Category</span><span className="v">{CAT_LABEL[v.category] || v.category}</span></div>
        <div className="detail-row"><span className="k">Method</span><span className="v">{METHOD_LABEL[v.method] || v.method}</span></div>
        <div className="detail-row"><span className="k">Tower</span><span className="v">{ix.towers[v.towerId]?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">Date</span><span className="v">{fmtDateLong(v.date)}</span></div>
        {v.ref && <div className="detail-row"><span className="k">Reference</span><span className="v">{v.ref}</span></div>}
      </div>
    </Drawer>
  );
}

function AddVoucherDrawer({ open, onClose, s, onAdd }) {
  const { add, companyId } = useData();
  const payees = s.contacts.filter((c) => (c.kind || []).some((k) => ["supplier", "owner"].includes(k)));
  const blank = { payeeId: "", newParty: "", towerId: s.towers[0]?.id || "", category: "maintenance", method: "bank", amount: "", date: todayISO(), ref: "" };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (!form.payeeId && !form.newParty.trim()) return setError("Choose who is being paid.");
    if (!Number(form.amount)) return setError("Enter the amount.");
    let payeeId = form.payeeId;
    if (form.newParty.trim()) payeeId = add("contacts", { companyId, name: form.newParty.trim(), kind: ["supplier"] });
    onAdd({ payeeId, towerId: form.towerId, category: form.category, method: form.method, amount: Number(form.amount), date: form.date, ref: form.ref.trim() });
    setForm(blank); setError(""); onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="New payment voucher" subtitle="Record money paid out"
      footer={<><button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="add-voucher" type="submit">Add voucher</button></>}>
      <form id="add-voucher" onSubmit={submit} className="form-grid">
        <label className="field"><span>Pay to</span>
          <select className="select" value={form.payeeId} onChange={(e) => set("payeeId", e.target.value)}>
            <option value="">Select…</option>{payees.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <label className="field"><span>…or new payee</span><input className="input" value={form.newParty} onChange={(e) => set("newParty", e.target.value)} placeholder="Name" /></label>
        <label className="field"><span>Tower</span>
          <select className="select" value={form.towerId} onChange={(e) => set("towerId", e.target.value)}>{s.towers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="field"><span>Category</span>
          <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>{Object.entries(CAT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="field"><span>Method</span>
          <select className="select" value={form.method} onChange={(e) => set("method", e.target.value)}>{METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select></label>
        <label className="field"><span>Amount (AED)</span><input className="input" type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></label>
        <label className="field"><span>Date</span><input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></label>
        <label className="field"><span>Reference</span><input className="input" value={form.ref} onChange={(e) => set("ref", e.target.value)} placeholder="Bill / note" /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}
