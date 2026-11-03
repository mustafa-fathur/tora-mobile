import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

/** A titled card on Home, with an optional "See all"-style link on the right. */
export function HomeSection({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-3 px-4 py-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold">{title}</Text>
        {action && onAction && (
          <Pressable onPress={onAction} hitSlop={8} accessibilityRole="link" className="flex-row items-center gap-0.5">
            <Text className="text-sm text-muted-foreground">{action}</Text>
            <Icon as={ChevronRight} size={14} className="text-muted-foreground" />
          </Pressable>
        )}
      </View>
      {children}
    </Card>
  );
}
