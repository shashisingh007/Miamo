# Security

## 1. Authentication

### User JWT (HS256)

- Issued by [services/auth/src/server.ts](services/auth/src/server.ts) at `POST /api/v1/auth/login`. Access token 15 min, refresh token 30 days.
- Verified at the **gateway only** ([services/gateway/src/server.ts](services/gateway/src/server.ts)). Cheap regex format check (`^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$`) before `jwt.verify` to short-circuit garbage.
- Authorization header rejected if > 2 KB or malformed (sanitised away by `sanitizeHeaders`).
- Gateway injects `x-user-id` + `x-internal-key` headers when proxying. Domain services trust these (no second JWT round-trip).
- SSE accepts the token via query param (EventSource has no header hook).

### Internal service auth

- `INTERNAL_SERVICE_KEY` = `openssl rand -hex 32`. Sent as `x-internal-key` on every gateway → service call and on direct service → service calls (`social → messaging`).
- Domain services reject any request without it.

### Sessions

- Tracked in `Session` (device, browser, OS, IP, UA, lastActiveAt). Listed at `GET /api/v1/auth/sessions`. Per-session revoke at `POST /api/v1/auth/sessions/:id/revoke`.
- Password change revokes **all** sessions ([services/auth/src/server.ts](services/auth/src/server.ts) `PUT /api/v1/auth/password`).
- Passwords stored as `bcryptjs` hashes (cost 12). `passwordHash` never leaves the auth service in any response payload.

## 2. Encryption

### Messages (AES-256-GCM)

- [services/messaging/src/server.ts](services/messaging/src/server.ts), lines ~41–57.
- Format on disk: `enc:<iv-hex>:<authTag-hex>:<ciphertext-hex>`.
- Each message has its own random 16-byte IV. AuthTag enforces tamper detection on decrypt.
- Plaintext fallback only for legacy/system messages (read path tolerates it; write path always encrypts).
- Key derivation: `scrypt(ENCRYPTION_KEY, ENCRYPTION_SALT, 32)`. **Never rotate** `ENCRYPTION_KEY` or `ENCRYPTION_SALT` without a re-encryption job; doing so will orphan every existing message.

### Tracking pseudonymisation (HMAC)

- [services/ingest/src/hash.ts](services/ingest/src/hash.ts) and [services/shared/src/track/hash.ts](services/shared/src/track/hash.ts).
- `uidHash = base64url(HMAC-SHA256(uid, TRACKING_HASH_SECRET))[:22]`.
- Tracking tables (`EventAggDaily`, `FeatureSnapshot`, `PairCompatCache`) store **only** `uidHash`. Raw user IDs never enter the analytics plane.
- **Never rotate** `TRACKING_HASH_SECRET` — it orphans every historical row.

## 3. Secrets (env vars)

