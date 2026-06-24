import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search, Plus, Trash2, Archive, FileText, File, Image as ImageIcon, HardDrive, CalendarPlus, Link2, Tag, ArrowRight,
} from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll } from "../lib/domain";
import { fmtDateLong, todayISO, CUR_PERIOD } from "../lib/format";
import { fileToCompressedDataUrl } from "../lib/image";
import { DOC_CATEGORIES } from "../lib/constants";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatCard from "../components/StatCard";
import Dropzone from "../components/Dropzone";
import Lightbox from "../components/Lightbox";
import { useConfirm } from "../components/ConfirmDialog";

const TYPE_ICON = { pdf: FileText, doc: FileText, image: ImageIcon };
const typeIcon = (t) => TYPE_ICON[t] || File;
const LINK_LABEL = { contract: "Contract", tower: "Building", bill: "Bill", tenant: "Tenant", unit: "Unit" };
const fmtSize = (kb) => (!kb ? "—" : kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);
const sizeOf = (dataUrl) => (dataUrl ? Math.max(1, Math.round((dataUrl.length * 3 / 4) / 1024)) : 0);
const addedIso = (v) => (typeof v === "number" ? new Date(v).toISOString().slice(0, 10) : v || "");

// Gather every document in the company into one list: standalone DMS records plus
// the scans attached to contracts (tenancy contract + cheque images), each linked
// back to the record it lives on.
function gatherDocs(s, ix) {
  const out = [];
  for (const d of (s.documents || [])) {
    out.push({
      key: `dms:${d.id}`, source: "dms", id: d.id,
      name: d.name, category: d.category || "Other", type: d.type || "pdf",
      dataUrl: d.dataUrl, sizeKb: d.sizeKb || 0, addedAt: addedIso(d.addedAt),
      linkedLabel: d.linkedType ? LINK_LABEL[d.linkedType] || d.linkedType : null, linkedTo: null,
    });
  }
  for (const c of s.contracts) {
    const tenant = ix.contacts[c.tenantId];
    const label = `${tenant?.name || "Tenant"} · ${c.contractNo}`;
    if (c.contractDoc) out.push({
      key: `ct:${c.id}:contract`, source: "contract", contractId: c.id, slot: "contract",
      name: c.contractDoc.name || "Tenancy contract", category: "Contracts", type: "image",
      dataUrl: c.contractDoc.dataUrl, sizeKb: sizeOf(c.contractDoc.dataUrl), addedAt: addedIso(c.contractDoc.addedAt),
      linkedLabel: label, linkedTo: c.id,
    });
    (c.chequeDocs || []).forEach((doc, i) => out.push({
      key: `ct:${c.id}:cheque:${i}`, source: "contract", contractId: c.id, slot: "cheque", slotIndex: i,
      name: doc.name || "Cheque image", category: "Cheques", type: "image",
      dataUrl: doc.dataUrl, sizeKb: sizeOf(doc.dataUrl), addedAt: addedIso(doc.addedAt),
      linkedLabel: label, linkedTo: c.id,
    }));
  }
  return out;
}

