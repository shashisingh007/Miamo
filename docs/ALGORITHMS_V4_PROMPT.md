# Miamo Algorithms v4 — Execution Brief

> **Purpose.** This document is the spec/prompt for rewriting every ranking,
> recommendation, and suggestion algorithm in Miamo to consume the v3.1
> behavioral tracking pipeline end-to-end. It is written as a self-contained
> brief: an engineer (or coding agent) given only this file + the repo should
> be able to implement, test, and ship v4 of the algo layer.
>
> **Scope.** Every surface that asks the question *"which X do we show, when,
> and why?"* — Discover (every filter), AI Match, Miamo Moves, DTM, message
> reply suggestions, beats, search, notification timing, story/feed ordering.
>
> **Non-goals.** Re-architecting the tracking pipeline (already done in v3.1),
> replacing Prisma/Postgres/Redis, adding any external ML SaaS dependency.

---

## 0. Inventory of available signals (DO NOT MISS ANY)

Every algorithm below MUST be wired against the appropriate subset of these.
A signal not used is a bug.

### 0.1 Raw event names (from `services/shared/src/track/events.ts`)

**Session / device / consent**: `session.start`, `session.heartbeat`,
`session.end`, `consent.update`.

**Navigation**: `page.view`, `page.leave`, `route.change`.

**Engagement primitives**: `impression`, `dwell`, `scroll.depth`,
`scroll.idle`, `click`, `click.rage`, `click.dead`, `cursor.sample`,
`visibility.change`.

**Forms**: `form.focus`, `form.change`, `form.submit`, `form.error`.

**Perf / errors**: `perf.web_vitals`, `error.js`, `error.network`.

**Discover**: `discover.card_view`, `discover.swipe` (dir = left | right |
super), `discover.match`, `discover.boost_view`.

**Messaging**: `msg.thread_open`, `msg.compose_start`, `msg.send`, `msg.read`,
`msg.reaction`, `msg.voice_record`. *(Legacy bridge also fires
`legacy.<action>` for every existing `trackActivity` call.)*

**Profile / album**: `profile.view`, `profile.edit`, `album.upload`,
`album.view`, `album.unlock_request`.

**DTM / quiz / vibe**: `dtm.question_view`, `dtm.answer`, `dtm.complete`,
`vibe.check_start`, `vibe.check_complete`. Plus the named ones we wired:
`lovelang.answer`, `lovelang.complete`, `compat.answer`.

**Beats / moves / date**: `beats.play`, `beats.skip`, `beats.send`,
`moves.play`, `date.plan_open`, `date.plan_save`.

### 0.2 Aggregates (hot tables, populated by tracking-worker)

| Table | Grain | Columns of interest |
| --- | --- | --- |
| `EventAggHourly` | (uidHash, evt, hour) | `count`, `durSum`, `durP50`, `durP95` |
| `EventAggDaily`  | (uidHash, evt, day)  | `count`, `durSum`, `uniqTargets`, `meta.targets: {bHash → count}` |

### 0.3 Per-user feature row (`FeatureSnapshot`, one per uidHash)

Scalar: `chronotype` (morning / day / evening / night / mixed),
`attentionProfile` (reader / scanner / voice-first / visual),
`rageClickRate`, `deadClickRate`, `swipeRightRatio`,
`replyPersonaP50Ms`, `replyPersonaP90Ms`, `responseRate`,
`dwellToDecisionP50`, `cityCenterLat`, `cityCenterLng`.

Dense vectors (Float32 LE buffers, L2-normalised):

- `interestVec` — 32d, bag-of-evts log-weighted over 30d.
- `vibeEmb`     — 64d, bag-of-evts with 14d linear recency decay.
- `behaviorEmb` — 64d, engineered (chronotype + attention one-hot + scalar
  behaviors) + hashed evt counts.

### 0.4 Per-pair compatibility cache (`PairCompatCache`, one per ordered pair)

