# users

## 1. Purpose

Owns the user-facing profile surface: profile fields, photos, prompts, interests, settings, privacy, search, bookmarks, and the generic `UserData` key-value store. Hosts the onboarding-completion endpoint used by the gateway gate.

## 2. Mental model

A wide CRUD service on top of `Profile` and its satellites. Pure HTTP, stateless. The only "smart" endpoint is `/api/v1/search`, which combines a Postgres lexical query with the shared `rerankSearch` v4 algo when the flag is on.

## 3. Public surface

| Method | Path | Purpose | Source |
|---|---|---|---|
| GET | `/api/v1/users` | First 50 active users + photos | [server.ts](src/server.ts#L33) |
| GET | `/api/v1/users/:id` | One user + photos + prompts + interests | [server.ts](src/server.ts#L42) |
| GET | `/api/v1/profiles/me` | My profile | [server.ts](src/server.ts#L57) |
| PUT | `/api/v1/profiles/me` | Update fields + recompute `completionScore` | [server.ts](src/server.ts#L67) |
| GET | `/api/v1/profiles/me/completion` | Score + threshold + missing buckets + DTM flag | [server.ts](src/server.ts#L113) |
| PUT | `/api/v1/profiles/me/prompts` | Set Q&A list (ordered) | [server.ts](src/server.ts#L122) |
| PUT | `/api/v1/profiles/me/interests` | Set interest tags | [server.ts](src/server.ts#L136) |
| POST | `/api/v1/profiles/me/photos` | Upload photo (max 9; auto-position) | [server.ts](src/server.ts#L151) |
| DELETE | `/api/v1/profiles/me/photos/:photoId` | Delete + reorder | [server.ts](src/server.ts#L163) |
| GET / PUT | `/api/v1/settings` | Read / update Settings | [server.ts](src/server.ts#L180) |
| PUT | `/api/v1/settings/privacy` | Update PrivacySettings | [server.ts](src/server.ts#L208) |
| POST | `/api/v1/settings/deactivate` | Soft-delete | [server.ts](src/server.ts#L240) |
| POST | `/api/v1/settings/reactivate` | Undo soft-delete | [server.ts](src/server.ts#L249) |
| GET | `/api/v1/settings/export` | GDPR data export | [server.ts](src/server.ts#L256) |
| GET | `/api/v1/settings/blocks` | List Block rows | [server.ts](src/server.ts#L267) |
| DELETE | `/api/v1/settings/delete` | Hard cascade delete | [server.ts](src/server.ts#L276) |
| GET | `/api/v1/search` | Lexical + (flag) v4 re-rank | [server.ts](src/server.ts#L303) |
| GET / POST / DELETE | `/api/v1/bookmarks` | Bookmarks CRUD | [server.ts](src/server.ts#L403) |
| GET / POST / PUT / DELETE / PUT `/upsert/:type` | `/api/v1/user-data` | Generic JSON KV store | [server.ts](src/server.ts#L440) |

## 4. Data model

Writes `Profile`, `ProfilePhoto`, `ProfilePrompt`, `ProfileInterest`, `Settings`, `PrivacySettings`, `Bookmark`, `SearchLog`, `UserData`. Reads `User`, `Block`, `Match` (for search relevance).

## 5. Dependencies

| Talks to | Why | How |
|---|---|---|
| Postgres | profile / settings / bookmarks | Prisma |
| `services/shared/src/completion.ts` | `recomputeAndPersistCompletion`, threshold logic | in-process |
| `services/shared/src/algo/searchAugment` | optional v4 re-rank | in-process |

## 6. Configuration

| Env | Default | Purpose |
|---|---|---|
| `PORT` | `3202` | HTTP port |
| `DATABASE_URL` | — | Postgres |
| `INTERNAL_SERVICE_KEY` | — | Reject calls not from gateway |
| `ALGO_V4_RANK_ENABLED_SEARCH` | `0` | Turn on `rerankSearch` blend |

## 7. Worked example — onboarding gate

```
Browser:   GET /api/v1/profiles/me/completion
Users:     SELECT Profile + counts of photos, prompts, interests
           computeCompletionScore(Profile) → e.g. { score: 72, threshold: 60,
                                                    missing: ['bio','prompts'], dtm: false }
           UPDATE Profile.completionScore = 72
           → 200
Gateway:   caches result 60 s; next /api/v1/discover passes the gate.
```

## 8. Local dev

```bash
cd services/users
npx prisma generate --schema=../shared/prisma/schema.prisma
npm run dev          # tsx watch → :3202
```

## 9. Tests

None local. Covered by `scripts/api-test.sh` and the Python suites.

## 10. Failure modes & operational notes

- **Photo upload of >10 MB** → rejected by gateway body limit. Bump only if needed.
- **`completionScore` stale** → gateway cache is 60 s; a profile edit takes effect within a minute on the gate.
- **`rerankSearch` failure** → handler catches and falls back to lexical order; logs a warning.

## 11. What changed & why it's good

- **Before:** Profile reads were scattered across services; search was a `LIKE` query with no personalisation.
- **After:** One owner for profile state; search blends lexical + `forYou` behind a flag; onboarding score is one cached endpoint.
- **Why it matters:** Adding a profile field is a one-service change. Search relevance can be A/B-tested without touching the query layer.
