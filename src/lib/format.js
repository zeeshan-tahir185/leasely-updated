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

export const fmtMoney = (n, cents = false) => (cents ? money2 : money0).format(n || 0);

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
export function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}
