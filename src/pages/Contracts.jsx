import { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Plus, Printer, RefreshCw, Ban, FileText, Pencil, Trash2, Paperclip } from "lucide-react";
import { useData } from "../data/store";
import {
  scopeData, indexAll, contractRows, chequesOfContract, unitRows, isExpiringSoon, daysUntil,
} from "../lib/domain";
import { fmtDateLong, todayISO, isoOf, parseISO, initials, phoneMatch } from "../lib/format";
import { UAE_BANKS, CHEQUE_STATUSES, CONTRACT_TYPES, DEFAULT_CONTRACT_CLAUSES } from "../lib/constants";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatusBadge from "../components/StatusBadge";
import Money from "../components/Money";
import TowerFilter from "../components/TowerFilter";
import Dropzone from "../components/Dropzone";
import Lightbox from "../components/Lightbox";
import { useConfirm } from "../components/ConfirmDialog";
import SearchSelect from "../components/SearchSelect";
import NewFlag from "../components/NewFlag";
import { fileToCompressedDataUrl } from "../lib/image";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expiring", label: "Expiring" },
  { key: "expired", label: "Expired" },
  { key: "terminated", label: "Ended" },
];

export default function Contracts() {
  const { db, companyId, update, markSeen } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const rows = useMemo(() => contractRows(s), [s]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const [openId, setOpenId] = useState(() => searchParams.get("open")); // deep-link from an alert
  const [addOpen, setAddOpen] = useState(false);
  const [towerFilter, setTowerFilter] = useState("all");

  // Arriving from a booking conversion (/contracts?book=<id>): pre-fill the
  // new-contract drawer with the unit, tenant and agreed rent, and open it.
  const bookId = searchParams.get("book");
  const bookingPrefill = useMemo(() => {
    if (!bookId) return null;
    const bk = s.bookings.find((b) => b.id === bookId);
    if (!bk || bk.status === "converted") return null;
    const unit = s.units.find((u) => u.id === bk.unitId);
    if (!unit) return null;
    return { bookingId: bk.id, towerId: unit.towerId, unitId: bk.unitId, tenantId: bk.contactId, annualRent: bk.amount };
  }, [bookId, s]);
  useEffect(() => { if (bookingPrefill) setAddOpen(true); }, [bookingPrefill?.bookingId]); // eslint-disable-line react-hooks/exhaustive-deps

  function closeCreate() {
    setAddOpen(false);
    if (bookId) { const sp = new URLSearchParams(searchParams); sp.delete("book"); setSearchParams(sp, { replace: true }); }
  }

  const leadDays = s.settings?.renewalLeadDays ?? 60;
  const filtered = rows.filter((r) => {
    if (towerFilter !== "all" && r.contract.towerId !== towerFilter) return false;
    const status = isExpiringSoon(r.contract, leadDays) && r.contract.status !== "expired" ? "expiring" : r.contract.status;
    if (filter !== "all" && status !== filter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return r.tenant?.name.toLowerCase().includes(q) || r.contract.contractNo.toLowerCase().includes(q) ||
      `${r.tower?.name} ${r.unit?.label}`.toLowerCase().includes(q) || phoneMatch(r.tenant?.phone, q);
  });

  const countBy = (k) => rows.filter((r) => {
    const status = isExpiringSoon(r.contract, leadDays) && r.contract.status !== "expired" ? "expiring" : r.contract.status;
    return status === k;
  }).length;

  return (
    <div className="page">
      <PageHeader
        title="Contracts"
        subtitle={`${rows.length} tenancy contracts`}
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> New contract</button>}
      />

      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" placeholder="Search tenant, phone, contract no, unit" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="spacer" />
        <TowerFilter towers={s.towers} value={towerFilter} onChange={setTowerFilter} />
        <div className="seg seg-wrap">
          {FILTERS.map((f) => (
            <button key={f.key} data-active={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}{f.key !== "all" && ` (${countBy(f.key)})`}
            </button>
          ))}
        </div>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr><th>Contract</th><th>Tenant</th><th>Tower / Unit</th><th className="num">Annual rent</th><th>Term</th><th className="num">Cheques</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const expiringSoon = isExpiringSoon(r.contract, leadDays) && r.contract.status !== "expired";
              const status = expiringSoon ? "expiring" : r.contract.status;
              const cleared = r.cheques.filter((c) => c.status === "cleared").length;
              const docCount = (r.contract.contractDoc ? 1 : 0) + (r.contract.chequeDocs?.length || 0);
              return (
                <tr key={r.contract.id} className={`row-click ${r.contract.isNew ? "row-new" : ""}`} onClick={() => { markSeen("contracts", r.contract.id); setOpenId(r.contract.id); }}>
                  <td style={{ fontWeight: 600 }}>
                    {r.contract.contractNo}<NewFlag show={r.contract.isNew} />
                    {docCount > 0 && (
                      <span className="doc-chip" title={`${docCount} document${docCount === 1 ? "" : "s"} on file`}>
                        <Paperclip /> {docCount}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="cell-tenant">
                      <span className="avatar avatar-sm">{initials(r.tenant?.name || "?")}</span>
                      <span className="tn-name">{r.tenant?.name || "—"}</span>
                    </div>
                  </td>
                  <td><div className="tn-name" style={{ fontWeight: 500 }}>{r.tower?.name}</div><div className="tn-sub">Unit {r.unit?.label}</div></td>
                  <td className="num"><Money value={r.contract.annualRent} /></td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{fmtDateLong(r.contract.startDate)} – {fmtDateLong(r.contract.endDate)}</td>
                  <td className="num tnum">{cleared}/{r.cheques.length}</td>
                  <td><StatusBadge status={status} /></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7}><div className="empty"><FileText /><p>No contracts match.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </section>

      {openId && <ContractDrawer id={openId} s={s} onClose={() => setOpenId(null)} />}
      <CreateContractDrawer key={bookingPrefill?.bookingId || "new"} open={addOpen} onClose={closeCreate} s={s}
        prefill={bookingPrefill}
        onCreated={() => bookingPrefill && update("bookings", bookingPrefill.bookingId, { status: "converted" })} />
    </div>
  );
}

function ContractDrawer({ id, s, onClose }) {
  const { update, renewContract, deleteContract } = useData();
  const confirm = useConfirm();
  const ix = indexAll(s);
  const c = ix.contracts[id];
  const [editing, setEditing] = useState(false);
  const [chequeId, setChequeId] = useState(null);
  if (!c) return <Drawer open={false} onClose={onClose} />;
  const tenant = ix.contacts[c.tenantId];
  const cheques = chequesOfContract(s, id);
  const days = daysUntil(c.endDate);

  const viewFooter = (
    <>
      <Link to={`/contracts/${id}/print`} target="_blank" rel="noreferrer" className="btn"><Printer /> Print</Link>
      <div className="spacer" />
      <button className="btn btn-danger" aria-label="Delete contract" title="Delete contract" onClick={async () => {
        const ok = await confirm({
          title: `Delete contract ${c.contractNo}?`,
          message: "This permanently removes the contract along with its cheques and receipts. This can't be undone.",
          confirmLabel: "Delete contract",
        });
        if (ok) { deleteContract(id); onClose(); }
      }}><Trash2 /></button>
      {c.status !== "terminated" && (
        <button className="btn btn-ghost" onClick={async () => {
          const ok = await confirm({
            title: "Terminate this contract?",
            message: "It will be marked terminated and move to the Ended filter. Its cheques and history are kept.",
            confirmLabel: "Terminate",
          });
          if (ok) { update("contracts", id, { status: "terminated" }); onClose(); }
        }}>
          <Ban /> Terminate
        </button>
      )}
      <button className="btn btn-primary" onClick={() => {
        const r = prompt("Renew for another year. Annual rent (AED):", String(c.annualRent));
        if (r !== null) { renewContract(id, { annualRent: Number(r) || c.annualRent }); onClose(); }
      }}><RefreshCw /> Renew</button>
    </>
  );
  const editFooter = (
    <>
      <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
      <button className="btn btn-primary" form="edit-contract" type="submit">Save changes</button>
    </>
  );

  return (
    <Drawer open onClose={onClose} title={`Contract ${c.contractNo}`}
      subtitle={`${ix.towers[c.towerId]?.name} · Unit ${ix.units[c.unitId]?.label}`}
      footer={editing ? editFooter : viewFooter}>
      <div className="drawer-tenant">
        <span className="avatar">{initials(tenant?.name || "?")}</span>
        <div>
          <div className="t-h2">{tenant?.name}</div>
          <div className="t-muted">{c.type} tenancy · <StatusBadge status={c.status} /></div>
        </div>
      </div>

      {editing ? (
        <EditContractForm c={c} onSave={(patch) => { update("contracts", id, patch); setEditing(false); }} />
      ) : (
        <>
          <div className="sec-head">
            <h3 className="t-h3">Terms</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}><Pencil /> Edit</button>
          </div>
          <div className="detail-list" style={{ marginBottom: 20 }}>
            <div className="detail-row"><span className="k">Annual rent</span><span className="v"><Money value={c.annualRent} /></span></div>
            <div className="detail-row"><span className="k">Payment plan</span><span className="v">{c.installments} cheque{c.installments > 1 ? "s" : ""} / year</span></div>
            <div className="detail-row"><span className="k">Security deposit</span><span className="v"><Money value={c.deposit} /></span></div>
            <div className="detail-row"><span className="k">Commission</span><span className="v"><Money value={c.commission} /></span></div>
            <div className="detail-row"><span className="k">Start date</span><span className="v">{fmtDateLong(c.startDate)}</span></div>
            <div className="detail-row"><span className="k">End date</span><span className="v">{fmtDateLong(c.endDate)}{c.status !== "expired" && c.status !== "terminated" && days >= 0 ? ` · in ${days}d` : ""}</span></div>
          </div>

          <div className="sec-head">
            <h3 className="t-h3">Cheque schedule</h3>
            <span className="t-faint" style={{ fontSize: 12 }}>tap a cheque to edit</span>
          </div>
          <div className="sched">
            {cheques.map((ch) => (
              <button key={ch.id} type="button" onClick={() => setChequeId(ch.id)}
                className={`sched-row sched-click ${ch.status === "cleared" ? "paid" : ch.status === "bounced" ? "overdue" : ""}`}>
                <div>
                  <div className="sched-date">{fmtDateLong(ch.dueDate)}</div>
                  <div className="t-faint" style={{ fontSize: 12 }}>#{ch.chequeNo} · {ch.bankName}</div>
                </div>
                <span className="sched-amt"><Money value={ch.amount} /></span>
                <StatusBadge status={ch.status} />
              </button>
            ))}
            {cheques.length === 0 && <p className="t-muted" style={{ fontSize: 13 }}>No cheques on this contract.</p>}
          </div>

          <DocumentsSection contract={c} />
        </>
      )}

      {chequeId && <ChequeEditDrawer cheque={cheques.find((x) => x.id === chequeId)} onClose={() => setChequeId(null)} />}
    </Drawer>
  );
}

function EditContractForm({ c, onSave }) {
  const [form, setForm] = useState({
    type: c.type, annualRent: String(c.annualRent), deposit: String(c.deposit),
    commission: String(c.commission), startDate: c.startDate, endDate: c.endDate,
    clauses: (c.clauses && c.clauses.length ? c.clauses : DEFAULT_CONTRACT_CLAUSES).join("\n"),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    onSave({
      type: form.type, annualRent: Number(form.annualRent) || c.annualRent,
      deposit: Number(form.deposit) || 0, commission: Number(form.commission) || 0,
      startDate: form.startDate, endDate: form.endDate,
      clauses: form.clauses.split("\n").map((t) => t.trim()).filter(Boolean),
    });
  }

  return (
    <form id="edit-contract" onSubmit={submit} className="form-grid">
      <label className="field"><span>Contract type</span>
        <select className="select" value={form.type} onChange={(e) => set("type", e.target.value)}>
          {CONTRACT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select></label>
      <label className="field"><span>Annual rent (AED)</span>
        <input className="input" type="number" value={form.annualRent} onChange={(e) => set("annualRent", e.target.value)} /></label>
      <label className="field"><span>Security deposit</span>
        <input className="input" type="number" value={form.deposit} onChange={(e) => set("deposit", e.target.value)} /></label>
      <label className="field"><span>Commission</span>
        <input className="input" type="number" value={form.commission} onChange={(e) => set("commission", e.target.value)} /></label>
      <label className="field"><span>Start date</span>
        <input className="input" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></label>
      <label className="field"><span>End date</span>
        <input className="input" type="date" min={form.startDate} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></label>
      <label className="field full"><span>Terms &amp; conditions (one per line)</span>
        <textarea className="input textarea" rows={7} value={form.clauses} onChange={(e) => set("clauses", e.target.value)} /></label>
    </form>
  );
}

function ChequeEditDrawer({ cheque, onClose }) {
  const { update, setChequeStatus } = useData();
  const [form, setForm] = useState({
    bankName: cheque.bankName, chequeNo: cheque.chequeNo,
    dueDate: cheque.dueDate, amount: String(cheque.amount), status: cheque.status,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    update("cheques", cheque.id, {
      bankName: form.bankName, chequeNo: form.chequeNo,
      dueDate: form.dueDate, amount: Number(form.amount) || cheque.amount,
    });
    // Status changes go through setChequeStatus so receipts stay in sync.
    if (form.status !== cheque.status) setChequeStatus(cheque.id, form.status);
    onClose();
  }

  return (
    <Drawer open onClose={onClose} title={`Cheque #${cheque.chequeNo}`} subtitle="Edit cheque details"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="edit-cheque" type="submit">Save cheque</button>
      </>}>
      <form id="edit-cheque" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Bank</span>
          <select className="select" value={form.bankName} onChange={(e) => set("bankName", e.target.value)}>
            {[...new Set([cheque.bankName, ...UAE_BANKS])].map((b) => <option key={b}>{b}</option>)}
          </select></label>
        <label className="field"><span>Cheque number</span>
          <input className="input" value={form.chequeNo} onChange={(e) => set("chequeNo", e.target.value)} /></label>
        <label className="field"><span>Amount (AED)</span>
          <input className="input" type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></label>
        <label className="field"><span>Due date</span>
          <input className="input" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></label>
        <label className="field"><span>Status</span>
          <select className="select" value={form.status} onChange={(e) => set("status", e.target.value)}>
            {CHEQUE_STATUSES.map((st) => <option key={st} value={st}>{st[0].toUpperCase() + st.slice(1)}</option>)}
          </select></label>
      </form>
    </Drawer>
  );
}

function CreateContractDrawer({ open, onClose, s, prefill, onCreated }) {
  const { createContract, add, companyId } = useData();
  const vacancies = unitRows(s).filter((u) => u.vacant);
  const tenantOptions = s.contacts.filter((c) => (c.kind || []).some((k) => ["tenant", "lead", "buyer"].includes(k)));

  const today = todayISO();
  const oneYear = isoOf(new Date(parseISO(today).getFullYear() + 1, parseISO(today).getMonth(), parseISO(today).getDate()));
  const rent = prefill?.annualRent;
  const blank = {
    towerId: prefill?.towerId || "", unitId: prefill?.unitId || "", tenantId: prefill?.tenantId || "", newTenant: "",
    type: "Residential", annualRent: rent ? String(rent) : "", installments: "4", startDate: today, endDate: oneYear,
    deposit: rent ? String(Math.round(rent * 0.05)) : "", commission: rent ? String(Math.round(rent * 0.05)) : "",
  };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const towers = [...new Map(vacancies.map((u) => [u.tower.id, u.tower])).values()];
  const unitsInTower = vacancies.filter((u) => u.tower.id === form.towerId);

  function pickUnit(unitId) {
    const u = vacancies.find((x) => x.unit.id === unitId);
    const rent = u ? u.unit.annualRent : 0;
    setForm((f) => ({ ...f, unitId, annualRent: String(rent), deposit: String(Math.round(rent * 0.05)), commission: String(Math.round(rent * 0.05)) }));
  }

  function submit(e) {
    e.preventDefault();
    if (!form.unitId) return setError("Choose a vacant unit.");
    if (!form.tenantId && !form.newTenant.trim()) return setError("Choose a tenant or enter a new one.");
    if (!Number(form.annualRent)) return setError("Enter the annual rent.");
    let tenantId = form.tenantId;
    if (form.newTenant.trim()) tenantId = add("contacts", { companyId, name: form.newTenant.trim(), kind: ["tenant"] });
    createContract({ ...form, tenantId });
    onCreated?.();
    setForm(blank); setError(""); onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="New contract" subtitle="Create a tenancy and generate its cheques"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="new-contract" type="submit">Create contract</button>
      </>}>
      <form id="new-contract" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Tower</span>
          <SearchSelect value={form.towerId} onChange={(v) => setForm((f) => ({ ...f, towerId: v, unitId: "" }))}
            options={towers.map((t) => ({ value: t.id, label: t.name }))} placeholder="Select a tower…" />
        </label>
        <label className="field full"><span>Vacant unit</span>
          <select className="select" value={form.unitId} onChange={(e) => pickUnit(e.target.value)} disabled={!form.towerId}>
            <option value="">{form.towerId ? "Select a unit…" : "Choose a tower first"}</option>
            {unitsInTower.map((u) => <option key={u.unit.id} value={u.unit.id}>{u.unit.label} · {u.unit.unitType}</option>)}
          </select>
          {form.towerId && unitsInTower.length === 0 && <span className="t-faint" style={{ fontSize: 12 }}>No vacant units in this tower.</span>}
        </label>
        <label className="field"><span>Existing tenant</span>
          <SearchSelect value={form.tenantId} onChange={(v) => set("tenantId", v)}
            options={tenantOptions.map((c) => ({ value: c.id, label: c.name, sub: c.phone }))} placeholder="Select tenant…" />
        </label>
        <label className="field"><span>…or new tenant</span>
          <input className="input" value={form.newTenant} onChange={(e) => set("newTenant", e.target.value)} placeholder="Full name" /></label>
        <label className="field"><span>Annual rent (AED)</span>
          <input className="input" type="number" value={form.annualRent} onChange={(e) => set("annualRent", e.target.value)} /></label>
        <label className="field"><span>Cheques / year</span>
          <select className="select" value={form.installments} onChange={(e) => set("installments", e.target.value)}>
            {[1, 2, 3, 4, 6, 12].map((n) => <option key={n} value={n}>{n}</option>)}
          </select></label>
        <label className="field"><span>Start date</span>
          <input className="input" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></label>
        <label className="field"><span>End date</span>
          <input className="input" type="date" min={form.startDate} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></label>
        <label className="field"><span>Deposit (AED)</span>
          <input className="input" type="number" value={form.deposit} onChange={(e) => set("deposit", e.target.value)} /></label>
        <label className="field"><span>Commission (AED)</span>
          <input className="input" type="number" value={form.commission} onChange={(e) => set("commission", e.target.value)} /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}

/* ---------- per-contract documents: tenancy contract + cheque images ---------- */
function DocumentsSection({ contract }) {
  const { update } = useData();
  const confirm = useConfirm();
  const id = contract.id;
  const contractDoc = contract.contractDoc || null;
  const chequeDocs = contract.chequeDocs || [];
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function addContractDoc(files) {
    setBusy("contract"); setError("");
    try {
      const file = files[0];
      const dataUrl = await fileToCompressedDataUrl(file);
      update("contracts", id, { contractDoc: { name: file.name, dataUrl, addedAt: Date.now() } });
    } catch (e) {
      setError(e.message || "Could not add that file.");
    } finally {
      setBusy("");
    }
  }

  async function addChequeDocs(files) {
    setBusy("cheque"); setError("");
    try {
      for (const file of files) {
        const dataUrl = await fileToCompressedDataUrl(file);
        update("contracts", id, (r) => ({ chequeDocs: [...(r.chequeDocs || []), { name: file.name, dataUrl, addedAt: Date.now() }] }));
      }
    } catch (e) {
      setError(e.message || "Could not add that file.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="docs" style={{ marginTop: 24 }}>
      <h3 className="t-h3" style={{ marginBottom: 10 }}>Documents</h3>

      <div className="doc-group">
        <div className="doc-label"><FileText size={14} /> Tenancy contract</div>
        {contractDoc ? (
          <div className="doc-grid">
            <DocThumb doc={contractDoc} onOpen={() => setPreview(contractDoc)} onRemove={async () => {
              if (await confirm({ title: "Remove tenancy contract?", message: "The uploaded image will be deleted from this contract.", confirmLabel: "Remove" }))
                update("contracts", id, { contractDoc: null });
            }} />
          </div>
        ) : (
          <Dropzone onFiles={addContractDoc} busy={busy === "contract"} hint="Photo or scan of the signed contract" />
        )}
      </div>

      <div className="doc-group">
        <div className="doc-label"><FileText size={14} /> Cheques {chequeDocs.length > 0 && <span className="t-faint">· {chequeDocs.length}</span>}</div>
        {chequeDocs.length > 0 && (
          <div className="doc-grid">
            {chequeDocs.map((doc, i) => (
              <DocThumb key={i} doc={doc} onOpen={() => setPreview(doc)}
                onRemove={async () => {
                  if (await confirm({ title: "Remove this cheque image?", message: "The uploaded image will be deleted from this contract.", confirmLabel: "Remove" }))
                    update("contracts", id, (r) => ({ chequeDocs: (r.chequeDocs || []).filter((_, idx) => idx !== i) }));
                }} />
            ))}
          </div>
        )}
        <Dropzone onFiles={addChequeDocs} multiple busy={busy === "cheque"} hint="Add one or more cheque photos" />
      </div>

      {error && <p className="form-error">{error}</p>}
      <Lightbox src={preview?.dataUrl} alt={preview?.name} onClose={() => setPreview(null)} />
    </div>
  );
}

function DocThumb({ doc, onOpen, onRemove }) {
  return (
    <figure className="doc-thumb">
      <button type="button" className="doc-thumb-img" onClick={onOpen} aria-label={`Open ${doc.name}`}>
        <img src={doc.dataUrl} alt={doc.name} />
      </button>
      <button type="button" className="doc-remove icon-btn" onClick={onRemove} aria-label={`Remove ${doc.name}`}>
        <Trash2 />
      </button>
    </figure>
  );
}
