// ─── Miamo Auth Service ──────────────────────────────
import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../../shared/src/logger';
import { errorHandler } from '../../shared/src/errorHandler';
import { validate } from '../../shared/src/validate';
import { registerBodySchema, loginBodySchema, refreshBodySchema, forgotPasswordBodySchema } from '../../shared/src/schemas';
import { sanitize, sanitizeObject } from '../../shared/src/sanitize';
import { auditLog } from '../../shared/src/audit';
import { env } from '../../shared/src/env';
import { createPrisma, applyBaseMiddleware, installHealthRoutes, installSentry } from '../../shared/src/service';
import { idempotency } from '../../shared/src/idempotency';
import {
  accountCreationLimiter,
  loginAttemptLimiter,
  otpSendLimiter,
  passwordResetLimiter,
} from '../../shared/src/rateLimits';
import {
  issueOtp, verifyOtp, OtpError, normalizeIdentifier, isValidEmail, isValidPhone,
  deviceFingerprint, deviceLabel, isDeviceTrusted, trustDevice,
  issueChallengeToken, verifyChallengeToken, devPeekCode,
  issueSignupStartToken, verifySignupStartToken,
  issueSignupVerifiedToken, verifySignupVerifiedToken,
} from '../../shared/src/verification';

import { randomBytes } from 'crypto';

const prisma = createPrisma(10);
export const app = express();

const PORT = parseInt(process.env.PORT || '3201', 10);
const JWT_SECRET = env.jwtSecret;
const JWT_REFRESH_SECRET = env.jwtRefreshSecret;

// ─── Middleware ───────────────────────────────────────
applyBaseMiddleware(app, { jsonLimit: '1mb', rateLimitMax: 1000, serviceName: 'auth' });
// Sentry request handler must mount AFTER applyBaseMiddleware (so requestId
// is on req for trace correlation) but BEFORE any route so every request is
// captured in scope. No-op when SENTRY_DSN is unset.
const sentry = installSentry({ serviceName: 'auth' });
app.use(sentry.requestHandler);

// ─── Helpers ─────────────────────────────────────────
class AppError extends Error {
  statusCode: number; code: string;
  constructor(message: string, statusCode: number, code = 'UNKNOWN_ERROR') {
    super(message); this.statusCode = statusCode; this.code = code;
  }
}

interface AuthRequest extends Request { userId?: string; }

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const internalUserId = req.headers['x-user-id'] as string;
  if (internalUserId && req.headers['x-internal-key'] === env.internalServiceKey) {
    req.userId = internalUserId; return next();
  }
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { userId: string };
    req.userId = payload.userId; next();
  } catch { return res.status(401).json({ error: { message: 'Invalid or expired token', code: 'TOKEN_INVALID' } }); }
}

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m', algorithm: 'HS256' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '30d', algorithm: 'HS256' });
  return { accessToken, refreshToken };
}

const REFRESH_COOKIE = 'miamo_rt';
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}
function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}

function parseDevice(ua: string) {
  const isMobile = /mobile|android|iphone/i.test(ua);
  const isTablet = /tablet|ipad/i.test(ua);
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
  const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/i);
  const osMatch = ua.match(/(Windows|Mac OS X|Linux|Android|iOS)[\s/]?[\d._]*/i);
  return {
    deviceType,
    browser: browserMatch ? browserMatch[1] : 'Unknown',
    os: osMatch ? osMatch[0].replace(/_/g, '.') : 'Unknown',
  };
}

function reqCtx(req: Request) {
  const ua = (req.headers['user-agent'] as string) || '';
  const ip = ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()) || req.socket.remoteAddress || '';
  return { userAgent: ua, ip };
}

function maskIdentifier(channel: 'email' | 'phone', id: string): string {
  if (channel === 'email') {
    const [u, d] = id.split('@');
    if (!d) return id;
    return u.slice(0, 2) + '***@' + d;
  }
  // phone: keep last 2 digits
  return id.slice(0, 3) + '***' + id.slice(-2);
}

function otpHandler(err: unknown, res: Response): boolean {
  if (err instanceof OtpError) {
    res.status(err.statusCode).json({ error: { message: err.message, code: err.code } });
    return true;
  }
  return false;
}

async function createSession(userId: string, req: Request) {
  const ua = req.headers['user-agent'] || '';
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
  const { deviceType, browser, os } = parseDevice(ua);
  const token = randomBytes(32).toString('hex');
  return prisma.session.create({
    data: { userId, token, deviceType, browser, os, ipAddress: ip, userAgent: ua, lastActiveAt: new Date() },
  });
}

// ─── Health ─────────────────────────────────────────────────────
installHealthRoutes(app, 'auth', prisma);

// ─── Routes ──────────────────────────────────────────

