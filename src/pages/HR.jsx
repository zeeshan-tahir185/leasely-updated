import { useMemo, useState } from "react";
import { Search, Plus, Trash2, Users, Coins, Building2, CalendarClock, CheckCircle2, Play, Wallet } from "lucide-react";
import { useData } from "../data/store";
import { scopeData } from "../lib/domain";
import { fmtDateLong, periodLabelLong, CUR_PERIOD, initials, todayISO } from "../lib/format";
import { DEPARTMENTS, ALLOWANCE_SUGGESTIONS, DEDUCTION_SUGGESTIONS, payrollLine } from "../lib/constants";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import NewFlag from "../components/NewFlag";
import LastModified from "../components/LastModified";
import { useConfirm } from "../components/ConfirmDialog";

// Normalise a [{label, amount}] editor list into clean, numeric line items.
const cleanItems = (items) =>
  (items || [])
    .map((x) => ({ label: (x.label || "").trim(), amount: Number(x.amount) || 0 }))
    .filter((x) => x.label || x.amount);

export default function HR() {
  const { db, companyId, runPayroll, markSeen } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const confirm = useConfirm();
  const [view, setView] = useState("team");
  const [query, setQuery] = useState("");
  const [openEmp, setOpenEmp] = useState(null);
  const [openPeriod, setOpenPeriod] = useState(null);
  const [addEmp, setAddEmp] = useState(false);

  const employees = s.employees;
  const active = employees.filter((e) => (e.status || "active") === "active");
  const monthlyCost = active.reduce((a, e) => a + payrollLine(e).net, 0);
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];
  const avgSalary = employees.length ? Math.round(employees.reduce((a, e) => a + (e.salary || 0), 0) / employees.length) : 0;

  const periods = useMemo(() => {
    const map = {};
    for (const p of s.payroll) {
      const g = map[p.period] || (map[p.period] = { period: p.period, lines: [], gross: 0, net: 0, paid: 0 });
      g.lines.push(p);
      g.gross += p.basic + p.allowances;
      g.net += p.net;
      if (p.status === "paid") g.paid += 1;
    }
    return Object.values(map)
      .map((g) => ({ ...g, status: g.lines.every((l) => l.status === "paid") ? "paid" : "pending" }))
      .sort((a, b) => b.period.localeCompare(a.period));
  }, [s.payroll]);

  const thisMonthNet = periods.find((p) => p.period === CUR_PERIOD)?.net || 0;
  const pendingNet = s.payroll.filter((p) => p.status !== "paid").reduce((a, p) => a + p.net, 0);

  const q = query.trim().toLowerCase();
  const filteredEmps = employees.filter((e) => !q || e.name.toLowerCase().includes(q) || (e.title || "").toLowerCase().includes(q) || (e.department || "").toLowerCase().includes(q));

  async function doRunPayroll() {
    const ok = await confirm({
      title: `Run payroll for ${periodLabelLong(CUR_PERIOD)}?`,
      message: "This creates pending payslips for every active employee who doesn't already have one this period.",
      confirmLabel: "Run payroll", tone: "primary",
    });
    if (ok) { runPayroll(CUR_PERIOD); setView("payroll"); }
  }

  return (
    <div className="page">
      <PageHeader title="HR & Payroll" subtitle={`${employees.length} staff · ${periods.length} payroll run${periods.length === 1 ? "" : "s"}`}
        actions={view === "team"
          ? <button className="btn btn-primary" onClick={() => setAddEmp(true)}><Plus /> Add employee</button>
          : <button className="btn btn-primary" onClick={doRunPayroll}><Play /> Run payroll</button>} />

      {view === "team" ? (
        <div className="kpi-grid kpi-4">
          <StatCard label="Headcount" Icon={Users} tone="primary" value={active.length} hint={`${employees.length} on record`} />
          <StatCard label="Monthly payroll" Icon={Coins} tone="accent" value={<Money value={monthlyCost} />} hint="net, active staff" />
          <StatCard label="Departments" Icon={Building2} tone="neutral" value={departments.length} hint="across the team" />
          <StatCard label="Avg basic" Icon={Wallet} tone="primary" value={<Money value={avgSalary} />} hint="salary / month" />
        </div>
      ) : (
        <div className="kpi-grid kpi-4">
          <StatCard label="This month" Icon={Coins} tone="primary" value={<Money value={thisMonthNet} />} hint={periodLabelLong(CUR_PERIOD)} />
          <StatCard label="Pending" Icon={CalendarClock} tone={pendingNet ? "danger" : "neutral"} value={<Money value={pendingNet} />} hint="unpaid payslips" />
          <StatCard label="Payroll runs" Icon={CheckCircle2} tone="success" value={periods.length} hint="periods on file" />
          <StatCard label="Headcount" Icon={Users} tone="neutral" value={active.length} hint="active staff" />
        </div>
      )}

      <div className="toolbar">
        {view === "team" ? (
          <div className="search">
            <Search />
            <input className="input" placeholder="Search name, title, department" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        ) : <div className="spacer" />}
        <div className="spacer" />
        <div className="seg">
          <button data-active={view === "team"} onClick={() => setView("team")}>Team</button>
          <button data-active={view === "payroll"} onClick={() => setView("payroll")}>Payroll</button>
        </div>
      </div>

      {view === "team" ? (
        <section className="card card-table">
          <table className="table">
            <thead>
              <tr><th>Employee</th><th>Department</th><th>Joined</th><th className="num">Net pay</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filteredEmps.map((e) => (
                <tr key={e.id} className={`row-click ${e.isNew ? "row-new" : ""}`} onClick={() => { markSeen("employees", e.id); setOpenEmp(e.id); }}>
                  <td>
                    <div className="cell-tenant">
                      <span className="avatar avatar-sm">{initials(e.name)}</span>
                      <div><div className="tn-name">{e.name}<NewFlag show={e.isNew} /></div><div className="tn-sub">{e.title}</div></div>
                    </div>
                  </td>
                  <td className="t-muted">{e.department || "—"}</td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{e.joinDate ? fmtDateLong(e.joinDate) : "—"}</td>
                  <td className="num"><Money value={payrollLine(e).net} /></td>
                  <td><StatusBadge status={e.status || "active"} /></td>
                </tr>
              ))}
              {filteredEmps.length === 0 && <tr><td colSpan={5}><div className="empty"><Users /><p>No employees match.</p></div></td></tr>}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="card card-table">
          <table className="table">
            <thead>
              <tr><th>Period</th><th className="num">Employees</th><th className="num">Gross</th><th className="num">Net</th><th>Status</th></tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.period} className={`row-click ${p.lines.some((l) => l.isNew) ? "row-new" : ""}`} onClick={() => { p.lines.forEach((l) => l.isNew && markSeen("payroll", l.id)); setOpenPeriod(p.period); }}>
                  <td style={{ fontWeight: 600 }}>{periodLabelLong(p.period)}<NewFlag show={p.lines.some((l) => l.isNew)} /></td>
                  <td className="num tnum">{p.lines.length}</td>
                  <td className="num"><Money value={p.gross} /></td>
                  <td className="num"><Money value={p.net} /></td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
              {periods.length === 0 && <tr><td colSpan={5}><div className="empty"><Coins /><p>No payroll yet — run payroll to generate this month's payslips.</p></div></td></tr>}
            </tbody>
          </table>
        </section>
      )}

      {openEmp && <EmployeeDrawer key={openEmp} id={openEmp} s={s} onClose={() => setOpenEmp(null)} />}
      {openPeriod && <PayrollDrawer key={openPeriod} period={openPeriod} s={s} onClose={() => setOpenPeriod(null)} />}
      <AddEmployeeDrawer open={addEmp} onClose={() => setAddEmp(false)} />
    </div>
  );
}

