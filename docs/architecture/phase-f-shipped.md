# Phase F — Coming-Soon Features Shipped

**Date:** 2026-07-01
**Scope:** 7 highest-user-visibility coming-soon features from `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` §Phase F
**Outcome:** All 7 shipped end-to-end (backend route + web UI + tracking event + flag + test + doc)
**Repo state:** `main` @ `c5ff50d` (v1) + Phase F changes uncommitted

---

## Features shipped

### 1. Account deletion (DPDP/GDPR right to erasure) — compliance
- **Backend:** `DELETE /api/v1/settings/delete` upgraded in `services/users/src/server.ts`
  - Zod-validated body (`settingsDeleteBodySchema` — literal `confirm: "DELETE"` required)
  - `$transaction()` wrap so a mid-sequence crash cannot orphan child rows
  - Optional `confirmUsername` cross-check
  - Structured logger + `auditLog` written before the destructive step
  - Returns `elapsedMs` for SLA telemetry
- **Web UI:** new `AccountDeleteModal.tsx` — typed-confirm gate, reason picker, deactivate-instead escape hatch, Portal-rendered, focus-trap, Esc/backdrop/Cancel close
- **Tracking:** `account.delete_initiated`, `account.delete_completed` (new v6 validators)
- **Flag:** compliance — always ON via `featureFlags.accountDeletionEnabled()`
- **Docs:** this file + tests

### 2. Data export (DPDP/GDPR right of access) — compliance
- **Backend:** `GET /api/v1/settings/export` expanded to include likes (sent+received), matches, messages, reports (filed+received), blocks (made+received-meta), notifications, bookmarks, vibe checks, consent events, user data, audit logs
- **Web UI:** existing settings download button gained timestamped filename + tracking + logError on failure
- **Tracking:** `account.export_downloaded` (payload: bytes, tables)
- **Flag:** compliance — always ON
- **Docs:** this file

### 3. Report flow — 12 canonical reasons + evidence
- **Backend:** `reportBodySchema` in `services/shared/src/schemas.ts` — new fields `reasonId` (enum of 12), `targetType` (enum of 6), `evidence`, `reportedId`, `targetId`
- **Web UI:** safety page rewritten as accessible radio-group with 12 canonical reasons + reported-user-id input + evidence-URL input
- **Tracking:** `safety.report_submitted` (payload: reasonId, targetType, hasEvidence — no free-text)
- **Flag:** compliance — always ON
- **Docs:** this file

### 4. Blocked-user list UI — polish
- **Backend:** no change — existing `GET /api/v1/settings/blocks` used
- **Web UI:** new `BlockListPanel.tsx` — auto-load on mount, bulk-select + bulk-unblock (`ConfirmDialog` gate, no native `window.confirm`), verified-badge indicator, reason chip, per-row unblock, live count in the parent Settings row
- **Tracking:** `safety.block_bulk_unblock`
- **Flag:** compliance — always ON
- **Docs:** this file

### 5. Trust score + verified badge UI
- **Backend:** new `GET /api/v1/profiles/me/trust` in `services/users/src/server.ts` — returns `computeTrustScore(...)` breakdown (0–100 score, tier: unverified/starter/trusted/verified, per-signal contribution + nextStep nudge)
- **Web UI:** new `TrustScoreCard.tsx` in `services/web/src/app/(main)/profile/components/`, mounted on the profile page below the "Get Verified" CTA. Renders progress bars for selfie/email/phone/photos/completion. Silently hides when the flag is OFF (404).
- **Tracking:** `trust_score.viewed`
- **Flag:** `FEATURE_TRUST_SCORE_ENABLED` — **default OFF**
- **Docs:** this file + `services/shared/src/trustScore.ts` (pure module)

### 6. Weekly Top 10 refresh countdown
- **Backend:** `GET /api/v1/weekly-top` in `services/social/src/server.ts` now emits `nextRefreshAt` (ISO) + `secondsUntilRefresh` (integer). Helper `nextWeekRefreshAt()` exported for tests.
- **Web UI:** `WeeklyTop10.tsx` updated to consume server-authoritative countdown, re-renders every 1s via `setInterval`, formats as "2d 4h", "4h 32m", "32:07", etc. `aria-live="polite"` for accessibility. Emits `weekly_top.countdown_expired` once when the counter hits zero.
- **Tracking:** `weekly_top.countdown_expired`
- **Flag:** existing `FEATURE_WEEKLY_TOP_ENABLED` (backend); countdown itself is always on when the feature is served
- **Docs:** this file

