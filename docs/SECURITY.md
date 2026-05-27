# Security — how we protect Priya

**TL;DR:** Three layers of protection: (1) a wristband with an expiry stamp (JWT) so we know who you are, (2) a locked diary (AES-256-GCM) so nobody reads your messages, (3) a tamper-proof wax seal (HMAC) on tracking data so it can never be tied back to you.

---

## How to read this

- **Meera (non-tech)**: Read "Priya's journey through security" and "The three protections" only.
- **Priya (user/PM)**: Read sections 1-5.
- **Arjun (engineer)**: Read everything, including code.

---

## Priya's journey through security

It's 9pm. Priya opens Miamo. Here's what's protecting her every keystroke:

1. **She types her password.** We pass it through a slow hashing algorithm (bcrypt) that takes 250ms per attempt—so if a hacker tries 1,000 passwords, it takes ~4 days. She types `priya123`, we hash it, and that hash lives in the database. We *never* store the actual password.

2. **She logs in.** We give her a wristband (a JWT token) that's only valid for 15 minutes. If someone steals her phone, the thief can only use her account for 15 minutes before the wristband expires and she has to log in again. Plus, the wristband lives in an httpOnly cookie—JavaScript can't read it, so a website bug can't steal it.

3. **She messages Arjun "I really like your photos."** We lock that message in a diary (AES-256-GCM encryption) before it touches the database. The plaintext never exists in Postgres. Even our DBAs can't read it. The message is so encrypted that the same text sent to Arjun and to her friend Neha produces completely different ciphertexts.

4. **She swipes.** Every swipe creates a sticky note (a tracking event) that says "Priya swiped right." But instead of "Priya," the sticky note says a hash (a scrambled code) that can never be un-scrambled. If our database is stolen, a hacker sees 1000 hashes but can't tell which one is Priya.

5. **She opens her phone the next day.** Her wristband has expired, so she logs in again. We give her a new wristband (new JWT). All her old sessions are revoked if she changed her password yesterday.

---

## The three protections, explained simply

### Protection 1: The Wristband (JWT)

When Priya logs in, we hand her a **JWT** — a "wristband with an expiry stamp."

**How it works:**
- She types email + password
- We check: email exists? Password hash matches? Yes to both.
- We give her a wristband: a long string that says "This is Priya, valid until 9:15pm, signed by us"
- The wristband is signed with our secret (`JWT_SECRET`), so nobody can forge it
- Every time she makes a request, she shows the wristband
- We check: is the signature real? Has it expired? Yes and no? Let her through.

**Numbers:**
- **Access token** (the wristband): Valid for **15 minutes**
- **Refresh token** (a backup wristband): Valid for **30 days**
- **Signing algorithm**: HS256 (HMAC-SHA256) with `JWT_SECRET`

**Why 15 minutes?** If someone steals her phone, they have 15 minutes of access, not forever. At 9:15pm, the wristband expires and they can't make requests anymore.

**Why httpOnly cookies?** Because the wristband lives in an httpOnly cookie—JavaScript on the page *cannot* read it. If a website has an XSS bug (a bug where hacker code runs on the page), that hacker code can't steal the wristband. They'd have to compromise the entire server.

**What if she changes her password?** We revoke *every* session she ever had. Every wristband is torn up.

```ts
// When password changes, revoke all sessions
await db.session.deleteMany({ where: { userId: priya.id } });
```

---

### Protection 2: The Locked Diary (AES-256-GCM)

When Priya types a message to Arjun, we don't store the plain text in the database.

**How it works:**
1. Priya types: "I really like your photos"
2. Before insert, we run it through a cipher (AES-256-GCM, the military-grade encryption): `encrypt(message, key, iv)` → 🔐 (locked ciphertext)
3. We store in Postgres:
   ```
   { iv: "abc123def456", ciphertext: "🔐encrypted", authTag: "xyz789" }
   ```