`chronoOverlap`, `behaviorCos`, `priorInteractionScore`, `finalScore` are the
fields populated today by `services/tracking-worker/src/compat.ts`. v4 MUST
populate the remaining: `interestCos`, `vibeCos`, `magnetCos`, `cityKm`,
`ageDelta`, `intentMatch`, `cadenceOverlap`.

### 0.5 Legacy product signals (already in the schema)

User-level: `User.interests`, `Profile.{age, city, datingIntent, smoking,
drinking, kids, religion, education, occupation, prompts, ...}`,
`Photo[]`, `Verification`.

Interaction-level: `Like`, `Pass`, `Match`, `Block`, `Report`, `Bookmark`,
`Message`, `MessageReaction`, `VibeCheck`, `LoveLanguageResult`,
`CompatibilityResult`, `DtmAnswer`, `BeatCompletion`, `MoveSuggestion`,
`DatePlan`, `SearchLog`.

### 0.6 Consent gates (enforced at every read site)

- Any personalisation beyond a uniform random feed requires
  `cs ∋ 'personalization'` on the reading user's most recent `ConsentEvent`.
- Pair-compat cache may only be read when BOTH users granted
  `personalization`.
- The `behaviorEmb` cosine MAY be used without `personalization` because the
  vector is derived from the reading user's own behavior only.

---

## 1. Architecture

```
                ┌───────────────────────────────────────────────┐
                │            tracking-worker (3261)              │
                │  rollup → feature → embed → compat → coldstore │
                └───────────────────────────────────────────────┘
                                       │
                  reads (hot)          ▼          writes (hot)
                  ┌──────────────────────────────────────────┐
                  │  EventAggDaily · FeatureSnapshot         │
                  │  PairCompatCache                          │
                  └──────────────────────────────────────────┘
                                       ▲
                                       │
   ┌────────────┬──────────────┬───────┴──────┬────────────┬─────────────┐
   │  Discover  │   AI Match   │   Moves      │   DTM      │  Messaging  │ ...
   │   (social) │   (social)   │   (social)   │  (content) │ (messaging) │
   └────────────┴──────────────┴──────────────┴────────────┴─────────────┘
```

**New module to introduce**: `services/shared/src/algo/signals.ts` — a thin,
typed, *consent-aware* loader that each algorithm calls instead of touching
Prisma directly. Single source of truth for "how do I read this signal?".

```ts
// services/shared/src/algo/signals.ts
export interface SignalReader {
  features(uidHash: string): Promise<FeatureSnapshot | null>;
  pairCompat(aHash: string, bHashes: string[]): Promise<Map<string, PairCompat>>;
  recentEvents(uidHash: string, evts: string[], days: number): Promise<EvtCount[]>;
  priorTargets(uidHash: string, bHashes: string[]): Promise<Map<string, number>>;
}
```

Algorithms accept a `SignalReader` so they remain unit-testable with
in-memory fakes.

---

## 2. Algorithm specs

Every algorithm returns a **0..100 score** unless otherwise stated. Use
`compose(weights, signals)` with weights summing to 1.0 and documented per
surface. Every algorithm has an `explain()` companion returning the per-signal
breakdown for debugging and (eventually) the "why am I seeing this?" UI.

### 2.1 Discover — `forYou` (default)

**Inputs**: my `FeatureSnapshot`, my `interestVec` + `vibeEmb` + `behaviorEmb`,
candidate's same, `PairCompatCache(me, cand)` if present, legacy interest
overlap, distance, age delta, intent match.

**Formula** (weights tunable via env):
```
score = 100 * (
    0.25 * interestCos(meIv, candIv)          // hot vector cosine
  + 0.20 * vibeCos(meVe, candVe)
  + 0.20 * behaviorCos(meBe, candBe)
  + 0.10 * chronoOverlap(meChr, candChr)
  + 0.10 * priorInteractionScore              // log1p(count)/log(1000)
  + 0.05 * intentMatch                        // exact = 1, adjacent = 0.5
  + 0.05 * distanceDecay(cityKm)              // exp(-km/50)
  + 0.05 * ageDeltaDecay(|Δage|)              // exp(-Δ/8)
)
```

