# content

## 1. Purpose

Owns user-generated content: long-form feed posts, ephemeral 7-day stories, videos, and the creativity gallery (categorised art / poetry / music / fitness). Provides the personalised creativity feed and the optional v4 feed augmentation.

## 2. Mental model

Pure CRUD service on top of the content tables. Two "smart" surfaces:

- **`/api/v1/feed`** — chronological by default; when `ALGO_V4_RANK_ENABLED_FEED=1`, blends `sourceScore` (50%) + `forYou` (30%) + recency (20% with 6h halflife) via `rerankFeed`.
- **`/api/v1/creativity/feed`** — collaborative filtering + activity signals + category engagement; deterministic, no v4 dependency.

## 3. Public surface

| Method | Path | Purpose |
|---|---|---|
| GET / POST / PUT / DELETE | `/api/v1/feed[/:id]` | Feed CRUD |
| POST | `/api/v1/feed/:id/react`, `/comments`, GET `/comments` | Reactions + comments |
| GET / POST / DELETE | `/api/v1/stories[/:id]` | Story CRUD (7-day expiry) |
| POST | `/api/v1/stories/:id/{view,like,react,post-to-feed}` | Story actions |
| GET / POST / DELETE | `/api/v1/stories/:id/comments` | Story comments (matched users only) |
| GET / POST | `/api/v1/videos[/:id]` | Video CRUD |
| POST | `/api/v1/videos/:id/react`, `/comments` | Video reactions/comments |
| GET | `/api/v1/creativity/categories` | Categories + counts |
| GET | `/api/v1/creativity/feed` | Personalised gallery (CF + activity) |
| GET / POST | `/api/v1/creativity[/:id]` | Creativity items CRUD |
| POST | `/api/v1/creativity/:id/{react,view,hide,share}` | Item actions |
| GET | `/api/v1/creativity/trends` | Trending items by category |

Source: [server.ts](src/server.ts) (~1740 lines).

## 4. Data model

Writes: `FeedPost`, `FeedComment`, `FeedReaction`, `Story`, `StoryView`, `StoryComment`, `StoryLike`, `Video`, `VideoComment`, `VideoReaction`, `CreativityCategory`, `CreativityItem`, `CreativityView`, `CreativityReaction`, `CreativityComment`, `Trend`.

## 5. Dependencies

| Talks to | Why | How |
|---|---|---|
| Postgres | content tables | Prisma |
| `services/shared/src/algo/{feedAugment,scoreUserActivity,dtm}` | feed re-rank, creativity personalisation | in-process |
| LRU caches | `feedCache`, `activityCache` | in-process |

No outbound HTTP.

## 6. Configuration

| Env | Default | Purpose |
|---|---|---|
| `PORT` | `3205` | HTTP port |
| `DATABASE_URL` | — | Postgres |
| `INTERNAL_SERVICE_KEY` | — | Internal-call auth |
| `ALGO_V4_RANK_ENABLED_FEED` | `0` | Enable feed re-rank |

## 7. Worked example — feed with v4 enabled

```
Browser:  GET /api/v1/feed?cursor=<id>&limit=20
Content:  load 60 candidate posts (followed authors + matches, last 7d)
          for each post p:
            sourceScore = invertedIndex(p.author, viewer)   # 0..1
            forYouScore = scoreForYou({ me, cand=p.author, ... }).score / 100
            ageSec      = (now - p.createdAt)/1000
            blended     = rerankFeed({ sourceScore, forYouScore, itemAgeSec: ageSec })
            p._rank = blended
          sort by _rank desc; return 20
```

## 8. Local dev

```bash
cd services/content
npx prisma generate --schema=../shared/prisma/schema.prisma
npm run dev
```

## 9. Tests

[tests/algo-feed-augment.test.ts](../../tests/algo-feed-augment.test.ts) asserts deterministic scoring and that strong `forYou` authors can outrank slightly newer weak authors.

## 10. Failure modes & operational notes

- **Feed cache TTL** — defaults to short window; spikes during create/delete are absorbed by invalidation on mutation.
- **Creativity hide** is per-user — a hidden item never resurfaces in the personalised feed for that viewer.
- **Story expiry** — `expiresAt` filter on reads; no background sweeper (rows kept for analytics; queries filter).

## 11. What changed & why it's good

- **Before:** Feed was strict chronological; strong content from an active connection could be buried under timeline noise.
- **After:** When `ALGO_V4_RANK_ENABLED_FEED=1`, recent items still dominate, but a strong-affinity author can surface to the top. Feed remains deterministic and explainable.
- **Why it matters:** Engagement improves without sacrificing user trust in the timeline — recency stays the dominant signal at 50%.
