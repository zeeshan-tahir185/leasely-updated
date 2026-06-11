import { RotateCcw } from "lucide-react";
import { useData } from "../data/store";

export default function Settings() {
  const { resetDemo } = useData();

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Workspace and account preferences.</p>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="panel-head"><h3 className="t-h3">Profile</h3></div>
        <div className="panel-body form-grid">
          <label className="field"><span>Full name</span><input className="input" defaultValue="Sarah Mansour" /></label>
          <label className="field"><span>Email</span><input className="input" defaultValue="sarah@westwoodpm.ae" /></label>
          <label className="field full"><span>Workspace</span><input className="input" defaultValue="Westwood Property Mgmt" /></label>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="panel-head"><h3 className="t-h3">Preferences</h3></div>
        <div className="panel-body">
          <div className="detail-list">
            <div className="detail-row"><span className="k">Currency</span><span className="v">AED — UAE Dirham</span></div>
            <div className="detail-row"><span className="k">Default rent due day</span><span className="v">1st of the month</span></div>
            <div className="detail-row"><span className="k">Overdue reminders</span><span className="v">Email, 3 days after due</span></div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="panel-head"><h3 className="t-h3">Demo data</h3></div>
        <div className="panel-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <p className="t-muted" style={{ margin: 0 }}>
            Restore the sample properties, tenants, and payment history to their original state.
          </p>
          <button
            className="btn"
            onClick={() => confirm("Reset all demo data?") && resetDemo()}
          >
            <RotateCcw /> Reset demo data
          </button>
        </div>
      </section>
    </div>
  );
}