// ---- department picker with a manual "Other…" entry -------------------------
function DepartmentField({ value, onChange }) {
  const isOther = !!value && !DEPARTMENTS.includes(value);
  const [other, setOther] = useState(isOther);
  return (
    <>
      <select
        className="select"
        value={other ? "__other" : value}
        onChange={(e) => {
          if (e.target.value === "__other") { setOther(true); onChange(""); }
          else { setOther(false); onChange(e.target.value); }
        }}
      >
        <option value="">Select department…</option>
        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        <option value="__other">Other…</option>
      </select>
      {other && (
        <input className="input" style={{ marginTop: 8 }} placeholder="Enter department name"
          value={value} onChange={(e) => onChange(e.target.value)} autoFocus />
      )}
    </>
  );
}

// ---- editable list of {label, amount} (allowances or deductions) ------------
function LineItemsField({ items, onChange, suggestions, sign }) {
  const list = items || [];
  const setRow = (i, patch) => onChange(list.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const add = (label = "") => onChange([...list, { label, amount: "" }]);
  const remove = (i) => onChange(list.filter((_, k) => k !== i));
  const unused = (suggestions || []).filter((sug) => !list.some((x) => x.label === sug));
  return (
    <div className="li-editor">
      {list.map((it, i) => (
        <div className="li-row" key={i}>
          <input className="input" placeholder="Label" value={it.label} onChange={(e) => setRow(i, { label: e.target.value })} />
          <div className="li-amt">
            <span className="li-sign">{sign}AED</span>
            <input className="input" type="number" min="0" placeholder="0" value={it.amount} onChange={(e) => setRow(i, { amount: e.target.value })} />
          </div>
          <button type="button" className="icon-btn" onClick={() => remove(i)} aria-label="Remove line"><Trash2 /></button>
        </div>
      ))}
      <div className="li-add">
        {unused.map((sug) => (
          <button type="button" key={sug} className="chip-add" onClick={() => add(sug)}><Plus /> {sug}</button>
        ))}
        <button type="button" className="chip-add" onClick={() => add("")}><Plus /> Custom</button>
      </div>
    </div>
  );
}

function EmployeeDrawer({ id, s, onClose }) {
  const { update, deleteEmployee } = useData();
  const confirm = useConfirm();
  const e = s.employees.find((x) => x.id === id);
  const [form, setForm] = useState(() => (e ? {
    name: e.name, title: e.title || "", department: e.department || "", salary: String(e.salary ?? ""),
    allowances: e.allowances ? e.allowances.map((x) => ({ ...x })) : [],
    deductions: e.deductions ? e.deductions.map((x) => ({ ...x })) : [],
    joinDate: e.joinDate || todayISO(), status: e.status || "active",
  } : null));
  if (!e) return <Drawer open={false} onClose={onClose} />;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const pay = payrollLine(e);
  const history = s.payroll.filter((p) => p.employeeId === id).sort((a, b) => b.period.localeCompare(a.period));

  function saveDetails(ev) {
    ev.preventDefault();
    update("employees", id, {
      name: form.name.trim() || e.name, title: form.title.trim(), department: form.department,
      salary: Number(form.salary) || 0, allowances: cleanItems(form.allowances), deductions: cleanItems(form.deductions),
      joinDate: form.joinDate, status: form.status,
    });
    onClose();
  }
  async function handleDelete() {
    if (await confirm({ title: `Delete ${e.name}?`, message: "This permanently removes the employee and their payroll history. This can't be undone.", confirmLabel: "Delete employee" })) {
      deleteEmployee(id); onClose();
    }
  }

  return (
    <Drawer open onClose={onClose} title={e.name} subtitle={`${e.title || ""}${e.department ? ` · ${e.department}` : ""}`}
      footer={<>
        <button className="btn btn-danger" type="button" aria-label="Delete employee" title="Delete employee" onClick={handleDelete}><Trash2 /></button>
        <div className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        <button className="btn btn-primary" form="edit-emp" type="submit">Save changes</button>
      </>}>
      <div className="drawer-tenant">
        <span className="avatar">{initials(e.name)}</span>
        <div>
          <div className="t-h2">{e.name}</div>
          <div className="t-muted" style={{ marginTop: 2 }}><StatusBadge status={e.status || "active"} /></div>
        </div>
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Monthly pay</h3>
      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">Basic salary</span><span className="v"><Money value={pay.basic} /></span></div>
        {pay.allowanceItems.length > 0
          ? pay.allowanceItems.map((a, i) => (
              <div className="detail-row" key={`a${i}`}><span className="k">{a.label || "Allowance"}</span><span className="v">+ <Money value={Number(a.amount) || 0} /></span></div>
            ))
          : <div className="detail-row"><span className="k">Allowances</span><span className="v">+ <Money value={pay.allowances} /></span></div>}
        {pay.deductionItems.length > 0
          ? pay.deductionItems.map((dd, i) => (
              <div className="detail-row" key={`d${i}`}><span className="k">{dd.label || "Deduction"}</span><span className="v">− <Money value={Number(dd.amount) || 0} /></span></div>
            ))
          : (pay.deductions > 0 && <div className="detail-row"><span className="k">Deductions</span><span className="v">− <Money value={pay.deductions} /></span></div>)}
        <div className="detail-row"><span className="k" style={{ fontWeight: 600, color: "var(--ink)" }}>Net pay</span><span className="v" style={{ fontWeight: 700 }}><Money value={pay.net} /></span></div>
      </div>

      {history.length > 0 && (
        <>
          <h3 className="t-h3" style={{ marginBottom: 10 }}>Payslip history</h3>
          <div className="sched" style={{ marginBottom: 18 }}>
            {history.map((p) => (
              <div key={p.id} className={`sched-row ${p.status === "paid" ? "paid" : ""}`}>
                <div className="sched-date">{periodLabelLong(p.period)}</div>
                <span className="sched-amt"><Money value={p.net} /></span>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Employee details</h3>
      <form id="edit-emp" onSubmit={saveDetails} className="form-grid">
        <label className="field full"><span>Name</span>
          <input className="input" value={form.name} onChange={(ev) => set("name", ev.target.value)} /></label>
        <label className="field"><span>Title</span>
          <input className="input" value={form.title} onChange={(ev) => set("title", ev.target.value)} /></label>
        <label className="field"><span>Department</span>
          <DepartmentField value={form.department} onChange={(v) => set("department", v)} /></label>
        <label className="field"><span>Basic salary (AED/mo)</span>
          <input className="input" type="number" value={form.salary} onChange={(ev) => set("salary", ev.target.value)} /></label>
        <label className="field"><span>Status</span>
          <select className="select" value={form.status} onChange={(ev) => set("status", ev.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select></label>
        <label className="field full"><span>Join date</span>
          <input className="input" type="date" value={form.joinDate} onChange={(ev) => set("joinDate", ev.target.value)} /></label>

        <div className="field full"><span>Allowances</span>
          <LineItemsField items={form.allowances} onChange={(v) => set("allowances", v)} suggestions={ALLOWANCE_SUGGESTIONS} sign="+ " /></div>
        <div className="field full"><span>Deductions</span>
          <LineItemsField items={form.deductions} onChange={(v) => set("deductions", v)} suggestions={DEDUCTION_SUGGESTIONS} sign="− " /></div>
      </form>

      <LastModified record={e} />
    </Drawer>
  );
}

function PayrollDrawer({ period, s, onClose }) {
  const { setPayrollPaid } = useData();
  const ix = useMemo(() => Object.fromEntries(s.employees.map((e) => [e.id, e])), [s.employees]);
  const lines = s.payroll.filter((p) => p.period === period).sort((a, b) => (ix[b.employeeId]?.salary || 0) - (ix[a.employeeId]?.salary || 0));
  const total = lines.reduce((a, p) => a + p.net, 0);
  const gross = lines.reduce((a, p) => a + p.basic + p.allowances, 0);
  const allPaid = lines.length > 0 && lines.every((p) => p.status === "paid");

  return (
    <Drawer open onClose={onClose} title={periodLabelLong(period)} subtitle={`Payroll · ${lines.length} payslip${lines.length === 1 ? "" : "s"}`}
      footer={<>
        <div className="spacer" />
        <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        {allPaid
          ? <button className="btn btn-ghost" onClick={() => setPayrollPaid(period, false)}>Mark unpaid</button>
          : <button className="btn btn-primary" onClick={() => setPayrollPaid(period, true)}><CheckCircle2 /> Mark all paid</button>}
      </>}>
      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">Gross</span><span className="v"><Money value={gross} /></span></div>
        <div className="detail-row"><span className="k" style={{ fontWeight: 600, color: "var(--ink)" }}>Total net</span><span className="v" style={{ fontWeight: 700 }}><Money value={total} /></span></div>
        <div className="detail-row"><span className="k">Status</span><span className="v"><StatusBadge status={allPaid ? "paid" : "pending"} /></span></div>
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Payslips</h3>
      <div className="sched">
        {lines.map((p) => {
          const e = ix[p.employeeId];
          return (
            <div key={p.id} className={`sched-row ${p.status === "paid" ? "paid" : ""}`}>
              <div>
                <div className="sched-date">{e?.name || "—"}</div>
                <div className="t-faint" style={{ fontSize: 12 }}>
                  Basic <Money value={p.basic} /> · +<Money value={p.allowances} /> · −<Money value={p.deductions} />
                </div>
              </div>
              <span className="sched-amt"><Money value={p.net} /></span>
              <StatusBadge status={p.status} />
            </div>
          );
        })}
        {lines.length === 0 && <p className="t-muted" style={{ fontSize: 13 }}>No payslips in this period.</p>}
      </div>
    </Drawer>
  );
}

function AddEmployeeDrawer({ open, onClose }) {
  const { add, companyId } = useData();
  const blank = { name: "", title: "", department: "", salary: "", allowances: [], deductions: [], joinDate: todayISO() };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Enter the employee's name.");
    if (!form.department.trim()) return setError("Choose or enter a department.");
    if (!Number(form.salary)) return setError("Enter the basic monthly salary.");
    add("employees", {
      companyId, name: form.name.trim(), title: form.title.trim(), department: form.department.trim(),
      salary: Number(form.salary), allowances: cleanItems(form.allowances), deductions: cleanItems(form.deductions),
      joinDate: form.joinDate, status: "active",
    });
    setForm(blank); setError(""); onClose();
  }

  const preview = payrollLine({ salary: Number(form.salary) || 0, allowances: cleanItems(form.allowances), deductions: cleanItems(form.deductions) });

  return (
    <Drawer open={open} onClose={onClose} title="Add an employee" subtitle="Add a staff member to the team"
      footer={<>
        <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" form="add-emp" type="submit">Add employee</button>
      </>}>
      <form id="add-emp" onSubmit={submit} className="form-grid">
        <label className="field full"><span>Full name</span>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sarah Mansour" /></label>
        <label className="field"><span>Title</span>
          <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Property Manager" /></label>
        <label className="field"><span>Department</span>
          <DepartmentField value={form.department} onChange={(v) => set("department", v)} /></label>
        <label className="field"><span>Basic salary (AED/mo)</span>
          <input className="input" type="number" value={form.salary} onChange={(e) => set("salary", e.target.value)} /></label>
        <label className="field"><span>Join date</span>
          <input className="input" type="date" value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} /></label>

        <div className="field full"><span>Allowances (housing, transport, bonus…)</span>
          <LineItemsField items={form.allowances} onChange={(v) => set("allowances", v)} suggestions={ALLOWANCE_SUGGESTIONS} sign="+ " /></div>
        <div className="field full"><span>Deductions (loan, advance…)</span>
          <LineItemsField items={form.deductions} onChange={(v) => set("deductions", v)} suggestions={DEDUCTION_SUGGESTIONS} sign="− " /></div>

        {Number(form.salary) > 0 && (
          <div className="full li-preview">
            <span>Net monthly pay</span>
            <strong><Money value={preview.net} /></strong>
          </div>
        )}
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}