**Cache hit path**: read `finalScore` directly from `PairCompatCache` and
short-circuit when `computedAt > now - 30m`. Else fall back to the formula
above using the dense vectors.

**Anti-fatigue**: subtract `2 * log1p(impressionsLast48h)` so the same face
doesn't dominate after being shown 5+ times without action.

### 2.2 Discover — `new` (fresh profiles)

```
score = 100 * (
    0.55 * recencyDecay(now - createdAt, halfLife=72h)
  + 0.20 * interestOverlap(myInterests, theirInterests)   // Jaccard
  + 0.15 * behaviorCos                                    // gentle behavioral signal
  + 0.10 * profileCompleteness                            // photos+prompts+verification
)
```
*New users may have empty `FeatureSnapshot` — gracefully degrade behaviorCos
to 0 and renormalize remaining weights.*

### 2.3 Discover — `active` (recently engaged)

Uses tracking signals heavily.
```
activityScore = clip01(
    0.35 * sessionsPer7d(candHash) / 14                   // 2/day = max
  + 0.25 * responseRate(candFeatures)
  + 0.20 * (1 - normalize(replyPersonaP50Ms, 0..600000))  // faster = better
  + 0.20 * scrollDepthMedian(candHash) / 1.0
)
score = 100 * (0.60 * activityScore + 0.25 * behaviorCos + 0.15 * intentMatch)
```

### 2.4 Discover — `verified`

```
score = 100 * (
    0.40 * verifiedTrustLevel(cand)                       // 0/0.5/1
  + 0.25 * interestCos
  + 0.20 * rarityWeightedOverlap(myInts, candInts, popularity)
  + 0.15 * (1 - rageClickRate(candFeatures))              // calmer = trustier
)
```

### 2.5 Discover — `serious` (long-term intent)

```
score = 100 * (
    0.30 * intentMatch                                    // serious↔serious = 1
  + 0.25 * valuesCos(meValuesVec, candValuesVec)          // derived from prompts+DTM
  + 0.20 * cadenceOverlap                                 // reply cadence similarity
  + 0.15 * lifestyleMatch                                 // smoking/drinking/kids/religion
  + 0.10 * deepCompatibility(input).score / 100           // existing function
)
```

### 2.6 Discover — `aiPicks` (ensemble)

Sum-of-models, each contributing weighted vote:
```
finalScore = clip100(
    0.30 * forYou(me, cand)
  + 0.20 * collaborativeFilter(meHash, candHash)          // see §2.10
  + 0.15 * activeAlgo(me, cand)
  + 0.10 * seriousAlgo(me, cand)
  + 0.10 * exploreBoost(cand)                             // bandit ε=0.10
  + 0.10 * matchHistoryAffinity(me, cand)                 // trait reuse
  + 0.05 * vibeMomentum(candHash)                         // last-24h activity slope
)
```

### 2.7 AI Match (deep recommendations, top 10 per day)

Distinct from Discover — runs as a worker job, materialises into
`AiMatchSuggestion` rows.

```
score = 100 * (
    0.30 * cosine(meEmb_concat, candEmb_concat)           // [interest+vibe+behavior] concat 160d
  + 0.20 * priorInteractionScore
  + 0.15 * deepCompatibility(input).score / 100
  + 0.10 * chronoOverlap
  + 0.10 * cadenceOverlap
  + 0.10 * intentMatch
  + 0.05 * distanceDecay
)
```

Pre-filter: skip if `Block`, `Pass` within 30d, or already in `Match`.

### 2.8 Miamo Moves (suggested opener / icebreaker per match)

Move = one of {compliment, question, voice_note, photo_share, date_plan,
beat_send, gif, custom_prompt}.

Pick the top 3 moves by:
```
moveScore(move, pair) = 100 * (
    0.30 * pairAffinity(move.kind, candAttention)         // reader→question, voice-first→voice_note, ...
  + 0.25 * recencyOfLastSimilar(move.kind, pair) inverted // don't repeat
  + 0.20 * candidateLastAction(candHash)                  // if they just sent voice → voice back
  + 0.15 * timeOfDayFit(candChronotype, now)
  + 0.10 * deepCompatTopic(input).topMatchTopic           // pull from existing fn
)
```

