import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Info, ShieldAlert, Mail, MessageSquare, Inbox } from "lucide-react";
import { useData } from "../data/store";
import { scopeData } from "../lib/domain";
import { buildAlerts } from "../lib/alerts";
import { fmtDateLong } from "../lib/format";
import PageHeader from "../components/PageHeader";

const SEV_ICON = { critical: ShieldAlert, warning: AlertTriangle, info: Info };

export default function Notifications() {
  const { db, companyId } = useData();
  const s = useMemo(() => scopeData(db, companyId), [db, companyId]);
  const alerts = useMemo(() => buildAlerts(s), [s]);
  const outbox = (db.outbox || []).filter((o) => o.companyId === companyId);

  const counts = alerts.reduce((a, x) => ((a[x.severity] = (a[x.severity] || 0) + 1), a), {});

  return (
    <div className="page">
      <PageHeader
        title="Notifications"
        subtitle={`${alerts.length} internal alerts · ${counts.critical || 0} critical, ${counts.warning || 0} warnings`}
      />

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="panel-head"><h3 className="t-h3">Internal alerts</h3></div>
        <div className="alert-feed lg">
          {alerts.map((a) => {
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
          {alerts.length === 0 && <div className="empty"><p>Nothing needs attention.</p></div>}
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
