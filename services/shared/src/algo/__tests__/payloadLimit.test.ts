import { describe, it, expect } from 'vitest';
import { checkPayload } from '../payloadLimit';

describe('payloadLimit', () => {
  it('accepts a small JSON body', () => {
    const r = checkPayload({ contentLengthHeader: '128', contentTypeHeader: 'application/json' });
    expect(r).toEqual({ ok: true, bytes: 128, mediaType: 'application/json' });
  });

  it('strips charset / boundary parameters from content-type', () => {
    const r = checkPayload({ contentLengthHeader: '10', contentTypeHeader: 'application/json; charset=utf-8' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mediaType).toBe('application/json');
  });

  it('rejects missing content-length', () => {
    expect(checkPayload({ contentLengthHeader: null, contentTypeHeader: 'application/json' }))
      .toEqual({ ok: false, reason: 'missing_length' });
    expect(checkPayload({ contentLengthHeader: '', contentTypeHeader: 'application/json' }))
      .toEqual({ ok: false, reason: 'missing_length' });
  });

  it('rejects non-numeric / negative content-length', () => {
    expect(checkPayload({ contentLengthHeader: 'abc', contentTypeHeader: 'application/json' }).ok).toBe(false);
    expect(checkPayload({ contentLengthHeader: '-5', contentTypeHeader: 'application/json' }))
      .toEqual({ ok: false, reason: 'invalid_length' });
    expect(checkPayload({ contentLengthHeader: '1.5', contentTypeHeader: 'application/json' }))
      .toEqual({ ok: false, reason: 'invalid_length' });
  });

  it('rejects bodies over the budget', () => {
    const r = checkPayload({ contentLengthHeader: String(2 * 1024 * 1024), contentTypeHeader: 'application/json' });
    expect(r).toEqual({ ok: false, reason: 'too_large' });
  });

  it('honours custom maxBytes', () => {
    expect(checkPayload({ contentLengthHeader: '512', contentTypeHeader: 'application/json', maxBytes: 256 }))
      .toEqual({ ok: false, reason: 'too_large' });
    const r = checkPayload({ contentLengthHeader: '200', contentTypeHeader: 'application/json', maxBytes: 256 });
    expect(r.ok).toBe(true);
  });

  it('rejects missing content-type', () => {
    expect(checkPayload({ contentLengthHeader: '10', contentTypeHeader: null }))
      .toEqual({ ok: false, reason: 'missing_type' });
    expect(checkPayload({ contentLengthHeader: '10', contentTypeHeader: '   ' }))
      .toEqual({ ok: false, reason: 'missing_type' });
  });

  it('rejects disallowed content-type', () => {
    expect(checkPayload({ contentLengthHeader: '10', contentTypeHeader: 'text/html' }))
      .toEqual({ ok: false, reason: 'unsupported_type' });
  });

  it('accepts custom allowedTypes', () => {
    const r = checkPayload({
      contentLengthHeader: '50',
      contentTypeHeader: 'application/cbor',
      allowedTypes: ['application/cbor', 'application/json'],
    });
    expect(r.ok).toBe(true);
  });

  it('content-type comparison is case-insensitive', () => {
    const r = checkPayload({ contentLengthHeader: '10', contentTypeHeader: 'APPLICATION/JSON' });
    expect(r.ok).toBe(true);
  });

  it('zero bytes is allowed (empty body)', () => {
    const r = checkPayload({ contentLengthHeader: '0', contentTypeHeader: 'application/json' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.bytes).toBe(0);
  });
});