Generation: each move kind has a small template library with `{vars}` filled
from the candidate's profile + DTM answers + recent shared interests.

### 2.9 DTM (Date the Matrimonial — separate ranking)

DTM has its own filter tab and demands stricter signals (religion, caste,
family stance). Same shape as Discover but different weights:

```
score = 100 * (
    0.25 * familyValuesMatch                              // religion/caste/family living arrangement
  + 0.20 * lifestyleMatch
  + 0.15 * intentMatch (intent must be 'marriage')        // hard filter outside the score
  + 0.15 * interestCos
  + 0.10 * deepCompatibility / 100
  + 0.10 * chronoOverlap
  + 0.05 * priorInteractionScore
)
```

Track: `dtm.question_view`, `dtm.answer`, `dtm.complete`. Build
`dtmAnswerVec` (binary feature vector over the canonical DTM questions),
write to `User.dtmAnswerVec` blob. Use Jaccard over answered + matched
booleans for `familyValuesMatch`.

### 2.10 Collaborative filter (used by `aiPicks` and AI Match)

Item-item CF on the `meta.targets` map.
For user U with target set T_U (rolled from EventAggDaily.meta.targets),
neighbour similarity:
```
sim(U, V) = |T_U ∩ T_V| / sqrt(|T_U| * |T_V|)        // cosine on implicit ratings
```
For candidate C, score = max over top-20 neighbours of `1[C ∈ T_neighbour]`.
Compute hourly in `tracking-worker`, materialise to `CfNeighbourCache(uidHash,
candHash, score)`.

### 2.11 Message reply suggestions (Messaging service)

When a user opens a thread, suggest 3 reply chips:

```
suggestionScore(template, thread) = (
    0.40 * topicRelevance(template, lastNMessages)
  + 0.30 * personalityFit(template, mePersona)            // reader → longer, scanner → shorter
  + 0.20 * styleFit(template, candidateReplyPersonaP50)   // fast reply → casual, slow → considered
  + 0.10 * noveltyVsRecent(template, mySentLastWeek)
)
```

Templates live in `services/messaging/src/templates/*.json`, scored at
request time. ALL must be PII-free.

### 2.12 Beats (daily streak prompts)

Pick the beat most likely to be completed:
```
score = (
    0.35 * pastCompletionRate(meHash, beat.kind)
  + 0.25 * timeOfDayFit(meChronotype, now)
  + 0.20 * partnerLastInteraction(pair, days_ago_decay)
  + 0.20 * noveltyVsLast7Days(beat.id)
)
```

Re-rank on every `/api/v1/beats` request. Persist chosen beat in
`UserData(type='daily_beat', key=YYYY-MM-DD)`.

### 2.13 Notification timing (push / in-app)

Use `chronotype` + `replyPersonaP50Ms` + `responseRate` to schedule
notifications at the user's peak engagement window.

```
sendAt(notif, user) = nextHourMatching(user.chronotype, [user.peakHours])
priority(notif) = notif.type_weight * user.responseRate * timeFit
```

Hard cap at 3 notifs / day / user; queue overflow gets dropped lowest-prio
first.

### 2.14 Search ranking (already implemented — augment)

Augment existing `scoreSearch` with:
```
+ 0.10 * priorInteractionBoost(meHash, candHash)
+ 0.10 * behaviorCos
```
Renormalise existing weights to make room.

### 2.15 Story / Feed item ranking (`scoreFeedItem`, augment)

```
+ 0.15 * authorBehaviorCos(meBe, authorBe)
+ 0.10 * authorChronoOverlap
+ 0.10 * topicRecencyFromMyEvts(author.topics, myRecentEvts)
```

### 2.16 Post-impression re-rank (NEW)

After we emit `impression` / `dwell` / `scroll.depth` for a Discover card, if
dwell > 4s OR scroll-back-up detected, boost that card's "siblings" (same
attention archetype) +5 in the next page request via a session-scoped
override list in Redis.

---

## 3. Worker additions

Add to `tracking-worker`:

