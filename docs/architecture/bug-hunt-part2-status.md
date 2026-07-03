# Phase C Second-Half Bug Hunt — Session Status

**Date:** 2026-07-01
**Scope:** C.6-C.10 (security / data integrity / third-party contracts / observability / accessibility)
**Repo state:** v1 tag on `main`, single-commit history
**Outcome:** ✅ 34 real bugs surfaced, top-15 fixed, +34 tests (548 → 582)

---

## What shipped this session

Full findings report: **[docs/architecture/bug-hunt-2026-07-part2.md](./bug-hunt-2026-07-part2.md)** (262 lines).

**34 unique findings** across 5 categories:
- P0: **1** (fixed — RTBF completeness gap)
- P1: 13 (10 fixed, 3 deferred)
- P2: 15 (5 fixed, 10 deferred)
- P3: 5 (all deferred)
- **Fixed: 15 (target met)**
- **Deferred: 19** (owner-assigned in doc §3)

### 🚨 P0 highlight: RTBF completeness gap closed

**`services/tracking-worker/src/forget.ts`** was deleting from only 4 of the 14 uidHash-keyed tables. A user asking to be forgotten still had rows in the other 10 tracking/aggregate tables (`UserPreferenceHistory` when it ships, `PairCompatCache`, `EventAggHourly`, `EventAggDaily`, `SessionSummary`, `FocusAffinityHourly`, `UserWeightProfile`, `UserMoveProfile`, `SafetyAgg`, `FirstMoveOutcome`). Now covers all 14 inside a single `$transaction()`. Locked with a source-invariant test that fails if any uidHash-keyed table is dropped.

### 🚨 Runner-up: 7-site timing-attack surface eliminated

HMAC signature compares (`sig !== expected`) and internal-key checks (`req.headers['x-internal-key'] !== INTERNAL_SERVICE_KEY`) were all using variable-time equality. Each comparison leaked the prefix length via response-time side-channel. Fixed with a new `services/shared/src/security/timingSafe.ts` helper deployed across 7 call-sites (gateway, notifications, messaging ×2, users, auth, shared/service.ts). Now uses `crypto.timingSafeEqual` throughout.

### Top-15 fixes shipped

| # | Category | Fix | File:line |
|---|---|---|---|
| 1 | Security (P0) | RTBF covers all 14 uidHash-keyed tables in a $transaction | `services/tracking-worker/src/forget.ts` |
| 2 | Security | HMAC + internal-key checks use `timingSafeEqual` (7 sites) | `services/shared/src/security/timingSafe.ts` + 7 callers |
| 3 | Security | ChatView `openMediaSafely` protocol allowlist | `services/web/src/app/(main)/messages/components/ChatView.tsx` |
| 4 | Security | `hashUid` reads TRACKING_HASH_SECRET per-call in ingest+rollup+forget (extends first-half fix) | 3 files |
| 5 | Security | `sanitizeObject` blocks `__proto__` / `constructor` / `prototype` keys | `services/shared/src/security/sanitize.ts` |
| 6 | Data integrity | Unmatch wraps 3 writes in $transaction | `services/social/src/server.ts` |
| 7 | Third-party | Nominatim respects Retry-After on 429 + retry-once + counter | `services/shared/src/geocoding.ts` |
| 8 | Third-party | Apple OAuth jwtVerify wrapped in try/catch + structured log | `services/auth/src/server.ts` |
| 9 | Third-party | Social→messaging fetches get 2s AbortSignal + x-request-id | `services/social/src/server.ts` |
| 10 | Observability | Sentry `beforeSend` scrubs POST bodies, query.token, hashes user.email | `services/shared/src/service.ts` |
| 11 | Observability | `getUserCommStyle`/`getUserLastMessages` warn on failure (not silent catch) | `services/shared/src/algo/v8/moveV2/*` |
| 12 | Observability | `applyBaseMiddleware` honours `ALLOWED_ORIGINS` csv (rejects `*`) | `services/shared/src/service.ts` |
| 13 | Boundary | `/otp/start` caps identifier at 254 chars | `services/auth/src/server.ts` |
| 14 | A11y | ChatView icon-only buttons (close, back, menu) get aria-label | `services/web/src/app/(main)/messages/components/ChatView.tsx` |
| 15 | Third-party | `_getGeocodingStats()` counter exported for observability | `services/shared/src/geocoding.ts` |

### Regression prevention
- **Extended:** `tests/bug-hunt-phase-c.test.ts` — 16 new tests covering timing-safe compares, RTBF completeness (source-invariant), sanitize proto-key rejection, protocol allowlist, retry-after honouring, Sentry scrub. Total in file now: 50.

---

## Quality gates

| Gate | Baseline | End of session |
|---|---|---|
| Typecheck | 11/11 clean | 11/11 clean |
| Fast tests | 548 passing | **582 passing** (+34) |
| Files touched (Phase C part 2) | — | 17 (under 20 cap) |
| P0 findings escalated | — | 0 new (the 1 P0 shipped this session) |

---

## What did NOT ship

### Deferred (19 findings)
Full breakdown in `bug-hunt-2026-07-part2.md §3`. Notable clusters:
- 3 P1s that touch multiple services in ways that would push over file cap (Zod strict sweep, prototype-pollution audit across all handlers, CORS explicit-origin registration)
- 10 P2s (accessibility across all icon-only buttons, form label associations, focus-visible rings)
- 5 P3s (polish — magic numbers, cleanup)
- 1 P1 that requires an owned decision: prod-fail-fast on missing INTERNAL_SERVICE_KEY (would tighten prod bootstrap; needs founder call)

### Larger phases still pending

Unchanged from prior status doc — see `docs/architecture/bug-hunt-status.md`:
- Phase D Temporal Learning v2 (~6-8h)
- Phase E every algo improved + 5 new (~8-10h)
- Phase F 15 coming-soon features (~20-30h)
- Phase G full test pyramid + G.10-G.18 launch-critical (~45-60h)
- Phase H launch-day checklist (~2-3h, comes last)

### Blocked-on-credentials (unchanged)
Google/Apple OAuth verification, real OTP (Resend + MSG91/Twilio), Razorpay live, AWS deploy, Sentry DSN, Rekognition, patent counsel, DPIA legal.

---

## Cumulative session-over-session progress

| Session | Phase | Findings surfaced | Fixed | Tests added | Files |
|---|---|---:|---:|---:|---:|
| Prior | Phase A audit | 154 | 6 | +11 | 21 |
| This morning | Phase B rest | ~90 (in click-matrix §5) | ~15 | +6 | 9 |
| This afternoon | Phase C first-half | 48 | 15 | +34 | 11 |
| Now | Phase C second-half | 34 | 15 | +34 | 17 |
| **Total across 4 sessions** | | **~326** | **51** | **+85** | **58** |

Test count trajectory: 497 → 508 → 514 → 548 → **582** passing (+85 across the audit+fix cycle).

Every fix has a regression test. Every fix has a rationale in a status doc. Every fix is deployed behind the same architecture (no new dependencies, no refactors beyond scope, no half-shipped features).

---

## Recommended next-session focus

- **If ~3-4h:** Phase D Temporal Learning v2 foundation (schema + 3 v9 algos + worker skeleton + tests)
- **If ~6-8h:** Phase D full + Phase E highest-leverage algo improvements
- **If ~10-12h:** Phase D + Phase E + start Phase F (top-5 coming-soon features shipped)

---

_End of session status. See `docs/architecture/bug-hunt-2026-07-part2.md` for the full findings + fixes._
