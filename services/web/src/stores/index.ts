import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Auth Store ──────────────────────────────────────────
interface AuthState {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: any, token: string) => void;
  updateUser: (data: Partial<any>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        if (typeof window !== 'undefined') localStorage.setItem('miamo_token', token);
        set({ user, token, isAuthenticated: true });
      },
      updateUser: (data) =>
        set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
      clearAuth: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('miamo_token');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    { name: 'miamo-auth', partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
);

// ─── Theme Store ─────────────────────────────────────────
interface ThemeState {
  theme: 'dark' | 'light' | 'system';
  setTheme: (t: 'dark' | 'light' | 'system') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'miamo-theme' }
  )
);

// ─── Discovery Store ─────────────────────────────────────
interface DiscoveryState {
  currentIndex: number;
  filters: {
    ageRange: [number, number];
    distance: number;
    seriousOnly: boolean;
    verifiedOnly: boolean;
  };
  setIndex: (i: number) => void;
  nextProfile: () => void;
  setFilters: (f: Partial<DiscoveryState['filters']>) => void;
}

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  currentIndex: 0,
  filters: { ageRange: [21, 35], distance: 50, seriousOnly: false, verifiedOnly: false },
  setIndex: (i) => set({ currentIndex: i }),
  nextProfile: () => set((s) => ({ currentIndex: s.currentIndex + 1 })),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
}));
