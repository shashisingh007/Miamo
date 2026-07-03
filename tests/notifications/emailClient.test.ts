/**
 * emailClient — G.16 unit tests.
 *
 * Locks in the factory branching + stub/real-transport delineation.
 * Every test runs offline; the real ResendMailer / SesMailer bodies are
 * stubs pending SDK wiring and are covered by the "transport-disabled"
 * assertions below.
 */

import { describe, it, expect } from 'vitest';
import {
  LocalStubMailer,
  ResendMailer,
  SesMailer,
  createEmailClient,
  type EmailPayload,
} from '../../services/notifications/src/emailClient';

const payload: EmailPayload = {
  to: 'priya@example.com',
  subject: 'Welcome',
  html: '<h1>Hi</h1>',
  text: 'Hi',
};

describe('LocalStubMailer', () => {
  it('reports transport name "stub"', () => {
    expect(new LocalStubMailer().name).toBe('stub');
  });

  it('returns sent=true on a well-formed payload', async () => {
    const r = await new LocalStubMailer().send(payload);
    expect(r.sent).toBe(true);
    expect(r.transport).toBe('stub');
    expect(r.messageId).toBeNull();
  });

  it('returns no-recipient error when payload.to is empty', async () => {
    const r = await new LocalStubMailer().send({ ...payload, to: '' });
    expect(r.sent).toBe(false);
    expect(r.error).toBe('no-recipient');
  });
});

describe('ResendMailer', () => {
  it('constructor throws when required config is missing', () => {
    expect(() => new ResendMailer({ apiKey: '', defaultFrom: 'x' })).toThrow();
    expect(() => new ResendMailer({ apiKey: 'k', defaultFrom: '' })).toThrow();
  });

  it('send() returns transport-disabled today (SDK not wired)', async () => {
    const m = new ResendMailer({ apiKey: 'k', defaultFrom: 'x@y.com' });
    const r = await m.send(payload);
    expect(r.sent).toBe(false);
    expect(r.transport).toBe('resend');
    expect(r.error).toBe('transport-disabled');
  });
});

describe('SesMailer', () => {
  it('constructor throws when required config is missing', () => {
    expect(() => new SesMailer({ region: '', defaultFrom: 'x' })).toThrow();
    expect(() => new SesMailer({ region: 'us-east-1', defaultFrom: '' })).toThrow();
  });

  it('send() returns transport-disabled today (SDK not wired)', async () => {
    const m = new SesMailer({ region: 'us-east-1', defaultFrom: 'x@y.com' });
    const r = await m.send(payload);
    expect(r.sent).toBe(false);
    expect(r.transport).toBe('ses');
    expect(r.error).toBe('transport-disabled');
  });
});

describe('createEmailClient factory', () => {
  it('returns stub when EMAIL_TRANSPORT is unset', () => {
    expect(createEmailClient({}).name).toBe('stub');
  });

  it('returns stub when EMAIL_TRANSPORT=resend but RESEND_API_KEY is missing', () => {
    expect(createEmailClient({ EMAIL_TRANSPORT: 'resend' }).name).toBe('stub');
  });

  it('returns resend when EMAIL_TRANSPORT=resend and RESEND_API_KEY is set', () => {
    expect(createEmailClient({ EMAIL_TRANSPORT: 'resend', RESEND_API_KEY: 'k' }).name).toBe('resend');
  });

  it('returns ses when EMAIL_TRANSPORT=ses and AWS_REGION is set', () => {
    expect(createEmailClient({ EMAIL_TRANSPORT: 'ses', AWS_REGION: 'us-east-1' }).name).toBe('ses');
  });

  it('falls back to stub for unrecognised EMAIL_TRANSPORT values', () => {
    expect(createEmailClient({ EMAIL_TRANSPORT: 'sendgrid' }).name).toBe('stub');
  });
});
