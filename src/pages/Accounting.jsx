import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarRange, Building2, TrendingUp, TrendingDown, Wallet, Scale, Printer, Download } from "lucide-react";
import { useData } from "../data/store";
import { scopeData, accountingPnl } from "../lib/domain";
import { PNL_PERIODS, pnlRange, pnlPeriodLabel, INCOME_LABEL, EXPENSE_LABEL } from "../lib/pnl";
import { downloadCsv } from "../lib/export";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import BackButton from "../components/BackButton";

export default function Accounting() {
  const { db, companyId } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const [searchParams] = useSearchParams();
  const initialTower = searchParams.get("tower") || "all";

  const [tower, setTower] = useState(s.towers.some((t) => t.id === initialTower) ? initialTower : "all");
  const [period, setPeriod] = useState("this-year");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const range = pnlRange(period, custom);
  const towerId = tower === "all" ? null : tower;
  const pnl = useMemo(() => accountingPnl(s, { ...range, towerId }), [s, range.from, range.to, towerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodLabel = pnlPeriodLabel(period);
  const towerName = tower === "all" ? "All towers (consolidated)" : s.towers.find((t) => t.id === tower)?.name;
  const incomeRows = Object.entries(pnl.incomeByCat).sort((a, b) => b[1] - a[1]);
  const expenseRows = Object.entries(pnl.expenseByCat).sort((a, b) => b[1] - a[1]);

  const printHref = `/accounting/print?tower=${tower}&from=${range.from || ""}&to=${range.to || ""}&label=${encodeURIComponent(periodLabel)}`;

  function exportCsv() {
    const rows = [];
    rows.push(["Profit & Loss", towerName]);
    rows.push(["Period", periodLabel + (range.from ? ` (${range.from} to ${range.to})` : "")]);
    rows.push([]);
    rows.push(["INCOME", ""]);
    incomeRows.forEach(([k, v]) => rows.push([INCOME_LABEL[k] || k, v]));
    rows.push(["Total income", pnl.income]);
    rows.push([]);
    rows.push(["EXPENSES", ""]);
    expenseRows.forEach(([k, v]) => rows.push([EXPENSE_LABEL[k] || k, -v]));
    rows.push(["Total expenses", -pnl.expense]);
    rows.push([]);
    rows.push(["NET PROFIT / LOSS", pnl.net]);
    if (tower === "all") {
      rows.push([]);
      rows.push(["Per tower", "Income", "Expenses", "Net", "Margin %"]);
      pnl.towerRows.forEach((t) => rows.push([t.tower.name, t.income, t.expense, t.net, t.margin]));
    }
    const tag = tower === "all" ? "all-towers" : towerName.toLowerCase().replace(/\s+/g, "-");
    downloadCsv(`pnl-${tag}-${period}.csv`, ["Account", "Amount"], rows);
  }

  return (
    <div className="page">
      {tower !== "all" && <BackButton label="All towers" onClick={() => setTower("all")} />}
      <PageHeader title="Accounting & P&amp;L" subtitle="Cash-basis profit and loss — by building and timeframe"
        actions={<>
          <button className="btn" onClick={exportCsv}><Download /> Export CSV</button>
          <Link to={printHref} target="_blank" rel="noreferrer" className="btn btn-primary"><Printer /> Print</Link>
        </>} />

      <div className="toolbar">
        <div className="period-ctl">
          <Building2 className="period-ic" />
          <select className="select period-select" value={tower} onChange={(e) => setTower(e.target.value)} aria-label="Building">
            <option value="all">All towers</option>
            {s.towers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="period-ctl">
          <CalendarRange className="period-ic" />
          <select className="select period-select" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">
            {PNL_PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        {period === "custom" && (
          <>
            <label className="range-field"><span>From</span>
              <input className="input" type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} /></label>
            <label className="range-field"><span>To</span>
              <input className="input" type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} /></label>
          </>
        )}
      </div>

      <div className="kpi-grid">
        <StatCard label="Total income" Icon={TrendingUp} tone="success" value={<Money value={pnl.income} />} hint={periodLabel} />
        <StatCard label="Total expenses" Icon={TrendingDown} tone="danger" value={<Money value={pnl.expense} />} hint={periodLabel} />
        <StatCard label="Net profit / loss" Icon={Scale} tone="primary" value={<Money value={pnl.net} />} hint={pnl.income ? `${Math.round((pnl.net / pnl.income) * 100)}% margin` : "—"} />
        <StatCard label="Outstanding" Icon={Wallet} tone="accent" value={<Money value={pnl.receivable} />} hint={<>receivable · <Money value={pnl.payable} /> payable</>} />
      </div>

      <div className={tower === "all" ? "dash-cols" : ""}>
        <section className="card">
          <div className="panel-head">
            <h3 className="t-h3">Profit &amp; Loss statement</h3>
            <span className="t-muted">{towerName} · {periodLabel}</span>
          </div>
          <div className="panel-body">
            <div className="pnl-group-label">Income</div>
            {incomeRows.length === 0 && <div className="pnl-line sub"><span>No income in this period</span><span className="tnum">—</span></div>}
            {incomeRows.map(([k, v]) => (
              <div className="pnl-line sub" key={k}><span>{INCOME_LABEL[k] || k}</span><span className="tnum"><Money value={v} /></span></div>
            ))}
            <div className="pnl-line subtotal"><span>Total income</span><strong className="tnum" style={{ color: "var(--success-ink)" }}><Money value={pnl.income} /></strong></div>

            <div className="pnl-group-label" style={{ marginTop: 16 }}>Expenses</div>
            {expenseRows.length === 0 && <div className="pnl-line sub"><span>No expenses in this period</span><span className="tnum">—</span></div>}
            {expenseRows.map(([k, v]) => (
              <div className="pnl-line sub" key={k}><span>{EXPENSE_LABEL[k] || k}</span><span className="tnum"><Money value={-v} /></span></div>
            ))}
            <div className="pnl-line subtotal"><span>Total expenses</span><strong className="tnum" style={{ color: "var(--danger-ink)" }}><Money value={pnl.expense} /></strong></div>

            <div className="pnl-line total"><span>Net profit / loss</span>
              <strong className="tnum" style={{ color: pnl.net >= 0 ? "var(--success-ink)" : "var(--danger-ink)" }}><Money value={pnl.net} /></strong></div>
          </div>
        </section>

        {tower === "all" && (
          <section className="card">
            <div className="panel-head"><h3 className="t-h3">Per-tower P&amp;L</h3><span className="t-muted">separate account each</span></div>
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Tower</th><th className="num">Income</th><th className="num">Expenses</th><th className="num">Net</th><th className="num">Margin</th></tr></thead>
                <tbody>
                  {pnl.towerRows.map((t) => (
                    <tr key={t.tower.id} className="row-click" onClick={() => setTower(t.tower.id)}>
                      <td style={{ fontWeight: 600 }}>{t.tower.name}</td>
                      <td className="num"><Money value={t.income} /></td>
                      <td className="num"><Money value={t.expense} /></td>
                      <td className="num" style={{ fontWeight: 600, color: t.net >= 0 ? "var(--success-ink)" : "var(--danger-ink)" }}><Money value={t.net} /></td>
                      <td className="num tnum">{t.income ? `${t.margin}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
