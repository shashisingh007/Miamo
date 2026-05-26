# miamo-tracking-worker

Background worker for the v3.1 telemetry pipeline. Runs three loops in one process:

| Loop | Source → Sink | Cadence |
| --- | --- | --- |
| `RollupConsumer` | Redis `events:raw` → `EventAggHourly`, `EventAggDaily` | continuous (XREADGROUP BLOCK 2s) |
| `FeatureAggregator` | `EventAggDaily/Hourly` → `FeatureSnapshot` | every 5 min |
| `/healthz` | — | on demand |

**Env**

| var | default |
| --- | --- |
| `PORT` | 3261 |
| `REDIS_URL` | — (loops disabled if unset) |
| `DATABASE_URL` | — |
| `TRACKING_STREAM_KEY` | `events:raw` |
| `TRACKING_GROUP` | `rollup` |
| `TRACKING_READ_COUNT` | 500 |
| `TRACKING_READ_BLOCK_MS` | 2000 |
| `TRACKING_FLUSH_MS` | 5000 |
| `FEATURE_INTERVAL_MS` | 300000 |
| `FEATURE_BATCH` | 200 |
| `TRACKING_KILL` | unset |

**Failure semantics**

- Redis read errors: back off 1s and retry.
- DB upsert errors: log and re-attempt on next flush (entries stay in PEL until XACK).
- Feature loop is best-effort; a bad uidHash skips, never crashes the loop.
- Set `TRACKING_KILL=1` to disable both loops without redeploy.

**Run locally**

```sh
cd services/tracking-worker
DATABASE_URL="postgresql://miamo:miamo@localhost:5432/miamo?schema=public" \
REDIS_URL="redis://localhost:6379" \
npm run dev
```
