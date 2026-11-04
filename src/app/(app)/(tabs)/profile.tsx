import Constants from 'expo-constants';
import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { Alert, Image, ScrollView, View } from 'react-native';

import { ListGroup, ListHeader, NavRow, RowSeparator } from '@/components/list';
import { NAV_ICONS } from '@/components/nav/nav-icons';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import { PROFILE_GROUPS } from '@/lib/nav';
import { supabase } from '@/lib/supabase/client';
import { useSession } from '@/providers/session';

export default function ProfileScreen() {
  const { session } = useSession();

  function logOut() {
    haptics.warning();
    Alert.alert('Log out?', 'You can log back in with your email and password.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <ScrollView className="flex-1 bg-muted" contentContainerClassName="pb-10">
      {/* Avatar (the Tora logo: accounts have no photo) and email */}
      <View className="items-center gap-3 border-b border-border bg-background px-4 pb-6 pt-8">
        <View className="h-24 w-24 items-center justify-center rounded-full border border-border bg-secondary">
          <Image source={require('../../../../assets/brand/tora-logo.png')} style={{ width: 64, height: 64 }} />
        </View>
        <Text className="text-lg font-semibold" numberOfLines={1}>
          {session?.user.email}
        </Text>
      </View>

      {PROFILE_GROUPS.map((group, gi) => (
        <View key={group.label ?? gi}>
          {group.label ? <ListHeader title={group.label} /> : <View className="h-6" />}
          <ListGroup>
            {group.items.map((item, i) => (
              <View key={item.href}>
                {i > 0 && <RowSeparator inset={60} />}
                <NavRow
                  icon={NAV_ICONS[item.icon]}
                  title={item.title}
                  value={item.soon ? 'Soon' : undefined}
                  onPress={() => router.push(item.href as never)}
                />
              </View>
            ))}
          </ListGroup>
        </View>
      ))}

      <View className="h-6" />
      <ListGroup>
        <NavRow icon={LogOut} title="Log out" destructive chevron={false} onPress={logOut} />
      </ListGroup>
      <Text className="pt-4 text-center text-xs text-muted-foreground">Tora {Constants.expoConfig?.version}</Text>
    </ScrollView>
  );
}
