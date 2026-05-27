# tracking-worker

> The kitchen behind the mail slot. Reads events off the Redis Stream, folds them into features the algorithms can use.

## 1. The story (60 seconds)

Every event Priya generates ends up on the `events:raw` conveyor belt
in Redis. This service reads them off, buffers them in memory by
15-minute bucket, and every quarter-hour writes one tidy summary row
per user to Postgres. The next time `forYou` runs, Priya's most recent
behaviour is already baked into her ranking.

## 2. What this service is (in one picture)

```mermaid
flowchart LR
    R[(Redis Stream<br/>events:raw)] --> TW[tracking-worker :3261]
    TW --> Feat[(Postgres<br/>UserActivity15m<br/>CandidateInteraction15m<br/>DailyMatch<br/>…)]
    TW --> Cold[(Cold store<br/>S3-compatible)]
    TW -. exposes .-> Status[/healthz<br/>/v4/status]
```

## 3. What it can do (the menu)

| Job                | Cadence    | What it does                                              |
|--------------------|-----------:|-----------------------------------------------------------|
| RollupConsumer     | continuous | XREADGROUP from `events:raw`, buffer by 15-min bucket      |
| FeatureAggregator  | 15 min     | Flush buffers → `UserActivity15m`, `CandidateInteraction15m` |
| CompatWriter       | 15 min     | Recompute compat scores for recently active pairs          |
| EmbeddingWorker    | 30 min     | Refresh profile embeddings for changed users               |
| EnrichmentWorker   | 60 min     | Optional ML enrichment (flag-gated)                         |
| DailyMatchWorker   | 24 h       | Compute the next-day `DailyMatch` per user                 |
| ColdStore          | 1 h        | Move raw events older than 1h to cold storage              |

HTTP endpoints (for ops):

| Endpoint              | Returns                                          | Source |
|-----------------------|--------------------------------------------------|--------|
| `GET /healthz`        | `{ok:true}` if Redis + Postgres reachable        | [src](services/tracking-worker/src/server.ts) |
| `GET /v4/status`      | Lag per job, last-run-at, queue depth             | [src](services/tracking-worker/src/server.ts) |

## 4. The data it writes

- **`UserActivity15m`** — one row per (userHash, 15-min bucket).
- **`CandidateInteraction15m`** — one row per (viewerHash, candidateHash, bucket).
- **`DailyMatch`** — overnight curated pick per user.
- **`CompatScore`** — current compat for active pairs.
- **`ProfileEmbedding`** — vector representation of each profile.

## 5. Who it talks to

- **Redis** — XREADGROUP from `events:raw`.
- **Postgres** — writes feature tables.
- **Cold store** — periodic S3 dump.

## 6. The knobs (configuration)

| Env var                                  | What it does                                       | Example | What breaks                              |
|------------------------------------------|----------------------------------------------------|---------|------------------------------------------|
| `REDIS_URL`                               | Where to read events                               | …       | nothing to consume                        |
| `DATABASE_URL`                            | Where to write features                            | …       | service won't start                       |
| `TRACKING_HASH_SECRET`                    | Verify userHash determinism (must match ingest)    | …       | userHashes mismatch — data appears split  |
| `ALGO_V4_WORKERS_ENABLED`                 | If `'0'`, skip optional jobs (enrichment, DTM)     | `'1'`   | Daily picks/enrichment stale              |
| `ROLLUP_INTERVAL_SEC`                     | Aggregator cadence                                 | `900`   | too low = DB write churn; too high = stale |
| `COLD_STORE_AFTER_SEC`                    | Move raw older than this to cold                   | `3600`  | Redis OOM if too high                     |
| `STREAM_NAME`                             | Defaults `events:raw`                              | …       | empty stream                              |
| `CONSUMER_GROUP`                          | Defaults `tw-rollup`                               | …       | duplicate consumption if multiple groups  |
| `PORT`                                    | Listen port for healthz/status                     | `3261`  | k8s liveness fails                        |

## 7. A real example, end-to-end

3,142 raw events from 50k active users land in one 15-min bucket.

```
21:00:00  bucket starts
21:00:01–21:14:59  events stream in, buffered in memory by (userHash, bucket)
21:15:00  FeatureAggregator fires
21:15:02  buffer drained → ~50,000 rows INSERT INTO "UserActivity15m"
21:15:02  ColdStore moves events older than 1h to S3
21:15:03  next bucket begins
```

After: `forYou` reading at 21:15:30 sees the new data.

Check status:
```bash
curl http://localhost:3261/v4/status
```
```json
{
  "rollupConsumer": { "lagMs": 124, "lastEventAt": "2026-05-27T21:15:01Z" },
  "featureAggregator": { "lastRunAt": "2026-05-27T21:15:02Z", "rowsWritten": 49823 },
  "dailyMatchWorker": { "lastRunAt": "2026-05-27T03:00:14Z" }
}
```

## 8. Run it on your laptop

```bash
docker compose up -d redis postgres ingest
cd services/tracking-worker && npm install && npm run dev
# fire a test event with curl from the ingest README, watch it appear
redis-cli XLEN events:raw
```

## 9. How we know it works (tests)

- **`rollup.test.ts`** — 100 fake events for 5 users → exactly 5 rollup rows.
- **`consumer.test.ts`** — events ACKed only after successful DB write.
- **`cold-store.test.ts`** — events older than threshold leave Redis.

## 10. If something breaks

| Symptom                            | First check                                       |
|------------------------------------|---------------------------------------------------|
| `events:raw` length growing         | this service dead — `kubectl logs -l app=tracking-worker` |
| Rollup rows have 0 in every column   | RollupConsumer ACKing but not buffering — bug      |
| Stale DailyMatch                     | `ALGO_V4_WORKERS_ENABLED='0'`                      |

## 11. What changed and why it's better

- **Before:** algorithms read directly from raw event logs at query time — slow, expensive, often timed out.
- **After:** pre-aggregated 15-min features in Postgres; algorithms read a tiny indexed table.
- **Why Priya feels it:** Discover loads in <500ms even at peak. Her behaviour shows up in rankings within 15 min.
