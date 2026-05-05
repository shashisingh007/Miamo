# Miamo API Gateway

**Port:** 3200  
**Role:** Single entry point for all client requests  
**Tech:** Express 4.21, http-proxy-middleware, jsonwebtoken

---

## What It Does

The Gateway is the **only service clients talk to**. It:

1. **Validates JWT tokens** — Extracts `userId` from Bearer token
2. **Injects internal headers** — Adds `x-user-id` and `x-internal-key` for downstream services
3. **Proxies requests** — Forwards to the correct microservice based on URL path
4. **Rate limits** — 5000 req/15min globally, 50 req/15min for auth endpoints
5. **Aggregates health** — `GET /health` checks all downstream services

## How Routing Works

```
Client Request                  Gateway Action                    Target
─────────────────               ──────────────                    ──────
/api/v1/auth/*           →  authLimiter (no auth)            →  Auth :3201
/api/v1/users/*          →  requireAuth + proxy              →  Users :3202
/api/v1/profiles/*       →  requireAuth + proxy              →  Users :3202
/api/v1/settings/*       →  requireAuth + proxy              →  Users :3202
/api/v1/search/*         →  requireAuth + proxy              →  Users :3202
/api/v1/discover/*       →  requireAuth + proxy              →  Social :3203
/api/v1/matches/*        →  requireAuth + proxy              →  Social :3203
/api/v1/ai-match/*       →  requireAuth + proxy              →  Social :3203
/api/v1/safety/*         →  requireAuth + proxy              →  Social :3203
/api/v1/messages/*       →  requireAuth + proxy              →  Messaging :3204
/api/v1/beats/*          →  requireAuth + proxy              →  Messaging :3204
/api/v1/feed/*           →  requireAuth + proxy              →  Content :3205
/api/v1/stories/*        →  requireAuth + proxy              →  Content :3205
/api/v1/videos/*         →  requireAuth + proxy              →  Content :3205
/api/v1/creativity/*     →  requireAuth + proxy              →  Content :3205
/api/v1/notifications/*  →  requireAuth + proxy              →  Notifications :3206
```

## Middleware Stack

```
Request → Helmet → CORS → Cookie Parser → Morgan → Rate Limit → JWT Extract → [requireAuth] → Proxy → Response
```

### JWT Extraction (`extractUserId`)

Every request passes through this middleware:

1. Reads `Authorization: Bearer <token>` header
2. Verifies JWT with `JWT_SECRET`
3. On success: sets `x-user-id` and `x-internal-key` headers on the request
4. On failure: does nothing (lets downstream handle it)

### Auth Guard (`requireAuth`)

Applied to protected routes. Returns `401 Unauthorized` if `x-user-id` header is not set.

### Proxy (`proxyTo`)

Uses `http-proxy-middleware` to forward requests. Automatically:
- Preserves the original path
- Forwards auth headers (`x-user-id`, `x-internal-key`, `authorization`)
- Returns `502 Service Unavailable` if the target service is down

## Health Check

```bash
GET http://localhost:3200/health
```

Response:
```json
{
  "status": "ok",
  "service": "gateway",
  "timestamp": "2026-05-02T...",
  "services": {
    "auth": "ok",
    "users": "ok",
    "social": "ok",
    "messaging": "ok",
    "content": "ok",
    "notifications": "ok"
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3200` | Gateway port |
| `JWT_SECRET` | dev secret | JWT signing key |
| `INTERNAL_SERVICE_KEY` | dev key | Injected to downstream services |
| `FRONTEND_URL` | `http://localhost:3100` | CORS allowed origin |
| `AUTH_SERVICE_URL` | `http://localhost:3201` | Auth service URL |
| `USER_SERVICE_URL` | `http://localhost:3202` | Users service URL |
| `SOCIAL_SERVICE_URL` | `http://localhost:3203` | Social service URL |
| `MESSAGING_SERVICE_URL` | `http://localhost:3204` | Messaging service URL |
| `CONTENT_SERVICE_URL` | `http://localhost:3205` | Content service URL |
| `NOTIFICATION_SERVICE_URL` | `http://localhost:3206` | Notifications service URL |

## Run Standalone

```bash
cd services/gateway
npm install
PORT=3200 npx tsx src/server.ts
```

## Files

```
services/gateway/
├── src/server.ts      ← All gateway logic (routing, auth, proxy)
├── package.json
├── tsconfig.json
├── Dockerfile          ← Multi-stage Node.js 20 Alpine build
└── .dockerignore
```
