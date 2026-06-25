import { Star } from "lucide-react";

// Star + "New" pill shown next to a freshly-created record until it's opened.
// Pair with the `row-new` class on table rows (or `is-new` on cards), and call
// markSeen(entity, id) from the store when the record is opened to clear it.
export default function NewFlag({ show }) {
  if (!show) return null;
  return <span className="new-flag"><Star /> New</span>;
}
