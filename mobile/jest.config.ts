// Miamo Mobile — Jest config (Expo SDK 52).
// - Uses the jest-expo preset which wires up TSX transformers + native
//   module mocks for the whole Expo family (expo-notifications, expo-secure-
//   store, expo-splash-screen, etc.).
// - Component tests use @testing-library/react-native.
// - Contract tests are skipped unless RUN_CONTRACT_TESTS=1 (need live backend).
// - Detox specs live under tests/e2e and are run via `detox test`, NOT jest.
import type { Config } from 'jest';

const runContract = process.env.RUN_CONTRACT_TESTS === '1';

const config: Config = {
  preset: 'jest-expo',
  // `setupFilesAfterEnv` runs after Jest's test framework is initialised, so
  // globals like `expect` and `jest.mock` are available. `setupFiles` runs
  // BEFORE the framework, which is too early for @testing-library/jest-native/
  // extend-expect (it references `expect`).
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/unit/**/*.test.tsx',
    '<rootDir>/tests/component/**/*.test.tsx',
    '<rootDir>/tests/feature-parity.test.ts',
    ...(runContract ? ['<rootDir>/tests/contract/**/*.test.ts'] : []),
  ],
  testPathIgnorePatterns: ['<rootDir>/tests/e2e/', '/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand)',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};

export default config;
