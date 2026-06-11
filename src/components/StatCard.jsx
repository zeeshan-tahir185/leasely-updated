export default function StatCard({ label, value, hint, Icon, tone = "neutral" }) {
  return (
    <div className="card stat-card">
      <div className="stat-top">
        <span className="t-label">{label}</span>
        {Icon && (
          <span className={`stat-icon tone-${tone}`}>
            <Icon strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="stat-value tnum">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
