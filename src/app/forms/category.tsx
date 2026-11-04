// Category sheet: `?kind=` new group, `?parent=` new category in a group, `?id=` rename or delete.
import { router, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert } from 'react-native';

import { FormSheet, TextField } from '@/components/form-sheet';
import { ListSkeleton } from '@/components/list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { deleteCategory, saveCategory } from '@/lib/data/settings';
import type { Category, CategoryKind } from '@/lib/finance/types';
import { haptics } from '@/lib/haptics';

export default function CategoryFormScreen() {
  const params = useLocalSearchParams<{ id?: string; parent?: string; kind?: CategoryKind }>();
  const categories = useCachedData(...DATA.categories);
  if (!categories.data) {
    return (
      <FormSheet title="Category">
        <ListSkeleton rows={2} header={false} />
      </FormSheet>
    );
  }
  const editing = params.id ? categories.data.find((c) => c.id === params.id) : undefined;
  return <CategoryForm categories={categories.data} editing={editing} parentId={editing?.parent_id ?? params.parent ?? null} kind={params.kind ?? 'expense'} />;
}

function CategoryForm({ categories, editing, parentId, kind }: { categories: Category[]; editing?: Category; parentId: string | null; kind: CategoryKind }) {
  const parent = parentId ? categories.find((c) => c.id === parentId) : undefined;
  const isGroup = !parentId;
  const [name, setName] = useState(editing?.name ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? '');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const title = editing ? (isGroup ? 'Edit group' : 'Edit category') : isGroup ? 'New group' : 'New category';

  async function run(task: () => Promise<string | undefined>) {
    setSaving(true);
    setError(undefined);
    const message = await task();
    setSaving(false);
    if (message) return setError(message);
    haptics.success();
    router.back();
  }

  return (
    <FormSheet
      title={title}
      onSave={() => run(() => saveCategory({ name, icon, parentId, kind: parent?.kind ?? kind }, categories, editing))}
      saving={saving}
      error={error}>
      <Text className="text-muted-foreground">
        {parent ? `In ${[parent.icon, parent.name].filter(Boolean).join(' ')}` : `A ${editing?.kind ?? kind} group`}
      </Text>
      <TextField label="Name" value={name} onChangeText={setName} placeholder={isGroup ? 'e.g. Pets' : 'e.g. Vet'} autoFocus={!editing} maxLength={60} />
      {isGroup && <TextField label="Emoji (optional)" value={icon} onChangeText={setIcon} placeholder="e.g. 🐶" maxLength={8} hint="Shown next to the group everywhere." />}
      {editing && (
        <Button
          variant="ghost"
          disabled={saving}
          onPress={() => {
            haptics.warning();
            Alert.alert(
              `Delete ${editing.name}?`,
              `${isGroup ? 'Its categories are deleted too. ' : ''}Transactions keep their data but become uncategorized, and budgets for it are removed.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => run(() => deleteCategory(editing.id)) },
              ],
            );
          }}>
          <Icon as={Trash2} size={16} className="text-destructive" />
          <Text className="text-destructive">Delete {isGroup ? 'group' : 'category'}</Text>
        </Button>
      )}
    </FormSheet>
  );
}
