import { useRef, useState } from 'react';
import { View, type TextInputInstance } from 'react-native';

import { AuthScreen } from '@/components/auth/auth-screen';
import { PasswordInput } from '@/components/auth/password-input';
import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authErrorMessage } from '@/lib/auth/errors';
import { missingConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase/client';
import { openWeb } from '@/lib/web';

// Sign-up is off (invite-only), so this screen only logs in.
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  async function logIn() {
    if (pending) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setPending(true);
    setError(undefined);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPending(false);
    if (error) setError(authErrorMessage(error));
    // On success there's nothing to do here: the session changes and the root layout
    // moves you to the 2FA screen or the app.
  }

  return (
    <AuthScreen>
      <Card>
        <CardHeader className="items-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription className="text-center">Log in to see your money at a glance.</CardDescription>
        </CardHeader>
        <CardContent className="gap-5">
          {missingConfig.length > 0 && (
            <FormAlert>
              The app isn&apos;t configured: {missingConfig.join(', ')} missing. Copy .env.example to .env.local,
              fill it in, then restart the dev server.
            </FormAlert>
          )}
          {error && <FormAlert>{error}</FormAlert>}
          <View className="gap-2">
            <Label nativeID="email-label">Email</Label>
            <Input
              aria-labelledby="email-label"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>
          <View className="gap-2">
            <View className="flex-row items-center">
              <Label nativeID="password-label">Password</Label>
              <Button variant="link" size="sm" className="ml-auto h-auto px-0 py-0" onPress={() => openWeb('/forgot-password')}>
                <Text>Forgot password?</Text>
              </Button>
            </View>
            <PasswordInput
              ref={passwordRef}
              aria-labelledby="password-label"
              value={password}
              onChangeText={setPassword}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={logIn}
            />
          </View>
          <Button onPress={logIn} disabled={pending || missingConfig.length > 0}>
            <Text>{pending ? 'Logging in…' : 'Log in'}</Text>
          </Button>
        </CardContent>
      </Card>
    </AuthScreen>
  );
}
