import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar, Clock, X } from 'lucide-react-native';
import { Platform, Pressable, View } from 'react-native';

import { Chip } from '@/components/add/chip';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { formatDay } from '@/lib/finance/dates';
import { jakartaNow, shiftDay } from '@/lib/finance/now';

// The pickers work with JavaScript Date objects in the phone's own time zone. We only
// use their year/month/day/hour/minute, so the phone's zone doesn't change the result.
const pad = (n: number) => String(n).padStart(2, '0');
function toPickerDate(date: string, time: string | null) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time ?? '12:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}
const dateOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Date (Today / Yesterday / pick) and an optional time. Picking today sets the time
 * to now; another day clears it, like the web form (time only orders rows within a day).
 */
export function DateTimeField({
  date,
  time,
  onChange,
}: {
  date: string;
  time: string | null;
  onChange: (date: string, time: string | null) => void;
}) {
  const now = jakartaNow();
  const yesterday = shiftDay(now.date, -1);
  const otherDay = date !== now.date && date !== yesterday;

  const setDate = (d: string) => onChange(d, d === now.date ? jakartaNow().time : null);

  function pickDate() {
    if (Platform.OS !== 'android') return;
    DateTimePickerAndroid.open({
      value: toPickerDate(date, time),
      mode: 'date',
      onChange: (event, picked) => {
        if (event.type === 'set' && picked) setDate(dateOf(picked));
      },
    });
  }

  function pickTime() {
    if (Platform.OS === 'ios') return onChange(date, now.time); // then the compact picker shows
    if (Platform.OS !== 'android') return;
    DateTimePickerAndroid.open({
      value: toPickerDate(date, time ?? now.time),
      mode: 'time',
      is24Hour: true,
      onChange: (event, picked) => {
        if (event.type === 'set' && picked) onChange(date, timeOf(picked));
      },
    });
  }

  return (
    <View className="gap-2">
      <Label>Date</Label>
      <View className="flex-row flex-wrap items-center gap-2">
        <Chip label="Today" selected={date === now.date} onPress={() => setDate(now.date)} />
        <Chip label="Yesterday" selected={date === yesterday} onPress={() => setDate(yesterday)} />
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={toPickerDate(date, time)}
            mode="date"
            display="compact"
            onChange={(_, picked) => picked && setDate(dateOf(picked))}
          />
        ) : (
          <Chip
            label={otherDay ? formatDay(date) : 'Other day…'}
            selected={otherDay}
            onPress={pickDate}
            accessibilityLabel="Pick a date"
          />
        )}
      </View>
      <View className="flex-row items-center gap-2">
        {Platform.OS === 'ios' && time ? (
          <DateTimePicker
            value={toPickerDate(date, time)}
            mode="time"
            display="compact"
            onChange={(_, picked) => picked && onChange(date, timeOf(picked))}
          />
        ) : (
          <Pressable
            onPress={pickTime}
            accessibilityRole="button"
            accessibilityLabel={time ? `Time ${time}, change` : 'Add a time'}
            className="h-9 flex-row items-center gap-1.5 rounded-full border border-border px-3.5 active:bg-accent">
            <Icon as={time ? Clock : Calendar} size={14} className="text-muted-foreground" />
            <Text className="text-sm">{time ?? 'Add time (optional)'}</Text>
          </Pressable>
        )}
        {time && (
          <Pressable
            onPress={() => onChange(date, null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Remove time"
            className="h-9 w-9 items-center justify-center rounded-full active:bg-accent">
            <Icon as={X} size={16} className="text-muted-foreground" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
