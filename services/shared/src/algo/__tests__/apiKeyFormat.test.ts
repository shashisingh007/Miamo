import { describe, it, expect } from 'vitest';
import { formatApiKey, parseApiKey } from '../apiKeyFormat';

const RANDOM_OK = 'abcdef0123456789ABCDEFXY'; // 24 chars

describe('apiKeyFormat', () => {
  it('format + parse round trip (live)', () => {
    const k = formatApiKey('live', RANDOM_OK);
    const r = parseApiKey({ raw: k });
    expect(r).toEqual({ ok: true, prefix: 'live', random: RANDOM_OK });
  });

  it('format + parse round trip (test)', () => {
    const k = formatApiKey('test', RANDOM_OK);
    const r = parseApiKey({ raw: k });
    expect(r.ok).toBe(true);
  });

  it('missing input', () => {
    expect((parseApiKey({ raw: '' }) as any).reason).toBe('missing');
    expect((parseApiKey({ raw: null }) as any).reason).toBe('missing');
    expect((parseApiKey({ raw: undefined }) as any).reason).toBe('missing');
  });

  it('wrong segment count -> malformed', () => {
    expect((parseApiKey({ raw: 'live_abcdef' }) as any).reason).toBe('malformed');
    expect((parseApiKey({ raw: 'a_b_c_d' }) as any).reason).toBe('malformed');
  });

  it('uppercase prefix rejected as malformed', () => {
    expect((parseApiKey({ raw: `LIVE_${RANDOM_OK}_abcdef` }) as any).reason).toBe('malformed');
  });

  it('disallowed prefix rejected', () => {
    const k = formatApiKey('dev' as any, RANDOM_OK);
    const r = parseApiKey({ raw: k });
    expect((r as any).reason).toBe('bad_prefix');
  });

  it('custom allowedPrefixes accepts dev', () => {
    const k = formatApiKey('dev', RANDOM_OK);
    const r = parseApiKey({ raw: k, allowedPrefixes: ['dev'] });
    expect(r.ok).toBe(true);
  });

  it('random too short', () => {
    const short = 'abc123';
    const k = formatApiKey('live', short);
    const r = parseApiKey({ raw: k });
    expect((r as any).reason).toBe('random_too_short');
  });

  it('bad charset in random', () => {
    const bad = '!!!!!!!!!!!!!!!!!!!!!!!!';
    const k = formatApiKey('live', bad);
    const r = parseApiKey({ raw: k });
    expect((r as any).reason).toBe('bad_charset');
  });

  it('tampered checksum -> bad_checksum', () => {
    const k = formatApiKey('live', RANDOM_OK);
    const broken = k.slice(0, -6) + '000000';
    const r = parseApiKey({ raw: broken });
    expect((r as any).reason).toBe('bad_checksum');
  });

  it('tampered random body -> bad_checksum', () => {
    const k = formatApiKey('live', RANDOM_OK);
    const tampered = k.replace(RANDOM_OK, RANDOM_OK.replace('a', 'z'));
    const r = parseApiKey({ raw: tampered });
    expect((r as any).reason).toBe('bad_checksum');
  });

  it('CRC must be 6 hex chars', () => {
    const r = parseApiKey({ raw: `live_${RANDOM_OK}_XYZ` });
    expect((r as any).reason).toBe('malformed');
  });

  it('surrounding whitespace tolerated', () => {
    const k = `   ${formatApiKey('live', RANDOM_OK)}   `;
    expect(parseApiKey({ raw: k }).ok).toBe(true);
  });
});
