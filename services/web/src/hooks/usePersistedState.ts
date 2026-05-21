'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

/**
 * Hook that persists state to the backend UserData table.
 * On mount, loads the latest record of the given `type` from the API.
 * On state changes, debounces and upserts to the backend.
 *
 * @param type - The UserData type discriminator (e.g. 'love_language_result')
 * @param initialValue - Default value if no persisted data found
 * @param options.debounceMs - Debounce delay before saving (default: 800ms)
 * @param options.loadOnMount - Whether to load from backend on mount (default: true)
 */
export function usePersistedState<T>(
  type: string,
  initialValue: T,
  options?: { debounceMs?: number; loadOnMount?: boolean }
): [T, (value: T | ((prev: T) => T)) => void, { loading: boolean; saving: boolean; loaded: boolean }] {
  const { debounceMs = 800, loadOnMount = true } = options || {};
  const [state, setState] = useState<T>(initialValue);
  const [loading, setLoading] = useState(loadOnMount);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const skipNextSaveRef = useRef(false);

  // Load from backend on mount
  useEffect(() => {
    if (!loadOnMount) { setLoading(false); setLoaded(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getUserData(type, 1);
        if (cancelled) return;
        const items = res?.data || res;
        if (Array.isArray(items) && items.length > 0 && items[0].data != null) {
          skipNextSaveRef.current = true;
          setState(items[0].data as T);
        }
      } catch (e) {
        // Silently fail — use initial value
        if (process.env.NODE_ENV === 'development') console.warn(`[usePersistedState] failed to load ${type}:`, e);
      } finally {
        if (!cancelled) { setLoading(false); setLoaded(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [type, loadOnMount]);

  // Debounced save to backend
  useEffect(() => {
    if (!loaded) return; // Don't save until initial load completes
    if (skipNextSaveRef.current) { skipNextSaveRef.current = false; return; }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;
      setSaving(true);
      try {
        await api.upsertUserData(type, state);
      } catch (e) {
        if (process.env.NODE_ENV === 'development') console.warn(`[usePersistedState] failed to save ${type}:`, e);
      } finally {
        if (mountedRef.current) setSaving(false);
      }
    }, debounceMs);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [state, type, debounceMs, loaded]);

  // Cleanup
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  return [state, setState, { loading, saving, loaded }];
}

/**
 * Hook to persist a list of items (append-only style).
 * Loads all records of a given type on mount, appends new items via saveUserData.
 */
export function usePersistedList<T>(
  type: string
): {
  items: T[];
  loading: boolean;
  addItem: (item: T) => Promise<void>;
  removeItem: (index: number) => void;
  loaded: boolean;
} {
  const [items, setItems] = useState<T[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getUserData(type, 100);
        if (cancelled) return;
        const records = res?.data || res;
        if (Array.isArray(records)) {
          setItems(records.map((r: any) => r.data as T));
          setIds(records.map((r: any) => r.id));
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') console.warn(`[usePersistedList] failed to load ${type}:`, e);
      } finally {
        if (!cancelled) { setLoading(false); setLoaded(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [type]);

  const addItem = useCallback(async (item: T) => {
    setItems(prev => [item, ...prev]);
    try {
      const res = await api.saveUserData(type, item);
      const record = res?.data || res;
      if (record?.id) setIds(prev => [record.id, ...prev]);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.warn(`[usePersistedList] failed to add item:`, e);
    }
  }, [type]);

  const removeItem = useCallback(async (index: number) => {
    const id = ids[index];
    setItems(prev => prev.filter((_, i) => i !== index));
    setIds(prev => prev.filter((_, i) => i !== index));
    if (id) {
      try { await api.deleteUserData(id); } catch (e) {
        if (process.env.NODE_ENV === 'development') console.warn(`[usePersistedList] failed to delete item:`, e);
      }
    }
  }, [ids]);

  return { items, loading, addItem, removeItem, loaded };
}
