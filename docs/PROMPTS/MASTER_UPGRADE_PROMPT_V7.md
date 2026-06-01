# MASTER_UPGRADE_PROMPT_V7.md — "Right Now" feed + dual-surface learning + human Move

> Drop this file into a fresh agent context and say "execute V7 end-to-end".
> The agent must follow it phase-by-phase, run typecheck + tests after every phase,
> and commit per phase. No phase may break previous tests.

---

## 0. North-star outcome

Show every user **what they want to see right now** — not yesterday, not on average,
**right now** — and re-show it 10-at-a-time with a brief breathing pause that
*feels* like a human curator picked the next ten, not a machine paginated.
Discover and DTM each have **their own** learner, their own decay clock, their
own surface-scoped tracking, their own feed. Miamo Move suggestions read like a
warm friend nudging you, not a chatbot.

The system already has the bones (commits `8600b15` → `76b717a`):
12,431 tests pass, 11 packages typecheck, ~140 event names declared, v6 ranker
+ pipeline + learner + envelope (lh/wd/sn/sf) + sampling + cursor grid + EWMA
decay + preferenceSnapshot + insights builder all shipped.

V7 = **wire what we have**, **separate Discover from DTM**, **add the missing
collectors**, **make Move human**, and **deliver the 10-then-breathe ladder**.

---

## 1. Hard rules (do not violate)

1. **Pure first.** New logic lives in `services/shared/src/algo/**` as pure modules
   with unit tests *before* any service wiring.
2. **Surface isolation.** Anything Discover learns must NOT pollute DTM, and
   vice-versa. Two profiles, two reward streams, two decay clocks, two snapshots.
3. **Less volume, more signal.** Sampling only goes up, never down. Every new
   event must justify ≤ 1 KB/min average wire cost per active session.
4. **No new dependencies** without explicit approval. Reuse zod, ioredis, prisma.
5. **Feature-flag every behavior change.** Default OFF on the first commit; flip
   ON in the closing phase after green CI.
6. **Tests gate every commit.** `npm run typecheck` 11/11 + `npm run test:full`
   green. New tests for every new pure module (≥ 4 tests, edge cases included).
7. **Human voice for Move.** Every user-facing string passes a "would a friend
   text this?" filter. No "I noticed that...", no em-dashes, no exclamation
   marks, no AI-tells. Test it.
8. **No emojis** in committed code or copy unless a designer file says otherwise.
9. **Repo memory.** Update `/memories/repo/algo-module-gotchas.md` with anything
   non-obvious learned. Don't write conversational logs.
10. **Per-phase commits**, not one mega-commit. Each commit must stand alone.

---

## 2. Phase ladder (executes top-to-bottom)

Each phase ends with: typecheck + tests + commit + push. Commit messages use
`feat(track):` / `feat(algo):` / `feat(discover):` / `feat(dtm):` / `feat(move):`
prefixes.

### Phase A — Validation closeout (boundary safety)
Goal: every emitted event has a Zod schema in `v6Validators.ts`.
- Add schemas for: `discover.swipe`, `swipe.start/abort/commit/undo/regret/repeat_pass`,
  `card.impression.50/100`, `card.hover`, `card.bio.expand/collapse`,
  `card.photo.swipe`, `intent.profile.settle`, `dtm.question_view`, `dtm.answer`,
  `dtm.complete`, `msg.send`, `msg.read`, `msg.reaction`, `msg.voice_record`,
  `chat.typing.start/stop`, `notification.shown/opened/dismissed/snoozed`,
  `search.query/result_click/no_results`, `media.video.play/pause/seek/complete`,
  `beats.play/skip`, `moves.play`, `profile.view`, `profile.edit`,
  `album.upload/view/unlock_request`.
- Delete events that are declared but never emitted AND have no consumer:
  `discover.card_view`, `discover.match`, `discover.boost_view`,
  `vibe.check_start`, `vibe.check_complete`, `lifecycle.fullscreen`.
  (Keep them in a CHANGELOG note.)
- Tests: extend `v6Validators.test.ts` with happy + reject cases per new schema.

### Phase B — Wire the dormant collectors
- `services/web/src/lib/track/collectors/cards.ts` — wire into ProfileCard so
  `card.impression.50/100`, `card.hover`, `card.bio.expand/collapse`,
  `card.photo.swipe`, `intent.profile.settle` actually fire.
- `services/web/src/lib/track/collectors/swipe.ts` — replace the raw
  `track('discover.swipe', ...)` in Discover with `swipeTracker.commit(...)`
  so we get start/abort/commit/undo/regret/repeat_pass natively.
