// ─── Per-endpoint strict rate limiters ──────────────────────────────
// The gateway already applies broad tier limits (`authLimiter`, `expensiveLimiter`,
// `feedLimiter`) at ~30-60 req/min/IP. Those tiers are too permissive for the
// handful of routes where abuse maps directly to user harm:
//   • account creation     — fake-account spam, growth-metric pollution
//   • login                — credential stuffing
//   • OTP send             — SMS-cost burn, victim-mailbox spam
//   • password reset       — same as OTP, plus email-deliverability harm
//   • payment init         — gateway/merchant fee abuse
//   • payment webhook      — provider retry storms can still need a high ceiling
//
// We expose pre-configured limiters here so individual services can mount them
// per-route without re-implementing the windowMs/max/keyGenerator math.
//
// Notes:
//   • These run AT THE SERVICE, after the gateway proxy. The gateway tier limits
//     still apply first. This is a defense-in-depth second layer keyed to the
//     specific abuse-vector for the route.
//   • Limits intentionally use in-memory store (the default). For multi-replica
//     auth/content deployments, swap in a `rate-limit-redis` store as the gateway
//     does — but for v1 single-EC2 the per-pod memory store is correct.
//   • Each limiter returns the standard `{error: {code, message}}` envelope on
//     429 so the web SDK can route to the rate-limit toast handler.
import rateLimit from 'express-rate-limit';

const standardOpts = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
};

// 3 account creations per hour per IP. Hard cap because each successful create
// burns a User row + a Profile row + sends a welcome email; abuse is high-cost.
export const accountCreationLimiter = rateLimit({
  ...standardOpts,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many account-creation attempts. Try again in 1 hour.',
      statusCode: 429,
    },
  },
});

// 5 login attempts per 15min keyed by IP+email. Slows per-account credential
// stuffing without punishing shared NATs (office, coffee shop) — a single IP
// can still service many distinct emails before its global gateway tier kicks in.
export const loginAttemptLimiter = rateLimit({
  ...standardOpts,
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Try again in 15 minutes.',
      statusCode: 429,
    },
  },
  // Key by IP + email so the same IP attacking a single email gets locked out,
  // but a shared IP can still service distinct users.
  keyGenerator: (req) => {
    const email = String(req.body?.email ?? req.body?.identifier ?? '').toLowerCase();
    return `${req.ip || 'anon'}:${email}`;
  },
});

// 3 OTPs per hour per (IP, identifier). Caps SMS spend and the victim-mailbox
// spam vector where an attacker triggers OTPs to harass a target.
export const otpSendLimiter = rateLimit({
  ...standardOpts,
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many OTP requests. Try again in 1 hour.',
      statusCode: 429,
    },
  },
  keyGenerator: (req) => {
    const id = String(req.body?.identifier ?? req.body?.email ?? req.body?.phone ?? '');
    return `${req.ip || 'anon'}:${id}`;
  },
});

// 3 password-reset emails per hour, keyed by email alone (not IP) so a coordinated
// attack from many IPs against one mailbox still gets throttled.
export const passwordResetLimiter = rateLimit({
  ...standardOpts,
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many password reset requests. Try again in 1 hour.',
      statusCode: 429,
    },
  },
  keyGenerator: (req) => String(req.body?.email ?? '').toLowerCase() || (req.ip || 'anon'),
});

// 10 payment initiations per minute per user/IP. Each init creates a Razorpay
// order — abuse burns merchant API quota and risks anti-fraud blocks.
export const paymentInitLimiter = rateLimit({
  ...standardOpts,
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many payment requests. Slow down.',
      statusCode: 429,
    },
  },
  keyGenerator: (req) => (req.headers['x-user-id'] as string) || req.ip || 'anon',
});

// Webhook limiter is intentionally generous — providers can burst-retry on
// transient 5xx, and we'd rather absorb the spike than drop a legitimate
// payment confirmation. The provider signature is the real anti-replay gate;
// this limiter just caps insane runaway loops.
export const webhookLimiter = rateLimit({
  ...standardOpts,
  windowMs: 60 * 1000,
  max: 60, // ~1/sec sustained
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Webhook rate limit exceeded.',
      statusCode: 429,
    },
  },
});
