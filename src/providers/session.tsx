import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { clearCache } from '@/lib/data/cache';
import { supabase } from '@/lib/supabase/client';

type SessionState = {
  /** True until the saved login (if any) has been read from the phone. */
  isLoading: boolean;
  session: Session | null;
  /** Logged in with the password, but the authenticator code is still owed. */
  needsTwoFactor: boolean;
};

const SessionContext = createContext<SessionState | null>(null);

/** Current login state. Use inside <SessionProvider>. */
export function useSession() {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

/**
 * Keeps the Supabase login in React state so screens re-render when you log in or out.
 * React "context" passes a value down to every screen without threading it through props.
 */
export function SessionProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    // Fires on login, logout, token refresh and after the 2FA code is accepted.
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // Don't show one person's cached data to the next person who logs in.
      if (event === 'SIGNED_OUT') clearCache();
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext value={{ isLoading, session, needsTwoFactor: owesTwoFactor(session) }}>
      {children}
    </SessionContext>
  );
}

// Same rule as the web: a user with a confirmed authenticator must reach `aal2`
// (password + code) before the database returns any rows.
function owesTwoFactor(session: Session | null): boolean {
  if (!session) return false;
  const hasAuthenticator = session.user.factors?.some((f) => f.status === 'verified') ?? false;
  return hasAuthenticator && tokenLevel(session.access_token) !== 'aal2';
}

// Reads the `aal` claim from the login token (a JWT) without a network call.
function tokenLevel(jwt: string): string | undefined {
  try {
    const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded)).aal;
  } catch {
    return undefined;
  }
}
