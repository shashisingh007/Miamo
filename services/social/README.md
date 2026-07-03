# social — the matchmaker (port 3203)

**TL;DR:** social is the matchmaker. It decides who Priya sees in Discover, AI Picks, and AI Match — by calling the 17 ranking algorithms (recipes that score how well two people match) and applying a fatigue penalty so she does not see the same face twice in 48 hours.

---

## How to read this

- **Meera**: Sections 1–2.
- **Priya / PM**: Sections 1–4.
- **Engineer**: All.

---

## 1. A scene

9:02pm. Priya opens Discover. Her phone fires `GET /v1/social/discover?limit=10`. In ~40ms the social service:

1. Fetches ~200 candidate profiles within her preference filters.
2. For each candidate, asks the `forYou` algorithm for a score (0–100).
3. Subtracts a fatigue penalty so anyone she's seen ≥6 times in 48h is demoted.
4. Sorts by final score and returns the top 10.

The first card she sees: Arjun (score 69). She swipes right.

---

## 2. What this service is responsible for

- **Discover** — the swipe stack, ranked by `forYou`.
- **Swipe** — record like / pass / super-like; create Match if mutual.
- **AI Picks** — daily curated list using the `aiPicks` algo.
- **AI Match** — one top-1 curated daily card, computed by worker (`daily-match.ts`).
- **Boost surfaces** — New, Active, Verified, Serious (each a different algo).
- **Search** — keyword + `searchAugment` re-rank.

What it does **not** do: feed/posts (`content`), chat (`messaging`), notifications (`notifications`).

---

## 3. Endpoints

| Method | Path                       | Plain English                                         |
|--------|----------------------------|-------------------------------------------------------|
| GET    | `/v1/social/discover`      | Next 10 cards, ranked                                  |
| POST   | `/v1/social/swipe`         | `{targetId, dir: right\|left\|super}`                  |
| GET    | `/v1/social/matches`       | All my matches                                         |
| GET    | `/v1/social/aipicks`       | Today's AI Picks (top ~20)                             |
| GET    | `/v1/social/aimatch`       | Today's AI Match (top 1)                               |
| GET    | `/v1/social/new`           | New joiners surfaced by `new` algo                     |
| GET    | `/v1/social/active`        | Online / active users                                  |
| GET    | `/v1/social/verified`      | Verified profiles                                      |
| GET    | `/v1/social/serious`       | Marriage / serious-intent ranked                       |
| POST   | `/v1/social/search`        | Keyword + augmented re-rank                            |

---

## 4. Worked example — Priya × Arjun

```
1. GET /v1/social/discover
2. Social fetches 200 candidates within Priya's filters.
3. For each: forYou.score(priya, candidate)
   → Arjun:
     interestCos      = 0.81   (jaccard on tags)
     vibeCos          = 0.78
     behaviorCos      = 0.70
     chronoOverlap    = 1.00   (both evening)
     prior            = 0.45
     intentMatch      = 1.00
     distance         = 0.00   (857km)
     ageDelta         = 0.71
     raw = 0.729 → clip100 → 73
     impressionsLast48h = 6
     fatigue = 2·ln(1+6) = 3.89
     final = 73 - 3.89 = 69
4. Sort all 200, take top 10 → Arjun at position 4.
```

---

## 5. Tables it owns

- `Swipe` — every right/left/super
- `Match` — when two users like each other
- `Block` — explicit block list
- `Boost` — paid-boost windows
- `PairCompatCache` — written by tracking-worker, read by forYou cache-hit path
- `DailyMatch` — written by `daily-match.ts` worker, read by AI Match screen

---

## 6. Code layout

```
services/social/src/
├── server.ts
├── routes/
│   ├── discover.ts
│   ├── swipe.ts
│   ├── aipicks.ts
│   └── aimatch.ts
└── ranker.ts                 # calls algos from services/shared/src/algo/
```

The 17 algorithms themselves live in `services/shared/src/algo/`. Social does not contain ranking logic — it composes.

---

## 7. Configuration

| Env var                                    | What it does                       |
|--------------------------------------------|------------------------------------|
| `DATABASE_URL`                             | Postgres                           |
| `REDIS_URL`                                | Cache + rate limit                 |
| `ALGO_V4_RANK_ENABLED_DISCOVER`            | Light switch — flip without redeploy |
| `ALGO_V4_RANK_ENABLED_AIMATCH`             | Same                                |
| `ALGO_V4_RANK_ENABLED_SEARCH`              | Same                                |
| `EXPLORE_EPSILON`                          | 0.10 — explore vs exploit balance  |

All algo flags default `'0'` (off). Production overrides per env in `configuration/{env}/values.yaml`.

---

## 8. Run locally / test

```bash
cd services/social && pnpm dev   # 3203
pnpm -w test                     # 225+ algo unit tests in ~1.2s
```

---

## 9. What changed and why it's better

- **Before:** ranking was an `ORDER BY interest_score DESC LIMIT 10` SQL clause with hard-coded weights. No audit, no A/B, no explain.
- **After:** 17 pure-function algorithms with explicit weights, an `explain` output per ranking, 225 unit tests, and feature flags.
- **Why Priya feels it:** her Discover order genuinely learns from her behaviour. If an experiment hurts her CTR we flip a flag and her experience reverts in seconds.

---

## 10. If something breaks

| Symptom                            | First check                                  | Fix                                |
|------------------------------------|----------------------------------------------|------------------------------------|
| Discover returns chronological order | `ALGO_V4_RANK_ENABLED_DISCOVER='1'`?       | Flip the flag on                   |
| AI Match always empty              | `daily-match.ts` worker running?             | Check tracking-worker logs         |
| Same person over and over          | Fatigue penalty disabled?                    | Check `impressionsLast48h` source  |
| Scores all 50                      | `SignalReader` returning neutral defaults    | Consent scope missing              |
