// Miamo Mobile — Matches store.
// Holds current matches, incoming likes, and match-requests. Lightweight —
// heavy lifting lives on the backend. UI screens call `refresh()` on mount
// and after mutations (like accept/reject/unmatch).
import { create } from 'zustand';
import { api } from '@lib/api';

interface MatchesState {
  matches: any[];
  incoming: any[];
  requests: any[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  removeMatch: (id: string) => void;
  setMatches: (matches: any[]) => void;
}

export const useMatchesStore = create<MatchesState>(set => ({
  matches: [],
  incoming: [],
  requests: [],
  loading: false,
  error: null,
  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [matches, incoming] = await Promise.all([
        api.getMatches(),
        api.getIncomingLikes().catch(() => ({ data: [] })),
      ]);
      set({
        matches: matches?.data ?? [],
        incoming: incoming?.data ?? [],
        loading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },
  removeMatch: id =>
    set(state => ({ matches: state.matches.filter((m: any) => m.id !== id) })),
  setMatches: matches => set({ matches }),
}));
