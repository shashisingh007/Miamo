# feat: total activity tracking v4 + algorithm uplift v5

Implements Phases 1–5 of `docs/PROMPTS/MASTER_UPGRADE_PROMPT.md`. Phase 3 (algo upgrades) and Phase 4 (docs) are partially shipped in this PR — the vertical slice for `forYou v5` is end-to-end; the remaining 16 algorithms ship on this branch as follow-up commits before merge.

---

## What ships in this PR

### Tracking — Phase 2 (complete)
- 45 new `TrackEventName` values across 11 families (attention/idle, card impressions, swipe lifecycle, filters, search, notifications, media, lifecycle, intent micro, chat micro, perf/error). All additive — envelope `v=1` unchanged.
- 3 new web SDK collectors:
  - [attention.ts](services/web/src/lib/track/collectors/attention.ts) — wired into `mount()`. Idle@5s, away@30s, return on input, long_heartbeat@2/5/10min.
  - [swipe.ts](services/web/src/lib/track/collectors/swipe.ts) — imperative `swipeTracker`. Hesitation `d:hesitationMs`, regret (undo≤3s), repeat-pass session memory.
  - [cards.ts](services/web/src/lib/track/collectors/cards.ts) — imperative `cardTracker`. IntersectionObserver impressions, `card.impression.100` on exit with `d:dwellMs`, settle within 30s.

### Worker pipeline — Phase 2 (complete)
- `PercentileEstimator.histogram(edges)` — bins reservoir samples for free.
- Rollup writes `EventAggHourly.meta.hist` as a JSONB 5-tuple matching `HIST_EDGES_MS=[0,750,2000,5000,10000]` (= v5 `dwellHistogram` contract).
- `FeatureAggregator` derives 4 new keys into `FeatureSnapshot.raw`:
  - `dwellHistogram` (5 bins, L1-normalised)
  - `hesitationP50Ms` (median of per-hour `durP50` on `swipe.commit`)
  - `regretRate` (`swipe.regret` / `swipe.commit`)
  - `repeatPassRate` (`swipe.repeat_pass` / `card.impression.100`)

### Algorithms — Phase 3 (vertical slice: `forYou`)
- `forYou v5` behind `ALGO_V5_FOR_YOU_ENABLED` (default `0`).
- New positive ingredients: `attentionFit` (0.04), `hesitationFit` (0.04). Weights rebalanced so the sum is still 1.00.
- New behaviour-aware adjustments: `regretPenalty` (cap −8), `repeatPassPenalty` (hard −15), `returnBoost` (cap +6).
- New `SignalReader.pairBehavior()` reads per-target counts from `EventAggDaily.meta.targets`.
- Cache fast-path preserved — `PairCompatCache` stays version-agnostic; v5 applies adjustments on top of the cached normalised score, so **no migration** is required to ramp v5.

### Docs — Phase 4 (partial)
- `docs/TRACKING.md` — new "v4 additions" section.
- `docs/ALGORITHMS.md` — north-star metric section + complete `forYou v5` section with weights table, adjustments table, fresh Priya × Arjun worked example (10 terms + fatigue + return boost = ~73), rollback procedure.
- `docs/PROMPTS/INVENTORY.md` — Phase 1 baseline.

### Tests — Phase 5
- **225 → 256 passing** (+31 net new). `0` failures, `0` skipped.
- `services/shared/src/algo/__tests__/forYou.v5.test.ts` — 18 tests covering weights, helpers, penalties, dispatcher, golden Priya × Arjun.
- `services/tracking-worker/src/__tests__/feature.v5.test.ts` — 13 tests for the 4 new aggregator helpers + `histogram()`.
- `signal-coverage` guard extended: ~22 new operational events documented; chat/notification/filter/search events now declared on `messageSuggest`/`notifyTiming`/`searchAugment` `usesEvents`.
- `tests/algo-e2e.test.ts` fake `SignalReader` implements `pairBehavior()` (no-op map = v4 behaviour).

---

## Feature flags (all default `0`)

