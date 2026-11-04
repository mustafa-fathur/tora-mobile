// Settings → Security: two-factor login with an authenticator app (TOTP), like the
// web. Setup on a phone: open the authenticator via its otpauth:// link, or type the
// key; then confirm with the first 6-digit code. https://supabase.com/docs/guides/auth/auth-mfa/totp
import { useFocusEffect } from 'expo-router';
import { ExternalLink, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, View } from 'react-native';

import { FormAlert } from '@/components/form-alert';
import { ListGroup, ListHeader, ListSkeleton, RowSeparator } from '@/components/list';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { authErrorMessage } from '@/lib/auth/errors';
import { checkCode, groupSecret, nextAuthenticatorName } from '@/lib/auth/totp';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/lib/supabase/client';

type Factor = { id: string; friendly_name?: string | null; created_at: string };
type Setup = { factorId: string; uri: string; secret: string };

export default function SecurityScreen() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.auth.mfa.listFactors();
    if (e) return setError(authErrorMessage(e));
    setFactors(data.totp);
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function start() {
    setBusy(true);
    setError(undefined);
    const { data: list, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      setBusy(false);
      return setError(authErrorMessage(listError));
    }
    // Clear half-finished setups, then pick an unused name (same as the web).
    for (const f of list.all) if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error: e } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: nextAuthenticatorName(list.totp.map((f) => f.friendly_name)),
      issuer: 'Tora',
    });
    setBusy(false);
    if (e) return setError(authErrorMessage(e));
    setSetup({ factorId: data.id, uri: data.totp.uri, secret: data.totp.secret });
  }

  async function confirm() {
    if (!setup) return;
    const c = checkCode(code);
    if (!c.ok) return setError(c.message);
    setBusy(true);
    setError(undefined);
    const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId: setup.factorId, code: c.code });
    setBusy(false);
    if (e) return setError(authErrorMessage(e));
    haptics.success();
    setSetup(null);
    setCode('');
    load();
  }

  async function cancel() {
    if (setup) await supabase.auth.mfa.unenroll({ factorId: setup.factorId });
    setSetup(null);
    setCode('');
    setError(undefined);
  }

  function remove(f: Factor) {
    haptics.warning();
    Alert.alert(
      `Remove ${f.friendly_name ?? 'this authenticator'}?`,
      factors && factors.length === 1 ? 'Logging in will only need your password.' : 'Codes from it will stop working.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error: e } = await supabase.auth.mfa.unenroll({ factorId: f.id });
            if (e) return setError(authErrorMessage(e));
            haptics.success();
            load();
          },
        },
      ],
    );
  }

  if (!factors) return error ? <View className="p-4"><FormAlert>{error}</FormAlert></View> : <ListSkeleton rows={3} />;
  const on = factors.length > 0;

  return (
    <ScrollView className="flex-1 bg-muted" contentContainerClassName="pb-10" keyboardShouldPersistTaps="handled">
      <View className="items-center gap-2 border-b border-border bg-background px-6 py-6">
        <Icon as={on ? ShieldCheck : ShieldOff} size={36} className={on ? 'text-primary' : 'text-muted-foreground'} />
        <Text className="text-lg font-semibold">Two-factor login is {on ? 'on' : 'off'}</Text>
        <Text className="text-center text-sm text-muted-foreground">
          {on
            ? 'Logging in needs your password and a code from your authenticator app.'
            : 'Add an authenticator app (like Google Authenticator or 2FAS) so logging in also needs a code.'}
        </Text>
      </View>
      {error ? (
        <View className="px-4 pt-4">
          <FormAlert>{error}</FormAlert>
        </View>
      ) : null}

      {on && (
        <>
          <ListHeader title="Authenticators" />
          <ListGroup>
            {factors.map((f, i) => (
              <View key={f.id}>
                {i > 0 && <RowSeparator />}
                <View className="min-h-[52px] flex-row items-center gap-3 px-4">
                  <Text className="flex-1">{f.friendly_name ?? 'Authenticator'}</Text>
                  <Button variant="ghost" size="sm" onPress={() => remove(f)} accessibilityLabel={`Remove ${f.friendly_name ?? 'authenticator'}`}>
                    <Icon as={Trash2} size={16} className="text-destructive" />
                    <Text className="text-destructive">Remove</Text>
                  </Button>
                </View>
              </View>
            ))}
          </ListGroup>
        </>
      )}

      {setup ? (
        <View className="gap-4 px-4 pt-5">
          <Text className="font-semibold">1. Add Tora to your authenticator app</Text>
          <Button onPress={() => Linking.openURL(setup.uri).catch(() => setError('No authenticator app opened. Type the key below instead.'))}>
            <Icon as={ExternalLink} size={16} className="text-primary-foreground" />
            <Text>Open in authenticator app</Text>
          </Button>
          <Text className="text-sm text-muted-foreground">Or type this key in the app (long-press to copy):</Text>
          <Text selectable className="rounded-md bg-background px-3 py-3 text-center font-mono text-base tracking-wider">
            {groupSecret(setup.secret)}
          </Text>
          <Text className="font-semibold">2. Enter the 6-digit code it shows</Text>
          <Input
            value={code}
            onChangeText={(v) => setCode(v.replace(/[^\d ]/g, '').slice(0, 7))}
            keyboardType="number-pad"
            placeholder="123456"
            className="h-12 text-center text-lg tracking-[0.3em]"
            accessibilityLabel="Code from your authenticator app"
          />
          <Button onPress={confirm} disabled={busy}>
            <Text>{busy ? 'Checking…' : 'Turn on two-factor login'}</Text>
          </Button>
          <Button variant="ghost" onPress={cancel} disabled={busy}>
            <Text className="text-muted-foreground">Cancel</Text>
          </Button>
        </View>
      ) : (
        <View className="px-4 pt-5">
          <Button variant={on ? 'outline' : 'default'} onPress={start} disabled={busy}>
            <Icon as={ShieldCheck} size={16} className={on ? 'text-foreground' : 'text-primary-foreground'} />
            <Text>{busy ? 'Starting…' : on ? 'Add another authenticator' : 'Add an authenticator app'}</Text>
          </Button>
        </View>
      )}
    </ScrollView>
  );
}