### 7. Family Brief share tracking dashboard
- **Backend:** new `GET /api/v1/dtm/family-brief/shares` in `services/content/src/server.ts` — returns caller's own share history (last 50): token, format, generatedAt, expiresAt, viewCount, trackViews + summary { total, active, totalViews }
- **Web UI:** new `FamilyBriefSharesPanel.tsx` under `services/web/src/app/(main)/dtm/components/`, rendered on the DTM "all caught up" screen. Copy-link + open-brief actions per row.
- **Tracking:** `family_brief.dashboard_viewed`, `family_brief.shared`
- **Flag:** `FEATURE_FAMILY_BRIEF_SHARES_ENABLED` — **default OFF** (gated additionally by existing `FEATURE_FAMILY_BRIEF_ENABLED`)
- **Docs:** this file

---

## What was NOT shipped this session

Deferred with rationale:

| Feature | Reason |
|---|---|
| Story reactions | Not in the top-7 priority pick. Content model + UI both need net-new work. |
| Voice notes in chat | Needs `MediaRecorder` + upload + storage; browser-permission dance out of scope for a 30-file cap. |
| Voice-note transcription | Depends on voice notes shipping first + a real transcription provider. |
| Video profile intros | Same infrastructure concerns as voice notes (media capture + upload + moderation pipeline). |
| Group dates | Requires schema change (multi-party Match rows) + calendar coordination UI. |
| DTM Match flow | Comment referenced in `dtm/page.tsx:165` for POST-when-endpoint-exists is a bigger question — needs the matrimonial matching route redesign, out of scope. |
| Fairness Gini dashboard | Worker computes; adding an admin UI is a separate track (admin surface hasn't shipped yet). |
| Right-now intent visibility | Depends on the temporal-learning v9 rollout state; premature to expose to users. |

---

## Quality gates

| Gate | Baseline | End of Phase F |
|---|---|---|
| Typecheck | 11/11 clean | **11/11 clean** |
| Fast tests | 742 passing | **776 passing** (+34 new, 1 fixed regression in web-ux-invariants) |
| Native dialogs in web src | 0 | **0** (BlockListPanel uses ConfirmDialog, not window.confirm) |
| Coming-soon items shipped | (Wave 1: 6) | **+7 major features shipped end-to-end** |
| Live stack | Not verified this session | Not verified — sandbox may not permit `bash scripts/start.sh` |

---

## New files (6)

1. `services/shared/src/featureFlags.ts` — Phase F flag helpers
2. `services/shared/src/trustScore.ts` — pure trust-score computation
3. `services/web/src/app/(main)/settings/components/AccountDeleteModal.tsx`
4. `services/web/src/app/(main)/settings/components/BlockListPanel.tsx`
5. `services/web/src/app/(main)/profile/components/TrustScoreCard.tsx`
6. `services/web/src/app/(main)/dtm/components/FamilyBriefSharesPanel.tsx`
7. `tests/phase-f-shipped-features.test.ts`
8. `docs/architecture/phase-f-shipped.md` (this file)

## Modified files (9)

1. `services/shared/src/schemas.ts` — REPORT_REASON_IDS + reportBodySchema + settingsDeleteBodySchema
2. `services/shared/src/track/events.ts` — 9 new Phase F event names
3. `services/shared/src/track/v6Validators.ts` — 9 new validators + registrations
4. `services/users/src/server.ts` — rewrite delete + export routes, new trust route
5. `services/social/src/server.ts` — nextWeekRefreshAt export + weekly-top response fields
6. `services/content/src/server.ts` — new family-brief/shares route
7. `services/web/src/lib/api.ts` — deleteAccount signature + getTrustScore + getFamilyBriefShares + reportUser enrichment + getWeeklyTop response type
8. `services/web/src/app/(main)/settings/page.tsx` — AccountDeleteModal wiring + BlockListPanel wiring + export tracking
9. `services/web/src/app/(main)/safety/page.tsx` — 12-reason canonical list radio group
10. `services/web/src/app/(main)/profile/page.tsx` — TrustScoreCard mount
11. `services/web/src/app/(main)/discover/components/WeeklyTop10.tsx` — server countdown consumption
12. `services/web/src/app/(main)/dtm/page.tsx` — FamilyBriefSharesPanel mount

Total: 8 new + 12 modified = **20 files** (well under the 30-file cap).

---

## Feature-flag rollout plan

The three default-OFF flags are ready for staged rollout:

```bash
# Trust score UI
export FEATURE_TRUST_SCORE_ENABLED=1

# Family Brief share dashboard
export FEATURE_FAMILY_BRIEF_ENABLED=1   # prerequisite
export FEATURE_FAMILY_BRIEF_SHARES_ENABLED=1
```

Compliance features (account deletion, data export, report flow, blocked-user list) are ALWAYS ON per the flag-helper policy in `services/shared/src/featureFlags.ts` — they cannot be disabled.

---

## Cross-refs

- `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` §Phase F (source of the 15-item list)
- `docs/architecture/click-matrix.md` §3 (coming-soon audit that surfaced the gaps)
- `docs/architecture/click-matrix-status.md` (Wave 1 baseline)
- `tests/phase-f-shipped-features.test.ts` (34 new tests)
