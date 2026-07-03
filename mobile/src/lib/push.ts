// Miamo Mobile — Push notification bootstrap (Expo SDK 52).
// - Uses expo-notifications for permissions + token retrieval.
// - Uses expo-device to short-circuit on simulators/emulators (Expo push
//   tokens are only issued on real devices).
// - Sends the resulting Expo push token to the backend under the correct
//   platform. The backend fans out via Expo's push API from a worker loop
//   (see services/notifications/src/pushClient.ts).
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api, getAccessTokenMemo } from './api';

// Foreground notification handler — mirrors the web permission model.
// The SDK 52 fields (shouldShowBanner + shouldShowList) supersede the
// deprecated shouldShowAlert but we keep it around for older SDKs so a
// downgrade doesn't silently break foreground alerts.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Ask the OS for push permission, fetch an Expo push token, and forward it
 * to the backend. Returns the token on success (for tests + logging) or
 * null when we can't or shouldn't register (simulator, permission denied,
 * unauthenticated, no EAS projectId). Never throws — the app must survive
 * a push-registration failure.
 */
export async function registerDevice(): Promise<string | null> {
  try {
    // Expo push tokens require a real device; simulators/emulators return
    // null from getExpoPushTokenAsync anyway, so short-circuit.
    if (!Device.isDevice) return null;

    // Only register when there's a session — parity with web (no anonymous
    // push subscriptions). Bootstrapping in App.tsx completes first, so a
    // null token here means the user hasn't signed in yet.
    if (!getAccessTokenMemo()) return null;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') return null;

    const projectId =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    if (!projectId) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!tokenData?.data) return null;
    const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
    try {
      await api.registerDevice({ platform, token: tokenData.data });
    } catch {
      // Silent — device registration is best-effort.
    }
    return tokenData.data;
  } catch {
    // Never crash on push failure.
    return null;
  }
}
