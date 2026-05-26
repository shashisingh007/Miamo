/**
 * Stable per-browser device id (cookie) and per-visit session id (sessionStorage).
 *
 * We intentionally avoid any kind of fingerprinting. The did is a random
 * ulid stored in a first-party cookie. Users can clear it at any time and a
 * fresh one is minted on the next visit.
 */
import { ulid } from './ulid';

const DID_COOKIE = 'mio_did_v1';
const SID_KEY = 'mio_sid_v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function getDeviceId(): string {
  if (!isBrowser()) return 'srv-' + Math.random().toString(36).slice(2, 14);
  const row = document.cookie.split('; ').find((c) => c.startsWith(`${DID_COOKIE}=`));
  if (row) return row.slice(DID_COOKIE.length + 1);
  const id = ulid();
  const twoYears = 60 * 60 * 24 * 365 * 2;
  document.cookie = `${DID_COOKIE}=${id}; Max-Age=${twoYears}; Path=/; SameSite=Lax`;
  return id;
}

export function getSessionId(): string {
  if (!isBrowser()) return 'srv-' + Math.random().toString(36).slice(2, 14);
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = ulid();
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    // Private mode / disabled storage — fall back to in-memory.
    const w = window as { __mioSid?: string };
    if (!w.__mioSid) w.__mioSid = ulid();
    return w.__mioSid;
  }
}

/** PII-stripped pathname: remove digits-only segments, uuids, emails. */
export function safePath(input?: string): string {
  if (!isBrowser() && !input) return '';
  const raw = input || window.location.pathname || '/';
  return raw
    .split('/')
    .map((seg) => {
      if (!seg) return seg;
      if (/^\d+$/.test(seg)) return ':id';
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return ':uuid';
      if (/@/.test(seg)) return ':email';
      if (seg.length > 64) return ':long';
      return seg;
    })
    .join('/');
}
