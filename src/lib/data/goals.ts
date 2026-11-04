// Goal writes. Ported from tora web: src/app/(app)/goals/actions.ts @ dea6031;
// checks in lib/finance/goal-rules.ts (tested).
import { invalidate } from '@/lib/data/cache';
import { dbErrorMessage } from '@/lib/finance/form';
import { buildGoal, movedSaved, type GoalInput } from '@/lib/finance/goal-rules';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

export type Goal = Database['public']['Tables']['goals']['Row'];
const changed = () => invalidate('goals', 'home');

export async function saveGoal(input: GoalInput, accounts: { id: string; currency: string }[], editing?: Goal) {
  const built = buildGoal(input, accounts);
  if (!built.ok) return built.message;
  const { error } = editing
    ? await supabase.from('goals').update(built.row).eq('id', editing.id)
    : await supabase.from('goals').insert(built.row);
  if (error) return dbErrorMessage(error);
  changed();
}

/** Adds (or takes out) money for a goal without a linked account. */
export async function moveGoalMoney(goal: Goal, raw: string, withdraw: boolean) {
  const r = movedSaved(Number(goal.saved_amount), raw, goal.currency, withdraw);
  if (!r.ok) return r.message;
  const { error } = await supabase.from('goals').update({ saved_amount: r.saved }).eq('id', goal.id);
  if (error) return dbErrorMessage(error);
  changed();
}

export async function setGoalArchived(id: string, archived: boolean) {
  const { error } = await supabase.from('goals').update({ is_archived: archived }).eq('id', id);
  if (error) return dbErrorMessage(error);
  changed();
}

export async function deleteGoal(id: string) {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) return dbErrorMessage(error);
  changed();
}
