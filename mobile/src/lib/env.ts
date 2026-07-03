// Miamo Mobile — env config (Expo SDK 52).
// Mirrors the web app's approach (see services/web/src/lib/api.ts) — the web
// reads NEXT_PUBLIC_API_URL. On Expo we read EXPO_PUBLIC_API_URL first
// (statically inlined at build time by Metro), then fall back to `Constants.
// expoConfig.extra.apiUrl` (set from eas.json's env for preview/prod builds),
// then a per-platform sensible default for local dev.
//
// Ordering (highest priority first):
//   1. `process.env.EXPO_PUBLIC_API_URL` — set via .env or eas.json env.
//   2. `Constants.expoConfig?.extra?.apiUrl` — for hand-configured overrides.
//   3. `global.MIAMO_API_URL` — legacy escape hatch for native-shim overrides.
//   4. Fallback per platform — Android emulator hits 10.0.2.2, iOS hits localhost.
import { Platform } from 'react-native';
import Constants from 'expo-constants';

declare const global: { MIAMO_API_URL?: string; MIAMO_ENV?: string };

const constantExtra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const API_URL: string =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  (constantExtra.apiUrl as string | undefined) ||
  (typeof global !== 'undefined' && global.MIAMO_API_URL) ||
  process.env.MIAMO_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3200' : 'http://localhost:3200');

export const ENVIRONMENT: 'dev' | 'staging' | 'prod' =
  (process.env.EXPO_PUBLIC_MIAMO_ENV as 'dev' | 'staging' | 'prod') ||
  (constantExtra.env as 'dev' | 'staging' | 'prod') ||
  (global?.MIAMO_ENV as 'dev' | 'staging' | 'prod') ||
  (process.env.MIAMO_ENV as 'dev' | 'staging' | 'prod') ||
  'dev';

// Feature-flag mirror — parity with web's `NEXT_PUBLIC_*` toggles. Kept
// intentionally minimal: server-side flag responses are authoritative; these
// are just UI hints for coming-soon states.
export const FEATURE_FLAGS = {
  moveV2Enabled: true,
  weeklyTopEnabled: true,
  trustScoreEnabled: true,
  familyBriefSharesEnabled: true,
  aiMoveComposerEnabled: true,
  progressiveDisclosureEnabled: true,
} as const;

export const APP_VERSION = (Constants.expoConfig?.version as string | undefined) || '0.1.0';
