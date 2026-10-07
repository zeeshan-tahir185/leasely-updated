import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Info, ShieldAlert, Mail, MessageSquare, Inbox } from "lucide-react";
import { useData } from "../data/store";
import { scopeData } from "../lib/domain";
import { buildAlerts } from "../lib/alerts";
import { fmtDateLong } from "../lib/format";
import PageHeader from "../components/PageHeader";

const SEV_ICON = { critical: ShieldAlert, warning: AlertTriangle, info: Info };
const TYPE_LABELS = {
  cheque: "Cheques",
  renewal: "Contract renewals",
  maintenance: "Maintenance",
  bill: "Supplier bills",
  case: "Legal & police",
  inventory: "Inventory",
};

export default function Notifications() {
  const { db, companyId, role } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const alerts = useMemo(() => buildAlerts(s, role), [s, role]);
  const outbox = (db.outbox || []).filter((o) => o.companyId === companyId);

  const [tower, setTower] = useState("all");
  const [type, setType] = useState("all");

  // Only offer filters for towers/types that actually appear in the feed.
  const towerOpts = useMemo(() => {
    const ids = new Set(alerts.map((a) => a.towerId).filter(Boolean));
    return s.towers.filter((t) => ids.has(t.id));
  }, [alerts, s.towers]);
  const typeOpts = useMemo(() => [...new Set(alerts.map((a) => a.type))], [alerts]);

  const filtered = alerts.filter(
    (a) => (tower === "all" || a.towerId === tower) && (type === "all" || a.type === type)
  );
  const counts = filtered.reduce((a, x) => ((a[x.severity] = (a[x.severity] || 0) + 1), a), {});

  return (
    <div className="page">
      <PageHeader
        title="Notifications"
        subtitle={`${filtered.length} internal alert${filtered.length === 1 ? "" : "s"} · ${counts.critical || 0} critical, ${counts.warning || 0} warnings`}
      />

      {alerts.length > 0 && (
        <div className="toolbar">
          <select className="select period-select" value={tower} onChange={(e) => setTower(e.target.value)} aria-label="Filter by tower">
            <option value="all">All towers</option>
            {towerOpts.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="select period-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
            <option value="all">All types</option>
            {typeOpts.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
          </select>
          <div className="spacer" />
          {(tower !== "all" || type !== "all") && (
            <button className="btn btn-sm btn-ghost" onClick={() => { setTower("all"); setType("all"); }}>Clear filters</button>
          )}
        </div>
      )}

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="panel-head"><h3 className="t-h3">Internal alerts</h3></div>
        <div className="alert-feed lg">
          {filtered.map((a) => {
            const Icon = SEV_ICON[a.severity] || Info;
            return (
              <Link to={a.link || "/"} key={a.id} className={`alert-row sev-${a.severity}`}>
                <span className="alert-ic"><Icon strokeWidth={2.2} /></span>
                <span className="alert-body">
                  <span className="alert-title">{a.title}</span>
                  <span className="alert-sub">{a.body}</span>
                </span>
                {a.date && <span className="alert-date t-faint">{fmtDateLong(a.date)}</span>}
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty">
              <Info />
              <p>{alerts.length === 0 ? "Nothing needs attention." : "No alerts match these filters."}</p>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="panel-head">
          <div>
            <h3 className="t-h3">Customer email &amp; SMS</h3>
            <p className="t-muted">Outbound notifications to tenants (simulated in the prototype)</p>
          </div>
        </div>
        {outbox.length > 0 ? (
          <div className="alert-feed">
            {outbox.map((o) => (
              <div key={o.id} className="alert-row sev-info">
                <span className="alert-ic">{o.channel === "sms" ? <MessageSquare strokeWidth={2.2} /> : <Mail strokeWidth={2.2} />}</span>
                <span className="alert-body">
                  <span className="alert-title">{o.subject || o.body.slice(0, 60)}</span>
                  <span className="alert-sub">{o.channel.toUpperCase()} → {o.to}</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <Inbox />
            <p>No messages sent yet. Renewal and cheque reminders to tenants will appear here once enabled.</p>
          </div>
        )}
      </section>
    </div>
  );
}
