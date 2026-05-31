import { describe, it, expect } from 'vitest';
import { verifyWebhookSignature, buildWebhookSignature } from '../webhookSig';

const SECRET = 'whsec_test_super_secret';
const NOW_SEC = 1_700_000_000;
const NOW_MS = NOW_SEC * 1000;
const BODY = JSON.stringify({ hello: 'world' });

describe('verifyWebhookSignature — happy path', () => {
  it('accepts a freshly-signed payload', () => {
    const header = buildWebhookSignature(BODY, SECRET, NOW_SEC);
    const r = verifyWebhookSignature(BODY, header, SECRET, NOW_MS);
    expect(r.ok).toBe(true);
  });
  it('accepts within the default 300s skew window', () => {
    const header = buildWebhookSignature(BODY, SECRET, NOW_SEC - 250);
    const r = verifyWebhookSignature(BODY, header, SECRET, NOW_MS);
    expect(r.ok).toBe(true);
  });
});

describe('verifyWebhookSignature — failures', () => {
  it('missing header → missing', () => {
    const r = verifyWebhookSignature(BODY, null, SECRET, NOW_MS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing');
  });
  it('malformed header → malformed', () => {
    const r = verifyWebhookSignature(BODY, 'not-a-valid-header', SECRET, NOW_MS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('malformed');
  });
  it('expired timestamp → expired', () => {
    const header = buildWebhookSignature(BODY, SECRET, NOW_SEC - 1000);
    const r = verifyWebhookSignature(BODY, header, SECRET, NOW_MS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('expired');
  });
  it('wrong secret → bad_signature', () => {
    const header = buildWebhookSignature(BODY, SECRET, NOW_SEC);
    const r = verifyWebhookSignature(BODY, header, 'wrong_secret', NOW_MS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bad_signature');
  });
  it('tampered body → bad_signature', () => {
    const header = buildWebhookSignature(BODY, SECRET, NOW_SEC);
    const r = verifyWebhookSignature(BODY + 'x', header, SECRET, NOW_MS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bad_signature');
  });
  it('non-hex v1 → malformed', () => {
    const r = verifyWebhookSignature(BODY, `t=${NOW_SEC},v1=zzz`, SECRET, NOW_MS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('malformed');
  });
  it('custom skew is honoured', () => {
    const header = buildWebhookSignature(BODY, SECRET, NOW_SEC - 60);
    const r = verifyWebhookSignature(BODY, header, SECRET, NOW_MS, { maxClockSkewSec: 30 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('expired');
  });
});
