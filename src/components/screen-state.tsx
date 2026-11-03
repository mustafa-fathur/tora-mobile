import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { COLORS } from '@/lib/theme';

/** Full-screen spinner for the first load. */
export function Loading() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color={COLORS.primary} />
    </View>
  );
}

/** Full-screen error with a retry button. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
      <Text className="text-center text-muted-foreground">{message}</Text>
      <Button variant="outline" onPress={onRetry}>
        <Text>Try again</Text>
      </Button>
    </View>
  );
}
