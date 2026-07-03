# Activation Funnel — Phase G.18

**Authored:** 2026-07-02
**Owner:** product + growth
**Cross-refs:**
- `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §G.18`
- `services/tracking-worker/src/activationEmails.ts` (4-touchpoint schedule)
- `services/web/src/lib/progressiveDisclosure.ts` (7 gated features)
- `services/web/src/components/onboarding/TutorialModal.tsx` (first-run 3-slide)
- `services/social/src/discover-seed.ts` (empty-Discover backfill)
- `services/web/src/app/(main)/discover/components/MatchSuccessModal.tsx` (confetti on first match)

The first 30 seconds decide whether a Miamo user comes back tomorrow. Every touchpoint below is measured, flag-gated, and reversible.

---

## 1. The five landings

The activation funnel is designed as a **sequence of psychological moments**, not a set of feature launches. A user hits them in this order:

| # | Moment | Trigger | Surface |
|---|---|---|---|
| 1 | First open after signup | `Onboarding.complete = true` | 3-slide `TutorialModal` |
| 2 | First Discover queue | any queue empty for this user | `fetchDiscoverSeed()` backfill |
| 3 | First match | `Like.isMutual = true` for a user with `Settings.hasSeenFirstMatch = false` | `MatchSuccessModal` with confetti |
| 4 | Day-1 email nudge | 24h after signup, profile still < 0.75 health | `activation-email:complete-profile` |
| 5 | Day-7 mental model | 168h after signup | `activation-email:algorithm-tips` |

Each surface is **independently gated on a feature flag** so we can A/B-test the impact of removing any one of them.

---

## 2. The 4-touchpoint email schedule

Implemented by `services/tracking-worker/src/activationEmails.ts`. Loop ticks every 5 minutes, computes `dueTouchpoints(signupAt, now, alreadySent)`, and enqueues one `Notification` row per due touchpoint. `AuditLog` entries tagged `activation-email:<touchpoint>` are the dedupe key — a restart of the worker or a schema change cannot cause duplicates.

| # | Touchpoint | Fires at (post-signup) | Copy hook |
|---|---|--:|---|
| 1 | `welcome` | 0h | "Welcome, {name}. Your Discover queue is ready — come see who we picked." |
| 2 | `complete-profile` | 24h | "Profiles with 3+ photos and 2+ prompts get 4× more Moves. Two minutes of polish goes a long way." |
| 3 | `unread-matches` | 48h | "A few people are hoping you write first. The first Move is the whole game." |
| 4 | `algorithm-tips` | 168h (7 days) | "Here's how Miamo ranks you higher: chat back within 24h, add specificity to prompts, pass thoughtfully." |

**Cadence rationale:** we don't email in the first 24h to give the user time to internalise the app. We don't email past day 7 (in the activation stream) to avoid becoming email spam — after day 7, the weekly digest takes over.

**Flag:** `FEATURE_ACTIVATION_EMAILS_ENABLED=1`. Default OFF at v1 because Resend / SES credentials are still pending; the worker's `tick()` returns 0 with the flag off, no DB reads.

---

## 3. Progressive-disclosure rules

Implemented by `services/web/src/lib/progressiveDisclosure.ts`. Each rule is a pure boolean function of `(user, feature) → visible`. The rules encode "don't overwhelm a fresh user" without silently disabling a returning user.

| Feature | Rule | Rationale |
|---|---|---|
| `dtm` | `matchCount ≥ 1` OR `seriousModeEnabled` | DTM (Date-to-Marry) is emotionally heavy; users need to have felt the app match them at all before we ask them to fill a 20-question DTM intake. |
| `family-brief` | `intent = 'serious' \|\| 'dtm'` | The "share your PDF with parents" surface only makes sense once the user has picked a serious intent. |
| `anti-ghost` | `matchCount ≥ 3` | Anti-ghost nudges only trigger on stalled chats — you need conversation history. |
| `weekly-top-10` | `daysSinceSignup ≥ 7` | A week of behavioural signal is the minimum for the top-10 ranker to be more than random. |
| `ai-match` | `matchCount ≥ 3` | The daily top-1 ranker needs calibration data. |
| `creativity-earn` | `!onboardingComplete` | The earn drawer nudges profile completion; hide it after completion (would be noise). |
| `vibe-check` | always | The vibe check is a shallow delightful cold-start engagement surface — always available. |

**Flag:** `FEATURE_PROGRESSIVE_DISCLOSURE_ENABLED=1` on the client. Default OFF at v1 (every feature always visible, current behaviour). On = rules apply.

**Wire point:** `services/web/src/app/(main)/layout.tsx` will consume `shouldShowFeature(user, 'dtm')` to conditionally render the "Serious" sidebar link. When the flag flips on, layout gates 7 sidebar items. This is a follow-up wiring pass — the helper is landed and tested this session.

---

## 4. First-run tutorial

`TutorialModal` (three slides, dismissible, progress-persistent).

**Slides:**
1. "Miamo takes its time." — sets the anti-swipe expectation.
2. "Every action teaches the ranker." — introduces the pass-with-reason feedback loop.
3. "The first Move is the whole game." — primes the user to expect the Move v2 chip on first match.

