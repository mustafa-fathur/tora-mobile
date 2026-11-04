// Native-style full-width lists: section headers, rows edge to edge with hairline
// separators and press feedback (no cards inside cards).
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

/** A section title above a group of rows, with an optional action on the right. */
export function ListHeader({
  title,
  right,
  className,
}: {
  title: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={cn('flex-row items-end justify-between bg-muted px-4 pb-2 pt-5', className)}>
      <Text className="text-sm font-semibold text-muted-foreground">{title}</Text>
      {right}
    </View>
  );
}

/** A small text button for a section header ("See all"). */
export function ListHeaderLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="link" className="flex-row items-center">
      <Text className="text-sm font-medium text-primary">{label}</Text>
      <Icon as={ChevronRight} size={14} className="text-primary" />
    </Pressable>
  );
}

/** White background for a group of rows. */
export function ListGroup({ children }: { children: React.ReactNode }) {
  return <View className="border-y border-border bg-background">{children}</View>;
}

/** Hairline between rows, inset to line up with the row text. */
export function RowSeparator({ inset = 16 }: { inset?: number }) {
  return <View className="bg-border" style={{ height: StyleSheet.hairlineWidth, marginLeft: inset }} />;
}

/** A tappable settings-style row: icon, title, optional value, chevron. */
export function NavRow({
  icon,
  title,
  value,
  onPress,
  destructive = false,
  chevron = true,
}: {
  icon?: LucideIcon;
  title: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
  chevron?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      accessibilityRole="button"
      className="min-h-[52px] flex-row items-center gap-3 bg-background px-4 active:bg-muted">
      {icon && (
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Icon as={icon} size={18} className={destructive ? 'text-destructive' : 'text-primary'} />
        </View>
      )}
      <Text className={cn('flex-1 text-base', destructive && 'text-destructive')}>{title}</Text>
      {value ? <Text className="text-sm text-muted-foreground">{value}</Text> : null}
      {chevron && <Icon as={ChevronRight} size={18} className="text-muted-foreground" />}
    </Pressable>
  );
}

/** Grey placeholder rows while data loads (instead of a spinner). */
export function ListSkeleton({ rows = 6, header = true }: { rows?: number; header?: boolean }) {
  return (
    <View className="flex-1 bg-background" accessibilityLabel="Loading" accessibilityRole="progressbar">
      {header && (
        <View className="bg-muted px-4 pb-2 pt-5">
          <Skeleton className="h-4 w-28" />
        </View>
      )}
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} className="flex-row items-center gap-3 border-b border-border px-4 py-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </View>
          <Skeleton className="h-4 w-20" />
        </View>
      ))}
    </View>
  );
}
