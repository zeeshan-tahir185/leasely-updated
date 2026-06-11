import { useState } from "react";
import { fmtMoney, fmtMoneyShort } from "../../lib/format";

function niceMax(v) {
  if (v <= 0) return 1000;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const step = pow / 2;
  return Math.ceil(v / step) * step;
}

export default function CollectionsChart({ data }) {
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(...data.map((d) => d.expected), 1));
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => ({ f, value: max * f }));

  return (
    <div className="chart">
      <div className="chart-legend">
        <span><i className="sw sw-collected" /> Collected</span>
        <span><i className="sw sw-expected" /> Expected</span>
      </div>
      <div className="chart-grid">
        <div className="chart-yaxis">
          {ticks.map((t) => (
            <span key={t.f} className="tnum">{fmtMoneyShort(t.value)}</span>
          ))}
        </div>
        <div className="chart-plot">
          {ticks.map((t) => (
            <div key={t.f} className="gridline" style={{ bottom: `${t.f * 100}%` }} />
          ))}
          <div className="bars">
            {data.map((d, i) => {
              const pct = d.expected ? Math.round((d.collected / d.expected) * 100) : 0;
              return (
                <div
                  key={d.period}
                  className="bar-col"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  {hover === i && (
                    <div className="bar-tip">
                      <strong className="tnum">{fmtMoney(d.collected)}</strong>
                      <span className="t-faint tnum">of {fmtMoney(d.expected)} · {pct}%</span>
                    </div>
                  )}
                  <div className="bar-track" style={{ height: `${(d.expected / max) * 100}%` }}>
                    <div
                      className={`bar-fill ${d.isCurrent ? "is-current" : ""}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className={`bar-label ${d.isCurrent ? "is-current" : ""}`}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
