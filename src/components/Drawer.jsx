import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function Drawer({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="drawer-root">
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header className="drawer-head">
          <div>
            <h2 className="t-h2">{title}</h2>
            {subtitle && <p className="t-muted" style={{ marginTop: 2 }}>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-foot">{footer}</footer>}
      </aside>
    </div>,
    document.body
  );
}
