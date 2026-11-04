import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

/**
 * Tora's header for every screen: the logo on the left (or a back arrow on screens
 * opened from Profile), the title centered, and that screen's own action on the right.
 * It draws its own top padding so nothing sits under the status bar ("safe area").
 */
export function AppHeader({
  title,
  back = false,
  right,
}: {
  title: string;
  back?: boolean;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View className="border-b border-border bg-background" style={{ paddingTop: insets.top }}>
      <View className="h-14 flex-row items-center px-2">
        <View className="w-16 flex-row items-center">
          {back ? (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back"
              className="h-10 w-10 items-center justify-center rounded-full active:bg-muted">
              <Icon as={ArrowLeft} size={22} />
            </Pressable>
          ) : (
            <Image
              source={require('../../../assets/brand/tora-logo.png')}
              style={{ width: 30, height: 30, marginLeft: 8 }}
              accessibilityLabel="Tora"
            />
          )}
        </View>
        <Text className="flex-1 text-center text-[17px] font-semibold" numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <View className="w-16 flex-row items-center justify-end">{right}</View>
      </View>
    </View>
  );
}
