# Tracking + Algorithm Inventory (Phase 1)

> Read-only inventory of the Miamo repo as it stands on the
> `feat/total-tracking-v4` branch starting point. Used as the baseline for
> the Phase 2 (TRACKING_V4_SPEC) and Phase 3 (algorithm uplift) work.

---

## 1. Tracking events currently emitted

### From `services/shared/src/track/events.ts`

All event names are declared in the `EVENT_NAMES` union and validated by the
ingest envelope.

| Family | Event name | Where emitted | Payload keys |
|---|---|---|---|
| Session | `session.start` | [collectors/visibility.ts](../../services/web/src/lib/track/collectors/visibility.ts) | `vis` |
| Session | `session.heartbeat` | visibility collector (30s) | — |
| Session | `session.end` | visibility collector | — |
| Consent | `consent.update` | [index.ts](../../services/web/src/lib/track/index.ts) | scope flags |
| Nav | `page.view` | [collectors/route.ts](../../services/web/src/lib/track/collectors/route.ts) | `path` |
| Nav | `page.leave` | route collector | `from` |
| Nav | `route.change` | route collector | `from`, `to` |
| Attention | `impression` | [collectors/autotrack.ts](../../services/web/src/lib/track/collectors/autotrack.ts) | `name`, `w` |
| Attention | `dwell` | autotrack | `name` |
| Scroll | `scroll.depth` | [collectors/scroll.ts](../../services/web/src/lib/track/collectors/scroll.ts) | `depth` |
| Scroll | `scroll.idle` | scroll collector | `depth` |
| Click | `click` | [collectors/cursor.ts](../../services/web/src/lib/track/collectors/cursor.ts) | `sel`, `x`, `y`, `dwellMs` |
| Click | `click.rage` | cursor collector | `sel`, `count` |
| Click | `click.dead` | cursor collector | `sel` |
| Cursor | `cursor.sample` | cursor collector (~16Hz) | `x`, `y` (0–100) |
| Visibility | `visibility.change` | visibility collector | `state` |
| Form | `form.focus` | [collectors/forms.ts](../../services/web/src/lib/track/collectors/forms.ts) | `field`, `form` |
| Form | `form.change` | forms collector (every 8th keystroke) | `field`, `form`, `edits` |
| Form | `form.submit` | forms collector | `form` |
| Form | `form.error` | forms collector | varies |
| Perf | `perf.web_vitals` | [collectors/perf.ts](../../services/web/src/lib/track/collectors/perf.ts) | LCP/INP/CLS/TTFB/FCP |
| Error | `error.js` | [collectors/errors.ts](../../services/web/src/lib/track/collectors/errors.ts) | error context |
| Error | `error.network` | errors collector | error context |
| Discover | `discover.card_view` | UI call sites | varies |
| Discover | `discover.swipe` | UI call sites | varies |
| Discover | `discover.match` | UI call sites | varies |
| Discover | `discover.boost_view` | UI call sites | varies |
| Messaging | `msg.thread_open` | chat surface | varies |
| Messaging | `msg.compose_start` | chat surface | varies |
| Messaging | `msg.send` | chat surface | varies |
| Messaging | `msg.read` | chat surface | varies |
| Messaging | `msg.reaction` | chat surface | varies |
| Messaging | `msg.voice_record` | chat surface | varies |
| Profile | `profile.view` | profile pages | varies |
| Profile | `profile.edit` | profile editor | varies |
| Album | `album.upload` | album UI | varies |
| Album | `album.view` | album UI | varies |
| Album | `album.unlock_request` | album UI | varies |
| DTM | `dtm.question_view` | DTM quiz | varies |
| DTM | `dtm.answer` | DTM quiz | varies |
| DTM | `dtm.complete` | DTM quiz | varies |
| Vibe | `vibe.check_start` | vibe quiz | varies |
| Vibe | `vibe.check_complete` | vibe quiz | varies |
| Beats | `beats.play` | beats UI | varies |
| Beats | `beats.skip` | beats UI | varies |
| Moves | `moves.play` | moves UI | varies |
| Date | `date.plan_open` | date planner | varies |
| Date | `date.plan_save` | date planner | varies |
| Custom | `custom` | escape hatch | varies |

