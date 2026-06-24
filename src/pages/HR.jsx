import { useMemo, useState } from "react";
import { Search, Plus, Trash2, Users, Coins, Building2, CalendarClock, CheckCircle2, Play, Wallet } from "lucide-react";
import { useData } from "../data/store";
import { scopeData } from "../lib/domain";
import { fmtDateLong, periodLabelLong, CUR_PERIOD, initials, todayISO } from "../lib/format";
import { DEPARTMENTS, payrollLine } from "../lib/constants";
import PageHeader from "../components/PageHeader";
import Drawer from "../components/Drawer";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import Money from "../components/Money";
import { useConfirm } from "../components/ConfirmDialog";

export default function HR() {
  const { db, companyId, runPayroll } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const confirm = useConfirm();
  const [view, setView] = useState("team");
  const [query, setQuery] = useState("");
  const [openEmp, setOpenEmp] = useState(null);
  const [openPeriod, setOpenPeriod] = useState(null);
  const [addEmp, setAddEmp] = useState(false);

  const employees = s.employees;
  const active = employees.filter((e) => (e.status || "active") === "active");
  const monthlyCost = active.reduce((a, e) => a + payrollLine(e.salary).net, 0);
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];
  const avgSalary = employees.length ? Math.round(employees.reduce((a, e) => a + e.salary, 0) / employees.length) : 0;

  // payroll grouped by period
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
          <StatCard label="Avg salary" Icon={Wallet} tone="primary" value={<Money value={avgSalary} />} hint="basic / month" />
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
        <section className="card" style={{ overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr><th>Employee</th><th>Department</th><th>Joined</th><th className="num">Salary</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filteredEmps.map((e) => (
                <tr key={e.id} className="row-click" onClick={() => setOpenEmp(e.id)}>
                  <td>
                    <div className="cell-tenant">
                      <span className="avatar avatar-sm">{initials(e.name)}</span>
                      <div><div className="tn-name">{e.name}</div><div className="tn-sub">{e.title}</div></div>
                    </div>
                  </td>
                  <td className="t-muted">{e.department || "—"}</td>
                  <td className="t-muted" style={{ whiteSpace: "nowrap" }}>{e.joinDate ? fmtDateLong(e.joinDate) : "—"}</td>
                  <td className="num"><Money value={e.salary} /></td>
                  <td><StatusBadge status={e.status || "active"} /></td>
                </tr>
              ))}
              {filteredEmps.length === 0 && <tr><td colSpan={5}><div className="empty"><Users /><p>No employees match.</p></div></td></tr>}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="card" style={{ overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr><th>Period</th><th className="num">Employees</th><th className="num">Gross</th><th className="num">Net</th><th>Status</th></tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.period} className="row-click" onClick={() => setOpenPeriod(p.period)}>
                  <td style={{ fontWeight: 600 }}>{periodLabelLong(p.period)}</td>
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

function EmployeeDrawer({ id, s, onClose }) {
  const { update, deleteEmployee } = useData();
  const confirm = useConfirm();
  const e = s.employees.find((x) => x.id === id);
  const [form, setForm] = useState(() => (e ? { name: e.name, title: e.title || "", department: e.department || "", salary: String(e.salary), joinDate: e.joinDate || todayISO(), status: e.status || "active" } : null));
  if (!e) return <Drawer open={false} onClose={onClose} />;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const pay = payrollLine(e.salary);
  const history = s.payroll.filter((p) => p.employeeId === id).sort((a, b) => b.period.localeCompare(a.period));

  function saveDetails(ev) {
    ev.preventDefault();
    update("employees", id, { name: form.name.trim() || e.name, title: form.title.trim(), department: form.department, salary: Number(form.salary) || e.salary, joinDate: form.joinDate, status: form.status });
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

      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">Title</span><span className="v">{e.title || "—"}</span></div>
        <div className="detail-row"><span className="k">Department</span><span className="v">{e.department || "—"}</span></div>
        <div className="detail-row"><span className="k">Joined</span><span className="v">{e.joinDate ? fmtDateLong(e.joinDate) : "—"}</span></div>
      </div>

      <h3 className="t-h3" style={{ marginBottom: 10 }}>Monthly pay</h3>
      <div className="detail-list" style={{ marginBottom: 18 }}>
        <div className="detail-row"><span className="k">Basic</span><span className="v"><Money value={pay.basic} /></span></div>
        <div className="detail-row"><span className="k">Allowances</span><span className="v"><Money value={pay.allowances} /></span></div>
        <div className="detail-row"><span className="k">Deductions</span><span className="v">− <Money value={pay.deductions} /></span></div>
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
          <select className="select" value={form.department} onChange={(ev) => set("department", ev.target.value)}>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select></label>
        <label className="field"><span>Salary (AED/mo)</span>
          <input className="input" type="number" value={form.salary} onChange={(ev) => set("salary", ev.target.value)} /></label>
        <label className="field"><span>Status</span>
          <select className="select" value={form.status} onChange={(ev) => set("status", ev.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select></label>
        <label className="field full"><span>Join date</span>
          <input className="input" type="date" value={form.joinDate} onChange={(ev) => set("joinDate", ev.target.value)} /></label>
      </form>
    </Drawer>
  );
}

function PayrollDrawer({ period, s, onClose }) {
  const { setPayrollPaid } = useData();
  const ix = useMemo(() => Object.fromEntries(s.employees.map((e) => [e.id, e])), [s.employees]);
  const lines = s.payroll.filter((p) => p.period === period).sort((a, b) => (ix[b.employeeId]?.salary || 0) - (ix[a.employeeId]?.salary || 0));
  const total = lines.reduce((a, p) => a + p.net, 0);
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
        <div className="detail-row"><span className="k">Total net</span><span className="v" style={{ fontWeight: 700 }}><Money value={total} /></span></div>
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
                <div className="t-faint" style={{ fontSize: 12 }}>{e?.title || ""}</div>
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
  const blank = { name: "", title: "", department: "", salary: "", joinDate: todayISO() };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Enter the employee's name.");
    if (!form.department) return setError("Choose a department.");
    if (!Number(form.salary)) return setError("Enter the monthly salary.");
    add("employees", { companyId, name: form.name.trim(), title: form.title.trim(), department: form.department, salary: Number(form.salary), joinDate: form.joinDate, status: "active" });
    setForm(blank); setError(""); onClose();
  }

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
          <select className="select" value={form.department} onChange={(e) => set("department", e.target.value)}>
            <option value="">Select department…</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select></label>
        <label className="field"><span>Salary (AED/mo)</span>
          <input className="input" type="number" value={form.salary} onChange={(e) => set("salary", e.target.value)} /></label>
        <label className="field"><span>Join date</span>
          <input className="input" type="date" value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} /></label>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}
