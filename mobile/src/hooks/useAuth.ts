// Miamo Mobile — useAuth + bootstrap.
// bootstrapAuth() re-hydrates the in-memory access token from AsyncStorage
// on cold start. It's called once from App.tsx. useAuth() is the React hook
// screens use to observe authenticated state (isAuthenticated) and dispatch
// setAuth / clearAuth.
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAccessToken, api } from '@lib/api';
import { useAuthStore } from '@stores/authStore';

let _bootstrapPromise: Promise<void> | null = null;

/**
 * Bootstraps auth state from AsyncStorage. Idempotent — subsequent calls
 * return the same in-flight promise. Fetches /auth/me to validate the token
 * on a cold start; clears auth on 401. Safe to call from App.tsx useEffect.
 */
export function bootstrapAuth(): Promise<void> {
  if (_bootstrapPromise) return _bootstrapPromise;
  _bootstrapPromise = (async () => {
    try {
      const [token, refresh] = await Promise.all([
        AsyncStorage.getItem('miamo_token'),
        AsyncStorage.getItem('miamo_refresh_token'),
      ]);
      if (token) {
        setAccessToken(token);
        try {
          const me = await api.getMe();
          if (me?.data) {
            useAuthStore.getState().setAuth(me.data, token, refresh);
            return;
          }
        } catch {
          // Fall through to clearAuth below.
        }
      }
      useAuthStore.getState().clearAuth();
    } catch {
      useAuthStore.getState().clearAuth();
    }
  })();
  return _bootstrapPromise;
}

export function useAuth() {
  const { user, isAuthenticated, token, setAuth, clearAuth, updateUser } = useAuthStore();
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Swallow — offline logout still clears local state.
    }
    clearAuth();
  }, [clearAuth]);
  return {
    user,
    token,
    isAuthenticated,
    setAuth,
    clearAuth,
    updateUser,
    logout,
  };
}
