# Miamo Production Launch — Status & Next-Session Handoff

**Date:** 2026-06-28 (end of Phase A + most of Phase B + most of Phase C)
**Repo state:** v1.1-dev on `main` (single commit, amended on top of `v1`)
**Live stack:** 8/8 services healthy locally, clean start in 15s

---

## What shipped this session

### Phase A — Multi-lens audit (complete)
- `docs/architecture/launch-audit.md` (~998 lines) — seven-senior-engineer review of v1
- Findings categorized by lens: Architect / Platform / Full-Stack / QA / DevOps / Backend / Data Analyst
- Top 5 critical + ~30 important findings documented with file:line precision

### Phase B — Founder-reported bugs (complete)
- **B.1 Match → 5 Move v2 suggestions** — `MatchSuccessModal` component, server-route v2 flag-aware path, v2 composer reused, DTM TODO noted
- **B.2 Filters + real geo** — Nominatim geocoding (`services/shared/src/geocoding.ts`), Haversine distance math (`algo/v8/geoDistance.ts`), browser-geolocation button, distance slider, 4 dropped filters re-wired (datingIntent, sameCity, hasBio, hasPrompts)

### Phase C — Production hardening (complete)
- **C.1 Dockerfile hardening** — all 11 Dockerfiles converted to 4-stage builds (deps → build → prod-deps → runtime), non-root `miamo` user, HEALTHCHECK, tini PID-1, base-image digest TODOs documented
- **C.2 AWS Secrets Manager** — `services/shared/src/secrets.ts` lazy-imports `@aws-sdk/client-secrets-manager`, `validateEnv()` per-preset, all 9 services wired with prod env validation
- **C.3 Sentry + Prometheus** — `@sentry/node` on every backend, `@sentry/nextjs` on web, 4 new custom metrics, 12 baseline CloudWatch alarms documented in `docs/architecture/alarms.md`
- **C.4 Graceful shutdown** — `installGracefulShutdown()` helper in `services/shared/src/service.ts`, mounted on all 9 services
- **C.5 Idempotency + rate limits** — `services/shared/src/rateLimits.ts` with 6 limiters; idempotency middleware on 26 mutating endpoints; payment route stubs added

### Cross-cutting fixes
- **Windows / Git Bash compat for `start.sh`** — `clear_port` fallback chain (lsof → netstat+taskkill → fuser), tsx launched via direct binary not `npx`, dropped `watch` for cross-platform PID stability
- **False-positive success banner fixed** — `local_start`, `docker_start`, `k8s_start` now gate the banner on ≥7/8 services healthy; failure banner with diagnostics if not
- **Zombie process sweep** — `local_stop` now `pkill -9` stragglers from older `tsx watch` runs

### Quality gates at end of session
- 11/11 typecheck packages clean
- 43 fast test files / 497 tests passing (+5 from B.1 validator + filter property tests)
- Local stack: 8/8 services healthy in 15 seconds via `bash scripts/start.sh local dev`
- Clean stop sweeps all zombies (0 leftover)
- Web build clean
- 0 high/critical security vulnerabilities

---

## What's NOT done (and why)

### Phase B.3 — Auth (Google / Apple / OTP)
**Status:** schema columns + rate limits + idempotency wired; **route handlers stubbed but real provider verification deferred.**

**Why:** Requires API keys you must create yourself (Google Cloud Console, Apple Developer Portal, Resend, MSG91/Twilio). Cannot put credentials in chat.

