import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

// App-wide confirmation. Mount <ConfirmProvider> once; anywhere below it call
// `const confirm = useConfirm()` then `await confirm({ title, message, ... })`,
// which resolves true/false. Replaces scattered window.confirm() calls with one
// on-brand, accessible dialog.
const ConfirmCtx = createContext(null);

export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setOpts({
      title: options.title || "Are you sure?",
      message: options.message || "",
      confirmLabel: options.confirmLabel || "Confirm",
      cancelLabel: options.cancelLabel || "Cancel",
      tone: options.tone || "danger",
    });
  }), []);

  const settle = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }, []);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {opts && createPortal(
        <ConfirmModal {...opts} onCancel={() => settle(false)} onConfirm={() => settle(true)} />,
        document.body,
      )}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

function ConfirmModal({ title, message, confirmLabel, cancelLabel, tone, onCancel, onConfirm }) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    // Focus Cancel first: the safe default for a destructive action.
    cancelRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); return; }
      if (e.key === "Tab") {
        const els = [cancelRef.current, confirmRef.current].filter(Boolean);
        if (els.length < 2) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="modal-root" role="presentation">
      <div className="modal-backdrop" onClick={onCancel} />
      <div className="confirm" role="alertdialog" aria-modal="true"
        aria-labelledby="confirm-title" aria-describedby={message ? "confirm-msg" : undefined}>
        <span className={`confirm-icon tone-${tone}`}><AlertTriangle strokeWidth={2} /></span>
        <h2 id="confirm-title" className="confirm-title">{title}</h2>
        {message && <p id="confirm-msg" className="confirm-msg">{message}</p>}
        <div className="confirm-actions">
          <button ref={cancelRef} type="button" className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
          <button ref={confirmRef} type="button" className={`btn ${tone === "danger" ? "btn-danger-solid" : "btn-primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
