import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search, Banknote, ArrowDownLeft, ArrowUpRight, Wallet, AlertTriangle, CheckCircle2, RefreshCw, CalendarRange, Plus, Trash2,
} from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll, chequeDueSoon, chequeOverdue, daysUntil } from "../lib/domain";
import { fmtDateLong, CUR_PERIOD, TODAY, parseISO, monthKey, todayISO, phoneMatch } from "../lib/format";
import { UAE_BANKS, CHEQUE_STATUSES } from "../lib/constants";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import TowerFilter from "../components/TowerFilter";
import { useConfirm } from "../components/ConfirmDialog";
import SearchSelect from "../components/SearchSelect";

const DIRS = [{ key: "all", label: "All" }, { key: "in", label: "Incoming" }, { key: "out", label: "Outgoing" }];
const STATUSES = ["all", "pending", "deposited", "cleared", "bounced", "replaced"];
const NEXT = {
  pending: ["deposited", "cleared", "bounced"],
  deposited: ["cleared", "bounced"],
  cleared: ["pending"],
  bounced: [],
  replaced: [],
};
const ACTION_LABEL = { deposited: "Mark deposited", cleared: "Mark cleared", bounced: "Mark bounced", pending: "Move back to pending" };

const PERIOD_OPTIONS = [
  { key: "all", label: "All dates" },
  { key: "overdue", label: "Overdue" },
  { key: "month", label: "Due this month" },
  { key: "30d", label: "Due next 30 days" },
  { key: "90d", label: "Due next 90 days" },
  { key: "custom", label: "Custom range…" },
];

// Predicate over a cheque's due date for the selected period.
function periodPredicate(period, range) {
  if (period === "all") return () => true;
  if (period === "overdue") return (ch) => ch.status === "pending" && parseISO(ch.dueDate) < TODAY;
  if (period === "month") { const k = monthKey(TODAY); return (ch) => ch.dueDate.slice(0, 7) === k; }
  if (period === "30d" || period === "90d") {
    const limit = new Date(TODAY); limit.setDate(limit.getDate() + (period === "30d" ? 30 : 90));
    return (ch) => { const d = parseISO(ch.dueDate); return d >= TODAY && d <= limit; };
  }
  if (period === "custom") {
    const from = range.from ? parseISO(range.from) : null;
    const to = range.to ? parseISO(range.to) : null;
    return (ch) => { const d = parseISO(ch.dueDate); return (!from || d >= from) && (!to || d <= to); };
  }
  return () => true;
}

