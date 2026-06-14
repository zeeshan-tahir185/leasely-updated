import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

// Checkbox dropdown for filtering by several values at once (e.g. buildings).
// `selected` is an array of values; empty array means "all".
export default function MultiSelect({ label, options, selected, onChange, icon: Icon }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(value) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  }

  const count = selected.length;
  const summary =
    count === 0
      ? `All ${label.toLowerCase()}`
      : count === 1
      ? options.find((o) => o.value === selected[0])?.label || `1 ${label.toLowerCase()}`
      : `${count} ${label.toLowerCase()}`;

  return (
    <div className="ms" ref={ref}>
      <button
        type="button"
        className="btn ms-trigger"
        data-active={count > 0}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {Icon && <Icon />}
        <span>{summary}</span>
        <ChevronDown className="ms-chev" />
      </button>
      {open && (
        <div className="popover ms-menu" role="listbox">
          <button
            type="button"
            className={`ms-opt${count === 0 ? " is-on" : ""}`}
            onClick={() => onChange([])}
          >
            <span className="ms-check">{count === 0 && <Check />}</span>
            All {label.toLowerCase()}
          </button>
          <div className="ms-sep" />
          {options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                type="button"
                key={o.value}
                className={`ms-opt${on ? " is-on" : ""}`}
                onClick={() => toggle(o.value)}
                role="option"
                aria-selected={on}
              >
                <span className="ms-check">{on && <Check />}</span>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
