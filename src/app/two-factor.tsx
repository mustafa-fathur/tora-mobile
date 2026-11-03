import type { AuthError } from '@supabase/supabase-js';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthScreen } from '@/components/auth/auth-screen';
import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authErrorMessage } from '@/lib/auth/errors';
import { supabase } from '@/lib/supabase/client';

// Step two of login for users with an authenticator app (same flow as the web's
// /two-factor). Until this succeeds the database returns no rows.
export default function TwoFactorScreen() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function verify(input = code) {
    if (pending) return;
    const digits = input.replace(/\s/g, '');
    if (!/^\d{6}$/.test(digits)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setPending(true);
    setError(undefined);
    const message = await verifyWithAnyFactor(digits);
    setPending(false);
    if (message) {
      setError(message);
      setCode('');
    }
    // On success the session becomes aal2 and the root layout opens the app.
  }

  function onChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) verify(digits);
  }

  return (
    <AuthScreen>
      <Card>
        <CardHeader className="items-center">
          <CardTitle className="text-xl">Enter your code</CardTitle>
          <CardDescription className="text-center">
            Open your authenticator app and enter the 6-digit code for Tora.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-5">
          {error && <FormAlert>{error}</FormAlert>}
          <View className="gap-2">
            <Label nativeID="code-label">Code</Label>
            <Input
              aria-labelledby="code-label"
              value={code}
              onChangeText={onChange}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={6}
              placeholder="123456"
              autoFocus
              editable={!pending}
              className="h-12 text-center text-lg tracking-[0.3em]"
            />
          </View>
          <Button onPress={() => verify()} disabled={pending}>
            <Text>{pending ? 'Checking…' : 'Verify'}</Text>
          </Button>
          <Button variant="ghost" onPress={() => supabase.auth.signOut()}>
            <Text className="text-muted-foreground">Use a different account</Text>
          </Button>
        </CardContent>
      </Card>
    </AuthScreen>
  );
}

// A code from any of the user's confirmed authenticators works. Returns an error message, or nothing on success.
async function verifyWithAnyFactor(code: string): Promise<string | undefined> {
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return authErrorMessage(listError);

  let lastError: AuthError | null = null;
  for (const factor of factors.totp) {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (!error) return undefined;
    lastError = error;
  }
  return lastError ? authErrorMessage(lastError) : 'No authenticator is set up for this account.';
}
