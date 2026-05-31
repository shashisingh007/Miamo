import { describe, it, expect } from 'vitest';
import { verifyJwtClaims } from '../jwtVerifyClaims';

const NOW_MS = 1_700_000_000_000;
const NOW_S = Math.floor(NOW_MS / 1000);

describe('jwtVerifyClaims', () => {
  it('happy path', () => {
    const r = verifyJwtClaims(
      { sub: 'u1', iss: 'miamo', aud: 'web', exp: NOW_S + 60, nbf: NOW_S - 10, iat: NOW_S - 10 },
      { nowMs: NOW_MS, issuer: 'miamo', audience: 'web' },
    );
    expect(r.ok).toBe(true);
  });

  it('missing claims object', () => {
    expect(verifyJwtClaims(null as any, { nowMs: NOW_MS }).ok).toBe(false);
    expect((verifyJwtClaims(undefined as any, { nowMs: NOW_MS }) as any).reason).toBe('missing_claims');
  });

  it('requires sub by default', () => {
    expect((verifyJwtClaims({}, { nowMs: NOW_MS }) as any).reason).toBe('missing_sub');
  });

  it('requireSub=false skips sub check', () => {
    expect(verifyJwtClaims({}, { nowMs: NOW_MS, requireSub: false }).ok).toBe(true);
  });

  it('bad issuer', () => {
    const r = verifyJwtClaims({ sub: 'u', iss: 'evil' }, { nowMs: NOW_MS, issuer: ['miamo'] });
    expect((r as any).reason).toBe('bad_issuer');
  });

  it('bad audience (array claim, none match)', () => {
    const r = verifyJwtClaims(
      { sub: 'u', aud: ['ios', 'android'] },
      { nowMs: NOW_MS, audience: 'web' },
    );
    expect((r as any).reason).toBe('bad_audience');
  });

  it('aud accepted if any of array matches', () => {
    const r = verifyJwtClaims(
      { sub: 'u', aud: ['ios', 'web'] },
      { nowMs: NOW_MS, audience: ['web'] },
    );
    expect(r.ok).toBe(true);
  });

  it('expired', () => {
    const r = verifyJwtClaims({ sub: 'u', exp: NOW_S - 1000 }, { nowMs: NOW_MS });
    expect((r as any).reason).toBe('expired');
  });

  it('clock skew tolerates just-expired token', () => {
    const r = verifyJwtClaims({ sub: 'u', exp: NOW_S - 30 }, { nowMs: NOW_MS, clockSkewSeconds: 60 });
    expect(r.ok).toBe(true);
  });

  it('not yet valid (nbf in future beyond skew)', () => {
    const r = verifyJwtClaims({ sub: 'u', nbf: NOW_S + 500 }, { nowMs: NOW_MS, clockSkewSeconds: 60 });
    expect((r as any).reason).toBe('not_yet_valid');
  });

  it('too_old when iat older than maxAgeSeconds', () => {
    const r = verifyJwtClaims(
      { sub: 'u', iat: NOW_S - 3600 },
      { nowMs: NOW_MS, maxAgeSeconds: 600, clockSkewSeconds: 0 },
    );
    expect((r as any).reason).toBe('too_old');
  });
});
