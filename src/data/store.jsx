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
    } catch {
      /* ignore */
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
