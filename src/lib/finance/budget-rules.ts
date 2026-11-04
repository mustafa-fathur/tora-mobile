// Ported from tora web: src/app/(app)/budgets/actions.ts @ dea6031 (setBudget).
// Empty or 0 clears the budget; anything else must be a valid IDR amount.
// Mobile difference: also accepts the shorthand 45rb / 1,5jt.
import { parseAmountInput } from '@/lib/amount-input';

export function budgetAmount(raw: string): { ok: true; amount: number | null } | { ok: false; message: string } {
  const s = raw.trim();
  if (s === '' || s === '0') return { ok: true, amount: null }; // clear
  const amount = parseAmountInput(s, 'IDR');
  if (amount === null) return { ok: false, message: 'Enter a valid amount, or leave it empty to remove the budget.' };
  return { ok: true, amount };
}
