# v9 — Temporal Learning v2

**Status:** dark-shipped, default OFF (`ALGO_V9_TEMPORAL_LEARNING_ENABLED=0`).
**Owner:** ML / Personalization.
**Rollout tracker:** this doc, updated at each ramp step.

## Motivation

The v3.6 learner tracks per-user behaviour with a single 14-day half-life. That
smears "yesterday" and "three months ago" into one number and misses the class
of failure that shows up loudest in user testing: **preference drift**. Priya
liked spicy reels last week. This session she's scrolled past three in a row.
The v3.6 ranker still shows her the same category — because on a 14-day
half-life, three impressions don't move the score enough. She notices before
the ranker does.

v9 gives the ranker five simultaneous scores per (user, dimension) — one for
each timescale — and lets the ranker compare short-term to long-term to
detect drift *before the user consciously notices*.

## Model

Every observed event maps to a (dimension, score, timestamp) triple. Dimensions
are stable namespaced strings:

| Namespace  | Example                          |
|------------|----------------------------------|
| category   | `category:reels_spicy`           |
| hook       | `hook:hiking`                    |
| archetype  | `archetype:wordsmith`            |

For each (uidHash, dimension) we maintain five rows in `UserPreferenceHistory`,
one per window:

| Window     | Half-life | Purpose                                       |
|------------|-----------|-----------------------------------------------|
| right_now  | 90s       | Matches `intentRightNow` TTL                  |
| session    | 30 min    | One continuous session                        |
| week       | 7 days    | Matches `EventAggDaily` rollup                |
| month      | 30 days   | Matches `FeatureSnapshot` compat lookback     |
| lifetime   | 365 days  | Long tail — churned users still decay         |

Update rule (canonical EMA with time-based alpha):

```
survival = 2^(-elapsed / halfLife)      // 1 at elapsed=0, 0.5 at halfLife
score    = prev * survival + newValue * (1 - survival)
```

Out-of-order events (elapsed<0) collapse to no-op. See
`services/shared/src/algo/v9/multiTimescale.ts` for the pure primitives and
`__tests__/v9/multiTimescale.test.ts` for the invariants (score ∈ [0,1] under
any input, half-life decays correctly, monotonic under repeated identical
events).

## Drift detection

`detectDrift(rows)` returns one DriftSignal per dimension. The signed delta is:

```
max(|month - session|, |week - right_now|)  →  magnitude
sign(short-term - long-term)                →  direction ('cooling'|'warming')
```

Thresholds:
- Direction is 'stable' unless magnitude > `DRIFT_THRESHOLD` (0.3).
- Confidence is `min(totalSamples / DRIFT_CONFIDENCE_CAP, 1)`, clamped to 0
  below `DRIFT_MIN_SAMPLES` (10).

The worker emits `preference.drift_detected` when magnitude > 0.5 AND
confidence > 0.6. Priya's canonical case (month 0.85, session 0.15, 280
samples) clears both thresholds with a magnitude of 0.70 and confidence 1.0.

## Adjacent algorithms

**satiation.ts** — per-category boredom curves. `noveltyDemand(state)` is
`1 - 2^(-consecutive/halfLife)`. Half-lives per category:

| Category    | Half-life (impressions) |
|-------------|------------------------|
| reels_spicy | 15                     |
| meme        | 20                     |
| default     | 25                     |
| news        | 30                     |
| photography | 40                     |
| wholesome   | 100                    |

Counters reset after 5 consecutive skips.

**boredomPredictor.ts** — regression-based. Fits `dwellMs` vs `timestamp`
across a trailing impression window; a strongly negative slope with high R²
yields high boredom probability. Confidence is 0 below 20 samples.

**sessionVibe.ts** — heuristic classifier over the first ~60s of a session
into { casual_browse | serious_search | chat_first | content_consume |
photo_curate }. No ML — pure rule engine per constraint #5.

## Ranker integration

Behind `ALGO_V9_TEMPORAL_LEARNING_ENABLED`, the v8 `multiObjective.ts` accepts
two new inputs:

- `noveltyDemand ∈ [0,1] | null` — from `satiation.noveltyDemand`. Weight 0.05.
  Existing v8 weights shrink by (1 - 0.05) so the simplex still sums to 1.0.
