import { useData } from "../data/store";
import { fmtMoney } from "../lib/format";

// Money is masked for roles without financial visibility (employee). Keeps the
// "according to privileges" rule in one place so pages don't each re-check.
export default function Money({ value, cents = false, muted = false }) {
  const { can } = useData();
  if (!can.viewFinancials) return <span className="tnum t-faint">•••</span>;
  return <span className={`tnum${muted ? " t-muted" : ""}`}>{fmtMoney(value, cents)}</span>;
}