export default function Cheques() {
  const { db, companyId } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const ix = indexAll(s);
  const [query, setQuery] = useState("");
  const [dir, setDir] = useState("all");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("all");
  const [range, setRange] = useState({ from: "", to: "" });
  const [searchParams] = useSearchParams();
  const [openId, setOpenId] = useState(() => searchParams.get("open")); // deep-link from an alert
  const [addOpen, setAddOpen] = useState(false);
  const [towerFilter, setTowerFilter] = useState("all");

  const chequeDays = s.settings?.chequeAlertDays ?? 7;
  const inPeriod = useMemo(() => periodPredicate(period, range), [period, range]);

  const rows = s.cheques.map((ch) => ({
    ch, party: ix.contacts[ch.contactId], tower: ix.towers[ch.towerId], unit: ix.units[ix.contracts[ch.contractId]?.unitId],
  }));

  const filtered = rows.filter((r) => {
    if (towerFilter !== "all" && r.ch.towerId !== towerFilter) return false;
    if (dir !== "all" && r.ch.kind !== dir) return false;
    if (status !== "all" && r.ch.status !== status) return false;
    if (!inPeriod(r.ch)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (r.party?.name || "").toLowerCase().includes(q) || r.ch.chequeNo.includes(q) ||
      r.ch.bankName.toLowerCase().includes(q) || phoneMatch(r.party?.phone, q);
  }).sort((a, b) => a.ch.dueDate.localeCompare(b.ch.dueDate));

  const inViewTotal = filtered.reduce((a, r) => a + r.ch.amount, 0);

  // KPIs
  const incoming = s.cheques.filter((c) => c.kind === "in");
  const inHand = incoming.filter((c) => c.status === "pending");
  const dueSoon = incoming.filter((c) => chequeDueSoon(c, chequeDays));
  const clearedMonth = s.cheques.filter((c) => c.status === "cleared" && (c.clearedDate || "").slice(0, 7) === CUR_PERIOD);
  const bounced = s.cheques.filter((c) => c.status === "bounced");
  const sum = (arr) => arr.reduce((a, c) => a + c.amount, 0);

  return (
    <div className="page">
      <PageHeader title="Cheque Management" subtitle={`${s.cheques.length} cheques on record`}
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Add cheque</button>} />

      <div className="kpi-grid kpi-4">
        <StatCard label="In hand (pending)" Icon={Wallet} tone="primary" value={inHand.length} hint={<Money value={sum(inHand)} />} />
        <StatCard label="Due to deposit" Icon={Banknote} tone="accent" value={dueSoon.length} hint={`within ${chequeDays} days`} />
        <StatCard label="Cleared this month" Icon={CheckCircle2} tone="success" value={clearedMonth.length} hint={<Money value={sum(clearedMonth)} />} />
        <StatCard label="Bounced" Icon={AlertTriangle} tone={bounced.length ? "danger" : "neutral"} value={bounced.length} hint={<Money value={sum(bounced)} />} />
      </div>

      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" placeholder="Search payer, phone, bank, cheque no" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="spacer" />
        <TowerFilter towers={s.towers} value={towerFilter} onChange={setTowerFilter} />
        <div className="period-ctl">
          <CalendarRange className="period-ic" />
          <select className="select period-select" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Due-date period">
            {PERIOD_OPTIONS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        <div className="seg">{DIRS.map((d) => <button key={d.key} data-active={dir === d.key} onClick={() => setDir(d.key)}>{d.label}</button>)}</div>
      </div>

      {period === "custom" && (
        <div className="range-row">
          <label className="range-field"><span>From</span>
            <input className="input" type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></label>
          <label className="range-field"><span>To</span>
            <input className="input" type="date" value={range.to} min={range.from} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></label>
        </div>
      )}

      <div className="filter-bar">
        <div className="seg seg-wrap">
          {STATUSES.map((st) => (
            <button key={st} data-active={status === st} onClick={() => setStatus(st)}>
              {st === "all" ? "All statuses" : st[0].toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className="list-cap">{filtered.length} cheque{filtered.length === 1 ? "" : "s"} in view · <Money value={inViewTotal} /></div>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr><th>Cheque</th><th>Party</th><th>Bank</th><th>Tower / Unit</th><th>Due date</th><th className="num">Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(({ ch, party, tower, unit }) => {
              const overdue = chequeOverdue(ch);
              return (
                <tr key={ch.id} className={`row-click ${overdue ? "row-overdue" : ""}`} onClick={() => setOpenId(ch.id)}>
                  <td>
                    <div className="cell-tenant">
                      <span className={`dir-ic ${ch.kind}`}>{ch.kind === "in" ? <ArrowDownLeft /> : <ArrowUpRight />}</span>
                      <div>
                        <div className="tn-name">#{ch.chequeNo}</div>
                        <div className="tn-sub">{ch.kind === "in" ? "Incoming" : "Outgoing"}</div>
                      </div>
                    </div>
                  </td>
                  <td>{party?.name || "—"}</td>
                  <td className="t-muted">{ch.bankName}</td>
                  <td><div className="tn-name" style={{ fontWeight: 500 }}>{tower?.name || "—"}</div>{unit && <div className="tn-sub">Unit {unit.label}</div>}</td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{fmtDateLong(ch.dueDate)}{overdue && <span className="t-danger"> · overdue</span>}</td>
                  <td className="num"><Money value={ch.amount} /></td>
                  <td><StatusBadge status={ch.status} /></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7}><div className="empty"><Banknote /><p>No cheques match.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </section>

      {openId && <ChequeDrawer id={openId} s={s} onClose={() => setOpenId(null)} />}
      <AddChequeDrawer open={addOpen} onClose={() => setAddOpen(false)} s={s} />
    </div>
  );
}

function AddChequeDrawer({ open, onClose, s }) {
  const { add, setChequeStatus, companyId } = useData();
  const blank = {
    kind: "in", towerId: s.towers[0]?.id || "", contactId: "", newParty: "",
    contractId: "", bankName: UAE_BANKS[0], chequeNo: "", amount: "", dueDate: todayISO(), status: "pending",
  };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Incoming cheques come from tenants/buyers; outgoing go to suppliers/owners.
  const partyKinds = form.kind === "in" ? ["tenant", "lead", "buyer"] : ["supplier", "owner"];
  const parties = s.contacts.filter((c) => (c.kind || []).some((k) => partyKinds.includes(k)));
  const contractsInTower = s.contracts.filter((c) => c.towerId === form.towerId);

  function submit(e) {
    e.preventDefault();
    if (!form.towerId) return setError("Choose a tower.");
    if (!form.contactId && !form.newParty.trim()) return setError("Choose a party or enter a new one.");
    if (!form.chequeNo.trim()) return setError("Enter the cheque number.");
    if (!Number(form.amount)) return setError("Enter the cheque amount.");
    let contactId = form.contactId;
    if (form.newParty.trim()) {
      contactId = add("contacts", { companyId, name: form.newParty.trim(), kind: [form.kind === "in" ? "tenant" : "supplier"] });
    }
    const id = add("cheques", {
      companyId, kind: form.kind, towerId: form.towerId, contactId,
      contractId: form.kind === "in" && form.contractId ? form.contractId : undefined,
      bankName: form.bankName, chequeNo: form.chequeNo.trim(), amount: Number(form.amount),
      dueDate: form.dueDate, status: "pending",
    });
    // Run any non-pending starting status through the status action for side effects.
    if (form.status !== "pending") setChequeStatus(id, form.status);
    setForm(blank); setError(""); onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add a cheque" subtitle="Record a cheque received or issued"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="add-cheque" type="submit">Add cheque</button>
      </>}>
      <form id="add-cheque" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Direction</span>
          <div className="seg" role="tablist">
            <button type="button" data-active={form.kind === "in"} onClick={() => setForm((f) => ({ ...f, kind: "in", contactId: "", contractId: "" }))}>Incoming (received)</button>
            <button type="button" data-active={form.kind === "out"} onClick={() => setForm((f) => ({ ...f, kind: "out", contactId: "", contractId: "" }))}>Outgoing (issued)</button>
          </div>
        </label>
        <label className="field full"><span>Tower</span>
          <SearchSelect value={form.towerId} onChange={(v) => set("towerId", v)} options={s.towers.map((t) => ({ value: t.id, label: t.name }))} placeholder="Select…" />
        </label>
        <label className="field"><span>{form.kind === "in" ? "Received from" : "Pay to"}</span>
          <SearchSelect value={form.contactId} onChange={(v) => set("contactId", v)}
            options={parties.map((c) => ({ value: c.id, label: c.name, sub: c.phone }))} placeholder="Select…" />
        </label>
        <label className="field"><span>…or new party</span>
          <input className="input" value={form.newParty} onChange={(e) => set("newParty", e.target.value)} placeholder="Name" /></label>
        {form.kind === "in" && contractsInTower.length > 0 && (
          <label className="field full"><span>Link to contract (optional)</span>
            <select className="select" value={form.contractId} onChange={(e) => set("contractId", e.target.value)}>
              <option value="">None</option>
              {contractsInTower.map((c) => <option key={c.id} value={c.id}>{c.contractNo}</option>)}
            </select></label>
        )}
        <label className="field"><span>Bank</span>
          <select className="select" value={form.bankName} onChange={(e) => set("bankName", e.target.value)}>
            {UAE_BANKS.map((b) => <option key={b}>{b}</option>)}
          </select></label>
        <label className="field"><span>Cheque number</span>
          <input className="input" value={form.chequeNo} onChange={(e) => set("chequeNo", e.target.value)} placeholder="e.g. 100482" /></label>
        <label className="field"><span>Amount (AED)</span>
          <input className="input" type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></label>
        <label className="field"><span>Due date</span>
          <input className="input" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></label>
        <label className="field full"><span>Starting status</span>
          <select className="select" value={form.status} onChange={(e) => set("status", e.target.value)}>
            {CHEQUE_STATUSES.filter((st) => st !== "replaced").map((st) => <option key={st} value={st}>{st[0].toUpperCase() + st.slice(1)}</option>)}
          </select></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}

function ChequeDrawer({ id, s, onClose }) {
  const { update, setChequeStatus, replaceCheque, deleteCheque } = useData();
  const confirm = useConfirm();
  const ix = indexAll(s);
  const ch = s.cheques.find((c) => c.id === id);
  const linkedReceipt = s.receipts.find((r) => r.chequeId === id);
  async function handleDelete() {
    const ok = await confirm({
      title: `Delete cheque #${ch.chequeNo}?`,
      message: linkedReceipt
        ? "This permanently removes the cheque and the rent receipt it booked. This can't be undone."
        : "This permanently removes the cheque. This can't be undone.",
      confirmLabel: "Delete cheque",
    });
    if (ok) { deleteCheque(id); onClose(); }
  }
  const [replacing, setReplacing] = useState(false);
  const [form, setForm] = useState(null);
  if (!ch) return <Drawer open={false} onClose={onClose} />;
  const party = ix.contacts[ch.contactId];
  const contract = ix.contracts[ch.contractId];
  const f = form || { bankName: ch.bankName, chequeNo: ch.chequeNo, amount: String(ch.amount), dueDate: ch.dueDate };
  const set = (k, v) => setForm({ ...f, [k]: v });
  const days = daysUntil(ch.dueDate);

  function saveDetails(e) {
    e.preventDefault();
    update("cheques", id, { bankName: f.bankName, chequeNo: f.chequeNo, amount: Number(f.amount) || ch.amount, dueDate: f.dueDate });
    onClose();
  }

  return (
    <Drawer open onClose={onClose} title={`Cheque #${ch.chequeNo}`} subtitle={`${ch.kind === "in" ? "Incoming" : "Outgoing"} · ${ch.bankName}`}
      footer={<>
        <button className="btn btn-danger" type="button" aria-label="Delete cheque" title="Delete cheque" onClick={handleDelete}><Trash2 /></button>
        <div className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <button className="btn btn-primary" form="edit-chq" type="submit">Save changes</button>
      </>}>
      <div className="drawer-tenant">
        <span className={`dir-ic lg ${ch.kind}`}>{ch.kind === "in" ? <ArrowDownLeft /> : <ArrowUpRight />}</span>
        <div>
          <div className="t-h2">{party?.name || "—"}</div>
          <div className="t-muted"><StatusBadge status={ch.status} />{ch.status === "pending" && days >= 0 ? ` · due in ${days}d` : ""}</div>
        </div>
      </div>

      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">Amount</span><span className="v"><Money value={ch.amount} /></span></div>
        <div className="detail-row"><span className="k">Due date</span><span className="v">{fmtDateLong(ch.dueDate)}</span></div>
        {ch.clearedDate && <div className="detail-row"><span className="k">Cleared</span><span className="v">{fmtDateLong(ch.clearedDate)}</span></div>}
        {contract && <div className="detail-row"><span className="k">Contract</span><span className="v"><Link to="/contracts" className="cell-link">{contract.contractNo}</Link></span></div>}
        {ch.replacedById && <div className="detail-row"><span className="k">Replaced by</span><span className="v">new cheque issued</span></div>}
        {ch.replacesId && <div className="detail-row"><span className="k">Note</span><span className="v">replacement cheque</span></div>}
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Update status</h3>
      <div className="stage-picker" style={{ marginBottom: replacing ? 14 : 20 }}>
        {(NEXT[ch.status] || []).map((st) => (
          <button key={st} className={`btn btn-sm ${st === "bounced" ? "btn-ghost" : "btn-primary"}`} onClick={() => setChequeStatus(id, st)}>
            {ACTION_LABEL[st]}
          </button>
        ))}
        {ch.status === "bounced" && !replacing && (
          <button className="btn btn-sm btn-primary" onClick={() => setReplacing(true)}><RefreshCw /> Replace cheque</button>
        )}
        {(NEXT[ch.status] || []).length === 0 && ch.status !== "bounced" && <span className="t-muted" style={{ fontSize: 13 }}>No further action — {ch.status}.</span>}
      </div>

      {replacing && (
        <ReplaceForm cheque={ch} onCancel={() => setReplacing(false)}
          onReplace={(payload) => { replaceCheque(id, payload); onClose(); }} />
      )}

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Cheque details</h3>
      <form id="edit-chq" onSubmit={saveDetails} className="form-grid">
        <label className="field full"><span>Bank</span>
          <select className="select" value={f.bankName} onChange={(e) => set("bankName", e.target.value)}>
            {[...new Set([ch.bankName, ...UAE_BANKS])].map((b) => <option key={b}>{b}</option>)}
          </select></label>
        <label className="field"><span>Cheque number</span>
          <input className="input" value={f.chequeNo} onChange={(e) => set("chequeNo", e.target.value)} /></label>
        <label className="field"><span>Amount (AED)</span>
          <input className="input" type="number" value={f.amount} onChange={(e) => set("amount", e.target.value)} /></label>
        <label className="field full"><span>Due date</span>
          <input className="input" type="date" value={f.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></label>
      </form>
    </Drawer>
  );
}

function ReplaceForm({ cheque, onReplace, onCancel }) {
  const [form, setForm] = useState({ chequeNo: "", bankName: cheque.bankName, dueDate: cheque.dueDate });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="card" style={{ padding: 14, marginBottom: 20, background: "var(--surface-2)" }}>
      <div className="t-label" style={{ marginBottom: 10 }}>Replacement cheque</div>
      <div className="form-grid">
        <label className="field"><span>New cheque no.</span>
          <input className="input" value={form.chequeNo} onChange={(e) => set("chequeNo", e.target.value)} placeholder="e.g. 100412" /></label>
        <label className="field"><span>Bank</span>
          <select className="select" value={form.bankName} onChange={(e) => set("bankName", e.target.value)}>
            {[...new Set([cheque.bankName, ...UAE_BANKS])].map((b) => <option key={b}>{b}</option>)}
          </select></label>
        <label className="field full"><span>New due date</span>
          <input className="input" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></label>
        <div className="full" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary btn-sm" type="button" onClick={() => onReplace(form)}>Issue replacement</button>
        </div>
      </div>
    </div>
  );
}
