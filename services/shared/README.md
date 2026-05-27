# shared

## 1. Purpose

The library every service imports. Owns the Prisma schema (one schema, many writers), all shared middleware (logger, audit, sanitiser, rate-limit boilerplate, idempotency, request-id, metrics, error handler), the validation schemas (Zod), the field-meta tables (icons, labels, options), the deep-compatibility math, the completion scorer, and — most importantly — the **17 v4 algorithms** with their `SignalReader` interface, registry, and per-surface flags.

## 2. Mental model

```
services/shared/
├── prisma/
│   ├── schema.prisma          # 80+ models, all services
│   ├── seed.ts                # 20 deterministic users
│   └── migrations/
└── src/
    ├── algo/                  # the 17 algos (see docs/ALGORITHMS.md)
    ├── service.ts             # createPrisma, applyBaseMiddleware, health routes
    ├── logger.ts              # JSON logs with PII redaction
    ├── audit.ts               # auditLog + trackActivity helpers
    ├── sanitize.ts            # XSS strip + recursive object sanitisation
    ├── idempotency.ts         # Idempotency-Key middleware
    ├── requestId.ts           # X-Request-ID propagation
    ├── metrics.ts             # prom-client middleware
    ├── errorHandler.ts        # Express error handler
    ├── schemas.ts             # Zod schemas (80+)
    ├── validate.ts            # body/req validation wrapper
    ├── env.ts                 # requireSecret + typed env accessors
    ├── coerce.ts              # safeUuid/safeLimit/safeEnum/cursorOpt
    ├── completion.ts          # onboarding score (60/75 thresholds)
    ├── dtmCompatibility.ts    # 16-dim deep compat
    ├── fieldMeta.ts           # CASUAL_FIELDS, DTM_FIELDS
    ├── optionIcons.ts         # icon mapping tables
    ├── visibility.ts          # profile redaction rules
    └── track/                 # tracking-side helpers (hash, events)
```

## 3. Public exports (highlights)

| Symbol | Purpose | Source |
|---|---|---|
| `createPrisma()` | Singleton Prisma client with logging | `src/service.ts` |
| `applyBaseMiddleware(app)` | Helmet, morgan, JSON body, error handler | `src/service.ts` |
| `installHealthRoutes(app)` | `/healthz` + `/readyz` | `src/service.ts` |
| `createInternalAuthMiddleware()` | `x-internal-key` gate | `src/service.ts` |
| `createPushToUser(deps)` | POST `/internal/push-event` helper | `src/service.ts` |
| `logger.info/warn/error` | JSON logs | `src/logger.ts` |
| `auditLog(action, userId, details)` | Best-effort insert into AuditLog | `src/audit.ts` |
| `sanitize(string)` / `sanitizeObject(obj, depth=5)` | XSS strip | `src/sanitize.ts` |
| `idempotency()` middleware | Redis `SET NX EX 86400` | `src/idempotency.ts` |
| `env.jwtSecret`, `env.encryptionKey`, … | Typed env accessors | `src/env.ts` |
| `computeCompletionScore(profile)` | 0..100 + missing buckets | `src/completion.ts` |
| `computeDtmCompatibility({mine,…,theirs})` | 16-d cosine | `src/dtmCompatibility.ts` |
| `PrismaSignalReader` | feature/pair lookups | `src/algo/signals.ts` |
| `registerAlgo(spec)` + `listAlgos()` | algo registry | `src/algo/registry.ts` |
| `scoreForYou`, `scoreAiPicksV4`, … | the 17 rankers | `src/algo/*.ts` |
| `v4RankEnabled(surface)` | flag check | `src/algo/flags.ts` |

## 4. Prisma schema highlights

