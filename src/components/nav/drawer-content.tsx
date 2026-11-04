import Constants from 'expo-constants';
import { router, usePathname } from 'expo-router';
import { DrawerContentScrollView, type DrawerContentComponentProps } from 'expo-router/drawer';
import { FileSpreadsheet, LogOut } from 'lucide-react-native';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAV_ICONS } from '@/components/nav/nav-icons';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { activeNavItem, NAV_GROUPS } from '@/lib/nav';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { openWeb } from '@/lib/web';
import { useSession } from '@/providers/session';

/** The side menu: every section in the web's groups, then the account footer. */
export function DrawerContent({ navigation }: DrawerContentComponentProps) {
  const pathname = usePathname();
  const active = activeNavItem(pathname);
  const { session } = useSession();
  const insets = useSafeAreaInsets();

  function go(href: string) {
    navigation.closeDrawer();
    // navigate (not push): goes to the tab or screen without stacking copies.
    router.navigate(href as never);
  }

  return (
    <View className="flex-1 bg-background">
      <DrawerContentScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 0 }}>
        <View className="flex-row items-center gap-2 px-5 pb-3">
          <Image source={require('../../../assets/brand/tora-logo.png')} style={{ width: 32, height: 32 }} />
          <Text className="text-lg font-semibold tracking-tight text-primary">Tora</Text>
        </View>
        {NAV_GROUPS.map((group) => (
          <View key={group.label} className="pb-2">
            <Text className="px-5 pb-1 pt-3 text-xs font-medium text-muted-foreground">{group.label}</Text>
            {group.items.map((item) => {
              const selected = item.href === active?.href;
              return (
                <Pressable
                  key={item.href}
                  onPress={() => go(item.href)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className={cn(
                    'mx-2 h-11 flex-row items-center gap-3 rounded-md px-3',
                    selected ? 'bg-secondary' : 'active:bg-muted',
                  )}>
                  <Icon
                    as={NAV_ICONS[item.icon]}
                    size={18}
                    className={selected ? 'text-primary' : 'text-muted-foreground'}
                  />
                  <Text className={cn('flex-1 text-[15px]', selected && 'font-semibold text-primary')}>{item.title}</Text>
                  {item.soon && <Text className="text-xs text-muted-foreground">Soon</Text>}
                </Pressable>
              );
            })}
          </View>
        ))}
      </DrawerContentScrollView>

      <Separator />
      <View className="gap-1 px-2 pt-2" style={{ paddingBottom: insets.bottom + 8 }}>
        {/* CSV import and export stay on the web (AGENTS.md → Scope). */}
        <Pressable
          onPress={() => openWeb('/transactions/import')}
          accessibilityRole="link"
          className="h-11 flex-row items-center gap-3 rounded-md px-3 active:bg-muted">
          <Icon as={FileSpreadsheet} size={18} className="text-muted-foreground" />
          <Text className="flex-1 text-[15px]">CSV import & export</Text>
          <Text className="text-xs text-muted-foreground">Web</Text>
        </Pressable>
        <View className="px-3 pb-1 pt-2">
          <Text className="text-xs text-muted-foreground">Logged in as</Text>
          <Text className="text-sm font-medium" numberOfLines={1}>
            {session?.user.email}
          </Text>
        </View>
        <Pressable
          onPress={() => supabase.auth.signOut()}
          accessibilityRole="button"
          className="h-11 flex-row items-center gap-3 rounded-md px-3 active:bg-muted">
          <Icon as={LogOut} size={18} className="text-destructive" />
          <Text className="text-[15px] text-destructive">Log out</Text>
        </Pressable>
        <Text className="px-3 pt-1 text-xs text-muted-foreground">Tora {Constants.expoConfig?.version}</Text>
      </View>
    </View>
  );
}
