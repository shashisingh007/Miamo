// Miamo Mobile — Auth store.
// Ported from services/web/src/stores/index.ts (useAuthStore).
// Differences: uses AsyncStorage for the refresh token (RN has no
// localStorage/cookie split), and drives the shared in-memory access token
// via api.setAccessToken so the api client can read it without importing
// zustand (avoids a require-cycle).
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAccessToken } from '@lib/api';

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

export const useAuthStore = create<AuthState>()(set => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  setAuth: (user, token, refreshToken) => {
    setAccessToken(token);
    if (refreshToken) {
      AsyncStorage.setItem('miamo_refresh_token', refreshToken).catch(() => {});
    }
    set({ user, token, refreshToken: refreshToken ?? null, isAuthenticated: true });
  },
  setTokens: (token, refreshToken) => {
    setAccessToken(token);
    if (refreshToken) {
      AsyncStorage.setItem('miamo_refresh_token', refreshToken).catch(() => {});
    }
    set({ token, refreshToken: refreshToken ?? null });
  },
  updateUser: data =>
    set(state => ({ user: state.user ? { ...state.user, ...data } : null })),
  clearAuth: () => {
    setAccessToken(null);
    AsyncStorage.removeItem('miamo_token').catch(() => {});
    AsyncStorage.removeItem('miamo_refresh_token').catch(() => {});
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },
}));