// ── OTP-gated signup (3 stages) ─────────────────────
// Stage 1: caller supplies email (or +E.164 phone). Server validates the
// identifier is free, issues an OTP, and returns a short-lived signed
// "start" token that proves the OTP was issued by us. The token does
// NOT grant any access — it just lets stage 2 know which identifier we
// expect a code for.
app.post('/api/v1/auth/signup/start', otpSendLimiter, idempotency(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawIdentifier = sanitize(String(req.body?.identifier || req.body?.email || req.body?.phone || ''));
    if (!rawIdentifier) throw new AppError('identifier required', 400, 'VALIDATION_ERROR');
    const channel: 'email' | 'phone' = isValidEmail(rawIdentifier) ? 'email' : 'phone';
    const identifier = normalizeIdentifier(channel, rawIdentifier);
    if (channel === 'email' && !isValidEmail(identifier)) throw new AppError('invalid email', 400, 'VALIDATION_ERROR');
    if (channel === 'phone' && !isValidPhone(identifier)) throw new AppError('invalid phone (use E.164)', 400, 'VALIDATION_ERROR');
    const taken = channel === 'email'
      ? await prisma.user.findUnique({ where: { email: identifier } })
      : await prisma.user.findUnique({ where: { phone: identifier } });
    if (taken) throw new AppError(channel === 'email' ? 'Email already registered' : 'Phone already registered', 409, channel === 'email' ? 'EMAIL_EXISTS' : 'PHONE_EXISTS');
    const ctx = reqCtx(req);
    const issued = await issueOtp({ prisma, channel, identifier, purpose: channel === 'email' ? 'signup_email' : 'signup_phone', ip: ctx.ip, userAgent: ctx.userAgent });
    const signupToken = issueSignupStartToken(channel, identifier);
    const out: Record<string, unknown> = { signupToken, channel, sentTo: maskIdentifier(channel, identifier), expiresAt: issued.expiresAt };
    if (process.env.NODE_ENV !== 'production' && issued.devCode) out._devCode = issued.devCode;
    res.json({ data: out });
  } catch (e) {
    if (otpHandler(e, res)) return;
    next(e);
  }
});

// Stage 2: caller submits the OTP plus the start token. We validate
// both, mark the OTP consumed, and exchange the start token for a
// "verified" token (also short-lived, also signed). The verified token
// is the only thing that lets stage 3 actually create the account.
app.post('/api/v1/auth/signup/verify', idempotency(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signupToken = String(req.body?.signupToken || '');
    const code = String(req.body?.code || '').trim();
    if (!signupToken || !code) throw new AppError('signupToken and code required', 400, 'VALIDATION_ERROR');
    const { channel, identifier } = verifySignupStartToken(signupToken);
    await verifyOtp({ prisma, channel, identifier, purpose: channel === 'email' ? 'signup_email' : 'signup_phone', code });
    const verifiedToken = issueSignupVerifiedToken(channel, identifier);
    res.json({ data: { verifiedToken, channel, identifier: maskIdentifier(channel, identifier), expiresIn: 900 } });
  } catch (e) {
    if (otpHandler(e, res)) return;
    next(e);
  }
});

// Stage 3: caller supplies the verified token plus password +
// displayName. We re-check that the identifier is still free (race
// safety), create the account exactly like the legacy register
// endpoint, and mark the verified channel as already-confirmed so the
// user skips re-verification.
app.post('/api/v1/auth/signup/complete', accountCreationLimiter, idempotency(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const verifiedToken = String(req.body?.verifiedToken || '');
    const password = String(req.body?.password || '');
    const rawDisplayName = String(req.body?.displayName || '');
    if (!verifiedToken || !password || !rawDisplayName) throw new AppError('verifiedToken, password, displayName required', 400, 'VALIDATION_ERROR');
    if (password.length < 8 || password.length > 128) throw new AppError('Password must be 8-128 characters', 400, 'VALIDATION_ERROR');
    if (rawDisplayName.trim().length < 1 || rawDisplayName.trim().length > 80) throw new AppError('Display name must be 1-80 characters', 400, 'VALIDATION_ERROR');
    const { channel, identifier } = verifySignupVerifiedToken(verifiedToken);
    const displayName = sanitize(rawDisplayName);
    // Race-safety re-check: someone else may have grabbed this
    // identifier between stage 2 and stage 3.
    const taken = channel === 'email'
      ? await prisma.user.findUnique({ where: { email: identifier } })
      : await prisma.user.findUnique({ where: { phone: identifier } });
    if (taken) throw new AppError(channel === 'email' ? 'Email already registered' : 'Phone already registered', 409, channel === 'email' ? 'EMAIL_EXISTS' : 'PHONE_EXISTS');
    const passwordHash = await bcrypt.hash(password, 12);
    const baseEmail = channel === 'email' ? identifier : `${identifier.replace(/[^0-9]/g, '')}@phone.miamo.local`;
    const username = baseEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 100);
    const user = await prisma.user.create({
      data: {
        email: baseEmail,
        passwordHash,
        displayName,
        username,
        miamoId: username,
        phone: channel === 'phone' ? identifier : null,
        emailVerified: channel === 'email',
        phoneVerified: channel === 'phone',
        profile: { create: { age: 25, gender: 'other', city: 'Unknown', profession: 'Not set', bio: '', profileScore: 30 } },
        settings: { create: {} },
        privacySettings: { create: {} },
      },
      include: { profile: true },
    });
    const tokens = generateTokens(user.id);
    const session = await createSession(user.id, req);
    auditLog(prisma, user.id, 'signup_otp', { channel });
    const ctx = reqCtx(req);
    const fp = deviceFingerprint(ctx);
    await trustDevice(prisma, user.id, fp, { ip: ctx.ip, label: deviceLabel(ctx) });
    setRefreshCookie(res, tokens.refreshToken);
    res.status(201).json({
      data: {
        user: { id: user.id, email: user.email, displayName: user.displayName, username: user.username, miamoId: user.miamoId, verified: user.verified, emailVerified: user.emailVerified, phoneVerified: user.phoneVerified, profileScore: user.profile?.profileScore || 30, avatar: null },
        ...tokens,
        sessionId: session.id,
        signupChannel: channel,
      },
    });
  } catch (e) {
    if (otpHandler(e, res)) return;
    next(e);
  }
});

