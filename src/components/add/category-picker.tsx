import { Check, ChevronRight, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, Pressable, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import type { Category, CategoryGroup, CategoryKind } from '@/lib/finance/types';
import { cn } from '@/lib/utils';

type Item = { id: string | null; label: string };
type Section = { title: string; data: Item[] };

// Same structure as the web's category select: "Uncategorized", then each group
// with "All of <group>" and its categories.
function sectionsFor(groups: CategoryGroup[], kind: CategoryKind, selected: string | null, query: string): Section[] {
  const q = query.trim().toLowerCase();
  const matches = (s: string) => !q || s.toLowerCase().includes(q);
  const sections: Section[] = [];
  if (matches('Uncategorized')) sections.push({ title: '', data: [{ id: null, label: 'Uncategorized' }] });
  for (const g of groups) {
    if (g.kind !== kind || (g.is_archived && g.id !== selected)) continue;
    const groupMatches = matches(g.name);
    const items: Item[] = [];
    if (groupMatches) items.push({ id: g.id, label: `All of ${g.name}` });
    for (const c of g.children) {
      if (c.is_archived && c.id !== selected) continue;
      if (groupMatches || matches(c.name)) items.push({ id: c.id, label: c.name });
    }
    if (items.length) sections.push({ title: [g.icon, g.name].filter(Boolean).join(' '), data: items });
  }
  return sections;
}

/** Text for the chosen category: "🍜 Food" for a group, "Groceries · Food" for a category. */
export function categoryLabel(categories: Category[], id: string | null) {
  if (!id) return 'Uncategorized';
  const c = categories.find((x) => x.id === id);
  if (!c) return 'Uncategorized';
  if (!c.parent_id) return [c.icon, c.name].filter(Boolean).join(' ');
  const group = categories.find((x) => x.id === c.parent_id);
  return group ? `${c.name} · ${group.name}` : c.name;
}

/** The "Category" field: a row that opens a full-screen list to choose from. */
export function CategoryField({
  groups,
  categories,
  kind,
  value,
  onChange,
}: {
  groups: CategoryGroup[];
  categories: Category[];
  kind: CategoryKind;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const sections = useMemo(() => sectionsFor(groups, kind, value, query), [groups, kind, value, query]);

  function choose(id: string | null) {
    onChange(id);
    setOpen(false);
    setQuery('');
  }

  return (
    <View className="gap-2">
      <Label>Category</Label>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Category: ${categoryLabel(categories, value)}`}
        className="h-11 flex-row items-center rounded-md border border-input bg-background px-3 active:bg-accent">
        <Text className={cn('flex-1', !value && 'text-muted-foreground')} numberOfLines={1}>
          {categoryLabel(categories, value)}
        </Text>
        <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
      </Pressable>

      {/* A Modal is a separate full-screen layer; Android's back button closes it. */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center gap-2 border-b border-border px-4 py-3">
            <Text className="flex-1 text-lg font-semibold">
              {kind === 'income' ? 'Income category' : 'Expense category'}
            </Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <Icon as={X} size={22} />
            </Pressable>
          </View>
          <View className="justify-center px-4 py-3">
            <Input value={query} onChangeText={setQuery} placeholder="Search" className="pl-9" autoCorrect={false} />
            <View className="absolute left-7" pointerEvents="none">
              <Icon as={Search} size={16} className="text-muted-foreground" />
            </View>
          </View>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id ?? 'none'}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled
            renderSectionHeader={({ section }) =>
              section.title ? (
                <View className="bg-muted px-4 py-1.5">
                  <Text className="text-sm font-semibold text-muted-foreground">{section.title}</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const selected = item.id === value;
              return (
                <Pressable
                  onPress={() => choose(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className="min-h-12 flex-row items-center border-b border-border px-4 py-3 active:bg-accent">
                  <Text className={cn('flex-1', selected && 'font-semibold text-primary')}>{item.label}</Text>
                  {selected && <Icon as={Check} size={18} className="text-primary" />}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text className="px-4 py-6 text-center text-muted-foreground">No category matches “{query}”.</Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
