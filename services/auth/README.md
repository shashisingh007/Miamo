# auth — the bouncer (port 3201)

**TL;DR:** auth is the bouncer that checks who Priya is and issues her a wristband (JWT — a wristband with an expiry stamp) good for 15 minutes.

---

## How to read this

- **Meera (non-tech)**: Sections 1–2.
- **Priya / PM**: Sections 1–4.
- **Engineer**: All.

---

## 1. A scene

8:59pm. Priya opens the app. Her phone shows the login screen. She types her phone number and a one-time password (OTP) we sent. Her phone fires `POST /v1/auth/login`. In ~300ms the auth service:

1. Confirms the OTP is correct and not expired.
2. Issues two wristbands: a 15-minute access token (for normal requests) and a 30-day refresh token (to silently get new access tokens).
3. Returns both to her phone, which stores them safely.

For the next 30 days Priya does not have to log in again, even though every individual access token only lasts 15 minutes.

---

## 2. What this service is responsible for

- **Login / OTP** — phone number → SMS OTP → verify → issue tokens.
- **Refresh** — exchange a valid refresh token for a fresh access token.
- **Logout** — revoke a refresh token.
- **Password reset** (for email-based test accounts) — bcryptjs cost 12.
- **Account creation** on first successful OTP verify.

What it does **not** do: profile data, photos, preferences. That is the `users` service.

---

## 3. Endpoints

| Method | Path                          | What it does (plain English)                     |
|--------|-------------------------------|--------------------------------------------------|
| POST   | `/v1/auth/otp/send`           | Send OTP to a phone number                       |
| POST   | `/v1/auth/otp/verify`         | Verify OTP, issue access + refresh wristbands    |
| POST   | `/v1/auth/refresh`            | Trade refresh wristband for a fresh access one   |
| POST   | `/v1/auth/logout`             | Revoke refresh wristband                         |
| GET    | `/v1/auth/me`                 | Who am I? (used by the gateway sanity-check)     |

---

## 4. Worked example — first login

```
1. Phone   POST /v1/auth/otp/send   { phone: "+919876543210" }
2. Auth    Twilio.send("+919876543210", "Your Miamo code: 482913")
3. Phone   POST /v1/auth/otp/verify { phone, otp: "482913" }
4. Auth    OTP matches and not expired (5 min TTL in Redis).
5. Auth    Create User row in Postgres if first login.
6. Auth    JWT_access  = jwt.sign({sub: uid}, JWT_SECRET, { expiresIn: '15m' })
           JWT_refresh = jwt.sign({sub: uid}, JWT_REFRESH_SECRET, { expiresIn: '30d' })
7. Auth    Store hashed refresh in Postgres → can revoke later.
8. Phone   Saves both tokens, never asks again for 30 days.
```

15 minutes later her access token expires. Her phone silently calls `/v1/auth/refresh`, gets a new access token in ~50ms, and continues. Priya never notices.

---

## 5. Tables it owns (from `services/shared/prisma/schema.prisma`)

- `User` — the row that says "this phone is this uid"
- `Session` — refresh-token records, one per device, revocable
- `OtpAttempt` — rate-limit attempts (max 5/15 min)

---

## 6. Code layout

```
services/auth/src/
├── server.ts
├── routes/
│   ├── otp.ts
│   ├── refresh.ts
│   └── logout.ts
├── otp.ts                  # send + verify + Redis TTL
└── tokens.ts               # sign + verify JWTs
```

---

## 7. Configuration

| Env var                 | What it does                            |
|-------------------------|-----------------------------------------|
| `JWT_SECRET`            | Access-token signing key                |
| `JWT_REFRESH_SECRET`    | Refresh-token signing key               |
| `OTP_TTL_SEC`           | OTP lifetime (default 300 = 5min)       |
| `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM` | SMS provider creds       |
| `DATABASE_URL`          | Postgres                                |
| `REDIS_URL`             | Whiteboard for OTPs and attempt counters |

---

## 8. Security details

- **bcryptjs cost 12** for stored passwords → ~250ms per check, brute-force hopeless.
- **OTP rate-limit:** 5 attempts per phone per 15 minutes.
- **Refresh-token rotation:** every refresh returns a new refresh token; the old one is revoked.
- **JWT HS256** with 15-min access / 30-day refresh.
- **Logout** deletes the Session row; even if someone keeps the old refresh token it returns 401.

---

## 9. Run locally / test

```bash
cd services/auth
pnpm install
pnpm dev          # 3201

curl -X POST http://localhost:3201/v1/auth/otp/send -d '{"phone":"+919999999999"}' -H content-type:application/json
```

Demo accounts (from `services/shared/prisma/seed.ts`) bypass OTP — use OTP `000000`.

---

## 10. What changed and why it's better

- **Before:** session was a long-lived cookie. Steal it, you owned the account forever.
- **After:** 15-minute access token + 30-day rotating refresh. Steal an access token, it expires before you can use it twice.
- **Why Priya feels it:** she logs in once a month, and even if her phone is compromised the attacker's window is small.

---

## 11. If something breaks

| Symptom                         | First check                              | Fix                              |
|---------------------------------|------------------------------------------|----------------------------------|
| OTP never arrives               | Twilio creds + balance                   | Re-check `TWILIO_*` env          |
| `401` after refresh             | Session row revoked or `JWT_REFRESH_SECRET` rotated | Re-login              |
| Floods of OTP requests          | `OtpAttempt` rate limit                  | Check IP, block at gateway       |