Legacy hook: `useTrackActivity()` in
[services/web/src/hooks/useTrackActivity.ts](../../services/web/src/hooks/useTrackActivity.ts)
fires `legacy.*` events to both the legacy API and the v3.1 pipeline.

---

## 2. Tracking schema definitions

- **Envelope + types**: [services/shared/src/track/events.ts](../../services/shared/src/track/events.ts)
  - `SCHEMA_VERSION = 1`
  - `ContextHeader`: `v, did, sid, uid?, path?, ref?, loc?, tzo?, vw?, vh?, dpr?, ua?, cs?`
  - `TrackEvent`: `e, t, n, p?, tid?, tt?, d?`
  - `TrackEnvelope`: `{ ctx, evts[] }`
  - Caps: `MAX_EVENTS_PER_BATCH = 50`, `MAX_ENVELOPE_BYTES = 32 KB`
- **Ingest validation**: [services/ingest/src/validate.ts](../../services/ingest/src/validate.ts)
  - `ContextSchema`, `EventSchema`, `EnvelopeSchema` (strict; rejects `v ≠ 1`).
  - Per-event payloads are intentionally loose; per-feature shape lives with the consumer.

---

## 3. Tracking worker jobs

[services/tracking-worker/src/index.ts](../../services/tracking-worker/src/index.ts) wires:

| Worker | Reads | Writes | Cadence | Key env |
|---|---|---|---|---|
| `RollupConsumer` | Redis stream `events:raw` (group `rollup`) | `EventAggHourly`, `EventAggDaily` | `XREADGROUP COUNT=500 BLOCK=2000ms`, flush every 5s | `TRACKING_READ_COUNT`, `TRACKING_READ_BLOCK_MS`, `TRACKING_FLUSH_MS` |
| `FeatureAggregator` | `EventAggHourly`, `EventAggDaily` | `FeatureSnapshot` | every 5 min, batch 200 | `FEATURE_INTERVAL_MS`, `FEATURE_BATCH` |
| `CompatWriter` | `EventAggDaily`, `FeatureSnapshot` | `PairCompatCache` | every 15 min, 200 × 50 → top-20 | `COMPAT_INTERVAL_MS`, `COMPAT_ACTIVE_LIMIT`, `COMPAT_CANDIDATES`, `COMPAT_TOPK` |
| `EnrichmentWorker` | `EventAggHourly`, DTM rows | `FeatureSnapshot.raw` (peakHours, cadenceVec, dtmVec) | every 30 min | `ENRICH_INTERVAL_MS`, `ENRICH_PEAK_TOP_N`, `ENRICH_PEAK_DAYS`, `ENRICH_CADENCE_DAYS`, `ENRICH_DTM_DAYS` |
| `EmbeddingWorker` | (stub — gated) | (stub) | gated by `ALGO_V4_WORKERS_ENABLED` | — |
| `ColdStore` | (stub) | (stub) | — | — |
| `DailyMatchWorker` | (stub — gated) | (stub) | gated by `ALGO_V4_WORKERS_ENABLED` | — |

Files: [rollup.ts](../../services/tracking-worker/src/rollup.ts),
[feature.ts](../../services/tracking-worker/src/feature.ts),
[compat.ts](../../services/tracking-worker/src/compat.ts),
[enrich.ts](../../services/tracking-worker/src/enrich.ts),
[embeddings.ts](../../services/tracking-worker/src/embeddings.ts),
[cold-store.ts](../../services/tracking-worker/src/cold-store.ts),
[daily-match.ts](../../services/tracking-worker/src/daily-match.ts).

---

## 4. Algorithms inventory

All registered in [services/shared/src/algo/registry.ts](../../services/shared/src/algo/registry.ts).

