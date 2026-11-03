// Mobile-only addition to parseAmount (src/lib/money.ts, copied from the web):
// also accepts the Indonesian shorthand people type on a phone.
//   "45rb" / "45 ribu" / "45k" -> 45.000
//   "1,5jt" / "1.5 juta"      -> 1.500.000
// Anything without a suffix goes straight to parseAmount ("45.000", "Rp 1.250.000", "10,50").
import { currencyDecimals, parseAmount } from '@/lib/money';

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  rb: 1_000,
  ribu: 1_000,
  jt: 1_000_000,
  juta: 1_000_000,
};

const MAX_AMOUNT = 9_999_999_999_999_999; // numeric(18,2), same limit as parseAmount

const SUFFIX = /^(.*?\d)\s*(k|rb|ribu|jt|juta)\.?$/;

/** Returns a positive number, or null if it isn't a valid amount. */
export function parseAmountInput(input: string, currency = 'IDR'): number | null {
  const match = input.trim().toLowerCase().match(SUFFIX);
  if (!match) return parseAmount(input, currency);

  // The number before the suffix may have decimals ("1,5jt"), even for IDR,
  // so read it with two decimals and round after multiplying.
  const base = parseAmount(match[1], 'USD');
  if (base === null) return null;
  const factor = 10 ** currencyDecimals(currency);
  const value = Math.round(base * MULTIPLIERS[match[2]] * factor) / factor;
  return value > 0 && value <= MAX_AMOUNT ? value : null;
}