- `driftDampen ∈ [0,1] | null` — from `detectDrift`. Applied as a
  multiplicative post-compose factor: `score *= 1 - drift * 0.15`. A cooling
  drift with magnitude 1.0 removes 15% of the score.

When the flag is OFF, both inputs are ignored and the score is bit-identical
to v8.

## Worker: preferenceWindows

Runs every 90 seconds. Per tick:

1. Read UserActivity rows from the last 90s (`PREFERENCE_WINDOWS_LOOKBACK_MS`).
2. Group by uidHash → dimension. Map each event to a score.
3. Load existing UserPreferenceHistory rows for the affected dimensions.
4. Call `updateAllWindows` per (user, dim) folding all events.
5. Upsert results in one `$transaction` with `ON CONFLICT DO UPDATE` and
   `GREATEST(existing, new)` on `computedAt` — last-write-wins with
   monotonic timestamps.
6. Run `detectDrift`, write `FeatureSnapshot.raw.drift` patch.
7. For each signal above the emit thresholds, insert a
   `preference.drift_detected` UserActivity row.

Batch size: 100 users per tick (`PREFERENCE_WINDOWS_BATCH_SIZE`). Errors are
counted, never re-thrown — the tick always returns.

## Rollout plan

| Week | Env                              | Flag | Expected effect                       |
|------|----------------------------------|------|---------------------------------------|
| 1    | dev / CI                         | 0    | No change; unit tests pass            |
| 2    | staging                          | 1    | UserPreferenceHistory populates; ranker ignores it (feature-flagged in ranker) |
| 3    | prod 10% (server-random gate)    | 1    | 10% traffic sees noveltyDemand + drift dampening; KPIs monitored |
| 4    | prod 30% → 100%                  | 1    | Full ramp assuming KPI thresholds hold |

## KPIs

Monitor at each ramp step. Ramp holds if any regresses more than 2σ:

- **7-day retention** — expected to rise (better fit → fewer drop-offs).
- **Session length p50** — expected to rise (novelty prevents boredom exit).
- **Match acceptance rate** — expected flat or up (drift dampening should
  suppress candidates the user is already tuning out).
- **Rage-click rate** — expected flat or down.
- **Prom counter `miamo_v9_preference_windows_runs_total`** — should tick
  every 90s. Zero delta over 5 min in prod fires the tracking-worker
  rollup-lag Sev2 alarm.
- **Counter `preference_windows_drift_emitted_total`** — should grow
  monotonically. Zero over 24h in prod at 100% ramp is suspicious — either
  no drift is occurring (unlikely) or the emit thresholds are miscalibrated.

## Failure modes & mitigations

- **Table hot-spot on high-cardinality dimensions.** The unique key
  `(uidHash, dimension, window)` is the hot path. Mitigation: batch-size
  cap + tick-cadence throttle keep steady-state writes below 10 rps per
  DB even at 100k MAU.
- **Preference thrash on a bursty user.** The right_now window can flip
  fast, but the session/week/month windows are heavily damped. Drift
  detection uses the longest-window comparison; a single bursty session
  cannot fire a false positive.
- **Concurrent writes to the same row.** Handled by the ON CONFLICT
  DO UPDATE with `GREATEST(computedAt)` — last-write-wins with
  monotonic timestamps. Property test locks this.
- **PII leak.** UserPreferenceHistory is keyed only by HMAC uidHash. No
  raw userId, no email, no phone. Constraint #6 held.

## Reference files

- `services/shared/prisma/schema.prisma:1132` — model definition.
- `services/shared/prisma/migrations/20260701_add_user_preference_history/migration.sql` — SQL.
- `services/shared/src/algo/v9/multiTimescale.ts` — pure EMA writer.
- `services/shared/src/algo/v9/driftDetector.ts` — drift signal computation.
- `services/shared/src/algo/v9/satiation.ts` — novelty / boredom curves.
- `services/shared/src/algo/v9/boredomPredictor.ts` — regression-based predictor.
- `services/shared/src/algo/v9/sessionVibe.ts` — session vibe classifier.
- `services/shared/src/algo/v8/multiObjective.ts` — ranker integration.
- `services/tracking-worker/src/preferenceWindows.ts` — the 90s worker loop.
- `services/shared/src/track/v6Validators.ts` — `preference.drift_detected` schema.
- `services/shared/src/algo/flags.ts` — `v9TemporalLearningEnabled()`.
