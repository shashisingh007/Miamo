# ingest — the mailbox (port 3260)

**TL;DR:** ingest is the mailbox for tracking sticky notes (events from Priya's phone). One endpoint. Validates. Hashes. Drops onto the receipt printer (Redis Stream). Returns in 3ms.

---

## How to read this

- **Meera**: Sections 1–2.
- **Priya / PM**: Sections 1–3.
- **Engineer**: All.

---

## 1. A scene

9:02pm. Priya opens the app. In the first 30 seconds her phone fires 47 tracking sticky notes — session start, page views, impressions, dwell, swipe, match. The SDK bundles them into one envelope of up to 50 events / 32 KB and POSTs to `ingest:3260`. Three milliseconds later ingest returns `204 No Content`. The phone never blocks.

---

## 2. What this service is responsible for

- **One endpoint:** `POST /v1/track`.
- **Validate** the envelope and every event against Zod schemas in `services/shared/src/track/events.ts`.
- **Hash** the user id with HMAC-SHA256 + `TRACKING_HASH_SECRET` so the raw uid never enters the stream.
- **XADD** to Redis Stream `events:raw` with `MAXLEN ~100,000` (a never-ending receipt printer — events line up, each consumer tears off what's new).
- **Return** in single-digit ms. Fire and forget.

What it does **not** do: aggregate, store anything in Postgres, run algorithms. All of that is `tracking-worker`.

---

## 3. The envelope

```ts
{
  ctx: {
    v: 1,           // schema version (mismatch → 400)
    did, sid, uid?, // device, session, optional user
    path, ref, loc, tzo, vw, vh, dpr, ua, cs[]
  },
  evts: [           // 1..50 events
    { e, t, n, p?, tid?, tt?, d? }
  ]
}
```

Hard limits:

| Limit                  | Value     |
|------------------------|-----------|
| `MAX_EVENTS_PER_BATCH` | **50**    |
| `MAX_ENVELOPE_BYTES`   | **32 KB** |
| `SCHEMA_VERSION`       | **1**     |

---

## 4. Worked example

```
1. Phone   POST /v1/track   (1 envelope, 47 events, 3.2 KB)
2. Ingest  EnvelopeSchema.parse(body)         ~0.6 ms
3. Ingest  uidHash = HMAC-SHA256(secret, uid)
                       .digest('base64url')
                       .slice(0, 22)          ~0.05 ms
4. Ingest  for evt in evts: XADD events:raw * <json>   ~2 ms
5. Ingest  204                                 total ~3 ms p50, <15 ms p99
```

If Redis is unreachable: `events_dropped_total++`, still return `204` (fail-open by default). Configurable to fail-closed in production.

---

## 5. Code layout

```
services/ingest/src/
├── server.ts
├── validate.ts         # Zod EnvelopeSchema, EventSchema
├── hash.ts             # HMAC-SHA256 → base64url 22 chars
└── stream.ts           # XADD wrapper
```

---

## 6. Configuration

| Env var                       | What it does                                       |
|-------------------------------|----------------------------------------------------|
| `PORT`                        | 3260                                                |
| `REDIS_URL`                   | Whiteboard                                          |
| `TRACKING_STREAM_KEY`         | `events:raw`                                        |
| `TRACKING_STREAM_MAXLEN`      | `~100000`                                           |
| `TRACKING_HASH_SECRET`        | HMAC key. **Never rotate once data exists.**        |
| `INGEST_REQUIRE_SIG`          | If `1`, demand HMAC envelope signature              |
| `INGEST_FAIL_CLOSED`          | If `1`, return 5xx when Redis is down               |

---

## 7. Why is this a separate service

Because tracking volume dwarfs every other API call. At peak we move ~270 k events / second. We do not want that traffic anywhere near the request path that matters to Priya. Ingest is small, stateless, scales to dozens of pods, and surviving Postgres outages is normal — the data sits in Redis until the worker drains it.

---

## 8. Run locally / test

```bash
cd services/ingest && pnpm dev   # 3260
curl -X POST http://localhost:3260/v1/track \
  -H content-type:application/json \
  -d '{"ctx":{"v":1,"did":"d","sid":"s"},"evts":[{"e":"page.view","t":1,"n":0}]}'
```

---

## 9. What changed and why it's better

- **Before:** every tracked click was a synchronous Postgres insert on the user request path. Under load the inserts queued, the user request timed out, and we lost events anyway.
- **After:** events leave Postgres entirely on the hot path. Ingest returns in 3 ms. Worker aggregates later.
- **Why Priya feels it:** her swipes do not hitch. Even during traffic spikes the UI stays smooth.

---

## 10. If something breaks

| Symptom                                | First check                                  | Fix                                |
|----------------------------------------|----------------------------------------------|------------------------------------|
| `events_dropped_total` rising          | `redis-cli PING`                             | Redis OOM or down                  |
| 400 schema mismatch on every request   | SDK older than worker                         | Roll SDK forward / accept old version briefly |
| 413 payload too large                  | SDK not batching                              | Check `MAX_ENVELOPE_BYTES`         |
| `XLEN events:raw` ≥ 100,000             | Worker not draining                          | Scale `tracking-worker` replicas   |
