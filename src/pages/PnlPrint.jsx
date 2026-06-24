import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { useData } from "../data/store";
import { scopeData, accountingPnl } from "../lib/domain";
import { INCOME_LABEL, EXPENSE_LABEL } from "../lib/pnl";
import { fmtMoney, fmtDateLong, todayISO } from "../lib/format";

export default function PnlPrint() {
  const { db, companyId } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const company = db.companies.find((c) => c.id === companyId);
  const [sp] = useSearchParams();

  const towerParam = sp.get("tower") || "all";
  const from = sp.get("from") || null;
  const to = sp.get("to") || null;
  const label = sp.get("label") || "All time";
  const towerId = towerParam === "all" ? null : towerParam;
  const tower = towerId ? s.towers.find((t) => t.id === towerId) : null;
  const pnl = accountingPnl(s, { from, to, towerId });

  const incomeRows = Object.entries(pnl.incomeByCat).sort((a, b) => b[1] - a[1]);
  const expenseRows = Object.entries(pnl.expenseByCat).sort((a, b) => b[1] - a[1]);
  const subject = tower ? tower.name : "All towers (consolidated)";

  return (
    <div className="print-shell">
      <div className="print-bar no-print">
        <Link to={`/accounting?tower=${towerParam}`} className="btn btn-ghost btn-sm"><ArrowLeft /> Back</Link>
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
            <div className="doc-title">Profit &amp; Loss</div>
            <div className="doc-meta">{label}{from ? ` · ${fmtDateLong(from)} – ${fmtDateLong(to)}` : ""}</div>
            <div className="doc-meta">Generated {fmtDateLong(todayISO())}</div>
          </div>
        </header>

        <section className="doc-party" style={{ marginBottom: 20 }}>
          <div className="doc-label">Account</div>
          <div className="doc-strong">{subject}</div>
        </section>

        <table className="doc-table" style={{ marginBottom: 18 }}>
          <thead><tr><th>Income</th><th className="r">Amount</th></tr></thead>
          <tbody>
            {incomeRows.length === 0 && <tr><td>No income in this period</td><td className="r">—</td></tr>}
            {incomeRows.map(([k, v]) => <tr key={k}><td>{INCOME_LABEL[k] || k}</td><td className="r tnum">{fmtMoney(v)}</td></tr>)}
          </tbody>
          <tfoot><tr><td>Total income</td><td className="r tnum">{fmtMoney(pnl.income)}</td></tr></tfoot>
        </table>

        <table className="doc-table" style={{ marginBottom: 18 }}>
          <thead><tr><th>Expenses</th><th className="r">Amount</th></tr></thead>
          <tbody>
            {expenseRows.length === 0 && <tr><td>No expenses in this period</td><td className="r">—</td></tr>}
            {expenseRows.map(([k, v]) => <tr key={k}><td>{EXPENSE_LABEL[k] || k}</td><td className="r tnum">({fmtMoney(v)})</td></tr>)}
          </tbody>
          <tfoot><tr><td>Total expenses</td><td className="r tnum">({fmtMoney(pnl.expense)})</td></tr></tfoot>
        </table>

        <div className="pnl-print-net">
          <span>Net profit / loss</span>
          <strong className="tnum">{fmtMoney(pnl.net)}</strong>
        </div>

        {!tower && pnl.towerRows.length > 0 && (
          <table className="doc-table" style={{ marginTop: 24 }}>
            <thead><tr><th>Per tower</th><th className="r">Income</th><th className="r">Expenses</th><th className="r">Net</th><th className="r">Margin</th></tr></thead>
            <tbody>
              {pnl.towerRows.map((t) => (
                <tr key={t.tower.id}>
                  <td>{t.tower.name}</td>
                  <td className="r tnum">{fmtMoney(t.income)}</td>
                  <td className="r tnum">({fmtMoney(t.expense)})</td>
                  <td className="r tnum">{fmtMoney(t.net)}</td>
                  <td className="r tnum">{t.income ? `${t.margin}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="doc-co-sub" style={{ marginTop: 22 }}>Cash basis — income from receipts, expenses from payment vouchers. Outstanding: {fmtMoney(pnl.receivable)} receivable, {fmtMoney(pnl.payable)} payable.</p>
      </article>
    </div>
  );
}
