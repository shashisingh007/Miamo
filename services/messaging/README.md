# Miamo Messaging Service

**Port:** 3204  
**Role:** Real-time chats, messages, reactions, beats/streaks  
**Tech:** Express 4.21, Prisma 5.22

---

## What It Does

The Messaging Service handles:

1. **Chats** — List, archive, manage conversations between matched users
2. **Messages** — Send, edit, delete, react to messages
3. **Chat Actions** — Pin, mute, archive conversations
4. **Beats (Streaks)** — Daily interaction streaks with gamification

## API Endpoints

### Chats

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/messages/chats` | Required | List all chats |
| `GET` | `/api/v1/messages/chats/archived` | Required | List archived chats |

### Messages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/messages/:chatId` | Required | Get messages in a chat |
| `POST` | `/api/v1/messages/:chatId` | Required | Send a message |
| `PUT` | `/api/v1/messages/:chatId/:messageId` | Required | Edit a message |
| `DELETE` | `/api/v1/messages/:chatId/:messageId/me` | Required | Delete for self |
| `DELETE` | `/api/v1/messages/:chatId/:messageId/all` | Required | Delete for everyone |
| `POST` | `/api/v1/messages/:chatId/:messageId/react` | Required | React to message |

### Chat Actions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/messages/:chatId/pin` | Required | Pin a chat |
| `POST` | `/api/v1/messages/:chatId/mute` | Required | Mute a chat |
| `POST` | `/api/v1/messages/:chatId/archive` | Required | Archive a chat |

### Beats (Streaks)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/beats` | Required | List all active beats |
| `POST` | `/api/v1/beats/:matchId/start` | Required | Start a beat with a match |
| `POST` | `/api/v1/beats/:id/complete` | Required | Complete today's beat |
| `POST` | `/api/v1/beats/:id/miss` | Required | Record a missed day |
| `POST` | `/api/v1/beats/:id/expire` | Required | Expire a beat |
| `POST` | `/api/v1/beats/:id/restore` | Required | Restore an expired beat |
| `PUT` | `/api/v1/beats/:id/archive` | Required | Archive a beat |

## Chat System

### How Chats Work

```
User A matches with User B (via Social Service)
       ↓
Chat is created automatically (or on first message)
       ↓
Both users can send messages via POST /messages/:chatId
       ↓
Messages support: text, emoji reactions, edit, delete
       ↓
Chats can be: pinned, muted, archived
```

### Message Object

```json
{
  "id": "uuid",
  "chatId": "uuid",
  "senderId": "uuid",
  "content": "Hey! How's it going?",
  "type": "text",
  "reactions": [
    { "userId": "uuid", "emoji": "❤️" }
  ],
  "editedAt": null,
  "deletedForMe": false,
  "createdAt": "2026-05-02T..."
}
```

### Delete Modes

- **Delete for me** (`DELETE /:chatId/:messageId/me`) — Only hides from your view
- **Delete for everyone** (`DELETE /:chatId/:messageId/all`) — Removes for both users (sender only, within time limit)

## Beats (Streaks) System

Beats encourage daily interaction between matches. Think of it like Snapchat streaks for dating.

### Beat Lifecycle

```
Start → Active → Complete (daily) → Active → ... → Miss → Weak → ... → Expire → Archived
                                                      ↓
                                                   Restore (costs premium credit)
```

### Beat States

| State | Description |
|-------|-------------|
| `active` | Beat is running, daily interaction expected |
| `weak` | One or more missed days, at risk of expiring |
| `expired` | Too many missed days, beat ended |
| `archived` | Manually archived by user |

### How Beats Work

```
1. User starts a beat with a match → POST /beats/:matchId/start
2. Both users must interact daily → POST /beats/:id/complete
3. Streak counter increments each day both complete
4. Missing a day → beat becomes "weak" → POST /beats/:id/miss
5. Multiple misses → beat expires → POST /beats/:id/expire
6. Premium users can restore → POST /beats/:id/restore
7. Users can archive old beats → PUT /beats/:id/archive
```

### Beat Object

```json
{
  "id": "uuid",
  "matchId": "uuid",
  "userId": "uuid",
  "partnerId": "uuid",
  "streak": 15,
  "longestStreak": 23,
  "status": "active",
  "lastCompletedAt": "2026-05-02T...",
  "createdAt": "2026-04-17T..."
}
```

## Database Models Used

- **Chat** — `id, participants (user IDs), isPinned, isMuted, isArchived, lastMessageAt`
- **Message** — `id, chatId, senderId, content, type, editedAt, deletedForSender, deletedForAll`
- **MessageReaction** — `id, messageId, userId, emoji`
- **Beat** — `id, matchId, userId, partnerId, streak, longestStreak, status, lastCompletedAt`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3204` | Service port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `INTERNAL_SERVICE_KEY` | dev key | Validates internal requests |

## Run Standalone

```bash
cd services/messaging
npm install
npx prisma generate
DATABASE_URL=postgresql://miamo:miamo@localhost:5432/miamo npx tsx src/server.ts
```

## Files

```
services/messaging/
├── src/server.ts      ← Routes, chat logic, beats system
├── package.json
├── tsconfig.json
├── Dockerfile
└── .dockerignore
```