4. The plaintext is gone. Even if Postgres dumps to disk, it's gibberish.
5. When Arjun opens the chat, we fetch the ciphertext and IV and authTag, and *unlock* it: `decrypt(ciphertext, key, iv, authTag)` → "I really like your photos"

**Key details:**
- **Fresh IV per message**: Every message gets a brand-new random IV (Initialization Vector). Same message encrypted twice produces completely different ciphertexts.
- **AuthTag**: A tamper-proof seal. If a hacker tries to modify the ciphertext, decryption fails.
- **The key**: Derived from `ENCRYPTION_KEY` + `ENCRYPTION_SALT` using scrypt. We never rotate these once messages exist—rotation makes all old messages permanently unreadable.

**Worked example:**
```
Priya → Arjun: "I really like your photos"
  Encrypted: \x12\x34\x56\x78... (random, unique)

Priya → Neha: "I really like your photos"
  Encrypted: \xab\xcd\xef\x01... (completely different!)

Even though the plaintext is identical, the ciphertexts are unique.
A hacker can't say "Ah, Priya likes the same thing about both people."
```

---

### Protection 3: The Wax Seal (HMAC on Tracking)

Every tracking event (swipe, tap, view) is anonymized with an HMAC—a tamper-proof wax seal.

**How it works:**
1. Priya swipes right on Arjun
2. We create an event: `{ userId: "priya-123", action: "like", timestamp: "...", uidHash: "???" }`
3. Before it goes to Redis, we seal the user ID with an HMAC:
   ```
   uidHash = HMAC-SHA256("secret", userId).digest("base64url").slice(0, 22)
   ```
4. The event becomes: `{ uidHash: "k7x9m2p1q5r8t3n0v4w6", action: "like", ... }`
5. We store the event, but we *never* store the userId in tracking data

**Why this matters:**
- If our database dumps, a hacker sees 1000 hashes but can't reverse-engineer them to identities
- The same Priya always produces the same hash (so we can correlate her events across time)
- But a hacker can't say "This is Priya" unless they also have `TRACKING_HASH_SECRET`
- And even if they have the secret, they can't identify her from the hash alone

**Numbers:**
- `HMAC-SHA256` with `TRACKING_HASH_SECRET` (kept secret)
- Output: 22 characters in base64url (132 bits of entropy)

---

## The threat model: what we worry about

