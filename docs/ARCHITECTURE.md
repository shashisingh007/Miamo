# Architecture — How the pieces fit together

**TL;DR:** Miamo is 11 small services (microservices) that share one Postgres database and one Redis cache. A tracking pipeline turns clicks into ranking signals.

---

## How to read this (pick your path)

**Non-technical readers:** Read sections 1–5 and 13. You'll understand how the pieces fit together and what happens when Priya taps a button. Skip sections 6–10 (they're for engineers).

**Engineers:** Read everything. Sections 6–12 are technical depth on request flows, encryption, and failures.

**Operators / SREs:** Focus on sections 11–13 (local vs production, debugging).

---

## 1. The big picture

It's 9pm. Priya's phone sends one HTTPS request to tap "Like". Here's what happens across 11 different boxes:

```mermaid
flowchart TB
    Phone["Priya's phone<br/>(Next.js web app)"]
    GW["gateway :3200<br/>(receptionist)"]
    Auth["auth :3201<br/>(login/signup)"]
    Users["users :3202<br/>(profile)"]
    Social["social :3203<br/>(discover)"]
    Msg["messaging :3204<br/>(chat)"]
    Content["content :3205<br/>(feed)"]
    Notif["notifications :3206<br/>(push)"]
    Ingest["ingest :3260<br/>(tracking edge)"]
    TW["tracking-worker :3261<br/>(event processor)"]
    
    DB["Postgres 16<br/>(filing cabinet)"]
    R["Redis 7<br/>(whiteboard)"]
    
    Phone -->|"all requests"| GW
    GW -->|"gateway checks"| R
    GW --> Auth
    GW --> Users
    GW --> Social
    GW --> Msg
    GW --> Content
    GW --> Notif
    
    Phone -->|"tracking only"| Ingest
    Ingest --> R
    R --> TW
    TW --> DB
    
    Auth --> DB
    Users --> DB
    Social --> DB
    Msg --> DB
    Content --> DB
    Notif --> DB
    GW -.->|"SSE push"| Phone
```

**11 boxes.** One filing cabinet (Postgres). One whiteboard (Redis). That's the whole system.

---

## 2. What each service does (in one sentence)

| Service | Does | Port |
|---------|------|------|
| **web** | Everything Priya sees on her phone (Next.js 14, SSR) | 3100 |
| **gateway** | The receptionist—rate-limits, verifies wristbands, proxies requests | 3200 |
| **auth** | Login, signup, password reset, issues wristbands (JWT) | 3201 |
| **users** | Profile, settings, search, bookmarks, blocks | 3202 |
| **social** | Discover (swipe stack), matches, AI suggestions | 3203 |
| **messaging** | Encrypted 1-to-1 chats | 3204 |
| **content** | Feed, stories, videos | 3205 |
| **notifications** | Smart push notifications (knows when to send) | 3206 |
| **ingest** | Door for tracking events—validates, enqueues, returns <15ms | 3260 |
| **tracking-worker** | Reads events from the queue, rolls them up, writes features | 3261 |
| **shared** | Library (not a service): Prisma schema + 17 algorithms + middleware | (no port) |

---

## 3. Why we split it this way (four reasons in plain English)

**1. Independent deploy:** A bug fix in `messaging` ships without restarting `auth`. Smaller blast radius, faster iteration.

**2. Blast radius:** If `content` has a bad post and starts crashing, the feed degrades—but Priya can still log in, swipe, and chat.

**3. Scale what's hot:** Discover gets 50× more traffic than password reset. We give `social` 10 Kubernetes pods and `auth` 2.

**4. Team ownership:** Each service has one CODEOWNERS team. A reviewer for `users` doesn't need to know how chats are encrypted.

---

## 4. A single "Like" request, step by step

Priya taps Like on Arjun. Her phone sends one HTTPS POST to the gateway:

```
POST /social/like
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
Content-Type: application/json

{"targetId": "arjun-uuid"}
```

Here's exactly what happens next:

