// Curated demo dataset. Built relative to "today" so the dashboard and
// charts always show a live current month plus five months of history.
import { CUR_PERIOD, addMonthsKey, isoOf, parseISO } from "../lib/format";

const properties = [
  { id: "p-maple", name: "Marina Heights", address: "Marina Walk, Tower 2", city: "Dubai Marina" },
  { id: "p-birch", name: "Boulevard Residences", address: "Sheikh Mohammed bin Rashid Blvd", city: "Downtown Dubai" },
  { id: "p-harbor", name: "Canal Court Townhomes", address: "Marasi Drive", city: "Business Bay" },
];

const units = [
  { id: "u-m1a", propertyId: "p-maple", label: "1A", beds: 1, baths: 1, sqft: 720, marketRent: 9000 },
  { id: "u-m1b", propertyId: "p-maple", label: "1B", beds: 1, baths: 1, sqft: 740, marketRent: 9500 },
  { id: "u-m2a", propertyId: "p-maple", label: "2A", beds: 2, baths: 2, sqft: 1080, marketRent: 14000 },
  { id: "u-m2b", propertyId: "p-maple", label: "2B", beds: 2, baths: 2, sqft: 1080, marketRent: 14000 },
  { id: "u-m3a", propertyId: "p-maple", label: "3A", beds: 2, baths: 2, sqft: 1180, marketRent: 15500 },
  { id: "u-b101", propertyId: "p-birch", label: "101", beds: 0, baths: 1, sqft: 540, marketRent: 6800 },
  { id: "u-b102", propertyId: "p-birch", label: "102", beds: 1, baths: 1, sqft: 780, marketRent: 10500 },
  { id: "u-b201", propertyId: "p-birch", label: "201", beds: 1, baths: 1, sqft: 800, marketRent: 10800 },
  { id: "u-b202", propertyId: "p-birch", label: "202", beds: 2, baths: 2, sqft: 1150, marketRent: 16500 },
  { id: "u-h1", propertyId: "p-harbor", label: "TH-1", beds: 3, baths: 3, sqft: 2100, marketRent: 22000 },
  { id: "u-h2", propertyId: "p-harbor", label: "TH-2", beds: 3, baths: 3, sqft: 2100, marketRent: 22000 },
  { id: "u-h3", propertyId: "p-harbor", label: "TH-3", beds: 2, baths: 2, sqft: 1650, marketRent: 17000 },
  { id: "u-h4", propertyId: "p-harbor", label: "TH-4", beds: 2, baths: 2, sqft: 1650, marketRent: 17000 },
  { id: "u-h5", propertyId: "p-harbor", label: "TH-5", beds: 3, baths: 3.5, sqft: 2400, marketRent: 25000 },
];

// One row per active lease. `juneStatus` controls the current-month picture:
// paid → collected; overdue → unpaid & due day already passed; due → upcoming.
// `since` is how many months ago the lease started (caps the payment history,
// so earlier months show fewer leases → a rising collections trend).
const leaseSpec = [
  { unit: "u-m1a", name: "Maya Alvarez", email: "maya.alvarez@gmail.com", phone: "+971 50 555 0148", rent: 9000, dueDay: 1, since: 9, june: "paid" },
  { unit: "u-m1b", name: "Daniel Okafor", email: "d.okafor@outlook.com", phone: "+971 52 555 0192", rent: 9500, dueDay: 1, since: 7, june: "overdue" },
  { unit: "u-m2a", name: "Priya Nair", email: "priya.nair@gmail.com", phone: "+971 50 555 0173", rent: 14000, dueDay: 1, since: 14, june: "paid" },
  { unit: "u-m2b", name: "Omar & Lina Haddad", email: "haddad.home@gmail.com", phone: "+971 55 555 0119", rent: 14000, dueDay: 5, since: 5, june: "paid" },
  // u-m3a vacant
  { unit: "u-b101", name: "Jordan Lee", email: "jordan.lee@gmail.com", phone: "+971 56 555 0204", rent: 6800, dueDay: 1, since: 3, june: "overdue" },
  { unit: "u-b102", name: "Sofia Romano", email: "sofia.romano@gmail.com", phone: "+971 50 555 0166", rent: 10500, dueDay: 1, since: 11, june: "paid" },
  { unit: "u-b201", name: "Marcus Webb", email: "marcus.webb@gmail.com", phone: "+971 52 555 0131", rent: 10800, dueDay: 15, since: 6, june: "due" },
  // u-b202 vacant
  { unit: "u-h1", name: "The Al-Rashid Family", email: "alrashid.fam@gmail.com", phone: "+971 50 555 0177", rent: 22000, dueDay: 1, since: 18, june: "paid" },
  { unit: "u-h2", name: "Hannah Schmidt", email: "h.schmidt@gmail.com", phone: "+971 55 555 0155", rent: 22000, dueDay: 5, since: 4, june: "overdue" },
  { unit: "u-h3", name: "Ravi Patel", email: "ravi.patel@gmail.com", phone: "+971 50 555 0188", rent: 17000, dueDay: 1, since: 8, june: "paid" },
  { unit: "u-h4", name: "Grace Kim", email: "grace.kim@gmail.com", phone: "+971 56 555 0142", rent: 17000, dueDay: 15, since: 2, june: "due" },
  { unit: "u-h5", name: "Oliver Bennett", email: "oliver.b@gmail.com", phone: "+971 50 555 0109", rent: 25000, dueDay: 1, since: 13, june: "paid" },
];

function pad(n) {
  return String(n).padStart(2, "0");
}

export function buildSeed() {
  const tenants = [];
  const leases = [];
  const payments = [];

  // Last 6 periods, oldest first, ending on the current month.
  const periods = Array.from({ length: 6 }, (_, i) => addMonthsKey(CUR_PERIOD, -(5 - i)));

  leaseSpec.forEach((s, i) => {
    const tenantId = `t-${i + 1}`;
    const leaseId = `l-${i + 1}`;
    tenants.push({ id: tenantId, name: s.name, email: s.email, phone: s.phone });

    const startPeriod = addMonthsKey(CUR_PERIOD, -s.since);
    const startISO = `${startPeriod}-${pad(s.dueDay)}`;
    leases.push({
      id: leaseId,
      unitId: s.unit,
      tenantId,
      rent: s.rent,
      dueDay: s.dueDay,
      deposit: s.rent,
      startDate: startISO,
      status: "active",
    });

    periods.forEach((period) => {
      if (period < startPeriod) return; // lease hadn't begun yet
      const dueDate = `${period}-${pad(s.dueDay)}`;
      const isCurrent = period === CUR_PERIOD;
      let paidDate = null;

      if (!isCurrent) {
        // History: paid on or near the due date. One late payment for texture.
        const d = parseISO(dueDate);
        const lateBy = i % 4 === 0 ? 3 : i % 3 === 0 ? -1 : 1;
        d.setDate(d.getDate() + lateBy);
        paidDate = isoOf(d);
      } else if (s.june === "paid") {
        const d = parseISO(dueDate);
        d.setDate(d.getDate() + (i % 3));
        paidDate = isoOf(d);
      }
      // overdue / due → paidDate stays null; status derives from dueDate vs today.

      payments.push({
        id: `pay-${leaseId}-${period}`,
        leaseId,
        period,
        dueDate,
        amount: s.rent,
        paidDate,
      });
    });
  });

  return { properties, units, tenants, leases, payments };
}
