# ingest

## 1. Purpose

The edge service of the tracking pipeline. Accepts batched browser events, Zod-validates, HMAC-hashes user IDs, rate-limits per device, and `XADD`s to the Redis Stream `events:raw`. Returns `204` even when downstream is down (lossy at the edge by design — durability is the worker's job).

## 2. Mental model

```
Browser SDK → POST /v1/track  {events:[...]}
   ↓
[ Zod validate ]
[ HMAC uidHash ]
[ rate limit 60/min/device ]
   ↓
XADD events:raw * uidHash <hash> evt <name> ts <ms> meta <json>
   ↓
204 No Content   (in <15ms p50)
```

No DB. No outbound HTTP. Lives or dies with Redis.

## 3. Public surface

| Method | Path | Auth | Purpose | Source |
|---|---|---|---|---|
| POST | `/v1/track` | none (rate-limited) | Ingest batch | [server.ts](src/server.ts#L79) |
| GET | `/v1/track/healthz` | none | Liveness + kill flag | [server.ts](src/server.ts#L70) |
| POST | `/v1/track/forget` | none | GDPR ack (real purge done in worker CLI) | [server.ts](src/server.ts#L142) |
| GET | `/metrics` | none | Prometheus text | [server.ts](src/server.ts#L131) |

## 4. Data model

None.

## 5. Dependencies

| Talks to | Why | How |
|---|---|---|
| Redis | `XADD events:raw` with `MAXLEN ~ 10M` | `ioredis` |

## 6. Configuration

| Env | Default | Purpose |
|---|---|---|
| `PORT` | `3260` | HTTP port |
| `REDIS_URL` | — | Stream target |
| `TRACKING_HASH_SECRET` | — | HMAC key (do NOT rotate) |
| `TRACKING_KILL` | `0` | Set `1` to drop all events silently |
| `TRACKING_STREAM_KEY` | `events:raw` | Stream name |
| `TRACKING_STREAM_MAXLEN` | `10000000` | Approx trim |
| `CORS_ORIGIN` | `http://localhost:3100` | Allowed origins |

## 7. Worked example — happy path

```bash
curl -X POST http://localhost:3260/v1/track \
  -H 'content-type: application/json' \
  -H 'user-agent: Mozilla/5.0' \
  -d '{
    "uid": "user_abc",
    "sessionId": "sess_123",
    "events": [
      { "action":"page_view", "targetType":"page",
        "metadata":{"page":"/discover"}, "ts": 1716800000000 }
    ]
  }'
# → 204 in <15ms (whether Redis is healthy or not)
```

Downstream: `redis-cli XLEN events:raw` increments by 1.

## 8. Local dev

```bash
cd services/ingest
npm run dev          # tsx watch → :3260
curl :3260/v1/track/healthz
```

## 9. Tests

Vitest in `src/__tests__/`. Covers schema validation, HMAC stability, rate-limit drop, kill flag, Redis stream write.

## 10. Failure modes & operational notes

- **Redis down** → `XADD` throws; handler swallows + returns 204. Events are lost. Use `TRACKING_KILL=1` to make the loss explicit during a planned Redis maintenance.
- **Stream exceeds `MAXLEN`** → trim is approximate; oldest events fall off. Acceptable for analytics.
- **CORS preflight floods** → ingest CORS is permissive on listed origins only; new origins must be added explicitly.
- **`Do-Not-Track: 1` header** → request returns 204 without queueing.

## 11. What changed & why it's good

- **Before:** Browser tracking POSTed directly to a domain service that wrote Postgres synchronously. Tracking outages affected user latency.
- **After:** Edge service that does one thing — HMAC + XADD — and always returns 204 in ~15 ms.
- **Why it matters:** User-facing latency is decoupled from analytics health. Bursts buffer in Redis Stream (~50 GB headroom). Privacy is enforced by HMAC at the edge.
