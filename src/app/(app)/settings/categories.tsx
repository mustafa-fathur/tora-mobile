// Settings → Categories: groups and their categories, for expenses or income.
// + adds a group; "Add category" inside a group adds one there; tap to rename or delete.
import { router, Stack } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { ListGroup, ListSkeleton, RowSeparator } from '@/components/list';
import { HeaderAction } from '@/components/nav/header-buttons';
import { LoadError } from '@/components/screen-state';
import { SegmentedControl } from '@/components/segmented-control';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { toCategoryGroups } from '@/lib/finance/categories';
import type { CategoryKind } from '@/lib/finance/types';
import { COLORS } from '@/lib/theme';

export default function CategoriesScreen() {
  const categories = useCachedData(...DATA.categories);
  const [kind, setKind] = useState<CategoryKind>('expense');
  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <HeaderAction icon={Plus} label="New category group" onPress={() => router.push({ pathname: '/forms/category', params: { kind } })} />
        ),
      }}
    />
  );
  if (!categories.data) {
    return (
      <>
        {header}
        {categories.error ? <LoadError message={categories.error} onRetry={categories.refresh} /> : <ListSkeleton />}
      </>
    );
  }
  const groups = toCategoryGroups(categories.data).filter((g) => g.kind === kind);
  const open = (id: string) => router.push({ pathname: '/forms/category', params: { id } });

  return (
    <ScrollView
      className="flex-1 bg-muted"
      contentContainerClassName="pb-10"
      refreshControl={<RefreshControl refreshing={categories.refreshing} onRefresh={categories.refresh} colors={[COLORS.primary]} />}>
      {header}
      <View className="bg-background px-4 py-3">
        <SegmentedControl
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
          value={kind}
          onChange={setKind}
        />
      </View>
      {groups.length === 0 && <Text className="px-4 py-6 text-center text-muted-foreground">No groups yet. Tap + to add one.</Text>}
      {groups.map((g) => (
        <View key={g.id} className="pt-5">
          <ListGroup>
            <Pressable onPress={() => open(g.id)} accessibilityRole="button" className="min-h-[52px] flex-row items-center gap-3 px-4 active:bg-muted">
              <Text className="text-lg">{g.icon ?? '•'}</Text>
              <Text className="flex-1 font-semibold">{g.name}</Text>
              {g.is_archived && <Text className="text-xs text-muted-foreground">Archived</Text>}
            </Pressable>
            {g.children.map((c) => (
              <View key={c.id}>
                <RowSeparator inset={48} />
                <Pressable onPress={() => open(c.id)} accessibilityRole="button" className="min-h-[48px] flex-row items-center pl-12 pr-4 active:bg-muted">
                  <Text className="flex-1">{c.name}</Text>
                  {c.is_archived && <Text className="text-xs text-muted-foreground">Archived</Text>}
                </Pressable>
              </View>
            ))}
            <RowSeparator inset={48} />
            <Pressable
              onPress={() => router.push({ pathname: '/forms/category', params: { parent: g.id } })}
              accessibilityRole="button"
              className="min-h-[48px] flex-row items-center gap-2 pl-12 pr-4 active:bg-muted">
              <Icon as={Plus} size={16} className="text-primary" />
              <Text className="text-primary">Add category</Text>
            </Pressable>
          </ListGroup>
        </View>
      ))}
    </ScrollView>
  );
}
