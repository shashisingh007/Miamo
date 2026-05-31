/**
 * integrityHash \u2014 Phase 20 OWASP A08 (software / data integrity) helper.
 *
 * Deterministic SHA-256 over a stable-JSON projection of a value. Two
 * equal-by-value payloads always produce the same hex digest regardless
 * of key insertion order, so callers can use it as a content-addressable
 * id, ETag input, or audit-trail tamper marker.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify((v as any)[k])).join(',') + '}';
}

export function integrityHash(v: unknown): string {
  const s = typeof v === 'string' ? v : stableStringify(v);
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

export function verifyIntegrity(v: unknown, expectedHex: string): boolean {
  if (typeof expectedHex !== 'string' || !/^[0-9a-f]{64}$/i.test(expectedHex)) return false;
  const actual = Buffer.from(integrityHash(v), 'hex');
  const expected = Buffer.from(expectedHex.toLowerCase(), 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
