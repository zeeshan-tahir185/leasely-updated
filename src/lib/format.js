// Money & date formatting + small date math used across the app.

const money0 = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0,
});
const money2 = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Intl joins "AED" to the digits with a no-break space, so a long amount can
// only clip when its box is too narrow (seen on phone-width KPI cards). A plain
// space lets "AED" break onto its own line instead; the digits stay whole.
export const fmtMoney = (n, cents = false) =>
  (cents ? money2 : money0).format(n || 0).replace(/[\u00A0\u202F]/g, " ");

// Compact form for chart axes: AED 9.5k, AED 940
export function fmtMoneyShort(n) {
  if (Math.abs(n) >= 1000) return `AED ${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `AED ${Math.round(n)}`;
}

const pad = (n) => String(n).padStart(2, "0");

export const todayISO = () => isoOf(new Date());
export function isoOf(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parseISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// Today at local midnight — a payment due *today* is not yet overdue.
export const TODAY = (() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
})();

export const CUR_PERIOD = todayISO().slice(0, 7); // "YYYY-MM"

export const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export function addMonthsKey(key, n) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d);
}
export function periodLabelShort(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("default", { month: "short" });
}
export function periodLabelLong(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
}
export function fmtDate(iso) {
  return parseISO(iso).toLocaleDateString("default", { month: "short", day: "numeric" });
}
export function fmtDateLong(iso) {
  return parseISO(iso).toLocaleDateString("default", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
// Reduce a phone number to its national significant digits so that the same
// UAE number written as 050…, 0097150…, +97150…, or 50… all compare equal.
export function normalizePhone(s) {
  let d = (s || "").replace(/\D/g, ""); // digits only
  if (d.startsWith("00")) d = d.slice(2); // 00971… → 971…
  if (d.startsWith("971")) d = d.slice(3); // strip UAE country code
  else if (d.startsWith("0")) d = d.replace(/^0+/, ""); // strip trunk 0 (05x → 5x)
  return d;
}

// True if `query` looks like part of `stored` phone. Matches on raw digit
// substrings (so typing just the last few digits works) and on the national
// form (so 05x / 00971 / +971 all match the same number).
export function phoneMatch(stored, query) {
  const qd = (query || "").replace(/\D/g, "");
  if (qd.length < 3) return false;
  const sd = (stored || "").replace(/\D/g, "");
  const sn = normalizePhone(stored);
  const qn = normalizePhone(query);
  return sd.includes(qd) || sn.includes(qd) || (qn.length >= 3 && sn.includes(qn));
}

export function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}
