# tracking-worker — the back-room clerks (port 3261)

**TL;DR:** tracking-worker is the team of back-room clerks (consumers of the receipt printer) who read events from the Redis Stream, aggregate them, and write the features the 17 ranking algorithms read.

---

## How to read this

- **Meera**: Sections 1–2.
- **Priya / PM**: Sections 1–4.
- **Engineer**: All.

---

## 1. A scene

9:02pm Priya generates 47 events. By 9:02:13 they are on the Redis stream. By 9:02:23 (10s flush) the rollup consumer has counted them into `EventAggHourly`. By 9:07 the FeatureSnapshot job has updated her `chronotype`, `attentionProfile`, and `impressionsLast48h`. By 9:17 the PairCompatCache has a fresh row for her × Arjun. The next time she opens Discover, the ranking already reflects what she just did.

**An event at 21:02 is influencing Discover by 21:17 at the latest.**

---

## 2. What this service is responsible for

One pod runs multiple loops, each a different clerk job:

| Job                | File                | Cadence       | Writes to                              |
|--------------------|---------------------|---------------|----------------------------------------|
| RollupConsumer     | `rollup.ts`         | continuous, flush every 10s | `EventAggHourly`, `EventAggDaily`, `EventTargetAgg` |
| FeatureAggregator  | `feature.ts`        | every 5 min   | `FeatureSnapshot`                      |
| CompatWriter       | `compat.ts`         | every 15 min  | `PairCompatCache`                      |
| EmbeddingWorker    | `embeddings.ts`     | every 30 min  | `ProfileEmbedding`                     |
| EnrichmentWorker   | `enrich.ts`         | every 60 min (flag-gated) | various enrichment tables |
| DailyMatchWorker   | `daily-match.ts`    | every 24 h    | `DailyMatch` (top-1 per user)          |
| ColdStore          | `cold-store.ts`     | every 1 h     | S3 + XTRIM the stream                  |
| RightToBeForgotten | `forget.ts`         | on-demand     | DELETE-cascade across tables           |

---

## 3. The stream contract

```
key:        events:raw
maxlen:     ~100000
group:      rollup
consumer:   <HOSTNAME>-<pid>      (unique per pod, XACKs prevent duplicates)
read cmd:   XREADGROUP COUNT 500 BLOCK 2000ms
```

When the worker successfully writes its rollup, it `XACK`s the entries. If the DB write fails, it does **not** XACK — the message redelivers next read.

---

## 4. Worked example — chronotype derivation

```
EventAggDaily for Priya, last 24h:
  hour 06  → 4 events
  hour 19  → 80 events
  hour 20  → 80 events
  total 224

morning (5..12) = 42
day     (12..18)= 18
evening (18..23)= 160
night   (23..5) = 4

peak = evening
peak / total = 160 / 224 = 0.71  ≥ 0.45  → chronotype = 'evening'
```

This row is what `forYou.chronoOverlap` will read for Priya in the next ranking call.

---

## 5. Tables it writes

- `EventAggHourly` (uidHash, evt, hour) → count, durSum
- `EventAggDaily`  (uidHash, evt, day)
- `EventTargetAgg` (uidHash, targetHash, evt, day) — for CF
- `FeatureSnapshot` — chronotype, attentionProfile, rageClickRate
- `PairCompatCache` — viewerHash × candidateHash cached score
- `ProfileEmbedding` — for searchAugment / feedAugment
- `DailyMatch` — top-1 daily aiMatch row

---

## 6. Code layout

```
services/tracking-worker/src/
├── server.ts                  # health + metrics
├── rollup.ts                  # continuous loop
├── feature.ts
├── compat.ts
├── embeddings.ts
├── enrich.ts
├── daily-match.ts
├── cold-store.ts
├── forget.ts
└── buckets.ts                 # PercentileEstimator, DistinctCounter helpers
```

---

## 7. Configuration

| Env var                          | What it does                                  |
|----------------------------------|-----------------------------------------------|
| `REDIS_URL`                      | Stream                                         |
| `DATABASE_URL`                   | Postgres                                       |
| `TRACKING_HASH_SECRET`           | Same as ingest. **Never rotate.**              |
| `ROLLUP_FLUSH_MS`                | Default `10000`                                |
| `FEATURE_INTERVAL_MS`            | Default `300000` (5 min)                       |
| `COMPAT_INTERVAL_MS`             | Default `900000` (15 min)                      |
| `EMBED_INTERVAL_MS`              | Default `1800000` (30 min)                     |
| `DAILY_MATCH_INTERVAL_MS`        | Default `86400000` (24 h)                      |
| `COLD_STORE_INTERVAL_MS`         | Default `3600000` (1 h)                        |
| `ALGO_V4_WORKERS_ENABLED`        | Master flag for the enrichment workers         |

---

## 8. Run locally / test

```bash
cd services/tracking-worker && pnpm dev   # 3261
redis-cli XINFO GROUPS events:raw           # observe lag
```

---

## 9. What changed and why it's better

- **Before:** raw events lived in Postgres as billions of rows. Queries were slow, indexes were huge, vacuum was painful.
- **After:** Postgres only sees compact aggregates. Workers retry safely via consumer-group XACKs. A new feature is one new loop, not a schema migration.
- **Why Priya feels it:** her clicks visibly influence her ranking within 15 minutes, every time.

---

## 10. If something breaks

| Symptom                              | First check                              | Fix                                  |
|--------------------------------------|------------------------------------------|--------------------------------------|
| `XLEN events:raw` growing past 100k  | Worker dead or DB writes failing         | Restart, scale replicas, check DB    |
| FeatureSnapshot rows stale > 1 h     | feature.ts loop crashed                  | Logs + restart                       |
| `chronotype` null for active user    | < 5 events in last 24h                   | Likely correct; check ingest path    |
| DailyMatch never populated           | `ALGO_V4_WORKERS_ENABLED='0'`            | Flip flag, restart                   |
