import { describe, it, expect } from 'vitest';
import {
  resolveJwksKey,
  listJwksKids,
  isJwksKeyUsableForVerification,
} from '../jwksKeyResolver';

const KEY_RSA_A = { kid: 'a', kty: 'RSA', use: 'sig', alg: 'RS256' };
const KEY_RSA_B = { kid: 'b', kty: 'RSA', use: 'sig', alg: 'RS512' };
const KEY_EC = { kid: 'c', kty: 'EC', use: 'sig', alg: 'ES256' };
const KEY_OCT = { kid: 'd', kty: 'oct', alg: 'HS256' };

describe('jwksKeyResolver', () => {
  it('null/empty inputs => null', () => {
    expect(resolveJwksKey(null, {})).toBeNull();
    expect(resolveJwksKey({ keys: [] }, {})).toBeNull();
  });

  it('exact kid match wins', () => {
    const r = resolveJwksKey({ keys: [KEY_RSA_A, KEY_RSA_B] }, { kid: 'b' });
    expect(r?.kid).toBe('b');
  });

  it('returns null when kid not found', () => {
    expect(resolveJwksKey({ keys: [KEY_RSA_A] }, { kid: 'missing' })).toBeNull();
  });

  it('alg-based filter constrains kty', () => {
    const r = resolveJwksKey({ keys: [KEY_OCT, KEY_RSA_A] }, { alg: 'RS256' });
    expect(r?.kty).toBe('RSA');
  });

  it('returns null when alg has no compatible kty in set', () => {
    expect(resolveJwksKey({ keys: [KEY_OCT] }, { alg: 'RS256' })).toBeNull();
  });

  it('use filter excludes mismatched use', () => {
    const enc: any = { kid: 'enc', kty: 'RSA', use: 'enc', alg: 'RS256' };
    const r = resolveJwksKey({ keys: [enc, KEY_RSA_A] }, { use: 'sig' });
    expect(r?.kid).toBe('a');
  });

  it('skips keys with mismatched alg when crit.alg specified', () => {
    const r = resolveJwksKey({ keys: [KEY_RSA_A, KEY_RSA_B] }, { alg: 'RS512' });
    expect(r?.kid).toBe('b');
  });

  it('prefers more specific match (higher score)', () => {
    const a = { kid: 'a', kty: 'RSA', use: 'sig' };
    const b = { kid: 'b', kty: 'RSA', use: 'sig', alg: 'RS256' };
    const r = resolveJwksKey({ keys: [a, b] }, { alg: 'RS256', use: 'sig' });
    expect(r?.kid).toBe('b');
  });

  it('handles key without kid', () => {
    const noKid = { kty: 'RSA', use: 'sig', alg: 'RS256' };
    const r = resolveJwksKey({ keys: [noKid as any] }, { alg: 'RS256' });
    expect(r?.kty).toBe('RSA');
  });

  it('skips invalid entries (no kty)', () => {
    const bad: any = { kid: 'bad' };
    const r = resolveJwksKey({ keys: [bad, KEY_RSA_A] }, { alg: 'RS256' });
    expect(r?.kid).toBe('a');
  });

  it('key_ops restriction respected for sig use', () => {
    const decryptOnly: any = { kid: 'x', kty: 'RSA', use: 'sig', key_ops: ['decrypt'], alg: 'RS256' };
    const r = resolveJwksKey({ keys: [decryptOnly, KEY_RSA_A] }, { use: 'sig', alg: 'RS256' });
    expect(r?.kid).toBe('a');
  });

  it('listJwksKids returns unique kid order', () => {
    const set: any = {
      keys: [{ kid: 'a', kty: 'RSA' }, { kid: 'b', kty: 'RSA' }, { kid: 'a', kty: 'RSA' }],
    };
    expect(listJwksKids(set)).toEqual(['a', 'b']);
  });

  it('listJwksKids handles null', () => {
    expect(listJwksKids(null)).toEqual([]);
  });

  it('isJwksKeyUsableForVerification true for sig RSA', () => {
    expect(isJwksKeyUsableForVerification(KEY_RSA_A as any, 'RS256')).toBe(true);
  });

  it('isJwksKeyUsableForVerification false when use=enc', () => {
    const enc: any = { kty: 'RSA', use: 'enc' };
    expect(isJwksKeyUsableForVerification(enc)).toBe(false);
  });

  it('isJwksKeyUsableForVerification false when alg kty mismatch', () => {
    expect(isJwksKeyUsableForVerification(KEY_OCT as any, 'RS256')).toBe(false);
  });

  it('isJwksKeyUsableForVerification false when key_ops excludes verify', () => {
    const onlySign: any = { kty: 'RSA', key_ops: ['sign'] };
    expect(isJwksKeyUsableForVerification(onlySign)).toBe(false);
  });

  it('EC alg ES256 picks EC key', () => {
    const r = resolveJwksKey({ keys: [KEY_RSA_A, KEY_EC] as any }, { alg: 'ES256' });
    expect(r?.kty).toBe('EC');
  });
});
