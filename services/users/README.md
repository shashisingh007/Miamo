# users — the profile keeper (port 3202)

**TL;DR:** users keeps Priya's profile (the permanent filing cabinet drawer with her name on it) — name, age, photos, intent, preferences — and decides who can see what.

---

## How to read this

- **Meera**: Sections 1–2.
- **Priya / PM**: Sections 1–4.
- **Engineer**: All.

---

## 1. A scene

7pm Sunday. Priya wants to update her bio from "trekker, photographer" to "trekker, photographer, learning Tamil". She taps Edit, types, hits save. Her phone fires `PATCH /v1/users/me`. In ~25ms the users service updates her row in Postgres and invalidates her profile cache. Within 15 minutes the social service re-ranks her against all candidates with the fresh signal.

---

## 2. What this service is responsible for

- **Profile** — name, age, gender, location, bio, photos, languages.
- **Preferences** — age range, distance, intent (`serious` / `casual`).
- **Albums** — photo uploads, primary photo selection, unlock requests.
- **Consent scopes** — `analytics`, `personalization`, `social_signals`, `ml_enrichment`.
- **Visibility** — who can see your profile (matched / discoverable / paused).

What it does **not** do: matching, swiping (`social`), chat (`messaging`), tracking (`ingest`).

---

## 3. Endpoints

| Method | Path                              | Plain English                                          |
|--------|-----------------------------------|--------------------------------------------------------|
| GET    | `/v1/users/me`                    | My full profile                                         |
| PATCH  | `/v1/users/me`                    | Update name/bio/etc.                                    |
| PATCH  | `/v1/users/me/preferences`        | Change age range, intent, distance                      |
| POST   | `/v1/users/me/photos`             | Upload a new album photo                                |
| DELETE | `/v1/users/me/photos/:id`         | Remove a photo                                          |
| GET    | `/v1/users/:id`                   | Public-safe view of another user's profile              |
| POST   | `/v1/users/me/consent`            | Grant or revoke a consent scope                         |
| POST   | `/v1/users/me/pause`              | Pause my account                                        |
| DELETE | `/v1/users/me`                    | Right-to-be-forgotten — shred my file                   |

---

## 4. Worked example — bio update

```
1. Phone   PATCH /v1/users/me   { bio: "trekker, photographer, learning Tamil" }
2. Gateway verifies JWT → forwards with X-User-Id: priya-uuid
3. Users   UPDATE "User" SET bio=... WHERE id=priya-uuid  (~10ms)
4. Users   redis DEL cache:profile:priya-uuid (so next read is fresh)
5. Users   Returns 200 + updated row.
6. ~15min later: tracking-worker's next FeatureSnapshot picks up the change.
7. Social  Next Discover refresh uses the new bio for `interestCos`.
```

---

## 5. Tables it owns

From `services/shared/prisma/schema.prisma`:

- `User` (shared with auth — auth writes `phone`, users writes everything else)
- `Photo` — one row per album image
- `Preference` — age/distance/intent
- `ConsentScope` — grants per scope
- `LoveLanguage`, `Lifestyle`, `Identity` — extended profile fields

---

## 6. Code layout

```
services/users/src/
├── server.ts
├── routes/
│   ├── me.ts
│   ├── photos.ts
│   ├── preferences.ts
│   └── consent.ts
├── upload.ts         # S3-compatible photo upload
└── completeness.ts   # computes profile-completeness score
```

---

## 7. Configuration

| Env var               | What it does                              |
|-----------------------|-------------------------------------------|
| `DATABASE_URL`        | Postgres                                  |
| `REDIS_URL`           | Profile cache                             |
| `S3_BUCKET`, `S3_KEY`, `S3_SECRET` | Photo storage                |
| `INTERNAL_SERVICE_KEY`| For service-to-service calls (from social) |

---

## 8. Privacy notes

- Photos are stored in S3 with signed URLs (expire in 1 hour).
- Public profile endpoint (`GET /v1/users/:id`) strips phone + email and includes only fields the viewer is allowed to see.
- `DELETE /v1/users/me` cascades: it deletes profile, photos, preferences, consent, and triggers `tracking-worker`'s `forget` job to erase tracking aggregates.

---

## 9. Run locally / test

```bash
cd services/users && pnpm dev   # 3202
```

---

## 10. What changed and why it's better

- **Before:** the web app stitched profile data from 4 different tables across services.
- **After:** one endpoint, one schema, one cache. Profile updates flow to ranking within 15 minutes.
- **Why Priya feels it:** she updates her bio, and the very next Discover refresh shows her better matches.

---

## 11. If something breaks

| Symptom                          | First check                          | Fix                          |
|----------------------------------|--------------------------------------|------------------------------|
| Photo upload fails               | S3 credentials                       | Re-check env                 |
| Profile shows stale data         | Cache TTL or DEL not running         | `redis DEL cache:profile:*`  |
| RTBF leaves stragglers           | `tracking-worker` forget job logs    | Re-run forget for that uid   |
