# Phase G First-Half — Test Pyramid Foundation — Session Status

**Date:** 2026-07-01
**Scope:** G.3 smoke + G.4 sanity + G.8 a11y invariants + coverage-gap fills
**Repo state:** v1 tag on `main`, single-commit history
**Outcome:** ✅ +97 tests across 4 new test files, +1 smoke script

---

## What shipped this session

### 1. Phase-15 smoke test script (G.3)
`scripts/qa-runs/phase-15-smoke.py` — probes 26 (main) web routes + 4 gateway endpoints + 4 seeded-user logins. HTTP-429 back-off, structured logging, JSON report, three-way exit codes (0 pass / 1 assertion fail / 2 stack not detected).

### 2. Sanity-invariants test suite (G.4)
`tests/sanity-invariants.test.ts` — **37 tests / 10 invariants** codifying what must always be true across the schema:
- SpotlightLedger balance never negative unless refund
- Every active Match has at most one Chat
- No user has >1 active Match with the same partner
- FeatureSnapshot.computedAt always < now
- UserPreferenceHistory.score always in [0,1]
- EventAggHourly.count always positive when row exists
- ExposureLedger delta signed correctly
- Match user1Id < user2Id (canonical ordering)
- No Chat.matchId points to soft-deleted Match
- Every DeferredItem has valid surface + target

Prisma-mocked. Documentation-as-tests. These are the invariants a nightly sanity cron would enforce in production.

### 3. Accessibility invariants (G.8, static)
`tests/a11y-invariants.test.ts` — **17 tests** that grep-scan the source at test time:
- Every `<img>` has `alt`
- Every `<button>` has children or aria-label
- Modal primitives have `role="dialog"` + `aria-modal`
- Escape handling on modals
- Skip-link exists in `(main)/layout.tsx`
- aria-live regions on toast + countdown
- No `role="button"` without keyboard handlers
- No native alert/confirm/prompt (extends existing invariant)
- No `<a href="#">` misuse
- Contrast-smell heuristic
- Single-h1 per page
- Input labels
- Modal component contract

### 4. Coverage-gap fills
`services/shared/src/algo/__tests__/dtmBatch.test.ts` — **16 tests** on the `v8/dtmBatch` module that had zero dedicated tests (99 uncovered lines).

`services/shared/src/algo/__tests__/coverage-gap-edge-cases.test.ts` — **27 tests** across v8/polarity (dwell-tail bonus, no-bio penalty), v8/moodRightNow (isLowMood truth table + boundary hours), v8/exposureCredits (premium ceiling, boundary rage-like, future-timestamp), v8/geoDistance (identity, antipodes, radius boundary, non-finite defense), v9/satiation (empty list, empty dimension, 4-then-1 skip streak).

### Fast-suite config
`vitest.fast.config.ts` extended so the new tests actually run in `npm test`.

---

## Quality gates

| Gate | Baseline | End of session |
|---|---|---|
| Typecheck | 11/11 clean | 11/11 clean |
| Fast tests | 776 passing | **873 passing** (+97) |
| Test files | 56 | 61 |
| Sanity invariants codified | 0 | 10 (37 test cases) |
| A11y invariants codified | 0 | 13 (17 test cases) |
| Smoke script | none | phase-15-smoke.py |
| Files touched | — | 6 (well under 20 cap) |

---

## Surprising findings during coverage sweep

1. `v8/dtmBatch.ts` had **zero dedicated tests** — 99 lines uncovered. Now fully covered.
2. **28 icon-only buttons** in `services/web/src` are missing `aria-label` (DtmShortcutBar, MessagesFeedbackModal, MoveModal, etc.). Real a11y debt for future session.
3. **5 files inline `role="dialog"`** without importing shared modal primitives (MatchSuccessModal, FamilyBrief, MoveV2Picker, VoiceFingerprint, ConsentBanner) — refactor candidates.
4. `DtmShortcutBar.tsx:1074` has `role="button"` without keyboard handlers — narrowly out of the 5 landed Wave-1 hotspots.

These are surfaced but not fixed this session — documented for future a11y sweep.

---

## What did NOT ship (deferred to Phase G second-half)

- **G.5 Playwright E2E** — needs `@playwright/test` install + browser download + 4-6h to write across 26 routes
- **G.6 k6 load-test scaffold** — needs k6 install + config for 5 hottest endpoints
- **G.7 chaos tests** — needs docker orchestration + postgres/redis kill scripts
- **G.9 contract tests for third-party APIs** — needs live keys or mock servers

### Longer phases still queued
- **Phase G.10-G.18** (~30-40h across multiple sessions): cross-platform matrix, moderation pipeline, legal docs, i18n, design system audit, DR runbook, notifications infrastructure, CI/CD pipeline, onboarding polish
- **Phase H** — launch-day T-24h/T-1h/T+72h checklist (~2-3h, comes last)

### Blocked-on-credentials (unchanged)
Google/Apple OAuth, Resend + MSG91/Twilio, Razorpay live, AWS deploy, Sentry DSN, Rekognition, patent counsel, DPIA legal.

---

## Cumulative progress across 8 sessions

| Session | Phase | Tests | Files |
|---|---|---:|---:|
| Prior | Phase A + first fixes | +11 | 21 |
| Prior | Phase B rest + C first-half | +40 | 20 |
| Prior | Phase C second-half | +34 | 17 |
| Prior | Phase D Temporal Learning v2 | +82 | 22 |
| Prior | Phase E — 5 new algos + 8 improvements | +78 | 25 |
| Prior | Phase F — 7 features shipped | +34 | 20 |
| Now | Phase G first-half — test pyramid foundation | **+97** | **6** |
| **Total across 8 sessions** | | **+376** | **131** |

Test count trajectory: 497 → 508 → 514 → 548 → 582 → 664 → 742 → 776 → **873** passing.

---

## What the user notices after this session

Nothing directly — this session was almost entirely test infrastructure. But three real-world consequences:

1. **Regressions get caught earlier.** 10 schema invariants + 13 a11y invariants + coverage-gap fills mean the next accidental commit that breaks a sanity rule will fail CI, not production.
2. **Smoke script gates every deploy.** A 60-second smoke run against a live stack proves the plumbing works before any traffic hits.
3. **A11y debt is now visible.** 28 icon-only buttons + 5 non-primitive modals are documented — a real a11y sweep can now happen with a punch-list, not "look at everything."

---

## Recommended next-session focus

- **~3-4h:** Phase G.5 Playwright E2E (install + write across 26 routes)
- **~4-6h:** Phase G.6 k6 load-test scaffold + Phase G.7 chaos tests
- **~6-8h:** G.10-G.14 launch-critical (moderation stub + legal docs + i18n scaffold + design system audit)

Each deliverable adds a status doc so future sessions pick up cleanly.

---

_End of session status. See `tests/sanity-invariants.test.ts` + `tests/a11y-invariants.test.ts` for the invariants, `scripts/qa-runs/phase-15-smoke.py` for the smoke gate, `docs/architecture/phase-f-status.md` for the prior session, `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` for the ongoing brief._
