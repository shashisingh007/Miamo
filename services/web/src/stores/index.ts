import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Auth Store ──────────────────────────────────────────
interface AuthState {
 user: any | null;
 token: string | null;
 refreshToken: string | null;
 isAuthenticated: boolean;
 setAuth: (user: any, token: string, refreshToken?: string | null) => void;
 setTokens: (token: string, refreshToken?: string | null) => void;
 updateUser: (data: Partial<any>) => void;
 clearAuth: () => void;
}

/**
 * Zustand store for authentication state.
 * Persisted to `localStorage` under key `"miamo-auth"`.
 * Manages the current user object, JWT token, and authentication status.
 */
export const useAuthStore = create<AuthState>()(
 persist(
 (set) => ({
 user: null,
 token: null,
 refreshToken: null,
 isAuthenticated: false,
 setAuth: (user, token, _refreshToken) => {
 // Access token is held in memory only (XSS hardening). Refresh token
 // lives in an httpOnly cookie set server-side. Nothing token-related
 // is written to JS-readable storage.
 if (typeof window !== 'undefined') {
 localStorage.removeItem('miamo_token');
 localStorage.removeItem('miamo_refresh_token');
 }
 set({ user, token, refreshToken: null, isAuthenticated: true });
 },
 setTokens: (token, _refreshToken) => {
 if (typeof window !== 'undefined') {
 localStorage.removeItem('miamo_token');
 localStorage.removeItem('miamo_refresh_token');
 }
 set({ token, refreshToken: null });
 },
 updateUser: (data) =>
 set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),
 clearAuth: () => {
 if (typeof window !== 'undefined') {
 localStorage.removeItem('miamo_token');
 localStorage.removeItem('miamo_refresh_token');
 }
 set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
 },
 }),
 { name: 'miamo-auth', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
 )
);

// ─── Theme Store ─────────────────────────────────────────
interface ThemeState {
 theme: 'dark' | 'light' | 'system';
 setTheme: (t: 'dark' | 'light' | 'system') => void;
}

/**
 * Zustand store for theme preference (dark/light/system).
 * Persisted to `localStorage` under key `"miamo-theme"`.
 */
export const useThemeStore = create<ThemeState>()(
 persist(
 (set) => ({
 theme: 'light',
 setTheme: (theme) => {
 set({ theme });
 },
 }),
 { name: 'miamo-theme' }
 )
);

// ─── Discovery Store (currently unused, kept for future use) ──
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

/**
 * Zustand store for discovery page state (card index, filter preferences).
 * Not persisted — resets on page reload. Reserved for future swipe-card UI.
 */
export const useDiscoveryStore = create<DiscoveryState>((set) => ({
 currentIndex: 0,
 filters: { ageRange: [21, 35], distance: 50, seriousOnly: false, verifiedOnly: false },
 setIndex: (i) => set({ currentIndex: i }),
 nextProfile: () => set((s) => ({ currentIndex: s.currentIndex + 1 })),
 setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
}));