| Flag | Effect |
|---|---|
| `ALGO_V5_FOR_YOU_ENABLED` | Switches Discover ranking to v5 |
| `ALGO_V5_POST_IMPRESSION_RERANK_ENABLED` | Reserved (lands in follow-up commit) |
| `ALGO_V5_ACTIVE_ENABLED` | Reserved |
| `ALGO_V5_NOTIFY_TIMING_ENABLED` | Reserved |
| `ALGO_V5_MESSAGE_SUGGEST_ENABLED` | Reserved |

The v4 surface flags (`ALGO_V4_RANK_ENABLED_*`, `ALGO_V4_WORKERS_ENABLED`) are unchanged.

---

## Privacy review (per-event class)

| Family | Class | Notes |
|---|---|---|
| attention.* | quality | Boolean state changes only, no raw timestamps after hashing |
| card.impression.* | quality | dwell `d:ms` only, no coordinates |
| swipe.* | personalisation | direction + bucketed velocity (50 px/s) + ms; no raw coords |
| filter.* | personalisation | filter id + bucketed value, no free-text |
| search.* | personalisation | **query is SHA-256 hashed client-side**; only prefix + length leave device |
| notification.* | essential | server-correlated id only |
| media.* | quality | event + ms, no media id beyond own profile |
| lifecycle.* | essential | operational |
| intent.* | personalisation | tid only (HMAC-hashed server-side) |
| chat.* | personalisation | typing booleans + ms, never text content |
| error.* | essential | operational, name + ms |

All new events gated by the existing `analytics` consent (transport refuses to send when absent). No PII added to the event envelope.

---

## Rollback plan

**Zero-step rollback for the v5 algo**: set `ALGO_V5_FOR_YOU_ENABLED=0` (the default). Takes effect on the next request — no restart, no migration revert. `PairCompatCache` is version-agnostic so cached scores remain valid.

**For the worker-side changes** (rollup writes new `meta.hist`, feature aggregator writes new `raw.*` keys): these are purely additive — the v4 algo never reads them. Reverting the worker container to a previous image stops the new writes but leaves existing data in place.

**For the tracking SDK additions**: roll the web container back; the new events stop being emitted. Ingest will keep accepting them (they're in the enum, no schema break).

There is **no migration in this PR**. `EventAggHourly.meta` and `FeatureSnapshot.raw` are existing JSONB columns; we just write additional keys.

---

## Remaining work on this branch before merge

- [ ] `aiPicks v5` — add `returnRate` term (positive boost).
- [ ] `active v5` — smooth-decay over `lastActivityAt` including heartbeats.
- [ ] `notifyTiming v5` — daily per-user cap + `notification.dismissed/opened` learning.
- [ ] `messageSuggest v5` — typing-aware (drafted-then-deleted penalty).
- [ ] `postImpressionRerank v5` — dwell + `intent.profile.settle` positive; `swipe.repeat_pass` negative; reranks the **next** batch only.
- [ ] `cf v5` — dwell-weighted collaborative filter.
- [ ] `searchAugment v5` — penalise `search.no_results`, boost from `search.result_click`.
- [ ] `feedAugment v5` — `filter.*` signals into rerank.
- [ ] Other 8 algos (`new`, `verified`, `serious`, `dtm`, `moves`, `aiMatch`, `beats`, `forYou-companion`): ship v5 dispatchers that delegate to v4 verbatim with a code comment explaining no behavioural change (per master prompt §3 step 4 — "ship the new logic behind the flag with the old logic intact").
- [ ] Per-service READMEs + `docs/ARCHITECTURE.md` data-flow diagram + `docs/RUNBOOK.md` alerts.
- [ ] Phase 6 cleanup pass (callgraph audit, dead exports).

---

## Definition of Done (current PR slice)

- [x] Phase 1 inventory committed.
- [x] Phase 2 events + collectors shipped end-to-end (web SDK → ingest → worker → FeatureSnapshot.raw).
- [x] Phase 3 `forYou v5` shipped behind a flag (default off), v4 preserved verbatim.
- [x] Phase 4 docs for `forYou v5` + tracking additions.
- [x] Phase 5 test count strictly increased (225 → 256), zero regressions.
- [x] Conventional Commits used throughout (6 logical commits).
- [x] Privacy review per event family.
- [x] Rollback plan.
- [x] Branch pushed to `origin/feat/total-tracking-v4`; PR opened without `--force` and without `--no-verify`.
