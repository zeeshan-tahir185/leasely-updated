import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { useData } from "../data/store";
import { scopeData } from "../lib/domain";
import { bankMovements, accountsForCompany } from "../lib/banking";
import { fmtMoney, fmtDateLong, todayISO } from "../lib/format";

export default function BankStatementPrint() {
  const { db, companyId } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const company = db.companies.find((c) => c.id === companyId);
  const { accountId } = useParams();
  const account = accountsForCompany(companyId).find((a) => a.id === accountId);

  // Movements oldest-first, carrying a running balance from the opening figure.
  const rows = useMemo(() => {
    if (!account) return [];
    const mine = bankMovements(s, companyId)
      .filter((m) => m.accountId === account.id)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.id > b.id ? 1 : -1));
    let bal = account.opening;
    return mine.map((m) => {
      bal += m.kind === "in" ? m.amount : -m.amount;
      return { ...m, balance: bal };
    });
  }, [s, companyId, account]);

  if (!account) {
    return (
      <div className="print-shell">
        <div className="print-bar no-print"><Link to="/banking" className="btn btn-ghost btn-sm"><ArrowLeft /> Back</Link></div>
        <article className="doc"><p className="doc-co-sub">Account not found.</p></article>
      </div>
    );
  }

  const credits = rows.reduce((a, m) => a + (m.kind === "in" ? m.amount : 0), 0);
  const debits = rows.reduce((a, m) => a + (m.kind === "out" ? m.amount : 0), 0);
  const closing = account.opening + credits - debits;
  const periodFrom = rows[0]?.date;
  const periodTo = rows[rows.length - 1]?.date;

  return (
    <div className="print-shell">
      <div className="print-bar no-print">
        <Link to="/banking" className="btn btn-ghost btn-sm"><ArrowLeft /> Back</Link>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}><Printer /> Print / Save PDF</button>
      </div>

      <article className="doc">
        <header className="doc-head">
          <div>
            <div className="doc-co">{company.name}</div>
            <div className="doc-co-sub">{company.address}</div>
            <div className="doc-co-sub">Licence {company.license} · TRN {company.trn}</div>
          </div>
          <div className="doc-title-block">
            <div className="doc-title">Bank Statement</div>
            <div className="doc-meta">{periodFrom ? `${fmtDateLong(periodFrom)} – ${fmtDateLong(periodTo)}` : "No movements"}</div>
            <div className="doc-meta">Generated {fmtDateLong(todayISO())}</div>
          </div>
        </header>

        <section className="doc-party" style={{ marginBottom: 18 }}>
          <div className="doc-label">Account</div>
          <div className="doc-strong">{account.bank} · {account.label}</div>
          <div className="doc-co-sub">{account.type} account · {account.iban}</div>
        </section>

        <table className="doc-table" style={{ marginBottom: 18 }}>
          <thead>
            <tr><th>Date</th><th>Description</th><th className="r">Debit</th><th className="r">Credit</th><th className="r">Balance</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>{periodFrom ? fmtDateLong(periodFrom) : fmtDateLong(todayISO())}</td>
              <td>Opening balance</td>
              <td className="r">—</td>
              <td className="r">—</td>
              <td className="r tnum">{fmtMoney(account.opening)}</td>
            </tr>
            {rows.map((m) => (
              <tr key={`${m.entity}-${m.id}`}>
                <td style={{ whiteSpace: "nowrap" }}>{fmtDateLong(m.date)}</td>
                <td>{m.party}<span className="doc-co-sub"> · {m.ref}</span></td>
                <td className="r tnum">{m.kind === "out" ? `(${fmtMoney(m.amount)})` : "—"}</td>
                <td className="r tnum">{m.kind === "in" ? fmtMoney(m.amount) : "—"}</td>
                <td className="r tnum">{fmtMoney(m.balance)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5}>No movements through this account yet.</td></tr>}
          </tbody>
          <tfoot>
            <tr><td>Closing balance</td><td /><td className="r tnum">({fmtMoney(debits)})</td><td className="r tnum">{fmtMoney(credits)}</td><td className="r tnum">{fmtMoney(closing)}</td></tr>
          </tfoot>
        </table>

        <p className="doc-co-sub" style={{ marginTop: 22 }}>
          Statement derived from cleared receipts (credits) and payment vouchers (debits) settled through this account. Cash transactions are excluded.
        </p>
      </article>
    </div>
  );
}
