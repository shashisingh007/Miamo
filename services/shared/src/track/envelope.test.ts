import { describe, it, expect } from 'vitest';
import { EnvelopeSchema } from '../../../ingest/src/validate';
import { hashUid } from '../../../ingest/src/hash';
import { SCHEMA_VERSION } from './events';

describe('track envelope contract', () => {
  it('accepts a valid envelope', () => {
    const r = EnvelopeSchema.safeParse({
      ctx: { v: SCHEMA_VERSION, did: 'dev-xxxxxxxx', sid: 'ses-xxxxxxxx' },
      evts: [{ e: 'page.view', t: 1, n: 0 }],
    });
    expect(r.success).toBe(true);
  });

  it('rejects bad schema version', () => {
    const r = EnvelopeSchema.safeParse({
      ctx: { v: 99, did: 'dev-xxxxxxxx', sid: 'ses-xxxxxxxx' },
      evts: [{ e: 'page.view', t: 1, n: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it('rejects empty batch', () => {
    const r = EnvelopeSchema.safeParse({
      ctx: { v: SCHEMA_VERSION, did: 'dev-xxxxxxxx', sid: 'ses-xxxxxxxx' },
      evts: [],
    });
    expect(r.success).toBe(false);
  });
});

describe('hashUid', () => {
  it('returns empty for empty', () => {
    expect(hashUid('')).toBe('');
    expect(hashUid(undefined)).toBe('');
  });
  it('is stable for the same id', () => {
    expect(hashUid('user-1')).toBe(hashUid('user-1'));
  });
  it('changes with the input', () => {
    expect(hashUid('user-1')).not.toBe(hashUid('user-2'));
  });
});