| Var | Generator | Rotatable | Used by |
|---|---|---|---|
| `JWT_SECRET` | `openssl rand -hex 64` | Yes (rolling) | auth (sign), gateway (verify) |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` | Yes | auth |
| `INTERNAL_SERVICE_KEY` | `openssl rand -hex 32` | Yes (rolling) | all services |
| `ENCRYPTION_KEY` | 32 bytes | **No** (would orphan messages) | messaging |
| `ENCRYPTION_SALT` | 16 bytes | **No** | messaging |
| `TRACKING_HASH_SECRET` | 32+ bytes | **No** (would orphan analytics) | ingest, tracking-worker |
| `POSTGRES_PASSWORD` | strong | Yes | all |
| `REDIS_URL` | host+auth | Yes | gateway, ingest, tracking-worker |

Storage:
- Local: `.env` (gitignored). See [.env.example](.env.example).
- Compose: shell env with `${VAR:?required}` fail-fast.
- K8s: `Secret` resource templated from [k8s/templates/](k8s/templates/). External Secrets Operator (AWS Secrets Manager / Vault) or Bitnami Sealed Secrets recommended in real prod.

## 4. Rate limiting

[services/gateway/src/server.ts](services/gateway/src/server.ts), Redis-backed (`rate-limit-redis`), in-memory fallback.

| Limiter | Limit | Key |
|---|---|---|
| Global API | 5000 / 15 min | user or IP |
| Auth (login/register) | 30 / 15 min | IP |
| Forgot-password | 5 / 1 h | IP |
| Refresh token | 60 / 15 min | user |
| Report | 30 / 24 h | user |
| Discover / Search | 20 / min | user |
| Feed | 60 / min | user |
| SSE streams | 10 / 1 h | user |

Ingest has its own per-device limiter: 60 / min (silent drop).

## 5. Input handling

- **Helmet** strict CSP (`directives.defaultSrc: ["'self'"]`, `base-uri: ['none']`). Also enforces HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff. Ingest disables CSP (no HTML response surface) and sets CORP `cross-origin`.
- **CORS** allowlist via `ALLOWED_ORIGINS` + `FRONTEND_URL`. Dev-only `CORS_BYPASS=true` to allow any origin.
- **Sanitisation** ([services/shared/src/sanitize.ts](services/shared/src/sanitize.ts)) — strips HTML tags, `javascript:`/`data:`/`vbscript:`/event-handlers, null bytes. Recursive object sanitisation (max depth 5). Used by notifications, messaging, content on every user-supplied string.
- **Zod schemas** ([services/shared/src/schemas.ts](services/shared/src/schemas.ts), [services/ingest/src/validate.ts](services/ingest/src/validate.ts)) validate every body.
- **Body size limits**: 64 KB on `/v1/track`, 1 MB on messaging/notifications, 10 MB on users/social/content (for photos & media metadata).
- **Idempotency-Key** ([services/shared/src/idempotency.ts](services/shared/src/idempotency.ts)) — Redis `SET NX EX 86400` on message send and likes. 8–128 chars alnum. Fails open on Redis outage.

## 6. AuthZ patterns

- **Onboarding gate** at gateway: 60 s cache of `GET /api/v1/profiles/me/completion`. Below threshold (60 casual / 75 DTM) → `403 ONBOARDING_INCOMPLETE` → client redirects to `/onboarding`.
- **Membership checks** in-handler:
  - Chat message ops verify the user is `user1Id` or `user2Id` of the chat.
  - Match ops verify ownership.
  - Bookmark ops verify ownership.
- **Block list** enforced in discovery and messaging: users blocked by either side never appear in lists.
- **Visibility rules** ([services/shared/src/visibility.ts](services/shared/src/visibility.ts)): `CASUAL_PROFILE_VISIBILITY` vs `DTM_PROFILE_VISIBILITY` redact bio-data fields for non-matched viewers.

## 7. Consent & privacy

- Client `ConsentBanner` modal; persisted state. SDK refuses to queue until decided.
- `Do-Not-Track: 1` honoured at ingest.
- `TRACKING_KILL=1` env stops both ingest writes and worker consumers (global emergency stop).
- GDPR export: `GET /api/v1/settings/export`.
- GDPR right-to-erasure: `DELETE /api/v1/settings/delete` (hard cascade in OLTP) + `npm run forget -- --uid <uid>` in tracking-worker (purges aggregates by `uidHash`).

## 8. OWASP Top 10 mapping (2021)

| Risk | Mitigation |
|---|---|
| A01 Broken access control | Gateway onboarding gate; per-handler membership checks; internal-key segregation |
| A02 Cryptographic failures | AES-256-GCM with per-message IV; HMAC for tracking; bcrypt cost 12 for passwords |
| A03 Injection | Prisma parameterised queries; Zod validation; sanitise.ts strips XSS payloads |
| A04 Insecure design | One ingress (gateway); algorithms can't reach raw DB; tracking decoupled via Redis Stream |
| A05 Security misconfiguration | Helmet strict CSP; `${VAR:?required}` fail-fast secrets; default-deny NetworkPolicy |
| A06 Vulnerable components | `npm audit` in CI; Prisma 5.22; Node 20-alpine base |
| A07 Identification & auth failures | JWT format pre-check; bcrypt; per-device rate limit on auth (30/15min); session revocation on password change |
| A08 Software & data integrity | AuthTag on message decrypt; Idempotency-Key on writes; Prisma migration history checksummed |
| A09 Logging & monitoring | Structured JSON logs (PII-redacted); Prometheus metrics; AuditLog table |
| A10 SSRF | No user-controlled outbound URLs; `images.remotePatterns` allowlist in Next.js |

## 9. Network posture (K8s)

- `default-deny` NetworkPolicy at namespace level.
- Pod-to-pod allowed only within the namespace.
- Only **gateway** and **web** have ingress from the world.
- Egress to DNS (53 TCP/UDP) allowed.
- Postgres + Redis are headless StatefulSets — not exposed.

## 10. Headers (frontend)

[services/web/next.config.js](services/web/next.config.js) — applied to every response:

- `Strict-Transport-Security: max-age=31536000`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## 11. What changed & why it's good

- **Before:** JWT verification was duplicated in every service; message ciphertext shared one IV across a chat; tracking stored raw user IDs in analytics tables.
- **After:** JWT is verified once at the gateway; messages use per-message random IVs with authTags; tracking uses HMAC `uidHash` only.
- **Why it matters:** A leaked downstream pod doesn't compromise tokens. A leaked analytics dump can't be re-identified without `TRACKING_HASH_SECRET`. A tampered ciphertext fails the authTag check loudly instead of decrypting to garbage.
