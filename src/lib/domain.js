// Pure selectors over the data shape. Keep pages thin.
import { TODAY, CUR_PERIOD, parseISO, addMonthsKey, periodLabelShort } from "./format";

export const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));

export function paymentStatus(p) {
  if (p.paidDate) return "paid";
  return parseISO(p.dueDate) < TODAY ? "overdue" : "due";
}

// A lease is "ended" once its end date has passed. Open-ended leases (the seed
// leases, which carry no end date) never expire on their own.
export function leaseEnded(lease) {
  return Boolean(lease.endDate) && parseISO(lease.endDate) < TODAY;
}

export const STATUS_LABEL = { paid: "Paid", due: "Due", overdue: "Overdue", vacant: "Vacant", settled: "Paid up", ended: "Ended" };

// Status of a lease for the current month. With cheque schedules a lease can have
// no payment due this month at all; that reads as "settled" (paid up) unless an
// earlier cheque is still unpaid, which is genuine arrears → "overdue".
export function monthStatusFromPays(pays) {
  const cur = pays.find((p) => p.period === CUR_PERIOD);
  if (cur) return { status: paymentStatus(cur), currentPaymentId: cur.id };
  const arrears = pays.some((p) => !p.paidDate && parseISO(p.dueDate) < TODAY);
  return { status: arrears ? "overdue" : "settled", currentPaymentId: undefined };
}

export function indexes(data) {
  return {
    units: byId(data.units),
    properties: byId(data.properties),
    tenants: byId(data.tenants),
    leases: byId(data.leases),
  };
}

// Leases currently occupying a unit: active and not past their end date. An ended
// lease frees its unit, so it drops out of occupancy, revenue, and re-leasing.
export function activeLeases(data) {
  return data.leases.filter((l) => l.status === "active" && !leaseEnded(l));
}

// KPI summary for the current month.
export function summary(data) {
  const ix = indexes(data);
  const active = activeLeases(data);
  const occupiedUnitIds = new Set(active.map((l) => l.unitId));
  const totalUnits = data.units.length;

  let expected = 0;
  let collected = 0;
  let dueCount = 0;
  const overdueLeases = new Set();
  let overdueAmount = 0;

  for (const p of data.payments) {
    const st = paymentStatus(p);
    if (p.period === CUR_PERIOD) {
      expected += p.amount;
      dueCount += 1;
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
    dueCount,
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
// Pass a `propertyId` to scope the trend to a single building.
export function collectionsByMonth(data, n = 6, propertyId = null) {
  const periods = Array.from({ length: n }, (_, i) => addMonthsKey(CUR_PERIOD, -(n - 1 - i)));
  const map = Object.fromEntries(periods.map((p) => [p, { expected: 0, collected: 0 }]));

  let propertyOfLease = null;
  if (propertyId) {
    const ix = indexes(data);
    propertyOfLease = (leaseId) => {
      const lease = ix.leases[leaseId];
      const unit = lease && ix.units[lease.unitId];
      return unit ? unit.propertyId : null;
    };
  }

  for (const p of data.payments) {
    if (!map[p.period]) continue;
    if (propertyId && propertyOfLease(p.leaseId) !== propertyId) continue;
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

// One row per lease for the tenants table. Ended leases stay listed as a record,
// flagged so the table can badge them "Ended" rather than a current-month status.
export function tenantRows(data) {
  const ix = indexes(data);
  const paymentsByLease = {};
  for (const p of data.payments) (paymentsByLease[p.leaseId] ||= []).push(p);

  return data.leases
    .filter((l) => l.status === "active")
    .map((lease) => {
      const tenant = ix.tenants[lease.tenantId];
      const unit = ix.units[lease.unitId];
      const property = ix.properties[unit.propertyId];
      const pays = paymentsByLease[lease.id] || [];
      const ended = leaseEnded(lease);
      const { status, currentPaymentId } = ended
        ? { status: "ended", currentPaymentId: undefined }
        : monthStatusFromPays(pays);
      const balance = pays.filter((p) => !p.paidDate).reduce((s, p) => s + p.amount, 0);
      return {
        leaseId: lease.id,
        tenant,
        unit,
        property,
        rent: lease.rent,
        dueDay: lease.dueDay,
        ended,
        status,
        currentPaymentId,
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
  const active = activeLeases(data);
  // Map unitId -> lease. Built explicitly (not via byId) so the lease keeps its
  // own id, which the current-month payment lookup below relies on.
  const leaseByUnit = {};
  for (const l of active) leaseByUnit[l.unitId] = l;

  return data.properties.map((property) => {
    const units = data.units.filter((u) => u.propertyId === property.id);
    const occupied = units.filter((u) => leaseByUnit[u.id]);
    const monthlyRevenue = occupied.reduce((s, u) => s + leaseByUnit[u.id].rent, 0);

    // `expected` / `dueCount` reflect only the cheques whose period is the current
    // month, so a quarterly (4-cheque) lease counts its full cheque in a due month
    // and nothing in the months between, rather than a divided monthly average.
    let collected = 0;
    let expected = 0;
    let overdue = 0;
    let dueCount = 0;
    for (const u of occupied) {
      const lease = leaseByUnit[u.id];
      const cur = data.payments.find((p) => p.leaseId === lease.id && p.period === CUR_PERIOD);
      if (!cur) continue;
      expected += cur.amount;
      dueCount += 1;
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
      annualRent: monthlyRevenue * 12,
      dueThisMonth: expected,
      dueCount,
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
      const pays = data.payments.filter((p) => p.leaseId === lease.id);
      const { status, currentPaymentId } = monthStatusFromPays(pays);
      return { unit, vacant: false, tenant, lease, status, currentPaymentId };
    });
}
