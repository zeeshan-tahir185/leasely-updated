import { useId, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

// Click-or-drag upload area. Emits the chosen File[] to the parent, which owns
// compression and storage. Purely presentational beyond drag state.
export default function Dropzone({ onFiles, accept = "image/*", multiple = false, hint, busy }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  function handleFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(multiple ? files : [files[0]]);
  }

  return (
    <div
      className={`dropzone${over ? " is-over" : ""}${busy ? " is-busy" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!busy) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !busy && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload image"
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !busy) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <UploadCloud className="dropzone-icon" />
      <div className="dropzone-text">
        <strong>{busy ? "Uploading…" : "Drop a photo or click to upload"}</strong>
        {hint && <span className="t-faint">{hint}</span>}
      </div>
    </div>
  );
}
