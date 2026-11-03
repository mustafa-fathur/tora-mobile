// Small settings kept on the phone (in expo-sqlite's localStorage, the same
// storage the Supabase session uses). Per user, so a shared phone doesn't mix them.
import '@/lib/supabase/client'; // installs localStorage

const lastAccountKey = (userId: string) => `tora:last-account:${userId}`;

export function getLastAccountId(userId: string): string | null {
  try {
    return localStorage.getItem(lastAccountKey(userId));
  } catch {
    return null;
  }
}

export function setLastAccountId(userId: string, accountId: string) {
  try {
    localStorage.setItem(lastAccountKey(userId), accountId);
  } catch {
    // Not important enough to bother the user.
  }
}
