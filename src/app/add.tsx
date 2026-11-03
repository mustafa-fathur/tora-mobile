import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

// Opened by the "+" button as a modal (a screen that slides up over the tabs).
// The real form comes in a later step.
export default function AddTransactionScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
      <Text className="text-center text-muted-foreground">
        Adding transactions is coming in a later step.
      </Text>
      <Button variant="outline" onPress={() => router.back()}>
        <Text>Close</Text>
      </Button>
    </View>
  );
}