export default function Documents() {
  const { db, companyId } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const ix = indexAll(s);
  const allDocs = useMemo(() => gatherDocs(s, ix), [s]); // eslint-disable-line react-hooks/exhaustive-deps
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [searchParams] = useSearchParams();
  const [openKey, setOpenKey] = useState(() => searchParams.get("open"));
  const [addOpen, setAddOpen] = useState(false);

  const categoryOptions = useMemo(() => [...new Set([...DOC_CATEGORIES, ...allDocs.map((d) => d.category)])], [allDocs]);

  const filtered = allDocs.filter((d) => {
    if (category !== "all" && d.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (d.name || "").toLowerCase().includes(q) || (d.category || "").toLowerCase().includes(q) || (d.linkedLabel || "").toLowerCase().includes(q);
  }).sort((a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""));

  const totalSize = allDocs.reduce((a, d) => a + (d.sizeKb || 0), 0);
  const thisMonth = allDocs.filter((d) => (d.addedAt || "").slice(0, 7) === CUR_PERIOD).length;
  const linked = allDocs.filter((d) => d.linkedTo || d.linkedLabel).length;
  const cats = [...new Set(allDocs.map((d) => d.category).filter(Boolean))];

  return (
    <div className="page">
      <PageHeader title="DMS & Archive" subtitle={`${allDocs.length} document${allDocs.length === 1 ? "" : "s"} across every module`}
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus /> Add document</button>} />

      <div className="kpi-grid kpi-4">
        <StatCard label="Documents" Icon={Archive} tone="primary" value={allDocs.length} hint={`${cats.length} categor${cats.length === 1 ? "y" : "ies"}`} />
        <StatCard label="Storage used" Icon={HardDrive} tone="accent" value={fmtSize(totalSize)} hint="across the archive" />
        <StatCard label="Linked" Icon={Link2} tone="neutral" value={linked} hint="attached to records" />
        <StatCard label="Added this month" Icon={CalendarPlus} tone="success" value={thisMonth} hint="recent uploads" />
      </div>

      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" placeholder="Search name, category, linked record" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="spacer" />
        <div className="period-ctl">
          <Tag className="period-ic" />
          <select className="select period-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="all">All categories</option>
            {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr><th>Document</th><th>Category</th><th>Linked to</th><th className="num">Size</th><th>Added</th></tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const Icon = typeIcon(d.type);
              return (
                <tr key={d.key} className="row-click" onClick={() => setOpenKey(d.key)}>
                  <td>
                    <div className="cell-tenant">
                      <span className="mt-ic"><Icon strokeWidth={1.8} /></span>
                      <div className="tn-name">{d.name}</div>
                    </div>
                  </td>
                  <td><span className="chip">{d.category || "Other"}</span></td>
                  <td className="t-muted">{d.linkedLabel || "—"}</td>
                  <td className="num t-muted tnum">{fmtSize(d.sizeKb)}</td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{d.addedAt ? fmtDateLong(d.addedAt) : "—"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5}><div className="empty"><Archive /><p>No documents match.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </section>

      {openKey && <DocDrawer doc={filtered.find((d) => d.key === openKey) || allDocs.find((d) => d.key === openKey)} onClose={() => setOpenKey(null)} />}
      <AddDocDrawer open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function DocDrawer({ doc, onClose }) {
  const { remove, update } = useData();
  const confirm = useConfirm();
  const [preview, setPreview] = useState(false);
  if (!doc) return <Drawer open={false} onClose={onClose} />;
  const Icon = typeIcon(doc.type);

  async function handleDelete() {
    const ok = await confirm({ title: "Delete this document?", message: "This permanently removes it from the archive. This can't be undone.", confirmLabel: "Delete document" });
    if (!ok) return;
    if (doc.source === "dms") remove("documents", doc.id);
    else if (doc.slot === "contract") update("contracts", doc.contractId, { contractDoc: null });
    else update("contracts", doc.contractId, (r) => ({ chequeDocs: (r.chequeDocs || []).filter((_, i) => i !== doc.slotIndex) }));
    onClose();
  }

  return (
    <Drawer open onClose={onClose} title={doc.name} subtitle={doc.category}
      footer={<>
        <button className="btn btn-danger" type="button" aria-label="Delete document" title="Delete document" onClick={handleDelete}><Trash2 /></button>
        <div className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
      </>}>
      <div className="drawer-tenant">
        <span className="mt-ic lg"><Icon strokeWidth={1.7} /></span>
        <div>
          <div className="t-h2" style={{ wordBreak: "break-word" }}>{doc.name}</div>
          <div className="t-muted" style={{ marginTop: 2 }}><span className="chip">{doc.category || "Other"}</span></div>
        </div>
      </div>

      {doc.dataUrl && (
        <div className="doc-grid" style={{ marginBottom: 18 }}>
          <figure className="doc-thumb">
            <button type="button" className="doc-thumb-img" onClick={() => setPreview(true)} aria-label={`Preview ${doc.name}`}><img src={doc.dataUrl} alt={doc.name} /></button>
          </figure>
        </div>
      )}

      <div className="detail-list" style={{ marginBottom: doc.linkedTo ? 16 : 0 }}>
        <div className="detail-row"><span className="k">Category</span><span className="v">{doc.category || "Other"}</span></div>
        <div className="detail-row"><span className="k">Type</span><span className="v">{(doc.type || "file").toUpperCase()}</span></div>
        <div className="detail-row"><span className="k">Source</span><span className="v">{doc.source === "contract" ? "Contract attachment" : "Archive upload"}</span></div>
        <div className="detail-row"><span className="k">Linked to</span><span className="v">{doc.linkedLabel || "—"}</span></div>
        <div className="detail-row"><span className="k">Size</span><span className="v">{fmtSize(doc.sizeKb)}</span></div>
        <div className="detail-row"><span className="k">Added</span><span className="v">{doc.addedAt ? fmtDateLong(doc.addedAt) : "—"}</span></div>
      </div>

      {doc.linkedTo && (
        <Link to={`/contracts?open=${doc.linkedTo}`} className="btn btn-block" onClick={onClose}>
          View contract <ArrowRight />
        </Link>
      )}

      <Lightbox src={preview ? doc.dataUrl : null} alt={doc.name} onClose={() => setPreview(false)} />
    </Drawer>
  );
}

function AddDocDrawer({ open, onClose }) {
  const { add, companyId } = useData();
  const blank = { name: "", category: "", type: "pdf", dataUrl: "", sizeKb: 0 };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function onFiles(files) {
    setBusy(true); setError("");
    try {
      const file = files[0];
      const dataUrl = await fileToCompressedDataUrl(file);
      const sizeKb = Math.max(1, Math.round((dataUrl.length * 3 / 4) / 1024));
      setForm((f) => ({ ...f, name: f.name || file.name, dataUrl, type: "image", sizeKb }));
    } catch (e) {
      setError(e.message || "Could not add that file.");
    } finally {
      setBusy(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name the document.");
    if (!form.category) return setError("Choose a category.");
    add("documents", {
      companyId, name: form.name.trim(), category: form.category, type: form.type,
      dataUrl: form.dataUrl || undefined, sizeKb: form.sizeKb || 0, addedAt: todayISO(),
    });
    setForm(blank); setError(""); onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add a document" subtitle="Upload a scan or record a document reference"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="add-doc" type="submit">Add document</button>
      </>}>
      <div className="doc-group" style={{ marginBottom: 16 }}>
        <div className="doc-label"><ImageIcon size={14} /> Scan / photo (optional)</div>
        {form.dataUrl ? (
          <div className="doc-grid">
            <figure className="doc-thumb">
              <button type="button" className="doc-thumb-img" onClick={() => setPreview(true)} aria-label="Preview"><img src={form.dataUrl} alt={form.name} /></button>
              <button type="button" className="doc-remove icon-btn" onClick={() => set("dataUrl", "")} aria-label="Remove"><Trash2 /></button>
            </figure>
          </div>
        ) : (
          <Dropzone onFiles={onFiles} busy={busy} hint="Image scans are stored and previewable" />
        )}
      </div>
      <form id="add-doc" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Document name</span>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Tenancy Contract — name.pdf" /></label>
        <label className="field full"><span>Category</span>
          <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Select category…</option>
            {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
      <Lightbox src={preview ? form.dataUrl : null} alt={form.name} onClose={() => setPreview(false)} />
    </Drawer>
  );
}
