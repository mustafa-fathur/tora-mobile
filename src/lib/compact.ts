// Short Indonesian amounts for tight spaces (calendar cells): 45.000 -> "45 rb",
// 1.250.000 -> "1,3 jt", 2.400.000.000 -> "2,4 M". Same output as formatCompact
// (src/lib/money.ts, from the web), but without Intl's compact notation, which
// the phone's JavaScript engine may not support. Tests compare the two.
const UNITS: [number, string][] = [
  [1e12, 'T'],
  [1e9, 'M'],
  [1e6, 'jt'],
  [1e3, 'rb'],
];

/** One decimal at most, Indonesian comma, no trailing ",0". */
function oneDecimal(n: number) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ',');
}

export function compactIdr(amount: number) {
  const n = Math.abs(amount);
  const i = UNITS.findIndex(([size]) => n >= size);
  if (i === -1) return oneDecimal(n);
  let [size, unit] = UNITS[i];
  // 999.950 rounds to "1.000 rb"; Intl moves it up to "1 jt", and so do we.
  if (Math.round((n / size) * 10) / 10 >= 1000 && i > 0) [size, unit] = UNITS[i - 1];
  return `${oneDecimal(n / size)} ${unit}`;
}
