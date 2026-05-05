# Miamo Users Service

**Port:** 3202  
**Role:** User profiles, settings, privacy, search, GDPR  
**Tech:** Express 4.21, Prisma 5.22

---

## What It Does

The Users Service manages:

1. **User Profiles** — CRUD operations, photos, prompts, interests
2. **Settings** — Notification preferences, theme, language, privacy controls
3. **Search** — Find users by name/interest with privacy filters
4. **Privacy** — Block/unblock users, control visibility
5. **GDPR Compliance** — Export all user data on request
6. **Account Lifecycle** — Deactivate/reactivate accounts

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/users` | Required | List all users |
| `GET` | `/api/v1/users/:id` | Required | Get user by ID |
| `PUT` | `/api/v1/users/:id` | Required | Update user |
| `DELETE` | `/api/v1/users/:id` | Required | Delete user |
| `GET` | `/api/v1/profiles/me` | Required | Get own profile with score |
| `PUT` | `/api/v1/profiles/me` | Required | Update own profile |
| `GET` | `/api/v1/profiles/me/prompts` | Required | Get profile prompts |
| `PUT` | `/api/v1/profiles/me/interests` | Required | Update interests |
| `GET` | `/api/v1/settings` | Required | Get user settings |
| `PUT` | `/api/v1/settings` | Required | Update settings |
| `GET` | `/api/v1/settings/privacy` | Required | Get privacy settings |
| `POST` | `/api/v1/users/deactivate` | Required | Deactivate account |
| `POST` | `/api/v1/users/reactivate` | Required | Reactivate account |
| `GET` | `/api/v1/users/export` | Required | GDPR data export |

## Profile Score Calculation

The `GET /profiles/me` endpoint returns a `profileScore` (0-100%) based on:

```
Score Components                  Points
──────────────                    ──────
Has bio                           +20
Has at least one photo            +20
Has date of birth                 +10
Has location set                  +10
Has "looking for" set             +10
Has gender set                    +10
Has at least one interest         +20
────────────────────────────────────────
Maximum Score                     100
```

This encourages users to complete their profiles. The score is displayed in the UI as a ring indicator.

## Search Feature

```
GET /api/v1/search?q=<query>
```

- Searches by `displayName` (case-insensitive, contains match)
- Searches by `interests` (array contains match)
- Excludes the requesting user from results
- Respects user privacy settings
- Returns user + profile data

## GDPR Data Export

```
GET /api/v1/users/export
```

Returns a complete JSON dump of:
- User account data
- Profile information
- All settings
- Match history
- Messages sent/received
- Content posted
- Notification history

## Account Deactivation

```
POST /api/v1/users/deactivate
→ Sets user.isActive = false (soft delete)

POST /api/v1/users/reactivate
→ Sets user.isActive = true
```

Deactivated accounts are hidden from search and discovery but retain all data.

## Database Models Used

- **User** — Core account info, auth fields
- **Profile** — Bio, photos, location, interests, dating preferences
- **Settings** — Notification prefs, theme, language, privacy
- **Block** — User blocking relationships

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3202` | Service port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `INTERNAL_SERVICE_KEY` | dev key | Validates internal requests |

## Run Standalone

```bash
cd services/users
npm install
npx prisma generate
DATABASE_URL=postgresql://miamo:miamo@localhost:5432/miamo npx tsx src/server.ts
```

## Files

```
services/users/
├── src/server.ts      ← Routes, profile logic, search, GDPR
├── package.json
├── tsconfig.json
├── Dockerfile
└── .dockerignore
```
