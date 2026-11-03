import { Image, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';

/**
 * Shared frame for the login and 2FA screens: logo on top, form card below.
 * KeyboardAvoidingView + ScrollView keep the inputs visible when the keyboard opens.
 * SafeAreaView adds padding so nothing sits under the status bar or phone notch.
 */
export function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-muted">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerClassName="flex-grow justify-center gap-6 p-6"
          keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center justify-center gap-2">
            <Image
              source={require('../../../assets/brand/tora-logo.png')}
              style={{ width: 36, height: 36 }}
              accessibilityIgnoresInvertColors
            />
            <Text className="text-lg font-semibold tracking-tight text-primary">Tora</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
