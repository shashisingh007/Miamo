/**
 * Build the wire envelope: ctx (one-shot per batch) + bounded evts.
 * Strips PII from path and ref. Caller is responsible for consent gating.
 */
import { SCHEMA_VERSION, type ContextHeader, type TrackEnvelope, type TrackEvent } from './types';
import { getDeviceId, getSessionId, safePath } from './device';

let cachedUid: string | undefined;
export function setUid(uid: string | undefined): void {
  cachedUid = uid;
}
export function getUid(): string | undefined {
  return cachedUid;
}

function safeRef(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  try {
    const r = document.referrer;
    if (!r) return undefined;
    return new URL(r).host || undefined;
  } catch {
    return undefined;
  }
}

function uaClientHint(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const hints = (navigator as { userAgentData?: { brands?: { brand: string; version: string }[] } }).userAgentData;
  if (hints?.brands?.length) {
    const b = hints.brands.find((x) => !/not.?a.?brand/i.test(x.brand)) || hints.brands[0];
    return `${b.brand}/${b.version}`;
  }
  // Fall back to a coarse string — no high-entropy fields.
  return navigator.userAgent?.split(' ').slice(0, 2).join(' ').slice(0, 96);
}

export function buildContext(consentScopes: string[]): ContextHeader {
  const ctx: ContextHeader = {
    v: SCHEMA_VERSION,
    did: getDeviceId(),
    sid: getSessionId(),
    uid: cachedUid,
    path: safePath(),
    ref: safeRef(),
    cs: consentScopes,
  };
  if (typeof window !== 'undefined') {
    ctx.vw = window.innerWidth;
    ctx.vh = window.innerHeight;
    ctx.dpr = window.devicePixelRatio || 1;
    try {
      ctx.loc = navigator.language;
      ctx.tzo = -new Date().getTimezoneOffset();
    } catch {
      // ignore
    }
  }
  ctx.ua = uaClientHint();
  return ctx;
}

export function buildEnvelope(events: TrackEvent[], consentScopes: string[]): TrackEnvelope {
  return { ctx: buildContext(consentScopes), evts: events };
}
