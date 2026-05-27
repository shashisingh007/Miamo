# notifications — the polite tap (port 3206)

**TL;DR:** notifications is the polite tap on the shoulder. It picks the right moment to nudge Priya (using the `notifyTiming` algorithm) and delivers via push, email, or SMS.

---

## How to read this

- **Meera**: Sections 1–2.
- **Priya / PM**: Sections 1–4.
- **Engineer**: All.

---

## 1. A scene

Tuesday 08:15am. Arjun's message from last night is waiting. We don't ping Priya at 03:00 like a bad app. We waited because her last-28-days hour-of-week histogram shows she opens the app reliably between 08:00 and 09:00 on Tuesdays (p(open) = 0.78). Her phone buzzes at exactly 08:15.

---

## 2. What this service is responsible for

- **Schedule** — decide *when* to deliver each notification using the `notifyTiming` algo.
- **Deliver** — push (FCM/APNs), email, SMS, in-app.
- **Preferences** — what channels each user wants.
- **Read state** — mark in-app notifications as read.

It does **not** generate the content. Other services (social, messaging, content) emit "events" and notifications decides whether, when, and how to deliver.

---

## 3. Endpoints

| Method | Path                                 | Plain English                                 |
|--------|--------------------------------------|-----------------------------------------------|
| GET    | `/v1/notifications`                  | My in-app notifications                       |
| POST   | `/v1/notifications/:id/read`         | Mark one as read                              |
| POST   | `/v1/devices`                        | Register FCM/APNs token                       |
| DELETE | `/v1/devices/:token`                 | Unregister on logout                          |
| GET    | `/v1/notifications/preferences`      | Channel & quiet-hours prefs                   |
| PATCH  | `/v1/notifications/preferences`      | Update prefs                                  |
| POST   | `/internal/notify`                   | (service-only) emit an event to deliver       |

---

## 4. Worked example — Arjun's message → push

```
22:47   Arjun sends message to Priya.
22:47   messaging → POST /internal/notify { to: priya, kind: 'message', from: arjun }
22:47   notifications applies notifyTiming:
        - load Priya's 168-bucket hour-of-week histogram from last 28d
        - scan forward 24h from now
        - find first bucket where p(open) ≥ 0.6
        - Tue 08:00 hour → p = 0.78
        - jitter ±29 min → schedule 08:15
22:47   Insert NotificationSchedule row with sendAt = Tue 08:15
Tue 08:15  Worker tick fires → FCM push to Priya's iPhone.
```

If Priya happens to be active inside the app at 22:47 (heartbeat in last 5 min), we deliver in-app immediately instead of scheduling.

---

## 5. Tables it owns

- `Notification` — in-app notification rows
- `Device` — FCM/APNs tokens, one per device
- `NotifyPreference` — per-user channel + quiet-hours
- `NotificationSchedule` — queued deliveries with `sendAt`

---

## 6. Code layout

```
services/notifications/src/
├── server.ts
├── routes/
│   ├── notify.ts
│   ├── prefs.ts
│   └── devices.ts
├── timing.ts        # calls notifyTiming algo
├── push.ts          # FCM + APNs
└── email.ts         # SES wrapper
```

---

## 7. Configuration

| Env var                       | What it does                       |
|-------------------------------|------------------------------------|
| `DATABASE_URL`                | Postgres                           |
| `REDIS_URL`                   | Schedule queue                     |
| `FCM_SERVER_KEY`              | Android push                       |
| `APNS_KEY_ID`, `APNS_TEAM_ID` | iOS push                           |
| `SES_REGION`, `SES_FROM`      | Email                              |
| `ALGO_V4_RANK_ENABLED_NOTIFICATIONS` | Flip `notifyTiming` on/off  |

---

## 8. Run locally / test

```bash
cd services/notifications && pnpm dev   # 3206
```

---

## 9. What changed and why it's better

- **Before:** every notification fired immediately. Priya got a buzz at 03:14 and the next morning the app sat unopened.
- **After:** `notifyTiming` learns Priya's hour-of-week histogram and only pings her when she is likely to actually open. Jittered to avoid thundering-herd.
- **Why Priya feels it:** her phone does not buzz at 3am. Notifications arrive when she'd open them anyway.

---

## 10. If something breaks

| Symptom                         | First check                                | Fix                            |
|---------------------------------|--------------------------------------------|--------------------------------|
| No pushes delivered             | FCM/APNs credentials                       | Re-check env                   |
| Every push goes at 09:00 sharp  | Jitter not applied                         | Check `timing.ts` jitter logic |
| `notifyTiming` returns null     | < 28d of `session.start` events             | Fall back to next 1h          |