| Threat | What's at risk | How we defend |
|--------|----------------|---------------|
| **Account takeover** (attacker logs in as Priya) | Photos, chats, matches, profile | bcrypt cost 12 (250ms per guess), 15min JWT, httpOnly cookies, session revocation on password change |
| **Eavesdropping** (attacker reads data in transit) | Messages, passwords, profile | HTTPS/TLS everywhere, certificates pinned where applicable |
| **Data breach** (attacker steals the database) | All messages, profiles, photos | Messages encrypted AES-256-GCM before insert; tracking UIDs sealed with HMAC; passwords hashed with bcrypt |
| **Abuse** (attacker spams or DOS) | Service availability | Rate-limit at gateway: 60 req/min per IP, 30 req/min per user on writes |
| **XSS** (attacker runs code on Priya's browser) | Session cookie | httpOnly cookies, Strict CSP (no inline scripts, no 3rd-party JS) |
| **SQL injection** (attacker alters database via form) | All data | Prisma ORM (parameterised queries), Zod schema validation |
| **Secrets in logs** (attacker finds JWT/password in error messages) | All secrets | Central logger redacts `password`, `token`, `secret`, `authorization`, `cookie` fields |

---

## Authentication: the whole flow

1. **Signup**: Email + password. We hash the password with bcrypt (cost 12, ~250ms per hash).
2. **Login**: Email + password. We check: does the email exist? Does the bcrypt hash match? Yes? Give her a JWT.
3. **Request**: Every API call carries the JWT in the Authorization header (or in an httpOnly cookie, depending on context).
4. **Verify**: Gateway checks: is the JWT signed with our secret? Has it expired? Yes and no? Forward to the service.
5. **Refresh**: After 15 minutes, the JWT expires. Priya's browser automatically uses the refresh token to get a new JWT. If she changed her password, the refresh token is revoked and she re-logs in.

**Numbers:**
- **bcrypt cost**: 12 (takes ~250ms to hash per password attempt; makes brute-force take ~8 years for 1 billion passwords)
- **JWT algorithms**: HS256 (HMAC-SHA256) — signed, not encrypted
- **Access token lifespan**: 15 minutes
- **Refresh token lifespan**: 30 days

---

## Authorization: who can do what

Every service checks: is this request from the gateway (which did authentication) or from another service (which should have an `INTERNAL_SERVICE_KEY`)?

**Two patterns:**

1. **User requests** (Priya in her browser):
   - Browser → gateway (Priya shows her JWT cookie)
   - Gateway checks JWT, then forwards to service with JWT in header
   - Service extracts userId from JWT, checks if user has permission for this action

2. **Service-to-service** (social asking messaging):
   - Social → messaging
   - Messaging checks: does this request have `X-Internal-Key: $INTERNAL_SERVICE_KEY`?
   - Messaging checks the environment variable; if it matches, forward; if not, 403 Forbidden

**Scope-based consent:**
Some actions require explicit consent (e.g., "let us use your location for Discover ranking"). We check:
```
if (!user.consentScopes.includes("location")) return 403;
```

---

## Encryption: how locked diaries actually work

**At rest (in the database):**
```
message = "I really like your photos"
iv = randomBytes(12)
key = scrypt(ENCRYPTION_KEY, ENCRYPTION_SALT, 32)
cipher = createCipheriv("aes-256-gcm", key, iv)
ciphertext = cipher.update(message, "utf8") + cipher.final()
authTag = cipher.getAuthTag()

// Store in Postgres:
// { iv, ciphertext, authTag }
```

**In transit (between browser and server):**
- All traffic is HTTPS/TLS 1.3+
- Certificates are pinned where applicable (mobile apps)
- Strict HSTS header (all future connections are HTTPS-only)

**Key rotation:**
- `ENCRYPTION_KEY` and `ENCRYPTION_SALT` — **never rotate once messages exist**. Rotation makes all old messages unreadable.
- `JWT_SECRET` — can rotate, clients re-login
- `INTERNAL_SERVICE_KEY` — can rotate with a brief window of both old and new keys accepted

---

## Rate-limiting: keeping spammers out

At the gateway, two layers:

| Layer | Limit | Example |
|-------|-------|---------|
| **Per-IP** | 60 requests / minute per route | Hacker's computer: 60 attempts at /auth/login, then blocked for 60s |
| **Per-user** | 30 write requests / minute | Spammer account: 30 likes per minute, then 429 Too Many Requests |

```ts
// gateway/src/middleware.ts
app.use(rateLimitMiddleware({
  windowSec: 60,
  perIp: 60,
  perUser: 30,
}));

// If exceeded:
return res.status(429).json({ error: "Too many requests" });
```

Redis keys auto-expire after the window, no cleanup needed.

---

## The "never do" list

1. **Don't rotate `TRACKING_HASH_SECRET` once events exist.** Makes every historical event un-joinable. Priya's 1-month history becomes 1000 separate identities.
2. **Don't rotate `ENCRYPTION_KEY` or `ENCRYPTION_SALT` once messages exist.** Makes all old messages permanently unreadable. You can't decrypt them with the new key.
3. **Don't disable rate-limit "just to test."** Always test with realistic limits. Turn off rate-limit in staging, not production.
4. **Don't `npm install` random packages.** Supply-chain attacks are real. Use pinned versions in package-lock.json; audit every update.
5. **Don't log JWTs, passwords, or encryption keys.** Use the central logger with redaction.

---

## Secrets management

| Secret | Where it lives | Can rotate? | What it does |
|--------|----------------|------------|--------------|
| `JWT_SECRET` | env var | YES (after 15min, old tokens expire naturally) | Signs access tokens |
| `INTERNAL_SERVICE_KEY` | env var | YES (brief window where both old+new accepted) | Service-to-service auth |
| `ENCRYPTION_KEY` | env var | **NO** | Derives the key for AES-256-GCM |
| `ENCRYPTION_SALT` | env var | **NO** | Mixed with `ENCRYPTION_KEY` for key derivation |
| `TRACKING_HASH_SECRET` | env var | **NO** | HMAC key for anonymizing user IDs |
| `DATABASE_PASSWORD` | Kubernetes Secret | YES | Postgres auth |

---

## OWASP Top 10: what we do

| OWASP | Risk | Our defense |
|-------|------|-------------|
| **A01: Broken Access Control** | User can do what they shouldn't | Gateway auth + JWT + per-service authorization + Zod schema validation |
| **A02: Cryptographic Failures** | Encrypted data is weak | AES-256-GCM for messages, bcrypt cost 12 for passwords, HMAC-SHA256 for tracking |
| **A03: Injection** | SQL injection, command injection | Prisma ORM (no string concatenation), Zod validation at every boundary |
| **A04: Insecure Design** | Fundamental design flaw | This document, security review at PR, threat modeling before features |
| **A05: Security Misconfiguration** | Missing security controls | `${VAR:?required}` in compose, strict CSP, NetworkPolicy default-deny |
| **A06: Vulnerable Components** | Third-party libraries have CVEs | Renovate bot, `npm audit` in CI, lock file pinning |
| **A07: Identification & Auth Failures** | Weak auth | Bcrypt + HS256 + 15min access + refresh-token revocation |
| **A08: Software & Data Integrity Failures** | Code or data tampering | Signed container images, Pod Security Policy, NetworkPolicy |
| **A09: Logging & Monitoring Failures** | Can't see what's happening | Central logger, Prometheus alerts, SecurityContext audit logs |
| **A10: SSRF** | Server calls malicious external URL | Egress NetworkPolicy, URL allowlist before any fetch() |

---

## What changed and why it's better

| Then | Now | Why |
|------|-----|-----|
| Plaintext messages in Postgres | AES-256-GCM encrypted before insert | Database leak doesn't expose conversations |
| Long-lived JWT (doesn't expire) | 15-minute access + 30-day refresh | Phone stolen → attacker has 15 minutes, not forever |
| No rate-limit | Redis-backed rate-limit at gateway | Brute-force and DOS attacks are throttled |
| Tracking events have user ID | HMAC-sealed, can't reverse to user | Database leak doesn't identify people |
| No internal-service auth | Every internal call carries `INTERNAL_SERVICE_KEY` | Compromised pod can't call other services |

**Why Priya feels it:** She can have intimate conversations on chat knowing *nobody*—not us, not the NSA, not the hacker—can read them. If her phone is stolen Tuesday, the thief is locked out by Wednesday. Every like she makes is completely anonymous.

---

## If something breaks

| Symptom | First check | Fix |
|---------|-------------|-----|
| **All users logged out at once** | Check `JWT_SECRET` env var. Did it change? | Restore the old `JWT_SECRET` immediately. No data loss, just re-login. |
| **Messages show "[unable to decrypt]"** | Check `ENCRYPTION_KEY` and `ENCRYPTION_SALT`. Were they rotated? | **Restore the old keys immediately.** If no backup exists, those messages are permanently unreadable. |
| **Users getting 429 "Too many requests"** | Check rate-limit settings in gateway. Is `perUser` too low? | Increase `perUser` limit or check if there's a spike. |
| **Session cookie not being set** | Check: is gateway CORS allowing your frontend domain? Is cookie `sameSite` set correctly? | Verify `NEXT_PUBLIC_API_URL`, check CORS config in gateway. |
| **Tracking events have wrong uidHash** | Was `TRACKING_HASH_SECRET` changed? | Restore the old secret. New events will hash correctly; old events are scrambled but harmless. |