- `firstMove`, `safety`, `deferred` helpers — call them from Messaging,
  Matches, and Discover/DTM defer flows.
- Tests: snapshot tests on each component's emitted events under user actions.

### Phase C — Surface-isolated tracking taxonomy
Goal: every event the algorithms care about carries a clean `sf` value AND the
worker stores per-surface aggregates separately.
- Extend `services/tracking-worker/src/rollup.ts` to keep a parallel
  `(uidHash, surface, evt, hour)` aggregate alongside the existing
  `(uidHash, evt, hour)` one. Use a Postgres `EventAggHourlyBySurface` table
  (new prisma model) — INSERTs same shape + `surface VARCHAR(32)`.
- Migration: `<ts>_v7_surface_split.sql`.
- Tests: rollup unit tests verifying same event on two surfaces lands in two
  rows, not one.

### Phase D — Two learners (Discover + DTM)
- Schema: rename `UserWeightProfile` → split into
  `DiscoverWeightProfile` and `DtmWeightProfile` (same shape, FK to user).
  Migration must back-fill from the old table.
- `services/shared/src/algo/learner.ts` — already pure; add a `surface: 'discover' | 'dtm'`
  generic so callers tell it which profile they're updating.
- `learnerLoop.ts` (worker) — read both reward streams, route each by
  `obs.ctx.sf` to the right profile.
- `contextAwareRewards.ts` — already tags with surface; expose
  `splitBySurface(samples)` returning `{ discover: [], dtm: [] }`.
- Tests: a discover reward must not move dtm weights, and vice-versa.

