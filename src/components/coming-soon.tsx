import { ScrollView, View } from 'react-native';

import { NAV_ICONS } from '@/components/nav/nav-icons';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { navItem } from '@/lib/nav';

/** Placeholder for a section that's planned but not built yet (see AGENTS.md → Rounds). */
export function ComingSoon({ href }: { href: string }) {
  const item = navItem(href);
  if (!item) return null;
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="flex-grow items-center justify-center gap-4 p-8">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-secondary">
        <Icon as={NAV_ICONS[item.icon]} size={28} className="text-primary" />
      </View>
      <Text className="text-xl font-semibold">{item.title}</Text>
      {item.soon && (
        <>
          <Text className="text-center text-muted-foreground">{item.soon.summary}</Text>
          <View className="rounded-full bg-muted px-3 py-1">
            <Text className="text-sm text-muted-foreground">Coming soon</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