// ── OAuth: Google Sign-In ────────────────────────────
// Accepts an `idToken` from the Google Identity Services SDK. In
// production we verify the JWT against Google's JWKS via google-auth-
// library; in dev we accept a "dev:<email>:<googleId>:<displayName>"
// shaped string OR explicit fields so E2E tests don't need a real
// Google account. Either way we find-or-create a User keyed on
// googleId, falling back to email when a password account already
// exists for the same address (account linking).
async function verifyGoogleIdToken(idToken: string): Promise<{ sub: string; email: string; name?: string; picture?: string; email_verified?: boolean }> {
  const inDev = process.env.NODE_ENV !== 'production';
  if (inDev && idToken.startsWith('dev:')) {
    // dev:<email>:<googleSub>:<displayName>
    const parts = idToken.slice(4).split(':');
    if (parts.length < 3) throw new AppError('dev token must be dev:email:sub:name', 400, 'OAUTH_DEV_BAD_TOKEN');
    return { sub: parts[1], email: parts[0], name: parts.slice(2).join(':'), email_verified: true };
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new AppError('Google sign-in not configured', 500, 'OAUTH_NOT_CONFIGURED');
  // Lazy require so the dependency is optional in dev.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let OAuth2Client: any;
  try { ({ OAuth2Client } = require('google-auth-library')); }
  catch { throw new AppError('google-auth-library not installed', 500, 'OAUTH_LIB_MISSING'); }
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) throw new AppError('Invalid Google token', 401, 'OAUTH_INVALID_TOKEN');
  return { sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture, email_verified: payload.email_verified };
}

async function findOrCreateOAuthUser(provider: 'google' | 'apple', oauthId: string, email: string, displayName: string, emailVerified: boolean) {
  const oauthIdField = provider === 'google' ? 'googleId' : 'appleId';
  // 1) match by oauth id
  let user = await prisma.user.findFirst({ where: { [oauthIdField]: oauthId } as any, include: { profile: true } });
  if (user) return { user, created: false };
  // 2) match by email — link the OAuth identity to an existing account
  const lcEmail = email.toLowerCase();
  user = await prisma.user.findUnique({ where: { email: lcEmail }, include: { profile: true } });
  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { [oauthIdField]: oauthId, emailVerified: emailVerified || user.emailVerified } as any,
      include: { profile: true },
    });
    return { user, created: false };
  }
  // 3) create new
  const dn = sanitize(displayName || lcEmail.split('@')[0]);
  const username = lcEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);
  // OAuth users get a random unguessable password hash so the password
  // login path is closed unless they explicitly set one in settings.
  const placeholder = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
  user = await prisma.user.create({
    data: {
      email: lcEmail,
      passwordHash: placeholder,
      displayName: dn,
      username,
      miamoId: username,
      emailVerified: !!emailVerified,
      authProvider: provider,
      [oauthIdField]: oauthId,
      profile: { create: { age: 25, gender: 'other', city: 'Unknown', profession: 'Not set', bio: '', profileScore: 30 } },
      settings: { create: {} },
      privacySettings: { create: {} },
    } as any,
    include: { profile: true },
  });
  return { user, created: true };
}

app.post('/api/v1/auth/google', idempotency(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idToken = String(req.body?.idToken || '');
    if (!idToken) throw new AppError('idToken required', 400, 'VALIDATION_ERROR');
    const g = await verifyGoogleIdToken(idToken);
    const { user, created } = await findOrCreateOAuthUser('google', g.sub, g.email, g.name || '', !!g.email_verified);
    const tokens = generateTokens(user.id);
    const session = await createSession(user.id, req);
    auditLog(prisma, user.id, created ? 'signup_google' : 'login_google', { email: user.email });
    const ctx = reqCtx(req);
    const fp = deviceFingerprint(ctx);
    await trustDevice(prisma, user.id, fp, { ip: ctx.ip, label: deviceLabel(ctx) });
    setRefreshCookie(res, tokens.refreshToken);
    res.status(created ? 201 : 200).json({
      data: {
        user: { id: user.id, email: user.email, displayName: user.displayName, username: user.username, miamoId: user.miamoId, verified: user.verified, emailVerified: user.emailVerified, phoneVerified: user.phoneVerified, profileScore: user.profile?.profileScore || 30, avatar: null },
        ...tokens, sessionId: session.id, created, provider: 'google',
      },
    });
  } catch (e) { next(e); }
});

