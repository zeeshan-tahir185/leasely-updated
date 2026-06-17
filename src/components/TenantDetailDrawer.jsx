import { useMemo, useState } from "react";
import { Check, Mail, Phone, FileText, Trash2 } from "lucide-react";
import { useData } from "../data/store";
import { indexes, paymentStatus, leaseEnded } from "../lib/domain";
import { fmtMoney, fmtDateLong, initials, periodLabelLong } from "../lib/format";
import { fileToCompressedDataUrl } from "../lib/image";
import StatusBadge from "./StatusBadge";
import Drawer from "./Drawer";
import Dropzone from "./Dropzone";
import Lightbox from "./Lightbox";

/* ---------- tenant detail ---------- */
export default function TenantDetailDrawer({ leaseId, onClose }) {
  const { data, setPaid } = useData();
  const detail = useMemo(() => {
    if (!leaseId) return null;
    const ix = indexes(data);
    const lease = ix.leases[leaseId];
    if (!lease) return null;
    const tenant = ix.tenants[lease.tenantId];
    const unit = ix.units[lease.unitId];
    const property = ix.properties[unit.propertyId];
    const payments = data.payments
      .filter((p) => p.leaseId === leaseId)
      .sort((a, b) => b.period.localeCompare(a.period));
    return { lease, tenant, unit, property, payments };
  }, [leaseId, data]);

  if (!detail) return <Drawer open={false} onClose={onClose} />;
  const { lease, tenant, unit, property, payments } = detail;

  return (
    <Drawer open={!!leaseId} onClose={onClose} title="Tenant">
      <div className="drawer-tenant">
        <span className="avatar">{initials(tenant.name)}</span>
        <div>
          <div className="t-h2">{tenant.name}</div>
          <div className="t-muted">{property.name} · Unit {unit.label}</div>
          {leaseEnded(lease) && (
            <div style={{ marginTop: 6 }}><StatusBadge status="ended" /></div>
          )}
        </div>
      </div>

      <div className="detail-list" style={{ marginBottom: 22 }}>
        <div className="detail-row"><span className="k"><Mail size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Email</span><span className="v">{tenant.email || "—"}</span></div>
        <div className="detail-row"><span className="k"><Phone size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Phone</span><span className="v">{tenant.phone || "—"}</span></div>
        <div className="detail-row"><span className="k">Yearly rent</span><span className="v">{fmtMoney(lease.rent * 12)}</span></div>
        <div className="detail-row"><span className="k">Per cheque</span><span className="v">{fmtMoney(lease.installments ? Math.round((lease.rent * 12) / lease.installments) : lease.rent)}</span></div>
        <div className="detail-row"><span className="k">Security deposit</span><span className="v">{fmtMoney(lease.deposit)}</span></div>
        <div className="detail-row"><span className="k">Lease started</span><span className="v">{fmtDateLong(lease.startDate)}</span></div>
        {lease.endDate && (
          <div className="detail-row"><span className="k">Lease ends</span><span className="v">{fmtDateLong(lease.endDate)}</span></div>
        )}
        <div className="detail-row"><span className="k">Rent due</span><span className="v">{lease.dueDay}{ordinal(lease.dueDay)} of the month</span></div>
        <div className="detail-row"><span className="k">Payment plan</span><span className="v">{lease.installments ? (lease.installments === 1 ? "1 cheque · annual" : `${lease.installments} cheques / year`) : "Monthly"}</span></div>
      </div>

      <DocumentsSection leaseId={lease.id} />

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Payment schedule</h3>
      <div className="sched">
        {payments.map((p) => {
          const st = paymentStatus(p);
          // Every cheque keeps its toggle, so a payment marked paid by mistake in
          // any month can be undone, not just the current one.
          return (
            <div key={p.id} className={`sched-row ${st === "overdue" ? "overdue" : st === "paid" ? "paid" : ""}`}>
              <div>
                <div className="sched-date">{periodLabelLong(p.period)}</div>
                <div className="t-faint" style={{ fontSize: 12 }}>
                  {st === "paid" ? `Paid ${fmtDateLong(p.paidDate)}` : `Due ${fmtDateLong(p.dueDate)}`}
                </div>
              </div>
              <span className="sched-amt">{fmtMoney(p.amount)}</span>
              <button
                className={`btn btn-sm ${p.paidDate ? "btn-ghost" : "btn-primary"}`}
                onClick={() => setPaid(p.id, !p.paidDate)}
              >
                {p.paidDate ? "Undo" : <><Check /> Mark paid</>}
              </button>
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}

/* ---------- documents (contract + cheques) ---------- */
function DocumentsSection({ leaseId }) {
  const { data, attachDocument, removeDocument } = useData();
  const docs = (data.documents || {})[leaseId] || { contract: null, cheques: [] };
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function add(kind, files) {
    setBusy(kind);
    setError("");
    try {
      for (const file of files) {
        const dataUrl = await fileToCompressedDataUrl(file);
        attachDocument(leaseId, kind, { name: file.name, dataUrl, addedAt: Date.now() });
      }
    } catch (e) {
      setError(e.message || "Could not add that file.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="docs">
      <h3 className="t-h3" style={{ marginBottom: 10 }}>Documents</h3>

      <div className="doc-group">
        <div className="doc-label"><FileText size={14} /> Tenancy contract</div>
        {docs.contract ? (
          <div className="doc-grid">
            <DocThumb
              doc={docs.contract}
              onOpen={() => setPreview(docs.contract)}
              onRemove={() => removeDocument(leaseId, "contract")}
            />
          </div>
        ) : (
          <Dropzone
            onFiles={(files) => add("contract", files)}
            busy={busy === "contract"}
            hint="Photo or scan of the signed contract"
          />
        )}
      </div>

      <div className="doc-group">
        <div className="doc-label"><FileText size={14} /> Cheques {docs.cheques.length > 0 && <span className="t-faint">· {docs.cheques.length}</span>}</div>
        {docs.cheques.length > 0 && (
          <div className="doc-grid">
            {docs.cheques.map((c, i) => (
              <DocThumb
                key={i}
                doc={c}
                onOpen={() => setPreview(c)}
                onRemove={() => removeDocument(leaseId, "cheque", i)}
              />
            ))}
          </div>
        )}
        <Dropzone
          onFiles={(files) => add("cheque", files)}
          multiple
          busy={busy === "cheque"}
          hint="Add one or more cheque photos"
        />
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
      <button
        type="button"
        className="doc-remove icon-btn"
        onClick={onRemove}
        aria-label={`Remove ${doc.name}`}
      >
        <Trash2 />
      </button>
    </figure>
  );
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