**Storage key:** `miamo:tutorial:v1`. Bumping to `v2` re-shows the tour for every user (use sparingly — this is the "annoy every user" button).

**Flag:** `NEXT_PUBLIC_FEATURE_TUTORIAL_ENABLED=1`. Default OFF at v1 (no user sees the tour); the founder toggles it on right before launch after copy review.

---

## 5. First-match delight

`MatchSuccessModal` renders a 24-piece confetti burst on the user's first match (`Settings.hasSeenFirstMatch = false`). The burst uses framer-motion (already a project dep — no new package). Duration ~1.4s; then the modal continues normally with the Move v2 suggestions.

**Wire order** (server logic to be added at wire-time):
1. On `POST /api/v1/discover/like` returning `isMutual: true`, the server reads `settings.hasSeenFirstMatch`.
2. Server returns `firstMatch: !hasSeenFirstMatch` in the response envelope.
3. Server writes `settings.hasSeenFirstMatch = true` atomically so a concurrent second match doesn't also fire the confetti.
4. Client passes `isFirstMatch={response.firstMatch}` to `<MatchSuccessModal />`.

**Flag:** none — the confetti is design polish, always on. `hasSeenFirstMatch` is the natural once-per-user gate.

---

## 6. Empty-Discover backfill

`fetchDiscoverSeed(prisma, { count: 20, excludeIds, preferCity })` returns up to 20 profiles ordered by `Profile.profileHealth desc`, with a small city-match nudge. Used when the primary Discover query returns 0 candidates on day 1 (small pool + user hasn't liked/passed enough to exhaust it, but locale filters cut deep).

**Wire point:** `services/social/src/server.ts` `GET /api/v1/discover` immediately before `res.json(...)`. If `result.length === 0 && isDiscoverSeedEnabled()` → call `fetchDiscoverSeed` and merge into `result`. Follow-up wiring pass.

**Flag:** `FEATURE_DISCOVER_SEED_ENABLED=1`. Default OFF at v1 — the seed pool is only meaningful once the seeded-users set (`services/shared/prisma/seed.ts`) is populated in prod. Founder flips this on after seed migration.

---

## 7. Instrumentation

Every touchpoint emits a strict-validated v8 tracking event. Below is the mapping from touchpoint → event; the tracking pipeline (§reference_tracking.md) is the source of truth for the event schemas.

| Touchpoint | Client-side event | Server-side event | Aggregate |
|---|---|---|---|
| Tutorial slide advance | `tutorial.slide_seen` (per slide) | — | `session_summary` |
| Tutorial complete | `tutorial.completed` | — | audit-log |
| Discover seed served | — | `discover.seed_served` | daily |
| First match modal opened | `match.first_success_modal` | — | daily |
| Confetti animation seen | (implied by the above) | — | — |
| Activation email enqueued | — | `activation-email:<tp>` (audit) | daily |
| Feature hidden by disclosure | (client-side; not emitted at v1) | — | — |

**KPIs to watch after enablement:**
- **D7 retention** — 7-day active revisit rate. Baseline v1: 32%. Target after G.18 stack lands: 45%.
- **Time to first match** — median across a signup cohort. Baseline: unknown (need instrumentation). Target: < 24h.
- **Move-accepted rate** on first match vs later matches — G.18 hypothesis: first-match delight → higher first-Move send rate. Watch for +8pp.

---

## 8. Rollout order

1. **Land the primitives** (this session): helpers, doc, worker, migration, tests. Flags OFF.
2. **Wire the layout gate** for progressive disclosure. Flip flag on in staging.
3. **Wire the Discover seed** into `GET /api/v1/discover`. Flip flag on in staging after seed set is confirmed populated.
4. **Wire the first-match server logic** (`settings.hasSeenFirstMatch` transactional write). No flag — always on.
5. **Copy review** for tutorial slides + activation emails. Founder + external copy-editor review.
6. **Flip tutorial flag on** in staging. Watch cohort D1 retention for 48h.
7. **Flip activation-emails flag on** in staging once Resend/SES credentials land. Watch delivery rate for 48h.
8. **Promote all four flags to prod** together, on a Monday morning, so we have a clean weekly cohort delta.

---

## 9. Kill switches

| Symptom | Kill switch |
|---|---|
| Tutorial hurts D1 retention | `NEXT_PUBLIC_FEATURE_TUTORIAL_ENABLED=0` — no user sees the tour |
| Discover seed pool getting stale complaints | `FEATURE_DISCOVER_SEED_ENABLED=0` — empty queues stay empty; team investigates seed set |
| Activation emails triggering spam complaints | `FEATURE_ACTIVATION_EMAILS_ENABLED=0` — worker stops enqueueing |
| Confetti causing framer-motion frame drops | temporary revert: pass `isFirstMatch={false}` from Discover handler |
| Progressive disclosure hiding too much | `FEATURE_PROGRESSIVE_DISCLOSURE_ENABLED=0` — every feature visible again |

Each kill switch is a one-line env-var flip in the compose stack — no restart of the primary services required except for the client (Next.js needs a rebuild for `NEXT_PUBLIC_*` changes; use the tutorial's opt-in re-mount pattern for hot-swap).

---

_End of activation-funnel.md. Next revision after the wire-up pass lands and cohort data comes back._
