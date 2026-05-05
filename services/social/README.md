# Miamo Social Service

**Port:** 3203  
**Role:** Discovery, matching, AI compatibility, safety  
**Tech:** Express 4.21, Prisma 5.22

---

## What It Does

The Social Service is the **core dating engine**:

1. **Discover** — Browse potential matches with like/pass actions
2. **Matches** — Send, accept, reject match requests
3. **AI Match** — Compatibility scoring algorithm
4. **Safety** — Report users, block, get safety tips

## API Endpoints

### Discover (Browse & Interact)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/discover` | Required | Get discovery feed of profiles |
| `POST` | `/api/v1/discover/:id/like` | Required | Like a profile |
| `POST` | `/api/v1/discover/:id/superlike` | Required | Super-like a profile |
| `POST` | `/api/v1/discover/:id/comment` | Required | Comment on a profile |
| `POST` | `/api/v1/discover/:id/pass` | Required | Pass on a profile |

### Matches (Connections)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/matches` | Required | List all matches |
| `GET` | `/api/v1/matches/requests` | Required | Incoming match requests |
| `GET` | `/api/v1/matches/sent` | Required | Sent match requests |
| `POST` | `/api/v1/matches/:id/accept` | Required | Accept a match request |
| `POST` | `/api/v1/matches/:id/reject` | Required | Reject a match request |
| `DELETE` | `/api/v1/matches/:id` | Required | Unmatch a user |

### AI Match (Compatibility)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/ai-match/suggestions` | Required | Get AI-suggested matches |
| `POST` | `/api/v1/ai-match/score` | Required | Calculate compatibility with user |

### Safety

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/safety/report` | Required | Report a user |
| `POST` | `/api/v1/safety/block/:id` | Required | Block a user |
| `DELETE` | `/api/v1/safety/block/:id` | Required | Unblock a user |
| `GET` | `/api/v1/safety/reports` | Required | View your reports |
| `GET` | `/api/v1/safety/tips` | Required | Get safety tips |

## Discovery Algorithm

The discovery feed (`GET /discover`) works by:

```
1. Get all users (excluding self)
2. Exclude already-matched users
3. Exclude blocked users
4. Exclude users the current user has already liked/passed
5. Apply preference filters (gender, lookingFor)
6. Return profiles with compatibility hints
```

## Match Lifecycle

```
User A likes User B
       ↓
Match record created: status = "pending"
       ↓
User B sees it in /matches/requests
       ↓
┌──────────────────────────────────┐
│ Accept → status = "matched"      │ → Both users can now message
│ Reject → status = "rejected"     │ → Record kept for exclusion
│ Unmatch → match deleted           │ → Chat access revoked
└──────────────────────────────────┘
```

## AI Compatibility Score

The `POST /ai-match/score` endpoint calculates compatibility (0-100):

```
Scoring Factors                   Weight
───────────────                   ──────
Shared interests                   30%
Age compatibility                  20%
Location proximity                 15%
Looking-for alignment              20%
Activity level match               15%
────────────────────────────────────────
Total                             100%
```

`GET /ai-match/suggestions` returns the top 10 profiles ranked by this score.

## Safety Features

### Reporting

```json
POST /api/v1/safety/report
{
  "reportedUserId": "uuid",
  "reason": "harassment",         // harassment, spam, fake, inappropriate, other
  "description": "Optional details"
}
```

### Blocking

Blocking a user:
- Hides their profile from your discover feed
- Removes any existing match
- Prevents them from messaging you
- Works bidirectionally (they can't see you either)

## Database Models Used

- **Match** — `id, userId, matchedUserId, status (pending/matched/rejected), compatibility`
- **Report** — `id, reporterId, reportedUserId, reason, description, status (pending/reviewed/resolved)`
- **Block** — `id, blockerId, blockedUserId`
- **Like** — `id, userId, likedUserId, type (like/superlike)`
- **Profile** — Read-only access for discovery/matching

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3203` | Service port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `INTERNAL_SERVICE_KEY` | dev key | Validates internal requests |

## Run Standalone

```bash
cd services/social
npm install
npx prisma generate
DATABASE_URL=postgresql://miamo:miamo@localhost:5432/miamo npx tsx src/server.ts
```

## Files

```
services/social/
├── src/server.ts      ← Routes, matching logic, AI scoring, safety
├── package.json
├── tsconfig.json
├── Dockerfile
└── .dockerignore
```
