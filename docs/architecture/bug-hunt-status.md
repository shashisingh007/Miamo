# Phase C First-Half Bug Hunt — Session Status

**Date:** 2026-07-01
**Scope:** Phase B rest (banked) + Phase C.1-C.5 (race / concurrency / time / money / boundary)
**Repo state:** v1 tag on `main`, single-commit history
**Outcome:** ✅ 48 real bugs surfaced, top-15 fixed, +34 tests

---

## What shipped this session

### Phase B rest — banked earlier in the session at commit `8e81fe3`
See `docs/architecture/click-matrix-status.md` for details:
- StoryViewer 7 menu actions get user-visible toasts + loading states
- ReelsView 6 user actions get optimistic rollback + error toasts
- Onboarding 4 savers surface failures + block navigation on save failure
- Settings toggleServer logs + toasts on failure
- DTM answer submit gets loading state + preserves draft
- WCAG AA skip-link + keyboard-accessible custom controls
- +6 invariant tests (508 → 514)

### Phase C first-half — this session
Full findings report: **[docs/architecture/bug-hunt-2026-07.md](./bug-hunt-2026-07.md)** (258 lines).

**48 unique findings** across 5 bug categories:
- P0: **3** (all fixed — including a monetization leak, see below)
- P1: 17 (11 fixed, 6 deferred)
- P2: 22 (1 fixed, 21 deferred to sweep)
- P3: 6 (all deferred)
- **Fixed this session: 15**
- **Deferred: 33** (each with an owner + rationale in the doc §3)

### 🚨 P0 highlight: monetization leak fixed

**`services/content/src/creativity-spotlight.ts:261-282`** — the `/api/v1/creativity/sandbox/purchase-minutes` route was granting free Spotlight minutes to any authenticated user in production. Gated on `NODE_ENV !== 'production'`. This was the highest-severity finding of the session — a real revenue-side bug that would have leaked money at launch.

### Top 15 fixes shipped

| # | Category | Fix | File:line |
|---|---|---|---|
| 1 | Money (P0) | Sandbox purchase route gated on `NODE_ENV !== 'production'` | `services/content/src/creativity-spotlight.ts:261-282` |
| 2 | Race | Creativity save/unsave wrapped in `$transaction()` with P2002 fallback | `services/content/src/creativity-spotlight.ts:333-390` |
| 3 | Race | Match favorite + pin toggles wrapped in `$transaction()` | `services/social/src/server.ts:1716-1767` |
| 4 | Race | Matches by-user block wraps 3 writes in `$transaction()` | `services/social/src/server.ts:1887-1920` |
| 5 | Boundary | Safety block: `safetyBlockBodySchema` Zod + `$transaction()` | `services/social/src/server.ts:2551-2582` |
| 6 | Race | Match-request accept wraps 4 writes in `$transaction()` | `services/social/src/server.ts:1799-1826` |
| 7 | Race | Superlike auto-match: `$transaction()` + guard | `services/social/src/server.ts:1429-1461` |
| 8 | Concurrency | `hashUid` reads `TRACKING_HASH_SECRET` per-call (not module-load) | `services/shared/src/track/hash.ts:11-25` |
| 9 | Concurrency | `createPushToUser` gets 2s `AbortSignal.timeout` + forwards `x-request-id` | `services/shared/src/service.ts:236-270` |
| 10 | Time | Token expiry uses `isFutureUnixMs` helper; NaN treated as expired | `services/shared/src/verification.ts:233-247` |
| 11 | Money | Creativity item create: compensating `refund_post_failed` on failure | `services/content/src/server.ts:947-989` |
| 12 | Money | `refund()` bounded by `MAX_REFUND_MINUTES=1000` | `services/shared/src/spotlight-ledger.ts:257-283` |
| 13 | Boundary | Age filter uses `clampInt(v, 18, 99)` (was `parseInt` no bounds) | `services/social/src/server.ts:449-457` |
| 14 | Boundary | Distance filter uses `clampFloat(v, 0, 20000)` (was `parseFloat` accepting Infinity/NaN) | `services/social/src/server.ts:583-591` |
| 15 | Boundary | `messageReactBodySchema.strict()` + emoji-codepoint refinement + 32-char cap | `services/shared/src/schemas.ts:252-267` |

### Regression prevention
- **New:** `tests/bug-hunt-phase-c.test.ts` — **34 tests** covering: `hashUid` env-refresh, token expiry NaN guards, refund bounds, `clampInt`/`clampFloat` semantics, emoji schema, safety-block schema, and source-level invariants that each transaction-wrap remains wrapped.

---

## Quality gates

| Gate | Baseline | End of session |
|---|---|---|
| Typecheck | 11/11 clean | 11/11 clean |
| Fast tests | 514 passing | **548 passing** (+34 Phase C invariants) |
| Full tests | 1528 passing (from prior) | Unchanged path; new tests are fast-suite |
| Files touched (Phase C) | — | 11 (under 20 cap) |
| Native dialogs in web | 0 | 0 (regression-tested) |
| P0 findings escalated | — | 0 new (the 3 P0s were all fixed) |

---

## Deferred to next session (33 findings)

### The remaining Phase C first-half deferrals

Full list in `bug-hunt-2026-07.md §3`. Notable clusters:

- **11 P1s** across social/content/messaging that need proper `$transaction()` wraps but touch multi-file logic (would push over the 20-file cap)
- **22 P2s** — the Zod-strict sweep across all boundary schemas (mostly one-line changes, but 40+ files to touch — its own session)
- **6 P3s** — polish items (magic numbers, cleanup)

### Larger phases still pending (from `full-audit-status.md`)

- **Phase C second-half** — C.6-C.10 (security, data integrity, third-party contracts, observability, accessibility)
- **Phase D** — Temporal Learning v2 (~6-8h)
- **Phase E** — every algo improved + 5 new (~8-10h)
- **Phase F** — 15 coming-soon features (~20-30h)
- **Phase G** — full test pyramid + G.10-G.18 (~45-60h)
- **Phase H** — launch-day T-24h/T-1h/T+72h checklist (~2-3h, comes last)

### Blocked-on-credentials (unchanged)

Google/Apple OAuth, real OTP (Resend + MSG91/Twilio), Razorpay live, AWS deploy, Sentry DSN, Rekognition, patent counsel, DPIA legal.

---

## Recommended next-session focus

- **If ~3-4h:** finish Phase C second-half (security + a11y + data-integrity + observability) — target another 20-30 fixes
- **If ~6-8h:** Phase D Temporal Learning v2 foundation (schema + 3-5 v9 algos + worker skeleton + tests)
- **If ~10h+:** Phase C rest + Phase D foundation together

Each deliverable adds a status doc so future sessions pick up cleanly.

---

_End of session status. See `docs/architecture/bug-hunt-2026-07.md` for the full findings + fixes, `docs/architecture/full-audit-status.md` for the queue, `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` for the ongoing brief._
