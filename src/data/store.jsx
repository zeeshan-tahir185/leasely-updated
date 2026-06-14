import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { buildSeed } from "./seed";
import { isoOf } from "../lib/format";

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
      addProperty({ name, address, city }) {
        const id = `p-${crypto.randomUUID().slice(0, 8)}`;
        setData((d) => ({
          ...d,
          properties: [...d.properties, { id, name, address, city }],
        }));
        return id;
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
      addTenantLease({ name, email, phone, propertyId, unitId, rent, dueDay }) {
        setData((d) => {
          const tid = `t-${crypto.randomUUID().slice(0, 8)}`;
          const lid = `l-${crypto.randomUUID().slice(0, 8)}`;
          const now = new Date();
          const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const due = `${period}-${String(dueDay).padStart(2, "0")}`;
          return {
            ...d,
            tenants: [...d.tenants, { id: tid, name, email, phone }],
            leases: [
              ...d.leases,
              {
                id: lid,
                unitId,
                tenantId: tid,
                rent: Number(rent),
                dueDay: Number(dueDay),
                deposit: Number(rent),
                startDate: isoOf(now),
                status: "active",
              },
            ],
            payments: [
              ...d.payments,
              { id: `pay-${lid}-${period}`, leaseId: lid, period, dueDate: due, amount: Number(rent), paidDate: null },
            ],
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