1. **`CompatWriterV2`** — populates EVERY column of `PairCompatCache`
   (interestCos, vibeCos, magnetCos, cityKm, ageDelta, intentMatch,
   cadenceOverlap) not just the four we have today. `magnetCos` =
   cosine(meIv ⊕ meVe, candIv ⊕ candVe) where ⊕ is concat. Compose with
   weights matching `forYou`'s formula.

2. **`CfNeighbourWriter`** — hourly job, see §2.10.

3. **`PeakHoursWorker`** — for each uidHash, compute the 3 hour-of-day
   buckets with highest activity from `EventAggHourly`, write to
   `FeatureSnapshot.raw.peakHours = [h1, h2, h3]`.

4. **`CadenceWorker`** — for each pair already in `Match`, compute the
   inter-message delta distribution from `Message.createdAt`, derive
   `cadenceOverlap` and write to `PairCompatCache`.

5. **`DtmVectorWorker`** — when `dtm.complete` lands, materialise the user's
   `dtmAnswerVec` into `User.dtmAnswerVec`.

All five MUST honor `TRACKING_KILL=1`.

---

## 4. Consent enforcement (cross-cutting)

Wrap every signal read in `withConsent(uidHash, scope, fallback)`. If consent
absent → return `fallback` (typically a uniform-random or strictly
demographic-based score). Implement in `services/shared/src/algo/consent.ts`.

