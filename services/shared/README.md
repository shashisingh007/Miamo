# shared — the recipe book and tool drawer

**TL;DR:** `shared` is not a running service. It is the library every other service borrows from — the one Prisma schema (blueprint for the filing cabinet), the 17 ranking algorithms (recipes that score how well two people match), the event catalogue, the logger.

---

## How to read this

- **Meera**: Section 1 only.
- **Priya / PM**: Sections 1–3.
- **Engineer**: All.

---

## 1. Why does this exist

Eleven services. One database. Seventeen ranking algorithms. If each service rolled its own schema or its own logger we would diverge in days. `shared` is the canonical place where one schema, one set of algorithms, one set of helpers live — and every other service imports from it.

---

## 2. What is inside

```
services/shared/
├── package.json
├── prisma/
│   ├── schema.prisma          # 80+ models — the whole blueprint
│   ├── migrations/            # every renovation of the filing cabinet, dated
│   └── seed.ts                # 7 demo accounts incl. Priya, Arjun, Meera, Rohan
└── src/
    ├── algo/                  # 17 ranking algorithms, all pure functions
    │   ├── forYou.ts          # the canonical pairwise score 0..100
    │   ├── aiPicks.ts
    │   ├── aiMatch.ts
    │   ├── new.ts
    │   ├── active.ts
    │   ├── verified.ts
    │   ├── serious.ts
    │   ├── cf.ts
    │   ├── dtm.ts
    │   ├── moves.ts
    │   ├── messageSuggest.ts
    │   ├── beats.ts
    │   ├── notifyTiming.ts
    │   ├── searchAugment.ts
    │   ├── feedAugment.ts
    │   ├── postImpressionRerank.ts
    │   ├── registry.ts        # registerAlgo() + GET /v4/registry endpoint
    │   ├── signals.ts         # SignalReader — only boundary between DB and algos
    │   ├── math.ts            # cosTo01, expDecay, jaccard, compose, clip100
    │   └── __tests__/         # 225+ tests in ~1.2s, no I/O
    ├── track/
    │   └── events.ts          # TrackEventName union — the 50 events in 10 families
    ├── audit.ts               # audit logging helper
    ├── logger.ts              # Pino structured logger
    ├── cache.ts               # Redis client wrapper
    ├── ml-engine.ts           # light ML helpers
    ├── activity-analyzer.ts   # derived signal helpers
    └── algorithms.ts          # legacy v3 shim
```

---

## 3. Three things every service depends on

### 3.1 The Prisma schema

`services/shared/prisma/schema.prisma` is the **single source of truth** for the database. 80+ models. One migration history. Every service runs against this schema.

A migration is "renovating the filing cabinet": adding a new drawer, renaming a folder. Every renovation lives forever in `prisma/migrations/`.

### 3.2 The 17 algorithms

All ranking lives here, not in services. Each algorithm is a **pure function** with explicit weights and an `explain` return so we can audit any ranking after the fact.

See [docs/ALGORITHMS.md](../../docs/ALGORITHMS.md) for the catalogue.

### 3.3 The event catalogue

`src/track/events.ts` defines `TrackEventName` — the 50 events organised into 10 families. Adding a new event = adding a name here.

See [docs/TRACKING.md](../../docs/TRACKING.md) for the full catalogue.

---

## 4. Worked example — a service importing shared

```ts
// services/social/src/ranker.ts
import { PrismaClient } from '@miamo/shared/prisma';
import { scoreForYouV4, scoreAiPicksV4 } from '@miamo/shared/algo';
import { SignalReader } from '@miamo/shared/algo/signals';
import { logger } from '@miamo/shared/logger';

const prisma = new PrismaClient();
const reader = new SignalReader(prisma);

export async function rankDiscover(viewerId: string, candidates: User[]) {
  const ctx = await reader.loadFor(viewerId);
  return candidates
    .map(c => ({ ...c, score: scoreForYouV4(ctx, c).score }))
    .sort((a, b) => b.score - a.score);
}
```

The service does almost nothing: it composes pieces from `shared`.

---

## 5. The 17 algorithms registry

Every algo calls `registerAlgo({ name, surface, usesEvents, weights })` at module load. The result is queryable:

```bash
curl http://gateway/v4/registry
```

Returns JSON listing every enabled algo, its surface, the events it consumes, and its weights. Used by Grafana dashboards and the admin "Why this rank?" inspector.

---

## 6. Running the test suite

```bash
cd services/shared
pnpm test           # 225+ tests, ~1.2s, no DB
```

The tests are pure-function tests against the algorithms. They run on every PR.

---

## 7. Adding a new algorithm (8-step recipe)

1. Write `src/algo/myNew.ts` as a pure function returning `{ score, explain }`.
2. Add weights as `MY_NEW_WEIGHTS` constant.
3. `registerAlgo({ name, surface, usesEvents, weights })`.
4. Add `__tests__/myNew.test.ts` (≥95% branch coverage).
5. Add `ALGO_V4_RANK_ENABLED_MYNEW` to `.env.example` (default `'0'`).
6. Wire from the consuming service behind the flag.
7. Ship.
8. Flip in staging → 1 % prod → 100 %.

---

## 8. What changed and why it's better

- **Before:** ranking SQL was duplicated across three services. Schema drift between dev and prod was constant.
- **After:** one schema, one set of algorithms, one logger. Every service stays consistent automatically.
- **Why Priya feels it:** consistent ranking everywhere — Discover, AI Picks, AI Match, Search, Feed — because they all use the same forYou recipe under the hood.

---

## 9. If something breaks

| Symptom                                  | First check                                       | Fix                                |
|------------------------------------------|---------------------------------------------------|------------------------------------|
| `pnpm i` fails on shared                 | Node version matches `package.json`?              | nvm use                            |
| Schema drift error                       | `prisma migrate status`                           | `prisma migrate deploy`            |
| Tests fail after refactor                | Score helper signature changed                    | Check `math.ts` exports            |
| Algo not appearing in `/v4/registry`     | `registerAlgo()` not called at module load        | Import the file in `algo/index.ts` |
