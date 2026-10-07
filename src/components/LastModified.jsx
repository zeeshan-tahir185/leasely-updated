import { Clock } from "lucide-react";
import { useData } from "../data/store";

// Shows "Last modified {date} by {name}" for any record carrying the audit
// stamp (modifiedAt / modifiedBy), set centrally by the store on every edit.
// Falls back to creation time, and renders nothing for un-stamped seed rows.
export default function LastModified({ record, className = "" }) {
  const { db } = useData();
  if (!record) return null;
  const ts = record.modifiedAt || record.createdTs;
  if (!ts) return null;
  const whoId = record.modifiedBy || record.createdBy;
  const who = (db.users || []).find((u) => u.id === whoId);
  const when = new Date(ts).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return (
    <div className={`last-modified ${className}`.trim()}>
      <Clock aria-hidden="true" />
      <span>Last modified {when}{who ? ` by ${who.name}` : ""}</span>
    </div>
  );
}