```mermaid
sequenceDiagram
    participant P as Priya's phone
    participant G as gateway
    participant R as Redis
    participant S as social service
    participant DB as Postgres
    participant N as notifications
    
    P->>G: POST /social/like {targetId}
    
    Note over G: 1. Rate-limit check (Redis)
    G->>R: GET rl:priya:social.like
    R-->>G: 4 requests in 60s (limit is 30/min, OK)
    
    Note over G: 2. JWT verify (HS256, 15min expiry)
    G->>G: jwt.verify(token, JWT_SECRET)
    G-->>G: valid ✓ userId=priya-uuid
    
    Note over G: 3. Onboarding check (60s cache)
    G->>R: GET cache:onboard:priya-uuid
    R-->>G: complete ✓
    
    Note over G: 4. Forward to service
    G->>S: POST /like {targetId, userId}
    
    Note over S: 5. Save the Like
    S->>DB: INSERT INTO "Like" (priya-uuid, arjun-uuid)
    DB-->>S: inserted
    
    Note over S: 6. Check for reciprocal like
    S->>DB: SELECT * FROM "Like" WHERE fromId=arjun-uuid AND toId=priya-uuid
    DB-->>S: found ✓
    
    Note over S: 7. Create Match + Chat room
    S->>DB: INSERT INTO "Match" (priya-uuid, arjun-uuid)
    S->>DB: INSERT INTO "Chat" (participants=[...])
    DB-->>S: created, chatId=abc123
    
    Note over S: 8. Notify the other person
    S->>N: POST /internal/notify {userId: arjun, event: match}
    N-->>S: queued
    
    Note over S: 9. Return to gateway
    S-->>G: {matched: true, chatId: "abc123"}
    G-->>P: same JSON (~80ms total)
    
    Note over P: 10. Render and track (async)
    P->>P: show "It's a match!" toast
    P->>P: POST /v1/track {event: like, target: arjun} (fire-and-forget)
```

**Total time Priya feels waiting:** ~120ms. The heart turns red instantly (optimistic UI), the response just confirms.

**Key security points:**
- Gateway validates every request with a wristband (JWT token).
- Rate-limit on Redis means we can't be spammed.
- Social service never trusts the user ID from the phone; gateway passes it in a verified header.

---

## 5. The data layer: Postgres + Redis

**Postgres** (the permanent filing cabinet):
- 16 because it's stable and supports JSON columns (we store some Prisma relations as JSON).
- One shared schema (80+ models) managed by Prisma at `services/shared/prisma/schema.prisma`.
- Every service reads/writes the same database.
- Migrations are atomic—one `prisma migrate` command updates all tables.
- Trade-off: services aren't truly independent at the DB layer. Acceptable for our scale; revisit if any service hits >100k req/s.

**Redis** (the shared whiteboard—fast but wiped if the power goes off):
- 7 (latest stable).
- Three jobs:

| Job | Used by | TTL | Example key |
|---|---|---|---|
| **Rate-limit** | gateway | 60s | `rl:user:social.like` — 30/min limit |
| **Cache** | gateway, users | 60s | `cache:onboard:priya-uuid` — is onboarding complete? |
| **Event stream** | ingest, worker | never | `events:raw` (Redis Stream type) |

The stream is the magic. Even if `tracking-worker` is down for an hour, events queue on the conveyor belt. When it comes back, it reads from the last ID it acknowledged and catches up.

---

## 6. How requests flow in three scenarios

### Scenario A: Login (auth service)

```
1. Phone: POST /auth/login {email, password}
2. Gateway: rate-limit check (3 attempts/min) → JWT verify skipped (no token yet)
3. Auth: lookup user by email
4. Auth: compare password with bcryptjs (cost 12)
5. Auth: if match, generate JWT (HS256, 15min expiry)
6. Phone: stores token in localStorage
7. Next request uses Authorization: Bearer <token>
```

### Scenario B: Swipe Right (social service)

```
1. Phone: POST /social/like {targetId}
2. Gateway: rate-limit ✓, JWT verify ✓, onboarding-complete cache check ✓
3. Social: save Like row
4. Social: check reciprocal Like
5. Social: if match, create Chat room, notify other person
6. Phone: show "It's a match!" (all in ~80ms)
7. Async: ingest records tracking event
```

### Scenario C: Send Chat Message (messaging service)

```
1. Phone: POST /messaging/chats/{chatId}/messages {text}
2. Gateway: all checks pass
3. Messaging: generate random IV (initialization vector)
4. Messaging: encrypt plaintext with AES-256-GCM using per-user key
5. Messaging: save ciphertext only to Postgres
6. Messaging: SSE-push to Arjun's open browser tab
7. Arjun's tab: decrypt with his key, render message
```

**Key:** plaintext **never** touches the database. Even our DBAs can't read chat.

---

## 7. Real-time updates: Server-Sent Events (SSE)

When Arjun's chat tab is open and Priya sends a message, his screen updates in **<200ms** without polling.

```
1. Arjun's tab: opens GET /events/sse (keeps connection open)
2. Gateway: maintains that connection in memory
3. Priya sends a message
4. Messaging saves to Postgres
5. Messaging: POST /internal/sse/publish {userId: arjun, event: newMessage}
6. Gateway: finds Arjun's SSE connection, pushes event down it
7. Arjun's tab: receives event, decrypts message, renders it
```

No WebSockets, no extra infrastructure. SSE is enough for what we need today.

---

## 8. The tracking pipeline at a glance

Priya swipes for 30 seconds. Her phone fires 47 events. Here's where they go:

