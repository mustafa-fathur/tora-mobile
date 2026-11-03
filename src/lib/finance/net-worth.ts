// Ported from tora web: the net worth block of src/app/(app)/accounts/page.tsx @ dea6031.
// Net worth counts every account marked "include in net worth" (archived ones too).
// Foreign currencies convert with the rates set on the web (Settings).
import { ACCOUNT_CLASSES } from '@/lib/finance/accounts';
import { sumInBase, type Rates } from '@/lib/finance/fx';
import type { Account, AccountClass } from '@/lib/finance/types';

type AccountLike = Pick<Account, 'balance' | 'currency' | 'class' | 'include_in_net_worth' | 'is_archived'>;

export function netWorthSummary<A extends AccountLike>(accounts: A[], rates: Rates) {
  const counted = accounts.filter((a) => a.include_in_net_worth);
  const sum = (list: A[]) => sumInBase(list.map((a) => ({ amount: a.balance, currency: a.currency })), rates);
  const byClass = (c: AccountClass) => sum(counted.filter((a) => a.class === c));
  const cash = byClass('cash');
  const investment = byClass('investment');
  const debts = byClass('liability');

  const active = accounts.filter((a) => !a.is_archived);
  const sections = ACCOUNT_CLASSES.map((section) => {
    const items = active.filter((a) => a.class === section.value);
    return { ...section, items, subtotal: sum(items.filter((a) => a.include_in_net_worth)).total };
  }).filter((s) => s.items.length > 0);

  return {
    netWorth: Math.round((cash.total + investment.total + debts.total) * 100) / 100,
    cash: cash.total,
    investment: investment.total,
    debts: debts.total,
    missing: [...new Set([...cash.missing, ...investment.missing, ...debts.missing])],
    sections,
    archived: accounts.filter((a) => a.is_archived),
  };
}
