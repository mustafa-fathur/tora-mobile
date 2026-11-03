// A tiny in-memory cache for screen data. Screens show the last result right away
// and refresh in the background, so the Add sheet opens without waiting on the network.
// Cleared on logout (see providers/session.tsx).
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

const results = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

/** Loads once per key at a time; stores the result for the next screen that asks. */
export function load<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const running = inflight.get(key);
  if (running) return running as Promise<T>;
  const promise = loader()
    .then((value) => {
      results.set(key, value);
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export function clearCache() {
  results.clear();
  inflight.clear();
}

/**
 * Data for a screen: the cached value immediately, then fresh data each time
 * the screen comes into view (a "focus" in React Navigation terms).
 */
export function useCachedData<T>(key: string, loader: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(() => results.get(key) as T | undefined);
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await load(key, loader));
      setError(undefined);
    } catch {
      setError("Couldn't load your data. Check your connection and try again.");
    } finally {
      setRefreshing(false);
    }
    // The loader is a stable module function in practice; key identifies it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { data, error, refreshing, refresh };
}
