# content — the feed and beats (port 3205)

**TL;DR:** content owns posts, comments, the feed, Beats (music match), Moves (chat-move recommender data), and DTM (Decision-Tree-Match topic answers).

---

## How to read this

- **Meera**: Sections 1–2.
- **Priya / PM**: Sections 1–4.
- **Engineer**: All.

---

## 1. A scene

Saturday morning. Priya posts a photo from last weekend's Sandakphu trek. Arjun, who matched her two days ago, opens the feed at 11am. His feed shows Priya's post in the top 3, scored by `feedAugment`. He scrolls past Rohan's third "good morning" post in a row — `postImpressionRerank` will demote Rohan's next post by 15 points.

---

## 2. What this service is responsible for

- **Posts** — text + photo posts.
- **Comments** — threaded comments under a post.
- **Likes** — on posts.
- **Feed** — chronological + ranked feed.
- **Beats** — short music clips, music-taste matching.
- **Moves** — list of chat moves available; `moves` algo picks one.
- **DTM** — Decision-Tree-Match topics, questions, answers, derived `DtmVector`.
- **Vibe** — vibe-check questionnaire, answers, derived vibe vector.

---

## 3. Endpoints

| Method | Path                              | Plain English                                  |
|--------|-----------------------------------|------------------------------------------------|
| GET    | `/v1/feed`                        | Ranked feed                                     |
| POST   | `/v1/posts`                       | New post                                        |
| GET    | `/v1/posts/:id/comments`          | Comments on a post                              |
| POST   | `/v1/comments`                    | Add a comment                                   |
| POST   | `/v1/likes`                       | Like a post                                     |
| GET    | `/v1/beats`                       | Beats ranked by `beats` algo                    |
| POST   | `/v1/beats/:id/play`              | Record a play (also fires a tracking event)     |
| GET    | `/v1/dtm/topics`                  | DTM topics list                                 |
| POST   | `/v1/dtm/answers`                 | Save an answer                                  |
| GET    | `/v1/moves/suggest?pairId=…`      | Suggested next chat move (calls `moves` algo)   |
| POST   | `/v1/vibe/answers`                | Save vibe-check answer                          |

---

## 4. Worked example — feed rank

```
1. Phone   GET /v1/feed?cursor=…
2. Content fetches the chronological 50 newest posts from people Priya follows.
3. For each: feedAugment.score(priya, post)
   For Arjun's mountain photo:
     sourceScore = 0.80 (top-quartile chronological)
     forYou       = 0.69
     recency      = expDecay(3h, 12h) = 0.84
     raw = 0.50·0.80 + 0.30·0.69 + 0.20·0.84
         = 0.775 → clip100 → 77
4. postImpressionRerank applies a penalty if she has been skipping the author.
5. Return top 20 sorted.
```

---

## 5. Tables it owns

- `Post`, `Comment`, `Like`
- `Beat`, `BeatPlay`
- `Move` (move kinds catalog)
- `DtmTopic`, `DtmQuestion`, `DtmAnswer`, `DtmVector`
- `VibeQuestion`, `VibeAnswer`, `VibeVector`

---

## 6. Code layout

```
services/content/src/
├── server.ts
├── routes/
│   ├── feed.ts
│   ├── posts.ts
│   ├── beats.ts
│   ├── dtm.ts
│   └── moves.ts
└── ranker.ts        # calls feedAugment, beats, moves algos
```

---

## 7. Configuration

| Env var                            | What it does                  |
|------------------------------------|-------------------------------|
| `DATABASE_URL`                     | Postgres                      |
| `REDIS_URL`                        | Feed cache, beats cache       |
| `ALGO_V4_RANK_ENABLED_FEED`        | Flip the new feed ranker      |
| `ALGO_V4_RANK_ENABLED_BEATS`       | Flip the new beats ranker     |

---

## 8. Run locally / test

```bash
cd services/content && pnpm dev   # 3205
node services/content/seed-dtm.js  # seed DTM topics + questions
```

---

## 9. What changed and why it's better

- **Before:** the feed was reverse-chronological only. Beats was random.
- **After:** the feed re-ranks by `feedAugment` and penalises ignored authors. Beats personalises by genre and tempo fit.
- **Why Priya feels it:** her feed surfaces posts she actually wants to read; she stops scrolling past 4 of the same person's morning selfies.

---

## 10. If something breaks

| Symptom                          | First check                              | Fix                              |
|----------------------------------|------------------------------------------|----------------------------------|
| Feed is chronological            | `ALGO_V4_RANK_ENABLED_FEED='1'`?         | Flip the flag                    |
| Beats all the same songs         | Novelty signal not updating              | Worker embedding refresh         |
| DTM affinity always null         | DtmVector not computed                   | `daily-match.ts` worker logs     |
