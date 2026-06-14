import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Full-screen image preview. Closes on backdrop click or Escape.
export default function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  if (!src) return null;

  return createPortal(
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox-close icon-btn" onClick={onClose} aria-label="Close preview">
        <X />
      </button>
      <img src={src} alt={alt || "Document preview"} onClick={(e) => e.stopPropagation()} />
    </div>,
    document.body
  );
}
