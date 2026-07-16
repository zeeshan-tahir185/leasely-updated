import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Printer, ReceiptText, Wallet, Hash, CalendarDays, Star } from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll } from "../lib/domain";
import { fmtDateLong, CUR_PERIOD, periodLabelLong, todayISO, phoneMatch } from "../lib/format";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import TowerFilter from "../components/TowerFilter";
import SearchSelect from "../components/SearchSelect";

const AGAINST = [
  { key: "all", label: "All" }, { key: "rent", label: "Rent" }, { key: "deposit", label: "Deposit" },
  { key: "commission", label: "Commission" }, { key: "booking", label: "Booking" }, { key: "other", label: "Other" },
];
const AGAINST_LABEL = { rent: "Rent", deposit: "Deposit", commission: "Commission", booking: "Booking", ejari: "Ejari", other: "Other" };
const METHODS = ["cash", "cheque", "bank", "card"];
const METHOD_LABEL = { cash: "Cash", cheque: "Cheque", bank: "Bank transfer", card: "Card" };

export default function Receipts() {
  const { db, companyId, add } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const ix = indexAll(s);
  const [query, setQuery] = useState("");
  const [against, setAgainst] = useState("all");
  const [towerFilter, setTowerFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  // Cheque receipts carry their cheque number directly (manual entry) or via the
  // cleared cheque that booked them.
  const chequeNoOf = (r) => r.chequeNo || (r.chequeId ? s.cheques.find((c) => c.id === r.chequeId)?.chequeNo : null);

  const rows = s.receipts
    .map((r) => ({ r, from: ix.contacts[r.contactId], tower: ix.towers[r.towerId] }))
    // most recent first: by date, then by creation time so a just-created receipt tops same-date rows
    .sort((a, b) => b.r.date.localeCompare(a.r.date) || (b.r.createdTs || 0) - (a.r.createdTs || 0));

  const filtered = rows.filter(({ r, from }) => {
    if (towerFilter !== "all" && r.towerId !== towerFilter) return false;
    if (against !== "all" && (r.against || "other") !== against) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (from?.name || "").toLowerCase().includes(q) || r.voucherNo.toLowerCase().includes(q) || phoneMatch(from?.phone, q);
  });

  const monthTotal = s.receipts.filter((r) => r.date.slice(0, 7) === CUR_PERIOD).reduce((a, r) => a + r.amount, 0);
  const total = s.receipts.reduce((a, r) => a + r.amount, 0);

  return (
    <div className="page">
      <PageHeader title="Receipts" subtitle="Money received — receipt vouchers"
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> New receipt</button>} />

      <div className="kpi-grid">
        <StatCard label={`Received in ${periodLabelLong(CUR_PERIOD).split(" ")[0]}`} Icon={Wallet} tone="success" value={<Money value={monthTotal} />} hint="this month" />
        <StatCard label="Received total" Icon={CalendarDays} tone="primary" value={<Money value={total} />} hint="all receipts" />
        <StatCard label="Receipts" Icon={Hash} value={s.receipts.length} hint="vouchers issued" />
        <StatCard label="Avg receipt" Icon={ReceiptText} tone="accent" value={<Money value={s.receipts.length ? Math.round(total / s.receipts.length) : 0} />} hint="per voucher" />
      </div>

      <div className="toolbar">
        <div className="search"><Search /><input className="input" placeholder="Search payer, phone or voucher no" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="spacer" />
        <TowerFilter towers={s.towers} value={towerFilter} onChange={setTowerFilter} />
        <div className="seg seg-wrap">{AGAINST.map((a) => <button key={a.key} data-active={against === a.key} onClick={() => setAgainst(a.key)}>{a.label}</button>)}</div>
      </div>

      <section className="card card-table">
        <table className="table">
          <thead><tr><th>Voucher</th><th>Date</th><th>Received from</th><th>For</th><th>Tower</th><th>Method</th><th className="num">Amount</th></tr></thead>
          <tbody>
            {filtered.map(({ r, from, tower }) => (
              <tr key={r.id} className={`row-click ${r.isNew ? "row-new" : ""}`} onClick={() => setOpenId(r.id)}>
                <td style={{ fontWeight: 600 }}>{r.voucherNo}{r.isNew && <span className="new-flag"><Star /> New</span>}</td>
                <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{fmtDateLong(r.date)}</td>
                <td>{from?.name || "—"}</td>
                <td><span className="badge badge-neutral">{AGAINST_LABEL[r.against] || "Other"}</span></td>
                <td className="t-muted">{tower?.name || "—"}</td>
                <td className="t-muted">
                  {METHOD_LABEL[r.method] || r.method}
                  {r.method === "cheque" && chequeNoOf(r) && <span className="t-faint"> · #{chequeNoOf(r)}</span>}
                </td>
                <td className="num"><Money value={r.amount} /></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7}><div className="empty"><ReceiptText /><p>No receipts match.</p></div></td></tr>}
          </tbody>
        </table>
      </section>

      {openId && <ReceiptDrawer r={s.receipts.find((x) => x.id === openId)} s={s} onClose={() => setOpenId(null)} />}
      <AddReceiptDrawer open={addOpen} onClose={() => setAddOpen(false)} s={s}
        onAdd={(rec) => add("receipts", { companyId, voucherNo: `RV-${8200 + s.receipts.length}`, createdTs: Date.now(), ...rec })} />
    </div>
  );
}

function ReceiptDrawer({ r, s, onClose }) {
  const { update } = useData();
  const ix = indexAll(s);
  // Opening a freshly auto-created receipt acknowledges it: the "New" highlight clears.
  useEffect(() => { if (r?.isNew) update("receipts", r.id, { isNew: false }); }, [r?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return <Drawer open={false} onClose={onClose} />;
  const cheque = r.chequeId ? s.cheques.find((c) => c.id === r.chequeId) : null;
  const chequeNo = r.chequeNo || cheque?.chequeNo;
  return (
    <Drawer open onClose={onClose} title={r.voucherNo} subtitle="Receipt voucher"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <Link to={`/receipts/${r.id}/print`} target="_blank" rel="noreferrer" className="btn btn-primary"><Printer /> Print receipt</Link>
      </>}>
      <div className="detail-list">
        <div className="detail-row"><span className="k">Amount</span><span className="v"><Money value={r.amount} /></span></div>
        <div className="detail-row"><span className="k">Received from</span><span className="v">{ix.contacts[r.contactId]?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">For</span><span className="v">{AGAINST_LABEL[r.against] || "Other"}</span></div>
        <div className="detail-row"><span className="k">Method</span><span className="v">{METHOD_LABEL[r.method] || r.method}</span></div>
        {r.method === "cheque" && chequeNo && (
          <div className="detail-row"><span className="k">Cheque no.</span><span className="v">#{chequeNo}{cheque?.bankName ? ` · ${cheque.bankName}` : ""}</span></div>
        )}
        <div className="detail-row"><span className="k">Tower</span><span className="v">{ix.towers[r.towerId]?.name || "—"}</span></div>
        <div className="detail-row"><span className="k">Date</span><span className="v">{fmtDateLong(r.date)}</span></div>
        {r.contractId && <div className="detail-row"><span className="k">Contract</span><span className="v">{ix.contracts[r.contractId]?.contractNo || "—"}</span></div>}
      </div>
    </Drawer>
  );
}

function AddReceiptDrawer({ open, onClose, s, onAdd }) {
  const { add, companyId } = useData();
  const payers = s.contacts.filter((c) => (c.kind || []).some((k) => ["tenant", "buyer", "lead"].includes(k)));
  const blank = { contactId: "", newParty: "", towerId: s.towers[0]?.id || "", against: "rent", method: "cheque", chequeNo: "", amount: "", date: todayISO() };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (!form.contactId && !form.newParty.trim()) return setError("Choose who paid.");
    if (!Number(form.amount)) return setError("Enter the amount.");
    let contactId = form.contactId;
    if (form.newParty.trim()) contactId = add("contacts", { companyId, name: form.newParty.trim(), kind: ["tenant"] });
    onAdd({ contactId, towerId: form.towerId, against: form.against, method: form.method, amount: Number(form.amount), date: form.date, chequeNo: form.method === "cheque" && form.chequeNo.trim() ? form.chequeNo.trim() : undefined });
    setForm(blank); setError(""); onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="New receipt" subtitle="Record money received"
      footer={<><button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="add-receipt" type="submit">Add receipt</button></>}>
      <form id="add-receipt" onSubmit={submit} className="form-grid">
        <label className="field"><span>Received from</span>
          <SearchSelect value={form.contactId} onChange={(v) => set("contactId", v)}
            options={payers.map((c) => ({ value: c.id, label: c.name, sub: c.phone }))} placeholder="Select…" />
        </label>
        <label className="field"><span>…or new payer</span><input className="input" value={form.newParty} onChange={(e) => set("newParty", e.target.value)} placeholder="Name" /></label>
        <label className="field"><span>Tower</span>
          <SearchSelect value={form.towerId} onChange={(v) => set("towerId", v)} options={s.towers.map((t) => ({ value: t.id, label: t.name }))} placeholder="Select…" />
        </label>
        <label className="field"><span>For</span>
          <select className="select" value={form.against} onChange={(e) => set("against", e.target.value)}>{Object.entries(AGAINST_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="field"><span>Method</span>
          <select className="select" value={form.method} onChange={(e) => set("method", e.target.value)}>{METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select></label>
        {form.method === "cheque" && (
          <label className="field"><span>Cheque number</span><input className="input" value={form.chequeNo} onChange={(e) => set("chequeNo", e.target.value)} placeholder="e.g. 100482" /></label>
        )}
        <label className="field"><span>Amount (AED)</span><input className="input" type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></label>
        <label className="field full"><span>Date</span><input className="input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}
