# miamo-ingest

Edge ingest service for the v3.1 behavioral tracking pipeline.

- `POST /v1/track` — accept batched event envelopes (Zod-validated). Returns 204 always.
- `POST /v1/track/forget` — right-to-erasure stub.
- `GET  /v1/track/healthz` — liveness.

**Env**

| var | default | notes |
| --- | --- | --- |
| `PORT` | 3260 | |
| `REDIS_URL` | — | when missing, events are dropped silently |
| `TRACKING_HASH_SECRET` | dev-only | HMAC secret for uidHash; rotate to break joins |
| `TRACKING_STREAM_KEY` | `events:raw` | redis stream key |
| `TRACKING_STREAM_MAXLEN` | 10_000_000 | approximate XADD trimming |
| `TRACKING_KILL` | — | set to `1` to short-circuit all writes |
| `CORS_ORIGIN` | `http://localhost:3100` | comma-separated allow list |

**Hard guarantees**

- No synchronous Postgres writes from the request path.
- Returns 204 on success, malformed input, DNT header, or kill switch.
- Per-device rate limit drops silently (no 429).
- Body cap 64 KB; events per batch capped via `MAX_EVENTS_PER_BATCH`.