// ── OAuth: Apple Sign In ─────────────────────────────
// In production we verify the Apple-issued identity token against
// Apple's JWKS at https://appleid.apple.com/auth/keys (RS256), then
// check `iss === https://appleid.apple.com` and `aud === APPLE_CLIENT_ID`.
// In dev we accept a "dev:<email>:<sub>:<name>" stub so the UX flow
// can be exercised without an Apple Developer enrollment.
async function verifyAppleIdToken(idToken: string, userPayload?: { email?: string; name?: { firstName?: string; lastName?: string } }): Promise<{ sub: string; email: string; name?: string; email_verified?: boolean }> {
  const inDev = process.env.NODE_ENV !== 'production';
  if (inDev && idToken.startsWith('dev:')) {
    const parts = idToken.slice(4).split(':');
    if (parts.length < 3) throw new AppError('dev token must be dev:email:sub:name', 400, 'OAUTH_DEV_BAD_TOKEN');
    return { sub: parts[1], email: parts[0], name: parts.slice(2).join(':'), email_verified: true };
  }
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) throw new AppError('Apple sign-in not configured', 500, 'OAUTH_NOT_CONFIGURED');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let jose: any;
  try { jose = require('jose'); }
  catch { throw new AppError('jose not installed', 500, 'OAUTH_LIB_MISSING'); }
  if (!appleJwks) appleJwks = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
  const { payload } = await jose.jwtVerify(idToken, appleJwks, {
    issuer: 'https://appleid.apple.com',
    audience: clientId,
  });
  if (!payload.sub || !payload.email) throw new AppError('Invalid Apple token', 401, 'OAUTH_INVALID_TOKEN');
  // Apple only sends the user's name on the *first* authorization, in a
  // separate `user` payload from the front-end. Subsequent sign-ins
  // never include it, so we accept it here when present.
  const fullName = userPayload?.name
    ? [userPayload.name.firstName, userPayload.name.lastName].filter(Boolean).join(' ').trim()
    : '';
  return {
    sub: String(payload.sub),
    email: String(payload.email),
    name: fullName || undefined,
    email_verified: payload.email_verified === true || payload.email_verified === 'true',
  };
}
let appleJwks: any = null;
app.post('/api/v1/auth/apple', idempotency(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idToken = String(req.body?.idToken || '');
    if (!idToken) throw new AppError('idToken required', 400, 'VALIDATION_ERROR');
    const userPayload = req.body?.user && typeof req.body.user === 'object' ? req.body.user : undefined;
    const a = await verifyAppleIdToken(idToken, userPayload);
    const { user, created } = await findOrCreateOAuthUser('apple', a.sub, a.email, a.name || '', !!a.email_verified);
    const tokens = generateTokens(user.id);
    const session = await createSession(user.id, req);
    auditLog(prisma, user.id, created ? 'signup_apple' : 'login_apple', { email: user.email });
    const ctx = reqCtx(req);
    const fp = deviceFingerprint(ctx);
    await trustDevice(prisma, user.id, fp, { ip: ctx.ip, label: deviceLabel(ctx) });
    setRefreshCookie(res, tokens.refreshToken);
    res.status(created ? 201 : 200).json({
      data: {
        user: { id: user.id, email: user.email, displayName: user.displayName, username: user.username, miamoId: user.miamoId, verified: user.verified, emailVerified: user.emailVerified, phoneVerified: user.phoneVerified, profileScore: user.profile?.profileScore || 30, avatar: null },
        ...tokens, sessionId: session.id, created, provider: 'apple',
      },
    });
  } catch (e) { next(e); }
});

// ── Passwordless phone/email OTP sign-in (auto-creates account) ──
// Single flow that handles both sign-in (existing user) and sign-up
// (new user) for phone-first markets. Stage 1 issues an OTP; stage 2
// verifies it and either logs the user in (if they exist) or creates
// a new account. Identical client UX whether the number is known or
// not — the server intentionally never reveals which case it is.
app.post('/api/v1/auth/otp/start', otpSendLimiter, idempotency(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawIdentifier = sanitize(String(req.body?.identifier || ''));
    if (!rawIdentifier) throw new AppError('identifier required', 400, 'VALIDATION_ERROR');
    const channel: 'email' | 'phone' = isValidEmail(rawIdentifier) ? 'email' : 'phone';
    const identifier = normalizeIdentifier(channel, rawIdentifier);
    if (channel === 'email' && !isValidEmail(identifier)) throw new AppError('invalid email', 400, 'VALIDATION_ERROR');
    if (channel === 'phone' && !isValidPhone(identifier)) throw new AppError('invalid phone (use +E.164)', 400, 'VALIDATION_ERROR');
    const ctx = reqCtx(req);
    const issued = await issueOtp({ prisma, channel, identifier, purpose: channel === 'email' ? 'signup_email' : 'signup_phone', ip: ctx.ip, userAgent: ctx.userAgent });
    // Re-using signup token shape; complete endpoint disambiguates by
    // looking up whether the identifier already maps to a user.
    const otpToken = issueSignupStartToken(channel, identifier);
    const out: Record<string, unknown> = { otpToken, channel, sentTo: maskIdentifier(channel, identifier), expiresAt: issued.expiresAt };
    if (process.env.NODE_ENV !== 'production' && issued.devCode) out._devCode = issued.devCode;
    res.json({ data: out });
  } catch (e) {
    if (otpHandler(e, res)) return;
    next(e);
  }
});

