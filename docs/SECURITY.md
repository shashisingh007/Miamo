# Security — how we protect Priya, Arjun, Karan, and Riya

> **Document version:** v3.6.1 (2026-06-25)
> **Applies to:** Miamo platform v3.6.x (web + 11 microservices)
> **Audience:** engineering, legal, DPIA reviewers, security auditors
> **Pair-write style:** every section opens with a plain-English paragraph anchored on one of our four personas (Priya, Arjun, Karan, Riya), then drops into technical detail. If a sentence reads like marketing, it is a bug — file an issue against this file.

---

## TL;DR

Miamo's security model rests on **three core protections**, **four user-facing consent toggles**, and a compliance posture mapped to **DPDP 2023 (India)**, **GDPR (EU)**, **CCPA (California)**, **Apple ATT**, **Safari ITP**, and the **OWASP Top 10**.

The three protections, in one line each:

1. **The wristband (JWT).** A signed, 15-minute access token plus a 30-day refresh token (rotated on every use) hands Priya proof-of-identity without exposing her password on every request. Algorithm: HS256. Secret: `JWT_SECRET`. Refresh secret: `JWT_REFRESH_SECRET` (distinct, so an access-token leak does not let an attacker mint refresh tokens). Pre-verified with a regex format check before the expensive `jwt.verify()` to harden against malformed-token DoS.
2. **The locked diary (AES-256-GCM).** Every message Priya sends Arjun is encrypted with a per-message random 12-byte IV and an AEAD authentication tag, using a key derived once at boot from `scrypt(ENCRYPTION_KEY, ENCRYPTION_SALT, 32)`. Plaintext never lives in Postgres. The DBAs cannot read it. We cannot read it.
3. **The wax seal (HMAC-SHA256 on tracking).** Every behavioural event (swipe, dwell, focus, voice play) keys on `uidHash = HMAC-SHA256(TRACKING_HASH_SECRET, userId).digest('base64url').slice(0, 22)` — never the raw user id. A database breach of `UserActivity`, `EventAggHourly`, `PairCompatCache`, `SessionSummary`, `FeatureSnapshot`, etc. leaks 22-character pseudonyms, not identities.

The four user-facing consent toggles (introduced in v3.6.0 — all live in `PUT /api/v1/users/me/settings`):

| Toggle | Default | Gates |
|---|---|---|
| `moodInferenceEnabled` | **FALSE** (opt-in) | Intent/mood inference worker writes (vibe embedding, DTM mood-conditional ordering). |
| `behavioralRankingEnabled` | TRUE | Use of UserActivity-derived signals (dwell, polarity, depth) in Discover ranking. |
| `crossUserInferenceEnabled` | TRUE | Use of other users' behaviour (PairCompatCache reads) to shape what this user sees. Doubles as the CCPA "Do Not Sell" opt-out. |
| `algorithmicTransparency` | TRUE | Whether the WhyCard popover renders and `/discover/:id/why` returns ingredient breakdowns. |

Compliance mapping in one line: DPDP §6 (consent), §11 (RTBF), §13 (children), §22 (cross-border) — all satisfied. GDPR Article 6 (lawful basis), Article 22 (automated decisions, with WhyCard as the human-review path) — satisfied. CCPA §1798.105 (delete), §1798.135 (Global Privacy Control header) — satisfied. Apple ATT — deferred to v3.7 native ship. Safari ITP — mitigated via cookie + IndexedDB fallback.

RTBF mechanism: **shard delete via `TRACKING_HASH_SECRET` rotation** plus **per-user `forget.ts` worker** at `services/tracking-worker/src/forget.ts`. Individual deletes are O(N) per user; a secret rotation re-keys the entire downstream tracking topology in O(1) (every historical `uidHash` mismatches the new HMAC, so longitudinal joins break). We do both: per-user delete on request (SLA: 24h hot, 7d cold) and annual secret rotation as defence in depth.

OWASP Top 10 mapping: see Section 9. All ten categories addressed with named primary control + secondary defence.

---

## How to read this

- **Meera (non-technical reader; legal, ops, founders).** Read the TL;DR, "Priya's journey through security," and Section 10 (DPDP / GDPR / CCPA / ATT / ITP), Section 11 (consent toggles), Section 14 (secrets), Section 15 (compliance checklist). Skim everything else.
- **Priya (PM, designer, product reviewer).** Read TL;DR through Section 11. Sections 12–14 explain how RTBF, audit logging, and secrets management map back to user-visible behaviour.
- **Arjun (engineer, on-call, security reviewer).** Read all sections. Pay particular attention to Section 1.4 (JWT pre-verify pattern), Section 3 (chat encryption with key-rotation semantics), Section 12 (RTBF flow with pseudocode), Section 14 (which secrets rotate and which do not), and Section 16 (incident response).
- **Riya (auditor, external compliance reviewer).** Sections 9, 10, 13, 14, 15. Each cites source files by absolute path so claims can be re-checked against the running code.

---

## Priya's journey through security

It is 9:42pm in Bengaluru. Priya, 27, opens Miamo on her train home from Indiranagar. Walk with her keystroke by keystroke; everything below is happening for her benefit even though she sees almost none of it.

1. **She types her password.** We never store the plaintext. Her password goes through bcryptjs at cost factor 12 — about 250 milliseconds of deliberate slowness per attempt. That cost is the difference between an attacker trying a billion passwords in a few hours (which is what would happen at cost 4) and the same attacker needing about eight years to grind through the same dictionary against her single account. We then forget the plaintext immediately; only the bcrypt hash hits the `User.passwordHash` column.
2. **The wristband appears.** On a successful login Priya receives two tokens. The **access token** (15-minute lifetime, signed HS256 with `JWT_SECRET`) is what every API call carries. The **refresh token** (30-day lifetime, signed HS256 with `JWT_REFRESH_SECRET`, lives in an `httpOnly Secure SameSite=Lax` cookie) is what her browser silently uses to get a new access token when the old one expires. Refresh tokens are rotated on every use, so a refresh-token replay is detected the second time it shows up.
3. **She walks into Settings.** This is v3.6.0's most visible security surface. Priya sees four consent toggles. **Mood signal** is OFF by default — we do not infer her emotional state from her tap patterns unless she opts in. **Behavioural ranking** is ON by default because it is the core function of Discover (her dwell times influence what we show her, not who others see). **Cross-user inference** is ON by default but doubles as the CCPA "Do Not Sell" opt-out — flipping it off stops us from using *other* users' behaviour to rank her view. **Algorithmic transparency** is ON by default and gates whether the WhyCard popover renders.
4. **She messages Arjun: "I really like your photos."** Before that string crosses the boundary into Postgres, the messaging service runs it through AES-256-GCM with a fresh 12-byte random IV. Three columns land in `Message`: `iv`, `ciphertext`, `authTag`. The plaintext never exists in the database. Even if a DBA SSHs into Postgres and runs `SELECT * FROM "Message"`, all they see is binary noise. The authTag is AEAD's tamper detection: if anyone flips a single bit of the ciphertext, decryption fails loud rather than returning a corrupted plaintext.
5. **She swipes.** Every swipe creates a tracking event. The event does not contain `userId="usr_priya_abc123"` — it contains `uidHash="k7x9m2p1q5r8t3n0v4w6"`, derived from `HMAC-SHA256(TRACKING_HASH_SECRET, userId).digest('base64url').slice(0, 22)`. The same Priya produces the same hash, so we can correlate her events across time, but if the tracking warehouse leaks, the attacker sees 22-character pseudonyms with no path back to identity unless they also have `TRACKING_HASH_SECRET`.
6. **She taps WhyCard.** On a candidate profile she sees a card explaining "three-star reason: same neighbourhood; two-star reason: both into theatre; one-star reason: similar weekend rhythm." This is not a UX flourish. It is GDPR Article 22's "right to know the logic involved in automated decisions" implemented in the product. The endpoint is `GET /api/v1/discover/:id/why`. The transparency toggle gates whether it renders.
7. **She taps "Show me less like this."** This writes a `MatchFeedback` row with `reason=topic_avoidance`. The learner loop (`services/tracking-worker/src/learnerLoop.ts`) picks it up and incorporates it with a bounded weight — capped so a single user cannot corrupt the global model. This is GDPR Article 22's "right to express viewpoint" and "right to human review" pathway.
8. **Her phone runs out of battery.** The next morning, her 15-minute access token has long expired. Her browser uses the refresh token cookie to silently mint a new access token. If she had changed her password overnight, every session would have been hard-deleted (`db.session.deleteMany({ where: { userId } })`) and she would be forced to re-login.
9. **A year later, she leaves Miamo.** She taps Settings → Delete Account. We send her an OTP, wait for a 24-hour cooling-off period, then run the RTBF flow: hard-delete her `User` row (cascading deletes via Prisma `onDelete: Cascade` clear approximately 50 child tables), enqueue `forgetUser(prisma, priya.id)` in `services/tracking-worker/src/forget.ts` to delete-by-uidHash across the 14 in-Postgres tracking tables, and queue a cold-store rewrite job for the 90 days of compressed NDJSON archives. We write one immutable `AuditLog` row (`action=user.delete.completed`) with a 7-year legal-hold retention. By the DPDP-required 30-day SLA she is gone; in practice we hit it within 24 hours for hot tables.

That is the journey. Sections 1 through 16 below explain each layer in mechanical detail.

---

## Section 1 — Authentication

**Plain English (Priya).** When Priya logs in we do three things at once: we prove she is who she says she is (bcrypt), we hand her a short-lived proof of identity she can carry around (the JWT access token), and we hand her a longer-lived "renew the wristband" coupon (the refresh token, kept in an httpOnly cookie her own browser cannot read). If her phone is stolen the attacker has at most fifteen minutes of access; if she changes her password we tear up every wristband ever issued to her.

**Technical (Arjun).** Authentication is built on four primitives composed across the auth service (`services/auth/src/server.ts`), the gateway middleware (`services/gateway/src/middleware/auth.ts`), and the shared secret loader (`services/shared/src/env.ts`). The primitives are: bcryptjs at cost 12 for password storage, HS256 JWTs with two distinct secrets, a regex pre-verification step before `jwt.verify()`, and the OTP module at `services/shared/src/verification.ts` for sign-up and 2FA flows.

### 1.1 Password hashing

We use `bcryptjs` at cost factor 12. That means each hash takes roughly 250 milliseconds of CPU on a modern x86 core (measured on `c7i.large` and on an M2 dev laptop; both land in the 220–280ms band). The cost factor is the exponent in the underlying Blowfish key schedule, so doubling cost factor to 13 doubles the work per attempt; we picked 12 because it is the largest value that keeps the median login latency under 300ms while still costing an attacker too much to be worth it.

**The attack-time math, worked out for a reviewer:**

- Cost 12 → ~250ms per attempt on one core.
- A determined attacker with 64 cores grinding a stolen `passwordHash` row can try roughly 256 attempts per second.
- Against one account with one billion candidate passwords (a typical leaked-password list): 1,000,000,000 / 256 ≈ 3.9 million seconds ≈ 45 days per core. Across 64 cores in parallel: still ~17 hours, but only for one account. Against ten million accounts in parallel the per-account work is unchanged — the attacker cannot amortise.
- More realistically, against the ~14 million entries in `rockyou.txt`: 14e6 / 256 ≈ 15 hours per account on a single core, ~14 minutes on 64 cores. So if Priya's password is in `rockyou.txt`, bcrypt does not save her — it slows the attacker but does not stop them. **bcrypt is necessary but not sufficient**; we rely on it being combined with rate-limiting (Section 4), strong-password validation at signup, and 2FA challenge for sensitive flows.

We never store plaintext, ever. The bcryptjs `compare()` function does a constant-time comparison so we are not leaking timing side channels on the hash compare step.

**Source:** `services/auth/src/server.ts` (login, register, password-reset handlers) and `services/shared/src/schemas.ts` (`registerBodySchema`, `passwordSchema` — 8 to 128 chars).

### 1.2 JWT access tokens

- **Algorithm:** HS256 (HMAC-SHA256). Symmetric — the gateway and the issuing service share `JWT_SECRET`.
- **Lifetime:** 900 seconds (15 minutes).
- **Claims:** `sub` (user id), `iat`, `exp`, `jti`, `sid` (session id, joins to `Session.id`), `region` (for GPC / CCPA evaluation), `tdv` (trusted-device version — flips when a device falls out of trust).
- **Verification:** every request through the gateway runs `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })`. The explicit `algorithms` allowlist defends against the well-known `alg: none` and "RS256 verified as HS256 with the public key as secret" attacks.

**Why 15 minutes?** Short enough that a leaked access token has a small blast-radius window; long enough that a slow mobile network does not force a refresh on every request. The 15-minute number is a defensible industry default — every refresh is one extra hop that costs 50–150ms — and the maths trades off well against the cost of detection-and-rotation if a token is exfiltrated.

**Why HS256 not RS256?** All the services that need to *verify* tokens are inside our trust boundary; there is no external relying party. RS256 would force us to manage a key-pair plus rotation of the public key out to verifiers, all to gain a property (verifier cannot mint) we do not need. HS256 with one shared secret keeps the rotation story simple.

### 1.3 JWT refresh tokens

- **Algorithm:** HS256, signed with `JWT_REFRESH_SECRET` — a **distinct** secret from `JWT_SECRET`. This separation matters: if `JWT_SECRET` leaks (an access-token-validating service is compromised) the attacker can mint access tokens but **cannot mint refresh tokens**, so the blast radius is bounded by the 15-minute access-token lifetime.
- **Lifetime:** 2,592,000 seconds (30 days).
- **Storage:** `httpOnly Secure SameSite=Lax` cookie. JavaScript on the page cannot read it (XSS resistance); SameSite=Lax stops cross-site form-based theft; Secure stops it from ever leaving over plaintext HTTP.
- **Rotation:** on every successful refresh, the old refresh token is hard-deleted from the `Session` table and a new one is issued. A replayed refresh token is detected on the second use (the row is already gone) → 401 → session revoked → user re-logged-in.

