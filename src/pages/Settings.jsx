import { useState } from "react";
import { RotateCcw, Check, User, Building2, Bell, Users } from "lucide-react";
import { useData } from "../data/store";
import { scopeData } from "../lib/domain";
import { ROLES } from "../lib/rbac";
import { useConfirm } from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import Switch from "../components/Switch";

const ROLE_KEYS = Object.keys(ROLES);

const SavedTag = ({ on }) => (on ? <span className="set-saved"><Check strokeWidth={2.6} size={15} /> Saved</span> : <span />);

export default function Settings() {
  const { db, companyId, company, user, role, can, update, updateSettings, resetDemo } = useData();
  const confirm = useConfirm();
  const s = scopeData(db, companyId);
  const settings = db.settings || {};
  const team = s.users;

  const [profile, setProfile] = useState({ name: user.name, email: user.email, title: user.title || "", phone: user.phone || "" });
  const [biz, setBiz] = useState({ name: company.name, license: company.license || "", trn: company.trn || "", phone: company.phone || "", email: company.email || "", address: company.address || "" });
  const [saved, setSaved] = useState("");
  const flash = (key) => { setSaved(key); setTimeout(() => setSaved((cur) => (cur === key ? "" : cur)), 1800); };

  const setP = (k, v) => setProfile((f) => ({ ...f, [k]: v }));
  const setB = (k, v) => setBiz((f) => ({ ...f, [k]: v }));

  function saveProfile() { update("users", user.id, { ...profile }); flash("profile"); }
  function saveBiz() { update("companies", companyId, { ...biz }); flash("biz"); }
  const setNum = (k, v) => updateSettings({ [k]: Math.max(0, Math.min(365, Number(v) || 0)) });

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <PageHeader title="Settings" subtitle={`Your profile, ${company.name}, and how Hearth alerts you.`} />

      {/* Profile */}
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="stat-icon tone-primary"><User strokeWidth={2} /></span>
            <h3 className="t-h3">Your profile</h3>
          </div>
          <span className="badge badge-neutral">{ROLES[role]?.label || role}</span>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <label className="field"><span>Full name</span><input className="input" value={profile.name} onChange={(e) => setP("name", e.target.value)} /></label>
            <label className="field"><span>Job title</span><input className="input" value={profile.title} onChange={(e) => setP("title", e.target.value)} /></label>
            <label className="field"><span>Email</span><input className="input" type="email" value={profile.email} onChange={(e) => setP("email", e.target.value)} /></label>
            <label className="field"><span>Phone</span><input className="input" value={profile.phone} onChange={(e) => setP("phone", e.target.value)} /></label>
          </div>
          <div className="sec-head" style={{ marginTop: 16, marginBottom: 0 }}>
            <SavedTag on={saved === "profile"} />
            <button className="btn btn-primary btn-sm" onClick={saveProfile}>Save changes</button>
          </div>
        </div>
      </section>

      {/* Company / workspace */}
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="stat-icon tone-accent"><Building2 strokeWidth={2} /></span>
            <h3 className="t-h3">Company</h3>
          </div>
          {!can.manageCompany && <span className="t-muted" style={{ fontSize: "0.8125rem" }}>Owner only</span>}
        </div>
        <div className="panel-body">
          {can.manageCompany ? (
            <>
              <div className="form-grid">
                <label className="field full"><span>Registered name</span><input className="input" value={biz.name} onChange={(e) => setB("name", e.target.value)} /></label>
                <label className="field"><span>Trade licence</span><input className="input" value={biz.license} onChange={(e) => setB("license", e.target.value)} /></label>
                <label className="field"><span>TRN</span><input className="input" value={biz.trn} onChange={(e) => setB("trn", e.target.value)} /></label>
                <label className="field"><span>Phone</span><input className="input" value={biz.phone} onChange={(e) => setB("phone", e.target.value)} /></label>
                <label className="field"><span>Email</span><input className="input" type="email" value={biz.email} onChange={(e) => setB("email", e.target.value)} /></label>
                <label className="field full"><span>Address</span><input className="input" value={biz.address} onChange={(e) => setB("address", e.target.value)} /></label>
              </div>
              <div className="sec-head" style={{ marginTop: 16, marginBottom: 0 }}>
                <SavedTag on={saved === "biz"} />
                <button className="btn btn-primary btn-sm" onClick={saveBiz}>Save changes</button>
              </div>
            </>
          ) : (
            <div className="detail-list">
              <div className="detail-row"><span className="k">Registered name</span><span className="v">{company.name}</span></div>
              <div className="detail-row"><span className="k">Trade licence</span><span className="v">{company.license || "—"}</span></div>
              <div className="detail-row"><span className="k">TRN</span><span className="v">{company.trn || "—"}</span></div>
              <div className="detail-row"><span className="k">Address</span><span className="v">{company.address || "—"}</span></div>
            </div>
          )}
        </div>
      </section>

      {/* Alerts & automation */}
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="stat-icon tone-success"><Bell strokeWidth={2} /></span>
            <h3 className="t-h3">Alerts &amp; automation</h3>
          </div>
        </div>
        <div className="panel-body" style={{ paddingTop: 4, paddingBottom: 4 }}>
          <div className="set-row">
            <div className="set-row-text">
              <span className="lab">Renewal lead time</span>
              <span className="sub">Flag a contract for renewal this many days before it ends.</span>
            </div>
            <input className="input set-num" type="number" min="0" max="365" value={settings.renewalLeadDays ?? 60} onChange={(e) => setNum("renewalLeadDays", e.target.value)} aria-label="Renewal lead days" />
          </div>
          <div className="set-row">
            <div className="set-row-text">
              <span className="lab">Cheque alert window</span>
              <span className="sub">Remind you to deposit a cheque this many days before it is due.</span>
            </div>
            <input className="input set-num" type="number" min="0" max="365" value={settings.chequeAlertDays ?? 7} onChange={(e) => setNum("chequeAlertDays", e.target.value)} aria-label="Cheque alert days" />
          </div>
          <div className="set-row">
            <div className="set-row-text">
              <span className="lab">Email alerts</span>
              <span className="sub">Send renewal and overdue-cheque alerts by email.</span>
            </div>
            <Switch checked={!!settings.emailAlerts} onChange={(v) => updateSettings({ emailAlerts: v })} label="Email alerts" />
          </div>
          <div className="set-row">
            <div className="set-row-text">
              <span className="lab">SMS alerts</span>
              <span className="sub">Send the same alerts by SMS to the tenant's mobile.</span>
            </div>
            <Switch checked={!!settings.smsAlerts} onChange={(v) => updateSettings({ smsAlerts: v })} label="SMS alerts" />
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="stat-icon tone-neutral"><Users strokeWidth={2} /></span>
            <h3 className="t-h3">Team</h3>
          </div>
          <span className="t-muted" style={{ fontSize: "0.8125rem" }}>{team.length} member{team.length === 1 ? "" : "s"}</span>
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead><tr><th>Name</th><th>Title</th><th>Role</th></tr></thead>
            <tbody>
              {team.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}{u.id === user.id && <span className="badge badge-accent" style={{ marginLeft: 8 }}>You</span>}</td>
                  <td className="t-muted">{u.title || "—"}</td>
                  <td>
                    {can.manageUsers && u.id !== user.id ? (
                      <select className="select" style={{ height: 32, width: 150 }} value={u.role} onChange={(e) => update("users", u.id, { role: e.target.value })} aria-label={`Role for ${u.name}`}>
                        {ROLE_KEYS.map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
                      </select>
                    ) : (
                      <span className="badge badge-neutral">{ROLES[u.role]?.label || u.role}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Demo data */}
      <section className="card">
        <div className="panel-head"><h3 className="t-h3">Demo data</h3></div>
        <div className="panel-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <p className="t-muted" style={{ margin: 0 }}>Restore the sample companies, towers, tenants and payment history to their original seeded state.</p>
          <button className="btn" style={{ flexShrink: 0 }}
            onClick={async () => { if (await confirm({ title: "Reset demo data?", message: "Every change you've made will be replaced with the original sample data. This can't be undone.", confirmLabel: "Reset data", tone: "danger" })) resetDemo(); }}>
            <RotateCcw /> Reset demo data
          </button>
        </div>
      </section>
    </div>
  );
}