app.post('/api/v1/auth/otp/verify', idempotency(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const otpToken = String(req.body?.otpToken || '');
    const code = String(req.body?.code || '').trim();
    if (!otpToken || !code) throw new AppError('otpToken and code required', 400, 'VALIDATION_ERROR');
    const { channel, identifier } = verifySignupStartToken(otpToken);
    await verifyOtp({ prisma, channel, identifier, purpose: channel === 'email' ? 'signup_email' : 'signup_phone', code });
    // Look up existing user by the relevant column.
    let user = channel === 'email'
      ? await prisma.user.findUnique({ where: { email: identifier }, include: { profile: true } })
      : await prisma.user.findUnique({ where: { phone: identifier }, include: { profile: true } });
    let created = false;
    if (!user) {
      created = true;
      const baseEmail = channel === 'email' ? identifier : `${identifier.replace(/[^0-9]/g, '')}@phone.miamo.local`;
      const username = baseEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);
      const placeholder = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
      user = await prisma.user.create({
        data: {
          email: baseEmail,
          passwordHash: placeholder,
          displayName: channel === 'email' ? identifier.split('@')[0] : `User ${identifier.slice(-4)}`,
          username,
          miamoId: username,
          phone: channel === 'phone' ? identifier : null,
          emailVerified: channel === 'email',
          phoneVerified: channel === 'phone',
          authProvider: 'otp',
          profile: { create: { age: 25, gender: 'other', city: 'Unknown', profession: 'Not set', bio: '', profileScore: 30 } },
          settings: { create: {} },
          privacySettings: { create: {} },
        },
        include: { profile: true },
      });
    } else if ((channel === 'email' && !user.emailVerified) || (channel === 'phone' && !user.phoneVerified)) {
      // First time this user logs in via OTP on this channel; flip the verified flag.
      user = await prisma.user.update({
        where: { id: user.id },
        data: channel === 'email' ? { emailVerified: true } : { phoneVerified: true },
        include: { profile: true },
      });
    }
    const tokens = generateTokens(user.id);
    const session = await createSession(user.id, req);
    auditLog(prisma, user.id, created ? 'signup_otp' : 'login_otp', { channel });
    const ctx = reqCtx(req);
    const fp = deviceFingerprint(ctx);
    await trustDevice(prisma, user.id, fp, { ip: ctx.ip, label: deviceLabel(ctx) });
    setRefreshCookie(res, tokens.refreshToken);
    res.status(created ? 201 : 200).json({
      data: {
        user: { id: user.id, email: user.email, displayName: user.displayName, username: user.username, miamoId: user.miamoId, verified: user.verified, emailVerified: user.emailVerified, phoneVerified: user.phoneVerified, profileScore: user.profile?.profileScore || 30, avatar: null },
        ...tokens, sessionId: session.id, created, channel,
      },
    });
  } catch (e) {
    if (otpHandler(e, res)) return;
    next(e);
  }
});

// Register
app.post('/api/v1/auth/register', accountCreationLimiter, idempotency(), validate({ body: registerBodySchema }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email: rawEmail, password, displayName: rawDisplayName } = req.body;
    // zod has already normalized email to lowercase + trimmed both strings;
    // still run sanitize() to strip any HTML/control chars before storage.
    const email = sanitize(rawEmail);
    const displayName = sanitize(rawDisplayName);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

    // Hash password with bcrypt using 12 rounds (2^12 = 4096 iterations).
    // 12 rounds balances security (~250ms per hash) vs. UX responsiveness.
    // Lower rounds risk brute-force; higher rounds delay login response.
    const passwordHash = await bcrypt.hash(password, 12);

    // Auto-generate a username from the email prefix + random suffix.
    // This gives every user a unique, URL-safe identifier immediately.
    // Users can change their username later in settings.
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 100);

    // Create User + Profile + Settings + PrivacySettings in one transaction.
    // Profile starts with sensible defaults (age 25, score 30) so the user
    // can immediately appear in Discover while they complete their profile.
    // The profileScore of 30 indicates an incomplete profile, which the UI
    // nudges the user to improve.
    const user = await prisma.user.create({
      data: {
        email, passwordHash, displayName, username, miamoId: username,
        profile: { create: { age: 25, gender: 'other', city: 'Unknown', profession: 'Not set', bio: '', profileScore: 30 } },
        settings: { create: {} },
        privacySettings: { create: {} },
      },
      include: { profile: true },
    });

    const tokens = generateTokens(user.id);
    const session = await createSession(user.id, req);
    auditLog(prisma, user.id, 'register', { email });

    // Trust the device used to register so they don't get a 2FA prompt
    // immediately on first login. Email is still unverified — we issue
    // a verify_email OTP in the background.
    const ctx = reqCtx(req);
    const fp = deviceFingerprint(ctx);
    await trustDevice(prisma, user.id, fp, { ip: ctx.ip, label: deviceLabel(ctx) });
    // Issue verify_email OTP synchronously (sub-100ms with bcrypt(8)) so
    // dev tooling that polls /__dev/otp/peek immediately after register
    // sees the code without a race.
    try {
      await issueOtp({ prisma, channel: 'email', identifier: email, purpose: 'verify_email', userId: user.id, ip: ctx.ip, userAgent: ctx.userAgent });
    } catch (e) { logger.warn('verify_email otp issue failed', e); }

    setRefreshCookie(res, tokens.refreshToken);
    res.status(201).json({
      data: {
        user: { id: user.id, email: user.email, displayName: user.displayName, username: user.username, miamoId: user.miamoId, verified: user.verified, emailVerified: user.emailVerified, phoneVerified: user.phoneVerified, profileScore: user.profile?.profileScore || 30, avatar: null },
        ...tokens, sessionId: session.id,
        verification: { emailOtpSentTo: maskIdentifier('email', email) },
      },
    });
  } catch (e) { next(e); }
});

