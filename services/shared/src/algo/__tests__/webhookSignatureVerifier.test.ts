import { describe, it, expect } from 'vitest';
import {
  parseWebhookSignatureHeader,
  signWebhookPayload,
  verifyWebhookSignature,
} from '../webhookSignatureVerifier';

const SECRET = 'whsec_test';
const BODY = '{"event":"ping"}';
const TS = 1_700_000_000; // seconds
const NOW_MS = TS * 1000;

function header(ts: number, sig: string, extra?: string): string {
  return `t=${ts},v1=${sig}${extra ? ',' + extra : ''}`;
}

describe('webhookSignatureVerifier', () => {
  it('parses header with timestamp and multiple v1 entries', () => {
    const p = parseWebhookSignatureHeader('t=123,v1=abcd,v1=ef01');
    expect(p.timestampSecs).toBe(123);
    expect(p.v1).toEqual(['abcd', 'ef01']);
  });

  it('parse ignores unknown schemes and non-hex sigs', () => {
    const p = parseWebhookSignatureHeader('t=1,v0=zzz,v1=GHIJ,v1=ab');
    expect(p.v1).toEqual(['ab']);
  });

  it('verify fails on missing header', () => {
    const r = verifyWebhookSignature(BODY, undefined, SECRET, { nowMs: NOW_MS });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing_header');
  });

  it('verify fails on missing secret', () => {
    const r = verifyWebhookSignature(BODY, 't=1,v1=ab', '', { nowMs: NOW_MS });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing_secret');
  });

  it('verify fails on malformed header (no t=)', () => {
    const r = verifyWebhookSignature(BODY, 'v1=ab', SECRET, { nowMs: NOW_MS });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('malformed_header');
  });

  it('verify fails when no v1 entry present', () => {
    const r = verifyWebhookSignature(BODY, 't=1', SECRET, { nowMs: NOW_MS });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_v1_signature');
  });

  it('verify fails on skewed timestamp', () => {
    const sig = signWebhookPayload(SECRET, TS, BODY);
    const r = verifyWebhookSignature(BODY, header(TS, sig), SECRET, {
      nowMs: NOW_MS + 10 * 60_000,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('timestamp_skew');
  });

  it('verify succeeds with correct signature within tolerance', () => {
    const sig = signWebhookPayload(SECRET, TS, BODY);
    const r = verifyWebhookSignature(BODY, header(TS, sig), SECRET, { nowMs: NOW_MS });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.timestampMs).toBe(NOW_MS);
  });

  it('verify fails on tampered body', () => {
    const sig = signWebhookPayload(SECRET, TS, BODY);
    const r = verifyWebhookSignature(BODY + 'X', header(TS, sig), SECRET, { nowMs: NOW_MS });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('signature_mismatch');
  });

  it('verify fails with wrong secret', () => {
    const sig = signWebhookPayload('other_secret', TS, BODY);
    const r = verifyWebhookSignature(BODY, header(TS, sig), SECRET, { nowMs: NOW_MS });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('signature_mismatch');
  });

  it('verify accepts when any of multiple v1 entries match (rotation)', () => {
    const goodSig = signWebhookPayload(SECRET, TS, BODY);
    const badSig = 'deadbeef'.repeat(8);
    const r = verifyWebhookSignature(
      BODY,
      `t=${TS},v1=${badSig},v1=${goodSig}`,
      SECRET,
      { nowMs: NOW_MS }
    );
    expect(r.ok).toBe(true);
  });

  it('verify treats hex length mismatch as failure (not crash)', () => {
    const r = verifyWebhookSignature(BODY, `t=${TS},v1=ab`, SECRET, { nowMs: NOW_MS });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('signature_mismatch');
  });

  it('verify honors custom tolerance', () => {
    const sig = signWebhookPayload(SECRET, TS, BODY);
    const r = verifyWebhookSignature(BODY, header(TS, sig), SECRET, {
      nowMs: NOW_MS + 1000,
      toleranceMs: 500,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('timestamp_skew');
  });

  it('verify rejects negative timestamps as malformed', () => {
    const r = verifyWebhookSignature(BODY, 't=-1,v1=ab', SECRET, { nowMs: NOW_MS });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('malformed_header');
  });
});
