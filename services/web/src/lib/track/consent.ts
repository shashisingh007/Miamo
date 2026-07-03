/**
 * Cookie + storage helpers + consent state machine.
 *
 * Consent is OPT-IN by default. The user must grant a scope before that
 * scope's events are queued. Pre-consent calls are silently dropped.
 * Scopes: 'analytics' (essential UX metrics), 'personalization' (preference
 * learning), 'marketing' (cross-site retargeting — currently unused).
 */

export type ConsentScope = 'analytics' | 'personalization' | 'marketing';

export type ConsentState = {
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
  region?: string;
  ts?: number;
};

export const COOKIE = 'mio_consent_v1';
const DEFAULT: ConsentState = { analytics: false, personalization: false, marketing: false };

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function readConsent(): ConsentState {
  if (!isBrowser()) return DEFAULT;
  try {
    const raw = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`));
    if (!raw) return DEFAULT;
    const val = decodeURIComponent(raw.slice(COOKIE.length + 1));
    const parsed = JSON.parse(val) as Partial<ConsentState>;
    return { ...DEFAULT, ...parsed };
  } catch {
    return DEFAULT;
  }
}

export function writeConsent(state: ConsentState): void {
  if (!isBrowser()) return;
  const value = encodeURIComponent(JSON.stringify({ ...state, ts: Date.now() }));
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE}=${value}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
}

export function clearConsent(): void {
  if (!isBrowser()) return;
  document.cookie = `${COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function hasConsent(scope: ConsentScope = 'analytics'): boolean {
  if (!isBrowser()) return false;
  // Global Do-Not-Track signal overrides everything except marketing-out.
  if (navigator.doNotTrack === '1' || (navigator as { msDoNotTrack?: string }).msDoNotTrack === '1') return false;
  if ((window as { doNotTrack?: string }).doNotTrack === '1') return false;
  const state = readConsent();
  return Boolean(state[scope]);
}

/** Coarse region hint used to pick the right consent UI flavor (DPDPA/GDPR/none). */
export function detectRegion(): string {
  if (!isBrowser()) return '';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta')) return 'IN';
    if (tz.startsWith('Europe/')) return 'EU';
    if (tz.startsWith('America/')) return 'US';
    return tz.split('/')[0] || '';
  } catch {
    return '';
  }
}
