import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { useData } from "../data/store";
import { scopeData, indexAll, chequesOfContract } from "../lib/domain";
import { fmtMoney, fmtDateLong, todayISO } from "../lib/format";
import { DEFAULT_CONTRACT_CLAUSES } from "../lib/constants";

export default function ContractPrint() {
  const { id } = useParams();
  const { db, companyId } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const company = db.companies.find((c) => c.id === companyId);
  const ix = indexAll(s);
  const c = ix.contracts[id];

  if (!c) {
    return <div className="page"><p>Contract not found. <Link to="/contracts">Back</Link></p></div>;
  }
  const tenant = ix.contacts[c.tenantId];
  const tower = ix.towers[c.towerId];
  const unit = ix.units[c.unitId];
  const cheques = chequesOfContract(s, id);
  // Active cheques only: drop superseded (replaced) rows so the schedule and its
  // totals stay correct after a bounce-and-replace, instead of double-counting.
  const scheduleCheques = cheques.filter((ch) => ch.status !== "replaced");
  // Total rent over the whole term = what the tenant actually pays by cheque
  // (falls back to the annual rent if no schedule has been generated yet).
  const termRent = scheduleCheques.length
    ? scheduleCheques.reduce((a, ch) => a + ch.amount, 0)
    : c.annualRent;
  const totalPayable = termRent + (c.deposit || 0) + (c.commission || 0);
  const clauses = c.clauses && c.clauses.length ? c.clauses : DEFAULT_CONTRACT_CLAUSES;

  return (
    <div className="print-shell">
      <div className="print-bar no-print">
        <Link to="/contracts" className="btn btn-ghost btn-sm"><ArrowLeft /> Back to contracts</Link>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}><Printer /> Print / Save PDF</button>
      </div>

      <article className="doc">
        <header className="doc-head">
          <div>
            <div className="doc-co">{company.name}</div>
            <div className="doc-co-sub">{company.address}</div>
            <div className="doc-co-sub">Licence {company.license} · TRN {company.trn} · {company.phone}</div>
          </div>
          <div className="doc-title-block">
            <div className="doc-title">Tenancy Contract</div>
            <div className="doc-meta">No. {c.contractNo}</div>
            <div className="doc-meta">Issued {fmtDateLong(todayISO())}</div>
          </div>
        </header>

        <section className="doc-parties">
          <div className="doc-party">
            <div className="doc-label">Landlord / Owner</div>
            <div className="doc-strong">{tower.ownerName}</div>
            <div className="doc-line">Managed by {company.name}</div>
          </div>
          <div className="doc-party">
            <div className="doc-label">Tenant</div>
            <div className="doc-strong">{tenant?.name}</div>
            {tenant?.emiratesId && <div className="doc-line">Emirates ID: {tenant.emiratesId}</div>}
            <div className="doc-line">{tenant?.phone} · {tenant?.email}</div>
          </div>
        </section>

        <section className="doc-section">
          <h2 className="doc-h2">Property</h2>
          <div className="doc-grid">
            <Field k="Building" v={tower.name} />
            <Field k="Unit" v={`${unit.label} · ${unit.unitType}`} />
            <Field k="Location" v={`${tower.area} · Plot ${tower.plot}`} />
            <Field k="Size" v={`${unit.sqft} sqft · ${unit.beds} bed / ${unit.baths} bath`} />
          </div>
        </section>

        <section className="doc-section">
          <h2 className="doc-h2">Terms</h2>
          <div className="doc-grid">
            <Field k="Annual rent" v={fmtMoney(c.annualRent)} />
            <Field k="Payment" v={`${c.installments} cheque(s) per year`} />
            <Field k="Security deposit" v={fmtMoney(c.deposit)} />
            <Field k="Agency commission" v={fmtMoney(c.commission)} />
            <Field k="Start date" v={fmtDateLong(c.startDate)} />
            <Field k="End date" v={fmtDateLong(c.endDate)} />
            <Field k="Contract type" v={`${c.type} tenancy`} />
            <Field k="Total rent (over term)" v={fmtMoney(termRent)} />
            <Field k="Total payable (rent + deposit + commission)" v={fmtMoney(totalPayable)} />
          </div>
        </section>

        <section className="doc-section">
          <h2 className="doc-h2">Payment schedule (cheques)</h2>
          <table className="doc-table">
            <thead>
              <tr><th>#</th><th>Due date</th><th>Bank</th><th>Cheque no.</th><th className="r">Amount</th></tr>
            </thead>
            <tbody>
              {scheduleCheques.map((ch, i) => (
                <tr key={ch.id}>
                  <td>{i + 1}</td>
                  <td>{fmtDateLong(ch.dueDate)}</td>
                  <td>{ch.bankName}</td>
                  <td>{ch.chequeNo}</td>
                  <td className="r tnum">{fmtMoney(ch.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} className="r">Total</td><td className="r tnum">{fmtMoney(scheduleCheques.reduce((a, x) => a + x.amount, 0))}</td></tr>
            </tfoot>
          </table>
        </section>

        <section className="doc-section">
          <h2 className="doc-h2">Terms &amp; conditions</h2>
          <ol className="doc-terms">
            {clauses.map((t, i) => <li key={i}>{t}</li>)}
          </ol>
        </section>

        <section className="doc-sign">
          <div className="doc-sign-box"><div className="doc-sign-line" /><div className="doc-label">Landlord / Agent</div></div>
          <div className="doc-sign-box"><div className="doc-sign-line" /><div className="doc-label">Tenant</div></div>
        </section>
      </article>
    </div>
  );
}

function Field({ k, v }) {
  return <div className="doc-field"><span className="doc-field-k">{k}</span><span className="doc-field-v">{v}</span></div>;
}
