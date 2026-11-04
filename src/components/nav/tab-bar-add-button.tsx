import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { haptics } from '@/lib/haptics';
import { COLORS } from '@/lib/theme';

/**
 * The raised + in the middle of the bottom bar: opens quick Add from any tab.
 * It sits above the bar with a white ring so it reads as one shape with it.
 */
export function TabBarAddButton() {
  return (
    <View className="flex-1 items-center" pointerEvents="box-none">
      <Pressable
        onPress={() => {
          haptics.tap();
          router.push('/add');
        }}
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        hitSlop={6}
        style={{
          marginTop: -22,
          elevation: 6, // Android's shadow
          shadowColor: COLORS.primary,
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }}
        className="h-16 w-16 items-center justify-center rounded-full border-4 border-background bg-primary active:bg-primary/90">
        <Plus color={COLORS.primaryForeground} size={28} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}
