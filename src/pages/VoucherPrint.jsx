import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll } from "../lib/domain";
import { fmtMoney, fmtDateLong } from "../lib/format";
import { amountInWords } from "../lib/words";

const AGAINST_LABEL = { rent: "Rent", deposit: "Security deposit", commission: "Agency commission", booking: "Booking amount", ejari: "Ejari fee", other: "Other" };
const CAT_LABEL = { maintenance: "Maintenance", cleaning: "Cleaning", utility: "Utilities", salary: "Salaries", supplier: "Supplier payment", "owner-payout": "Owner payout", commission: "Commission", misc: "Other" };
const METHOD_LABEL = { cash: "Cash", cheque: "Cheque", bank: "Bank transfer", card: "Card" };

// kind: "receipt" (money in) | "payment" (money out)
export default function VoucherPrint({ kind }) {
  const { id } = useParams();
  const { db, companyId } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const company = db.companies.find((c) => c.id === companyId);
  const ix = indexAll(s);

  const isReceipt = kind === "receipt";
  const v = isReceipt ? s.receipts.find((r) => r.id === id) : s.vouchers.find((x) => x.id === id);
  if (!v) {
    return <div className="page"><p>Voucher not found. <Link to={isReceipt ? "/receipts" : "/vouchers"}>Back</Link></p></div>;
  }
  const party = ix.contacts[isReceipt ? v.contactId : v.payeeId];
  const tower = ix.towers[v.towerId];
  const chequeNo = v.method === "cheque" ? (v.chequeNo || (v.chequeId ? s.cheques.find((c) => c.id === v.chequeId)?.chequeNo : null)) : null;
  const forText = isReceipt ? (AGAINST_LABEL[v.against] || "Other") : (CAT_LABEL[v.category] || v.category);
  const title = isReceipt ? "Receipt Voucher" : "Payment Voucher";

  return (
    <div className="print-shell">
      <div className="print-bar no-print">
        <Link to={isReceipt ? "/receipts" : "/vouchers"} className="btn btn-ghost btn-sm"><ArrowLeft /> Back</Link>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}><Printer /> Print / Save PDF</button>
      </div>

      <article className="doc doc-voucher">
        <header className="doc-head">
          <div>
            <div className="doc-co">{company.name}</div>
            <div className="doc-co-sub">{company.address}</div>
            <div className="doc-co-sub">Licence {company.license} · TRN {company.trn}</div>
          </div>
          <div className="doc-title-block">
            <div className="doc-title">{title}</div>
            <div className="doc-meta">No. {v.voucherNo}</div>
            <div className="doc-meta">{fmtDateLong(v.date)}</div>
          </div>
        </header>

        <div className="vch-amount">
          <div>
            <div className="doc-label">{isReceipt ? "Received from" : "Paid to"}</div>
            <div className="doc-strong">{party?.name || "—"}</div>
          </div>
          <div className="vch-figure">
            <div className="doc-label">Amount</div>
            <div className="vch-value tnum">{fmtMoney(v.amount, true)}</div>
          </div>
        </div>

        <div className="vch-words">
          <span className="doc-label">Amount in words</span>
          <span>{amountInWords(v.amount)}</span>
        </div>

        <section className="doc-section" style={{ marginTop: 22 }}>
          <div className="doc-grid">
            <div className="doc-field"><span className="doc-field-k">Being</span><span className="doc-field-v">{forText}</span></div>
            <div className="doc-field"><span className="doc-field-k">Payment method</span><span className="doc-field-v">{METHOD_LABEL[v.method] || v.method}{chequeNo ? ` · #${chequeNo}` : ""}</span></div>
            <div className="doc-field"><span className="doc-field-k">Tower / account</span><span className="doc-field-v">{tower?.name || "—"}</span></div>
            <div className="doc-field"><span className="doc-field-k">Reference</span><span className="doc-field-v">{v.ref || v.contractId && ix.contracts[v.contractId]?.contractNo || "—"}</span></div>
          </div>
        </section>

        <section className="doc-sign">
          <div className="doc-sign-box"><div className="doc-sign-line" /><div className="doc-label">{isReceipt ? "Received by" : "Paid by"}</div></div>
          <div className="doc-sign-box"><div className="doc-sign-line" /><div className="doc-label">Authorised by</div></div>
        </section>
      </article>
    </div>
  );
}
