# Session 13 — Deferred G.18 wiring + Zod strict sweep + 3 more coming-soon features

**Date:** 2026-07-03
**Scope:** finish what previous sessions deferred + ship the next tier of coming-soon
**Repo state:** v1 tag on `main`, single-commit history
**Outcome:** ✅ 17 files, +49 tests (1041 → 1090)

---

## What shipped this session

### Task 1 — G.18 wiring pass (deferred from prior session)

1a. **Progressive disclosure wired into (main)/layout.tsx** — nav tabs (DTM, family-brief, weekly-top-10) hidden per `shouldShowFeature(user, feature)` when `FEATURE_PROGRESSIVE_DISCLOSURE_ENABLED=1`. Default OFF = bit-identical to today.

1b. **discover-seed wired into `GET /api/v1/discover`** — when natural candidate pool has <5 items AND flag on, top up from the seeded profileHealth-ranked pool. Emits new `discover.seeded_fallback` tracking event.

1c. **First-match transactional write** — `/discover/like` now checks `Match.count()` inside the same transaction that creates the match; if first-ever, sets `Settings.hasSeenFirstMatch=true` atomically. API returns `isFirstMatch` boolean in response so `MatchSuccessModal` can trigger the confetti wire-in.

### Task 2 — Zod strict sweep

**`services/shared/src/schemas.ts` strict count: 6 → 50.** Every user-facing boundary schema now rejects unknown fields (defence-in-depth). Regression test `tests/zod-strict-boundary.test.ts` (14 tests) greps the source for `z.object({` in boundary files and asserts each has a corresponding `.strict()`.

Plus 2 new boundary schemas: `dtmMutualInterestBodySchema`, `settingsIntentOverrideBodySchema` + `INTENT_CLASS_IDS` constant.

### Task 3 — 3 more coming-soon features shipped end-to-end

**3a. DTM match flow** (`FEATURE_DTM_MATCH_ENABLED`):
- New Prisma models: `DtmInterest`, `DtmMatch`
- New endpoint: `POST /api/v1/dtm/mutual-interest` (transactional — checks bidirectional interest, creates match atomically)
- Web ready to reuse `MatchSuccessModal` with `source: 'dtm'`

**3b. Right-now intent visibility** (`FEATURE_INTENT_VISIBILITY_ENABLED`):
- New endpoint: `GET /api/v1/settings/intent-status` — exposes user's current intent class from `intentRightNow.ts`
- New endpoint: `PUT /api/v1/settings/intent-override` — user can override the app's inference
- `Settings.manualIntentOverride` column added

**3c. Fairness Gini admin dashboard** (`FEATURE_ADMIN_FAIRNESS_ENABLED`):
- `User.isAdmin` column added via migration
- New endpoint: `GET /api/v1/admin/fairness-gini` — reads from `fairnessAudit.ts` worker output
- New web route: `services/web/src/app/(main)/admin/fairness/page.tsx` — admin-gated table + chart placeholder

### Migration

`services/shared/prisma/migrations/20260703000000_v12_admin_dtm_intent/migration.sql` — fully idempotent (`ADD COLUMN IF NOT EXISTS` + `CREATE TABLE IF NOT EXISTS` + FK guard DO blocks). Founder runs `prisma migrate deploy`.

---

## Quality gates

| Gate | Baseline | End of session |
|---|---|---|
| Typecheck | 11/11 clean | 11/11 clean |
| Fast tests | 1041 passing | **1090 passing** (+49) |
| Files touched | — | 17 (under 30 cap) |
| Coming-soon features shipped | 7/15 | **10/15** |
| Zod strict boundaries | 6 in schemas.ts | **50** (with regression test) |

---

## Cumulative 13-session scorecard

| Metric | v1.0 baseline | Now |
|---|---:|---:|
| Fast tests passing | 497 | **1,090** |
| Test files | ~35 | 77 |
| Coming-soon features shipped | 0/15 | 10/15 |
| Algorithm modules | 22 | 32 |
| E2E specs | 0 | 22 |
| Contract tests | 0 | 4 files / 49 tests |
| Sanity + a11y invariants | 0 | 62 tests |
| Zod strict boundaries | ~6 | 50+ (with regression test) |
| P0 findings escalated + fixed | — | 4 |
| Timing-attack sites | 7 | 0 |
| Native dialogs in web | 4 | 0 (locked) |
| RTBF completeness | 4 tables | 14 tables |
| Architecture status docs | 0 | 22+ |

---

## What did NOT ship

### Deferred sub-items from this session
- **1c consumer wiring in `discover/page.tsx`** — API returns `isFirstMatch: true`; the discover page doesn't currently open `MatchSuccessModal` in the auto-close path. Primitive available for future page-wiring pass.
- **3b ranker consumer** — `Settings.manualIntentOverride` is written; discover ranker doesn't yet consult it. Would touch social/server.ts scoring path.
- **3c admin chart** — numeric table ships today; SVG/canvas chart is a placeholder div.

### Still queued (unchanged)
- 5 remaining coming-soon features (voice/video media, group dates, story reactions, screenshot detection — all need external infra)
- Deep migration of `<img>` → `next/image` (~30 files, design-system doc has the priority list)
- Complete translation of every UI string to `t()` (~200+ strings, multi-week job)
- Real Rekognition integration (needs AWS creds)
- v9 4-week production ramp (needs live traffic)

### Blocked-on-credentials (unchanged all 13 sessions)
Google/Apple OAuth, Resend + MSG91/Twilio, Razorpay live, AWS deploy, Sentry DSN, Rekognition, patent counsel, DPIA legal, `npx playwright install`, `brew install k6`, docker stack for chaos.

---

## What the user notices after this session

- **Progressive disclosure** — brand-new users don't see the DTM tab until they've matched once; keeps early UX simple. (When ramped.)
- **Empty Discover queue on day-1** — automatically top-up from seeded profiles so new users always see cards. (When ramped.)
- **First-match confetti** — when a user's first-ever match happens, the modal fires the celebration. (Once discover-page wiring lands.)
- **DTM match** — DTM completion between two users who both expressed interest creates a match. (When ramped.)
- **See what the app thinks I'm doing** — Settings → "The app currently thinks you're: casual_browse" with an override. Trust-building.
- **Admin fairness dashboard** — internal only; validates the Singh-Joachims fairness rerank isn't drifting per-gender.

---

_End of session 13 status._
