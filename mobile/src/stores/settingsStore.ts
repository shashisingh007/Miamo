// Miamo Mobile — Settings store.
// Fetched once at bootstrap; updates via optimistic-set → api.updateSettings.
// If the server rejects, we revert.
import { create } from 'zustand';
import { api } from '@lib/api';
import type { MiamoSettings } from '@lib/types';

interface SettingsState {
  settings: Partial<MiamoSettings> | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  update: (patch: Partial<MiamoSettings>) => Promise<void>;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,
  error: null,
  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.getSettings();
      set({ settings: res?.data ?? null, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },
  update: async patch => {
    const prev = get().settings;
    set({ settings: { ...(prev || {}), ...patch } });
    try {
      const res = await api.updateSettings(patch);
      if (res?.data) set({ settings: res.data });
    } catch (err) {
      set({ settings: prev, error: (err as Error).message });
    }
  },
  reset: () => set({ settings: null, loading: false, error: null }),
}));
