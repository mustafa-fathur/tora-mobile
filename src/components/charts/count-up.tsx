import { useEffect } from 'react';
import { TextInput, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

import { formatIdrLive } from '@/lib/idr-live';

// A read-only TextInput is the usual trick for text that changes every frame:
// Reanimated updates its `text` on the UI thread, so React doesn't re-render 60 times a second.
const AnimatedText = Animated.createAnimatedComponent(TextInput);

/** An IDR amount that counts up (or down) to `value` smoothly. */
export function CountUp({
  value,
  signed = false,
  style,
  duration = 900,
}: {
  value: number;
  signed?: boolean;
  style?: TextStyle;
  duration?: number;
}) {
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, duration, shown]);

  const animatedProps = useAnimatedProps(() => {
    const text = formatIdrLive(shown.value, signed);
    return { text, defaultValue: text } as never;
  });

  return (
    <AnimatedText
      editable={false}
      underlineColorAndroid="transparent"
      accessibilityLabel={formatIdrLive(value, signed)}
      style={[{ padding: 0, margin: 0 }, style]}
      animatedProps={animatedProps}
      defaultValue={formatIdrLive(0, signed)}
    />
  );
}