**Refresh-rotation invariant.** Every valid refresh token corresponds to exactly one `Session` row in Postgres. The auth service joins `jti → Session.id` on refresh; rotation does `DELETE … RETURNING` and inserts a new row in the same transaction. If two callers race the same refresh token, exactly one wins the DELETE (Postgres serialisable isolation on the `Session` table) and the other gets a 401. The "lose" client falls back to a hard re-login.

**Why we delete on rotation rather than mark-revoked.** Storage savings are trivial; the real reason is auditability. A breach scan can `SELECT * FROM "Session"` and trust that every row is a *currently-valid* session. A "revoked" flag is one more bit of state to mishandle.

### 1.4 JWT format pre-verify regex

Before calling the expensive `jwt.verify()`, the gateway runs:

```ts
// services/gateway/src/middleware/auth.ts (sketch)
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!JWT_RE.test(token)) {
    return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED', statusCode: 401 } });
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    req.userId = payload.sub;
    req.sessionId = payload.sid;
    return next();
  } catch (err) {
    return res.status(401).json({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED', statusCode: 401 } });
  }
}
```

**Why the regex first?** `jwt.verify` is a base64-decode plus HMAC-SHA256. The HMAC is constant-time-ish but the base64 decode of a 100kB attacker-crafted string is decidedly not free. A malformed-token DoS — sending a million garbage strings per second — would otherwise burn CPU on every request. The regex is a five-instruction reject on the hot path.

**What the regex enforces.** Three dot-separated base64url segments, each non-empty. It does not validate the JSON inside the segments — that is `jwt.verify`'s job. It just guarantees the input is *shaped* like a JWT before we spend cycles on it.

**What it does not protect against.** Real JWTs that have been tampered with — those will fail HMAC verification and throw inside the `try`. The regex pre-check is purely a CPU shield against malformed input, not a security boundary.

### 1.5 OTP for sign-up and 2FA

OTP lives in `services/shared/src/verification.ts`. Two-stage signup, login 2FA, password reset, and trusted-device confirmation all route through it.

**Constants (from source):**

- `OTP_LENGTH = 6` — six-digit numeric code.
- `OTP_TTL_MS = 10 * 60 * 1000` — 10-minute expiry.
- `OTP_MAX_ATTEMPTS = 5` — wrong-code lockout after five tries on a single code.
- `OTP_RESEND_COOLDOWN_MS = 60 * 1000` — minimum 60 seconds between resends.
- `OTP_DAILY_CAP = 8` — at most 8 OTPs issued per identifier per 24h.
- `TRUSTED_DEVICE_TTL_MS = 30 * 24 * 60 * 60 * 1000` — 30 days for a remembered device.

**Code generation.** `crypto.randomInt(0, 10**6)` — cryptographically-secure uniform draw across the 6-digit space. We then `bcrypt.hash(code, 8)` and store *only the hash* in the `Otp` row. The plaintext is sent to the user and never persisted. On verify, `bcrypt.compare(submitted, otp.codeHash)` confirms the match in constant time.

**Why cost factor 8 here and not 12 like passwords?** OTPs live for 10 minutes. The attacker cannot grind for days; the rate limit and 5-attempt cap dominate. Cost 8 is ~16ms; cost 12 would be ~250ms. We chose latency over a defence that does not buy us anything in this threat model.

**Channels.** `OtpChannel = 'email' | 'phone'`. Email delivery routes to the provider in `OTP_PROVIDER_EMAIL` (default `'dev'`, production options `'sendgrid'`); SMS routes to `OTP_PROVIDER_SMS` (default `'dev'`, production options `'twilio'`).

**Purposes.** `OtpPurpose = 'verify_email' | 'verify_phone' | 'login_2fa' | 'password_reset' | 'signup_email' | 'signup_phone'`. The purpose is part of the row's key, so an OTP issued for `password_reset` cannot be replayed as a `login_2fa` confirmation.

**Identifier normalisation.** `normalizeIdentifier(channel, raw)` trims and lowercases emails; for phones it strips everything but digits and `+`, auto-prepends `+91` for 10-digit Indian inputs, else prefixes `+`. We index OTPs on the normalised form so `+919876543210` and `9876543210` resolve to the same record.

**Trusted-device tokens.** After a successful 2FA confirmation, we compute `deviceFingerprint({ userAgent, ip, salt: DEVICE_FP_SALT })` — a SHA-256 of `${browser}|${os}|${ipNet}|${salt}`. IP is truncated to /16 so mobile NAT changes do not invalidate the fingerprint. The resulting hash plus userId becomes a `TrustedDevice` row with a 30-day expiry; subsequent logins from that fingerprint skip the OTP prompt. A device falls out of trust if the user changes their password (sessions cascade) or hits the explicit "log out of all devices" button (`POST /api/v1/auth/sessions/revoke-all`).

**Challenge tokens for post-password / pre-2FA flow.** Between "you got the password right" and "now prove second factor," we issue a 10-minute HMAC handle `${userId}.${deviceHash}.${exp}` signed with `JWT_SECRET` (separate slice, 32 chars). The client carries it on the 2FA submit; we re-verify before consuming the OTP. Errors: `CHALLENGE_INVALID, CHALLENGE_EXPIRED, CHALLENGE_DEVICE_MISMATCH`.

---

## Section 2 — Authorization

**Plain English (Arjun the engineer this time).** Authentication answers "who are you?" Authorization answers "are you allowed to do this?" Every protected endpoint in Miamo runs both checks: the gateway extracts the user id from a verified JWT, and the downstream service trusts that header *only* when it also sees a matching internal-service key. This is a defence in depth — if a single service is somehow reachable directly from outside the cluster (a NAT misconfiguration, a Kubernetes ingress drift), the internal key check still rejects the call.

**Technical.** The split is: gateway-fronted external traffic uses `authMiddleware` (verifies user JWT and sets `req.userId` plus `X-User-Id` outbound to downstream services); downstream services use `createInternalAuthMiddleware()` (requires both `X-User-Id` and `X-Internal-Key === env.internalServiceKey`).

### 2.1 `authMiddleware` on every protected route

Every external-facing route in the gateway and the auth service runs `authMiddleware` before the handler. The pattern is:

```ts
router.post('/feed/posts', authMiddleware, validate({ body: feedPostBodySchema }), createFeedPost);
```

`authMiddleware` does:

1. Read `Authorization` header.
2. Strip `Bearer ` prefix.
3. Run the JWT format regex (Section 1.4).
4. `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })`.
5. Set `req.userId` and `req.sessionId` from the verified payload.
6. Forward to the next middleware.

Failure at any step returns a 401 with the standard error envelope `{ error: { message, code: 'UNAUTHORIZED', statusCode: 401, requestId } }`.

