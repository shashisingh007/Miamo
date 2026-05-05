# Miamo Notifications Service

**Port:** 3206  
**Role:** User notifications + internal notification creation  
**Tech:** Express 4.21, Prisma 5.22

---

## What It Does

The Notifications Service handles:

1. **User-facing notifications** — List, count, mark as read
2. **Internal API** — Other services create notifications via internal endpoint
3. **Notification types** — Match, message, like, comment, system alerts

## API Endpoints

### User-Facing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/notifications` | Required | List notifications (paginated) |
| `GET` | `/api/v1/notifications/count` | Required | Get unread count |
| `PUT` | `/api/v1/notifications/:id/read` | Required | Mark one as read |
| `PUT` | `/api/v1/notifications/read-all` | Required | Mark all as read |

### Internal (Service-to-Service)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/internal/notifications` | Internal Key | Create notification |

## How Notifications Flow

```
Other Service (e.g., Social)          Notifications Service         Client
─────────────────────────             ─────────────────────         ──────

User A likes User B
       ↓
POST /internal/notifications ────→ Create notification record
{                                         ↓
  userId: "user-b-id",            Stored in database
  type: "like",                          ↓
  title: "New Like!",             User B opens app
  body: "Sarah liked you",              ↓
  data: { fromUserId: "..." }     GET /notifications ←──── Client polls
}                                        ↓
                                  Returns notification list
```

## Internal Notification Creation

Other microservices call this endpoint to create notifications:

```bash
POST http://notifications:3206/internal/notifications
Headers:
  x-internal-key: <INTERNAL_SERVICE_KEY>
  Content-Type: application/json

Body:
{
  "userId": "target-user-uuid",
  "type": "match",
  "title": "New Match! 🎉",
  "body": "You matched with Sarah!",
  "data": {
    "matchId": "uuid",
    "fromUserId": "uuid"
  }
}
```

**Security:** The `/internal/*` endpoint validates the `x-internal-key` header. Only services with the shared `INTERNAL_SERVICE_KEY` can create notifications.

## Notification Types

| Type | Trigger | Example |
|------|---------|---------|
| `match` | New match created | "You matched with Sarah!" |
| `match_request` | Someone wants to match | "Alex wants to match with you" |
| `message` | New message received | "Sarah: Hey, how are you?" |
| `like` | Someone liked your profile | "Someone liked your profile!" |
| `superlike` | Someone super-liked you | "You got a Super Like! ⭐" |
| `comment` | Comment on your content | "Alex commented on your post" |
| `story_view` | Someone viewed your story | "3 people viewed your story" |
| `beat` | Beat/streak reminder | "Your beat with Sarah is about to expire!" |
| `system` | System announcement | "Welcome to Miamo! Complete your profile" |

## Notification Object

```json
{
  "id": "uuid",
  "userId": "uuid",
  "type": "match",
  "title": "New Match! 🎉",
  "body": "You matched with Sarah!",
  "data": { "matchId": "uuid", "fromUserId": "uuid" },
  "isRead": false,
  "createdAt": "2026-05-02T14:30:00Z"
}
```

## Unread Count

```bash
GET /api/v1/notifications/count
→ { "count": 5 }
```

Used by the UI to show badge numbers on the notifications icon.

## Mark as Read

```bash
# Single notification
PUT /api/v1/notifications/:id/read

# All notifications
PUT /api/v1/notifications/read-all
```

## Database Models Used

- **Notification** — `id, userId, type, title, body, data (JSON), isRead, createdAt`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3206` | Service port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `INTERNAL_SERVICE_KEY` | dev key | Validates internal requests |

## Run Standalone

```bash
cd services/notifications
npm install
npx prisma generate
DATABASE_URL=postgresql://miamo:miamo@localhost:5432/miamo npx tsx src/server.ts
```

## Files

```
services/notifications/
├── src/server.ts      ← Routes, notification logic, internal API
├── package.json
├── tsconfig.json
├── Dockerfile
└── .dockerignore
```
