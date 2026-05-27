# notifications

## 1. Purpose

Stores in-app notifications and decides **when** to deliver them. Internal endpoint accepts notification creates from any service; if v4 timing is enabled, stamps `scheduledFor` via `nextNotifyAt` so the worker can release at a user-optimal hour.

## 2. Mental model

```
   ┌─────────┐  POST /internal/notifications  ┌─────────────────┐
   │ social  │ ─────────────────────────────► │ notifications   │
   │messaging│                                │   :3206         │
   │  etc.   │                                │                 │
   └─────────┘                                │ 1. sanitise     │
                                              │ 2. nextNotifyAt │
                                              │ 3. INSERT row   │
                                              │ 4. push to SSE  │
                                              └────────┬────────┘
                                                       ▼
                                      POST /internal/push-event → gateway → browser
```

## 3. Public surface

| Method | Path | Auth | Purpose | Source |
|---|---|---|---|---|
| GET | `/api/v1/notifications` | bearer | List (optional `?unread=1`, cursor) | [server.ts](src/server.ts#L24) |
| GET | `/api/v1/notifications/count` | bearer | Unread count | [server.ts](src/server.ts#L43) |
| POST | `/api/v1/notifications/:id/read` | bearer | Mark read | [server.ts](src/server.ts#L52) |
| POST | `/api/v1/notifications/read-all` | bearer | Mark all | [server.ts](src/server.ts#L66) |
| POST | `/api/v1/notifications/mark-read` | bearer | Bulk by ID list | [server.ts](src/server.ts#L71) |
| POST | `/internal/notifications` | `x-internal-key` | Create + broadcast (stamps `data.scheduledFor` if v4 flag) | [server.ts](src/server.ts#L84) |
| POST | `/internal/notifications/schedule` | `x-internal-key` | Compute next optimal time only (v4) | [server.ts](src/server.ts#L119) |

## 4. Data model

Writes `Notification`. Reads `FeatureSnapshot` (via `PrismaSignalReader`) for `peakHours`/`quietHours` when the flag is on.

## 5. Dependencies

| Talks to | Why | How |
|---|---|---|
| Postgres | Notification row + signal read | Prisma |
| gateway | SSE fan-out via `/internal/push-event` | HTTP |
| `services/shared/src/algo/notifyTiming` | optimal hour | in-process |

## 6. Configuration

| Env | Default | Purpose |
|---|---|---|
| `PORT` | `3206` | HTTP port |
| `DATABASE_URL` | — | Postgres |
| `INTERNAL_SERVICE_KEY` | — | Internal-call auth |
| `GATEWAY_URL` | `http://localhost:3200` | SSE push target |
| `ALGO_V4_RANK_ENABLED_NOTIFICATIONS` | `0` | Stamp `scheduledFor` |

## 7. Worked example — schedule a notification

```bash
# A service (e.g. social) calls notifications when a match is created:
curl -X POST http://notifications:3206/internal/notifications \
  -H 'x-internal-key: <INTERNAL_SERVICE_KEY>' \
  -H 'content-type: application/json' \
  -d '{
    "userId": "<uid>",
    "type": "match.new",
    "title": "It's a match!",
    "body": "Say hi to Alex",
    "data": { "matchId": "<mid>" }
  }'
```

When `ALGO_V4_RANK_ENABLED_NOTIFICATIONS=1`:

```
1. sanitise title/body
2. features = reader.features(reader.hashOf(userId))
3. when    = nextNotifyAt({ now: Date,
                            peakHours: features.peakHours ?? [10,13,20],
                            quietHours: features.quietHours ?? [0..7,23],
                            lastSent: features.lastNotifyAt,
                            minSpacingSec: 3600,
                            tzOffsetMin: features.tzOffsetMin ?? 0 })
4. INSERT Notification ... data.scheduledFor = when
5. POST /internal/push-event → SSE bell badge update immediately
   (the *push* dispatch reads scheduledFor later)
```

## 8. Local dev

```bash
cd services/notifications
npx prisma generate --schema=../shared/prisma/schema.prisma
npm run dev
```

## 9. Tests

`notifyTiming` covered by `tests/algo-e2e.test.ts`.

## 10. Failure modes & operational notes

- **FeatureSnapshot missing** → falls back to defaults (`peakHours=[10,13,20]`, `quietHours=[0..7,23]`). No errors surfaced.
- **SSE push fail** → notification row is still saved; bell badge will refresh on next manual poll.
- **`minSpacingSec`** prevents notification storms; raise during incidents.

## 11. What changed & why it's good

- **Before:** Push went out the moment an event happened — sometimes during sleep hours.
- **After:** When v4 timing is on, the scheduler picks the user's next peak hour outside quiet hours and respects a min-spacing.
- **Why it matters:** Open rates improve and complaints drop. The behaviour is gated and reversible with one env var.