| Algorithm | File | Function | WEIGHTS | Flag | SignalReader calls | Test count |
|---|---|---|---|---|---|---|
| forYou | [forYou.ts](../../services/shared/src/algo/forYou.ts) | `scoreForYou()` | `interestCos 0.25, vibeCos 0.20, behaviorCos 0.20, chronoOverlap 0.10, prior 0.10, intentMatch 0.05, distance 0.05, ageDelta 0.05` | `ALGO_V4_RANK_ENABLED_DISCOVER` | `features`, `pairCompat`, `priorTargets` | 8 |
| aiPicks | [aiPicks.ts](../../services/shared/src/algo/aiPicks.ts) | `scoreAiPicksV4()` | `forYou 0.30, cf 0.20, active 0.15, serious 0.10, explore 0.10, matchHistoryAffinity 0.10, vibeMomentum 0.05` | DISCOVER | via sub-models | 4 |
| new | [new.ts](../../services/shared/src/algo/new.ts) | `scoreNew()` | `recency 0.40, forYou 0.30, verified 0.20, completeness 0.10` | DISCOVER | scoreForYou | 2 |
| active | [active.ts](../../services/shared/src/algo/active.ts) | `scoreActive()` | `liveness 0.35, responseRate 0.25, replySpeed 0.20, forYou 0.10, chrono 0.10` | DISCOVER | `features`, scoreForYou | 3 |
| verified | [verified.ts](../../services/shared/src/algo/verified.ts) | `scoreVerified()` | `forYou 0.60, idBoost 0.25, antiSpam 0.15` | DISCOVER | scoreForYou | 3 |
| serious | [serious.ts](../../services/shared/src/algo/serious.ts) | `scoreSerious()` | `forYou 0.30, dtmDepth 0.25, lovelang 0.15, completeness 0.15, intentMatch 0.15` | DISCOVER | scoreForYou | 3 |
| cf | [cf.ts](../../services/shared/src/algo/cf.ts) | `cfScore`, `cfScoresByHash` | `affinity 0.8, support 0.2` | DISCOVER | reads `CfNeighbourCache` | 3 |
| dtm | [dtm.ts](../../services/shared/src/algo/dtm.ts) | `dtmAffinity`, `dtmTopicGaps` | `dtmAffinity 1` | DISCOVER (via serious) | reads `FeatureSnapshot.raw` | 4 |
| moves | [moves.ts](../../services/shared/src/algo/moves.ts) | `scoreMove`, `suggestMoves` | `pairAffinity 0.30, notRepeating 0.25, candidateLastAction 0.20, timeOfDayFit 0.15, deepCompatTopic 0.10` | `ALGO_V4_RANK_ENABLED_MESSAGING` | `features` (via inputs) | 5 |
| messageSuggest | [messageSuggest.ts](../../services/shared/src/algo/messageSuggest.ts) | `scoreSuggestion`, `suggestMessages` | `attentionFit 0.30, recencyFit 0.25, noveltyFit 0.20, intentFit 0.15, chronoFit 0.10` | MESSAGING | `features` | 4 |
| beats | [beats.ts](../../services/shared/src/algo/beats.ts) | `scoreBeat`, `pickBeats` | `genreFit 0.35, tempoFit 0.25, novelty 0.20, chronoFit 0.10, trendingBoost 0.10` | `ALGO_V4_RANK_ENABLED_BEATS` | `features` | 2 |
| notifyTiming | [notifyTiming.ts](../../services/shared/src/algo/notifyTiming.ts) | `nextNotifyAt` | `peakFit 1` | `ALGO_V4_RANK_ENABLED_NOTIFICATIONS` | reads `FeatureSnapshot.raw.peakHours` | 3 |
| searchAugment | [searchAugment.ts](../../services/shared/src/algo/searchAugment.ts) | `rerankSearch` | `text 0.55, forYou 0.35, freshness 0.10` | `ALGO_V4_RANK_ENABLED_SEARCH` | scoreForYou | 1 |
| feedAugment | [feedAugment.ts](../../services/shared/src/algo/feedAugment.ts) | `rerankFeed` | `source 0.50, forYou 0.30, recency 0.20` | `ALGO_V4_RANK_ENABLED_FEED` | stateless | 1 |
| postImpressionRerank | [postImpressionRerank.ts](../../services/shared/src/algo/postImpressionRerank.ts) | `postImpressionPenalty` | `penalty 1` | DISCOVER | stateless | 3 |
| aiMatch | [aiMatch.ts](../../services/shared/src/algo/aiMatch.ts) | `pickAiMatch` | `ensemble 1` | `ALGO_V4_RANK_ENABLED_AIMATCH` | via aiPicks | 2 |