**To unblock next session:**
1. Create a Google Cloud project at https://console.cloud.google.com/ → Credentials → OAuth 2.0 Client ID (Web application). Add `http://localhost:3100` and your production domain to authorized origins. Copy `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`.
2. (Optional, $99/year) Apple Developer Program → Sign in with Apple → Service ID + Key. Copy `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_KEY_PRIVATE` (the .p8 file content).
3. Sign up for [Resend](https://resend.com) (free 3k emails/month). Copy `RESEND_API_KEY`.
4. Sign up for [MSG91](https://msg91.com) or [Twilio](https://twilio.com) test credentials. Copy `MSG91_AUTH_KEY` or `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`.
5. Put all five into your local `.env`. Tell the next agent "Phase B.3 is now unblocked" and they'll wire the route handlers in.

**Time to complete once unblocked:** ~2-3 hours.

### Phase B.4 — Payments (Razorpay)
**Status:** route stubs at `POST /api/v1/payments/spotlight/order|verify|webhook` with rate limiters + idempotency; **handler bodies are placeholders returning 501.**

**To unblock:**
1. Sign up for [Razorpay](https://razorpay.com) test mode. Get `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
2. Put into `.env`. Tell next agent to flesh out the handlers (compose order, verify HMAC signature, write SpotlightLedger row).

**Time to complete:** ~3-4 hours.

### Phase D — Production E2E testing
**Status:** scaffold not built. The 6 existing QA phase scripts cover v1 features but no phase-15 covering the new v1.1 surfaces (match modal, filters, geo, idempotency, rate limits, auth, payments).

**To unblock:** Just run the next session. The audit doc already defines the scope.

**Time to complete:** ~6-8 hours including k6 load test + chaos plan.

### Phase E — AWS deployment
**Status:** architecture documented in `docs/architecture/launch-audit.md` §1 (Platform lens). No real AWS work done.

**To unblock — you need to provide:**
1. **AWS account access.** Easiest: create an IAM user named `miamo-deploy` with permissions: `AmazonEC2FullAccess`, `AmazonRDSFullAccess`, `AmazonElastiCacheFullAccess`, `AmazonS3FullAccess`, `IAMFullAccess` (or scoped tighter), `SecretsManagerReadWrite`, `CloudFormationFullAccess` (if using CFN), `Route53FullAccess`, `CloudWatchFullAccess`. **DO NOT paste credentials in chat.** Put them in `~/.aws/credentials` on your Mac via `aws configure` — the agent uses local AWS CLI auth, no chat exposure.
2. **Domain.** Confirm `miamo.app` is in Route 53 OR you'll buy/transfer it.
3. **Budget ceiling.** $50 / $100 / $200/mo target.
4. **Region.** Recommend `ap-south-1` (Mumbai).

**Time to complete:** Phase E full = ~12-20 hours over 2-3 sessions with you in the loop for AWS console checkpoints.

---

## Files added/modified this session

### New documents
- `PRODUCTION_LAUNCH_PROMPT.md` — the panel-mandate brief
- `docs/architecture/launch-audit.md` — full 7-lens audit
- `docs/architecture/alarms.md` — 12 baseline CloudWatch alarms
- `docs/architecture/launch-status.md` — this file

### New code modules
- `services/shared/src/geocoding.ts` — Nominatim wrapper
- `services/shared/src/algo/v8/geoDistance.ts` — Haversine math
- `services/shared/src/secrets.ts` — AWS Secrets Manager bridge
- `services/shared/src/rateLimits.ts` — 6 rate limiters
- `services/web/src/app/(main)/discover/components/MatchSuccessModal.tsx`
- `services/web/src/app/(main)/messages/components/MoveSuggestionList.tsx`
- `services/web/sentry.{client,server,edge}.config.ts`

### New tests
- `tests/v8-geo-distance.test.ts` (19 tests)
- `tests/v8-geocoding.test.ts` (11 tests)
- `tests/v8-discover-filters.test.ts` (property tests)
- `tests/v8-discover-match-move-suggestions.test.ts` (11 tests)
- `tests/v8-idempotency-coverage.test.ts` (33 tests)
- `services/shared/src/__tests__/secrets.test.ts` (17 tests)
- `services/shared/src/__tests__/env.test.ts` (8 tests)
- `services/shared/src/__tests__/rateLimits.test.ts` (8 tests)

### Modified (~25 files)
All 11 Dockerfiles, all 8 backend `server.ts`, `tracking-worker/index.ts`, `service.ts`, `metrics.ts`, `env.ts`, `v6Validators.ts`, `track/events.ts`, `discover/page.tsx`, `dtm/page.tsx`, `MoveV2Picker.tsx`, `DiscoverFilterModal.tsx`, `api.ts`, `next.config.js`, `web/error.tsx`, `start.sh`, `docker-compose.yml`, `.env.example`, `CHANGELOG.md`, `RUNBOOK.md`, `package.json` (shared + web).

### Deps added
- `@aws-sdk/client-secrets-manager@^3.658.0` → `services/shared/package.json`
- `@sentry/node@^7.120.3` → `services/shared/package.json`
- `@sentry/nextjs@^7.120.3` → `services/web/package.json`

---

## How to test what shipped (Monday-morning checklist)

```bash
cd /path/to/Miamo

# 1. Stop any leftover stack
bash scripts/start.sh local stop

# 2. Bring it up fresh
bash scripts/start.sh local dev

# 3. Wait for the green banner — should take 15-30s

# 4. Open http://localhost:3100 in a browser
# 5. Log in as miamo10@miamo.test / miamo10
# 6. Go to Discover

# B.1 test: match flow
# - Tap heart on miamo20 (or any seeded user who's already liked miamo10)
# - Should see "It's a match with X" modal with 5 Move v2 suggestions
# - Tap one suggestion → pre-fills input
# - Tap Send → message appears in chat

# B.2 test: filters + geo
# - Open filter modal
# - Click "📍 Use my current location" → grant browser permission
# - See city + distance slider
# - Tighten distance to 5km → pool shrinks
# - Relax to 100km → pool grows
# - Set datingIntent="serious" → only serious profiles show

# C.4 test: graceful shutdown
# - bash scripts/start.sh local stop
# - Should see "All local services stopped" + 0 zombies
# - ps aux | grep tsx | wc -l → 0 (or close to it)

# C.5 test: rate limits
# - curl -X POST localhost:3200/api/v1/auth/login (wrong password) 5 times → 6th returns 429
```

---

## Why this work matters

Before this session: v1 was clean but not production-ready. Match flow surface bug, filters incomplete, no real geo, secrets in env files, no error tracking, no rate limits on auth, Dockerfiles unsafe for prod, Windows users blocked, success banner lying about failures.

After this session:
- Founder bugs closed (match modal, filters, geo)
- Production secrets handling ready for AWS Secrets Manager
- Every error path going to Sentry
- 26 mutating endpoints idempotent
- Auth/OTP/payment endpoints rate-limited
- Cross-platform start.sh works on Mac, Linux, Git Bash for Windows users
- Honest health reporting (no more false-positive banners)
- Foundation laid for AWS deployment (just need credentials)

**Next session can pick up exactly where this one stopped — read this file + `launch-audit.md` + `PRODUCTION_LAUNCH_PROMPT.md` in that order.**
