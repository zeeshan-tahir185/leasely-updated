import { useState } from "react";
import { Search, Check, Download, Building2 } from "lucide-react";
import { useData } from "../data/store";
import { paymentRows, availablePeriods, STATUS_LABEL } from "../lib/domain";
import { fmtMoney, fmtDateLong, periodLabelLong, initials, CUR_PERIOD } from "../lib/format";
import { downloadCsv } from "../lib/export";
import StatusBadge from "../components/StatusBadge";
import MultiSelect from "../components/MultiSelect";

const FILTERS = ["all", "paid", "due", "overdue"];

export default function Payments() {
  const { data, setPaid } = useData();
  const [period, setPeriod] = useState(CUR_PERIOD);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [buildings, setBuildings] = useState([]); // [] = all buildings

  const periods = availablePeriods(data, 6);
  const buildingOptions = data.properties.map((p) => ({ value: p.id, label: p.name }));
  const rows = paymentRows(data, { period });

  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (buildings.length && !buildings.includes(r.property.id)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.tenant.name.toLowerCase().includes(q) ||
      (r.tenant.phone || "").toLowerCase().includes(q) ||
      `${r.property.name} ${r.unit.label}`.toLowerCase().includes(q)
    );
  });

  const expected = filtered.reduce((s, r) => s + r.amount, 0);
  const collected = filtered.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0);

  function exportSpreadsheet() {
    const headers = [
      "Tenant",
      "Phone",
      "Email",
      "Amount due (AED)",
      "Payment date",
      "Building",
      "Unit",
      "Status",
    ];
    const out = filtered.map((r) => [
      r.tenant.name,
      r.tenant.phone || "",
      r.tenant.email || "",
      r.amount,
      r.status === "paid" && r.paidDate ? fmtDateLong(r.paidDate) : fmtDateLong(r.dueDate),
      r.property.name,
      r.unit.label,
      STATUS_LABEL[r.status],
    ]);
    downloadCsv(`hearth-payments-${period}.csv`, headers, out);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-sub">
            {fmtMoney(collected)} of {fmtMoney(expected)} collected
            {buildings.length ? ` across ${buildings.length} building${buildings.length > 1 ? "s" : ""}` : ""} in {periodLabelLong(period)}.
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn"
            onClick={exportSpreadsheet}
            disabled={filtered.length === 0}
            title="Download the rows below as a spreadsheet (.csv)"
          >
            <Download /> Export to spreadsheet
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            className="input"
            placeholder="Search name, phone, or unit"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <MultiSelect
          label="Buildings"
          icon={Building2}
          options={buildingOptions}
          selected={buildings}
          onChange={setBuildings}
        />
        <select className="select" style={{ width: "auto" }} value={period} onChange={(e) => setPeriod(e.target.value)}>
          {periods.map((p) => (
            <option key={p} value={p}>{periodLabelLong(p)}</option>
          ))}
        </select>
        <div className="spacer" />
        <div className="seg">
          {FILTERS.map((f) => (
            <button key={f} data-active={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Unit</th>
              <th>Due date</th>
              <th className="num">Amount</th>
              <th>Status</th>
              <th className="num">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={r.status === "overdue" ? "row-overdue" : ""}>
                <td>
                  <div className="cell-tenant">
                    <span className="avatar avatar-sm">{initials(r.tenant.name)}</span>
                    <span className="tn-name">{r.tenant.name}</span>
                  </div>
                </td>
                <td className="t-muted">{r.property.name} · {r.unit.label}</td>
                <td>{fmtDateLong(r.dueDate)}</td>
                <td className="num">{fmtMoney(r.amount)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="num">
                  {r.status === "paid" ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => setPaid(r.id, false)}>Undo</button>
                  ) : (
                    <button className="btn btn-sm" onClick={() => setPaid(r.id, true)}>
                      <Check /> Mark paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty">
                    <Search />
                    <p>No payments match this view.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
