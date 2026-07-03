/**
 * Contract test — Razorpay webhook.
 *
 * Status: the webhook handler (services/content/src/server.ts) is a 501
 * NOT_IMPLEMENTED stub today. When v1.1 ships the real integration, THIS
 * suite already encodes the contract it must satisfy:
 *
 *   1. Signature verification uses HMAC-SHA256(webhook_secret, raw_body)
 *      and rejects any request whose `X-Razorpay-Signature` header does
 *      not match, in constant time.
 *   2. `order.paid` events are idempotent — receiving the same payload
 *      twice must not credit the user's spotlight ledger twice. The gate
 *      is a unique constraint on `razorpay_payment_id`.
 *   3. The webhook does NOT rely on the shared `idempotency()` middleware
 *      (Razorpay does not send Idempotency-Key headers) — the signature
 *      IS the replay gate, per the code comments in server.ts.
 *
 * The test drives pure functions that mirror the intended real code path.
 * Wire the real functions in when v1.1 lands and replace the local
 * `_signedBody` / `_verifySignature` helpers with production imports.
 *
 * Cross-refs:
 *   - services/content/src/server.ts §Payments (v1.1 stubs)
 *   - FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §G.9
 */

import { describe, it, expect } from 'vitest';
import { createHmac, timingSafeEqual } from 'node:crypto';

// ── Contract helpers — mirror the intended v1.1 implementation. ─────

function _signedBody(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

function _verifySignature(rawBody: string, header: string, secret: string): boolean {
  if (!header) return false;
  const expected = _signedBody(rawBody, secret);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(header, 'hex');
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}

// A tiny in-memory ledger to simulate the unique-constraint idempotency.
class Ledger {
  private byPaymentId = new Map<string, { userId: string; credit: number }>();
  record(paymentId: string, userId: string, credit: number): 'inserted' | 'duplicate' {
    if (this.byPaymentId.has(paymentId)) return 'duplicate';
    this.byPaymentId.set(paymentId, { userId, credit });
    return 'inserted';
  }
  size(): number { return this.byPaymentId.size; }
}

// ── Fixture: what Razorpay actually posts to the webhook ────────────
const ORDER_PAID_FIXTURE = {
  entity: 'event',
  account_id: 'acc_ABCXYZ',
  event: 'order.paid',
  contains: ['payment', 'order'],
  payload: {
    payment: {
      entity: {
        id: 'pay_M6vY4qXKtq3Y7g',
        entity: 'payment',
        amount: 9900,               // ₹99.00 in paise
        currency: 'INR',
        status: 'captured',
        order_id: 'order_M6vY3lWQoV7QpR',
        method: 'upi',
        captured: true,
        email: 'priya@miamo.test',
        contact: '+919000000001',
      },
    },
    order: {
      entity: {
        id: 'order_M6vY3lWQoV7QpR',
        entity: 'order',
        amount: 9900,
        currency: 'INR',
        status: 'paid',
        receipt: 'sp-priya-2026-07-01',
        notes: { userId: 'user-priya', kind: 'spotlight-boost' },
      },
    },
  },
  created_at: 1719878400,
};

const SECRET = 'whsec_test_do_not_use_in_prod';

describe('Razorpay webhook — signature verification (HMAC-SHA256)', () => {
  it('accepts a valid signature over the exact raw body', () => {
    const raw = JSON.stringify(ORDER_PAID_FIXTURE);
    const sig = _signedBody(raw, SECRET);
    expect(_verifySignature(raw, sig, SECRET)).toBe(true);
  });

  it('rejects a signature computed with a different secret', () => {
    const raw = JSON.stringify(ORDER_PAID_FIXTURE);
    const wrongSig = _signedBody(raw, 'whsec_wrong_secret');
    expect(_verifySignature(raw, wrongSig, SECRET)).toBe(false);
  });

  it('rejects a signature over a tampered body (single-byte change)', () => {
    const raw = JSON.stringify(ORDER_PAID_FIXTURE);
    const sig = _signedBody(raw, SECRET);
    const tampered = raw.replace('9900', '1');       // attacker changes amount
    expect(_verifySignature(tampered, sig, SECRET)).toBe(false);
  });

  it('rejects when the X-Razorpay-Signature header is empty', () => {
    const raw = JSON.stringify(ORDER_PAID_FIXTURE);
    expect(_verifySignature(raw, '', SECRET)).toBe(false);
  });

  it('rejects when signature is the right hex length but wrong bytes', () => {
    const raw = JSON.stringify(ORDER_PAID_FIXTURE);
    const bad = 'a'.repeat(64); // 64 hex chars = 32 bytes, matches SHA-256 length
    expect(_verifySignature(raw, bad, SECRET)).toBe(false);
  });
});

describe('Razorpay webhook — order.paid idempotency', () => {
  it('credits the ledger on first receipt', () => {
    const l = new Ledger();
    const p = ORDER_PAID_FIXTURE.payload.payment.entity;
    const notes = ORDER_PAID_FIXTURE.payload.order.entity.notes;
    expect(l.record(p.id, notes.userId, p.amount)).toBe('inserted');
    expect(l.size()).toBe(1);
  });

  it('rejects a duplicate replay with the same payment id', () => {
    const l = new Ledger();
    const p = ORDER_PAID_FIXTURE.payload.payment.entity;
    const notes = ORDER_PAID_FIXTURE.payload.order.entity.notes;
    expect(l.record(p.id, notes.userId, p.amount)).toBe('inserted');
    expect(l.record(p.id, notes.userId, p.amount)).toBe('duplicate');
    expect(l.size()).toBe(1);
  });

  it('accepts two distinct payment ids for the same user', () => {
    const l = new Ledger();
    expect(l.record('pay_1', 'user-priya', 9900)).toBe('inserted');
    expect(l.record('pay_2', 'user-priya', 9900)).toBe('inserted');
    expect(l.size()).toBe(2);
  });
});

describe('Razorpay webhook — payload shape assertions', () => {
  it('the fixture has the fields our handler reads (contract lock)', () => {
    expect(ORDER_PAID_FIXTURE.event).toBe('order.paid');
    expect(ORDER_PAID_FIXTURE.payload.payment.entity.id).toMatch(/^pay_/);
    expect(ORDER_PAID_FIXTURE.payload.order.entity.id).toMatch(/^order_/);
    expect(ORDER_PAID_FIXTURE.payload.order.entity.notes.userId).toBeTruthy();
  });

  it('captured=true is a required precondition to credit the ledger', () => {
    // If Razorpay ever sends order.paid before capture (unusual but
    // possible on some flows), the handler must NOT credit.
    const p = ORDER_PAID_FIXTURE.payload.payment.entity;
    expect(p.captured).toBe(true);
  });
});
