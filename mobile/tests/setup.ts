// Miamo Mobile — Jest global setup (Expo SDK 52).
// The jest-expo preset already mocks the majority of Expo modules; we only
// mock what isn't covered (AsyncStorage, deck-swiper, react-navigation
// container). Component tests import screens directly, so these mocks must
// be in place before any test file evaluates.

import '@testing-library/jest-native/extend-expect';

// AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Deck swiper — passthrough View so component tests can render it.
jest.mock('react-native-deck-swiper', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef(function Swiper(props: any, _ref: any) {
      return React.createElement(View, { testID: 'swiper' }, props.children);
    }),
  };
});

// Expo notifications — jest-expo mocks the low-level bridge, but the
// module's exported helpers (setNotificationHandler, get/requestPermissions
// Async, getExpoPushTokenAsync) still need explicit no-op returns for our
// push.ts unit tests to run headlessly.
jest.mock('expo-notifications', () => ({
  __esModule: true,
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[mock]' }),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('expo-device', () => ({
  __esModule: true,
  isDevice: true,
  osName: 'iOS',
  osVersion: '17.0',
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { eas: { projectId: 'mock-eas-project-id' } } },
    easConfig: { projectId: 'mock-eas-project-id' },
  },
}));

jest.mock('expo-splash-screen', () => ({
  __esModule: true,
  preventAutoHideAsync: jest.fn().mockResolvedValue(true),
  hideAsync: jest.fn().mockResolvedValue(true),
}));

// react-navigation containers rely on native modules that don't run in the
// jest environment. Provide a stub NavigationContainer for component tests
// that render screens standalone (route-driven behaviour is covered by e2e).
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const React = require('react');
  return {
    ...actual,
    NavigationContainer: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() }),
    useRoute: () => ({ params: {} }),
    useFocusEffect: (cb: any) => {
      React.useEffect(() => (cb ? cb() : undefined), []);
    },
  };
});

// Suppress noisy warnings.
const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const s = String(args[0] || '');
  if (s.includes('Animated:') || s.includes('useNativeDriver')) return;
  origWarn(...(args as [unknown]));
};