```mermaid
flowchart LR
    Phone["Priya<br/>47 events"] -->|"batch, POST"| Ingest["ingest<br/>(3260)<br/>validate + HMAC"]
    Ingest -->|"XADD"| Stream["Redis Stream<br/>events:raw"]
    Stream -->|"XREADGROUP"| Worker["tracking-worker<br/>(3261)<br/>batch read"]
    Worker -->|"every 15min"| Agg["Postgres<br/>UserActivity15m<br/>aggregate"]
    Worker -->|"after 1h"| Cold["S3-compatible<br/>cold storage"]
```

**Ingest:** validates each event against Zod schema, stamps HMAC fingerprint, enqueues to Redis Stream, returns 204 in <15ms. Phone never waits.

**Worker:** reads batches from the stream, aggregates every 15 minutes into rollup rows, writes to feature tables that algorithms read.

**Compression:** 47 events + 50k other users = 3.1M raw events → ~50k rollup rows. **17,000× compression**.

See [docs/TRACKING.md](docs/TRACKING.md) for exhaustive event catalogue.

---

## 9. The algorithm layer at a glance

```mermaid
graph LR
    Features["Postgres<br/>feature tables<br/>(UserActivity15m, etc)"]
    Algo["17 algorithms<br/>(forYou, aiPicks,<br/>beats, etc)"]
    Score["Score per candidate<br/>0..100"]
    UI["Priya's Discover<br/>stack in order"]
    
    Features --> Algo
    Algo --> Score
    Score --> UI
```

When Priya opens Discover, the `social` service:
1. Fetches ~200 candidate profiles.
2. Calls `forYou.rank(candidates, Priya)`.
3. `forYou` reads Priya's features from Postgres (interests, activity level, chronotype).
4. `forYou` scores each candidate 0..100.
5. Social sorts by score, returns top 10.
6. Takes ~40ms total.

See [docs/ALGORITHMS.md](docs/ALGORITHMS.md) for all 17 algorithms with math.

---

## 10. Cross-cutting concerns

**Authentication:** Every request carries a JWT token (a wristband). JWT is HS256 with a 15-minute expiry. Verified by the gateway on every request.

**Encryption:**
- **Messages:** AES-256-GCM with a per-message IV (different key each time). Even our code can't read chats.
- **Tracking hash:** HMAC-SHA256 with `TRACKING_HASH_SECRET`. We compare hashes to know it's Priya's data, but can't reverse to get her ID.

**HMAC:** Tamper-proof fingerprint. Attacker can't forge a tracking event as someone else without the secret key.

**Logging:** Every service logs to stdout (JSON lines). Logs never contain passwords, tokens, or chat contents. A grep for "password" returns nothing.

---

## 11. Why microservices: honest pros and cons

| Pro | Con |
|---|---|
| Independent deploy, faster iteration | Harder to debug across service boundaries |
| Blast radius: one service crashing doesn't take down the app | More network calls = more latency (but we cache aggressively) |
| Scale only what's hot (discover gets 10 pods, auth gets 2) | Eventual consistency—Priya's profile might not reflect a just-saved change immediately |
| Team autonomy: each service has an owner | More services = more things to monitor (but we use observability dashboards) |
| Easier to rewrite one service in a different language later | More infrastructure complexity (Kubernetes, service discovery) |

---

## 12. Local vs production: what's the same, what's different

**Same everywhere:**
- Prisma schema (80+ models).
- 17 algorithms.
- Database structure.
- Service ports (3100–3206, 3260–3261).

**Different:**
- **Local:** docker-compose, one Postgres, one Redis, all services on one machine.
- **Production:** Kubernetes, managed Postgres (AWS RDS), managed Redis (AWS ElastiCache), autoscaling (HPA—automated building manager), 3-zone redundancy, daily backups.

The code is identical; only the deployment changes.

---

## 13. If something breaks (debugging table)

| Symptom | Check first | Why | Fix |
|---------|---|---|---|
| Phone gets `502` on every request | Is gateway pod running? `kubectl get pods -l app=gateway` | Gateway is the only exposed service. If it's down, nothing works. | `kubectl restart pod gateway-abc123` |
| Login works, Discover is empty | `social` pod logs: `kubectl logs pod social-xyz` | Social service crashed or can't reach Postgres. | Check Postgres connectivity; restart social. |
| Tracking events aren't updating rankings | `kubectl logs pod tracking-worker-xyz` + `XINFO GROUPS events:raw` in Redis | Worker is stuck or behind. | Check worker logs; restart if crashed. |
| "Unprocessed events" alarm fires | `XLEN events:raw` and compare to lag | Event queue is backed up. Ingest is faster than worker can consume. | Scale worker horizontally (add more pods). |
| Chat messages not encrypting | `services/messaging/src/encrypt.ts` — is `AES_KEY` set? | Missing encryption key = plaintext storage. | Verify `AES_KEY` env var is 32 bytes. |
| Users see wrong matches (algorithm bad) | Check feature flags in `configuration/prod/values.yaml` | Feature flag is `'0'` (off) or pointing to old algorithm. | Flip flag to `'1'`, restart social pod. |

---

## 14. License

Proprietary.
