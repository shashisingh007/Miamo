# messaging — the locked diary (port 3204)

**TL;DR:** messaging is the chat service. Every message Priya sends is sealed in a locked diary (AES-256-GCM encryption — even we can't read it without the key) before it touches our database.

---

## How to read this

- **Meera**: Sections 1–2.
- **Priya / PM**: Sections 1–4 and 8.
- **Engineer**: All.

---

## 1. A scene

10:14pm. Priya types "hey Arjun, where were those mountain photos taken?" and hits send. Her phone fires `POST /v1/chats/<chatId>/messages`. In ~30ms:

1. Her phone (or messaging) encrypts the plaintext with a per-message random IV (initialization vector) + auth tag.
2. The ciphertext lands in Postgres. The plaintext does not.
3. Arjun's open chat tab gets a Server-Sent Event push: a new message arrived.
4. His app fetches the ciphertext + IV + tag, decrypts it, and shows "hey Arjun, where were those mountain photos taken?"

If someone steals our Postgres backup tonight, the only thing they get is gibberish.

---

## 2. What this service is responsible for

- **Threads** — every match becomes a `ChatRoom` row.
- **Messages** — encrypted send / receive / read receipts.
- **Reactions** — emoji reactions on messages.
- **Voice notes** — uploaded as encrypted blobs.
- **Typing indicators** — ephemeral, in Redis.
- **Real-time push** — via Server-Sent Events (SSE) on the gateway.

---

## 3. Endpoints

| Method | Path                                       | Plain English                              |
|--------|--------------------------------------------|--------------------------------------------|
| GET    | `/v1/chats`                                | All my chat threads                         |
| GET    | `/v1/chats/:id/messages?cursor=…`          | Page of messages (newest first)             |
| POST   | `/v1/chats/:id/messages`                   | Send a message                              |
| POST   | `/v1/chats/:id/read`                       | Mark thread as read up to messageId         |
| POST   | `/v1/messages/:id/reactions`               | Add / remove a reaction                     |
| POST   | `/v1/chats/:id/typing`                     | "I'm typing…" (ephemeral)                  |
| GET    | `/v1/chats/:id/stream` (SSE)               | Live updates while the chat is open         |

---

## 4. Encryption — worked example

```
Plaintext:  "hey Arjun"
Random IV:  12 random bytes (different every message)
Key:        scrypt(ENCRYPTION_KEY, ENCRYPTION_SALT, 32 bytes)

Cipher = AES-256-GCM(plaintext, key, iv)
       → ciphertext (variable bytes)
       + authTag (16 bytes)

Stored:  { iv, ciphertext, authTag }
```

Same plaintext sent twice produces **two completely different ciphertexts** because the IV is random. An attacker with our DB sees pairs that look unrelated even when they are the same string.

To decrypt:

```
Decipher = AES-256-GCM(ciphertext, key, iv, authTag)
         → "hey Arjun" or  ERROR if the message was tampered with
```

If anyone flips even one bit of the ciphertext, the authTag check fails and decryption raises.

---

## 5. Tables it owns

- `ChatRoom` — one per match
- `Message` — `{id, roomId, senderId, iv, ciphertext, authTag, sentAt}`
- `Reaction` — emoji reactions
- `ReadReceipt` — last read message per user per room

---

## 6. Code layout

```
services/messaging/src/
├── server.ts
├── routes/
│   ├── messages.ts
│   └── threads.ts
├── encrypt.ts                 # AES-256-GCM wrapper
└── stream.ts                  # SSE delivery
```

---

## 7. Configuration

| Env var                | What it does                                                      |
|------------------------|-------------------------------------------------------------------|
| `ENCRYPTION_KEY`       | 32-byte master key. **Never rotate once messages exist.**          |
| `ENCRYPTION_SALT`      | 16-byte salt. **Never rotate once messages exist.**                |
| `DATABASE_URL`         | Postgres                                                           |
| `REDIS_URL`            | Typing indicators + SSE fan-out                                    |
| `INTERNAL_SERVICE_KEY` | For social to create a `ChatRoom` on match                         |

---

## 8. Why the keys cannot rotate

If we change `ENCRYPTION_KEY` and then try to read an old message, decryption returns gibberish. There is no way to recover the original text. So:

- Keys are stored in Kubernetes Secrets, double-encrypted at rest.
- Rotation is a deliberate one-way operation that requires re-encrypting every existing message — a multi-hour migration with no shortcuts.
- We back the keys up to a vault separate from Postgres backups.

---

## 9. Run locally / test

```bash
cd services/messaging && pnpm dev   # 3204
```

---

## 10. What changed and why it's better

- **Before:** messages stored as plaintext. Database leak = every conversation exposed.
- **After:** plaintext never lives in the database. Every message has a unique IV. Even our DBAs cannot read chats.
- **Why Priya feels it:** she can be honest in chat without worrying that an internal employee can read what she wrote.

---

## 11. If something breaks

| Symptom                                  | First check                                | Fix                            |
|------------------------------------------|--------------------------------------------|--------------------------------|
| Messages all show "[unable to decrypt]"  | `ENCRYPTION_KEY` / `_SALT` rotated?        | **Restore old keys immediately.** |
| New messages do not push in real time    | SSE connection alive at gateway            | restart pod, check NGINX timeout |
| Reactions duplicated                     | Idempotency key missing                    | check `reactions` route        |