Helpers: [math.ts](../../services/shared/src/algo/math.ts),
[hash.ts](../../services/shared/src/algo/hash.ts),
[lru.ts](../../services/shared/src/algo/lru.ts),
[consent.ts](../../services/shared/src/algo/consent.ts),
[flags.ts](../../services/shared/src/algo/flags.ts).

---

## 5. SignalReader interface

Defined in [services/shared/src/algo/signals.ts](../../services/shared/src/algo/signals.ts):

```ts
interface SignalReader {
  hashOf(userId: string): string;
  features(uidHash: string): Promise<FeatureRow | null>;
  pairCompat(aHash: string, bHashes: string[]): Promise<Map<string, PairRow>>;
  recentEvents(uidHash: string, evts: string[], days: number): Promise<EvtCount[]>;
  priorTargets(aHash: string, bHashes: string[], days: number): Promise<Map<string, number>>;
  targetImpressions(aHash: string, bHashes: string[], days: number): Promise<Map<string, number>>;
  dailyMatch(uidHash: string): Promise<{ bHash: string; score: number; computedAt: string } | null>;
}
```

`FeatureRow` exposes: `uidHash, chronotype, attentionProfile, rageClickRate,
deadClickRate, swipeRightRatio, replyPersonaP50Ms, responseRate, interestVec
(32), vibeEmb (64), behaviorEmb (64), peakHours[]`.

`PairRow` exposes: `aHash, bHash, interestCos, vibeCos, behaviorCos, magnetCos,
chronoOverlap, cadenceOverlap, priorInteractionScore, finalScore, computedAt`.

LRU caches: `features` 2048/60s, `pairs` 8192/30s.

---

## 6. Prisma models for tracking + signals

From [services/shared/prisma/schema.prisma](../../services/shared/prisma/schema.prisma):

| Model | Notable fields |
|---|---|
| `UserActivity` | `userId, action, targetType, targetId, metadata, durationMs, sessionId, createdAt` |
| `ConsentEvent` | `userId, did, scope, granted, region, source, createdAt` |
| `EventAggHourly` | `uidHash, evt, bucket, count, durSum, durP50, durP95, meta` |
| `EventAggDaily` | `uidHash, evt, day, count, durSum, uniqTargets, meta` |
| `FeatureSnapshot` | `uidHash (PK), computedAt, chronotype, replyPersonaP50Ms, replyPersonaP90Ms, responseRate, rageClickRate, deadClickRate, dwellToDecisionP50, swipeRightRatio, attentionProfile, interestVec (Bytes), vibeEmb (Bytes), behaviorEmb (Bytes), cityCenterLat, cityCenterLng, raw (JSON)` |
| `PairCompatCache` | `aHash, bHash, computedAt, interestCos, vibeCos, behaviorCos, magnetCos, cityKm, ageDelta, intentMatch, chronoOverlap, cadenceOverlap, priorInteractionScore, finalScore` |
| `BeatEvent` | `beatId, userId, type, content, createdAt` |

---

## 7. Web tracking SDK

Public exports from [services/web/src/lib/track/index.ts](../../services/web/src/lib/track/index.ts):
`track(), identify(), setConsent(), getConsent(), flush(), mount(), unmount()`.

Collectors installed by `mount()`:
`installRoute, installVisibility, installScroll, installCursor, installForms,
installErrors, installPerf, installAutotrack` (each in
[services/web/src/lib/track/collectors/](../../services/web/src/lib/track/collectors/)).

Transport: [transport/batcher.ts](../../services/web/src/lib/track/transport/batcher.ts).
Flushes every 5s OR 30 events OR 30KB. Endpoint
`NEXT_PUBLIC_TRACK_ENDPOINT` (default `/api/v1/track`). Gated by `analytics`
consent.

---

## 8. Feature flags