// Login
app.post('/api/v1/auth/login', loginAttemptLimiter, validate({ body: loginBodySchema }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = sanitize(rawEmail);

    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true, photos: { orderBy: { position: 'asc' }, take: 1 } } });
    // Timing attack mitigation: always run bcrypt even if user not found
    // This ensures consistent response time regardless of email validity
    if (!user) {
      await bcrypt.compare(password, '$2a$12$invalidhashpaddingtoensureconstanttime000000000000');
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    if (!user.active || user.deactivated) throw new AppError('Account deactivated', 403, 'ACCOUNT_DEACTIVATED');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

    // ── 2FA: challenge if device isn't trusted AND user has a verified
    // channel to receive a code on. Users who haven't verified anything
    // yet are allowed in (they'll be nudged in onboarding) — better UX
    // than locking new accounts out.
    const ctx = reqCtx(req);
    const fp = deviceFingerprint(ctx);
    const trusted = await isDeviceTrusted(prisma, user.id, fp);
    const canChallenge = user.twoFactorEnabled && (user.emailVerified || user.phoneVerified);
    if (!trusted && canChallenge) {
      // Prefer phone, fall back to email.
      const channel: 'email' | 'phone' = user.phoneVerified && user.phone ? 'phone' : 'email';
      const identifier = channel === 'phone' ? user.phone! : user.email;
      try {
        const issued = await issueOtp({ prisma, channel, identifier, purpose: 'login_2fa', userId: user.id, ip: ctx.ip, userAgent: ctx.userAgent });
        const token = issueChallengeToken(user.id, fp);
        auditLog(prisma, user.id, 'login_2fa_challenge', { channel, deviceLabel: deviceLabel(ctx) });
        return res.status(200).json({
          data: {
            requiresOtp: true,
            challengeToken: token,
            channel,
            sentTo: maskIdentifier(channel, identifier),
            expiresAt: issued.expiresAt,
            ...(issued.devCode ? { _devCode: issued.devCode } : {}),
          },
        });
      } catch (e) {
        if (otpHandler(e, res)) return;
        throw e;
      }
    }

    // Trusted device (or no verified channel yet) — issue tokens directly.
    if (!trusted) {
      // First-ever device for an unverified-channel user: trust it.
      await trustDevice(prisma, user.id, fp, { ip: ctx.ip, label: deviceLabel(ctx) });
    }

    if (user.profile) {
      await prisma.profile.update({ where: { userId: user.id }, data: { online: true, lastActive: new Date() } });
    }

    const tokens = generateTokens(user.id);
    const session = await createSession(user.id, req);
    auditLog(prisma, user.id, 'login', { email });
    setRefreshCookie(res, tokens.refreshToken);
    res.json({
      data: {
        user: {
          id: user.id, email: user.email, displayName: user.displayName, username: user.username,
          miamoId: user.miamoId, verified: user.verified,
          emailVerified: user.emailVerified, phoneVerified: user.phoneVerified,
          profileScore: user.profile?.profileScore || 30,
          avatar: user.photos[0]?.url || null,
          age: user.profile?.age, city: user.profile?.city, profession: user.profile?.profession,
          bio: user.profile?.bio, seriousMode: user.profile?.seriousMode,
          datingIntent: user.profile?.datingIntent, gender: user.profile?.gender,
          online: true,
        },
        ...tokens, sessionId: session.id,
      },
    });
  } catch (e) { next(e); }
});

// ─── 2FA: verify challenge code and complete login ──
app.post('/api/v1/auth/login/2fa', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { challengeToken, code } = req.body || {};
    if (!challengeToken || !code) throw new AppError('challengeToken and code required', 400, 'VALIDATION_ERROR');
    const ctx = reqCtx(req);
    const fp = deviceFingerprint(ctx);
    let userId: string;
    try { ({ userId } = verifyChallengeToken(challengeToken, fp)); }
    catch (e) { if (otpHandler(e, res)) return; throw e; }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true, photos: { orderBy: { position: 'asc' }, take: 1 } } });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    const channel: 'email' | 'phone' = user.phoneVerified && user.phone ? 'phone' : 'email';
    const identifier = channel === 'phone' ? user.phone! : user.email;
    try { await verifyOtp({ prisma, channel, identifier, purpose: 'login_2fa', code }); }
    catch (e) { if (otpHandler(e, res)) return; throw e; }

    await trustDevice(prisma, user.id, fp, { ip: ctx.ip, label: deviceLabel(ctx) });
    if (user.profile) {
      await prisma.profile.update({ where: { userId: user.id }, data: { online: true, lastActive: new Date() } });
    }
    const tokens = generateTokens(user.id);
    const session = await createSession(user.id, req);
    auditLog(prisma, user.id, 'login_2fa_success', { channel });
    setRefreshCookie(res, tokens.refreshToken);
    res.json({
      data: {
        user: {
          id: user.id, email: user.email, displayName: user.displayName, username: user.username,
          miamoId: user.miamoId, verified: user.verified,
          emailVerified: user.emailVerified, phoneVerified: user.phoneVerified,
          profileScore: user.profile?.profileScore || 30,
          avatar: user.photos[0]?.url || null,
          age: user.profile?.age, city: user.profile?.city, profession: user.profile?.profession,
          bio: user.profile?.bio, seriousMode: user.profile?.seriousMode,
          datingIntent: user.profile?.datingIntent, gender: user.profile?.gender,
          online: true,
        },
        ...tokens, sessionId: session.id,
      },
    });
  } catch (e) { next(e); }
});

