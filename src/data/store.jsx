import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { buildSeed } from "./seed";
import { todayISO, isoOf, parseISO } from "../lib/format";
import { caps } from "../lib/rbac";

const KEY = "hearth:db:v2";
const SCHEMA = 2;
const DataCtx = createContext(null);

let _seq = 0;
const newId = (p = "id") => `${p}-${Date.now().toString(36)}${(_seq++).toString(36)}`;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.schema === SCHEMA) return parsed;
    }
  } catch {
    /* fall through to a fresh seed */
  }
  const seeded = buildSeed();
  try {
    localStorage.setItem(KEY, JSON.stringify(seeded));
  } catch {
    /* ignore quota errors */
  }
  return seeded;
}

export function DataProvider({ children }) {
  const [db, setDb] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (err) {
      if (err && err.name === "QuotaExceededError") {
        console.warn("Hearth: browser storage is full — recent changes may not be saved.");
      }
    }
  }, [db]);

  // ---- generic collection CRUD ----------------------------------------------
  const add = useCallback((entity, record) => {
    const row = { id: record.id || newId(entity.slice(0, 2)), ...record };
    setDb((d) => ({ ...d, [entity]: [...(d[entity] || []), row] }));
    return row.id;
  }, []);

  const update = useCallback((entity, id, patch) => {
    setDb((d) => ({
      ...d,
      [entity]: d[entity].map((r) => (r.id === id ? { ...r, ...(typeof patch === "function" ? patch(r) : patch) } : r)),
    }));
  }, []);

  const remove = useCallback((entity, id) => {
    setDb((d) => ({ ...d, [entity]: d[entity].filter((r) => r.id !== id) }));
  }, []);

  // ---- context switches ------------------------------------------------------
  const setActiveCompany = useCallback((companyId) => setDb((d) => {
    // when switching company, land on a user that belongs to it
    const user = d.users.find((u) => u.companyId === companyId);
    return { ...d, activeCompanyId: companyId, currentUserId: user ? user.id : d.currentUserId };
  }), []);

  const setCurrentUser = useCallback((userId) => setDb((d) => ({ ...d, currentUserId: userId })), []);

  const updateSettings = useCallback((patch) => setDb((d) => ({ ...d, settings: { ...d.settings, ...patch } })), []);

  // ---- domain action: cheque status w/ side effects -------------------------
  const setChequeStatus = useCallback((chequeId, status) => {
    setDb((d) => {
      const cheque = d.cheques.find((c) => c.id === chequeId);
      if (!cheque) return d;
      const cleared = status === "cleared";
      const cheques = d.cheques.map((c) =>
        c.id === chequeId ? { ...c, status, clearedDate: cleared ? todayISO() : undefined } : c
      );
      let receipts = d.receipts;
      // Clearing an incoming cheque books a rent receipt; un-clearing removes it.
      if (cheque.kind === "in") {
        const existing = d.receipts.find((r) => r.chequeId === chequeId);
        if (cleared && !existing) {
          receipts = [...d.receipts, {
            id: newId("rcp"), companyId: cheque.companyId, towerId: cheque.towerId,
            date: todayISO(), contactId: cheque.contactId, amount: cheque.amount,
            method: "cheque", chequeId, against: "rent", contractId: cheque.contractId,
            voucherNo: `RV-${Math.floor(8000 + Math.random() * 1900)}`,
            isNew: true, // freshly auto-created — highlighted in Receipts until opened
            createdTs: Date.now(), // sort newest-created first among same-date receipts
          }];
        } else if (!cleared && existing) {
          receipts = d.receipts.filter((r) => r.chequeId !== chequeId);
        }
      }
      return { ...d, cheques, receipts };
    });
  }, []);

  // Replace a bounced cheque with a fresh one due on a new date.
  const replaceCheque = useCallback((chequeId, { dueDate, chequeNo, bankName }) => {
    setDb((d) => {
      const old = d.cheques.find((c) => c.id === chequeId);
      if (!old) return d;
      const replacement = {
        ...old, id: newId("chq"), status: "pending", clearedDate: undefined,
        dueDate: dueDate || old.dueDate, chequeNo: chequeNo || old.chequeNo,
        bankName: bankName || old.bankName, replacesId: chequeId,
      };
      const cheques = d.cheques.map((c) => (c.id === chequeId ? { ...c, status: "replaced", replacedById: replacement.id } : c));
      return { ...d, cheques: [...cheques, replacement] };
    });
  }, []);

  // Generate the installment cheques for a contract term, due on day 5 each cycle.
  function chequesForContract(d, cid, { towerId, tenantId, annualRent, installments, startDate, endDate }) {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const termMonths = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
    const n = Math.max(1, Number(installments) || 1);
    const monthsPer = Math.max(1, Math.round(12 / n));
    const perCheque = Math.round(Number(annualRent) / n);
    const banks = ["Emirates NBD", "ADCB", "Mashreq", "FAB", "DIB"];
    const out = [];
    for (let m = 0, k = 0; m < termMonths; m += monthsPer, k++) {
      const dt = new Date(start.getFullYear(), start.getMonth() + m, 5);
      out.push({
        id: newId("chq"), companyId: d.activeCompanyId, towerId, kind: "in", contractId: cid,
        contactId: tenantId, amount: perCheque, dueDate: isoOf(dt),
        bankName: banks[k % banks.length], chequeNo: String(100000 + Math.floor(Math.random() * 899999)),
        status: "pending",
      });
    }
    return out;
  }

  const createContract = useCallback((input) => {
    setDb((d) => {
      const cid = newId("ct");
      const contract = {
        id: cid, companyId: d.activeCompanyId, towerId: input.towerId, unitId: input.unitId,
        tenantId: input.tenantId, contractNo: `WW-${1100 + d.contracts.length}`,
        type: input.type || "Residential", annualRent: Number(input.annualRent),
        installments: Math.max(1, Number(input.installments) || 1), startDate: input.startDate,
        endDate: input.endDate, deposit: Number(input.deposit) || 0, commission: Number(input.commission) || 0,
        status: "active",
      };
      const cheques = chequesForContract(d, cid, contract);
      return { ...d, contracts: [...d.contracts, contract], cheques: [...d.cheques, ...cheques] };
    });
  }, []);

  // Renew a contract for another year at the given rent, emitting fresh cheques.
  const renewContract = useCallback((id, { annualRent } = {}) => {
    setDb((d) => {
      const c = d.contracts.find((x) => x.id === id);
      if (!c) return d;
      const oldEnd = parseISO(c.endDate);
      const newStart = isoOf(oldEnd);
      const newEnd = isoOf(new Date(oldEnd.getFullYear() + 1, oldEnd.getMonth(), oldEnd.getDate()));
      const rent = Number(annualRent) || c.annualRent;
      const updated = { ...c, startDate: newStart, endDate: newEnd, annualRent: rent, status: "active" };
      const cheques = chequesForContract(d, id, updated);
      return {
        ...d,
        contracts: d.contracts.map((x) => (x.id === id ? updated : x)),
        cheques: [...d.cheques, ...cheques],
      };
    });
  }, []);

  // Hard-delete a contract and everything that hangs off it (its cheques and any
  // booked receipts), so nothing is left orphaned in the ledger.
  const deleteContract = useCallback((id) => {
    setDb((d) => ({
      ...d,
      contracts: d.contracts.filter((c) => c.id !== id),
      cheques: d.cheques.filter((c) => c.contractId !== id),
      receipts: d.receipts.filter((r) => r.contractId !== id),
    }));
  }, []);

  // Delete a cheque and keep the ledger consistent: drop any rent receipt it
  // booked, and heal replacement links (an original whose replacement is removed
  // goes back to bounced; a stale replacesId pointer is cleared).
  const deleteCheque = useCallback((id) => {
    setDb((d) => ({
      ...d,
      cheques: d.cheques
        .filter((c) => c.id !== id)
        .map((c) => {
          let next = c;
          if (c.replacedById === id) next = { ...next, replacedById: undefined, status: c.status === "replaced" ? "bounced" : c.status };
          if (c.replacesId === id) next = { ...next, replacesId: undefined };
          return next;
        }),
      receipts: d.receipts.filter((r) => r.chequeId !== id),
    }));
  }, []);

  // Pay/unpay a supplier bill. Paying books a payment voucher (money out) linked
  // back via billId so the P&L reflects it; unpaying removes that voucher.
  const setBillPaid = useCallback((id, paid, { method = "bank" } = {}) => {
    setDb((d) => {
      const bill = d.bills.find((b) => b.id === id);
      if (!bill) return d;
      if (paid) {
        if (bill.status === "paid") return d;
        const voucher = {
          id: newId("pv"), companyId: bill.companyId, towerId: bill.towerId, date: todayISO(),
          payeeId: bill.supplierId, amount: bill.amount, category: bill.category,
          method, ref: bill.billNo, voucherNo: `PV-${Math.floor(9000 + Math.random() * 900)}`, billId: id,
        };
        return {
          ...d,
          bills: d.bills.map((b) => (b.id === id ? { ...b, status: "paid", paidDate: todayISO() } : b)),
          vouchers: [...d.vouchers, voucher],
        };
      }
      return {
        ...d,
        bills: d.bills.map((b) => (b.id === id ? { ...b, status: "unpaid", paidDate: undefined } : b)),
        vouchers: d.vouchers.filter((v) => v.billId !== id),
      };
    });
  }, []);

  // Delete a bill and the payment voucher it booked, so the ledger stays in sync.
  const deleteBill = useCallback((id) => {
    setDb((d) => ({
      ...d,
      bills: d.bills.filter((b) => b.id !== id),
      vouchers: d.vouchers.filter((v) => v.billId !== id),
    }));
  }, []);

  // Record a meter reading: consumption = new − previous, charged at the meter's
  // rate, and the meter's current reading advances. New charges start uncollected.
  const recordReading = useCallback((meterId, { reading, date } = {}) => {
    setDb((d) => {
      const meter = d.meters.find((m) => m.id === meterId);
      if (!meter) return d;
      const value = Number(reading);
      const units = Math.max(0, value - (meter.lastReading || 0));
      const amount = Math.round(units * (meter.rate || 0));
      const rd = { id: newId("rd"), meterId, date: date || todayISO(), reading: value, units, amount, collected: false };
      return {
        ...d,
        readings: [...d.readings, rd],
        meters: d.meters.map((m) => (m.id === meterId ? { ...m, lastReading: value } : m)),
      };
    });
  }, []);

  // Delete a meter and its whole reading history.
  const deleteMeter = useCallback((id) => {
    setDb((d) => ({
      ...d,
      meters: d.meters.filter((m) => m.id !== id),
      readings: d.readings.filter((r) => r.meterId !== id),
    }));
  }, []);

  // Generate the payroll run for a period: one line per active employee that
  // doesn't already have one, with allowances/deductions off basic salary.
  const runPayroll = useCallback((period) => {
    setDb((d) => {
      const cid = d.activeCompanyId;
      const have = new Set(d.payroll.filter((p) => p.period === period && p.companyId === cid).map((p) => p.employeeId));
      const additions = d.employees
        .filter((e) => e.companyId === cid && (e.status || "active") === "active" && !have.has(e.id))
        .map((e) => {
          const allowances = Math.round(e.salary * 0.15);
          const deductions = Math.round(e.salary * 0.05);
          return { id: newId("pr"), companyId: cid, employeeId: e.id, period, basic: e.salary, allowances, deductions, net: e.salary + allowances - deductions, status: "pending" };
        });
      return additions.length ? { ...d, payroll: [...d.payroll, ...additions] } : d;
    });
  }, []);

  // Mark every payroll line in a period paid (or back to pending) for the active company.
  const setPayrollPaid = useCallback((period, paid) => {
    setDb((d) => ({
      ...d,
      payroll: d.payroll.map((p) => (p.period === period && p.companyId === d.activeCompanyId ? { ...p, status: paid ? "paid" : "pending" } : p)),
    }));
  }, []);

  // Delete an employee and their payroll history.
  const deleteEmployee = useCallback((id) => {
    setDb((d) => ({
      ...d,
      employees: d.employees.filter((e) => e.id !== id),
      payroll: d.payroll.filter((p) => p.employeeId !== id),
    }));
  }, []);

  const resetDemo = useCallback(() => setDb(buildSeed()), []);

  const actions = useMemo(() => ({
    add, update, remove, setActiveCompany, setCurrentUser, updateSettings,
    setChequeStatus, replaceCheque, createContract, renewContract, deleteContract, deleteCheque,
    setBillPaid, deleteBill, recordReading, deleteMeter, runPayroll, setPayrollPaid, deleteEmployee, resetDemo,
  }), [add, update, remove, setActiveCompany, setCurrentUser, updateSettings, setChequeStatus, replaceCheque, createContract, renewContract, deleteContract, deleteCheque, setBillPaid, deleteBill, recordReading, deleteMeter, runPayroll, setPayrollPaid, deleteEmployee, resetDemo]);

  const value = useMemo(() => {
    const company = db.companies.find((c) => c.id === db.activeCompanyId) || db.companies[0];
    const user = db.users.find((u) => u.id === db.currentUserId) || db.users[0];
    const role = user?.role || "employee";
    return { db, companyId: company.id, company, user, role, can: caps(role), ...actions };
  }, [db, actions]);

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData() {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
