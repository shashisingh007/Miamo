// Miamo Mobile — Discover store.
// In-flight card index + filter preferences. Mirrors web's useDiscoveryStore
// (services/web/src/stores/index.ts). Not persisted — fresh on cold boot.
import { create } from 'zustand';

export interface DiscoverFilterPrefs {
  ageRange: [number, number];
  distance: number;
  seriousOnly: boolean;
  verifiedOnly: boolean;
}

interface DiscoverState {
  currentIndex: number;
  cards: any[];
  filters: DiscoverFilterPrefs;
  setCards: (cards: any[]) => void;
  setIndex: (i: number) => void;
  nextProfile: () => void;
  setFilters: (f: Partial<DiscoverFilterPrefs>) => void;
  reset: () => void;
}

const INITIAL_FILTERS: DiscoverFilterPrefs = {
  ageRange: [21, 35],
  distance: 50,
  seriousOnly: false,
  verifiedOnly: false,
};

export const useDiscoverStore = create<DiscoverState>(set => ({
  currentIndex: 0,
  cards: [],
  filters: INITIAL_FILTERS,
  setCards: cards => set({ cards, currentIndex: 0 }),
  setIndex: i => set({ currentIndex: i }),
  nextProfile: () => set(s => ({ currentIndex: s.currentIndex + 1 })),
  setFilters: f => set(s => ({ filters: { ...s.filters, ...f } })),
  reset: () => set({ currentIndex: 0, cards: [], filters: INITIAL_FILTERS }),
}));
