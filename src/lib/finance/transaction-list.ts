// Mobile helpers for the Transactions list and the edit sheet. The rules follow
// tora web's src/components/transactions/transaction-list.tsx and
// transaction-form-dialog.tsx @ dea6031 (titles, subtitles, day totals, initial form).
import { dailyTotals } from '@/lib/finance/calendar';
import type { CashflowContext } from '@/lib/finance/cashflow';
import type { Mode } from '@/lib/finance/transaction-rows';
import type { Account, Category, Transaction } from '@/lib/finance/types';

export type DaySection = { date: string; net: number; data: Transaction[] };

/** Rows grouped by day (newest first, as the query returns them) with each day's net in IDR. */
export function dayGroups(rows: Transaction[], ctx: CashflowContext): DaySection[] {
  const totals = dailyTotals(rows, ctx);
  const sections: DaySection[] = [];
  for (const t of rows) {
    let last = sections.at(-1);
    if (!last || last.date !== t.date) {
      const day = totals[t.date];
      last = { date: t.date, net: Math.round((day.income - day.spending) * 100) / 100, data: [] };
      sections.push(last);
    }
    last.data.push(t);
  }
  return sections;
}

export type RowLook = {
  title: string;
  subtitle: string;
  icon: 'transfer' | 'adjustment' | string; // otherwise the group's emoji, or "•"
  tone: 'income' | 'muted' | 'default';
};

/** Title, subtitle, icon and colour for one row (same wording as the web). */
export function describeRow(
  t: Transaction,
  accountById: Map<string, Pick<Account, 'name'>>,
  categoryById: Map<string, Category>,
): RowLook {
  const account = accountById.get(t.account_id);
  const category = t.category_id ? categoryById.get(t.category_id) : undefined;
  const group = category?.parent_id ? categoryById.get(category.parent_id) : category;
  const title = t.description || category?.name || (t.kind === 'adjustment' ? 'Balance update' : 'Uncategorized');
  const subtitle = [
    t.time?.slice(0, 5),
    t.kind === 'transfer'
      ? 'Transfer'
      : t.kind === 'adjustment'
        ? 'Balance update'
        : t.description
          ? (category?.name ?? 'Uncategorized')
          : null,
    account?.name,
  ]
    .filter(Boolean)
    .join(' · ');
  const icon = t.kind === 'transfer' ? 'transfer' : t.kind === 'adjustment' ? 'adjustment' : (group?.icon ?? '•');
  const tone = t.kind !== 'regular' ? 'muted' : Number(t.amount) > 0 ? 'income' : 'default';
  return { title, subtitle, icon, tone };
}

export type FormValues = {
  mode: Mode;
  amount: string;
  toAmount: string;
  accountId: string;
  toAccountId: string;
  categoryId: string | null;
  refund: boolean;
  date: string;
  time: string | null;
  description: string;
};

// Amount as people type it: 1600000 -> "1.600.000", 10.5 -> "10,5" (parseAmount reads both back).
function plain(n: number | string) {
  const [int, dec] = String(Math.abs(Number(n))).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec ? `${grouped},${dec}` : grouped;
}

/** Form values for editing a regular transaction or a transfer (out + in legs). */
export function formFromTransaction(
  editing: { row: Transaction } | { out: Transaction; in: Transaction },
  categories: Category[],
): FormValues {
  if ('out' in editing) {
    const { out, in: inn } = editing;
    return {
      mode: 'transfer',
      amount: plain(out.amount),
      toAmount: plain(inn.amount),
      accountId: out.account_id,
      toAccountId: inn.account_id,
      categoryId: null,
      refund: false,
      date: out.date,
      time: out.time?.slice(0, 5) ?? null,
      // Automatic wording ("Transfer to X" / "Transfer from Y") stays empty in the form,
      // so saving writes the right text on each side instead of copying one onto both.
      description: isAutoTransferText(out, inn) ? '' : (out.description ?? ''),
    };
  }
  const t = editing.row;
  const amount = Number(t.amount);
  const category = categories.find((c) => c.id === t.category_id);
  const mode: Mode = category ? category.kind : amount > 0 ? 'income' : 'expense';
  return {
    mode,
    amount: plain(amount),
    toAmount: '',
    accountId: t.account_id,
    toAccountId: '',
    categoryId: t.category_id,
    refund: mode === 'expense' && amount > 0,
    date: t.date,
    time: t.time?.slice(0, 5) ?? null,
    description: t.description ?? '',
  };
}

const isAutoTransferText = (out: Transaction, inn: Transaction) =>
  Boolean(out.description?.startsWith('Transfer to ') && inn.description?.startsWith('Transfer from '));

/** Splits a transfer's two rows into the money-out and money-in legs. */
export function transferLegs(a: Transaction, b: Transaction | undefined) {
  if (!b) return null;
  const out = Number(a.amount) < 0 ? a : b;
  const inn = out === a ? b : a;
  return Number(out.amount) < 0 && Number(inn.amount) > 0 ? { out, in: inn } : null;
}
