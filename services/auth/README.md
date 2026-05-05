# Miamo Auth Service

**Port:** 3201  
**Role:** User registration, login, JWT token management  
**Tech:** Express 4.21, Prisma 5.22, bcrypt, jsonwebtoken

---

## What It Does

The Auth Service handles:

1. **Registration** — Creates new users with hashed passwords + default profile
2. **Login** — Validates credentials, returns JWT access + refresh tokens
3. **Token Refresh** — Issues new access token using refresh token
4. **Session** — Returns current authenticated user info
5. **Logout** — Placeholder for token invalidation

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/register` | Public | Create new account |
| `POST` | `/api/v1/auth/login` | Public | Sign in |
| `POST` | `/api/v1/auth/logout` | Required | Sign out |
| `GET` | `/api/v1/auth/me` | Required | Get current user |
| `POST` | `/api/v1/auth/refresh` | Public | Refresh access token |

## Authentication Flow

### Registration (`POST /register`)

```
Client sends: { email, password, displayName, dateOfBirth, gender }
                ↓
1. Check if email already exists → 409 if so
2. Hash password with bcrypt (12 rounds)
3. Create User + Profile in a Prisma transaction
4. Sign JWT access token (7 days) + refresh token (30 days)
5. Return { user, accessToken, refreshToken }
```

### Login (`POST /login`)

```
Client sends: { email, password }
                ↓
1. Find user by email → 401 if not found
2. Compare password with bcrypt → 401 if wrong
3. Sign JWT access token (7 days) + refresh token (30 days)
4. Return { user, accessToken, refreshToken }
```

### Token Refresh (`POST /refresh`)

```
Client sends: { refreshToken }
                ↓
1. Verify refresh token with JWT_SECRET → 401 if invalid
2. Find user by decoded userId → 401 if not found
3. Sign new access token (7 days)
4. Return { accessToken }
```

### Current User (`GET /me`)

```
Requires: x-user-id header (set by gateway)
                ↓
1. Find user by id, include Profile
2. Return user object (minus password)
```

## How Auth Headers Work

The Auth Service supports **two authentication methods**:

1. **Direct JWT** — Reads `Authorization: Bearer <token>`, verifies it, extracts `userId`
2. **Internal Header** — Reads `x-user-id` header (set by Gateway after JWT validation)

The `authMiddleware` in the service checks both, preferring `x-user-id` from internal routing.

## JWT Token Structure

```javascript
// Access Token payload
{
  userId: "uuid-string",
  email: "user@example.com",
  iat: 1714651234,
  exp: 1715256034  // 7 days
}

// Refresh Token payload
{
  userId: "uuid-string",
  type: "refresh",
  iat: 1714651234,
  exp: 1717243234  // 30 days
}
```

## Database Models Used

- **User** — `id, email, passwordHash, displayName, role, isActive, isPremium, lastSeen`
- **Profile** — `userId, bio, photos, dateOfBirth, gender, location, lookingFor, interests`

Both are created in a single Prisma transaction during registration.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3201` | Service port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | dev secret | Token signing key |
| `INTERNAL_SERVICE_KEY` | dev key | Validates internal requests |

## Run Standalone

```bash
cd services/auth
npm install
npx prisma generate
DATABASE_URL=postgresql://miamo:miamo@localhost:5432/miamo npx tsx src/server.ts
```

## Files

```
services/auth/
├── src/server.ts      ← Routes, auth logic, JWT helpers
├── package.json
├── tsconfig.json
├── Dockerfile
└── .dockerignore
```
