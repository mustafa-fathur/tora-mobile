// Small vibrations that confirm a touch, like native apps do. They never throw:
// phones without a vibration motor (and the web preview) just skip them.
// https://docs.expo.dev/versions/v58.0.0/sdk/haptics/
import * as Haptics from 'expo-haptics';

const safe = (p: Promise<void>) => p.catch(() => {});

export const haptics = {
  /** A light tap: buttons that open something (the + button). */
  tap: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A tick: changing a selection (tabs, segments, chips). */
  select: () => safe(Haptics.selectionAsync()),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