80+ models grouped by domain (full listing in [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md#2-data-ownership-matrix)):

- **Users & Auth** — User, Profile, ProfilePhoto/Prompt/Interest, Settings, PrivacySettings, Session
- **Matching** — Like, MatchRequest, Match, MatchFeedback, MiamoMove, DiscoverFilter, VibeCheck, UserActivity
- **Messaging** — Chat, Message, Beat, BeatEvent
- **Content** — FeedPost/Comment/Reaction, Story+View/Comment/Like, Video+Comment/Reaction, CreativityCategory/Item/View/Reaction/Comment, Trend
- **DTM** — MatrimonialProfile (88 fields), ShowcaseItem, AccessRequest, BioDataAccessRequest
- **Safety** — Report, Block
- **System** — Notification, AuditLog, Bookmark, SearchLog, UserData
- **Tracking (v3.1)** — ConsentEvent, EventAggHourly, EventAggDaily, FeatureSnapshot, PairCompatCache, CfNeighbourCache, Embeddings

## 5. Seed

[prisma/seed.ts](prisma/seed.ts) inserts 20 deterministic users (`miamo1`..`miamo20`, password = username), a mix of intents and cities, plus creativity categories, feed posts, stories, matches, messages, beats. `SEED_DATE = 2026-05-01T12:00:00Z`. Re-runnable.

## 6. Configuration

| Env | Used by | Required |
|---|---|---|
| `DATABASE_URL` | `createPrisma()` | yes |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_SERVICE_KEY` | `env.ts` | yes (in services that need them) |
| `ENCRYPTION_KEY`, `ENCRYPTION_SALT` | `env.ts` (messaging) | yes for messaging |
| `TRACKING_HASH_SECRET` | `algo/signals.ts`, ingest, tracking-worker | yes for tracking |
| `ALGO_V4_RANK_ENABLED_*`, `ALGO_V4_WORKERS_ENABLED` | `algo/flags.ts` | no (default `'0'`) |

## 7. Worked example — using shared in a new service

```ts
// services/myservice/src/server.ts
import express from "express";
import { createPrisma, applyBaseMiddleware, installHealthRoutes,
         createInternalAuthMiddleware } from "@miamo/shared/service";
import { logger } from "@miamo/shared/logger";

const prisma = createPrisma();
const app = express();
applyBaseMiddleware(app);
installHealthRoutes(app);
app.use(createInternalAuthMiddleware());

app.get("/api/v1/myservice/ping", async (req, res) => {
  logger.info("ping", { uid: req.headers["x-user-id"] });
  res.json({ ok: true });
});

app.listen(Number(process.env.PORT ?? 3300));
```

## 8. Local dev

```bash
# Generate Prisma client (must be run after schema changes)
cd services/shared
npx prisma generate

# Migrate + seed (from repo root)
npm run db:migrate
npm run db:seed
```

## 9. Tests

[tests/algo-e2e.test.ts](../../tests/algo-e2e.test.ts), `tests/algo-discover-fatigue.test.ts`, `tests/algo-feed-augment.test.ts`. All run against `FakeSignalReader` — no DB. 225 cases.

```bash
npx vitest run
```

## 10. Failure modes & operational notes

- **Schema drift** between services → only the migrations checked into `services/shared/prisma/migrations` run. Avoid editing migrations after they ship.
- **PII in logs** → `logger.ts` redacts known fields (email, password, token). New sensitive fields must be added to the redact list.
- **`sanitize` recursion depth** is capped at 5; deeper structures get truncated.
- **Algo registry** — algos register on import. A service that never imports an algo file won't have it in its in-process registry; only tracking-worker's `/v4/status` is meant to enumerate all algos.

## 11. What changed & why it's good

- **Before:** Each service had its own logger, sanitiser, Prisma client, and bespoke middleware. The 17 ranking functions were copy-pasted into the services that needed them.
- **After:** One library, one schema, one set of conventions; algos live behind the `SignalReader` interface so swapping data sources is a one-class change.
- **Why it matters:** A new service is ~30 lines (see §7). A ranker change is one file plus one test. The blast radius of any shared change is bounded by the test suite.
