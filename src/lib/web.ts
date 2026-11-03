import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

import { WEB_URL } from '@/lib/config';

/** Opens a page of the Tora web app in an in-app browser tab (e.g. '/forgot-password'). */
export async function openWeb(path = '/') {
  if (!WEB_URL) {
    Alert.alert('Web address missing', 'Set EXPO_PUBLIC_WEB_URL in .env.local, then restart the dev server.');
    return;
  }
  await WebBrowser.openBrowserAsync(`${WEB_URL}${path}`);
}