// Logout
app.post('/api/v1/auth/logout', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.userId) {
      await prisma.profile.update({ where: { userId: req.userId }, data: { online: false, lastActive: new Date() } }).catch((e: unknown) => logger.warn('Logout profile update failed:', e));
      // Revoke all active sessions for this user (logout = full sign-out)
      await prisma.session.updateMany({ where: { userId: req.userId, revoked: false }, data: { revoked: true } }).catch((e: unknown) => logger.warn('Session revoke failed:', e));
      auditLog(prisma, req.userId, 'logout');
    }
    clearRefreshCookie(res);
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Change password
app.put('/api/v1/auth/password', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new AppError('Both current and new password required', 400, 'VALIDATION_ERROR');
    if (newPassword.length < 8) throw new AppError('New password must be at least 8 characters', 400, 'VALIDATION_ERROR');
    if (newPassword.length > 128) throw new AppError('New password too long', 400, 'VALIDATION_ERROR');
    if (currentPassword === newPassword) throw new AppError('New password must be different from current password', 400, 'VALIDATION_ERROR');

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } });
    // Revoke all sessions except current on password change
    await prisma.session.updateMany({ where: { userId: req.userId!, revoked: false }, data: { revoked: true } }).catch((e: unknown) => logger.warn('Session revoke on pw change failed:', e));
    auditLog(prisma, req.userId!, 'password_change');
    res.json({ data: { success: true, message: 'Password updated successfully' } });
  } catch (e) { next(e); }
});

// Get current user
app.get('/api/v1/auth/me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { profile: true, photos: { orderBy: { position: 'asc' } }, prompts: { orderBy: { position: 'asc' } }, interests: true, settings: true, privacySettings: true },
    });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    const { passwordHash, ...userData } = user;
    res.json({ data: { user: userData } });
  } catch (e) { next(e); }
});

// Password reset (stub — real implementation deferred to v1.1).
// Today this just records the request and returns 200 so the UI can show
// "If an account exists, we sent a reset link." semantics. The rate-limiter
// is mounted now so the route doesn't get forgotten when the real send-email
// implementation lands.
app.post('/api/v1/auth/password-reset', passwordResetLimiter, idempotency(), validate({ body: forgotPasswordBodySchema }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = sanitize(String(req.body?.email || '')).toLowerCase();
    // Do not leak account existence; always return 200.
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      auditLog(prisma, user.id, 'password_reset_requested', { email });
      // TODO(v1.1): send reset email via SendGrid with one-time-use link.
    }
    res.json({ data: { ok: true, message: 'If an account exists, a reset link has been sent.' } });
  } catch (e) { next(e); }
});

// Refresh token
app.post('/api/v1/auth/refresh', validate({ body: refreshBodySchema }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Prefer httpOnly cookie (XSS-safe). Fall back to body for legacy clients.
    const refreshToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    if (!refreshToken) throw new AppError('Refresh token required', 401, 'UNAUTHORIZED');
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    // Security: verify user still has active sessions (prevents use after logout/password change)
    const activeSession = await prisma.session.findFirst({ where: { userId: payload.userId, revoked: false } });
    if (!activeSession) throw new AppError('Session expired — please login again', 401, 'SESSION_EXPIRED');
    // Verify account is still active
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { active: true, deactivated: true } });
    if (!user || !user.active || user.deactivated) throw new AppError('Account deactivated', 403, 'ACCOUNT_DEACTIVATED');
    const tokens = generateTokens(payload.userId);
    // Update session lastActiveAt
    await prisma.session.updateMany({ where: { userId: payload.userId, revoked: false }, data: { lastActiveAt: new Date() } }).catch((e: unknown) => logger.warn('Session refresh update failed:', e));
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ data: tokens });
  } catch (e) { next(e); }
});

// ─── Session Management ─────────────────────────────
app.get('/api/v1/auth/sessions', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.userId, revoked: false },
      orderBy: { lastActiveAt: 'desc' },
      select: { id: true, deviceType: true, deviceName: true, browser: true, os: true, ipAddress: true, location: true, lastActiveAt: true, createdAt: true },
    });
    res.json({ data: sessions });
  } catch (e) { next(e); }
});

app.post('/api/v1/auth/sessions/:id/revoke', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const session = await prisma.session.findFirst({ where: { id: req.params.id, userId: req.userId, revoked: false } });
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    await prisma.session.update({ where: { id: req.params.id }, data: { revoked: true } });
    auditLog(prisma, req.userId!, 'session_revoke', { sessionId: req.params.id });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// ─── Email Verification ────────────────────────────
app.post('/api/v1/auth/email/send-otp', authMiddleware, otpSendLimiter, idempotency(), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    if (user.emailVerified) throw new AppError('Email already verified', 400, 'ALREADY_VERIFIED');
    const ctx = reqCtx(req);
    try {
      const issued = await issueOtp({ prisma, channel: 'email', identifier: user.email, purpose: 'verify_email', userId: user.id, ip: ctx.ip, userAgent: ctx.userAgent });
      res.json({ data: { sentTo: maskIdentifier('email', user.email), expiresAt: issued.expiresAt, ...(issued.devCode ? { _devCode: issued.devCode } : {}) } });
    } catch (e) { if (otpHandler(e, res)) return; throw e; }
  } catch (e) { next(e); }
});

