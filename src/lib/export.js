// CSV export. CSV opens directly in Excel and Google Sheets; we prepend a
// UTF-8 BOM so currency/accented characters render correctly in Excel.
function escapeCell(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Minimal CSV parser: handles quoted fields, escaped quotes, and CRLF.
// Returns an array of objects keyed by the header row.
export function parseCsv(text) {
  text = text.replace(/^﻿/, ""); // drop BOM
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell); cell = "";
    } else if (c === "\r") {
      /* ignore */
    } else if (c === "\n") {
      row.push(cell); rows.push(row); row = []; cell = "";
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
}

export function downloadCsv(filename, headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  const blob = new Blob(["﻿" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
