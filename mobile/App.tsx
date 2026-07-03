// Miamo Mobile — root App component (Expo SDK 52).
// Wires SafeAreaProvider, GestureHandlerRootView (required for reanimated),
// status-bar, and the top-level navigator. Also bootstraps auth (rehydrates
// tokens from AsyncStorage) and fires push-token registration on cold start.
import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppNavigator from '@/navigation/AppNavigator';
import { bootstrapAuth } from '@hooks/useAuth';
import { registerDevice } from '@lib/push';

// Keep the splash visible while we finish hydrating auth. If this fails
// (e.g. because Expo Go's runtime already hid it), we swallow — the hide
// call below will no-op cleanly.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  useEffect(() => {
    (async () => {
      // Order matters: rehydrate auth first so registerDevice() can see the
      // in-memory access token. Push registration is best-effort; a failure
      // here (permission denied, no project id) must never block launch.
      try {
        await bootstrapAuth();
      } catch {
        // no-op — user will see the Auth screen
      }
      try {
        await registerDevice();
      } catch {
        // no-op — app still works without push
      }
      try {
        await SplashScreen.hideAsync();
      } catch {
        // no-op — Expo Go may have already hidden it
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
