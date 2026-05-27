# Security — the 7 doors a hacker would try

Priya's photos, messages, and personal life are inside Miamo. She trusts
us with them. Below are the seven doors an attacker would push on, and
exactly what we put behind each one. Each defence has a file path so
you can audit the code yourself.

---

## Door 1 — guessing Priya's password

**The attack.** Hit `/auth/login` with `priya@example.com` and a list
of common passwords until one works.

**The defence.** We store passwords using **bcrypt** (a slow hashing
algorithm — slow on purpose). Cost factor **12** means each guess takes
~250ms on a modern CPU. A 1-billion-password dictionary attack would
take **~8 years** even at full server load.

```ts
// services/auth/src/server.ts
const hash = await bcrypt.hash(password, 12);
```

Plus rate-limit (Door 4) caps wrong-password attempts at 5/min per IP.

---

## Door 2 — hijacking Priya's session

**The attack.** Steal her cookie via XSS, reuse it forever.

**The defence — three layers.**

1. **httpOnly cookies.** JavaScript on the page cannot read the cookie,
   so an XSS bug can't steal it.
2. **Short access token.** JWT (HS256, signed with `JWT_SECRET`) is
   valid for **15 minutes**. Stolen cookies stop working quickly.
3. **Revocable refresh tokens.** The refresh token is stored
   server-side; we can revoke an entire session row.
   Password change → all sessions revoked.

```ts
// services/auth/src/server.ts — on password change
await prisma.session.deleteMany({ where: { userId } });
```

---

## Door 3 — calling internal services directly

**The attack.** Find a pod IP for `social` and call its `/like`
endpoint without going through the gateway, bypassing rate-limit and
auth.

**The defence — two layers.**

1. **NetworkPolicy** (k8s) — default-deny; only the gateway can reach
   backend service ports. An attacker inside another pod can't talk
   to them.
2. **`INTERNAL_SERVICE_KEY` header.** Every internal call carries
   `X-Internal-Key: $INTERNAL_SERVICE_KEY`. Services reject calls
   without it (or with a wrong value).

```ts
// services/shared/src/middleware/internalAuth.ts
if (req.headers['x-internal-key'] !== process.env.INTERNAL_SERVICE_KEY) {
  return res.status(403).json({ error: 'forbidden' });
}
```

---

## Door 4 — spamming us off the internet

**The attack.** Hammer `/auth/login` or `/social/like` with millions
of requests to either DoS us or brute-force.

**The defence.** Redis-backed rate-limit at the gateway, two layers:

| Layer    | Key                             | Default limits         |
|----------|---------------------------------|-----------------------|
| Per-IP   | `rl:ip:{ip}:{route}`            | 60 req/min per route   |
| Per-user | `rl:user:{userId}:{route}`      | 30 req/min on writes   |

Exceeding the limit returns **`429 Too Many Requests`** with a
`Retry-After` header. The keys auto-expire — no cleanup needed.

```ts
// services/gateway/src/server.ts
app.use(rateLimitMiddleware({
  windowSec: 60,
  perIp: 60,
  perUser: 30,
}));
```

---

## Door 5 — reading chats from the database

**The attack.** Steal a Postgres dump and read everyone's private
messages.

**The defence.** Every message body is encrypted with **AES-256-GCM**
before insert. The plaintext never touches Postgres. Even our DBAs
cannot read messages.

```ts
// services/messaging/src/crypto.ts
const iv = randomBytes(12);                          // fresh per message
const cipher = createCipheriv('aes-256-gcm', KEY, iv);
const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
const authTag = cipher.getAuthTag();
// stored: { iv, ciphertext, authTag }   ← all three needed to decrypt
```

Key derivation: `KEY = scrypt(ENCRYPTION_KEY, ENCRYPTION_SALT, 32)`.
**Never rotate** these two env vars once messages exist — rotation
makes all stored ciphertext permanently unreadable.

---

## Door 6 — SQL injection / mass assignment

**The attack.** Smuggle `'; DROP TABLE Users;--` through a form, or
POST `{ "isAdmin": true }` to a profile-update endpoint.

**The defence — two layers.**

1. **Prisma ORM** — parameterised queries everywhere. There is no raw
   SQL string concatenation in the codebase.
2. **Zod schemas at every boundary.** Every request body is validated
   against an explicit Zod schema before any service code runs. Extra
   fields are stripped, wrong types are rejected.

```ts
const ProfileUpdate = z.object({
  displayName: z.string().min(1).max(60),
  bio: z.string().max(280).optional(),
}).strict();   // extra fields rejected
```

---

## Door 7 — secrets leaking through logs

**The attack.** Find an error log that printed a JWT or DB password,
walk in through the front door.

**The defence — three layers.**

1. **Central logger with redaction** in
   [services/shared/src/logger.ts](services/shared/src/logger.ts):
   any field named `password`, `token`, `secret`, `authorization`,
   `cookie` is replaced with `'[REDACTED]'` before serialisation.
2. **Strict CSP** on web responses — blocks inline scripts, blocks
   third-party origins. Reduces blast radius of any XSS.
3. **No console.log in services.** Lint rule blocks it; only the
   logger is allowed.

---

## Bonus — the things you must never do

1. **Don't rotate `TRACKING_HASH_SECRET` once events exist.**
   It makes every historical userHash unjoinable.
2. **Don't rotate `ENCRYPTION_KEY` or `ENCRYPTION_SALT` once chats
   exist.** It makes every stored message permanently unreadable.
3. **Don't disable rate-limit "just to test."** Always test in staging
   with realistic limits.
4. **Don't `npm install` random packages** — supply-chain attacks are
   real. Use pinned versions in package-lock.json.

---

## OWASP Top 10 mapping

| OWASP                                    | Where we address it                            |
|------------------------------------------|------------------------------------------------|
| A01 Broken Access Control                | Gateway auth + per-service authorization       |
| A02 Cryptographic Failures               | AES-256-GCM (chats), bcrypt cost 12 (passwords)|
| A03 Injection                            | Prisma + Zod                                   |
| A04 Insecure Design                      | This document                                  |
| A05 Security Misconfiguration            | `${VAR:?required}` in compose; strict CSP      |
| A06 Vulnerable Components                | Renovate bot + `npm audit` in CI               |
| A07 Identification & Auth Failures       | Bcrypt + short JWT + refresh-token revocation  |
| A08 Software & Data Integrity Failures   | Signed images + k8s pod security               |
| A09 Logging & Monitoring Failures        | Central logger + Prometheus alerts             |
| A10 SSRF                                 | Egress NetworkPolicy + URL allowlist           |

---

## What changed and why it's better

- **Before:** plaintext messages, single long-lived JWT, no rate-limit,
  no internal-service auth.
- **After:** AES-256-GCM at rest with per-message IV, 15-min JWT with
  revocable refresh, Redis-backed rate-limit at the gateway, internal
  service key required on every internal call.
- **Why Priya feels it:** she can have hard conversations on chat
  knowing nobody — not even us — can read them. If her phone is
  stolen, the thief has at most 15 minutes before her access token
  expires.

---

## If something breaks

| Symptom                                  | First check                                                |
|------------------------------------------|------------------------------------------------------------|
| Users mass-logged out                    | `JWT_SECRET` changed unexpectedly?                         |
| Messages decoding to garbage             | `ENCRYPTION_KEY` / `ENCRYPTION_SALT` rotated — restore!    |
| Real users getting 429 from gateway      | Per-user rate-limit too tight — check `windowSec`/`perUser`|
