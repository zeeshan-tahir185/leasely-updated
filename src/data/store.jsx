import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { buildSeed } from "./seed";
import { isoOf, parseISO } from "../lib/format";

const KEY = "hearth:data:v1";
const DataCtx = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to seed */
  }
  const seeded = buildSeed();
  try {
    localStorage.setItem(KEY, JSON.stringify(seeded));
  } catch {
    /* ignore */
  }
  return seeded;
}

export function DataProvider({ children }) {
  const [data, setData] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (err) {
      // Most likely the browser storage quota is full (uploaded photos are the
      // usual cause). Warn once so changes aren't lost silently.
      if (err && err.name === "QuotaExceededError") {
        console.warn("Hearth: browser storage is full — recent changes may not be saved.");
      }
    }
  }, [data]);

  const actions = useMemo(
    () => ({
      setPaid(paymentId, paid) {
        setData((d) => ({
          ...d,
          payments: d.payments.map((p) =>
            p.id === paymentId
              ? { ...p, paidDate: paid ? isoOf(new Date()) : null }
              : p
          ),
        }));
      },
      addProperty(fields, units = []) {
        const id = `p-${crypto.randomUUID().slice(0, 8)}`;
        const newUnits = units.map((u) => ({
          id: `u-${crypto.randomUUID().slice(0, 8)}`,
          propertyId: id,
          label: u.label,
          unitType: u.unitType || undefined,
          beds: Number(u.beds) || 0,
          baths: Number(u.baths) || 1,
          sqft: Number(u.sqft) || 0,
          marketRent: Number(u.marketRent) || 0,
        }));
        setData((d) => ({
          ...d,
          properties: [...d.properties, { id, ...fields }],
          units: [...d.units, ...newUnits],
        }));
        return id;
      },
      importBuildings(buildings) {
        setData((d) => {
          const properties = [...d.properties];
          const units = [...d.units];
          const tenants = [...d.tenants];
          const leases = [...d.leases];
          const payments = [...d.payments];
          const now = new Date();
          const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const uid = (p) => `${p}-${crypto.randomUUID().slice(0, 8)}`;

          for (const b of buildings) {
            const pid = uid("p");
            properties.push({
              id: pid,
              name: b.name,
              address: b.address || "",
              city: b.city || "",
              type: b.type || undefined,
              plotNumber: b.plotNumber || undefined,
              landlord: b.landlord || undefined,
              floors: b.floors || undefined,
            });
            for (const u of b.units) {
              const unitId = uid("u");
              units.push({
                id: unitId,
                propertyId: pid,
                label: u.label,
                unitType: u.unitType || undefined,
                beds: Number(u.beds) || 0,
                baths: Number(u.baths) || 1,
                sqft: Number(u.sqft) || 0,
                marketRent: Number(u.marketRent) || 0,
              });
              if (u.tenant && u.tenant.name) {
                const tid = uid("t");
                const lid = uid("l");
                const rent = Number(u.tenant.rent) || Number(u.marketRent) || 0;
                const dueDay = Number(u.tenant.dueDay) || 1;
                tenants.push({ id: tid, name: u.tenant.name, email: u.tenant.email || "", phone: u.tenant.phone || "" });
                leases.push({
                  id: lid,
                  unitId,
                  tenantId: tid,
                  rent,
                  dueDay,
                  deposit: rent,
                  startDate: isoOf(now),
                  status: "active",
                });
                payments.push({
                  id: `pay-${lid}-${period}`,
                  leaseId: lid,
                  period,
                  dueDate: `${period}-${String(dueDay).padStart(2, "0")}`,
                  amount: rent,
                  paidDate: null,
                });
              }
            }
          }
          return { ...d, properties, units, tenants, leases, payments };
        });
      },
      updateUnit(unitId, fields) {
        setData((d) => ({
          ...d,
          units: d.units.map((u) => (u.id === unitId ? { ...u, ...fields } : u)),
        }));
      },
      addUnit({ propertyId, label, beds, baths, sqft, marketRent }) {
        const id = `u-${crypto.randomUUID().slice(0, 8)}`;
        setData((d) => ({
          ...d,
          units: [
            ...d.units,
            {
              id,
              propertyId,
              label,
              beds: Number(beds),
              baths: Number(baths),
              sqft: Number(sqft),
              marketRent: Number(marketRent),
            },
          ],
        }));
        return id;
      },
      attachDocument(leaseId, kind, doc) {
        setData((d) => {
          const documents = { ...(d.documents || {}) };
          const entry = { contract: null, cheques: [], ...(documents[leaseId] || {}) };
          if (kind === "contract") entry.contract = doc;
          else entry.cheques = [...entry.cheques, doc];
          documents[leaseId] = entry;
          return { ...d, documents };
        });
      },
      removeDocument(leaseId, kind, index) {
        setData((d) => {
          const documents = { ...(d.documents || {}) };
          const entry = { contract: null, cheques: [], ...(documents[leaseId] || {}) };
          if (kind === "contract") entry.contract = null;
          else entry.cheques = entry.cheques.filter((_, i) => i !== index);
          documents[leaseId] = entry;
          return { ...d, documents };
        });
      },
      addTenantLease({ name, email, phone, unitId, annualRent, dueDay, installments = 1, startDate, endDate }) {
        setData((d) => {
          const tid = `t-${crypto.randomUUID().slice(0, 8)}`;
          const lid = `l-${crypto.randomUUID().slice(0, 8)}`;
          const pad = (n) => String(n).padStart(2, "0");
          // Rent is entered as a yearly rate; store a monthly figure for the rest of the app.
          const yearly = Number(annualRent);
          const monthlyRent = Math.round(yearly / 12);
          const dd = Number(dueDay);
          // A lease can run any length, not just a year. Emit cheques on the chosen
          // cadence (every 12/N months) across the term, pro-rating a short final period.
          const n = Math.max(1, Number(installments) || 1);
          const monthsPer = Math.max(1, Math.round(12 / n));
          const start = startDate ? parseISO(startDate) : new Date();
          const end = endDate
            ? parseISO(endDate)
            : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
          const termMonths = Math.max(
            1,
            (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
          );
          const payments = [];
          for (let m = 0; m < termMonths; m += monthsPer) {
            const dt = new Date(start.getFullYear(), start.getMonth() + m, 1);
            const period = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
            const covered = Math.min(monthsPer, termMonths - m); // short final cheque is pro-rated
            payments.push({
              id: `pay-${lid}-${period}`,
              leaseId: lid,
              period,
              dueDate: `${period}-${pad(dd)}`,
              amount: monthlyRent * covered,
              paidDate: null,
            });
          }
          return {
            ...d,
            tenants: [...d.tenants, { id: tid, name, email, phone }],
            leases: [
              ...d.leases,
              {
                id: lid,
                unitId,
                tenantId: tid,
                rent: monthlyRent,
                dueDay: dd,
                deposit: monthlyRent,
                startDate: isoOf(start),
                endDate: isoOf(end),
                status: "active",
                installments: n,
              },
            ],
            payments: [...d.payments, ...payments],
          };
        });
      },
      resetDemo() {
        const seeded = buildSeed();
        setData(seeded);
      },
    }),
    []
  );

  const value = useMemo(() => ({ data, ...actions }), [data, actions]);
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData() {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
