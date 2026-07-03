# gateway — the receptionist (port 3200)

**TL;DR:** Every request from Priya's phone hits the gateway first. It is the receptionist (every visitor goes through her first) that checks Priya's wristband (JWT token — a wristband with an expiry stamp), enforces rate limits, and routes to the right specialist team.

---

## How to read this

- **Meera (non-tech)**: Read sections 1 & 2 only. You'll know what the gateway does for Priya.
- **Priya / PM**: Read sections 1–4.
- **Arjun-the-engineer**: Read everything.

---

## 1. A scene from Priya's evening

9:02pm. Priya taps "Like" on Arjun. Her phone fires `POST /v1/social/swipe`. Before anything else happens, the request lands at port 3200 — the gateway. In ~5ms the gateway:

1. Confirms her wristband (JWT) is real and not expired.
2. Confirms she hasn't been hammering this endpoint (rate limit).
3. Forwards the request to the `social` specialist team on port 3203.
4. Streams the response back to her phone.

Priya never sees the gateway. But every single thing she does in the app passes through it.

---

## 2. What this service is responsible for

- **One front door.** All the web app talks to is `gateway:3200`. The 7 internal services (auth, users, social, messaging, content, notifications, ingest) are not exposed publicly.
- **Wristband check.** Validate the JWT on every request. Reject expired or forged tokens with `401`.
- **Rate limit.** Track requests per IP using Redis. Reject abusers with `429`.
- **Routing.** URL prefix → downstream service. `/v1/auth/*` → auth, `/v1/users/*` → users, etc.
- **Tracing.** Stamp every request with an `X-Request-Id` header so logs across services can be joined.
- **CORS.** Allow the web origin; block everyone else.

What it does **not** do: business logic, database access, ranking. It is dumb on purpose.

---

## 3. Routing table

| URL prefix              | Forwarded to               | Plain English                                 |
|-------------------------|----------------------------|-----------------------------------------------|
| `/v1/auth/*`            | auth :3201                 | login, signup, refresh                         |
| `/v1/users/*`           | users :3202                | profile, preferences, photos                   |
| `/v1/social/*`          | social :3203               | discover, swipe, matches, AI Picks             |
| `/v1/chats/*`           | messaging :3204            | chat threads + messages                        |
| `/v1/feed/*`, `/v1/posts/*` | content :3205          | feed, posts, comments, beats, DTM              |
| `/v1/notifications/*`   | notifications :3206        | push, in-app notifications                     |
| `/v1/track`             | ingest :3260               | tracking events from the browser               |

---

## 4. Worked example — a "swipe right"

```
1. Phone   POST https://api.miamo.in/v1/social/swipe   (Auth: Bearer eyJ...)
2. Gateway verifies JWT (HS256 + JWT_SECRET) → user = priya-uuid
3. Gateway checks Redis key rate:priya-uuid:swipe → 12/60 (limit 60/min). OK.
4. Gateway stamps X-Request-Id: 9f3c-... and X-User-Id: priya-uuid
5. Gateway proxies → http://social:3203/v1/social/swipe
6. Social responds in 38ms → gateway streams back to phone.
Total gateway overhead: ~5ms.
```

---

## 5. Code layout

```
services/gateway/src/
├── server.ts                   # express bootstrap
├── routes.ts                   # URL → downstream mapping
├── middleware/
│   ├── verifyJwt.ts            # JWT check
│   ├── rateLimit.ts            # Redis-backed limiter
│   └── requestId.ts            # adds X-Request-Id
└── proxy.ts                    # HTTP proxy to downstream
```

---

## 6. Configuration

| Env var                | What it does                                             |
|------------------------|----------------------------------------------------------|
| `PORT`                 | Listen port (default 3200)                                |
| `JWT_SECRET`           | The signing secret for the wristband                      |
| `REDIS_URL`            | Whiteboard URL for rate-limit counters                    |
| `RATE_LIMIT_PER_MIN`   | Default 100 req/min per IP                                |
| `AUTH_URL`, `USERS_URL`, …  | Downstream service URLs                              |
| `CORS_ORIGIN`          | Allowed origin (the web app)                              |

---

## 7. Run locally / test

```bash
cd services/gateway
pnpm install
pnpm dev          # listens on 3200 with hot reload

curl http://localhost:3200/health
```

---

## 8. What changed and why it's better

- **Before:** the web app called 7 different service URLs directly. Auth was repeated client-side. CORS was a nightmare.
- **After:** one URL, one wristband check, one rate-limit place. Adding a new internal service does not change the phone's code.
- **Why Priya feels it:** her phone only needs to know one URL. If we add a new service tomorrow, her app does not need to upgrade.

---

## 9. If something breaks

| Symptom                          | First check                                  | Likely cause                       |
|----------------------------------|----------------------------------------------|------------------------------------|
| 401 on every request             | `JWT_SECRET` matches the auth service?       | Secret rotated only on one side    |
| 429 spam                         | `redis-cli KEYS 'rate:*'`                    | Misconfigured limit or attack      |
| 502 to a specific path           | downstream service down                      | check `kubectl get pods -l app=…`  |
| All requests slow                | gateway pod CPU                              | Scale replicas (HPA)               |