Audit: every algorithm's `explain()` MUST include `consentScope: 'full' |
'personalization-only' | 'analytics-only' | 'none'` so we can prove in court
which lane the user was scored under.

---

## 5. Testing — end-to-end, signal-by-signal

**Unit tests** (vitest, in `services/shared/src/algo/__tests__/`):

- `forYou.test.ts` — given fixed me/cand snapshots + cache hit + cache miss,
  assert score matches expected to 3 decimals. Include cold-start cand
  (no `FeatureSnapshot`) → assert weights renormalize correctly.
- `aiPicks.test.ts` — assert each model component contributes its declared
  share; assert `explore` injects ~10% novel cands.
- `moves.test.ts` — assert reader → question, voice-first → voice_note.
- `dtm.test.ts` — assert religion mismatch can't enter top 20 even with
  perfect interest cos.
- `cf.test.ts` — assert two users with shared targets get higher CF score
  than two with disjoint targets.

**Integration tests** (vitest, `tests/algo-e2e.test.ts`):

- Spin up Prisma against test DB, seed 50 users + 5k events, run the
  tracking-worker loops once each, then call every algorithm and assert:
  1. No algorithm throws.
  2. Every algorithm's top result has all of: `discoverScore`,
     `algorithm`, `explain` keys.
  3. The `explain` object references at least 3 tracking-derived signals.
  4. Removing the `personalization` consent flag causes every personalised
     score to drop to its fallback value.

**Tracking signal coverage assertion** — auto-generated test:
```ts
import { TRACK_EVENT_NAMES } from '@/shared/track/events';
import { ALGO_SIGNAL_REGISTRY } from '@/shared/algo/signals';
test('every event name is referenced by at least one algorithm', () => {
  for (const name of TRACK_EVENT_NAMES) {
    expect(ALGO_SIGNAL_REGISTRY.usedEvents.has(name)).toBe(true);
  }
});
```
Each algorithm registers the event names it consumes; the test guarantees we
never ship a tracked event that no algorithm uses (dead data).

**Manual smoke** (`scripts/algo-smoke.ts`): for a real seeded user, print the
top 10 Discover candidates per filter with the `explain` breakdown next to
each, plus the AI Match list and the Moves for the top match. Used in PR
review to eyeball that the signals are doing what we think.

---

## 6. Rollout plan

1. **Land §3 worker additions** behind a feature flag
   `ALGO_V4_WORKERS_ENABLED`. Verify caches populate.
2. **Land §2 algorithms** behind `ALGO_V4_RANK_ENABLED` (per surface), with
   A/B split: 50% v3 (current), 50% v4. Compare CTR / match rate / time-to-
   first-message over 7 days.
3. **Promote** to 100% per surface only when v4 ≥ v3 on the surface's North
   Star.
4. **Decommission** the old scoring fns once all surfaces are at 100%.

---

## 7. Deliverables checklist

The agent implementing this brief MUST produce, in order:

- [ ] `services/shared/src/algo/signals.ts` (SignalReader + Prisma impl)
- [ ] `services/shared/src/algo/consent.ts` (withConsent helper)
- [ ] `services/shared/src/algo/forYou.ts` (+ test)
- [ ] `services/shared/src/algo/new.ts` (+ test)
- [ ] `services/shared/src/algo/active.ts` (+ test)
- [ ] `services/shared/src/algo/verified.ts` (+ test)
- [ ] `services/shared/src/algo/serious.ts` (+ test)
- [ ] `services/shared/src/algo/aiPicks.ts` (+ test)
- [ ] `services/shared/src/algo/aiMatch.ts` (+ test, plus worker job)
- [ ] `services/shared/src/algo/moves.ts` (+ test, replaces generateSmartMoves)
- [ ] `services/shared/src/algo/dtm.ts` (+ test)
- [ ] `services/shared/src/algo/cf.ts` (+ test, plus CfNeighbourWriter)
- [ ] `services/shared/src/algo/messageSuggest.ts` (+ test, used by messaging service)
- [ ] `services/shared/src/algo/beats.ts` (+ test)
- [ ] `services/shared/src/algo/notifyTiming.ts` (+ test)
- [ ] `services/shared/src/algo/searchAugment.ts` (+ test, augments existing scoreSearch)
- [ ] `services/shared/src/algo/feedAugment.ts` (+ test, augments existing scoreFeedItem)
- [ ] `services/shared/src/algo/postImpressionRerank.ts` (+ test, Redis override list)
- [ ] `services/tracking-worker/src/compatV2.ts` (replaces compat.ts; full cache columns)
- [ ] `services/tracking-worker/src/cf-neighbours.ts`
- [ ] `services/tracking-worker/src/peak-hours.ts`
- [ ] `services/tracking-worker/src/cadence.ts`
- [ ] `services/tracking-worker/src/dtm-vector.ts`
- [ ] Discover endpoint switched to `algo/forYou` etc. via dispatch
- [ ] Messaging service uses `algo/messageSuggest` for `/suggestions`
- [ ] Beats endpoint uses `algo/beats`
- [ ] Notifications service uses `algo/notifyTiming` for scheduling
- [ ] AI Match worker job materialises top 10/day per user
- [ ] `tests/algo-e2e.test.ts` (the integration coverage test)
- [ ] `tests/algo-signal-coverage.test.ts` (every event used)
- [ ] `scripts/algo-smoke.ts`
- [ ] All flags wired: `ALGO_V4_WORKERS_ENABLED`, `ALGO_V4_RANK_ENABLED_<surface>`
- [ ] Each algorithm's `explain()` returns full breakdown including `consentScope`

**Definition of done**: every checkbox ticked, `npm test` green
(target ≥ 180 tests after v4), `tsc --noEmit` clean across web / social /
messaging / notifications / tracking-worker, signal-coverage test passing,
A/B framework live with v4 at 1% on `forYou` for an internal sanity check.

---

## 8. Anti-goals (do not do)

- **No external LLMs** for ranking. Templates yes, scoring no.
- **No per-request DB joins on tracking tables**. Always read from caches.
- **No bypass of consent gates** even in tests — fakes return the scoped
  fallback when scope absent.
- **No deletion of existing v3 algorithms** until v4 ships at 100%.
- **No new ML deps** without an explicit follow-up brief. The deterministic
  hashed embeddings we already ship are sufficient for v4.

---

## 9. Open questions (escalate before implementing)

1. Where does `dtmAnswerVec` live — `User` row or `UserData(type='dtm_vec')`?
2. Should `cadenceOverlap` consider message length too, or only inter-arrival?
3. The `magnetCos` weight in `forYou` is a guess — needs offline backtest.
4. Notification cap of 3/day — confirm with product before shipping.

End of brief.
