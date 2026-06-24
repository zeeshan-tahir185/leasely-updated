// Spell an AED amount in words for printed receipt / payment vouchers.
const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function under1000(n) {
  let s = "";
  if (n >= 100) { s += ONES[Math.floor(n / 100)] + " hundred"; n %= 100; if (n) s += " "; }
  if (n >= 20) { s += TENS[Math.floor(n / 10)]; n %= 10; if (n) s += "-" + ONES[n]; }
  else if (n > 0) s += ONES[n];
  return s;
}

function toWords(n) {
  if (n === 0) return "zero";
  const scales = [["billion", 1e9], ["million", 1e6], ["thousand", 1e3]];
  let s = "";
  for (const [name, value] of scales) {
    if (n >= value) { s += under1000(Math.floor(n / value)) + " " + name + " "; n %= value; }
  }
  if (n > 0) s += under1000(n);
  return s.trim();
}

export function amountInWords(amount) {
  const dirhams = Math.floor(amount);
  const fils = Math.round((amount - dirhams) * 100);
  let s = `${toWords(dirhams)} dirham${dirhams === 1 ? "" : "s"}`;
  if (fils > 0) s += ` and ${toWords(fils)} fils`;
  return s.charAt(0).toUpperCase() + s.slice(1) + " only";
}
