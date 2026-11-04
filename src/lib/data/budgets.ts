// Budget writes. Ported from tora web: src/app/(app)/budgets/actions.ts @ dea6031.
import { invalidate } from '@/lib/data/cache';
import { budgetAmount } from '@/lib/finance/budget-rules';
import { shiftMonth } from '@/lib/finance/dates';
import { dbErrorMessage } from '@/lib/finance/form';
import { supabase } from '@/lib/supabase/client';

const changed = () => invalidate('budgets', 'home');

/** Sets (or clears, when empty) the budget for one category or group in a month ("YYYY-MM"). */
export async function setBudget(categoryId: string, month: string, raw: string) {
  if (!categoryId) return 'Choose a category.';
  const r = budgetAmount(raw);
  if (!r.ok) return r.message;
  const { error } =
    r.amount === null
      ? await supabase.from('budgets').delete().eq('category_id', categoryId).eq('month', `${month}-01`)
      : await supabase
          .from('budgets')
          .upsert({ category_id: categoryId, month: `${month}-01`, amount: r.amount }, { onConflict: 'user_id,category_id,month' });
  if (error) return dbErrorMessage(error);
  changed();
}

/** Copies last month's budgets into `month`; budgets already set in `month` are kept. */
export async function copyBudgets(month: string) {
  const { data: previous, error } = await supabase
    .from('budgets')
    .select('category_id, amount')
    .eq('month', `${shiftMonth(month, -1)}-01`);
  if (error) return dbErrorMessage(error);
  if (!previous.length) return 'Last month has no budgets to copy.';
  const { error: insertError } = await supabase.from('budgets').upsert(
    previous.map((b) => ({ category_id: b.category_id, amount: b.amount, month: `${month}-01` })),
    { onConflict: 'user_id,category_id,month', ignoreDuplicates: true },
  );
  if (insertError) return dbErrorMessage(insertError);
  changed();
}