### Phase E — DTM feed module (parallel to forYouV6)
There is no DTM ranker today; `dtmV6` is a pair scorer, not a feed builder.
- New: `services/shared/src/algo/dtmFeedV7.ts` — pure builder that takes the
  user's DTM weight profile + a candidate DTM topic pool + recent answer history
  and returns the next batch of topics to ask about. Recipe (sums to 1.0):
  - 0.30 topicCoverageGap (least-answered topics weighted by importance)
  - 0.20 weightAffinity (topics user's profile assigns highest weight to)
  - 0.15 freshness (haven't asked in N days)
  - 0.15 reciprocityHook (topics that produced highest mutual_quality_chat lift)
  - 0.10 emotionalArc (vary tone: warm → playful → reflective → light)
  - 0.10 cohortSignal (topics popular among the user's archetype peers)
- Penalties: recently abandoned topic (`dtm.partial_abandon`), recently
  skipped (`dtm.question_skip`).
- Output: `{ batch: TopicId[10], reasons: Map<TopicId, ReasonChip[]> }`.
- Tests: 12+ tests; cold-start path (no profile → coverage-driven).

### Phase F — "Show 10, breathe, next 10" pagination
- New: `services/shared/src/algo/batchLadder.ts` — a stateful (per session)
  builder. API:
  ```
  nextBatch(state, candidates, k=10) → { batch, nextState, breatheMs }
  ```
- `breatheMs` = 1800–3200ms, randomized per batch, biased by recent latency.
  Felt-time, not real-time.
- State carries: cursor, archetype-bucket history, MMR memory, fatigue counts,
  per-surface learner snapshot at batch creation (so within a 10, ranking is
  stable; between 10s, the learner can update).
- Discover gateway: replace single-shot `/discover` with `/discover/batch`
  that returns `{ items[10], nextCursor, breatheMs }`. Web SDK waits
  `breatheMs` after rendering before requesting next batch — but allows the
  user to pull-to-refresh to skip the breath.
- Tests: idempotency, cursor stability, breathe range, exhaustion path.

### Phase G — "Right Now" composer
The composer is what makes the feed feel current. Per request:
1. Read live envelope (lh, wd, sn, sf) + last 5 minutes of user activity.
2. Compute `RightNowSignal` = blend of:
   - hourBias from `insights.hourTotals` (warm hours score higher)
   - surfaceMomentum (clicks/scrolls per minute on this surface, last 90s)
   - recencyHeat (≥ 1 dwell ≥ 800ms in last 60s → +0.10)
   - moodGuess (rage-click rate last 5m → damp by 0.15 if hot)
3. Pass as a multiplier into pipeline S4 policy_rerank.
- New: `services/shared/src/algo/rightNow.ts` (pure). 8+ tests.
- No model. All deterministic. Sub-millisecond budget.

### Phase H — Miamo Move v4: human voice
The hardest phase. Move suggestions today read like form-filler. Goal: a friend's
nudge.
- New: `services/shared/src/algo/moveVoice.ts` — pure templater that takes
  `{ archetype, situation, lastInbound, deepCompat, hourBucket }` and returns
  ONE short line ≤ 90 chars, lowercase-first preferred, contractions OK,
  no exclamation marks, no "I think", no "based on", no "as an AI", no robotic
  framings. Tone matrix:
  - wordsmith → reflective ("ask her about the place she keeps coming back to")
  - voice_first → casual ("send a 12-second voice — say what you're cooking")
  - visual → tactile ("snap whatever's on your desk right now")
  - fast_replier → quick ("two-word reply to her last message; she'll bite")
- Forbidden phrase list (`FORBIDDEN_TONES`): "I noticed", "Based on", "As per",
  "It seems", "You might want to", "Consider", em-dash, "—", "ai", "miamo
  suggests", "we recommend".
- Linter test: every output of every template variant under 1000 random
  contexts passes the forbidden-phrase filter.
- Update `messageSuggest.ts` and `moves.ts` to compose final UI strings via
  `moveVoice.render(template, context)` instead of returning template names.
- Continuous improvement: a `moveVoice.calibrate(observations)` function takes
  recent send→reply outcomes per template and bumps in-model template weights.
  Persist per-user template weights in `UserMoveProfile.voiceWeights JSON`.
- 25+ tests covering tone matrix, forbidden phrases, and length cap.

### Phase I — `/me/insights` HTTP + per-surface split
- Gateway route: `GET /v1/me/insights?surface=discover|dtm` that calls
  `buildInsights({ snapshot: snapshotProfile(profile[surface]), rollup })`
  and serializes.
- Rate-limit via existing `TokenBucketLimiter`. Auth via existing JWT middleware.
- 6+ tests (200 happy, 401 no token, 400 bad surface, surface isolation,
  decisiveness range, hotspots ordering).

### Phase J — Algorithm sweep (every ranker consumes tracking)
For each algorithm in the inventory, ensure it reads at least one tracking-derived
signal. Specifically:
- `new.ts`, `verified.ts`, `serious.ts` → add `RightNowSignal` multiplier.
- `messageSuggest.ts`, `moves.ts` → consume `moveVoice` calibration weights.
- `beats.ts` → consume `insights.hourTotals` (chrono-aware tracks).
- `feedAugment.ts` → consume per-surface scroll-depth history.
- `searchAugment.ts` → consume `search.no_results` recency for query rewriting.
- `notifTimingV6` → consume per-user `notif.look_no_act` history with EWMA decay.
- All `dtmTopic*.ts` modules — pick the **top 16** that map to the canonical
  topic ordering and wire them into `dtmFeedV7.cohortSignal`. Delete the
  remainder (~ 230 files); they're dead weight. Add deletion list to CHANGELOG.

### Phase K — Continuous-learning loop hardening
- Schedule: `learnerLoop.ts` runs every 5 minutes per user with new rewards
  (was every 15). Cap CPU at 50ms/user.
- Drift detection per surface; if drift on either, bump that surface's
  exploration rate, NOT the other.
- Per-surface decay: Discover half-life 14d, DTM half-life 30d (DTM is slower).
- Tests: 6+ scenarios.

### Phase L — Final wiring + flag flip
- Flip flags: `ALGO_V6_ENABLED=true`, `ALGO_V6_DTM_ENABLED=true`,
  `PIPELINE_S{1..5}_ENABLED=true`, `LEARNER_V7_SPLIT=true`,
  `BATCH_LADDER_V7=true`, `RIGHT_NOW_V7=true`, `MOVE_VOICE_V4=true`.
- Smoke: `scripts/algo-smoke.ts` validates each flag combination on a synthetic
  user.
- Update `CHANGELOG.md`, `MIAMO.md` "What's new", and create a single
  `docs/V7_RUNBOOK.md` (rollback steps per phase).

---

## 3. Files the agent will create or modify

**New pure modules (all in `services/shared/src/algo/`)**:
- `dtmFeedV7.ts` + tests
- `batchLadder.ts` + tests
- `rightNow.ts` + tests
- `moveVoice.ts` + tests

**Modified pure modules**:
- `learner.ts` (surface generic)
- `contextAwareRewards.ts` (splitBySurface)
- `messageSuggest.ts`, `moves.ts`, `beats.ts`, `feedAugment.ts`,
  `searchAugment.ts`, `notifTimingV6.ts`, `new.ts`, `verified.ts`,
  `serious.ts` (consume new signals)

**Schema changes**:
- `EventAggHourlyBySurface` model
- `DiscoverWeightProfile` + `DtmWeightProfile` (replaces `UserWeightProfile`)
- `UserMoveProfile.voiceWeights JSON`

**Validators**:
- `v6Validators.ts` extended for ~25 new schemas

**Service wiring**:
- Discover ProfileCard → cards.ts collector
- Discover swipe handler → swipe.ts collector
- Messaging composer → firstMove + msg.* events
- Matches → safety + match.hold/unhold
- Notifications inbox → notification.* events
- Search bar → search.* events
- Gateway: `/discover/batch`, `/me/insights`

**Deletions (~230 files)**:
- All `dtmTopic*.ts` not in the canonical-16 list
- Legacy event names per Phase A list

---

## 4. Definition of Done

- [ ] 11/11 packages typecheck clean
- [ ] All tests pass (target ≥ 12,600 — current 12,431 + ~170 new)
- [ ] Every event in `events.ts` has either a v6Validator schema OR a CHANGELOG
      deletion entry
- [ ] `cards.ts` and `swipe.ts` are wired (grep `cardTracker.\|swipeTracker.`
      finds ≥ 5 call sites in `services/web/src/`)
- [ ] DTM page exists at `services/web/src/app/(main)/dtm/` and emits the full
      DTM event family
- [ ] `npm run smoke` passes against a local dev DB
- [ ] `/v1/me/insights?surface=discover` and `?surface=dtm` return distinct
      decisiveness/concentration values for the same user (proves split)
- [ ] `moveVoice` linter rejects 100% of forbidden-phrase strings; 1000 random
      contexts produce 0 forbidden outputs
- [ ] Pull-to-refresh on Discover skips the breathe; auto-paginated batches
      respect breatheMs ± 200ms
- [ ] Single squashed PR description + one-line summary in `MIAMO.md`

---

## 5. What NOT to do

- Do not introduce a model server, ONNX runtime, or external ML inference.
  Everything stays deterministic / pure / sub-ms.
- Do not break v4 / v5 algo paths. They remain dispatcher fallbacks.
- Do not raise envelope/event bandwidth above today's level. If a new collector
  adds volume, lower another's sample rate to keep total flat.
- Do not write new `.md` docs except `V7_RUNBOOK.md`. Update existing files.
- Do not add comments that explain WHAT the code does. Only WHY when non-obvious.

---

## 6. Operating cadence inside each phase

1. Read existing code (semantic_search + grep — don't guess).
2. Write the pure module + its test file.
3. `npm run typecheck` — fix until 11/11 green.
4. Vitest the new file in isolation — fix until green.
5. `npm run test:full` — fix until green (retry once on flake; consult
   `/memories/repo/algo-module-gotchas.md`).
6. Wire into services.
7. Re-run typecheck + full tests.
8. `git add -A && git commit -m "<prefix>: <phase> — <one-line>"` and push.

---

## 7. Tone/voice acceptance test (Phase H gate)

Sample prompts the agent must pass before Phase H closes. Given:
- `archetype = wordsmith`, `lastInbound = "I went hiking yesterday"`,
  `hourBucket = 22`, `deepCompat.topTopic = "growth"`

Pass examples (all sub-90 chars, friendly):
- `"ask her what the trail did to her head"`
- `"hiking story is begging for a follow-up about the hardest moment"`
- `"trade her one of yours — that thing you almost didn't post"`

Fail examples (must be rejected by the linter):
- `"Based on her hiking interest, I suggest asking..."`  ❌ "Based on", AI tone
- `"You might want to ask her — what was the hike like?"`  ❌ "You might want", em-dash
- `"Consider sending a thoughtful response!"`  ❌ "Consider", "!"
- `"As an AI, I think she'd appreciate..."`  ❌ "As an AI"

---

## 8. After everything green

Print exactly:

```
V7 LANDED.
- Phases: A through L
- Tests: <N> passing
- New collectors wired: <list>
- Surface-isolated learners: discover + dtm
- Move voice v4: <K> templates, 0 forbidden hits / 1000 contexts
- Batch ladder: 10 + ~<M>ms breathe
- Insights endpoint: live for both surfaces
```

Then update `/memories/repo/algo-module-gotchas.md` with anything sharp learned
in this run (decay-clock signs, schema migration order, voice-template traps).
