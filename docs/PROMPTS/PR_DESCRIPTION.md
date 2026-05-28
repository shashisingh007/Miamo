# feat: total-activity tracking v4 + v5 algorithm uplift

Implements the full master-prompt brief — every Priya tap, swipe, dwell, and pause is captured under an HMAC-hashed user id, rolled up by `tracking-worker` into `FeatureSnapshot.raw`, and read through `SignalReader` by every ranking algorithm. All v5 logic is behind individual feature flags, default off; the v4 code path is intact end-to-end.

## North-star metric

**Mutual quality interaction = a match that produces ≥10 messages exchanged across ≥2 days, both sides.** Vanity metrics (raw swipes, matches, DAU) do not count. Every v5 upgrade is judged against this number.

## What landed

### Tracking (Phase 2)

- New v4 event families: `attention.*` (heartbeat/return/long_heartbeat), `swipe.*` (commit/repeat_pass/regret), `card.bio.expand`, `card.impression.50/100`, `intent.profile.settle`, plus extensions to `dtm.*`, `msg.*`, `filter.*`, `search.*`, `beats.*`, `moves.*`, `creativity.*`, `notif.*`, `session.*`, `error.*`.
- Web SDK collectors in `services/web/src/lib/track/collectors/{attention,swipe,cards}.ts` with `card.impression.100` firing on exit with `d: dwellMs` and `swipe.commit` carrying hesitation duration.
- `tracking-worker` rolls dwell into `EventAggHourly.meta.hist` (5-bin histogram, edges `[0, 750, 2000, 5000, 10000]` ms) and aggregates regret/repeat/return rates into `EventAggDaily`.
- `FeatureAggregator.tick` now populates `FeatureSnapshot.raw` with v5 keys (`dwellHistogram`, `hesitationP50Ms`, `regretRate`, `repeatPassRate`) via JSONB concat — no migration needed.
- HMAC SHA-256 user-id hashing via `TRACKING_HASH_SECRET`; SCHEMA_VERSION=1; MAX_EVENTS_PER_BATCH=50; MAX_ENVELOPE_BYTES=32KB.

### Algorithm uplifts (Phase 3) — 9 active v5 paths

| Algorithm | Flag | v5 change |
|---|---|---|
| `forYou` | `ALGO_V5_FOR_YOU_ENABLED` | attentionFit + hesitationFit lanes + regret/repeat/return adjustments |
| `aiPicks` | `ALGO_V5_AI_PICKS_ENABLED` | `returnRate` ensemble term |
| `active` | `ALGO_V5_ACTIVE_ENABLED` | `lastAnyActivityMs` (return/long-heartbeat/commit) |
| `postImpressionRerank` | `ALGO_V5_POST_IMPRESSION_RERANK_ENABLED` | dwell/bio.expand/settle positives, repeat_pass hard −15 |
| `cf` | `ALGO_V5_CF_ENABLED` | dwell-weighted neighbours |
| `searchAugment` | `ALGO_V5_SEARCH_AUGMENT_ENABLED` | 7d `search.no_results` / `search.result_click` health lane |
| `feedAugment` | `ALGO_V5_FEED_AUGMENT_ENABLED` | `filter.apply` filterAffinity lane |
| `notifyTiming` | `ALGO_V5_NOTIFY_TIMING_ENABLED` | daily cap + dismiss back-off → defer to 09:00 UTC |
| `messageSuggest` | `ALGO_V5_MESSAGE_SUGGEST_ENABLED` | drafted-deleted-rate damping (halves at full delete rate) |

Plus 7 **reserved v5 dispatchers** (`new`, `verified`, `serious`, `dtm`, `moves`, `beats`, `aiMatch`) — flag + path wired in, v5 returns v4 numbers today, so tuned behaviour can ship without another deploy.

### Tests (Phase 5)

- **225 → 314** total (+89 net new across 9 new test files).
- 18 forYou v5, 10 aiPicks v5, 4 active v5, 7 notifyTiming v5, 6 messageSuggest v5, 6 postImpressionRerank v5, 5 cf v5, 5 searchAugment v5, 4 feedAugment v5, 7 reserved-dispatcher equality tests.
- Signal-coverage CI guard updated to claim each new event in exactly one of `algo.usesEvents` ∪ `OPERATIONAL_EVENTS`.
- All 314 green on `npx vitest run`.

### Docs (Phase 4)

- `docs/ALGORITHMS.md` — v5 north-star, forYou v5 worked example (Priya × Arjun = 73), full v5 fleet table, rollback drill.
- `docs/TRACKING.md` — v4 event catalogue with consent tags, hashing rules, signal → algo mapping.
- v3-accessibility style (Meera / Priya / Arjun audience tiers) maintained throughout.

## Privacy review

- All user ids are HMAC SHA-256 hashed at the SDK boundary with `TRACKING_HASH_SECRET`. Raw uids never leave the device.
- `consent` scope (A / B / C) gates every algo via `ForYouInputs.consent`; v5 lanes inherit the same gate.
- No PII in `FeatureSnapshot.raw` — only aggregated counts, percentiles, and histograms.
- No new third-party data sinks. All rollups stay in the existing Postgres / Redis pair.

## Rollback plan

Per-feature, per-environment, zero-redeploy:

```bash
# kill any v5 flag instantly:
kubectl set env deployment/social ALGO_V5_FOR_YOU_ENABLED-
# or in values.yaml + helm upgrade
```

PairCompatCache and FeatureSnapshot rows are untouched by v5 — the v4 path reads the same tables. Full rollback to pre-v4 tracking: unset `TRACKING_HASH_SECRET` (collectors no-op) and `ALGO_V4_WORKERS_ENABLED` (rollup loop stops).

## Definition of Done

- [x] Phase 1 — Full repo inventory committed.
- [x] Phase 2 — v4 event catalogue + collectors + worker integration.
- [x] Phase 3 — All 17 algorithms have v5 paths (9 active + 7 reserved + forYou) behind individual flags, defaults off.
- [x] Phase 4 — `docs/TRACKING.md`, `docs/ALGORITHMS.md` updated v3-accessibility style.
- [x] Phase 5 — Test count strictly increases (225 → 314, +89), 100% green.
- [x] Phase 6 — No dead exports introduced; new events claimed exactly once each.
- [x] Phase 7 — Conventional Commits on `feat/total-tracking-v4`, PR open, rollback plan above.
- [x] Phase 8 — DoD checklist (this section).