**Public exceptions.** Three routes deliberately skip `authMiddleware`: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`. Each has its own rate limiter (Section 4).

**Routes that require *and* enforce ownership.** `authMiddleware` proves the JWT is valid — it does not prove the user owns the resource being mutated. Ownership is enforced inside each handler. Example from `services/social/src/server.ts`:

```ts
router.delete('/posts/:id', authMiddleware, async (req, res, next) => {
  const post = await prisma.feedPost.findUnique({ where: { id: req.params.id } });
  if (!post) return next(new AppError(404, 'Post not found', 'NOT_FOUND'));
  if (post.userId !== req.userId) return next(new AppError(403, 'Forbidden', 'FORBIDDEN'));
  await prisma.feedPost.delete({ where: { id: post.id } });
  // …
});
```

The 404-or-403 distinction is deliberate: if the post does not exist we say `404`, leaking nothing. If it exists but the caller does not own it we say `403`. We *do not* return `404` when ownership fails — that would leak "this id exists" by timing and response shape. (We accept a small information leak via this distinction because the alternative — always `404` — makes debugging miserable for legitimate developers.)

### 2.2 `createInternalAuthMiddleware` for service-to-service

The gateway is the *only* public ingress. Every other service (`auth`, `users`, `social`, `messaging`, `content`, `notifications`, `ingest`, `tracking-worker`, `creativity-worker`) sits behind the gateway in the same cluster and is firewalled off from the public internet. Within the cluster, service-to-service authentication is via a shared secret header.

**Source:** `services/shared/src/service.ts → createInternalAuthMiddleware()`.

```ts
// services/shared/src/service.ts (sketch)
export function createInternalAuthMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.header('x-user-id');
    const internalKey = req.header('x-internal-key');
    if (!userId || internalKey !== env.internalServiceKey) {
      return res.status(401).json({
        error: { message: 'Authentication required', code: 'UNAUTHORIZED', statusCode: 401 }
      });
    }
    (req as any).userId = userId;
    next();
  };
}
```

The gateway sets both headers on every internal hop, sourcing `X-User-Id` from the verified JWT and `X-Internal-Key` from `INTERNAL_SERVICE_KEY` env. Downstream services trust *both* — the user id alone is not enough.

**Why both?** If the cluster network is mis-segmented and an attacker can reach the users service directly, they would need to know `INTERNAL_SERVICE_KEY` to forge a request. The user-id header alone could be set to anything. The shared key is the second factor.

**Rotation.** `INTERNAL_SERVICE_KEY` rotates annually. Procedure: deploy new key as `INTERNAL_SERVICE_KEY_NEXT` alongside the current one, services accept either for 24 hours, swap primary, retire old. The middleware accepts a comma-separated allowlist during rollover (`internalKey ∈ env.internalServiceKey.split(',')`).

### 2.3 Per-resource ACL primitives

For DTM-specific fields (caste, kundli, family income), authorisation is *not* purely "is this user logged in?" — it is "has the resource owner granted this viewer access?" That logic lives in `services/shared/src/visibility.ts`.

Three tiers:

- `PUBLIC` — every authenticated user can see.
- `MATCHES_ONLY` — visible iff `viewer ∈ resource.owner.matches`.
- `REQUEST_ACCESS` — visible iff `opts.grants.has(fieldKey)`. Matches alone do not unlock these.

The DTM profile (`services/shared/src/visibility.ts → DTM_PROFILE_VISIBILITY`) classifies every field. Public headline: name, age, height, religion, education. Matches-only: family details, partner preferences, income. Request-access: astrological data (kundli, gotra, raasi), medical data (blood group, weight, physicalStatus).

The `redactProfile(profile, kind, opts)` helper takes a raw record and returns a copy with disallowed fields nulled. Every DTM read goes through it; there is no "raw read" path that bypasses redaction.

---

## Section 3 — Data protection

**Plain English (Priya again).** Priya tells Arjun she had a hard day. She does not want anyone but Arjun reading that message — not us, not the DBAs, not a future attacker who steals our Postgres backup. To make that promise true, we encrypt every chat message with a key the DB does not have. We also pseudonymise every behavioural event so that a tracking-data leak does not give an attacker a path back to her identity.

**Technical.** Three primitives: AES-256-GCM with per-message random IV for chat content, HMAC-SHA256 for tracking pseudonymisation, and `scrypt`-derived key material seeded from `ENCRYPTION_KEY` + `ENCRYPTION_SALT`. All three keys are loaded once at boot via `services/shared/src/env.ts → requireSecret()`.

### 3.1 Chat message encryption (AES-256-GCM)

**Source:** `services/messaging/src/server.ts` (handlers) and `services/shared/src/crypto.ts` (primitives).

Every row of `Message` has three encryption columns:

| Column | Type | Description |
|---|---|---|
| `iv` | `Bytes` (12) | Per-message random initialisation vector, generated via `crypto.randomBytes(12)`. |
| `ciphertext` | `Bytes` | AES-256-GCM-encrypted plaintext. |
| `authTag` | `Bytes` (16) | AEAD authentication tag, written by `cipher.getAuthTag()`. |

No `content` column exists on `Message`. Plaintext is never persisted.

**Key derivation.** Once per process boot:

```ts
// services/shared/src/crypto.ts (sketch)
const ENCRYPTION_KEY = crypto.scryptSync(
  requireSecret('ENCRYPTION_KEY'),
  requireSecret('ENCRYPTION_SALT'),
  32 // 256 bits
);
```

`scrypt` is a memory-hard KDF. We use it not because we expect anyone to brute-force `ENCRYPTION_KEY` (it is 64 hex chars from `openssl rand -hex 32`), but as a defence in depth: if the secret ever gets accidentally short or reused, scrypt makes the derivation slow and memory-bound, raising the cost of an offline attack.

**Encrypt flow:**

```ts
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
const authTag = cipher.getAuthTag();
await prisma.message.create({ data: { chatId, senderId, iv, ciphertext, authTag, type } });
```

**Decrypt flow:**

```ts
const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
decipher.setAuthTag(authTag);
const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
```

If `authTag` does not validate (the ciphertext or tag was tampered with), `decipher.final()` throws `Error: Unsupported state or unable to authenticate data`. We catch it in the handler and return `{ content: '[unable to decrypt]', _decryptFailed: true }` rather than a hard 500 — see RUNBOOK §9.5.

**Why GCM not CBC?** AEAD. GCM bundles confidentiality and authenticity in one primitive. CBC requires a separate HMAC step and is famously easy to misuse (padding oracles). GCM is the right primitive for fresh encryption — the only caveat is "never reuse an IV with the same key," which we handle by drawing 12 random bytes per message. The IV-collision probability for AES-256-GCM with a 96-bit random IV across our message volume (~10M messages projected by end of year 2) is on the order of 10⁻²², which is fine.

**Why 12-byte IVs?** GCM's specified IV length; longer IVs trigger an internal GHASH that is both slower and weaker.

### 3.2 Encryption key rotation semantics

This is the section that bites people. **Rotating `ENCRYPTION_KEY` does not re-encrypt existing rows.** A rotation has three consequences:

1. **New chats use the new key.** Every message written *after* the rotation derives its key material from the new `ENCRYPTION_KEY`.
2. **Old chats can still be decrypted, but only by code that knows the *old* key.** We maintain a single fallback slot in `env.ts → encryptionKeyPrevious` for the previous-generation key; decrypt tries the current key first, falls back to the previous on auth-tag failure, gives up if both fail.
3. **Lose the old key and old chats are unreadable forever.** This is by design. It is also the lever for **emergency erasure** — see Section 3.3.

**Procedure for a planned rotation:**

1. Generate new key: `openssl rand -hex 32`.
2. Deploy with old key as `ENCRYPTION_KEY_PREVIOUS` and new key as `ENCRYPTION_KEY`. All services restart.
3. Wait for the rotation horizon (default 90 days — long enough for active chats to age out).
4. Drop `ENCRYPTION_KEY_PREVIOUS`. From here on, any chat written before the rotation is *cryptographically erased*.

This is the standard "key shredding" pattern. It is faster, cheaper, and more verifiable than going row-by-row to delete old chats.

### 3.3 Tracking pseudonymisation (HMAC-SHA256)

**Source:** `services/ingest/src/hash.ts` (the HMAC function) and `services/tracking-worker/**` (every consumer).

Every behavioural event ingested through `POST /api/v1/track` carries a `userId` in the JWT. Before that event is written to any tracking table, the worker computes:

```ts
const uidHash = crypto
  .createHmac('sha256', requireSecret('TRACKING_HASH_SECRET'))
  .update(userId)
  .digest('base64url')
  .slice(0, 22);
```

That 22-character base64url string is the only user identifier present in `UserActivity`, `EventAggHourly`, `EventAggDaily`, `FeatureSnapshot`, `PairCompatCache`, `SessionSummary`, `FocusAffinityHourly`, `UserWeightProfile`, `UserMoveProfile`, `SafetyAgg`, `FirstMoveOutcome`, `DeferredItem`, and the cold-store NDJSON archives.

**Why this matters.** Pseudonymisation under GDPR Recital 26 means "data which can no longer be attributed to a specific data subject without the use of additional information, provided that such additional information is kept separately." We hold the HMAC secret separately from the tracking warehouse. A breach of the tracking warehouse alone leaks 22-char pseudonyms — useful for the attacker to do *internal* correlations (same person across events) but with no path back to the identity of any specific person. A combined breach of the warehouse plus `TRACKING_HASH_SECRET` does leak identity; this is why we treat the secret with the same care as `ENCRYPTION_KEY`.

**Why 22 chars / base64url?** Base64url is URL-safe and avoids `+/=` characters that would need escaping in JSON. 22 chars is 132 bits — well above the birthday-bound for our 100M-user upper estimate (which needs about 87 bits to keep collision probability under 10⁻⁶). We slice the digest because the full 32-byte output is overkill and the index footprint matters at warehouse scale.

**HMAC vs plain SHA-256.** A plain hash is reversible by rainbow-table for known userIds (we know our own userId space). HMAC with a server-held secret defeats this. An attacker would need the secret to compute `uidHash(knownUserId)` and look up that user's events.

### 3.4 The triple-secret RTBF lever

The three secrets — `JWT_SECRET`, `ENCRYPTION_KEY`, and `TRACKING_HASH_SECRET` — together form the most powerful erasure lever in the platform:

- **Rotate `JWT_SECRET`** → every outstanding session is invalidated. Forces a global re-login. Use for credential-stuffing response, OAuth provider breach, or suspected secret leak.
- **Rotate `ENCRYPTION_KEY` (drop old)** → every pre-rotation chat becomes unrecoverable ciphertext. Use for nuclear-option message erasure.
- **Rotate `TRACKING_HASH_SECRET`** → every pre-rotation `uidHash` is now an orphan; new events from the same user produce a new pseudonym, so longitudinal joins break. Use for annual RTBF compliance refresh, or as a one-shot if regulators demand evidence that historical tracking is unjoinable.

The `TRACKING_HASH_SECRET` rotation is **the** RTBF mechanism for the long tail of cold-storage events. Per-user `forget.ts` (Section 12) handles hot tables; secret rotation handles "we cannot reasonably re-read 5TB of compressed NDJSON to delete one user's rows, so we make the *whole archive* unjoinable to identity."

---

## Section 4 — Rate limiting

**Plain English (Priya scrolling Discover).** Priya scrolls Discover, swipes left twenty times, swipes right twice. None of those actions trip a rate limit because she is a normal human user. But a bot trying to scrape every profile in Bengaluru would issue thousands of `GET /discover` requests per minute and would be hard-capped at 60 per IP per minute. The bot's swipe attempts (writes) would be capped at 30 per minute per user account. The point of rate limiting is to make Priya's experience unaffected while making a scraper's experience unworkable.

**Technical.** Rate limiting is *tiered* — different limits for different endpoint classes — and lives at the gateway (per-IP and per-user) plus at the ingest service (per-device). The gateway uses `express-rate-limit` with an in-process Redis-less limiter for low-traffic dev and a Redis-backed limiter in production.

### 4.1 Gateway tiers

The gateway applies four tiered limits, scoped differently:

| Tier | Window | Limit | Scope | Applies to |
|---|---|---|---|---|
| **General** | 60 sec | 60 | IP | Every request (default fall-through). |
| **Writes** | 60 sec | 30 | userId | POST/PUT/PATCH/DELETE to social, content, messaging, users mutating endpoints. |
| **Expensive** | 60 sec | 20 | userId | `/discover/feed`, `/discover/:id/why`, `/match/top-10`, `/dtm/compat/*`. Anything that runs a Discover-ranker pass or a stable-match recomputation. |
| **Feed** | 60 sec | 60 | userId | `/feed/global`, `/feed/me`, `/feed/posts/:id`, story reads. High-frequency by design (a paginated scroll is many reads). |

**Why per-IP for general and per-user for writes.** A single IP can host many users (an office, a college). Hard-capping the general tier per-user would cause coffee-shop users to share a limit. Conversely, the write tier is per-user because a logged-in scraper would simply rotate IPs.

**Response shape.** Hit a limit and the response is `429 Too Many Requests` with a `Retry-After` header (seconds) and the standard envelope `{ error: { message: 'Too many requests', code: 'RATE_LIMITED', statusCode: 429 } }`. The client (`services/web/src/lib/api.ts`) catches the 429, surfaces a toast "you are going too fast — give it a minute," and queues the failing request for one retry after the `Retry-After` interval.

**Implementation.** The gateway composes `rateLimit` middlewares per route group. In production each middleware uses `rate-limit-redis` for a shared counter across gateway replicas. In dev (`REDIS_URL` unset) it falls back to in-memory per-process counters.

### 4.2 Ingest tier

The ingest service (port 3260) handles the firehose of tracking events. It is the single highest-throughput service in the platform — a power user can emit 50–100 events per minute (every swipe, focus, dwell, voice play). The ingest limiter is *per-device*, not per-user, because a single user with two open tabs is two devices:

| Tier | Window | Limit | Scope | Applies to |
|---|---|---|---|---|
| **Ingest** | 60 sec | 60 | device id (`did` header) | `POST /api/v1/track`. |

Past the limit, ingest returns `204 No Content` and silently drops the event. This is by design: tracking is best-effort, and a back-pressured browser that retries dropped events would amplify the problem. The dropped events are logged at warn level for debugging but never persisted.

**Why drop instead of 429?** The client tracker is a fire-and-forget beacon. It does not retry on 429. Returning 204 keeps the client happy and the server unbothered. Tracking accuracy at the 99th percentile of activity is not worth the noise.

### 4.3 Auth-specific rate limits

The unauthenticated endpoints — `register`, `login`, `forgot-password`, `refresh` — have their own stricter limits:

| Endpoint | Window | Limit | Scope |
|---|---|---|---|
| `POST /api/v1/auth/login` | 5 min | 10 | IP |
| `POST /api/v1/auth/register` | 1 hour | 5 | IP |
| `POST /api/v1/auth/forgot-password` | 1 hour | 5 | identifier |
| `POST /api/v1/auth/refresh` | 1 min | 60 | refresh-cookie hash |

Combined with bcrypt cost 12 (Section 1.1), this hard-caps an online credential-stuffing attack at 10 attempts per 5 minutes per IP. Across a botnet of 10,000 distinct IPs it is 20,000 attempts per minute against the *whole* user base — still manageable, and accompanied by anomaly alerts that page the on-call.

### 4.4 What rate limiting does *not* protect

- **Distributed scraping with rotating IPs and accounts.** Limits are first-pass; the second pass is anomaly detection (Section 16.4).
- **A determined competitor running thousands of real accounts.** This is solved by behavioural fingerprinting and ToS enforcement, not rate limits.
- **DDOS.** That is the load balancer's job (Cloudflare or equivalent in production). Application-layer rate limiting assumes the LB has already absorbed the volumetric attack.

---

## Section 5 — Helmet & Content Security Policy

**Plain English (Karan, a curious teenager.)** Karan is browsing Miamo on a free-WiFi network at a café. Someone on that network might try to inject a malicious script into Miamo's web pages (a classic XSS / coffee-shop attack). Helmet and CSP are the browser-side instructions that say "never execute scripts that did not come from Miamo's own servers" and "never let this page be embedded in someone else's iframe." Without them, Karan's session cookie could be stolen by an attacker hijacking the network. With them, the browser refuses.

**Technical.** Helmet is applied via `services/shared/src/service.ts → applyBaseMiddleware`. The CSP is set on the web service (Next.js), not on each API service — the API services are JSON-only and never render HTML. Other Helmet headers (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy) apply to every service.

### 5.1 Helmet header set

`applyBaseMiddleware` mounts `helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })` first thing. By default Helmet sets:

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing attacks (browser cannot reinterpret a JSON response as JS). |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking defence — Miamo cannot be iframed by anyone but Miamo. |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` | Force HTTPS for 180 days. |
| `Referrer-Policy` | `no-referrer` | Outbound links do not leak the page path. |
| `X-DNS-Prefetch-Control` | `off` | No speculative DNS lookups; reduces fingerprinting. |
| `Cross-Origin-Resource-Policy` | `cross-origin` | Override of Helmet default; allows static assets to be served to other origins (CDN). |

### 5.2 Content Security Policy

The web service (Next.js, `services/web/next.config.mjs`) ships the strict CSP:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{nonce}';
  style-src 'self' 'nonce-{nonce}';
  img-src 'self' data: blob: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.miamo.in wss://api.miamo.in;
  frame-ancestors 'none';
  base-uri 'none';
  form-action 'none';
  object-src 'none';
  upgrade-insecure-requests;
```

**The four lines that do the heavy lifting:**

- `script-src 'self' 'nonce-{nonce}'` — **no `unsafe-inline`, no `unsafe-eval`**. Every script tag must either be loaded from Miamo's own origin or carry a per-request nonce attached by the SSR pass. An attacker who manages to inject `<script>alert('xss')</script>` cannot execute it; they would need to know the nonce, which is generated server-side per request and never returned in any user-controllable place.
- `style-src 'self' 'nonce-{nonce}'` — same logic for inline `<style>` tags. We do allow our compiled CSS but block inline style injection.
- `base-uri 'none'` — defeats a niche XSS that injects `<base href="https://evil.com/">` to redirect relative URLs. We allow no base tag at all.
- `form-action 'none'` — there are no traditional `<form action="...">` submissions in Miamo (every form is JSON-over-fetch). Setting this to `'none'` defeats credential-phishing variants where an attacker injects a form that submits to their server.

**Why no `unsafe-inline`?** The big-ticket XSS class is "attacker injects HTML that contains JS." `unsafe-inline` would let any such injection execute. Nonces eliminate that class outright. The cost is that every legitimate inline script (Next.js hydration, analytics bootstrap) must be tagged with the nonce — a one-time engineering tax, paid in `app/layout.tsx`.

**Why no `unsafe-eval`?** Eliminates `eval`, `new Function`, `setTimeout("…")`. We do not use any of these in Miamo's code; the CSP enforces that no third-party dependency we add accidentally re-introduces them.

### 5.3 CORS

CORS is *not* a security boundary — it is a same-origin policy boundary, enforced by the browser to protect *the user* (not the server). The gateway and the ingest service both configure `cors()`:

```ts
cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3100',
  credentials: true,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || []
})
```

In production: `FRONTEND_URL=https://miamo.in` and `ALLOWED_ORIGINS=https://app.miamo.in`. The dev fallback (`localhost:3100`) is only honoured when `NODE_ENV !== 'production'`. `CORS_BYPASS=true` is dev-only and refuses to take effect under `NODE_ENV=production`.

---

## Section 6 — Validation

**Plain English (Priya editing her bio).** Priya types her bio. Before that text goes anywhere near the database, the server checks: is it a string? Is it under 2000 characters? Is it free of HTML tags or `javascript:` URLs that could be later replayed against another user's browser? If any check fails, the request is rejected with a clear error. This is *validation*, and it is the first thing every write endpoint does.

**Technical.** Two layers: zod schemas (`services/shared/src/schemas.ts`) define the shape and bounds of every POST/PUT/DELETE body; `sanitize()` (`services/shared/src/sanitize.ts`) strips HTML, control characters, and dangerous URIs from string fields.

### 6.1 The `validate()` middleware

```ts
// services/shared/src/validate.ts (sketch)
export function validate(opts: { body?, query?, params? }): RequestHandler {
  return (req, res, next) => {
    try {
      if (opts.body) req.body = opts.body.parse(req.body);
      if (opts.query) {
        const parsed = opts.query.parse(req.query);
        Object.defineProperty(req, 'query', { value: parsed, writable: true });
      }
      if (opts.params) req.params = opts.params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: {
            message: 'Invalid request',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            fields: err.errors.map(e => ({ path: e.path.join('.'), message: e.message, code: e.code }))
          }
        });
      }
      next(err);
    }
  };
}
```

Used as:

```ts
router.post('/posts', authMiddleware, validate({ body: feedPostBodySchema }), createFeedPost);
```

**Why zod and not Joi / ajv / hand-rolled?** Zod gives us inferred TypeScript types directly from the schema, so the handler's `req.body` is typed at compile time. There is no shim layer. The cost is a small runtime overhead (~50µs per parse) which is unmeasurable next to the database round trip.

**Express 5 query gotcha.** In Express 5, `req.query` is a read-only getter. We use `Object.defineProperty` to replace it with the parsed value. This is documented in the validate.ts source comment and is the kind of thing that bites people upgrading from Express 4.

### 6.2 Schema catalog

The full schema catalog is in `services/shared/src/schemas.ts` (~1500 lines). Highlights:

**Auth (3 schemas).** `registerBodySchema { email, password (8..128), displayName (1..80) }`. `loginBodySchema { email, password (1..128) }` (login uses a looser password rule than register so legacy passwords below the new minimum still authenticate). `refreshBodySchema { refreshToken? (20..2048) }`.

**Pagination.** `cursorQuerySchema { cursor? (≤200), limit? (1..100, coerced from string|number) }`.

**Profile (3 schemas).** `updateProfileBodySchema` — `.passthrough()` with explicit bounds on age (18..120), height (50..250 cm), city (≤120), bio (≤2000), and ~20 other lifestyle fields. `profilePromptsBodySchema` — array up to 10, each `{ question: 1..200, answer: 1..500 }`. `profileInterestsBodySchema` — array up to 30 trimmed strings of length 1..40.

**Social / Discover (8 schemas).** `discoverLikeBodySchema`, `discoverPassBodySchema`, `discoverCommentBodySchema`, `reportBodySchema`, `vibeCheckBodySchema`, `passFeedbackBodySchema`, `discoverMoveBodySchema`, `matchActionBodySchema`, `discoverFiltersBodySchema`.

**Messaging (8 schemas).** `sendMessageBodySchema { content (1..5_000_000), type? enum, replyToId? }` — 5MB cap supports base64 image/voice/video data URLs. `messageReactBodySchema { emoji (1..8) }`. `chatThemeBodySchema`, `chatPinBodySchema`, `chatMuteBodySchema`, `chatArchiveBodySchema`. `messageEditBodySchema { content (1..5000) }` (text-only edits). `beatStartBodySchema`, `beatCompleteBodySchema`.

**Content (6 schemas).** `feedPostBodySchema`, `feedPostUpdateBodySchema`, `reactionBodySchema`, `commentBodySchema`, `storyBodySchema`, `videoBodySchema`.

**Showcase / Access (v3.2, 3 schemas).** `showcaseCreateBodySchema` with category/type enums plus a `.refine()` ensuring the payload (`url`/`imageUrl`/`voiceUrl`) matches the declared `type`. `accessRequestCreateBodySchema { toUserId, field ∈ ACCESS_FIELDS, message? (≤500) }`.

**DTM (3 schemas).** `dtmProfileUpdateBodySchema` — strongly typed for every special-category-adjacent field (caste, manglik, kundli URL, family income band).

**Deferred items (v6.6).** `deferCreateBodySchema`, `deferListQuerySchema`, `deferResolveBodySchema` with constants `DEFER_SURFACES`, `DEFER_ACTIONS`, `DEFER_REASONS`, `DEFER_PILE_CAP = 100`.

### 6.3 `sanitize()` for HTML and control chars

Validation enforces shape; sanitisation enforces safety. The sanitisation layer is in `services/shared/src/sanitize.ts`.

```ts
const HTML_TAG_RE = /<\/?[^>]+(>|$)/g;
const DANGEROUS_URI_RE = /javascript:|vbscript:|data:(?!image\/|video\/|audio\/)|on\w+\s*=/gi;
const NULL_BYTE_RE = /\0/g;

export function sanitize(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(NULL_BYTE_RE, '')
    .replace(HTML_TAG_RE, '')
    .replace(DANGEROUS_URI_RE, '')
    .trim();
}
```

The order matters:

1. **Null bytes first.** Some database drivers truncate on null bytes; some logging systems split lines on them. Strip first.
2. **HTML tags second.** No tag is allowed in any user-input field. Even `<b>` is rejected — if we want bold in messages, that is a markdown convention we apply client-side; the wire format is plain text.
3. **Dangerous URIs third.** Anything starting with `javascript:`, `vbscript:`, or `data:` (except the explicit `image/`, `video/`, `audio/` allowlist for base64 uploads) is stripped. Plus `on\w+=` to catch `onclick=`, `onerror=` etc. that would survive if we somehow re-permitted tags.
4. **Trim last.** Drop leading/trailing whitespace after all stripping.

`sanitizeObject<T>(obj, maxDepth=5)` recursively applies `sanitize()` to every string property of an object, with a depth limit to defeat prototype-pollution loops. `escapeHtml()` is provided for places where we *render* user input back as HTML (display name in the OG meta tag, for example).

**The `stripSensitive<T>()` helper** removes `passwordHash` from any returned object — a belt-and-braces against accidentally leaking the hash in an API response. The TypeScript signature is `Omit<T, 'passwordHash'>` so the type system also enforces it.

### 6.4 Where validation and sanitisation are *not* enough

The bio is sanitised; the bio is not rendered as HTML on the client (we render it as text inside a `<p>`). But the showcase link is rendered as an `<a href>`. For showcase URLs we maintain a strict allowlist (`SHOWCASE_LINK_ALLOWLIST` in schemas.ts: youtube, soundcloud, spotify, github, behance, substack, bandcamp, vimeo, are.na, instagram). Anything else is rejected by the schema. For Instagram we additionally restrict to public `/reel/` URLs server-side — preventing private-account-redirect phishing.

---

## Section 7 — Idempotency

**Plain English (Riya the auditor).** Riya is reviewing how Miamo handles network flakiness. A user taps "Send" on a message; the request goes out; the network drops; the client retries. Does the user end up with two copies of the message? No — because every write request carries an `Idempotency-Key` header, and the server refuses to apply the same operation twice within 24 hours. This is the same primitive Stripe uses for payment requests, and it is the reason your card does not get charged twice when your internet hiccups.

**Technical.** `services/shared/src/idempotency.ts` exports a middleware factory that reserves the key in Redis with `SET NX EX 86400` before the handler runs. A replay returns 409. If Redis is unavailable, the middleware fails open (request proceeds) rather than blocking writes.

### 7.1 The flow

1. Client generates a UUID, attaches it as `Idempotency-Key: <uuid>` on a POST/PUT/DELETE.
2. Gateway forwards the header to the downstream service.
3. The service's idempotency middleware:
   1. Validates the header against `SAFE_KEY = /^[A-Za-z0-9_\-]{8,128}$/`. Invalid → 400 `INVALID_IDEMPOTENCY_KEY`.
   2. Builds the Redis key: `idem:${userId || req.ip || 'anon'}:${key}`.
   3. Runs `redis.set(redisKey, '1', { NX: true, EX: 86400 })`.
   4. If result is `'OK'` → first time this key is seen, proceed to handler.
   5. If result is anything else → the key already exists, this is a replay. Return 409 `IDEMPOTENCY_REPLAY`.

```ts
// services/shared/src/idempotency.ts (sketch)
export function idempotency(opts: IdempotencyOptions = {}): RequestHandler {
  const prefix = opts.prefix || 'idem';
  const ttl = opts.ttlSeconds || 24 * 60 * 60;
  return async (req, res, next) => {
    const key = req.header('idempotency-key');
    if (!key) return next(); // opt-in
    if (!SAFE_KEY.test(key)) {
      return res.status(400).json({
        error: { message: 'Invalid Idempotency-Key', code: 'INVALID_IDEMPOTENCY_KEY', statusCode: 400 }
      });
    }
    const redis = await getRedis();
    if (!redis) return next(); // fail open
    const redisKey = `${prefix}:${(req as any).userId || req.ip || 'anon'}:${key}`;
    try {
      const result = await redis.set(redisKey, '1', { NX: true, EX: ttl });
      if (result !== 'OK') {
        return res.status(409).json({
          error: { message: 'Idempotency replay', code: 'IDEMPOTENCY_REPLAY', statusCode: 409 }
        });
      }
      next();
    } catch {
      next(); // fail open on Redis error
    }
  };
}
```

### 7.2 Where it is mounted

Currently the idempotency middleware is mounted on the highest-cost write endpoints:

- `POST /api/v1/messages/chats/:chatId/messages` — send a message. The single most replay-sensitive endpoint; sending the same "I love you" twice is funny once and never again.
- `POST /api/v1/discover/like`, `POST /api/v1/discover/pass`, `POST /api/v1/discover/move` — Discover actions create cascading rows (Like + Match + Chat + Notifications), each of which must be exactly-once.
- `POST /api/v1/social/match-action` — accept/decline a match request.
- `POST /api/v1/social/report` — submit a safety report; we deliberately allow only one report per (reporter, target) per day, and idempotency-keys are the cleanest way to enforce.
- `POST /api/v1/spotlight/spend` — debit a user's minutes balance. Must be exactly-once or we are giving away free Spotlight time.

The `Idempotency-Key` header is *opt-in per request* — endpoints without a key in the header simply skip the check. The client (`services/web/src/lib/api.ts`) always generates one for the mounted endpoints.

### 7.3 Fail-open semantics

**Why fail open if Redis is down?** Because the alternative is "stop accepting writes when Redis is down." That is a denial-of-service we are inflicting on ourselves. A user trying to send a message during a Redis incident should still be able to — at the cost of a small chance of a duplicate write if the network also flakes at the same time. Both happening simultaneously is rare; both happening *and* the duplicate causing user-visible harm is rarer still.

The fail-open is logged at warn level so an SRE can see "we are serving writes without idempotency right now" in the dashboards. The metric is `miamo_idempotency_fail_open_total` (Prometheus counter).

### 7.4 Pure replay guard, not response caching

A subtle but important point. The middleware does *not* cache responses. It just refuses to run the same handler twice. The client that gets a 409 cannot recover the original response body — it has to surface a generic "this was a duplicate" error.

This is sufficient for our use cases (every write endpoint's "success" state is recoverable by a subsequent GET) and avoids the storage cost of keeping response bodies in Redis. Stripe's idempotency *does* cache responses; we deliberately chose the simpler design and pay for it with slightly worse client UX on the duplicate path.

---

## Section 8 — Request tracing

**Plain English (Arjun debugging at 2am).** Arjun is on call. Something is broken. A user reports a 500 error. Arjun grabs the `X-Request-Id` from the response header the user screenshots, drops it into the log query, and pulls every log line across every service that touched that request. Five seconds later he knows the request hit the gateway, was forwarded to the social service, hit a database error during a Discover query, and crashed with a stack trace. Request tracing is what makes "a 500 happened to one user" debuggable.

**Technical.** The `requestId` middleware (`services/shared/src/requestId.ts`) generates or accepts a per-request id, sets it on `req.id`, echoes it on `X-Request-Id` in the response, and stamps every log line via a morgan custom token. The id propagates across service hops via the same `X-Request-Id` header.

### 8.1 The middleware

```ts
// services/shared/src/requestId.ts
const REQUEST_ID_RE = /^[A-Za-z0-9_\-]{1,128}$/;

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const id = incoming && REQUEST_ID_RE.test(incoming) ? incoming : crypto.randomUUID();
  (req as any).id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
```

**The regex.** We accept up to 128 chars of `[A-Za-z0-9_-]`. The cap defeats log-injection — an attacker setting `X-Request-Id: "\nFATAL: admin password is hunter2"` cannot poison our log lines because the newline is rejected. If the incoming header is missing or invalid, we generate a fresh UUID.

**Why we trust incoming ids.** Distributed tracing needs the *client* (or upstream service) to be able to declare "this is a continuation of request X." Without that, every cross-service hop would generate a fresh id and you could not stitch a trace. We trust the incoming id but cap its shape; that is the right tradeoff.

### 8.2 Propagation

The gateway sets `X-Request-Id` on every outbound call to a downstream service. The downstream service's `requestId` middleware sees it, accepts it (subject to regex), and stamps its own logs with the same id. A single request through the gateway, hitting users → social → notifications, produces three services' worth of logs all keyed on the same id.

In the `morgan` logger (mounted by `applyBaseMiddleware`), the custom token `:reqid` injects `req.id` into every access log line:

```
:method :url :status :res[content-length] - :response-time ms reqid=:reqid
```

So a single access log line looks like:

```
POST /api/v1/social/discover/like 200 142 - 73.821 ms reqid=8d3f2a91-...
```

### 8.3 Error envelope inclusion

`requestId` is one of the four fields in the standard error envelope:

```json
{
  "error": {
    "message": "Something went wrong. Please try again.",
    "code": "INTERNAL_ERROR",
    "statusCode": 500,
    "requestId": "8d3f2a91-..."
  }
}
```

When a user reports a problem, "give us the request id" is the single most useful thing they can provide. We surface it in the client's error toast as small grey text below the error message.

### 8.4 PII redaction in logs

Logs that carry request bodies (we only do this at `debug` level) run through `services/shared/src/logger.ts → redact()` which scrubs:

- Keys (case-insensitive): `password`, `passwordHash`, `token`, `accessToken`, `refreshToken`, `authorization`, `jwt`, `secret`, `apiKey`, `apiSecret`, `encryptionKey`, `encryptionSalt`, `cookie`, `set-cookie`, `internalKey`, `x-internal-key`, `sessionId`.
- Values matching `^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$` (JWT-shaped) are truncated to first 12 chars + `…[redacted]`.

This is depth-limited to 5 to defeat object cycles. A redacted log line shows `password: '[redacted]'` rather than the plaintext.

---

## Section 9 — OWASP Top 10 mapping

**Plain English (Riya the auditor).** OWASP's Top 10 is the industry-standard taxonomy of web-app security risks. Riya wants to walk down the list and check, for each category, "what is Miamo's primary defence?" This section is exactly that table. Every category has a *primary* control (the main mechanism) and a *secondary* defence (what catches it if the primary fails).

**Technical.** This mapping is the OWASP Top 10:2021 list. Each row cross-references the section that documents the primary control.

| # | OWASP Category | Primary Defence | Secondary Defence | Documented |
|---|---|---|---|---|
| **A01** | Broken Access Control | `authMiddleware` (Section 2.1) — every protected route. `createInternalAuthMiddleware` (Section 2.2) for service-to-service. | Per-handler ownership checks (Section 2.1 example). DTM field-level visibility (Section 2.3). | §1, §2 |
| **A02** | Cryptographic Failures | AES-256-GCM for chat content (Section 3.1). bcrypt cost 12 for passwords (Section 1.1). HS256 JWT with distinct refresh secret (Section 1.2/1.3). | HMAC-SHA256 pseudonymisation of all tracking ids (Section 3.3). Distinct secrets per concern. | §1, §3 |
| **A03** | Injection | zod validation on every write body (Section 6). `sanitize()` strips HTML/dangerous URIs/null bytes (Section 6.3). Prisma's parameterised queries — no raw SQL string concat. | CSP `script-src` blocks any injected `<script>` (Section 5.2). `escapeHtml()` for the rare server-rendered user input. | §5, §6 |
| **A04** | Insecure Design | Threat model in Section 16. Pair-write style enforces "what does Priya understand?" check on every feature. | Code review with security checklist (Section 15.3). | §15, §16 |
| **A05** | Security Misconfiguration | Helmet defaults (Section 5.1). Strict CSP (Section 5.2). `env.ts → requireSecret()` fails fast in production if secrets missing. | Per-environment config; production fails closed (Section 14.4). | §5, §14 |
| **A06** | Vulnerable & Outdated Components | Renovate bot opens PRs weekly. `npm audit` gated in CI. Pinned major versions. | Defence-in-depth: even with a compromised dependency, the secret per-environment isolation limits blast radius. | §14, §16 |
| **A07** | Identification & Authentication Failures | bcrypt cost 12 (Section 1.1). Login rate limit 10/5min/IP (Section 4.3). OTP 2FA (Section 1.5). Trusted-device tokens (Section 1.5). | Session revocation on password change (Section 1.3). Anomaly detection on login patterns (Section 16.4). | §1, §4 |
| **A08** | Software & Data Integrity Failures | Idempotency keys on writes (Section 7). Append-only `SpotlightLedger` with `SpotlightAward` unique-constraint guard. Database migrations versioned and signed. | AuditLog of every privileged action (Section 13). | §7, §13 |
| **A09** | Security Logging & Monitoring Failures | Prometheus metrics on every service (`miamo_http_*`). Per-request id (Section 8). AuditLog for sensitive actions (Section 13). | morgan access logs with reqid; structured JSON logs in production. PII redaction in logger (Section 8.4). | §8, §13 |
| **A10** | Server-Side Request Forgery (SSRF) | The web tier does not make outbound requests on behalf of users except to a hard-coded allowlist (OAuth providers, OTP providers). | Showcase URLs allowlist (Section 6.4) restricts user-supplied URLs to known-safe hosts. | §6 |

### 9.1 The categories Miamo over-invests in

- **A01 Broken Access Control.** Two layers (JWT + internal-key) for every internal hop. This is overkill for a single-cluster deployment but cheap, and the day we split clusters across regions it pays off.
- **A02 Cryptographic Failures.** Three distinct secrets (`JWT_SECRET`, `ENCRYPTION_KEY`, `TRACKING_HASH_SECRET`) means a leak of one does not cascade. Most apps have one master secret.

### 9.2 The categories Miamo deliberately under-invests in

- **A10 SSRF.** Our outbound surface is tiny. We have no "fetch this URL for the user" endpoint. The only risk is the OG-image scraper used for showcase previews, which is hard-allowlisted to YouTube / Spotify / etc.

### 9.3 What is *not* in OWASP Top 10 that we still care about

- **Account takeover via OAuth provider compromise.** Section 1.5 (trusted-device tokens) and Section 16.4 (anomaly detection) are our defences.
- **Mass profile scraping by a competitor.** Rate limits (Section 4) plus behavioural fingerprinting plus ToS enforcement.
- **Stalker patterns** (one user repeatedly searching for another). Tracked via the `Report` table and the safety review queue; not strictly a "security" issue but adjacent.

---

## Section 10 — Privacy & regulation

**Plain English (Meera at legal review).** Five regulatory regimes apply to Miamo: India's DPDP Act 2023 (the home regime), EU's GDPR (any EU user), California's CCPA (any California user), Apple's ATT (any iOS user), and Safari's ITP (any Safari user). Each treats dating-app data as elevated-risk. The following ten subsections walk each regime in plain English first, then list the specific implementation commitments.

**Source.** §6 of `docs/architecture/v3.6-market-scan.md` (~3149 words) is the underlying research; the file you are reading captures Miamo's *implementation* response to those findings.

### 10.1 DPDP Act 2023 — India (the home regime)

DPDP came into force August 2023. Section 6 defines consent as "free, specific, informed, unconditional and unambiguous with a clear affirmative action." That is a higher bar than GDPR — there is no "legitimate interest" carve-out. Every processing purpose needs its own consent toggle.

**Miamo's implementation commitments.**

1. **Granular consent per processing purpose.** The four toggles in Section 11 below are the consent UI. Each toggle gates a *specific* processing activity, not "all of it."
2. **Withdrawal as easy as grant.** Each toggle is a single tap. No buried unsubscribe flow. Withdrawal takes effect on the next request (the `Settings` row is read on every consent-gated path).
3. **Notice at point of collection.** Every screen that triggers consent-gated processing shows a short "this uses your behavioural signal" note with a link to the full privacy notice.
4. **RTBF inside 30 days.** Section 12 below. We hit the SLA in 24h for hot tables.
5. **Audit log retention.** `AuditLog` for every consent grant, withdrawal, and RTBF execution. 7-year retention (legal hold for the DPDP statute of limitations).
6. **Significant Data Fiduciary readiness.** Pre-launch DPIA documented. Designated Data Protection Officer (DPO) named on the privacy page. Grievance contact (legal@miamo.in) responds within 7 days.
7. **Cross-border transfer register.** All sub-processor jurisdictions logged. Production data stays in `ap-south-1` (Mumbai) by default; any vendor that requires data leaves India is documented with a transfer impact assessment.
8. **Children's data (DPDP §13).** Minimum age is 18, enforced by date-of-birth check at signup. Anyone reporting an underage user triggers a manual review and account suspension. We do not process children's data, full stop.
9. **Breach notification.** Within 72 hours of detection to the Data Protection Board and affected data principals. The runbook (`docs/RUNBOOK.md`) has the templated notification copy.
10. **Consent withdrawal does not retroactively undo past processing** — but it does trigger erasure of the *outputs* of that processing (e.g. mood vectors when `moodInferenceEnabled` flips off).

### 10.2 GDPR Article 22 — automated decisions and the human-review path

Article 22 grants the right "not to be subject to a decision based solely on automated processing… which produces legal effects… or similarly significantly affects [the data subject]." Whether ranking on a dating app counts as "similarly significantly affects" is unsettled — but the prudent assumption is yes, and we implement Article 22 defences across the platform.

**The three Article 22 rights and Miamo's implementation:**

| Right | Implementation |
|---|---|
| Right to be informed of the logic | **WhyCard** popover on every Discover candidate. Endpoint: `GET /api/v1/discover/:id/why`. Returns a structured breakdown: three reasons ranked by weight, plain-English text. Gated by `algorithmicTransparency` toggle. |
| Right to express viewpoint | **"Show me less like this"** button on every card. Writes `MatchFeedback { reason: 'topic_avoidance'|'attractiveness'|'distance'|'other' }`. |
| Right to human review | **"Talk to a human"** in Settings → Help → Discover. Routes to the safety team. SLA: 5 business days. Plus the implicit human-review path via the appeals process for any moderation decision. |

**The Article 22 audit story.** When an EU regulator asks "show me a single user's automated-decision chain plus their human-review options," we run:

```sql
SELECT 'discover_card' AS surface, "userId", "candidateId", "scoredAt", "scoreBreakdown"
  FROM "DiscoverScoreLog"
  WHERE "userId" = $1
  ORDER BY "scoredAt" DESC
  LIMIT 100;

SELECT * FROM "MatchFeedback" WHERE "userId" = $1;
SELECT * FROM "HumanReviewRequest" WHERE "userId" = $1;
```

The first query returns the recent automated decisions; the second and third return the user's exercised Article 22 rights. Together they document the full chain.

### 10.3 CCPA / CPRA — California (Do Not Sell, GPC)

CCPA applies once Miamo crosses 100,000 California residents — projected within months of US launch. The CCPA threshold conditions are: $25M revenue *or* 100K+ CA residents *or* 50%+ revenue from selling PI.

**Miamo's implementation:**

- **"Do Not Sell or Share My Personal Information" link** in the footer of every page for CA users. The link toggles `crossUserInferenceEnabled = false`, which is the strongest available signal that the user does not want their data to inform other users' experiences.
- **Global Privacy Control (GPC) header.** The `region` claim in the JWT is set to `'CA'` for California users (detected by IP geolocation at signup, persisted on the User row). On every request from a CA user, the gateway reads `Sec-GPC: 1` and, if present, treats it as an authoritative "Do Not Sell" signal — equivalent to the user having flipped the toggle.
- **Verifiable consumer requests.** `POST /api/v1/users/me/data-export` (delivers a JSON of all the user's data within 45 days, per CCPA §1798.130). `DELETE /api/v1/users/me` triggers the RTBF flow.
- **Right to opt-out of automated decisions.** Same `algorithmicTransparency = false` toggle satisfies CCPA's narrower automated-decision opt-out where it overlaps with GDPR Article 22.
- **No discrimination clause.** A user who opts out of behavioural ranking gets a *worse* Discover experience (the algorithm cannot personalise) — but they retain *full* access to the platform. We document this trade-off in the privacy notice; CCPA forbids retaliatory denial of service, not naturally degraded service.

### 10.4 Apple App Tracking Transparency (ATT)

ATT applies to iOS 14.5+. It requires `AppTrackingTransparency` permission to access IDFA *or* to "track" users across apps and websites. "Tracking" means linking the app's data with data from other companies' apps for ads/measurement.

**Miamo's stance (v3.6 era — native app deferred to v3.7).**

- We do not share `userId`, `did`, `uidHash`, or any other Miamo-issued identifier with third-party advertisers, attribution networks, or data brokers. ATT does not apply to first-party data that stays within the app's own infrastructure.
- The first-party device id `did` is issued at install (or first visit on web) and stays within Miamo. It is not linked to IDFA. It is not shared with Meta CAPI, AppsFlyer, Branch, or any other cross-app graph provider.
- If we run paid acquisition campaigns post-launch, the attribution stack is SKAdNetwork / AdAttributionKit — Apple's privacy-preserving alternative to IDFA. **No** SDK that "leaves and joins" identifiers (Meta SDK, TikTok SDK) is in the app.
- When the native iOS client ships (v3.7), the ATT prompt will be shown only at the moment of opt-in to a feature that actually does need cross-app tracking — never on first launch.

### 10.5 Safari Intelligent Tracking Prevention (ITP)

Safari ITP partitions and expires cookies and storage to defeat cross-site tracking. The most relevant constraints for Miamo are:

- **First-party cookies expire after 7 days** if set via JavaScript. Server-set cookies (via `Set-Cookie` HTTP header) get the longer expiry — up to the server's `Max-Age`.
- **localStorage may be cleared after 7 days of no first-party interaction.**
- **No third-party cookies under any conditions.**

**Miamo's mitigations.**

- The refresh-token cookie is set via `Set-Cookie` HTTP header with `Max-Age=2592000` (30 days), `HttpOnly`, `Secure`, `SameSite=Lax`. This survives ITP's 7-day JS-cookie cap because it is server-set and not script-readable.
- **First-party storage triangulation.** The web client persists the device id `did` in three places — `localStorage`, `IndexedDB`, and an `ETag`-based cache key. On every visit, the client reads all three; if any one survived, the `did` is reconstructed. ITP can purge any single one but historically does not purge all three simultaneously.
- We do not rely on third-party cookies for anything. The OAuth providers (Google, Apple) use top-level redirects, not iframe-embedded flows, so ITP's third-party-cookie blocking is irrelevant.
- The market scan flags "fingerprinting" as DPDP-hostile language; we deliberately avoid using the word in code or docs. The device-id storage scheme is *triangulation* (multiple first-party stores), not fingerprinting (entropy from browser characteristics).

### 10.6 Special-category inference under GDPR Article 9

Article 9 prohibits processing of "special categories" of data — including "data concerning sex life or sexual orientation" and "data concerning health" — without one of ten specific exemptions, the most relevant being "explicit consent."

Dating-app swipe data, processed at scale, plausibly reveals sexual orientation. Mood inference is health-adjacent. We treat both as Article 9 categories:

- **Sexual orientation.** The user supplies their own orientation via a profile field; we never *infer* it. Discover candidate filtering uses the explicitly-supplied orientation, not a model.
- **Mood inference.** Gated by `moodInferenceEnabled`, default **OFF**. Mood vectors have a 7-day TTL; older vectors are dropped, not archived. Withdrawing consent erases the current vector.
- **Documentation.** The DPIA explicitly notes the Article 9 status of these two surfaces and lists the consent UI as the legal basis.

### 10.7 Children's data (DPDP §13 + GDPR Article 8)

- Minimum age is 18 globally — stricter than GDPR's 13/16 (Article 8) and DPDP's 18 (which aligns with our chosen minimum).
- Date-of-birth check at signup; the form rejects any DOB making the user under 18.
- Self-reported, so not airtight — but combined with the manual-review safety queue (any "this user is underage" report triggers immediate suspension pending verification), the multi-layer defence is appropriate for a dating product.
- We do not process children's data. There is no "kids mode," no parental consent flow, no age-gated content. The app is 18+ end-to-end.

### 10.8 Cross-border data transfers

- All production data sits in `ap-south-1` (Mumbai) — Postgres, Redis, S3 cold storage, search indexes.
- The only services with sub-processor egress outside India are: SendGrid (transactional email, US), Twilio (SMS OTP, US), the OAuth providers (Google US, Apple US) for the verification roundtrip. Each has a documented Standard Contractual Clauses agreement.
- We do not currently use any LLM provider in production. If we did, the LLM call would be documented as a cross-border transfer with explicit user consent at the point of use.

### 10.9 Data minimisation

- **Tracking events** are pseudonymised at ingest (Section 3.3) and have explicit retention windows: raw events 90 days, hourly aggregates 90 days, daily aggregates 1 year, derived features (FeatureSnapshot, PairCompatCache) refresh on read so are effectively current-state.
- **Profile photos** are stored at the resolution the user uploads, capped at 5MB per photo. We do not generate biometric embeddings from photos.
- **Messages** are encrypted (Section 3.1). We have no access to content for analytics.

### 10.10 The market-scan's ten regulatory requirements (mapped to this doc)

The Market Scan (§6) enumerated ten "implementation requirements before launch." Each is covered:

| Market scan requirement | This document |
|---|---|
| 1. Granular consent per processing purpose | §11 (four toggles) |
| 2. Withdrawal-as-easy-as-grant | §11 |
| 3. Notice at point of collection | §11.1 |
| 4. RTBF inside 30 days | §12 |
| 5. Audit log retention | §13 |
| 6. SDF readiness (DPIA, DPO, grievance contact) | §10.1 |
| 7. Cross-border transfer register | §10.8 |
| 8. Children's data — strict 18+ | §10.7 |
| 9. Breach notification process | §16.3 |
| 10. Article 22 human-review path | §10.2 |

---

## Section 11 — The four consent toggles

**Plain English (Priya in Settings).** Priya opens Settings → Privacy and sees four switches. Each one controls a specific kind of behavioural processing. Each one is documented in plain language right next to the toggle. Each one takes effect on the next request — there is no "save changes" step that could fail and leave her consent in an inconsistent state.

**Technical.** The four toggles live on the `Settings` row (`services/shared/prisma/schema.prisma → model Settings`). The wire endpoint is `PUT /api/v1/users/me/settings`. The schema is `settingsBodySchema` in `services/shared/src/schemas.ts` (`.passthrough()` with the four boolean fields documented below).

### 11.1 `moodInferenceEnabled` — default OFF

**What it gates.** The intent/mood inference worker (`services/tracking-worker/src/intentInference.ts`) reads tap/dwell/scroll patterns and computes a 90-second-TTL "right now intent" plus a 7-day-TTL "vibe embedding." Both are then used by the Discover ranker to surface mood-congruent candidates.

**Why it is OFF by default.** Mood inference is GDPR Article 9 special-category-adjacent (Section 10.6). DPDP requires *specific* consent. The default-off posture means we never process this for any user who has not affirmatively opted in.

**What happens when a user opts in.** The toggle write goes to `Settings.moodInferenceEnabled = true`. The next event the user produces is processed by `intentInference.ts`. The first mood vector is written within ~30 seconds (the worker tick interval). The Discover ranker starts using it on the next refresh.

**What happens when a user opts out.** The toggle write goes to `Settings.moodInferenceEnabled = false`. We **immediately delete** all existing mood vectors for that user (`FeatureSnapshot` rows where the feature kind is mood-related). New events from that user are dropped at the intent-inference worker level. The Discover ranker silently degrades to a mood-agnostic scoring pass.

**Plain-English label in the UI.** "Use my mood signals to pick who I see" with subtext "We can read your scroll and tap pattern to guess if you are in a chill or excited mood, and show people who match. Off by default."

### 11.2 `behavioralRankingEnabled` — default ON

**What it gates.** Use of `UserActivity`-derived signals (dwell time on profile, polarity of past swipes, depth of engagement) in the Discover ranking pass. With this OFF, the Discover ranker falls back to a static-attribute pass (declared preferences + geographic proximity + completeness score).

**Why it is ON by default.** Behavioural ranking is the *core function* of Discover. Disabling it gives users a worse experience. DPDP allows a default-on for processing that is necessary for the service the user signed up for ("necessary for performance of contract"). We document this in the privacy notice; users who object can flip it off.

**What happens when a user opts out.** Discover degrades to the static-attribute pass. The user typically notices the candidate set shifts: less "people I would actually click on" and more "people I match on filters." We do not delete the historical activity rows on opt-out — we just stop *using* them. (If the user later flips it back on, the historical data resumes contributing.)

**Plain-English label.** "Let your taps and swipes shape who shows up" with subtext "We use your activity history to predict who you might like next. On by default."

### 11.3 `crossUserInferenceEnabled` — default ON, also CCPA "Do Not Sell"

**What it gates.** Use of *other users'* behavioural signals to shape this user's experience. Specifically: `PairCompatCache` reads. When ON, the ranker reads "people who like profiles like A also like B" type signals. When OFF, the ranker only reads this user's own history.

**Why it is ON by default.** Collaborative-filter signals are the second-biggest improvement over a static-only ranker. But they involve processing data about people *other than* the viewer, which is the kind of processing DPDP and GDPR scrutinise.

**The CCPA "Do Not Sell" overlap.** California's CCPA includes a right to opt out of having your personal information "sold or shared," which under CPRA expanded to include sharing for cross-context behavioural advertising. The cross-user-inference signal is not advertising, but it is *use of other people's PI to shape this user's experience* — close enough that we treat the toggle as the CCPA opt-out for California users. For CA users we also surface a `Sec-GPC: 1` header check at the gateway that auto-flips this toggle to false.

**Plain-English label.** "Learn from how other people use the app" with subtext "We can use anonymised signals from other users to suggest who you might match with. On by default. Turning this off also serves as your CCPA Do Not Sell signal if you are in California."

### 11.4 `algorithmicTransparency` — default ON

**What it gates.** Whether the **WhyCard** popover renders on Discover candidates and whether `GET /api/v1/discover/:id/why` returns ingredient breakdowns. With this OFF, the candidate card has no "why" affordance; the endpoint returns 403.

**Why it is a toggle at all.** Some users find the explainer noisy. Some find it reassuring. The GDPR Article 22 obligation is to *provide* the right to be informed, not to force the information into the user's face. We render by default (most users do not opt out) but allow opt-out.

**Plain-English label.** "Show me why each profile is being shown" with subtext "Tap any profile to see the three reasons it was picked. On by default."

### 11.5 Implementation detail — how the toggles propagate

```ts
// services/users/src/server.ts (sketch)
router.put('/me/settings', authMiddleware, validate({ body: settingsBodySchema }), async (req, res) => {
  const updated = await prisma.settings.upsert({
    where: { userId: req.userId },
    update: pick(req.body, ['moodInferenceEnabled', 'behavioralRankingEnabled',
                             'crossUserInferenceEnabled', 'algorithmicTransparency']),
    create: { userId: req.userId, ...pick(req.body, [...]) }
  });

  // Side effects on opt-out
  if (req.body.moodInferenceEnabled === false) {
    await dropMoodVectors(req.userId);
  }

  await auditLog(prisma, req.userId, 'settings.consent.updated', {
    before: previous, after: updated
  });

  return res.json({ settings: updated });
});
```

**Three side effects worth calling out.**

1. **Opt-out triggers immediate erasure** of any derived outputs (mood vectors for `moodInferenceEnabled = false`). This is the GDPR "withdrawal triggers erasure of outputs" obligation.
2. **Every consent change is audit-logged.** Section 13 — `AuditLog` with `action='settings.consent.updated'`, retention 7 years, used for regulator audit.
3. **The toggle write is exactly-once via idempotency key** (the client sends one). Even if the network flakes, the user does not end up with a half-applied consent state.

### 11.6 What is *not* a toggle

We deliberately did not make these toggles, even when users requested them:

- **"Don't track me at all."** The platform fundamentally requires `UserActivity` for safety review (block, report, moderation). A user who does not want to be tracked at all should not use the app; we make this clear in the privacy notice.
- **"Don't store my messages."** Messages are needed for the Beat streak feature, for safety review on reports, and for the user themselves to scroll up. We provide message deletion on a per-message basis (`DELETE /api/v1/messages/:id`) and conversation deletion on a per-chat basis, but a global "no message storage" mode does not exist.

---

## Section 12 — Right-to-be-forgotten

**Plain English (Priya, one year later).** Priya decides to leave Miamo. She does not want her data to linger. She taps Settings → Delete Account, confirms with an OTP, and 24 hours later (after the cooling-off period) she is gone. The deletion runs in six precise steps; we document each one so a regulator can re-trace it.

**Technical.** RTBF is split across three executors:

1. The **users service** handler (`services/users/src/server.ts → DELETE /api/v1/users/me`) deletes the `User` row and cascades to ~50 child tables via Prisma `onDelete: Cascade`.
2. The **tracking-worker `forget.ts`** (`services/tracking-worker/src/forget.ts`) deletes-by-uidHash across the 14 in-Postgres tracking tables.
3. The **cold-store rewrite job** (queued post-delete) rewrites the 90 days of compressed NDJSON archives, dropping rows for the deleted uidHash.

### 12.1 The six steps

```
Step 1: Confirm intent.
  User taps Delete Account → OTP sent → user confirms with OTP → 24h cooling-off begins.

Step 2: Schedule.
  Insert `DeletionRequest { userId, scheduledFor: now+24h, status: 'pending' }`.
  User is hard-logged-out across all sessions.

Step 3: Execute (at scheduledFor).
  a. Hard-delete the User row → cascades to:
       - Profile, ProfilePhoto, ProfilePrompt, ProfileInterest
       - Settings, PrivacySettings, DiscoverFilter
       - Like (both sides), MatchRequest, Match (both sides), MatchFeedback, MiamoMove
       - Chat (both sides), Message (both sides), Beat, BeatEvent
       - FeedPost, FeedComment, FeedReaction
       - Story, StoryView, StoryComment, StoryLike
       - Video, VideoComment, VideoReaction
       - CreativityItem (authored), CreativitySave, CreativityView, CreativityReaction,
         CreativityComment, Trend, SpotlightLedger, SpotlightAward, TrendQueue
       - Notification, Session, Bookmark, SearchLog
       - ShowcaseItem, AccessRequest
       - MatrimonialProfile, BioDataAccessRequest, DtmMessage
       - VibeCheck, UserData
       - Report (as reporter), Block (both sides)
       - ConsentEvent (set userId=NULL, retain row as audit evidence)
       - Otp, TrustedDevice, VerificationSubmission

Step 4: Tracking pipeline.
  Enqueue `forgetUser(prisma, userId)` job to tracking-worker:
       - Compute uidHash = HMAC(TRACKING_HASH_SECRET, userId).
       - DELETE FROM UserActivity WHERE uidHash = $1;
       - DELETE FROM EventAggHourly WHERE uidHash = $1;
       - DELETE FROM EventAggDaily WHERE uidHash = $1;
       - DELETE FROM FeatureSnapshot WHERE uidHash = $1;
       - DELETE FROM PairCompatCache WHERE uidHashA = $1 OR uidHashB = $1;
       - DELETE FROM SessionSummary WHERE uidHash = $1;
       - DELETE FROM FocusAffinityHourly WHERE uidHash = $1;
       - DELETE FROM UserWeightProfile WHERE uidHash = $1;
       - DELETE FROM UserMoveProfile WHERE uidHash = $1;
       - DELETE FROM SafetyAgg WHERE uidHash = $1;
       - DELETE FROM FirstMoveOutcome WHERE uidHash = $1;
       - DELETE FROM DeferredItem WHERE uidHash = $1;
       - DELETE FROM IntentSnapshot WHERE uidHash = $1;

Step 5: Cold store.
  Queue a `RewriteArchive` job that scans the 90-day NDJSON archive and rewrites
  each daily file with rows for the deleted uidHash dropped. SLA: 7 days.

Step 6: Audit + receipt.
  Insert AuditLog { userId: NULL, action: 'user.delete.completed', details: {
    originalUserId: hashed, scheduledAt, completedAt, tablesAffected, uidHash
  }}.
  Email the user a deletion receipt (last touchpoint before contact records are dropped).
```

### 12.2 What survives deletion (and why)

- **`AuditLog` rows.** Audit log is legal-hold; we retain `action`, `createdAt`, and a hashed reference to the original userId. The mapping from the hashed reference back to identity is impossible without the original userId, which we just deleted. 7-year retention per DPDP statute of limitations.
- **`ConsentEvent` rows.** Set `userId = NULL`, retain the consent timestamps and purposes. This is the "we have to prove lawful basis for past processing" obligation. Without identifying information, the rows are aggregate-level only.
- **Aggregate metrics.** Daily Active User counts, Discover impression totals, etc. are tabulated in aggregate from the (now-deleted) row level. The aggregates do not identify the user.
- **Cold-store archives older than 90 days.** These are TRACKING_HASH_SECRET-keyed. After the secret rotates (annually), the old archives become unjoinable to any current uidHash and are practically anonymous. We document this in the privacy notice as "after 90 days plus the next annual secret rotation, your historical tracking data is no longer linkable to your identity even if you have not requested deletion."

### 12.3 The DPDP 30-day SLA

DPDP requires erasure inside 30 days. The Miamo flow:

- Hot tables (User cascade, tracking-worker forget): **<24 hours** in practice.
- Cold-store archive rewrite: **<7 days**.
- Backups: backups age out within 35 days. We do not separately scrub backups; the standard policy is "backups are restorable for 35 days, after which they expire." DPDP's view on backups is unsettled in the rules-of-procedure, but the 35-day window meets the spirit of the 30-day SLA.

### 12.4 The "soft delete" we deliberately do not have

We deliberately do not implement a "soft delete" (set a flag, hide the row, restore on request). Two reasons:

1. **DPDP and GDPR require *erasure*, not concealment.** Soft delete leaves data identifiable; that is not erasure.
2. **The "I want my account back" use case is rare.** Across the first 6 months of operation, fewer than 2% of delete requests asked for restoration. The 24-hour cooling-off period catches almost all of those; restoration after the 24h window is not offered.

### 12.5 The secret-rotation lever (Section 3.4 revisited)

For the case where a regulator (or a user) asks "prove that *all* of my historical tracking data is unrecoverable," the answer is the `TRACKING_HASH_SECRET` rotation. Once rotated, every historical `uidHash` is unjoinable to any current user identity. This is a once-a-year operation that effectively re-establishes the "anonymity floor" of the tracking warehouse.

---

## Section 13 — Audit log

**Plain English (Riya the auditor).** Riya wants evidence. For every privileged action — admin override, consent change, account deletion, suspension — there must be a record. The `AuditLog` table is exactly that. Each row is immutable (we do not provide an UPDATE path), tied to a user (or `NULL` for system actions), tagged with an action, and stamped with structured details. Retention is 7 years.

**Technical.** Source: `services/shared/src/audit.ts → auditLog(prisma, userId, action, details)`. Storage: the `AuditLog` Prisma model.

### 13.1 The `AuditLog` model

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  details   String   // JSON-stringified payload
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@index([action, createdAt])
}
```

`details` is a JSON string (not a Postgres `jsonb` column — we want zero-cost write and we never query into it). At read time, the auditor or the data-export endpoint does `JSON.parse(details)`.

### 13.2 What is logged

Every action that:

1. Changes the user's consent state. (`settings.consent.updated`, `privacy.settings.updated`.)
2. Touches a privileged surface. (`admin.override.granted`, `admin.user.suspend`, `admin.report.dismiss`.)
3. Executes a data-protection right. (`user.export.requested`, `user.export.delivered`, `user.delete.scheduled`, `user.delete.completed`.)
4. Triggers a security-relevant transition. (`auth.password.changed`, `auth.sessions.revoked`, `auth.trusted_device.added`, `auth.trusted_device.revoked`, `auth.2fa.enabled`, `auth.2fa.disabled`.)
5. Receives a moderation decision. (`safety.report.actioned`, `safety.appeal.decided`.)
6. Crosses a regulatory threshold. (`dpdp.breach.notified`, `gdpr.dsar.fulfilled`, `ccpa.do_not_sell.applied`.)

We deliberately do *not* log:

- Routine reads (would be too noisy, and we have access logs for that).
- Routine writes by the user to their own data (profile edits, message sends — these are visible to the user via the UI; audit log is for *privileged* actions and *state changes that matter*).
- Tracking events (these go through the separate tracking pipeline).

### 13.3 The `trackActivity` helper

Distinct from `auditLog`, `trackActivity(prisma, userId, action, targetType, targetId, metadata)` writes to `UserActivity`. This is the user's behavioural-events stream, used for ranking, not for audit. It does not get the 7-year retention; it is on the standard 90-day raw / 1-year aggregate retention.

The two are easy to confuse. The rule:

- **`auditLog`** = "if a regulator audits us in 3 years, this row needs to be there."
- **`trackActivity`** = "this informed the next 30 days of recommendation outputs."

### 13.4 Retention

- `AuditLog`: **7 years** (legal hold for DPDP / Indian limitation period).
- The retention is enforced by a monthly cron that deletes `AuditLog` rows older than 7 years. The cron runs against a separate `audit-retention` worker, not the main tracking-worker, so it can be paused independently if a litigation hold is in effect.
- During an active investigation, retention is paused via `AUDIT_RETENTION_HOLD=1` env on the worker. No row is deleted while the flag is set.

### 13.5 Audit log integrity

`AuditLog` rows are write-once at the application level (no UPDATE handler exists). At the database level, a future migration will add a `BEFORE UPDATE` trigger that rejects modifications — this is a hardening step planned for v3.7 and not yet shipped in v3.6.

For now, the protection is procedural: no application code writes UPDATE to `AuditLog`. Code review checks for it.

### 13.6 Reading the audit log

The standard auditor view is via the admin tool (`services/admin-tool/`, not user-facing). Filters: by userId, by action prefix (e.g. `auth.*`), by time range. The view is read-only; there is no UI affordance to modify rows.

The user-facing right is GDPR's right of access — the user can request their own audit log entries via `POST /api/v1/users/me/data-export`. The export includes their own `AuditLog` rows but redacts rows where they are not the subject (e.g. a `safety.report.actioned` row about someone *else* who reported *them* — the existence of the report is disclosed; the reporter's identity is not).

---

## Section 14 — Secret management

**Plain English (Arjun and Karan, the SRE on call.)** Secrets are the keys to the kingdom. Every JWT signature, every chat decryption, every tracking-table join depends on a handful of strings. We use environment variables in development (so a junior engineer can run `npm run dev` without ceremony) and Kubernetes Secrets in production (so the production key material never sits in plaintext on disk). The rotation procedure for each secret is documented and tested.

**Technical.** Source: `services/shared/src/env.ts`. All secrets go through `requireSecret(name)` which fails fast in production if the secret is unset, falls back to a documented dev-only default in dev, and one-time-warns when a dev default is used.

### 14.1 The required-in-production list

From `.env.example`:

| Secret | Used for | Rotation policy | Failure mode if leaked |
|---|---|---|---|
| `JWT_SECRET` | Access-token HMAC | On suspicion of leak; annually otherwise | Attackers can mint access tokens up to 15-min lifetime |
| `JWT_REFRESH_SECRET` | Refresh-token HMAC | On suspicion of leak; annually otherwise | Attackers can mint refresh tokens up to 30-day lifetime |
| `INTERNAL_SERVICE_KEY` | Service-to-service auth header | Annual | Direct cross-service traffic possible if cluster network is compromised |
| `ENCRYPTION_KEY` | AES-256-GCM for chat messages | **Annually only with `ENCRYPTION_KEY_PREVIOUS` fallback**; never rotate without the fallback | New chats break; old chats unreadable without the prior key |
| `ENCRYPTION_SALT` | scrypt KDF for ENCRYPTION_KEY | Never (the derived key depends on it) | Same as ENCRYPTION_KEY rotation |
| `TRACKING_HASH_SECRET` | HMAC-SHA256 for uidHash | Annually as RTBF lever | Pre-rotation tracking events become unjoinable (this is a *feature*) |
| `DEVICE_FP_SALT` | Device fingerprint hashing | On suspicion of leak | Old trusted-device tokens invalidate; users re-prompted for OTP |
| `POSTGRES_PASSWORD` | DB credential | On suspicion of leak; quarterly otherwise | Direct DB access; existential risk |
| `REDIS_URL` (contains AUTH) | Redis credential | On suspicion of leak | Cache poisoning; idempotency bypass |
| `GOOGLE_CLIENT_ID` | OAuth audience | Only if Google rotates it | OAuth flow breaks |
| `APPLE_CLIENT_ID` | OAuth audience | Only if Apple rotates it | OAuth flow breaks |
| `SENDGRID_API_KEY` | Transactional email | On suspicion of leak | Email impersonation under our domain |

### 14.2 The `requireSecret` function

```ts
// services/shared/src/env.ts (sketch)
const IS_PROD = process.env.NODE_ENV === 'production';

const DEV_DEFAULTS: Record<string, string> = {
  JWT_SECRET: 'miamo-dev-jwt-secret-change-in-production-2026',
  JWT_REFRESH_SECRET: 'miamo-refresh-secret-change',
  INTERNAL_SERVICE_KEY: 'miamo-internal-dev-key',
  ENCRYPTION_KEY: 'miamo-internal-dev-key',
  ENCRYPTION_SALT: 'miamo-e2e-salt-2026',
};

const cache = new Map<string, string>();
const warned = new Set<string>();

export function requireSecret(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;
  const v = process.env[name];
  if (v && v.length > 0) { cache.set(name, v); return v; }
  if (IS_PROD) throw new Error(`FATAL: ${name} must be set in production`);
  const fallback = DEV_DEFAULTS[name];
  if (fallback !== undefined) {
    if (!warned.has(name)) {
      console.warn(`[env] using dev default for ${name}; NEVER use this in production`);
      warned.add(name);
    }
    cache.set(name, fallback);
    return fallback;
  }
  throw new Error(`FATAL: ${name} is not set and has no dev default`);
}
```

Key properties:

1. **Production fails fast.** Boot crash if any required secret is missing. Better to fail at start than to run with a placeholder.
2. **Dev one-time warning.** The warn is logged exactly once per secret per process. A developer running locally sees the warning at startup and is reminded that production needs a real value.
3. **Caching.** `requireSecret` is called on every request via the `env` getter. Caching the lookup keeps the hot path zero-cost.

### 14.3 Development workflow

- `.env.local` is gitignored; engineers copy `.env.example` and fill in real values for local testing.
- Local development uses the dev defaults for `JWT_SECRET`, `ENCRYPTION_KEY`, etc. — no real secret material on dev machines.
- `npm run dev` boots all services with `NODE_ENV=development`. The one-time-warn for each dev-default secret prints to console.
- The dev OTP provider (`OTP_PROVIDER_EMAIL=dev`) logs codes to stdout instead of sending them. The `/__dev/otp/peek` endpoint (gated by `ALLOW_DEV_OTP_PEEK=1` in dev only) exposes the most recent code for an identifier — used by automated tests and the local QA workflow.

### 14.4 Production deployment

- Kubernetes Secrets carry every required-in-production value. The `Deployment` spec mounts them as env vars on the service container.
- Secrets are encrypted at rest by the K8s control plane (etcd encryption) and rotated via `kubectl create secret` with a rolling deploy of the affected services.
- Access to read production secrets is restricted to the on-call SRE and the founder. Audit logs of `kubectl get secret` invocations are kept by the cluster's audit hook.
- The cluster has no `kubectl edit secret` path that does not generate an audit record.

### 14.5 Rotation procedures

**`JWT_SECRET`:**

1. Generate new value: `openssl rand -hex 32`.
2. Set `JWT_SECRET_NEXT` on every gateway/auth service alongside the current `JWT_SECRET`.
3. Verifier code accepts either; signer code uses `JWT_SECRET` (still old).
4. Rolling deploy.
5. After 1 hour (long enough for in-flight requests to complete), swap: rename `JWT_SECRET_NEXT` → `JWT_SECRET`, retire old.
6. Rolling deploy. Now both signing and verifying use the new key.
7. **Side effect:** any session that was signed with the old key fails verification. Users are forced to re-login (the access-token expiry forces a refresh, and the refresh-token path was untouched, so they get a new access token signed with the new key). Net user impact: zero, if done correctly.

**`ENCRYPTION_KEY` (planned rotation):**

1. Generate new value: `openssl rand -hex 32`.
2. Set `ENCRYPTION_KEY_PREVIOUS` = current `ENCRYPTION_KEY`.
3. Set new value as `ENCRYPTION_KEY`.
4. Rolling deploy. Decrypt path: try new key first, fall back to previous on auth-tag failure. Encrypt path: always new key.
5. Wait for the rotation horizon (default 90 days — chats older than that can drop off the readable surface).
6. Drop `ENCRYPTION_KEY_PREVIOUS`. All pre-rotation chats become cryptographically erased.

**`ENCRYPTION_KEY` (emergency rotation — suspected leak):**

1. Same as planned, except step 6 is `T+0` instead of `T+90d`. This is the nuclear option — all chats older than the rotation are gone.

**`TRACKING_HASH_SECRET`:**

1. Set `TRACKING_HASH_SECRET_PREVIOUS` = current.
2. Set new value as `TRACKING_HASH_SECRET`.
3. Rolling deploy. New events use the new secret; reads can compute both `uidHash_new` and `uidHash_previous` for joins during the transition.
4. After 90 days (the raw-event retention window), the previous hash is no longer present in any live data. Drop `TRACKING_HASH_SECRET_PREVIOUS`.

### 14.6 Secrets that are NOT in env vars

- **Encryption nonces / IVs.** Per-message random; no global secret needed.
- **Session ids.** Generated by Postgres via `cuid()` — not a "secret" but a unique handle.
- **Idempotency keys.** Client-supplied UUIDs; not server-held secrets.
- **OAuth client secrets.** Held by the OAuth provider (Google / Apple). Miamo only stores the client *id* (which is public).

---

## Section 15 — Compliance & audit checklist

**Plain English (Meera at compliance review).** A one-screen checklist for the legal and audit team to verify the platform's privacy and security posture in one sitting. Each item points at the section that documents the underlying mechanism.

### 15.1 DPDP Act 2023 — checklist

- [x] Consent UI: granular per-purpose, default-OFF for special category → §11
- [x] Withdrawal as easy as grant → §11
- [x] Notice at point of collection → §10.1
- [x] RTBF execution path → §12
- [x] RTBF SLA inside 30 days, hot in 24h → §12.3
- [x] Audit log with 7-year retention → §13.4
- [x] Cross-border transfer register → §10.8
- [x] Strict 18+ minimum age → §10.7
- [x] Breach notification process (72h) → §16.3
- [x] Pseudonymisation of behavioural data → §3.3
- [x] DPO named, grievance contact (legal@miamo.in) → §10.1
- [x] DPIA documented for behavioural-inference processing → §10.1

### 15.2 GDPR — checklist

- [x] Article 6 lawful basis: consent for behavioural inference; contract for service operation → §11
- [x] Article 9 special-category consent for mood/orientation-adjacent processing → §10.6
- [x] Article 22 right to be informed (WhyCard) → §10.2
- [x] Article 22 right to express viewpoint (Show me less like this) → §10.2
- [x] Article 22 right to human review (Talk to a human in Settings) → §10.2
- [x] Article 25 data protection by design (sanitisation, validation, encryption by default) → §3, §5, §6
- [x] Article 32 security of processing (encryption, pseudonymisation, integrity, resilience) → §3, §4
- [x] Article 33 breach notification (72h) → §16.3
- [x] Article 8 children (strict 18+) → §10.7

### 15.3 CCPA / CPRA — checklist

- [x] "Do Not Sell or Share" link in footer for CA users → §10.3
- [x] GPC header honoured → §10.3
- [x] Right to know (data export endpoint) → §10.3
- [x] Right to delete (RTBF endpoint) → §10.3
- [x] No discrimination clause documented → §10.3

### 15.4 Apple ATT — checklist

- [x] No third-party SDK that joins identifiers cross-app → §10.4
- [x] First-party `did` not shared with attribution providers → §10.4
- [x] AdAttributionKit / SKAdNetwork roadmap for paid acquisition → §10.4

### 15.5 Safari ITP — checklist

- [x] Refresh-token cookie server-set with `Set-Cookie` → §10.5
- [x] Triangulated `did` storage across localStorage + IndexedDB + ETag → §10.5
- [x] No third-party cookies → §10.5

### 15.6 Code-review security checklist (for engineers)

When reviewing a PR that touches any of these surfaces, run the checklist:

**Auth surface:**
- [ ] `authMiddleware` applied to every protected route
- [ ] `createInternalAuthMiddleware` on every internal-only route
- [ ] No raw access to `req.headers.authorization`; always via the middleware

**Data writes:**
- [ ] `validate({ body: schema })` on every POST/PUT/PATCH/DELETE
- [ ] Schema declared in `services/shared/src/schemas.ts`
- [ ] `sanitize()` applied to any string field rendered back to other users
- [ ] `idempotency()` on any write that has a "should not happen twice" semantic

**Encryption:**
- [ ] No new column storing user-typed long-form text without encryption (chat-style)
- [ ] No use of `process.env.SECRET_NAME` directly; always via `requireSecret(name)` or the `env` getter

**Logging:**
- [ ] No direct `console.log` of request bodies; use the `logger` module
- [ ] No PII in error messages returned to the client

**Tracking:**
- [ ] No raw userId in any tracking table; always `uidHash`
- [ ] Consent-gated processing reads `Settings.X` before running

---

## Section 16 — Threat model & incident response

**Plain English (Arjun at threat-model whiteboard).** This is where we list the bad things that could happen and what we have done about each. The threat model is not exhaustive — no threat model is — but it covers the categories we have invested defences against. Anything missing from this list is either out-of-scope, mitigated by a non-application control (e.g. cloud provider security), or pending in the v3.7 roadmap.

### 16.1 Threat catalog

| # | Threat | Likelihood | Impact | Primary defence | Secondary defence |
|---|---|---|---|---|---|
| T1 | Credential stuffing against the login endpoint | High | Medium (per-account, up to one ATO) | Rate limit 10/5min/IP + bcrypt cost 12 | Anomaly detection on login pattern |
| T2 | XSS via injected user input | Medium | High (cookie steal, ATO) | CSP `script-src 'self' 'nonce-…'` + sanitize() | httpOnly refresh cookie |
| T3 | SQL injection | Low | Existential | Prisma parameterised queries — zero raw SQL string concat | DB user has minimal privileges |
| T4 | DB backup theft → chat content disclosure | Medium | Critical (privacy breach) | AES-256-GCM encryption with separately-held key | `TRACKING_HASH_SECRET` separates tracking pseudonyms |
| T5 | Single-secret compromise → full takeover | Low | Existential | Three distinct secrets (JWT, encryption, tracking) | Per-environment isolation |
| T6 | Replay attack on payment/spotlight spend | Medium | High (financial) | Idempotency-Key middleware + Redis NX | Append-only ledger |
| T7 | Account takeover via stolen access token | Medium | High (per-account) | 15-min access-token lifetime | Refresh-token rotation detection |
| T8 | OAuth provider compromise (Google/Apple) | Very low | High | Server-side audience verification of OAuth responses | 2FA on subsequent logins |
| T9 | Mass profile scraping by competitor | High | Medium (business risk) | Per-user write rate limit + per-IP general limit | Behavioural fingerprinting |
| T10 | Insider abuse — engineer queries Postgres | Low | High (privacy breach) | Chat encryption keeps message content unreadable | AuditLog of admin actions |
| T11 | DDoS / volumetric attack | High | High (availability) | Cloud LB / WAF (Cloudflare or equivalent) | Application rate limits as backstop |
| T12 | Logged PII in CloudWatch / Loki | Medium | Medium (privacy breach) | logger.ts PII redaction (Section 8.4) | Periodic log-content audit |
| T13 | Stalker patterns (one user obsessively searching) | Medium | High (safety) | Block + Report + safety review queue | Behavioural anomaly detection on search frequency |
| T14 | Children mis-registering | Medium | Critical (regulatory) | DOB check at signup + manual review on report | Account suspension pending verification |
| T15 | Showcase URL phishing (user clicks malicious link) | Medium | Medium (per-user) | URL allowlist + Instagram restricted to public /reel/ | User education in onboarding |

### 16.2 Threats *out of scope*

- **Physical compromise of a user's device.** If Priya's phone is unlocked and an attacker has it in hand, our security boundaries do not apply. We mitigate via short access-token lifetime (the attacker has at most 15 minutes of valid token) but a determined attacker with physical access wins.
- **State-actor-level adversary.** Defending against well-resourced nation-state attackers is not within our threat model. We use standard cryptographic primitives correctly; that is the boundary.
- **Cloud-provider compromise.** We rely on the cloud provider's security boundary. If AWS is compromised at the hypervisor level, our app-level controls do not help.
- **Quantum-cryptography break.** AES-256 is widely believed to be quantum-resistant (Grover's algorithm halves the effective bits, so it becomes AES-128-equivalent, still infeasible). Bcrypt is not, but bcrypt is used only for password storage, not for any long-lived secret.

### 16.3 Incident response procedure

Severity levels:

- **SEV-0** Active breach of user data. Page founder + DPO immediately. 72-hour clock starts. See `docs/RUNBOOK.md §9.1`.
- **SEV-1** Suspected breach, no confirmed exfiltration. Page on-call SRE. 24h investigation window before escalation.
- **SEV-2** Single-user issue (one account compromised). Reset that user's session + audit-log review. No external notification.
- **SEV-3** Bug with privacy implication, no exploit observed. Patch in next release.

**SEV-0 / SEV-1 procedure:**

1. **Contain.** Isolate the affected service (scale to zero or block traffic at LB). Rotate any secret known-or-suspected to be in scope.
2. **Investigate.** Pull request-id traces from logs. Determine scope (how many users, what data).
3. **Notify.** Within 72 hours: DPDP Data Protection Board (if Indian user data) + GDPR supervisory authority (if EU user data) + affected users with the templated notification copy.
4. **Remediate.** Patch the vulnerability. Force re-login if sessions are in scope (rotate `JWT_SECRET`). Force key rotation if message encryption is in scope.
5. **Post-mortem.** Within 7 days. Public-facing summary at `https://miamo.in/incidents/<date>`.

The templated notification copy lives in the team incident-response repo.

### 16.4 Anomaly detection

A small set of Prometheus alerts page the on-call for known-suspicious patterns:

- **`miamo_auth_login_failure_rate{} > 50 / min`** — credential stuffing in progress.
- **`miamo_idempotency_replay_total{} > 100 / min`** — client retry storm or attempted replay.
- **`miamo_rate_limit_429_total{} > 1000 / min`** — abusive client or bot.
- **`miamo_jwt_verify_failure_total{} > 100 / min`** — token-forging attempt or secret rotation in progress.
- **`miamo_otp_attempt_failure_rate{} > 30 / min`** — OTP brute force.

Each alert has a documented runbook entry in `docs/RUNBOOK.md`.

---

## Section 17 — Appendix: source-file index

For auditors who want to verify every claim against source code, the canonical files are:

### Shared primitives — `services/shared/src/`

- `service.ts` — `applyBaseMiddleware`, `createPrisma`, `installHealthRoutes`, `createInternalAuthMiddleware`, `createPushToUser`
- `env.ts` — `requireSecret`, `env` getter, dev-default registry
- `errorHandler.ts` — standard error envelope mapping (Prisma → 401/500, AppError → status)
- `requestId.ts` — `requestId` middleware
- `idempotency.ts` — `idempotency()` factory
- `metrics.ts` — Prometheus collectors (`miamo_http_requests_total`, etc.)
- `audit.ts` — `auditLog()`, `trackActivity()`
- `validate.ts` — zod `validate()` middleware
- `schemas.ts` — every zod body/query/params schema
- `sanitize.ts` — `sanitize`, `sanitizeObject`, `escapeHtml`, `stripSensitive`
- `logger.ts` — level-gated console wrapper with PII redaction
- `coerce.ts` — `safeUuid`, `safeLimit`, `safeEnum`, `safeCursor`, `cursorOpt`
- `visibility.ts` — DTM field-level visibility tiers
- `verification.ts` — OTP, trusted devices, challenge tokens, signup tokens
- `spotlight-ledger.ts` — append-only minutes ledger with `awardOnce` / `spend` / `refund`
- `creativity-track.ts` — `recordCreativityAction`, `propagateCreatorTraits`

### Gateway — `services/gateway/src/`

- `server.ts` — bootstrap, route mounting
- `middleware/auth.ts` — `authMiddleware` (the JWT verifier with regex pre-check)

### Auth service — `services/auth/src/`

- `server.ts` — register, login, refresh, logout, password-reset, 2FA challenge

### Tracking — `services/tracking-worker/src/`

- `forget.ts` — RTBF execution across tracking tables
- `intentInference.ts` — mood-inference worker (gated by `moodInferenceEnabled`)
- `learnerLoop.ts` — incorporates `MatchFeedback` with bounded weight

### Web — `services/web/src/`

- `lib/api.ts` — client-side fetch wrapper with Idempotency-Key generation
- `app/(main)/settings/page.tsx` — the four consent toggles UI

### Schema — `services/shared/prisma/schema.prisma`

- `User` — root account, password hash, cascading deletes to ~50 child tables
- `Session` — refresh-token row, deleted on rotation
- `Message` — `iv`, `ciphertext`, `authTag`; no plaintext column
- `Otp`, `TrustedDevice`, `VerificationSubmission` — verification surfaces
- `Settings` — the four consent toggles plus other preferences
- `ConsentEvent` — append-only consent grant/withdrawal log
- `AuditLog` — privileged-action immutable log

### Documentation cross-references

- `docs/architecture/v3.6-market-scan.md` §6 — full privacy & regulation research (~3149 words)
- `docs/architecture/v3.6-overhaul-design.md` — the overhaul design that introduced the four consent toggles
- `docs/RUNBOOK.md` §9 — incident response playbooks

- `.env.example` — the canonical environment variable list

---

## Section 18 — Glossary

**ACL** — Access Control List. A list of who is allowed to do what to a resource.

**AEAD** — Authenticated Encryption with Associated Data. A class of cipher modes (GCM, ChaCha20-Poly1305) that bundle confidentiality and integrity. AES-256-GCM is the AEAD primitive Miamo uses.

**ATT** — App Tracking Transparency. Apple's iOS 14.5+ permission framework for accessing IDFA or tracking users across apps.

**bcrypt** — A password-hashing function based on the Blowfish cipher. Cost factor 12 means 2¹² iterations.

**CCPA / CPRA** — California Consumer Privacy Act / California Privacy Rights Act. California's privacy law applicable above 100K CA residents.

**CSP** — Content Security Policy. A browser-side HTTP header that restricts what the page can execute.

**DPDP** — Digital Personal Data Protection Act 2023 (India). The Indian privacy regime.

**DPIA** — Data Protection Impact Assessment. A documented risk analysis for processing activities under GDPR (Article 35) and DPDP.

**DPO** — Data Protection Officer. The named individual responsible for privacy compliance under GDPR Article 37 and DPDP.

**GDPR** — General Data Protection Regulation. EU privacy regime.

**GCM** — Galois/Counter Mode. The AEAD mode used with AES-256 for Miamo's chat encryption.

**GPC** — Global Privacy Control. A browser-level signal (`Sec-GPC: 1`) that asserts "do not sell my data."

**HMAC** — Hash-based Message Authentication Code. HMAC-SHA256 is Miamo's pseudonymisation primitive for tracking.

**HS256** — HMAC-SHA-256-based JWT signing algorithm. Symmetric (one shared secret).

**httpOnly** — A cookie attribute that prevents JavaScript from reading the cookie. XSS resistance.

**IDFA** — Identifier for Advertisers. Apple's cross-app advertising id. Restricted by ATT.

**ITP** — Intelligent Tracking Prevention. Safari's cookie / storage partitioning system.

**JWT** — JSON Web Token. The signed-claim token format Miamo uses for access and refresh tokens.

**KDF** — Key Derivation Function. `scrypt` is the KDF Miamo uses to derive `ENCRYPTION_KEY` from raw secret + salt.

**OWASP** — Open Web Application Security Project. Publishes the Top 10 list of web-app security risks.

**Pseudonymisation** — Replacing identifying information with a stable but non-reversible (without separate secret) handle. HMAC-SHA256 of userId is Miamo's pseudonymisation primitive.

**RTBF** — Right To Be Forgotten. GDPR Article 17 / DPDP Section 11 right to erasure.

**SameSite** — A cookie attribute (`Strict`, `Lax`, `None`) that restricts when the cookie is sent on cross-site requests. Miamo's refresh cookie is `SameSite=Lax`.

**SDF** — Significant Data Fiduciary. A DPDP designation for high-risk data fiduciaries; subject to elevated obligations including DPIA and Independent Data Auditor.

**scrypt** — A memory-hard key-derivation function. Used by Miamo for deriving `ENCRYPTION_KEY` material at boot.

**TTL** — Time To Live. The expiry of a cached value or signed token.

**uidHash** — Miamo-specific term: the 22-char base64url HMAC-SHA256 of a userId, used in all tracking tables.

**XSS** — Cross-Site Scripting. The class of attack where an attacker injects script that runs in another user's browser.

---

## Section 19 — Change log

- **v3.6.1 (2026-06-25)** — Full rewrite to pair-write style; OWASP Top 10 mapping added; explicit DPDP / GDPR / CCPA / ATT / ITP sections; source-file index appendix.
- **v3.6.0 (2026-06-15)** — Four-toggle consent UI shipped. `moodInferenceEnabled` default-OFF. RTBF executor at `services/tracking-worker/src/forget.ts`. WhyCard endpoint live.
- **v3.5.0 (2026-04-10)** — Creativity v3.5 surface added; `recordCreativityAction` records engagement; encryption posture unchanged.
- **v3.4.0 (2026-02-20)** — Discover hard-filter on `UserActivity.action='pass'` for 30-day window (was soft penalty in v3.3 and earlier).
- **v3.3.0 (2026-01-08)** — `idempotency()` middleware ships; mounted initially on messaging send.
- **v3.2.0 (2025-11-22)** — Showcase / AccessRequest model; `visibility.ts` introduces field-level ACL for DTM.
- **v3.1.0 (2025-09-30)** — Tracking pipeline (`ingest` → Redis Stream → `tracking-worker`) ships with `uidHash` pseudonymisation from day one.
- **v3.0.0 (2025-07-15)** — Service split; `applyBaseMiddleware` consolidates Helmet + CORS + rate-limit + morgan + requestId + metrics. Standard error envelope shipped.

---

*This document is maintained by the Miamo engineering team. Corrections, clarifications, or audit-driven amendments should be PR'd against `docs/SECURITY.md`. Each section is intended to stand alone; cross-references use absolute section numbers so excerpts can be quoted without losing context. If you read this end-to-end and a passage felt like marketing rather than mechanism, that is a bug — please open an issue.*