Algo (all default `0`): `ALGO_V4_RANK_ENABLED_DISCOVER`,
`ALGO_V4_RANK_ENABLED_MESSAGING`, `ALGO_V4_RANK_ENABLED_BEATS`,
`ALGO_V4_RANK_ENABLED_NOTIFICATIONS`, `ALGO_V4_RANK_ENABLED_SEARCH`,
`ALGO_V4_RANK_ENABLED_FEED`, `ALGO_V4_RANK_ENABLED_AIMATCH`,
`ALGO_V4_RANK_ENABLED_DEEPCOMPAT`, `ALGO_V4_WORKERS_ENABLED`.

Tracking: `NEXT_PUBLIC_TRACKING_ENABLED`, `TRACKING_KILL`,
`TRACKING_HASH_SECRET`, `TRACKING_STREAM_KEY`, `TRACKING_GROUP`.

Worker cadence: `FEATURE_INTERVAL_MS`, `FEATURE_BATCH`, `COMPAT_INTERVAL_MS`,
`COMPAT_ACTIVE_LIMIT`, `COMPAT_CANDIDATES`, `COMPAT_TOPK`,
`ENRICH_INTERVAL_MS`, `ENRICH_PEAK_TOP_N`, `ENRICH_PEAK_DAYS`,
`ENRICH_CADENCE_DAYS`, `ENRICH_DTM_DAYS`.

---

## 9. Gaps vs the master prompt §2.1

| # | Family | Status | Critical missing pieces |
|---|---|---|---|
| 1 | Session lifecycle | partial | network change, battery, app-version, device class, dark/light, reduced-motion, viewport size detail |
| 2 | Navigation | partial | back/forward intent, deep link entry, tab switch, share-target |
| 3 | Visibility & attention | minimal | window resize, fullscreen, PiP, idle 5s, away 30s, return-from-away |
| 4 | Card / profile impressions | **missing** | visible-50/100%, dwell samples 250/750/2000/5000/10000ms, bio expand/collapse, photo index change, hover-over-block-or-report |
| 5 | Swipe + decision telemetry | **missing** | swipe-start, velocity, distance, abort, hesitation latency, undo, regret (undo<3s), repeat-pass |
| 6 | Cursor + pointer | partial | per-card enter/leave, hover dwell, velocity histogram, idle-cursor 3s, long-press, right-click, double-click, drag, press-without-click |
| 7 | Scroll | partial | velocity bands, time-in-bands, scroll-to-bottom, scroll-back-up, rubber-band |
| 8 | Form & input | partial | blur, first-keystroke latency, CPM bins, backspace ratio, paste, autofill, abandonment |
| 9 | Chat / messaging | partial | scroll history, typing-started/stopped, typing-duration, drafted-then-deleted, time-to-reply, conversation pause/resume |
| 10 | Media | **missing** | photo zoom/swipe, video play/pause/seek, mute, fullscreen |
| 11 | Social actions | partial | unmatch, block, report, boost, gift, save, share |
| 12 | Discovery & search | **missing** | filter open/change/apply/reset, search query (hashed), result click, no-results |
| 13 | Notifications | **missing** | shown/opened/dismissed/snoozed, settings change |
| 14 | Onboarding & profile | partial | step entered/completed/skipped, time-to-complete, photo reorder, prompt-answered detail, voice-prompt-recorded |
| 15 | Performance & errors | present | long-task >200ms, slow-api >1s, sse-disconnect/reconnect, retry-storm |
| 16 | Idle / passive | partial | idle-5s, away-30s, return-from-away, still-here pings at 2/5/10min, fg-without-action |
| 17 | Intent micro-signals | **missing** | CTA hover, price hover, profile settle, bookmark/save, screenshot, copy-to-clipboard |

**Verdict.** Foundational pipeline (SDK → ingest → stream → worker → ledger →
SignalReader) is solid. ~10 of 17 families have partial coverage. The
high-value missing families for matching quality are **#4 (card impressions),
#5 (swipe telemetry), #6 (cursor), #16 (idle/away), #12 (filters)** — those
unlock `hesitationFit`, `regretPenalty`, `repeatPassDamp`, `attentionFit`,
`returnRate`, all of which the upgraded `forYou` and re-rankers want to read.

This is the baseline the rest of this branch builds on.
