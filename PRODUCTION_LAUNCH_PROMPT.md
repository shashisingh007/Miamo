# Miamo — Pre-AWS-EC2 Production Launch Brief

**Type:** principal-engineer-panel mandate for a fresh agent session.
**Authored:** 2026-06-28.
**Codebase snapshot:** v1 release on main (commit `76bbe77`), single-commit history, all 8 services healthy locally.
**Goal:** Take Miamo from "works on the founder's Mac" to "production-grade on AWS EC2."

This brief was authored as if a panel of seven senior engineers reviewed the codebase together: **Lead Architect, Lead Full-Stack, Senior QA, Senior DevOps, Senior Platform, Senior Backend, Senior Data Analyst.** Each has signed off on the audit checklist below. The agent executing this prompt should embody all seven perspectives.

---

## 0. The mandate, in one paragraph

Take the v1 working tree, run a full production-readiness audit through seven senior-engineer lenses, fix the concrete bugs the founder has reported (match-button doesn't show 5 Move v2 suggestions on Discover and DTM; filters not wired to real geo APIs; auth providers not fully tested locally), wire real free-tier APIs for geo / OTP / OAuth / payments where they're stubbed, harden the stack for AWS EC2 (security, monitoring, cost, observability, graceful shutdown), build a complete end-to-end test matrix, deploy-rehearse on a single EC2 t3.large or equivalent locally with the prod compose target, and deliver a runbook + cost estimate the founder can hand to AWS billing. **Don't break v1's single-commit history or the `bash scripts/start.sh` CLI surface.** When you're done, the founder should be able to `bash scripts/start.sh docker prod` locally, confirm everything works, then ship the same image to EC2 with one command.

---

## 1. The panel — and what each senior would scrutinize

When you read the codebase, switch between these seven hats. If a finding doesn't tag at least one role, it's not load-bearing.

| Role | What they look at first | Symptoms they catch |
|---|---|---|
| **Lead Architect** | Service boundaries, request flow, failure modes. Does the gateway → 11-service split still make sense at AWS scale? Is the tracking pipeline back-pressured? Where do retries idempotently die? | Single-points-of-failure, fan-out without fan-in, missing circuit breakers, services that depend on a sibling that isn't multi-AZ. |
| **Lead Full-Stack** | UX wires + API contract end-to-end. Does the front-end actually call what the back-end exposes? When the user clicks "Match," what does the user feel? Where do contracts drift? | Bugs like "match button doesn't show 5 Move suggestions" — the API exists but the UI never calls it on the right event. |
| **Senior QA** | What can break that the tests don't cover? Load. Concurrency. Network drops. Stale caches. Time travel. RTBF mid-write. Premium-flip mid-request. | Untested edges. Race conditions. The v3.5 idempotency-replay path nobody actually replays in tests. |
| **Senior DevOps** | CI/CD, secrets, image builds, deployment topology, rollback. Can a Sev1 be fixed in ≤10 min on a Sunday at 3am? | Docker images bloated with dev deps. Secrets in env files. No image scanning. No rollback path. |
| **Senior Platform** | AWS choices. VPC. Security groups. Right-sizing. Cost. Multi-AZ. RDS vs self-hosted. SSL. Backup. DR. | Postgres in an EC2 with no automated backup. Public-internet Redis. EBS gp2 instead of gp3. No CloudWatch alarms. |
| **Senior Backend** | Each service's surface: auth correctness, validation coverage, error envelopes, observability hooks, graceful shutdown. | Missing `process.on('SIGTERM', …)` handlers. Routes that don't validate body. Endpoints that 500 instead of 4xx on bad input. Token leaks in logs. |
| **Senior Data Analyst** | KPI emission. Data retention. Compliance runtime. Are the v8 events actually firing in production paths? Is the Gini KPI dashboard wired? | Tracking events emitted but never read. Worker writes that never get aggregated. Retention TTLs that don't match the privacy policy. |

The panel meets twice during this work: once at the start of each phase (10-min review), once at the end (sign-off).

---

## 2. North star — measurable

| Goal | Target |
|---|---|
| **`bash scripts/start.sh docker prod` boots all 13 containers cleanly** | 8/8 services + ingest + tracking-worker + postgres + redis + migrate all green inside 90s; web on :3100, gateway on :3200 |
| **AWS EC2 deploy rehearsal succeeds in a sandbox** | Single `t3.large` (or equivalent), full stack runs at ≥100 RPS sustained for 5 minutes with p95 < 250ms on `/api/v1/discover` |
| **Match → 5 Move v2 suggestions works on Discover AND DTM** | Tap the match icon → MoveV2Picker opens with 5 suggestions, ≥3 distinct hook categories, <2% fallback rate. Same on DTM matched flow. |
| **All filters live with real geo backend** | Discover filter respects `min/max age`, `gender`, `distance radius` (with real km calculation from user's current geolocation), `verified-only`, `online-now`. Test in browser; assert candidate pool shrinks as filters tighten. |
| **All 4 auth methods tested locally** | Email+password ✓ — OTP (email + phone) ✓ — Google OAuth ✓ — Apple Sign-In ✓ — All four issue a JWT, all four create/update a User row, all four respect the v3.6 v6.9 schema columns (emailVerified, phoneVerified, googleId, appleId, authProvider). |
| **Payments end-to-end on test mode** | Razorpay or Stripe test-mode flow: user clicks "Buy 10 Spotlight minutes" → checkout → success callback → SpotlightLedger row written with `reason='purchase_10min'`, `delta=+10`. Failure callback handled. Webhooks verified. |
| **Production-grade security audit clean** | OWASP Top 10 pass. `npm audit --omit=dev` 0 H/C. Helmet CSP strict. JWT secret rotated to 64-char hex. CORS whitelisted to production origins. Rate limits enforced. SSL/TLS via ACM. |
| **Observability live** | Per-service Prometheus `/metrics` scraped by CloudWatch Agent. Sentry catching server-side errors. Structured JSON logs shipped to CloudWatch Logs. 10 baseline alarms (gateway 5xx rate, Postgres connection pool, Redis memory, web /metrics dropoff, tracking-worker lag, etc.) |
| **Cost target** | Under **$120/month** at "first 100 daily users" (single EC2 + RDS Postgres micro + ElastiCache micro + ALB + 100 GB EBS + 50 GB S3). Document the scaling cost curve up to 10k DAU. |
| **End-to-end test matrix passes** | All 6 QA phase scripts green. New phase-15 (production-paths) script green. k6 or Artillery load test 5-min @ 100 RPS green. Manual smoke test of every (main) web route. |

If you can't measure it, you can't claim it. Every checkbox needs a number or a screenshot in the final report.

---

## 3. Hard constraints (do-not-violate)

1. **v1 invariants preserved.** Single-commit history on `main`. Single `v1` tag. `bash scripts/start.sh <mode> <env>` CLI shape unchanged. No new top-level directories at the repo root. 15-doc structure in `docs/` preserved.
2. **Tests stay green at every commit.** Current: 11/11 typecheck + 403 fast tests + 1535 full tests. After your work: more tests, still all green.
3. **No new dependencies unless they replace ≥3 existing ones or close a real security gap.** Bias toward existing stack.
4. **DTM, caste, privacy invariants unchanged.** DTM coverage gating sacred. Caste field present, never used in ranking. HMAC user IDs in tracking.
5. **Feature flags stay default OFF.** The 13 v8 flags must NOT auto-enable in production. Production ramp happens by env-toggle, observed.
6. **No LLM calls in rankers or composers.** Move v2 is pure-module. Adding an LLM is a separate decision for v3.7+.
7. **One commit, one branch, one tag stays.** When you ship this work, amend the v1 commit OR cut a v2 tag — both are acceptable, your call after Phase A.
8. **All secrets via AWS Secrets Manager in prod.** Never commit a real secret. `.env.example` stays a template only.
9. **Image base images pinned by digest, not tag.** Reproducible builds. `node:20-alpine@sha256:…` not `node:20-alpine`.
10. **Cost transparency.** Every AWS service you propose comes with the on-demand monthly cost at the target traffic level. No surprises.

---

## 4. The four phases — strict ordering

### Phase A — Multi-lens audit (no code changes)

**Output: `docs/architecture/launch-audit.md`** (~3000-5000 words).

Walk the codebase through all seven lenses. For each lens, produce a section with:

- **What I found that's already great.** (Things the team should keep.)
- **Critical findings.** (Must fix before launch.)
- **Important findings.** (Should fix; can ship without.)
- **Nice-to-haves.**
- **Bugs that need investigation.**

Mandatory checks per lens:

**Architect:**
- Map the actual request flow for a `POST /api/v1/discover/like` end-to-end including the tracking event side-effect. Find every retry. Find every place a Redis failure would cascade.
- Identify single-points-of-failure. Document mitigation (replica, fallback, fail-open).
- Audit cold-start: a brand-new EC2 boot. What's the order? What blocks the gateway from accepting traffic?

**Full-stack:**
- Trace the **match button** in `services/web/src/app/(main)/discover/page.tsx` → API call → back-end handler → response handling. Document where the 5-Move-v2-suggestions UI should appear and why it doesn't. Look at `services/web/src/app/(main)/messages/components/MoveV2Picker.tsx` — is it mounted in Discover post-match? It's currently in `ChatView.tsx`; per the founder, the user wants it shown **immediately after a match is confirmed**, before the chat opens.
- Same for the DTM match flow. Trace from DTM completion → mutual interest → suggested Move surface.
- Inventory every (main) route in `services/web/src/app/(main)/`. For each, list: API endpoints called, surfaces it owns, known-broken-or-stub areas.

**QA:**
- For each of the 6 QA phase scripts in `scripts/qa-runs/`, run it once and capture the report.json. Note any signatures.
- Build a load-test plan: k6 or Artillery script targeting `/api/v1/discover` and `/api/v1/messages/chats/:id/messages` at 100/500/1000 RPS.
- List 10 edge cases the current tests don't cover (concurrent like-back race, AES key rotation mid-message, RTBF deletion mid-ranker-read, etc.).

**DevOps:**
- Inspect all 11 `docker/*.Dockerfile`. Are they multi-stage? Slim? Non-root user? Pinned digests? Image size?
- `.github/workflows/ci.yml` — does it run `npm audit`? Does it build Docker images? Does it scan them?
- Secrets — every place we read `process.env.X` — list them and map each to either "AWS Secrets Manager" or "env-via-ECS-task-definition" or "build-time constant."
- Backups — Postgres + Redis + S3 user uploads. What's the recovery point objective?

**Platform:**
- Propose the AWS architecture. Be specific: single EC2 vs ECS Fargate vs EKS? RDS Postgres tier? ElastiCache cluster mode? ALB or Cloudflare? CloudFront for the web? S3 buckets for what? VPC + subnets + security groups? NAT gateway or VPC endpoints?
- Cost estimate at 100 / 1k / 10k DAU. AWS Pricing Calculator export.
- Multi-AZ vs single-AZ: trade-off table.
- TLS: ACM cert + ALB listener? Free.
- Disaster recovery: RPO and RTO targets, snapshot frequency.

**Backend:**
- For each of the 8 server.ts files, audit:
  - Is there a `process.on('SIGTERM')` graceful-shutdown handler that drains in-flight requests and closes Prisma + Redis cleanly?
  - Does every POST/PUT/DELETE use `validate({body:zodSchema})`?
  - Does every handler have a try/catch path that goes through `errorHandler`?
  - Are timeouts set on every outbound HTTP call (proxy hops, third-party APIs)?
  - Are Prisma queries using `.catch()` for known-recoverable errors (P2025 not-found, P2002 unique-violation)?
- For each background worker, audit: idempotency, replay safety, batch caps, error budget.

**Data analyst:**
- For each of the 16 v8 tracking events, trace: emit site → ingest validator → rollup worker → aggregate table → algorithm consumer. Find dead events.
- KPI dashboards needed for launch: sym-match→reply rate, D7 retention, time-to-first-quality-match, Gini per gender, Move-suggestion accept rate, anti-ghost burn rate. Where will these be displayed? (Hint: Grafana on the EC2 + Prometheus, or CloudWatch dashboards, or Metabase.)
- Data retention: audit `cold-store.ts` (90-day retention), `forget.ts` (RTBF). Are they CloudWatch-alarmed?

**Stop and pause for founder review** after the audit doc lands. Do not start fixing until approval.

---

### Phase B — Concrete bug fixes (driven by audit findings)

These are the founder-reported bugs. Each gets its own commit. After each commit: `npm test`, `npm run typecheck`, `bash scripts/start.sh local status`. Stack must stay healthy.

#### B.1 — Match → 5 Move v2 suggestions surface

**Symptom:** User taps the "match" button (heart/like) on a Discover card. They get a "It's a match!" toast. But the 5 Move v2 suggestions (which the v3.6 work shipped) never appear. The user has to navigate to chat and tap ✨Suggest manually.

**Investigation steps:**
1. Find the match-success handler in `services/web/src/app/(main)/discover/page.tsx`. Look for `setMatched(true)` / `setMatchToast(…)` / wherever `{matched:true}` from the like endpoint is handled.
2. Find `MoveV2Picker` in `services/web/src/app/(main)/messages/components/MoveV2Picker.tsx`. Audit its props + entry mechanism. Currently it's mounted in `ChatView.tsx` — gated behind clicking ✨ in a chat.
3. The fix: surface MoveV2Picker as a modal **on match success** in the Discover flow. Backend API: `POST /api/v1/creativity/items/:id/move-suggestions-v2` (this is item-based) — but the match flow doesn't have an itemId. **You need a new endpoint** `POST /api/v1/discover/move-suggestions-v2/:targetId` that wraps the same composer, takes a target userId, and returns 5 suggestions. OR repurpose the existing `GET /api/v1/discover/move-suggestions/:targetId` to use the v2 composer when `FEATURE_MOVE_V2_ENABLED=1`. Pick one path — recommend the second (less surface area).
4. Add the new modal mount to `discover/page.tsx`'s `handleLike()` success path:
   - On match, fetch v2 suggestions from `/discover/move-suggestions/:targetId`
   - Open `MoveV2Picker` modal with the suggestions pre-loaded
   - Picking a suggestion sends it as the first message in the freshly-created chat (use `POST /api/v1/messages/chats/with/:userId` to get the chatId, then `POST /api/v1/messages/chats/:chatId/messages`)
   - User taps "Maybe later" → modal closes, normal post-match flow resumes
5. Same fix path for DTM. `services/web/src/app/(main)/dtm/page.tsx` — find the DTM-match success path and replicate.
6. Acceptance: log in as miamo10, like miamo20, see 5 suggestions; pick one, see it as the first chat message; same on DTM.

**Tests:**
- New `tests/v8-routes-discover-move-suggestions.test.ts` covering the endpoint.
- Manual smoke test of the UI flow before commit.

#### B.2 — Filters: wire real geo + finalize all filter fields

**Symptom:** Filters in Discover and DTM exist as UI but don't all flow through to the backend ranker. Specifically, location filter is a placeholder.

**Required real-API integrations:**
- **Geocoding (city/address → lat/lng):** [Nominatim](https://nominatim.openstreetmap.org/) (free, OSM-based, attribution required). Rate limit: 1 req/sec per IP — cache aggressively. Document the Nominatim usage policy adherence.
- **Reverse geocoding (lat/lng → city/country):** Same Nominatim. Or `ip-api.com` for IP→country (free, 45 req/min/IP).
- **User's current location:** Browser `navigator.geolocation.getCurrentPosition()` with permission prompt. Fallback to IP-based geolocation via `ipapi.co` (free 1k req/day) when permission denied.
- **Distance calculation:** Haversine formula (no API needed; pure math). Add `services/shared/src/algo/v8/geoDistance.ts`: `haversineKm(lat1, lng1, lat2, lng2): number`.

**Implementation:**
1. Verify `Profile.cityLat` and `Profile.cityLng` exist (they were added in v3.6 — confirm in the schema and that the migration applied).
2. In `services/users/src/server.ts`, when a user updates their city via `PUT /api/v1/profiles/me`, call Nominatim server-side, populate cityLat/cityLng. Cache the Nominatim response in Redis keyed by lowercased city name (TTL 30 days). Rate-limit the route to respect Nominatim's 1 req/sec policy.
3. Frontend: in onboarding + settings, add a "Use my current location" button that calls `navigator.geolocation`, reverses to a city name via Nominatim (or cached lookup), and writes back via the existing profile-update endpoint.
4. In `services/social/src/server.ts` Discover route, the distance filter: read `req.user.profile.cityLat/cityLng`, then for each candidate compute `haversineKm`, filter by `<= filter.distance`. Cache the haversine result in PairCompatCache.
5. UI: a slider "Distance: 5 km / 25 km / 50 km / 100 km / Anywhere." Default 50 km. Persist in `DiscoverFilter.distance`.
6. Other filters to finalize:
   - Age range: confirm `minAge`/`maxAge` honored
   - Gender / sexuality / lookingFor: confirm honored
   - Smoking / drinking / exercise / education / religion / zodiac / pets / children
   - `activeToday`: filter `Profile.lastActive >= now - 24h`
   - `newHere`: filter `User.createdAt >= now - 7d`
   - `verified`: filter `Profile.verified = true`
   - `hasPhotos`: filter `EXISTS (SELECT 1 FROM ProfilePhoto WHERE userId = User.id)`
7. Each filter gets a property test: "increasing strictness shrinks the pool monotonically."

**Tests:**
- `tests/v8-discover-filters.test.ts` — 15+ tests across the 12+ filter dimensions.
- Manual: log in as miamo10, set all filters strict, see pool < 5; relax, see pool grow.

#### B.3 — Auth: all 4 methods working

**Current state (from `User` schema v6.9):**
- `passwordHash` — bcryptjs, working
- `emailVerified Boolean=false`, `phone? @unique`, `phoneVerified Boolean=false`
- `twoFactorEnabled Boolean=true`
- `googleId? @unique`, `appleId? @unique`, `authProvider="password"`
- `Otp` model exists with `purpose: verify_email | verify_phone | login_2fa | password_reset`

**What needs to be wired and tested:**

1. **Email + password (existing):** smoke-test. Verify bcryptjs cost 12. Verify rate limit on `/api/v1/auth/login` (5 attempts / 15 min / IP).

2. **OTP (email + SMS):**
   - Email OTP via [Resend](https://resend.com) free tier (3k emails/month) or [SendGrid](https://sendgrid.com) free tier (100 emails/day forever) or AWS SES (cheap, ~$0.10 per 1k emails). **Recommend Resend** — simplest API. Add `RESEND_API_KEY` to `.env.example`.
   - SMS OTP via [Twilio](https://twilio.com) (paid, ~$0.0075 per SMS) — recommend test mode for dev. For India, also evaluate [MSG91](https://msg91.com) (cheaper for INR pricing). Add both options.
   - Backend: `POST /api/v1/auth/otp/send` (body: `{identifier, channel: 'email'|'phone', purpose}`). `POST /api/v1/auth/otp/verify` (body: `{identifier, code, purpose}`). On success: create-or-update User, issue JWT, set `emailVerified` or `phoneVerified=true`.
   - 6-digit code, `expiresAt = now + 10min`, `maxAttempts=5`, bcrypt the code in `Otp.codeHash`.

3. **Google OAuth:**
   - Use [Google Identity Services](https://developers.google.com/identity) (free).
   - Frontend: `@react-oauth/google` library. Render `<GoogleLogin onSuccess={…}>` button.
   - Backend: `POST /api/v1/auth/google` accepts `{credential}` (JWT from Google), verifies via `google-auth-library` (already in `services/auth/package.json`?), extracts email + sub. Find-or-create User with `googleId=sub, authProvider='google'`.
   - `GOOGLE_CLIENT_ID` env var (public, used in frontend too). Document setup steps in `docs/DEVOPS.md`.

4. **Apple Sign-In:**
   - Use [Sign in with Apple JS](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js).
   - Backend: `POST /api/v1/auth/apple` accepts the identity token from Apple, verifies via JWKS, extracts `sub`. Find-or-create User with `appleId=sub, authProvider='apple'`.
   - `APPLE_CLIENT_ID` + `APPLE_TEAM_ID` env vars. Document Apple Developer Portal setup.

5. **All 4 routes update `User.authProvider` and increment a tracked-event `auth.method_used`** so we can see the funnel.

**Tests:**
- `tests/auth-all-methods.test.ts` covering all 4 paths with mocked third-party verifiers.
- Manual: sign up with each method, sign in again, verify the User row reflects the right `authProvider`.

#### B.4 — Payments

Audit `services/shared/src/spotlight-ledger.ts` for the `purchase_<n>min` reason. Confirm the LedgerReason union includes it.

**Recommendation: Razorpay** for India-first (UPI + cards + wallets), Stripe as a fallback / global option.

1. Razorpay test-mode: create a `services/content/src/routes/payments.ts` with `POST /api/v1/payments/spotlight/order` (creates a Razorpay order, returns order_id), `POST /api/v1/payments/spotlight/verify` (handles the checkout callback, verifies signature, writes `SpotlightLedger` row).
2. Frontend: in `services/web/src/app/(main)/creativity/components/SpotlightUI.tsx`, the existing "Buy minutes" button → opens Razorpay checkout via [razorpay-checkout JS](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/).
3. Webhook endpoint `POST /api/v1/payments/webhook` for async payment-status updates. Verify signature.
4. `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` + `RAZORPAY_WEBHOOK_SECRET` env vars.

**Tests:**
- `tests/payments-spotlight.test.ts` covering order creation, signature verification, ledger write.
- Manual: complete a test-mode payment, see SpotlightLedger row, see balance increase in the UI.

---

### Phase C — Production hardening

Each section is its own commit.

#### C.1 — Docker images prod-ready

For each `docker/<svc>.Dockerfile`:
1. Multi-stage: builder (with dev deps + tsc/prisma generate) → runtime (only prod deps + built JS).
2. Pin base image by digest: `FROM node:20-alpine@sha256:<digest>`.
3. Non-root user: `USER node` before CMD.
4. HEALTHCHECK directive on every service container.
5. `npm ci --omit=dev` not `npm install`.
6. `.dockerignore` excludes `node_modules`, `.next`, `dist`, `tests/`, `*.test.ts`, `.env`, `.git`.
7. Image size target: < 250 MB per service after build.

Add `docker scan` (or Trivy) step to CI.

#### C.2 — Secrets management

1. Remove every fallback to a hardcoded dev secret in `services/shared/src/env.ts` and the per-service `service.ts`. In `NODE_ENV=production`, fail fast if `JWT_SECRET`, `INTERNAL_SERVICE_KEY`, `ENCRYPTION_KEY`, `POSTGRES_PASSWORD`, `TRACKING_HASH_SECRET` are unset.
2. Add a `services/shared/src/secrets.ts` that knows how to fetch from AWS Secrets Manager via the AWS SDK at boot. Cache for the process lifetime. Auto-rotates on next deploy.
3. Document the rotation runbook in `docs/RUNBOOK.md`.

#### C.3 — Monitoring + observability

1. **Prometheus metrics** — already exposed via `services/shared/src/metrics.ts`. Configure the CloudWatch Agent on EC2 to scrape each service's `/metrics` and ship to CloudWatch. Or run Prometheus + Grafana on the EC2 itself (simpler, free-tier-friendly).
2. **Structured logs** — every service already uses `pino`. Ensure JSON output in production (no pretty-print). Ship to CloudWatch Logs via the agent.
3. **Error tracking** — [Sentry](https://sentry.io) free tier (5k events/month). Add `@sentry/node` to each service + `@sentry/nextjs` to web. Sentry DSN as env var.
4. **Health endpoints** — every service has `/health` and `/healthz` (already done). ALB target group reads `/healthz`.
5. **10 baseline CloudWatch alarms** — define each in a Terraform / CDK file or a shell script: gateway 5xx rate >1%, gateway p95 latency >500ms, tracking-worker queue lag >5min, Postgres CPU >80%, Postgres storage >80%, Redis memory >75%, EC2 CPU >75%, EC2 disk >80%, /metrics scrape failure, Sentry new error.

#### C.4 — Graceful shutdown

For every service in `services/*/src/server.ts`, add:

```typescript
const server = app.listen(port, ...);
const shutdown = async (signal: string) => {
  logger.info({signal}, 'shutting down');
  server.close(async () => {
    await prisma.$disconnect();
    if (redis) await redis.quit();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref(); // hard kill after 10s
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

Test: `kill -TERM <pid>` should drain in-flight requests, close DB connection, exit 0.

#### C.5 — Rate limiting + abuse protection

Currently gateway has 4 rate-limit buckets (60/IP/min general, 30/user/min writes, 20/user/min expensive, 60/user/min feed). Audit each route's assignment.

Add:
- Account-creation rate limit (1 / hour / IP)
- Login attempt rate limit (5 / 15 min / IP per identifier)
- Password-reset rate limit (3 / hour / email)
- OTP-send rate limit (3 / hour / identifier)

#### C.6 — Database production-ready

1. **RDS Postgres** (db.t4g.micro free-tier-eligible, then t4g.small at scale). Automated backups daily, 7-day retention.
2. Connection pooling: PgBouncer in front (optional for v1.1, can defer).
3. Index audit: every `WHERE` clause in the hot queries should hit an index. Use `EXPLAIN ANALYZE` on the top 5 expensive queries (`/discover`, `/matches`, `/messages`).
4. Read replicas: defer to post-launch unless load testing shows the need.

#### C.7 — Redis production-ready

1. **ElastiCache Redis** (cache.t4g.micro at start). Single-AZ for cost. Persistence: appendonly + RDB snapshot every 1h.
2. Memory cap: 256 MB. Eviction: `allkeys-lru` (already set in compose).
3. Backup: enable automatic backups, 1-day retention.

---

### Phase D — End-to-end testing

#### D.1 — Per-feature manual smoke test

For each of these flows, an engineer logs in as a seeded user, exercises the flow, captures a screenshot:

1. Sign up (all 4 methods)
2. Onboarding 30→95 score
3. Discover → swipe right → match → 5 Move v2 suggestions → send → reply
4. Filters: tighten 5 filters, watch pool shrink, see filtered results
5. DTM → answer 5 questions → see compatibility score → match
6. Family Brief → generate → share link → view as recipient
7. Voice Fingerprint → reveal modal → share-to-Instagram canvas
8. Why-am-I-seeing-this → tap i → see 3-star explainer
9. Weekly Top-10 → tab → see 10 names
10. Anti-ghost → start chat → send message → see deposit ledger row
11. Spotlight purchase → checkout → balance updates
12. Settings → flip all 4 consent toggles → save → reload → confirm persisted

#### D.2 — Phase-15 production-paths QA script

New: `scripts/qa-runs/phase-15-production.py`.

Exercises:
- The 6 surfaces from §D.1 (1–6) end-to-end against the running stack
- 4-persona concurrent load: each user does sign-in + discover + like + match-or-pass + send-message + view-DTM in parallel
- Assert no 5xx anywhere, idempotency replays work, rate limiters trigger appropriately

#### D.3 — Load test

`tests/load/discover.js` (k6 or Artillery script):
- 100 RPS for 5 min on `/api/v1/discover`
- p50 < 100ms, p95 < 250ms, p99 < 500ms, 0 errors

`tests/load/messaging.js`:
- 50 RPS for 5 min on `/api/v1/messages/chats/:id/messages`
- p95 < 200ms, 0 errors

Run from the dev machine against `localhost`. Document the results in `docs/architecture/launch-audit.md`.

#### D.4 — Chaos test

Kill containers mid-request:
- `docker kill miamo-postgres-local` while a discover call is in flight → service should return 503, not 500, and recover within 30s after restart.
- `docker kill miamo-redis` while idempotency is in use → service should fail-open, no 500s.

Document the results.

#### D.5 — Penetration testing checklist

Run through the OWASP Top 10 manually for each public endpoint:
- A1 broken access control → verify auth on every protected route
- A2 cryptographic failures → AES-256-GCM verified for chat
- A3 injection → no raw SQL, Prisma everywhere
- A4 insecure design → rate limits + idempotency
- A5 security misconfiguration → CSP strict, no debug endpoints in prod
- A6 vulnerable components → `npm audit` 0 H/C
- A7 identification + auth failures → bcryptjs cost 12, JWT 15min, refresh rotation
- A8 software + data integrity → image signing? deferred
- A9 logging + monitoring → Sentry + CloudWatch in place
- A10 SSRF → no outbound URL fetching from user input

---

### Phase E — AWS EC2 deployment

#### E.1 — Architecture document

`docs/architecture/aws-ec2.md`. Sections:
1. Topology diagram (mermaid) showing VPC, subnets, EC2, RDS, ElastiCache, ALB, S3, CloudFront, ACM, Secrets Manager, CloudWatch
2. Security groups (each one: name, purpose, inbound + outbound rules)
3. Cost breakdown at 100/1k/10k DAU
4. DNS + SSL plan (Route 53 + ACM)
5. CI/CD plan: GitHub Actions → ECR push → SSH to EC2 + `docker compose pull && docker compose up -d` OR ECS Fargate (recommend the simpler EC2-compose path for v1)

#### E.2 — Terraform or CloudFormation (optional but recommended)

`infra/terraform/main.tf` provisions:
- VPC + 2 subnets (1 public for ALB, 1 private for EC2/RDS/ElastiCache)
- EC2 t3.large with the Miamo AMI
- RDS Postgres db.t4g.micro
- ElastiCache Redis cache.t4g.micro
- ALB + ACM cert
- Security groups
- S3 bucket for user uploads
- Secrets Manager secrets
- CloudWatch log groups + alarms

If skipped, document manual setup steps in `docs/architecture/aws-ec2.md`.

#### E.3 — Deploy rehearsal

Use the founder's AWS account on a sandbox/dev VPC. Deploy. Run `phase-15-production.py` against the public ALB DNS. Capture screenshots + curl outputs.

---

### Phase F — Implementation order

Strict order. Don't skip ahead.

```
Week 0:
  A.1 — Audit doc (all 7 lenses)
  Founder review checkpoint

Week 1:
  B.1 — Match → Move v2 suggestions bug
  B.2 — Filters (geo + finalize all)
  C.4 — Graceful shutdown handlers
  C.5 — Rate-limit additions
  Founder review checkpoint

Week 2:
  B.3 — Auth (all 4 methods)
  B.4 — Payments
  C.1 — Docker images prod-ready
  C.2 — Secrets via AWS Secrets Manager
  Founder review checkpoint

Week 3:
  C.3 — Monitoring + observability
  C.6 + C.7 — RDS + ElastiCache setup
  D.1 — Per-feature smoke test
  D.2 — Phase-15 QA script
  Founder review checkpoint

Week 4:
  D.3 — Load test
  D.4 — Chaos test
  D.5 — Pen test checklist
  E.1 — Architecture doc
  E.2 — Terraform (optional)
  E.3 — Deploy rehearsal
  Final founder sign-off

Week 5: GO LIVE on production EC2
```

---

### Phase G — Final delivery

When done, the repo contains:

- Audit doc at `docs/architecture/launch-audit.md`
- AWS arch doc at `docs/architecture/aws-ec2.md`
- (Optional) `infra/terraform/` provisioning
- All Phase B bug fixes shipped and tested
- All Phase C hardening shipped and tested
- New Phase-15 QA script + load tests + chaos test reports
- Updated `docs/RUNBOOK.md` with prod incident playbooks
- Updated `docs/DEVOPS.md` with AWS-specific operations
- Updated `docs/SECURITY.md` with prod posture
- Updated `CHANGELOG.md` with the v1.1 (or v2) release notes
- A single new tag `v1.1` (or `v2` — your call after audit) on top of v1's `76bbe77`

Quality gates at the end:
- `npm run typecheck` → 11/11 clean
- `npm test` → all tests passing (target ≥500 tests, up from 403)
- `npm run test:full` → all tests passing
- `bash scripts/start.sh docker prod` → 13 containers healthy in 90s
- `phase-15-production.py` → 0 errors, 0 signatures
- Load test → p95 < 250ms at 100 RPS
- Chaos test → no 500s during postgres/redis kill
- `npm audit --omit=dev` → 0 H/C across all 11 packages
- AWS deploy rehearsal → successful

---

## 5. Anti-patterns specific to this work

| Anti-pattern | Treatment |
|---|---|
| **"Ship it to prod and we'll fix the bugs there"** | Bugs found in audit must be closed before deploy. Match-button bug is P0. |
| **Ignoring the existing v8 module surface** | Move v2 composer exists. Don't rewrite. Wire it into the missing surface (post-match UI). |
| **Stubbing real APIs with mocks** | Use real free-tier APIs. Test them locally with real credentials in `.env`. Document the limit in DEVOPS.md. |
| **Skipping graceful shutdown** | EC2 deploys involve rolling restart. SIGTERM is the contract. Without it, in-flight requests 500 during every deploy. |
| **Putting secrets in env files committed to the repo** | `.env.example` is a template. Real secrets via AWS Secrets Manager. `.env` is gitignored. |
| **Single AZ "to save money"** | For v1.1 single-AZ is fine. Document the upgrade path. Don't pretend it's redundant. |
| **Skipping CloudWatch alarms** | 10 alarms minimum. If you can't define them, you don't know what should alert. |
| **Adding 47 new dependencies** | Bias to existing stack. Each new dep needs a justification. |
| **Mass-refactoring "while you're there"** | One concern per commit. Audit findings → fixes → tests. No drive-by refactors. |
| **Breaking the single-commit v1 history** | Either amend or cut v1.1 / v2. Don't introduce 100-commit history mid-release. |

---

## 6. Quality gates before declaring "done"

Run all of these in sequence. Every one must pass:

```bash
# 1. Tests
npm test
npm run test:full
npm run typecheck

# 2. Web build
cd services/web && npm run build && cd -

# 3. Security
npm audit --omit=dev   # 0 H/C
( cd services/shared && npm audit --omit=dev )
( cd services/web && npm audit --omit=dev )

# 4. Local stack (docker prod target)
bash scripts/start.sh docker stop
bash scripts/start.sh docker prod
sleep 90
bash scripts/start.sh docker status   # 13 containers healthy

# 5. E2E
python3 scripts/qa-runs/phase-15-production.py   # 0 errors
python3 scripts/qa-runs/phase-14-overhaul.py     # 12/12
python3 scripts/qa-runs/phase-13-creativity-reels.py
python3 scripts/qa-runs/phase-11-cold-start.py
python3 scripts/qa-runs/phase-10-learning-loop.py
python3 scripts/qa-runs/phase-3-4-discover-dtm.py
python3 scripts/qa-runs/phase-1-2-endpoint-sweep.py

# 6. Load test
k6 run tests/load/discover.js     # p95 < 250ms at 100 RPS

# 7. Repo state
git log --oneline                  # ≤ 2 commits (v1 + v1.1 amend, or v1 + v2 commit)
git tag -l                         # v1 and v1.1 (or v1 and v2)
git status --short                 # 0 dirty files

# 8. AWS rehearsal
# Document in docs/architecture/aws-ec2.md with screenshots
```

If any of these fail, you're not done.

---

## 7. Open questions for the founder (surface at the start of Phase A)

1. **Tag strategy:** when this work is done, do we amend v1 (history stays single-commit) or cut a new tag `v1.1` (history becomes 2 commits)? Recommend v1.1.
2. **Cost ceiling:** what's the launch month budget? $50 / $100 / $200 ? This drives single-AZ vs multi-AZ.
3. **Payment provider primary:** Razorpay (India-first) or Stripe (global)? Recommend Razorpay primary, Stripe secondary.
4. **OTP SMS provider:** Twilio (global) or MSG91 (India-cheap)? Recommend MSG91 primary, Twilio for non-India numbers.
5. **Apple Sign-In priority:** required for v1.1 or v1.2? Apple costs $99/year for the developer account. Recommend defer to v1.2 if budget tight.
6. **Domain name:** does miamo.app point at us yet? When does it cut over?
7. **First-launch user limit:** invite-only at first, or open? Affects rate-limit choices.

---

## 8. Final reminder

You are the senior-engineer panel. Don't transcribe — translate. Don't ship a single commit that breaks anything. Don't deploy without rehearsal. Don't claim a number you didn't measure. Don't add an LLM. Don't break v1.

When you're done:
- The founder can `bash scripts/start.sh docker prod` and see 13 containers green
- They can run `ssh ec2-user@<host> "bash deploy.sh"` and have the same stack live
- They can hit https://miamo.app and the app loads
- They can do the 12 manual smoke tests and every one passes
- They can show the cost dashboard and the bill matches the estimate

**Make Miamo production-ready. Then ship it.**

Read `docs/README.md` end-to-end first, then run Phase A.