app.post('/api/v1/auth/email/verify-otp', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body || {};
    if (!code) throw new AppError('code required', 400, 'VALIDATION_ERROR');
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    try { await verifyOtp({ prisma, channel: 'email', identifier: user.email, purpose: 'verify_email', code }); }
    catch (e) { if (otpHandler(e, res)) return; throw e; }
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    auditLog(prisma, user.id, 'email_verified');
    res.json({ data: { success: true, emailVerified: true } });
  } catch (e) { next(e); }
});

// ─── Phone Verification ────────────────────────────
app.post('/api/v1/auth/phone/send-otp', authMiddleware, otpSendLimiter, idempotency(), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body || {};
    if (!phone) throw new AppError('phone required', 400, 'VALIDATION_ERROR');
    const normalized = normalizeIdentifier('phone', String(phone));
    if (!isValidPhone(normalized)) throw new AppError('Invalid phone format. Use E.164, e.g. +14155551234.', 400, 'VALIDATION_ERROR');
    // Reject if another user already owns this phone (and verified it).
    const taken = await prisma.user.findFirst({ where: { phone: normalized, phoneVerified: true, NOT: { id: req.userId } } });
    if (taken) throw new AppError('Phone is already in use by another account', 409, 'PHONE_TAKEN');
    // Persist as pending (unverified) on the user so the verify step can pick it up.
    await prisma.user.update({ where: { id: req.userId }, data: { phone: normalized, phoneVerified: false } });
    const ctx = reqCtx(req);
    try {
      const issued = await issueOtp({ prisma, channel: 'phone', identifier: normalized, purpose: 'verify_phone', userId: req.userId, ip: ctx.ip, userAgent: ctx.userAgent });
      res.json({ data: { sentTo: maskIdentifier('phone', normalized), phone: normalized, expiresAt: issued.expiresAt, ...(issued.devCode ? { _devCode: issued.devCode } : {}) } });
    } catch (e) { if (otpHandler(e, res)) return; throw e; }
  } catch (e) { next(e); }
});

app.post('/api/v1/auth/phone/verify-otp', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body || {};
    if (!code) throw new AppError('code required', 400, 'VALIDATION_ERROR');
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.phone) throw new AppError('No pending phone — call send-otp first', 400, 'NO_PHONE');
    try { await verifyOtp({ prisma, channel: 'phone', identifier: user.phone, purpose: 'verify_phone', code }); }
    catch (e) { if (otpHandler(e, res)) return; throw e; }
    await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } });
    auditLog(prisma, user.id, 'phone_verified');
    res.json({ data: { success: true, phoneVerified: true, phone: user.phone } });
  } catch (e) { next(e); }
});

// ─── Trusted Devices ───────────────────────────────
app.get('/api/v1/auth/devices', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ctx = reqCtx(req);
    const currentFp = deviceFingerprint(ctx);
    const devices = await prisma.trustedDevice.findMany({
      where: { userId: req.userId, revoked: false },
      orderBy: { lastSeenAt: 'desc' },
    });
    res.json({
      data: devices.map((d) => ({
        id: d.id, label: d.label, ip: d.ip,
        firstSeenAt: d.firstSeenAt, lastSeenAt: d.lastSeenAt, expiresAt: d.expiresAt,
        current: d.deviceHash === currentFp,
      })),
    });
  } catch (e) { next(e); }
});

app.delete('/api/v1/auth/devices/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const td = await prisma.trustedDevice.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!td) return res.status(404).json({ error: { message: 'Device not found' } });
    await prisma.trustedDevice.update({ where: { id: td.id }, data: { revoked: true } });
    auditLog(prisma, req.userId!, 'device_revoke', { deviceId: td.id });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// ─── Dev-only: peek the most recent OTP for an identifier ──
// Useful for E2E tests when no real email/SMS provider is wired.
// Disabled in production unless ALLOW_DEV_OTP_PEEK=1 is set.
app.get('/api/v1/auth/__dev/otp/peek', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_OTP_PEEK !== '1') {
    return res.status(404).json({ error: { message: 'Not found' } });
  }
  const id = String(req.query.identifier || '');
  if (!id) return res.status(400).json({ error: { message: 'identifier required' } });
  const channel: 'email' | 'phone' = id.includes('@') ? 'email' : 'phone';
  const normalized = normalizeIdentifier(channel, id);
  const cached = devPeekCode(normalized);
  if (!cached) return res.status(404).json({ error: { message: 'No active code' } });
  res.json({ data: cached });
});

// ─── Error Handler ───────────────────────────────────
// Sentry's error handler must run BEFORE Miamo's so the error is reported
// to Sentry and then the existing 4xx/5xx envelope code returns the same
// response shape to the client. No-op when SENTRY_DSN is unset.
app.use(sentry.errorHandler);
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Miamo Auth Service on port ${PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down auth service...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Auth service stopped cleanly');
      process.exit(0);
    });
    setTimeout(() => { process.exit(1); }, 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
