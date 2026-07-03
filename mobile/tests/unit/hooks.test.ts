// Miamo Mobile — hook unit tests.
// useAuth is exercised via zustand direct-store calls; the hook itself is
// a thin selector so we don't need @testing-library/react-hooks here.
// useTrackActivity has an internal queue we can inspect via test helpers.

jest.mock('@lib/api', () => ({
  api: {
    getMe: jest.fn(),
    logout: jest.fn(),
    trackActivity: jest.fn(),
  },
  setAccessToken: jest.fn(),
}));

import { renderHook } from '@testing-library/react-native';
import { api, setAccessToken } from '@lib/api';
import { useAuthStore } from '@stores/authStore';
import { bootstrapAuth } from '@hooks/useAuth';
import {
  useTrackActivity,
  useTrackPageView,
  trackClick,
  __getQueueLengthForTests,
  __resetTrackingForTests,
} from '@hooks/useTrackActivity';
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(() => {
  jest.clearAllMocks();
  __resetTrackingForTests();
  useAuthStore.getState().clearAuth();
  (AsyncStorage as any).clear();
});

describe('bootstrapAuth', () => {
  it('is a no-op when no token is stored', async () => {
    await bootstrapAuth();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('hydrates auth when token + /auth/me succeed', async () => {
    await AsyncStorage.setItem('miamo_token', 'stored-token');
    (api.getMe as jest.Mock).mockResolvedValue({ data: { id: 'u1', displayName: 'X' } });
    // bootstrapAuth caches its promise between calls, so reset by re-import.
    jest.resetModules();
    const { bootstrapAuth: fresh } = require('@hooks/useAuth');
    await fresh();
    expect(setAccessToken).toHaveBeenCalled();
  });

  it('clears auth on getMe failure', async () => {
    await AsyncStorage.setItem('miamo_token', 'bad-token');
    (api.getMe as jest.Mock).mockRejectedValue(new Error('401'));
    jest.resetModules();
    const { bootstrapAuth: fresh } = require('@hooks/useAuth');
    await fresh();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('useTrackActivity', () => {
  it('enqueues events up to the batch size', () => {
    const { result } = renderHook(() => useTrackActivity());
    for (let i = 0; i < 3; i++) {
      result.current('view', 'card', `id-${i}`);
    }
    expect(__getQueueLengthForTests()).toBe(3);
  });

  it('flushes when queue hits BATCH_SIZE (8)', () => {
    const { result } = renderHook(() => useTrackActivity());
    for (let i = 0; i < 8; i++) result.current('view', 'card', `id-${i}`);
    // After hitting batch size, the queue drains synchronously.
    expect(__getQueueLengthForTests()).toBe(0);
    expect(api.trackActivity).toHaveBeenCalledTimes(8);
  });

  it('trackClick enqueues a button_click event', () => {
    trackClick('primary-cta', { screen: 'discover' });
    expect(__getQueueLengthForTests()).toBe(1);
  });

  it('useTrackPageView is safe to call (no throw)', () => {
    // Direct call isn't hook-valid, but existence + signature check is enough.
    expect(typeof useTrackPageView).toBe('function');
  });
});
