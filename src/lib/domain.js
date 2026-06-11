// Pure selectors over the data shape. Keep pages thin.
import { TODAY, CUR_PERIOD, parseISO, addMonthsKey, periodLabelShort } from "./format";

export const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));

export function paymentStatus(p) {
  if (p.paidDate) return "paid";
  return parseISO(p.dueDate) < TODAY ? "overdue" : "due";
}

export const STATUS_LABEL = { paid: "Paid", due: "Due", overdue: "Overdue", vacant: "Vacant" };

export function indexes(data) {
  return {
    units: byId(data.units),
    properties: byId(data.properties),
    tenants: byId(data.tenants),
    leases: byId(data.leases),
  };
}

export function activeLeases(data) {
  return data.leases.filter((l) => l.status === "active");
}

// KPI summary for the current month.
export function summary(data) {
  const ix = indexes(data);
  const active = activeLeases(data);
  const occupiedUnitIds = new Set(active.map((l) => l.unitId));
  const totalUnits = data.units.length;

  let expected = 0;
  let collected = 0;
  const overdueLeases = new Set();
  let overdueAmount = 0;

  for (const p of data.payments) {
    const st = paymentStatus(p);
    if (p.period === CUR_PERIOD) {
      expected += p.amount;
      if (st === "paid") collected += p.amount;
    }
    if (st === "overdue") {
      overdueLeases.add(p.leaseId);
      overdueAmount += p.amount;
    }
  }

  return {
    expected,
    collected,
    outstanding: expected - collected,
    collectedPct: expected ? Math.round((collected / expected) * 100) : 0,
    overdueCount: overdueLeases.size,
    overdueAmount,
    occupiedUnits: occupiedUnitIds.size,
    totalUnits,
    vacantUnits: totalUnits - occupiedUnitIds.size,
    occupancyPct: totalUnits ? Math.round((occupiedUnitIds.size / totalUnits) * 100) : 0,
    activeLeases: active.length,
    monthlyRevenue: active.reduce((s, l) => s + l.rent, 0),
    ix,
  };
}

// Expected vs collected for the trailing `n` months (oldest first).
export function collectionsByMonth(data, n = 6) {
  const periods = Array.from({ length: n }, (_, i) => addMonthsKey(CUR_PERIOD, -(n - 1 - i)));
  const map = Object.fromEntries(periods.map((p) => [p, { expected: 0, collected: 0 }]));
  for (const p of data.payments) {
    if (!map[p.period]) continue;
    map[p.period].expected += p.amount;
    if (p.paidDate) map[p.period].collected += p.amount;
  }
  return periods.map((period) => ({
    period,
    label: periodLabelShort(period),
    isCurrent: period === CUR_PERIOD,
    ...map[period],
  }));
}

// One row per active lease, joined for the tenants table.
export function tenantRows(data) {
  const ix = indexes(data);
  const paymentsByLease = {};
  for (const p of data.payments) (paymentsByLease[p.leaseId] ||= []).push(p);

  return activeLeases(data).map((lease) => {
    const tenant = ix.tenants[lease.tenantId];
    const unit = ix.units[lease.unitId];
    const property = ix.properties[unit.propertyId];
    const pays = paymentsByLease[lease.id] || [];
    const current = pays.find((p) => p.period === CUR_PERIOD);
    const balance = pays.filter((p) => !p.paidDate).reduce((s, p) => s + p.amount, 0);
    return {
      leaseId: lease.id,
      tenant,
      unit,
      property,
      rent: lease.rent,
      dueDay: lease.dueDay,
      status: current ? paymentStatus(current) : "due",
      currentPaymentId: current?.id,
      balance,
    };
  });
}

// Payment ledger rows joined with tenant/unit, newest first within a period.
export function paymentRows(data, { period = CUR_PERIOD } = {}) {
  const ix = indexes(data);
  return data.payments
    .filter((p) => p.period === period)
    .map((p) => {
      const lease = ix.leases[p.leaseId];
      const tenant = ix.tenants[lease.tenantId];
      const unit = ix.units[lease.unitId];
      const property = ix.properties[unit.propertyId];
      return { ...p, status: paymentStatus(p), tenant, unit, property };
    })
    .sort((a, b) => {
      const order = { overdue: 0, due: 1, paid: 2 };
      return order[a.status] - order[b.status] || a.dueDate.localeCompare(b.dueDate);
    });
}

export function availablePeriods(data, n = 6) {
  return Array.from({ length: n }, (_, i) => addMonthsKey(CUR_PERIOD, -(n - 1 - i))).reverse();
}

// Per-property rollup for the properties grid.
export function propertyRows(data) {
  const ix = indexes(data);
  const active = activeLeases(data);
  const leaseByUnit = byId(active.map((l) => ({ id: l.unitId, ...l })));

  return data.properties.map((property) => {
    const units = data.units.filter((u) => u.propertyId === property.id);
    const occupied = units.filter((u) => leaseByUnit[u.id]);
    const monthlyRevenue = occupied.reduce((s, u) => s + leaseByUnit[u.id].rent, 0);

    let collected = 0;
    let expected = 0;
    let overdue = 0;
    for (const u of occupied) {
      const lease = leaseByUnit[u.id];
      const cur = data.payments.find((p) => p.leaseId === lease.id && p.period === CUR_PERIOD);
      if (!cur) continue;
      expected += cur.amount;
      const st = paymentStatus(cur);
      if (st === "paid") collected += cur.amount;
      if (st === "overdue") overdue += 1;
    }
    return {
      property,
      unitCount: units.length,
      occupied: occupied.length,
      vacant: units.length - occupied.length,
      occupancyPct: units.length ? Math.round((occupied.length / units.length) * 100) : 0,
      monthlyRevenue,
      collected,
      expected,
      collectedPct: expected ? Math.round((collected / expected) * 100) : 0,
      overdue,
    };
  });
}

// Units of one property with their lease/tenant/status (for property detail).
export function unitRows(data, propertyId) {
  const ix = indexes(data);
  const active = activeLeases(data);
  return data.units
    .filter((u) => u.propertyId === propertyId)
    .map((unit) => {
      const lease = active.find((l) => l.unitId === unit.id);
      if (!lease) return { unit, vacant: true, status: "vacant" };
      const tenant = ix.tenants[lease.tenantId];
      const cur = data.payments.find((p) => p.leaseId === lease.id && p.period === CUR_PERIOD);
      return {
        unit,
        vacant: false,
        tenant,
        lease,
        status: cur ? paymentStatus(cur) : "due",
        currentPaymentId: cur?.id,
      };
    });
}
