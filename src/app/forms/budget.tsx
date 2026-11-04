// Set a budget (`/forms/budget?month=YYYY-MM&category=…`). Empty clears it.
import { router, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';

import { CategoryField } from '@/components/add/category-picker';
import { FormSheet, TextField } from '@/components/form-sheet';
import { ListSkeleton } from '@/components/list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { setBudget } from '@/lib/data/budgets';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { getBudgets } from '@/lib/data/queries';
import { toCategoryGroups } from '@/lib/finance/categories';
import { formatMonth } from '@/lib/finance/dates';
import type { Category } from '@/lib/finance/types';
import { haptics } from '@/lib/haptics';

export default function BudgetFormScreen() {
  const params = useLocalSearchParams<{ month: string; category?: string }>();
  const month = params.month;
  const categories = useCachedData(...DATA.categories);
  const budgets = useCachedData(`budgets:${month}`, () => getBudgets(month));
  if (!categories.data || !budgets.data) {
    return (
      <FormSheet title="Set budget">
        <ListSkeleton rows={2} header={false} />
      </FormSheet>
    );
  }
  return <BudgetForm month={month} initial={params.category} categories={categories.data} budgets={budgets.data} />;
}

function BudgetForm({
  month,
  initial,
  categories,
  budgets,
}: {
  month: string;
  initial?: string;
  categories: Category[];
  budgets: Map<string, number>;
}) {
  const groups = useMemo(() => toCategoryGroups(categories), [categories]);
  const [categoryId, setCategoryId] = useState<string | null>(initial ?? null);
  const existing = categoryId ? budgets.get(categoryId) : undefined;
  const [amount, setAmount] = useState(existing !== undefined ? String(existing) : '');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save(raw = amount) {
    setSaving(true);
    setError(undefined);
    const message = await setBudget(categoryId ?? '', month, raw);
    setSaving(false);
    if (message) return setError(message);
    haptics.success();
    router.back();
  }

  return (
    <FormSheet title="Set budget" onSave={() => save()} saving={saving} error={error}>
      <Text className="text-muted-foreground">{formatMonth(month)}</Text>
      <CategoryField
        groups={groups}
        categories={categories}
        kind="expense"
        value={categoryId}
        onChange={(id) => {
          setCategoryId(id);
          const b = id ? budgets.get(id) : undefined;
          setAmount(b !== undefined ? String(b) : '');
        }}
      />
      <TextField
        label="Budget for the month (IDR)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="e.g. 2jt"
        autoFocus={!!initial}
        hint="A group's budget covers all of its categories. Leave empty to remove the budget."
      />
      {existing !== undefined && (
        <Button variant="ghost" onPress={() => save('')} disabled={saving}>
          <Icon as={Trash2} size={16} className="text-destructive" />
          <Text className="text-destructive">Remove budget</Text>
        </Button>
      )}
    </FormSheet>
  );
}
