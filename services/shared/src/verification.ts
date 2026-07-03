// ─── Miamo Verification Module ───────────────────────
// OTP issuance + verification, device fingerprinting, and pluggable
// notification providers (email/SMS). Dev mode logs codes to stdout
// AND stores them in-process so /api/v1/__dev/otp/peek can retrieve.
//
// Production: wire OTP_PROVIDER_EMAIL=sendgrid + OTP_PROVIDER_SMS=twilio
// (those branches are stubbed to a clear TODO so secrets aren't required
// to ship the feature surface).
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { PrismaClient, Otp } from '@prisma/client';
import { logger } from './logger';
import { timingSafeStringEqual } from './security/timingSafe';

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60s between issues to same identifier
const OTP_DAILY_CAP = 8; // max 8 codes per identifier per 24h
const TRUSTED_DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// In-memory dev cache: identifier → last plaintext code. Used by the
// /__dev/otp/peek endpoint so QA scripts can fetch codes without an
// email/SMS provider configured.
const devCodeCache = new Map<string, { code: string; issuedAt: number; purpose: string }>();
export function devPeekCode(identifier: string): { code: string; issuedAt: number; purpose: string } | null {
  return devCodeCache.get(identifier.toLowerCase()) || null;
}

export type OtpChannel = 'email' | 'phone';
export type OtpPurpose = 'verify_email' | 'verify_phone' | 'login_2fa' | 'password_reset' | 'signup_email' | 'signup_phone';

export function normalizeIdentifier(channel: OtpChannel, raw: string): string {
  if (channel === 'email') return raw.trim().toLowerCase();
  // Phone: strip spaces/dashes/parens, keep leading +
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    // Default to India (+91) if no country code — matches existing UI.
    if (cleaned.length === 10) return '+91' + cleaned;
    return '+' + cleaned;
  }
  return cleaned;
}

export function isValidPhone(phone: string): boolean {
  // Permissive E.164: + followed by 8–15 digits.
  return /^\+\d{8,15}$/.test(phone);
}
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateCode(): string {
  // 6-digit cryptographically random; pad-left zeros.
  const n = crypto.randomInt(0, 10 ** OTP_LENGTH);
  return String(n).padStart(OTP_LENGTH, '0');
}

// ── Notification providers ──────────────────────────
async function sendEmailDev(to: string, subject: string, body: string): Promise<void> {
  logger.info(`[OTP-EMAIL:dev] to=${to} subject="${subject}"\n${body}`);
}
async function sendSmsDev(to: string, body: string): Promise<void> {
  logger.info(`[OTP-SMS:dev] to=${to} body="${body}"`);
}

// SMTP transport is lazily built on first use and cached — nodemailer is
// only require()'d if OTP_PROVIDER_EMAIL=smtp, so the dev fast-path stays
// zero-dep.
let smtpTransport: unknown | null = null;
async function getSmtpTransport(): Promise<unknown> {
  if (smtpTransport) return smtpTransport;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodemailer = require('nodemailer');
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST/SMTP_USER/SMTP_PASS must all be set when OTP_PROVIDER_EMAIL=smtp');
  }
  smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SMTPS, 587 = STARTTLS
    auth: { user, pass },
    // AWS SES rate: 1 msg/sec in sandbox. Serialise sends to stay under.
    pool: true,
    maxConnections: 1,
    maxMessages: 100,
  });
  logger.info(`[OTP-EMAIL] SMTP transport ready (host=${host} port=${port})`);
  return smtpTransport;
}

