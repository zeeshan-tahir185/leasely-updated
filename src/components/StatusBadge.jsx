import { Check, Clock, AlertTriangle, Home } from "lucide-react";

const MAP = {
  paid: { cls: "badge-paid", Icon: Check, label: "Paid" },
  due: { cls: "badge-due", Icon: Clock, label: "Due" },
  overdue: { cls: "badge-overdue", Icon: AlertTriangle, label: "Overdue" },
  vacant: { cls: "badge-neutral", Icon: Home, label: "Vacant" },
};

export default function StatusBadge({ status, children }) {
  const { cls, Icon, label } = MAP[status] || MAP.due;
  return (
    <span className={`badge ${cls}`}>
      <Icon strokeWidth={2.5} />
      {children || label}
    </span>
  );
}
