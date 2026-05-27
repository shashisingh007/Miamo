# messaging

## 1. Purpose

Owns chats, messages, beats, and chat-level UX state (pin/mute/archive/theme/background). Encrypts every user-authored message at rest with AES-256-GCM. Exposes two read endpoints consumed by social: communication-style profile and recent-sent-texts (for Miamo Move generation).

## 2. Mental model

A 1:1 chat per `Match` (`Chat.matchId` unique). Every `Message` carries an enum `type` (`text`, `voice`, `image`, `gif`) and an opaque encrypted `content` blob. The handler decrypts on read, encrypts on write. Smart-reply suggestions are computed in-process via `suggestMessages` + `suggestMoves` from [services/shared/src/algo](../shared/src/algo/).

## 3. Public surface

| Method | Path | Purpose | Source |
|---|---|---|---|
| GET | `/api/v1/messages/chats` | Active chats w/ unread + last-msg preview | [server.ts](src/server.ts#L79) |
| GET | `/api/v1/messages/chats/archived` | Archived chats | [server.ts](src/server.ts#L120) |
| GET | `/api/v1/messages/chats/:chatId/messages` | Cursor-paged messages (decrypt + mark read) | [server.ts](src/server.ts#L140) |
| POST | `/api/v1/messages/chats/:chatId/messages` | Send (idempotent via Idempotency-Key) | [server.ts](src/server.ts#L165) |
| PUT | `/api/v1/messages/messages/:id` | Edit own | [server.ts](src/server.ts#L213) |
| POST | `/api/v1/messages/messages/:id/delete-for-me` | Soft delete | [server.ts](src/server.ts#L222) |
| POST | `/api/v1/messages/messages/:id/delete-for-all` | Hard delete (2h window, sender only) | [server.ts](src/server.ts#L890) |
| POST | `/api/v1/messages/messages/:id/react` | Toggle emoji reaction | [server.ts](src/server.ts#L247) |
| POST | `/api/v1/messages/chats/:chatId/{pin,mute,archive,unarchive,theme}` | Chat state | [server.ts](src/server.ts#L270) |
| DELETE | `/api/v1/messages/chats/:chatId/clear` | Clear for me | [server.ts](src/server.ts#L343) |
| GET | `/api/v1/messages/chats/:chatId/search` | In-thread search (decrypt in memory) | [server.ts](src/server.ts#L363) |
| POST | `/api/v1/messages/chats/:chatId/suggestions` | Smart reply (legacy) | [server.ts](src/server.ts#L385) |
| POST | `/api/v1/messages/chats/:chatId/suggestions-v4` | Smart reply (v4 flag) | server.ts (Phase H) |
| GET | `/api/v1/messages/comm-profile/:userId` | Communication style vector (for social) | server.ts |
| GET | `/api/v1/messages/sent-texts/:userId?limit=N` | Recent sent messages (for Move generation) | server.ts |

## 4. Data model

Writes: `Chat`, `Message`, `Beat`, `BeatEvent`. Reads: `Match`, `Profile`, `Block`.

## 5. Dependencies

| Talks to | Why | How |
|---|---|---|
| Postgres | Chat, Message, Beat | Prisma |
| Node `crypto` | AES-256-GCM + scrypt key derivation | in-process |
| gateway | SSE fan-out via `/internal/push-event` | HTTP |
| `services/shared/src/algo/{messageSuggest,moves}` | suggestions | in-process |

## 6. Configuration

| Env | Default | Purpose |
|---|---|---|
| `PORT` | `3204` | HTTP port |
| `DATABASE_URL` | — | Postgres |
| `INTERNAL_SERVICE_KEY` | — | Internal-call auth |
| `ENCRYPTION_KEY` | — | AES-256-GCM key (do NOT rotate) |
| `ENCRYPTION_SALT` | — | scrypt salt (do NOT rotate) |
| `GATEWAY_URL` | `http://localhost:3200` | SSE push target |
| `ALGO_V4_RANK_ENABLED_MESSAGING` | `0` | Enable `/suggestions-v4` |

## 7. Worked example — send message

```bash
curl -X POST http://localhost:3200/api/v1/messages/chats/<chatId>/messages \
  -H 'authorization: Bearer eyJ...' \
  -H 'idempotency-key: 8f3c...' \
  -H 'content-type: application/json' \
  -d '{"content":"hey 👋","type":"text"}'
```

Server flow:

1. Verify membership of `chatId`.
2. Encrypt: `ciphertext = enc:<iv>:<authTag>:<aes-256-gcm(plaintext)>`.
3. `INSERT Message ...; UPDATE Chat.lastMessageAt`.
4. POST `/internal/push-event` to gateway → SSE to the other user.
5. Return `{ id, createdAt, type }` — never the ciphertext.

## 8. Local dev

```bash
cd services/messaging
npx prisma generate --schema=../shared/prisma/schema.prisma
npm run dev
```

## 9. Tests

None local. Algo tests at root cover `suggestMessages` and `suggestMoves`.

## 10. Failure modes & operational notes

- **AuthTag mismatch on decrypt** → likely key/salt rotated, or DB row tampered. Handler logs and returns a sanitised placeholder; preserves raw ciphertext for forensics.
- **N+1 unread counts** → addressed via `groupBy`. New endpoints listing chats must use the same pattern.
- **Search decrypts every match in memory** → expensive on huge threads. Capped at 200 messages per search.
- **Suggestions LRU** capped at 200 entries; mostly hits within a session.

## 11. What changed & why it's good

- **Before:** Messages were stored in plaintext; one IV per chat exposed pattern correlations; smart replies were template strings.
- **After:** Per-message random IVs + authTag; suggestions are scored by `messageSuggest` (attentionFit/recencyFit/noveltyFit/intentFit/chronoFit) and ranked.
- **Why it matters:** A DB dump leaks no message content. Replies adapt to the receiver's communication profile and active hours.