async function sendEmailSmtp(to: string, subject: string, body: string): Promise<void> {
  const t = await getSmtpTransport() as { sendMail: (o: unknown) => Promise<{ messageId: string }> };
  const from = process.env.SMTP_FROM || 'noreply@miamo.in';
  const info = await t.sendMail({
    from: `"Miamo" <${from}>`,
    to,
    subject,
    text: body,
    // Minimal HTML — Miamo brand colour on the code, safe for all clients.
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;font-size:14px;color:#1A1A1A;line-height:1.55">
  <p>${body.split(String((body.match(/\d{6}/) || [''])[0])).join(String((body.match(/\d{6}/) || [''])[0])) /* keep code visible */}</p>
  <p style="font-size:12px;color:#8B8680">This is an automated message from Miamo. Do not reply.</p>
</div>`,
  });
  logger.info(`[OTP-EMAIL] sent to=${to} messageId=${info.messageId}`);
}

async function sendNotification(channel: OtpChannel, to: string, purpose: OtpPurpose, code: string): Promise<void> {
  const provider = channel === 'email'
    ? (process.env.OTP_PROVIDER_EMAIL || 'dev')
    : (process.env.OTP_PROVIDER_SMS || 'dev');
  const purposeText: Record<OtpPurpose, string> = {
    verify_email: 'verify your email',
    verify_phone: 'verify your phone',
    login_2fa: 'sign in to a new device',
    password_reset: 'reset your password',
    signup_email: 'create your account',
    signup_phone: 'create your account',
  };
  const subject = `Miamo: your code is ${code}`;
  const body = `Your Miamo code to ${purposeText[purpose]} is ${code}. It expires in 10 minutes. If you didn't request this, ignore this message.`;

  // Email providers
  if (channel === 'email') {
    if (provider === 'smtp') {
      try {
        await sendEmailSmtp(to, subject, body);
        return;
      } catch (e) {
        // Never let a send failure leak the code to the client, but log it.
        logger.error(`[OTP-EMAIL] SMTP send failed for ${to}: ${(e as Error).message}`);
        throw new OtpError('OTP_SEND_FAILED', 'Could not send verification email. Please try again.', 502);
      }
    }
    // dev fallback
    await sendEmailDev(to, subject, body);
    return;
  }

  // SMS providers — Twilio/MSG91 still TODO; log-only for now.
  logger.warn(`[OTP-SMS] provider=${provider} not wired; falling back to dev log`);
  await sendSmsDev(to, body);
}

// ── Issue ────────────────────────────────────────────
export interface IssueOtpInput {
  prisma: PrismaClient;
  channel: OtpChannel;
  identifier: string;          // already normalized
  purpose: OtpPurpose;
  userId?: string | null;
  ip?: string;
  userAgent?: string;
}
export interface IssueOtpResult {
  ok: true;
  expiresAt: Date;
  // dev-only: returned so tests can skip the email/SMS provider.
  devCode?: string;
}
export class OtpError extends Error {
  code: string; statusCode: number;
  constructor(code: string, message: string, statusCode = 400) {
    super(message); this.code = code; this.statusCode = statusCode;
  }
}

export async function issueOtp(input: IssueOtpInput): Promise<IssueOtpResult> {
  const { prisma, channel, identifier, purpose, userId, ip, userAgent } = input;
  if (channel === 'email' && !isValidEmail(identifier)) throw new OtpError('INVALID_EMAIL', 'Invalid email', 400);
  if (channel === 'phone' && !isValidPhone(identifier)) throw new OtpError('INVALID_PHONE', 'Invalid phone (use E.164, e.g. +14155551234)', 400);

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const cooldownAgo = new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS);

  // Cooldown: at most 1 issue per 60s.
  const recent = await prisma.otp.findFirst({
    where: { identifier, purpose, createdAt: { gt: cooldownAgo } },
    orderBy: { createdAt: 'desc' },
  });
  if (recent) {
    const waitMs = OTP_RESEND_COOLDOWN_MS - (now.getTime() - recent.createdAt.getTime());
    throw new OtpError('OTP_COOLDOWN', `Please wait ${Math.ceil(waitMs / 1000)}s before requesting another code`, 429);
  }
  // Daily cap.
  const dailyCount = await prisma.otp.count({ where: { identifier, purpose, createdAt: { gt: dayAgo } } });
  if (dailyCount >= OTP_DAILY_CAP) throw new OtpError('OTP_DAILY_CAP', 'Too many codes requested today. Try again later.', 429);

  // Invalidate any unused active codes for the same (identifier,purpose).
  await prisma.otp.updateMany({
    where: { identifier, purpose, consumedAt: null, expiresAt: { gt: now } },
    data: { expiresAt: now },
  });

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);
  const otp = await prisma.otp.create({
    data: { userId: userId ?? null, identifier, channel, purpose, codeHash, expiresAt, ip, userAgent, maxAttempts: OTP_MAX_ATTEMPTS },
  });

  // If delivery fails (SES rejects sandbox recipient, Twilio credit low, etc.),
  // we DON'T want the just-created Otp row to sit in the DB and trigger the
  // 60s resend cooldown for the next request — the user got nothing, so they
  // shouldn't be blocked from asking again. Delete the row + rethrow, letting
  // the caller decide how to surface the failure (e.g. 502 OTP_SEND_FAILED).
  try {
    await sendNotification(channel, identifier, purpose, code);
  } catch (e) {
    await prisma.otp.delete({ where: { id: otp.id } }).catch(() => undefined);
    throw e;
  }
  devCodeCache.set(identifier.toLowerCase(), { code, issuedAt: Date.now(), purpose });

  const result: IssueOtpResult = { ok: true, expiresAt };
  if (process.env.NODE_ENV !== 'production') result.devCode = code;
  return result;
}

