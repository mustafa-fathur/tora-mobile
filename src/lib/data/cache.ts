// A tiny in-memory cache for screen data. Screens show the last result right away
// and refresh in the background, so the Add sheet opens without waiting on the network.
//
// Keys look like "accounts" or "transactions:2026-11:<account>:<search>". After a
// save, edit or delete, call invalidate('transactions', 'accounts'): cached results
// for those keys are dropped and every screen showing them reloads, even tabs that
// aren't in view. Cleared on logout (see providers/session.tsx).
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

const results = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Set<(matches: (key: string) => boolean) => void>();

/** Loads once per key at a time; stores the result for the next screen that asks. */
export function load<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const running = inflight.get(key);
  if (running) return running as Promise<T>;
  const promise = loader()
    .then((value) => {
      if (inflight.get(key) === promise) results.set(key, value);
      return value;
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

/** Marks data as changed: "transactions" matches "transactions" and "transactions:…". */
export function invalidate(...prefixes: string[]) {
  const matches = (key: string) => prefixes.some((p) => key === p || key.startsWith(`${p}:`));
  for (const key of [...results.keys()]) if (matches(key)) results.delete(key);
  for (const key of [...inflight.keys()]) if (matches(key)) inflight.delete(key);
  for (const listener of listeners) listener(matches);
}

export function clearCache() {
  results.clear();
  inflight.clear();
}

/**
 * Data for a screen: the cached value immediately, then fresh data each time the
 * screen comes into view (a "focus" in React Navigation terms) or the data is invalidated.
 * `key` must change whenever the loader's inputs change (e.g. include the month).
 */
export function useCachedData<T>(key: string, loader: () => Promise<T>) {
  const [state, setState] = useState<{ key: string; value: T } | undefined>(() =>
    results.has(key) ? { key, value: results.get(key) as T } : undefined,
  );
  const [error, setError] = useState<{ key: string; message: string }>();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const value = await load(key, loader);
      setState({ key, value });
      setError(undefined);
    } catch {
      setError({ key, message: "Couldn't load your data. Check your connection and try again." });
    } finally {
      setRefreshing(false);
    }
    // `key` identifies the loader's inputs, so it's the only dependency that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const listener = (matches: (k: string) => boolean) => {
      if (matches(key)) refresh();
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [key, refresh]);

  // Only show data for the current key (not last month's list while this month loads).
  const data = state?.key === key ? state.value : (results.get(key) as T | undefined);
  return { data, error: error?.key === key ? error.message : undefined, refreshing, refresh };
}
