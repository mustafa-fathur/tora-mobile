// Settings → Account types: the kinds of accounts you use, grouped by what they are
// (cash & bank, investments, debts). + adds one; tap to rename, change kind or delete.
import { router, Stack } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { ListGroup, ListHeader, ListSkeleton, RowSeparator } from '@/components/list';
import { HeaderAction } from '@/components/nav/header-buttons';
import { LoadError } from '@/components/screen-state';
import { Text } from '@/components/ui/text';
import { useCachedData } from '@/lib/data/cache';
import { DATA } from '@/lib/data/keys';
import { ACCOUNT_CLASSES } from '@/lib/finance/accounts';
import { COLORS } from '@/lib/theme';

export default function AccountTypesScreen() {
  const types = useCachedData(...DATA.accountTypes);
  const accounts = useCachedData(...DATA.accounts);
  const header = (
    <Stack.Screen options={{ headerRight: () => <HeaderAction icon={Plus} label="New account type" onPress={() => router.push('/forms/account-type')} /> }} />
  );
  if (!types.data || !accounts.data) {
    const error = types.error ?? accounts.error;
    return (
      <>
        {header}
        {error ? <LoadError message={error} onRetry={types.refresh} /> : <ListSkeleton />}
      </>
    );
  }
  const uses = (id: string) => accounts.data!.filter((a) => a.type_id === id).length;
  return (
    <ScrollView
      className="flex-1 bg-muted"
      contentContainerClassName="pb-10"
      refreshControl={<RefreshControl refreshing={types.refreshing} onRefresh={types.refresh} colors={[COLORS.primary]} />}>
      {header}
      {ACCOUNT_CLASSES.map((c) => {
        const list = types.data!.filter((t) => t.class === c.value);
        return (
          <View key={c.value}>
            <ListHeader title={c.title} />
            <Text className="bg-muted px-4 pb-2 text-xs text-muted-foreground">{c.hint}</Text>
            <ListGroup>
              {list.length === 0 ? (
                <Text className="px-4 py-3 text-sm text-muted-foreground">None.</Text>
              ) : (
                list.map((t, i) => (
                  <View key={t.id}>
                    {i > 0 && <RowSeparator />}
                    <Pressable
                      onPress={() => router.push({ pathname: '/forms/account-type', params: { id: t.id } })}
                      accessibilityRole="button"
                      className="min-h-[52px] flex-row items-center px-4 active:bg-muted">
                      <Text className="flex-1">{t.name}</Text>
                      <Text className="text-sm text-muted-foreground">
                        {uses(t.id)} account{uses(t.id) === 1 ? '' : 's'}
                      </Text>
                    </Pressable>
                  </View>
                ))
              )}
            </ListGroup>
          </View>
        );
      })}
    </ScrollView>
  );
}
