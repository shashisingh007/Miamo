// ─── Email transport abstraction (G.16 notifications infra) ─────────
//
// Purpose: decouple the notifications service from any specific email
// vendor (Resend today per launch-audit; SES a viable fallback). The
// factory function inspects env and returns the right client. LocalStubMailer
// is the always-safe dev/test default.
//
// Feature flag: EMAIL_TRANSPORT=resend|ses|stub (defaults to stub if not set,
// or if the transport's required env is missing). The stub never throws;
// it logs and returns success.
//
// No new npm dependencies added this session — Resend and SES clients are
// stubbed (throw a clear "not-wired" error today) so the surface + factory
// branching is testable today and the wiring is a single-file change
// tomorrow. Founder wires the vendor SDK when credentials land.

/**
 * Result of a single send attempt.
 * `messageId` is populated only by the real transport; stub returns `null`.
 */
export interface EmailResult {
  sent: boolean;
  messageId: string | null;
  error?: 'no-recipient' | 'transport-disabled' | 'transport-error';
  transport: 'stub' | 'resend' | 'ses';
}

/** Fully-rendered email — templates return this shape. */
export interface EmailPayload {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailClient {
  send(payload: EmailPayload): Promise<EmailResult>;
  readonly name: 'stub' | 'resend' | 'ses';
}

/**
 * Dev / test transport. Never fails, logs to console with `[email-stub]`.
 * Runs in every test + local dev instance.
 */
export class LocalStubMailer implements EmailClient {
  readonly name = 'stub' as const;
  async send(payload: EmailPayload): Promise<EmailResult> {
    if (!payload.to) return { sent: false, messageId: null, error: 'no-recipient', transport: 'stub' };
    // eslint-disable-next-line no-console
    console.log('[email-stub]', { to: payload.to, subject: payload.subject, htmlBytes: payload.html.length, textBytes: payload.text.length });
    return { sent: true, messageId: null, transport: 'stub' };
  }
}

/**
 * Resend transport — the recommended launch vendor per the launch-audit.
 * Stubbed today: needs RESEND_API_KEY and a wired `resend` npm package.
 * `send()` throws a clear "not-wired" error via `EmailResult.error='transport-disabled'`.
 */
export class ResendMailer implements EmailClient {
  readonly name = 'resend' as const;
  constructor(private readonly cfg: { apiKey: string; defaultFrom: string }) {
    if (!cfg.apiKey) throw new Error('ResendMailer: RESEND_API_KEY required');
    if (!cfg.defaultFrom) throw new Error('ResendMailer: defaultFrom required');
  }
  async send(_payload: EmailPayload): Promise<EmailResult> {
    // Wiring the real package:
    //   const { Resend } = require('resend');
    //   const r = new Resend(this.cfg.apiKey);
    //   const out = await r.emails.send({ from: payload.from ?? this.cfg.defaultFrom, to: payload.to, subject: payload.subject, html: payload.html, text: payload.text });
    //   return { sent: !out.error, messageId: out.data?.id ?? null, transport: 'resend' };
    return { sent: false, messageId: null, error: 'transport-disabled', transport: 'resend' };
  }
}

/**
 * AWS SES transport — fallback when Resend is unavailable / IP-blocked in
 * India-facing volume. Stubbed today: needs AWS creds + the aws-sdk client
 * package. Same pattern as ResendMailer — types are real, send() is a stub.
 */
export class SesMailer implements EmailClient {
  readonly name = 'ses' as const;
  constructor(private readonly cfg: { region: string; defaultFrom: string }) {
    if (!cfg.region) throw new Error('SesMailer: AWS_REGION required');
    if (!cfg.defaultFrom) throw new Error('SesMailer: defaultFrom required');
  }
  async send(_payload: EmailPayload): Promise<EmailResult> {
    // Wiring the real client:
    //   const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
    //   const client = new SESv2Client({ region: this.cfg.region });
    //   const cmd = new SendEmailCommand({ FromEmailAddress: payload.from ?? this.cfg.defaultFrom, Destination: { ToAddresses: [payload.to] }, Content: { Simple: { Subject: { Data: payload.subject }, Body: { Html: { Data: payload.html }, Text: { Data: payload.text } } } } });
    //   const out = await client.send(cmd);
    //   return { sent: !!out.MessageId, messageId: out.MessageId ?? null, transport: 'ses' };
    return { sent: false, messageId: null, error: 'transport-disabled', transport: 'ses' };
  }
}

/**
 * Factory. Inspects EMAIL_TRANSPORT + required creds. Falls back to stub
 * if the requested transport is not fully wired — never crashes at boot.
 */
export function createEmailClient(env: NodeJS.ProcessEnv = process.env): EmailClient {
  const transport = (env.EMAIL_TRANSPORT ?? 'stub').toLowerCase();
  const defaultFrom = env.EMAIL_FROM ?? 'Miamo <no-reply@miamo.in>';
  if (transport === 'resend' && env.RESEND_API_KEY) {
    try { return new ResendMailer({ apiKey: env.RESEND_API_KEY, defaultFrom }); } catch { return new LocalStubMailer(); }
  }
  if (transport === 'ses' && env.AWS_REGION) {
    try { return new SesMailer({ region: env.AWS_REGION, defaultFrom }); } catch { return new LocalStubMailer(); }
  }
  return new LocalStubMailer();
}
