import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Plus, Upload, Download, FileSpreadsheet, Check } from "lucide-react";
import { useData } from "../data/store";
import { propertyRows } from "../lib/domain";
import { fmtMoney } from "../lib/format";
import { downloadCsv, parseCsv } from "../lib/export";
import { PROJECT_TYPES, UNIT_TYPES, bedsForType } from "../lib/constants";
import Drawer from "../components/Drawer";

const locationLine = (p) => [p.address, p.city].filter(Boolean).join(" · ");

export default function Properties() {
  const { data } = useData();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const rows = propertyRows(data);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="page-sub">{rows.length} buildings across your portfolio.</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setImportOpen(true)}>
            <Upload /> Import
          </button>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus /> Add property
          </button>
        </div>
      </div>

      <div className="prop-grid">
        {rows.map((r) => (
          <Link key={r.property.id} to={`/properties/${r.property.id}`} className="card prop-card">
            <div className="prop-card-head">
              <span className="prop-icon">
                <Building2 strokeWidth={2} />
              </span>
              <div className="prop-head-badges">
                {r.property.type && <span className="chip">{r.property.type}</span>}
                {r.overdue > 0 ? (
                  <span className="badge badge-overdue">{r.overdue} overdue</span>
                ) : (
                  <span className="badge badge-paid">On track</span>
                )}
              </div>
            </div>
            <div className="prop-name">{r.property.name}</div>
            <div className="prop-addr">{locationLine(r.property) || "—"}</div>

            <div className="prop-stats">
              <div className="prop-stat">
                <div className="k">Units</div>
                <div className="v">{r.occupied}/{r.unitCount} leased</div>
              </div>
              <div className="prop-stat">
                <div className="k">Occupancy</div>
                <div className="v">{r.occupancyPct}%</div>
              </div>
              <div className="prop-stat">
                <div className="k">Monthly rent</div>
                <div className="v">{fmtMoney(r.monthlyRevenue)}</div>
              </div>
              <div className="prop-stat">
                <div className="k">Vacant</div>
                <div className="v">{r.vacant || "None"}</div>
              </div>
            </div>

            <div className="prop-foot">
              <div className="prop-collect">
                <span className="t-muted">Collected this month</span>
                <span className="tnum" style={{ fontWeight: 600 }}>
                  {fmtMoney(r.collected)} / {fmtMoney(r.expected)}
                </span>
              </div>
              <div className="progress">
                <i style={{ width: `${r.collectedPct}%` }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <AddPropertyDrawer open={addOpen} onClose={() => setAddOpen(false)} />
      <ImportDrawer open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

/* ---------- add property ---------- */
// Expand the per-type counts into individual units, labelled by floor (101, 102,
// 201…). Studios first, then 1BHK, 2BHK, 3BHK.
function buildUnits(form) {
  if (form.type !== "Building") return [];
  const expanded = [];
  for (const t of UNIT_TYPES) {
    const n = Number(form.counts[t]) || 0;
    for (let i = 0; i < n; i++) expanded.push(t);
  }
  const total = expanded.length;
  if (total === 0) return [];
  const floors = Math.max(1, Number(form.floors) || 1);
  const perFloor = Math.ceil(total / floors);
  return expanded.map((ut, i) => {
    const floor = Math.floor(i / perFloor) + 1;
    const idx = (i % perFloor) + 1;
    const label = floors > 1 ? `${floor}${String(idx).padStart(2, "0")}` : `${idx}`;
    return { label, unitType: ut, beds: bedsForType(ut), baths: Math.max(1, bedsForType(ut)), sqft: 0, marketRent: 0 };
  });
}

function AddPropertyDrawer({ open, onClose }) {
  const { addProperty } = useData();
  const navigate = useNavigate();
  const blank = { name: "", city: "", type: "Building", plotNumber: "", landlord: "", floors: "", counts: { Studio: "", "1BHK": "", "2BHK": "", "3BHK": "", "4BHK": "", Office: "", "Retail Shop": "" } };
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCount = (t, v) => setForm((f) => ({ ...f, counts: { ...f.counts, [t]: v } }));

  const isBuilding = form.type === "Building";
  const autoUnits = buildUnits(form);

  function submit(e) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setError(`${isBuilding ? "Building" : "Project"} name is required.`);
    const fields = {
      name,
      address: "",
      city: form.city.trim(),
      type: form.type,
      plotNumber: form.plotNumber.trim() || undefined,
      landlord: form.landlord.trim() || undefined,
      floors: isBuilding && form.floors ? Number(form.floors) : undefined,
    };
    const id = addProperty(fields, autoUnits);
    setForm(blank);
    setError("");
    onClose();
    navigate(`/properties/${id}`);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add a property"
      subtitle="Capture the building, then its units"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary" form="add-property" type="submit">Create property</button>
        </>
      }
    >
      <form id="add-property" onSubmit={submit} className="form-grid">
        <label className="field full">
          <span>{isBuilding ? "Building name" : "Project name"}</span>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={isBuilding ? "e.g. Marina Heights" : "e.g. Jumeirah Villa 12"} autoFocus />
        </label>
        <label className="field">
          <span>Project type</span>
          <select className="select" value={form.type} onChange={(e) => set("type", e.target.value)}>
            {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Area / location</span>
          <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Dubai Marina" />
        </label>
        <label className="field">
          <span>Plot number</span>
          <input className="input" value={form.plotNumber} onChange={(e) => set("plotNumber", e.target.value)} placeholder="e.g. PLOT-4471" />
        </label>
        <label className="field">
          <span>Landlord name</span>
          <input className="input" value={form.landlord} onChange={(e) => set("landlord", e.target.value)} placeholder="Owner / landlord" />
        </label>

        {isBuilding && (
          <>
            <div className="full divider" style={{ margin: "4px 0" }} />
            <label className="field full">
              <span>Number of floors</span>
              <input className="input" type="number" min="1" value={form.floors} onChange={(e) => set("floors", e.target.value)} placeholder="e.g. 6" />
            </label>
            <div className="field full">
              <span>Units by type {autoUnits.length > 0 && <span className="t-faint">· {autoUnits.length} total</span>}</span>
              <div className="unit-count-grid">
                {UNIT_TYPES.map((t) => (
                  <label className="ucount" key={t}>
                    <span>{t}</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={form.counts[t]}
                      onChange={(e) => setCount(t, e.target.value)}
                      placeholder="0"
                    />
                  </label>
                ))}
              </div>
            </div>
            {autoUnits.length > 0 && (
              <p className="t-faint full" style={{ fontSize: 12, margin: 0 }}>
                {autoUnits.length} units will be created (e.g. {autoUnits.slice(0, 3).map((u) => u.label).join(", ")}
                {autoUnits.length > 3 ? "…" : ""}). You can edit each one after.
              </p>
            )}
          </>
        )}

        {!isBuilding && (
          <p className="t-faint full" style={{ fontSize: 12, margin: 0 }}>
            You'll add units to this {form.type.toLowerCase()} on its page next.
          </p>
        )}

        {error && <p className="form-error full">{error}</p>}
      </form>
    </Drawer>
  );
}

/* ---------- import from spreadsheet ---------- */
// The bulk-import template is buildings only (project type is fixed to Building).
const IMPORT_HEADERS = [
  "Building name", "Area", "Plot number", "Landlord", "Floors",
  "Unit label", "Unit type", "Bedrooms", "Size (sqft)", "Market rent (AED)",
  "Tenant name", "Tenant email", "Tenant phone", "Lease rent (AED)", "Rent due day",
];
const IMPORT_SAMPLE = [
  ["Palm Vista Residences", "Dubai Marina", "PLOT-4471", "Ahmed Al Maktoum", "6", "101", "1BHK", "1", "720", "9000", "Lina Said", "lina@email.com", "+971 50 123 4567", "9000", "1"],
  ["Palm Vista Residences", "Dubai Marina", "PLOT-4471", "Ahmed Al Maktoum", "6", "102", "2BHK", "2", "1080", "14000", "", "", "", "", ""],
  ["Cedar Court", "Jumeirah Village", "PLOT-3380", "Mariam Hassan", "4", "201", "Studio", "0", "520", "6500", "", "", "", "", ""],
];

function rowsToBuildings(records) {
  const map = new Map();
  for (const r of records) {
    const name = (r["Building name"] || "").trim();
    if (!name) continue;
    if (!map.has(name)) {
      map.set(name, {
        name,
        city: r["Area"] || "",
        address: "",
        type: "Building",
        plotNumber: r["Plot number"] || "",
        landlord: r["Landlord"] || "",
        floors: r["Floors"] ? Number(r["Floors"]) : undefined,
        units: [],
      });
    }
    const b = map.get(name);
    const label = (r["Unit label"] || "").trim();
    if (!label) continue;
    const unitType = r["Unit type"] || "";
    const tenantName = (r["Tenant name"] || "").trim();
    b.units.push({
      label,
      unitType,
      beds: r["Bedrooms"] !== "" && r["Bedrooms"] != null ? Number(r["Bedrooms"]) : bedsForType(unitType),
      sqft: Number(r["Size (sqft)"]) || 0,
      marketRent: Number(r["Market rent (AED)"]) || 0,
      tenant: tenantName
        ? {
            name: tenantName,
            email: r["Tenant email"] || "",
            phone: r["Tenant phone"] || "",
            rent: Number(r["Lease rent (AED)"]) || 0,
            dueDay: Number(r["Rent due day"]) || 1,
          }
        : null,
    });
  }
  return [...map.values()];
}

function ImportDrawer({ open, onClose }) {
  const { importBuildings } = useData();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // { buildings, fileName, units, tenants }
  const [error, setError] = useState("");

  function reset() {
    setPreview(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function downloadTemplate() {
    downloadCsv("hearth-import-template.csv", IMPORT_HEADERS, IMPORT_SAMPLE);
  }

  function onFile(file) {
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const records = parseCsv(String(reader.result));
        const buildings = rowsToBuildings(records);
        if (!buildings.length) {
          setPreview(null);
          setError("No buildings found. Make sure the file has a 'Building name' column and at least one row.");
          return;
        }
        const units = buildings.reduce((s, b) => s + b.units.length, 0);
        const tenants = buildings.reduce((s, b) => s + b.units.filter((u) => u.tenant).length, 0);
        setPreview({ buildings, fileName: file.name, units, tenants });
      } catch {
        setError("Could not read that file. Please upload a CSV exported from the template.");
      }
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
  }

  function confirmImport() {
    importBuildings(preview.buildings);
    reset();
    onClose();
    navigate("/properties");
  }

  return (
    <Drawer
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Import buildings"
      subtitle="Bulk-add buildings and their units from a spreadsheet"
      footer={
        preview ? (
          <>
            <button className="btn btn-ghost" type="button" onClick={reset}>Choose another file</button>
            <button className="btn btn-primary" type="button" onClick={confirmImport}>
              Import {preview.buildings.length} building{preview.buildings.length > 1 ? "s" : ""}
            </button>
          </>
        ) : (
          <button className="btn btn-ghost" type="button" onClick={() => { reset(); onClose(); }}>Close</button>
        )
      }
    >
      <ol className="import-steps">
        <li>
          <strong>Download the template</strong> and fill in one row per unit. Building details
          (name, area, plot, landlord, floors) repeat on each of that building's rows.
          <div style={{ marginTop: 10 }}>
            <button className="btn" type="button" onClick={downloadTemplate}>
              <Download /> Download template
            </button>
          </div>
        </li>
        <li>
          <strong>Upload your filled-in file.</strong> Leave tenant columns blank for a vacant unit.
          <div style={{ marginTop: 10 }}>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
            />
            <button className="btn" type="button" onClick={() => fileRef.current?.click()}>
              <FileSpreadsheet /> Choose CSV file
            </button>
          </div>
        </li>
      </ol>

      {error && <p className="form-error" style={{ marginTop: 14 }}>{error}</p>}

      {preview && (
        <div className="import-preview">
          <div className="import-preview-head">
            <Check className="import-ok" />
            <div>
              <div className="tn-name">{preview.fileName}</div>
              <div className="t-muted" style={{ fontSize: 13 }}>
                {preview.buildings.length} building{preview.buildings.length > 1 ? "s" : ""} · {preview.units} unit{preview.units !== 1 ? "s" : ""} · {preview.tenants} tenant{preview.tenants !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <div className="detail-list">
            {preview.buildings.map((b, i) => (
              <div className="detail-row" key={i}>
                <span className="k">{b.name} <span className="t-faint">· {b.type || "—"}</span></span>
                <span className="v">{b.units.length} unit{b.units.length !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  );
}
