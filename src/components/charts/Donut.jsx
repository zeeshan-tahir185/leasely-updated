import { fmtMoney } from "../../lib/format";

// Collection-rate ring. Pure CSS conic-gradient; the SVG is only the label.
export default function Donut({ pct, collected, outstanding }) {
  const deg = Math.round((pct / 100) * 360);
  return (
    <div className="donut-wrap">
      <div
        className="donut"
        style={{
          background: `conic-gradient(var(--primary) ${deg}deg, var(--surface-2) ${deg}deg 360deg)`,
        }}
      >
        <div className="donut-hole">
          <span className="donut-pct tnum">{pct}%</span>
          <span className="t-faint">collected</span>
        </div>
      </div>
      <dl className="donut-legend">
        <div>
          <dt><i className="dot dot-primary" /> Collected</dt>
          <dd className="tnum">{fmtMoney(collected)}</dd>
        </div>
        <div>
          <dt><i className="dot dot-track" /> Outstanding</dt>
          <dd className="tnum">{fmtMoney(outstanding)}</dd>
        </div>
      </dl>
    </div>
  );
}
