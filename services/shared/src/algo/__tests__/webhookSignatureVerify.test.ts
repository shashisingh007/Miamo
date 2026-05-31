import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhookSignature } from '../webhookSignatureVerify';

const SECRET = 'whsec_test_secret';
const BODY = '{"event":"ping","n":1}';

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex');
}

describe('webhookSignatureVerify', () => {
  it('valid bare hex signature', () => {
    const r = verifyWebhookSignature({ body: BODY, signatureHeader: sign(BODY), secret: SECRET });
    expect(r).toEqual({ valid: true });
  });

  it('valid sha256= prefixed signature', () => {
    const r = verifyWebhookSignature({
      body: BODY,
      signatureHeader: `sha256=${sign(BODY)}`,
      secret: SECRET,
    });
    expect(r).toEqual({ valid: true });
  });

  it('mismatch -> mismatch', () => {
    const r = verifyWebhookSignature({
      body: BODY,
      signatureHeader: sign('tampered'),
      secret: SECRET,
    });
    expect((r as any).reason).toBe('mismatch');
  });

  it('missing secret', () => {
    const r = verifyWebhookSignature({ body: BODY, signatureHeader: sign(BODY), secret: '' });
    expect((r as any).reason).toBe('missing_secret');
  });

  it('missing signature header', () => {
    const r = verifyWebhookSignature({ body: BODY, signatureHeader: '', secret: SECRET });
    expect((r as any).reason).toBe('missing_signature');
  });

  it('non-hex header -> bad_header_format', () => {
    const r = verifyWebhookSignature({ body: BODY, signatureHeader: 'sha256=not-hex!!', secret: SECRET });
    expect((r as any).reason).toBe('bad_header_format');
  });

  it('timestamp within tolerance -> valid', () => {
    const ts = 1_700_000_000;
    const payload = `${ts}.${BODY}`;
    const r = verifyWebhookSignature({
      body: BODY,
      signatureHeader: sign(payload),
      secret: SECRET,
      timestamp: ts,
      toleranceSeconds: 60,
      now: () => ts + 30,
    });
    expect(r).toEqual({ valid: true });
  });

  it('stale timestamp rejected', () => {
    const ts = 1_700_000_000;
    const payload = `${ts}.${BODY}`;
    const r = verifyWebhookSignature({
      body: BODY,
      signatureHeader: sign(payload),
      secret: SECRET,
      timestamp: ts,
      toleranceSeconds: 60,
      now: () => ts + 600,
    });
    expect((r as any).reason).toBe('stale_timestamp');
  });

  it('bad timestamp value rejected', () => {
    const r = verifyWebhookSignature({
      body: BODY,
      signatureHeader: sign(BODY),
      secret: SECRET,
      timestamp: 'not-a-number',
    });
    expect((r as any).reason).toBe('bad_timestamp');
  });

  it('timestamp string parses ok', () => {
    const ts = 1_700_000_000;
    const payload = `${ts}.${BODY}`;
    const r = verifyWebhookSignature({
      body: BODY,
      signatureHeader: sign(payload),
      secret: SECRET,
      timestamp: String(ts),
      now: () => ts,
    });
    expect(r).toEqual({ valid: true });
  });

  it('case-insensitive hex matches', () => {
    const sig = sign(BODY).toUpperCase();
    const r = verifyWebhookSignature({ body: BODY, signatureHeader: sig, secret: SECRET });
    expect(r).toEqual({ valid: true });
  });

  it('different length hex -> mismatch (not bad_header_format)', () => {
    const r = verifyWebhookSignature({
      body: BODY,
      signatureHeader: sign(BODY).slice(0, 32),
      secret: SECRET,
    });
    expect((r as any).reason).toBe('mismatch');
  });
});
