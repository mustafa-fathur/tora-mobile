// Shared pieces for full-screen form sheets (quick Add, accounts, budgets, …):
// a top bar with close / title / Save, a scrolling body, and simple fields.
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useRef } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/add/chip';
import { FormAlert } from '@/components/form-alert';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

/** The sheet's own top bar: close (✕), title, and an action such as Save. */
export function SheetHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="border-b border-border bg-background" style={{ paddingTop: insets.top }}>
      <View className="h-14 flex-row items-center px-2">
        <View className="w-20 flex-row">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
            className="h-10 w-10 items-center justify-center rounded-full active:bg-muted">
            <Icon as={X} size={22} />
          </Pressable>
        </View>
        <Text className="flex-1 text-center text-[17px] font-semibold" accessibilityRole="header">
          {title}
        </Text>
        <View className="w-20 flex-row justify-end">{right}</View>
      </View>
    </View>
  );
}

export function SaveButton({ onPress, saving, label = 'Save' }: { onPress: () => void; saving: boolean; label?: string }) {
  return (
    <Pressable onPress={onPress} disabled={saving} hitSlop={8} accessibilityRole="button" className="px-2 py-1">
      <Text className={cn('font-semibold text-primary', saving && 'opacity-50')}>{saving ? 'Saving…' : label}</Text>
    </Pressable>
  );
}

/** A whole form screen: header with Save, error banner at the top, scrolling fields. */
export function FormSheet({
  title,
  onSave,
  saving,
  error,
  saveLabel,
  children,
}: {
  title: string;
  onSave?: () => void;
  saving?: boolean;
  error?: string;
  saveLabel?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<ScrollViewInstance>(null);
  return (
    <View className="flex-1 bg-background">
      <SheetHeader title={title} right={onSave ? <SaveButton onPress={onSave} saving={!!saving} label={saveLabel} /> : null} />
      <ScrollView ref={ref} className="flex-1" contentContainerClassName="gap-5 p-4 pb-10" keyboardShouldPersistTaps="handled">
        {error ? <FormAlert>{error}</FormAlert> : null}
        {children}
      </ScrollView>
    </View>
  );
}

/** Label + text input. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoFocus,
  maxLength,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  autoFocus?: boolean;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        maxLength={maxLength}
        accessibilityLabel={label}
      />
      {hint ? <Text className="text-sm text-muted-foreground">{hint}</Text> : null}
    </View>
  );
}

/** Pick one option from a few, as chips. */
export function ChoiceField<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; disabled?: boolean }[];
  value: T | '';
  onChange: (v: T) => void;
}) {
  return (
    <View className="gap-2">
      <Label>{label}</Label>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => (
          <View key={o.value} className={cn(o.disabled && 'opacity-40')} pointerEvents={o.disabled ? 'none' : 'auto'}>
            <Chip label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** A checkbox row with a title and an optional explanation. */
export function CheckRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onChange(!checked);
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className="flex-row items-start gap-3">
      <View
        className={cn(
          'mt-0.5 h-5 w-5 items-center justify-center rounded border',
          checked ? 'border-primary bg-primary' : 'border-input bg-background',
        )}>
        {checked && <Text className="text-xs font-bold text-primary-foreground">✓</Text>}
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-medium">{label}</Text>
        {hint ? <Text className="text-sm text-muted-foreground">{hint}</Text> : null}
      </View>
    </Pressable>
  );
}
