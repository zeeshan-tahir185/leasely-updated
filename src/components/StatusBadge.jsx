import {
  Check, Clock, AlertTriangle, Home, CalendarCheck, CalendarX2, Banknote,
  XCircle, RefreshCw, CircleDot, Gavel, Hourglass, Ban,
} from "lucide-react";

// One vocabulary for every status across the app. Unknown values fall back to a
// neutral pill with a title-cased label, so new statuses never render broken.
const MAP = {
  // money / cheques
  paid: { cls: "badge-paid", Icon: Check, label: "Paid" },
  cleared: { cls: "badge-paid", Icon: Check, label: "Cleared" },
  due: { cls: "badge-due", Icon: Clock, label: "Due" },
  pending: { cls: "badge-due", Icon: Hourglass, label: "Pending" },
  deposited: { cls: "badge-accent", Icon: Banknote, label: "Deposited" },
  overdue: { cls: "badge-overdue", Icon: AlertTriangle, label: "Overdue" },
  unpaid: { cls: "badge-due", Icon: Clock, label: "Unpaid" },
  bounced: { cls: "badge-overdue", Icon: XCircle, label: "Bounced" },
  replaced: { cls: "badge-neutral", Icon: RefreshCw, label: "Replaced" },
  // leasing / units
  leased: { cls: "badge-paid", Icon: Check, label: "Leased" },
  active: { cls: "badge-paid", Icon: Check, label: "Active" },
  vacant: { cls: "badge-neutral", Icon: Home, label: "Vacant" },
  expiring: { cls: "badge-due", Icon: CalendarCheck, label: "Expiring" },
  expired: { cls: "badge-overdue", Icon: CalendarX2, label: "Expired" },
  terminated: { cls: "badge-neutral", Icon: CalendarX2, label: "Terminated" },
  draft: { cls: "badge-neutral", Icon: CircleDot, label: "Draft" },
  settled: { cls: "badge-neutral", Icon: CalendarCheck, label: "Paid up" },
  ended: { cls: "badge-neutral", Icon: CalendarX2, label: "Ended" },
  // bookings
  held: { cls: "badge-due", Icon: Hourglass, label: "Held" },
  confirmed: { cls: "badge-paid", Icon: Check, label: "Confirmed" },
  cancelled: { cls: "badge-neutral", Icon: Ban, label: "Cancelled" },
  converted: { cls: "badge-accent", Icon: Check, label: "Converted" },
  // maintenance
  new: { cls: "badge-accent", Icon: CircleDot, label: "New" },
  assigned: { cls: "badge-due", Icon: Clock, label: "Assigned" },
  in_progress: { cls: "badge-due", Icon: RefreshCw, label: "In progress" },
  resolved: { cls: "badge-paid", Icon: Check, label: "Resolved" },
  closed: { cls: "badge-neutral", Icon: Check, label: "Closed" },
  // purchasing
  ordered: { cls: "badge-due", Icon: Clock, label: "Ordered" },
  received: { cls: "badge-paid", Icon: Check, label: "Received" },
  // cases / pipeline
  open: { cls: "badge-due", Icon: CircleDot, label: "Open" },
  in_court: { cls: "badge-overdue", Icon: Gavel, label: "In court" },
  won: { cls: "badge-paid", Icon: Check, label: "Won" },
  lost: { cls: "badge-overdue", Icon: XCircle, label: "Lost" },
};

const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function StatusBadge({ status, children }) {
  const def = MAP[status] || { cls: "badge-neutral", Icon: CircleDot, label: titleCase(status) };
  const { cls, Icon, label } = def;
  return (
    <span className={`badge ${cls}`}>
      <Icon strokeWidth={2.5} />
      {children || label}
    </span>
  );
}