// ── Verify ───────────────────────────────────────────
export interface VerifyOtpInput {
  prisma: PrismaClient;
  channel: OtpChannel;
  identifier: string;
  purpose: OtpPurpose;
  code: string;
}
export async function verifyOtp(input: VerifyOtpInput): Promise<{ ok: true; otp: Otp }> {
  const { prisma, channel, identifier, purpose, code } = input;
  const now = new Date();
  const otp = await prisma.otp.findFirst({
    where: { identifier, channel, purpose, consumedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) throw new OtpError('OTP_NOT_FOUND', 'Code expired or not found. Request a new one.', 400);

  if (otp.attempts >= otp.maxAttempts) {
    await prisma.otp.update({ where: { id: otp.id }, data: { expiresAt: now } });
    throw new OtpError('OTP_TOO_MANY_ATTEMPTS', 'Too many wrong attempts. Request a new code.', 429);
  }

  const ok = await bcrypt.compare(code, otp.codeHash);
  if (!ok) {
    await prisma.otp.update({ where: { id: otp.id }, data: { attempts: otp.attempts + 1 } });
    const left = otp.maxAttempts - (otp.attempts + 1);
    throw new OtpError('OTP_INVALID', `Incorrect code. ${left} attempts remaining.`, 400);
  }

  const consumed = await prisma.otp.update({ where: { id: otp.id }, data: { consumedAt: now, attempts: otp.attempts + 1 } });
  return { ok: true, otp: consumed };
}

// ── Device fingerprint ───────────────────────────────
export interface DeviceCtx { userAgent: string; ip: string; salt?: string }
export function deviceFingerprint(ctx: DeviceCtx): string {
  const ua = ctx.userAgent || '';
  const ipNet = (ctx.ip || '').split('.').slice(0, 2).join('.'); // /16 — survives mobile NAT changes
  // Browser+OS major from UA so a Chrome upgrade doesn't invalidate.
  const browser = (ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/i) || ['', 'Unknown', '0']).slice(1, 3).join('-');
  const os = (ua.match(/(Windows|Mac OS X|Linux|Android|iOS)/i) || ['Unknown'])[0];
  const salt = ctx.salt || process.env.DEVICE_FP_SALT || 'miamo-default-salt';
  return crypto.createHash('sha256').update(`${browser}|${os}|${ipNet}|${salt}`).digest('hex');
}
export function deviceLabel(ctx: { userAgent: string; ip: string }): string {
  const ua = ctx.userAgent || '';
  const browser = (ua.match(/(Chrome|Firefox|Safari|Edge|Opera)/i) || ['Unknown'])[0];
  const os = (ua.match(/(Windows|Mac OS X|Linux|Android|iOS)/i) || ['Unknown'])[0];
  return `${browser} on ${os}`;
}

export async function isDeviceTrusted(prisma: PrismaClient, userId: string, deviceHash: string): Promise<boolean> {
  const now = new Date();
  const td = await prisma.trustedDevice.findUnique({ where: { userId_deviceHash: { userId, deviceHash } } });
  if (!td || td.revoked || td.expiresAt < now) return false;
  // Touch lastSeenAt.
  await prisma.trustedDevice.update({ where: { id: td.id }, data: { lastSeenAt: now } });
  return true;
}

export async function trustDevice(prisma: PrismaClient, userId: string, deviceHash: string, ctx: { ip?: string; label?: string }): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRUSTED_DEVICE_TTL_MS);
  await prisma.trustedDevice.upsert({
    where: { userId_deviceHash: { userId, deviceHash } },
    update: { lastSeenAt: now, expiresAt, revoked: false, ip: ctx.ip, label: ctx.label || '' },
    create: { userId, deviceHash, ip: ctx.ip, label: ctx.label || '', firstSeenAt: now, lastSeenAt: now, expiresAt },
  });
}

// ── Challenge tokens (short-lived JWT-less HMAC) ─────
// We don't want to issue a real session JWT before 2FA passes. A
// challenge token is a signed handle that says "this user authenticated
// with password but still needs OTP". It's bound to userId + deviceHash
// and expires in 10 minutes.
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
function challengeSecret(): string {
  return process.env.JWT_SECRET || 'dev-challenge-secret';
}
/**
 * bug-hunt fix #10 (docs/architecture/bug-hunt-2026-07.md #20) — replaces
 * `Date.now() > parseInt(expStr, 10)`, which was silently `false` on any
 * non-numeric input (`parseInt('abc') === NaN`, and `Date.now() > NaN`
 * evaluates to `false`). A corrupted-but-signed token would never expire.
 * Now: any non-finite parse is treated as already-expired.
 */
