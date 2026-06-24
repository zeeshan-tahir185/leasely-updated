import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronsUpDown, Check, Search } from "lucide-react";

// Single-select combobox with a name search. The option list is portalled to the
// body with fixed positioning so it is never clipped inside a scrolling drawer.
// options: [{ value, label, sub? }]. Pass placeholder for the empty state.
export default function SearchSelect({ value, onChange, options, placeholder = "Select…", emptyText = "No matches", disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [rect, setRect] = useState(null);

  const selected = options.find((o) => o.value === value);
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? options.filter((o) => o.label.toLowerCase().includes(needle) || (o.sub || "").toLowerCase().includes(needle))
    : options;

  useLayoutEffect(() => {
    if (open && triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!menuRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onMove = () => setOpen(false); // close on scroll/resize so the fixed menu can't detach
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  function openMenu() { if (disabled) return; setQ(""); setActive(0); setOpen(true); }
  function choose(v) { onChange(v); setOpen(false); setQ(""); }

  return (
    <div className="ss" ref={triggerRef}>
      <button type="button" className="ss-trigger" onClick={() => (open ? setOpen(false) : openMenu())}
        disabled={disabled} aria-haspopup="listbox" aria-expanded={open}>
        <span className={selected ? "" : "t-faint"}>{selected ? selected.label : placeholder}</span>
        <ChevronsUpDown className="ss-chev" />
      </button>
      {open && rect && createPortal(
        <div className="ss-menu" ref={menuRef} style={{ position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width }} role="dialog">
          <div className="ss-search">
            <Search />
            <input autoFocus className="input" placeholder="Search name…" value={q}
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                else if (e.key === "Enter") { e.preventDefault(); if (filtered[active]) choose(filtered[active].value); }
              }} />
          </div>
          <div className="ss-list" role="listbox">
            {filtered.map((o, i) => (
              <button type="button" key={o.value} className={`ss-opt ${i === active ? "is-active" : ""} ${o.value === value ? "is-on" : ""}`}
                onMouseEnter={() => setActive(i)} onClick={() => choose(o.value)}>
                <span className="ss-opt-label">{o.label}{o.sub && <span className="ss-opt-sub">{o.sub}</span>}</span>
                {o.value === value && <Check className="ss-check" />}
              </button>
            ))}
            {filtered.length === 0 && <div className="ss-empty">{emptyText}</div>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
