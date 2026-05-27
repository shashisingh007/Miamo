# auth

## 1. Purpose

Owns user identity: registration, login, JWT issuance, password change, session inventory and revocation. The only writer of `User.passwordHash`. Everything else (profile fields, settings, etc.) lives in [users](../users/README.md).

## 2. Mental model

A pure HTTP service in front of the `User` and `Session` tables. Stateless. Issues JWT (HS256) access tokens (~15 min) and refresh tokens (~30 days). Password hashing uses `bcryptjs` cost 12. Sessions are tracked per device (browser, OS, IP, UA) for visibility and per-session revoke. Changing the password revokes every session at once.

## 3. Public surface

| Method | Path | Auth | Purpose | Source |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | none | Create user + initialise Profile | [server.ts](src/server.ts#L91) |
| POST | `/api/v1/auth/login` | none | Issue JWT + session row | [server.ts](src/server.ts#L125) |
| POST | `/api/v1/auth/logout` | bearer | Revoke all sessions; mark offline | [server.ts](src/server.ts#L165) |
| PUT | `/api/v1/auth/password` | bearer | Verify current, hash new, revoke sessions | [server.ts](src/server.ts#L177) |
| GET | `/api/v1/auth/me` | bearer | Full user + profile + counts | [server.ts](src/server.ts#L201) |
| POST | `/api/v1/auth/refresh` | refresh | New access token | [server.ts](src/server.ts#L215) |
| GET | `/api/v1/auth/sessions` | bearer | List active sessions | [server.ts](src/server.ts#L240) |
| POST | `/api/v1/auth/sessions/:id/revoke` | bearer | Revoke single session | [server.ts](src/server.ts#L253) |
| GET | `/healthz`, `/readyz` | none | Probes | shared |

## 4. Data model

Cross-service shared schema ([services/shared/prisma/schema.prisma](../shared/prisma/schema.prisma)). Models written by auth:

| Model | Purpose |
|---|---|
| `User` | id, email, passwordHash, displayName, username, miamoId, verified, active, deactivated, timestamps |
| `Profile` | extended user data (auth initialises a row at registration) |
| `Session` | one row per device; token, deviceType, browser, OS, IP, UA, lastActiveAt, revoked |
| `Settings`, `PrivacySettings` | initialised at registration with defaults |

## 5. Dependencies

| Talks to | Why | How |
|---|---|---|
| Postgres | Read/write `User`, `Session`, init Profile/Settings | Prisma |
| bcryptjs | Password hashing | in-process |
| jsonwebtoken | Sign/verify JWT | in-process |

No other service is called outbound.

## 6. Configuration

| Env | Default | Required | Purpose |
|---|---|---|---|
| `PORT` | `3201` | no | HTTP port |
| `DATABASE_URL` | — | yes | Postgres connection |
| `JWT_SECRET` | — | yes | HS256 sign key |
| `JWT_REFRESH_SECRET` | — | yes | HS256 refresh key |
| `INTERNAL_SERVICE_KEY` | — | yes | Internal call auth |
| `NODE_ENV` | `production` | no | `test` skips `app.listen()` |

## 7. Worked example — register + login

```bash
# 1. Register
curl -X POST http://localhost:3200/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"alex@example.com","password":"S3cret!","displayName":"Alex"}'

# → 201
# {
#   "user": { "id":"clx...", "email":"alex@example.com", "miamoId":"AX-..." },
#   "accessToken": "eyJ...",  "refreshToken": "eyJ..."
# }

# Side effects in DB:
#   INSERT User (passwordHash = bcrypt(password, 12))
#   INSERT Profile (defaults; completionScore=0)
#   INSERT Settings, PrivacySettings (defaults)
#   INSERT Session (this device)

# 2. Login
curl -X POST http://localhost:3200/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"alex@example.com","password":"S3cret!"}'
# → 200, returns new accessToken + new Session row
```

## 8. Local dev

```bash
cd services/auth
npx prisma generate --schema=../shared/prisma/schema.prisma
npm run dev          # tsx watch src/server.ts → :3201
curl :3201/healthz
```

The shared seed (`npm run db:seed` at repo root) creates `miamo1`..`miamo20` with password = username.

## 9. Tests

No service-local tests. Auth flow covered indirectly by `scripts/test-demo-users.py` and `scripts/api-test.sh`.

## 10. Failure modes & operational notes

- **JWT_SECRET rotated badly** → existing tokens reject at gateway. Symptom: `401` on every request. Fix: roll the env back.
- **Postgres pool exhausted** at registration storm. Bump pool size or scale Postgres.
- **bcrypt cost too high on tiny pods** → login latency spikes. Cost 12 is calibrated for ≥ 256 MB containers.
- **`passwordHash` accidentally serialised** — handlers explicitly destructure `{ passwordHash, ...user }` before returning. New endpoints must do the same.

## 11. What changed & why it's good

- **Before:** Login lived in a monolithic `social` service alongside ranking, so login latency moved with discover load.
- **After:** Auth is a small, stateless service that scales independently and exposes one clean surface (`/api/v1/auth/*`).
- **Why it matters:** A spike in discover traffic no longer slows login. Token rotation is a one-service deploy.