function isFutureUnixMs(expStr: string): boolean {
  const n = Number(expStr);
  return Number.isFinite(n) && Date.now() <= n;
}
export function issueChallengeToken(userId: string, deviceHash: string): string {
  const exp = Date.now() + CHALLENGE_TTL_MS;
  const payload = `${userId}.${deviceHash}.${exp}`;
  const sig = crypto.createHmac('sha256', challengeSecret()).update(payload).digest('hex').slice(0, 32);
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}
export function verifyChallengeToken(token: string, expectedDeviceHash: string): { userId: string } {
  let raw: string;
  try { raw = Buffer.from(token, 'base64url').toString('utf8'); }
  catch { throw new OtpError('CHALLENGE_INVALID', 'Invalid challenge token', 400); }
  const parts = raw.split('.');
  if (parts.length !== 4) throw new OtpError('CHALLENGE_INVALID', 'Invalid challenge token', 400);
  const [userId, deviceHash, expStr, sig] = parts;
  const expected = crypto.createHmac('sha256', challengeSecret()).update(`${userId}.${deviceHash}.${expStr}`).digest('hex').slice(0, 32);
  // bug-hunt part2 fix #1 (docs/architecture/bug-hunt-2026-07-part2.md #1) —
  // was `sig !== expected`, which short-circuits at the first differing char
  // and leaks HMAC bytes to a timing-side-channel attacker.
  if (!timingSafeStringEqual(sig, expected)) throw new OtpError('CHALLENGE_INVALID', 'Invalid challenge token', 400);
  if (!isFutureUnixMs(expStr)) throw new OtpError('CHALLENGE_EXPIRED', 'Challenge expired, please log in again', 401);
  if (deviceHash !== expectedDeviceHash) throw new OtpError('CHALLENGE_DEVICE_MISMATCH', 'Device mismatch', 401);
  return { userId };
}

// ── Signup tokens ────────────────────────────────────
// Two-stage HMAC handles for OTP-gated signup. A "start" token is
// returned after issuing the OTP; a "verified" token replaces it after
// the OTP is consumed and is required to set the password. Tokens bind
// the identifier + a kind tag + expiry.
const SIGNUP_START_TTL_MS = 15 * 60 * 1000;
const SIGNUP_VERIFIED_TTL_MS = 15 * 60 * 1000;
type SignupKind = 'start' | 'verified';
function signupSecret(): string {
  return process.env.JWT_SECRET || 'dev-signup-secret';
}
function makeSignupToken(kind: SignupKind, channel: OtpChannel, identifier: string, ttlMs: number): string {
  const exp = Date.now() + ttlMs;
  const nonce = crypto.randomBytes(8).toString('hex');
  const idEnc = Buffer.from(identifier, 'utf8').toString('base64url');
  const payload = `${kind}.${channel}.${idEnc}.${nonce}.${exp}`;
  const sig = crypto.createHmac('sha256', signupSecret()).update(payload).digest('hex').slice(0, 32);
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}
function parseSignupToken(token: string, expectedKind: SignupKind): { channel: OtpChannel; identifier: string } {
  let raw: string;
  try { raw = Buffer.from(token, 'base64url').toString('utf8'); }
  catch { throw new OtpError('SIGNUP_TOKEN_INVALID', 'Invalid signup token', 400); }
  const parts = raw.split('.');
  if (parts.length !== 6) throw new OtpError('SIGNUP_TOKEN_INVALID', 'Invalid signup token', 400);
  const [kind, channel, idEnc, nonce, expStr, sig] = parts;
  if (kind !== expectedKind) throw new OtpError('SIGNUP_TOKEN_INVALID', 'Wrong stage of signup', 400);
  const expected = crypto.createHmac('sha256', signupSecret()).update(`${kind}.${channel}.${idEnc}.${nonce}.${expStr}`).digest('hex').slice(0, 32);
  // bug-hunt part2 fix #1 — constant-time compare (see verifyChallengeToken).
  if (!timingSafeStringEqual(sig, expected)) throw new OtpError('SIGNUP_TOKEN_INVALID', 'Invalid signup token', 400);
  if (!isFutureUnixMs(expStr)) throw new OtpError('SIGNUP_TOKEN_EXPIRED', 'Signup session expired, start over', 401);
  if (channel !== 'email' && channel !== 'phone') throw new OtpError('SIGNUP_TOKEN_INVALID', 'Invalid signup token', 400);
  let identifier: string;
  try { identifier = Buffer.from(idEnc, 'base64url').toString('utf8'); }
  catch { throw new OtpError('SIGNUP_TOKEN_INVALID', 'Invalid signup token', 400); }
  return { channel: channel as OtpChannel, identifier };
}
export function issueSignupStartToken(channel: OtpChannel, identifier: string): string {
  return makeSignupToken('start', channel, identifier, SIGNUP_START_TTL_MS);
}
export function verifySignupStartToken(token: string): { channel: OtpChannel; identifier: string } {
  return parseSignupToken(token, 'start');
}
export function issueSignupVerifiedToken(channel: OtpChannel, identifier: string): string {
  return makeSignupToken('verified', channel, identifier, SIGNUP_VERIFIED_TTL_MS);
}
export function verifySignupVerifiedToken(token: string): { channel: OtpChannel; identifier: string } {
  return parseSignupToken(token, 'verified');
}
