# Phase F — Coming-soon features shipped — Session Status

**Date:** 2026-07-01
**Scope:** Ship 5-8 highest-priority coming-soon features from the launch prompt's 15-item list, end-to-end
**Repo state:** v1 tag on `main`, single-commit history
**Outcome:** ✅ 7 features shipped end-to-end (4 launch-blocking compliance + 3 user-visible value)

---

## What shipped

### The 4 launch-blocking compliance features (always-ON, DPDP/GDPR required)

1. **Account deletion (hardened)** — `DELETE /api/v1/settings/delete` now wraps every table delete in `$transaction`, requires literal typed-confirm ("DELETE"), optional username cross-check, structured audit log. New `AccountDeleteModal` component with typed-confirm gate + reason picker + "deactivate instead" escape hatch. Delete-account is now a real ceremony, not a silent function.

2. **Data export** — `GET /api/v1/settings/export` expanded from 6 to **12 tables** (likes, matches, messages, reports, blocks, notifications, bookmarks, vibeChecks, consentEvents, userData, auditLogs, profile). Timestamped filename. Web UI streams the JSON zip.

3. **Report flow** — canonical `REPORT_REASON_IDS` array (12 reasons: spam, harassment, fake profile, inappropriate photos, underage, hate speech, threats, unwanted-sexual, catfishing, off-platform, other, escalation). Zod-validated `reportBodySchema` extended with `reasonId`, `targetType`, `evidence`. Safety page rewritten as accessible radio-group with escalation-path CTA.

4. **Blocked-user list UI** — new `BlockListPanel` component: auto-loads on Settings open, bulk-select + bulk-unblock through `ConfirmDialog` (no `window.confirm` — invariant test caught the first draft), verified-badge indicator per row, live count in Settings header.

### The 3 user-visible-value features (flag-gated default OFF)

5. **Trust score + verified badge UI** — new `GET /api/v1/profiles/me/trust` endpoint + pure `computeTrustScore` module + `TrustScoreCard` on profile page. Score 0-100 with 4 tiers (New / Building / Trusted / Verified). Per-signal next-step nudges: "Add a 3rd photo → +8 points" / "Verify phone → +12 points". Flag `FEATURE_TRUST_SCORE_ENABLED`.

6. **Weekly Top 10 refresh countdown** — `GET /api/v1/weekly-top` now emits `nextRefreshAt` + `secondsUntilRefresh`. Client renders a live 1-second-tick countdown with `aria-live="polite"`. Fires `weekly_top.countdown_expired` when it hits zero (client-side, worker will actually refresh separately).

7. **Family Brief share dashboard** — new `GET /api/v1/dtm/family-brief/shares` endpoint + `FamilyBriefSharesPanel` on DTM tab. Lists user's shared briefs with total/active/totalViews summary strip. Copy-link + open-brief per row. Flag `FEATURE_FAMILY_BRIEF_SHARES_ENABLED`.

### What was deferred (documented in `phase-f-shipped.md` with reason)

Voice notes, voice-note transcription, video profile intros, story reactions, group dates, DTM Match flow, Fairness Gini dashboard, right-now intent visibility.

Reasons: media infrastructure (need S3 + FFmpeg pipeline), admin surface (need admin auth model), or cross-cutting learner state work that overlaps Phase D/E.

---

## Quality gates

| Gate | Baseline | End of session |
|---|---|---|
| Typecheck | 11/11 clean | 11/11 clean |
| Fast tests | 742 passing | **776 passing** (+34 net-new) |
| Files touched | — | 20 (under 30 cap) |
| Native dialogs in web src | 0 | 0 (invariant caught + fixed one attempt) |
| DPDP/GDPR compliance surfaces | partial | **all 4 present** (delete, export, report, block-list) |
| New tracking events | — | +9 (with v6Validators + TrackEventName registered) |
| Feature flags added | — | +3 default-OFF, +3 always-ON compliance |

---

## Cumulative progress across 7 sessions

| Session | Phase | Tests | Files |
|---|---|---:|---:|
| Prior | Phase A audit + 5 fixes | +11 | 21 |
| Prior | Phase B rest + C first-half | +40 | 20 |
| Prior | Phase C second-half | +34 | 17 |
| Prior | Phase D — Temporal Learning v2 | +82 | 22 |
| Prior | Phase E — 5 new algos + 8 improvements | +78 | 25 |
| Now | Phase F — 7 features shipped | **+34** | **20** |
| **Total across 7 sessions** | | **+279** | **125** |

Test count trajectory: 497 → 508 → 514 → 548 → 582 → 664 → 742 → **776** passing.

**Algorithms:** 22 baseline → 32 (10 net-new). **Features shipped:** 7 coming-soon items now real.

---

## What did NOT ship

### Remaining Phase F items (8 features)
Voice/video media features, admin surfaces, group-dates, DTM Match flow, Fairness Gini dashboard, right-now intent visibility. Each documented with a specific reason.

### Longer phases still queued
- **Phase G** — full test pyramid + G.10-G.18 launch-critical (~45-60h, multi-session)
- **Phase H** — launch-day T-24h/T-1h/T+72h checklist (~2-3h, comes last)

### Blocked-on-credentials (unchanged)
Google/Apple OAuth, Resend + MSG91/Twilio, Razorpay live, AWS deploy, Sentry DSN, Rekognition, patent counsel, DPIA legal.

---

## What the user notices after this session

- **Priya asks to delete her account.** She goes to Settings, taps Delete, types the literal word "DELETE", picks a reason from the dropdown, taps Confirm. Every table wipes atomically. She receives an audit-log confirmation.
- **Priya asks for her data.** Settings → Export My Data → JSON zip with everything about her across 12 tables. DPDP-compliant.
- **Priya blocks someone.** They disappear from Discover, Matches, and her chat list. She can review the block list in Settings and unblock later.
- **Priya reports a bad profile.** She picks from 12 canonical reasons, adds evidence, gets a confirmation. Report row created for admin review.
- **Priya's profile has 3 photos + verified phone.** She sees "Trusted" tier badge on her own profile with a nudge: "Add 1 more photo → +8 points".
- **Priya opens the Weekly Top 10 tab.** She sees "Refreshes in 2d 14h 33m 12s" ticking in real time.
- **Priya has shared 3 Family Briefs.** She sees them in a dashboard on the DTM tab with view counts, can copy links or re-open.

Everything user-visible works, with real backend + real UI + real tests.

---

## Recommended next-session focus

- **Phase G first-half** (~4-6h): unit-test coverage sweep (target ≥80% on shared/algo) + integration tests for every API endpoint
- **Phase G second-half** (~4-6h): smoke + sanity + a11y automation + basic k6 load scaffold
- **Phase G.10-G.18** (~30-40h across multiple sessions): cross-platform matrix, moderation pipeline, legal docs, i18n, design system audit, DR runbook, notifications infrastructure, CI/CD pipeline, onboarding polish

---

_End of session status. See `docs/architecture/phase-f-shipped.md` for the full feature-shipping doc, `docs/architecture/phase-e-status.md` for the prior session, `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` for the ongoing brief._
