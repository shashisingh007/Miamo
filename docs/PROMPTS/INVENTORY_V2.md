# INVENTORY_V2.md — Miamo Total-State Tracking, v6 Compatibility, Whole-App Audit

**Generated:** 28 May 2026 | **Phase:** Phase 1 read-only inventory | **Branch:** `feat/total-state-v6`

> Phase 1 of the V2 master upgrade brief (`docs/PROMPTS/MASTER_UPGRADE_PROMPT_V2.md`).
> Snapshot of the codebase at the start of v6 work. Subsequent phases reference
> this file by section number; do not delete sections, only append `update:` blocks.

---

## 1. Services Inventory

### auth (Express, port 3200)
- **Package**: `miamo-auth`
- **Entry**: `services/auth/src/server.ts`
- **Models written**: `User`, `Session`, `AuditLog` (Profile bootstrap on register)
- **Public routes**: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `PUT /api/v1/auth/password`, `GET /api/v1/auth/me`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/sessions`, `POST /api/v1/auth/sessions/:id/revoke`
- **usesEvents (implicit)**: `session.start`, `session.end`, `consent.update`
- **Dependencies**: none upstream

### users (Express, port 3201)
- **Entry**: `services/users/src/server.ts`
- **Models written**: `Profile` (updates), `Settings`, `PrivacySettings`, `Bookmark`, `SearchLog`, `UserData`, `DtmMessage`
- **Public routes**: `/api/v1/users/*`, `/api/v1/profiles/me/*`, `/api/v1/settings/*`, `/api/v1/search`, `/api/v1/bookmarks/*`, `/api/v1/user-data/*`
- **usesEvents**: `profile.view`, `profile.edit`, `search.query`, `search.result_click`, `intent.bookmark`
- **Dependencies**: auth (JWT), shared (validation)

### social (Express, port 3202) — ~2400 LOC in server.ts
- **Entry**: `services/social/src/server.ts`
- **Models written**: `Like`, `MatchRequest`, `Match`, `MatchFeedback`, `MiamoMove`, `DiscoverFilter`, `Block`, `Report`, `ShowcaseItem`, `VibeCheck`, `BioDataAccessRequest`
- **Public routes (60+)**: discover (`/api/v1/discover/*`), matches (`/api/v1/matches/*`), vibe (`/api/v1/vibe-check/*`), ai-match (`/api/v1/ai-match/*`), safety (`/api/v1/safety/*`), access (`/api/v1/access/*`), incoming-matches
- **usesEvents**: `discover.card_view`, `discover.swipe`, `discover.match`, `swipe.regret`, `swipe.repeat_pass`, `intent.profile.settle`, `profile.view`
- **Redis keys**: `behavior:${userId}`, `ml:${userId}`, `commstyle:${userId}`, `analysis:${userId}`, `ai-match:${userId}` (all 60s TTL)
- **Tech debt**: AI Match scorer (1800+ LOC) embedded in `server.ts`; access-requests partially shipped

### messaging (Express, port 3203)
- **Entry**: `services/messaging/src/server.ts`
- **Models written**: `Chat`, `Message`, `Beat`, `BeatEvent`
- **Public routes (27+)**: chats, messages, reactions, beats, suggestions (v4 + v5), comm-profile
- **usesEvents**: `msg.thread_open`, `msg.compose_start`, `msg.send`, `msg.read`, `msg.reaction`, `msg.voice_record`, `chat.typing.start`, `chat.typing.stop`, `chat.draft_deleted`
- **Redis keys**: `suggestions:${chatId}:${userId}:${context}` (30s TTL)

### content (Express, port 3204)
- **Entry**: `services/content/src/server.ts`
- **Models written**: `FeedPost`, `FeedComment`, `FeedReaction`, `Story`, `StoryView`, `StoryComment`, `StoryLike`, `Video`, `VideoComment`, `VideoReaction`, `CreativityCategory`, `CreativityItem`, `CreativityView`, `CreativityReaction`, `CreativityComment`, `Trend`
- **Public routes (19+)**: feed, stories, videos, creativity, trends
- **usesEvents**: `click`, `scroll.depth`, `profile.view`, `discover.card_view`, `media.photo.zoom`, `media.video.*`

### notifications (Express, port 3205)
- **Entry**: `services/notifications/src/server.ts`
- **Models written**: `Notification`
- **Public routes**: list, count, read, read-all, mark-read; internal: `POST /internal/notifications`, `/internal/notifications/schedule`
- **usesEvents**: `notification.shown`, `notification.opened`, `notification.dismissed`, `notification.snoozed`

### ingest (Express, port 3260)
- **Entry**: `services/ingest/src/server.ts`
- **Models written**: none
- **Public routes**: `GET /v1/track/healthz`, `POST /v1/track`, `GET /metrics`, `POST /v1/track/forget`
- **Pipeline**: Zod envelope validation → HMAC-SHA256 user-id hashing with `TRACKING_HASH_SECRET` → Redis `XADD events:raw`
- **Env**: `TRACKING_HASH_SECRET`, `TRACKING_STREAM_KEY` (default `events:raw`), `MAX_EVENTS_PER_BATCH` (50), `RATE_LIMIT_WINDOW_MS` (60000), `RATE_LIMIT_MAX_REQUESTS` (100)

### tracking-worker (Node worker, port 3261)
- **Entry**: `services/tracking-worker/src/index.ts`
- **Models written**: `EventAggHourly`, `EventAggDaily`, `FeatureSnapshot`, `PairCompatCache`, `ConsentEvent`
- **Workers**: `RollupConsumer` (XREADGROUP rollup), `FeatureAggregator` (5-min cadence), `PairCompatComputer`, `EmbeddingWorker` (stub), `DailyMatchWorker`, `CompatWorker`, `ForgetWorker`
- **Env**: `REDIS_URL`, `TRACKING_STREAM_KEY`, `TRACKING_GROUP` (rollup), `TRACKING_READ_COUNT` (500), `TRACKING_READ_BLOCK_MS` (2000), `TRACKING_FLUSH_MS` (5000), `ALGO_V4_WORKERS_ENABLED`

### gateway (Express, port 3000)
- **Entry**: `services/gateway/src/server.ts`
- **Routes**: health checks; proxies `/api/v1/*` to downstream; `GET /api/v1/events/stream` (SSE); `POST /internal/push-event`
- **Rate-limit stores (Redis-backed if `REDIS_URL`)**: `rl:global:${ip}` (100/min), `rl:auth:${ip}` (10/min), `rl:sensitive:${ip}` (5/min)

### shared (library)
- **Exports**: 17 algorithms under `services/shared/src/algo/`, tracking event catalogue under `services/shared/src/track/events.ts`, Zod schemas, `PrismaSignalReader`, math/LRU utils, registry

### web (Next.js 14, port 3100)
- **Entry**: `services/web/src/app/layout.tsx` (app router)
- **Frontend pages** — 32 pages (see §5)
- **Collectors** under `services/web/src/lib/track/collectors/`: session, page, engagement, attention (v4), swipe (v4), card (v4), filter (v4), search (v4), chat (v4), notification (v4)

---

## 2. Algorithms — Complete Inventory

**Registry**: `services/shared/src/algo/registry.ts`. 17 algorithms (9 active v5 variants + 7 reserved v5 dispatchers + registry meta).

| # | Algorithm | File | Surface | v4 flag | v5 flag | v5 change |
|---|---|---|---|---|---|---|
| 1 | forYou | `forYou.ts` | discover | `ALGO_V4_RANK_ENABLED_DISCOVER` | `ALGO_V5_FOR_YOU_ENABLED` | attentionFit, hesitationFit, regret/repeat/return adjustments |
| 2 | aiPicks | `aiPicks.ts` | discover | (eager) | `ALGO_V5_AI_PICKS_ENABLED` | returnRate ensemble term |
| 3 | active | `active.ts` | messaging | `ALGO_V4_RANK_ENABLED_MESSAGING` | `ALGO_V5_ACTIVE_ENABLED` | lastAnyActivityMs |
| 4 | postImpressionRerank | `postImpressionRerank.ts` | discover | (eager) | `ALGO_V5_POST_IMPRESSION_RERANK_ENABLED` | dwell/bio.expand/settle positives, repeat_pass −15 |
| 5 | cf | `cf.ts` | discover | (eager) | `ALGO_V5_CF_ENABLED` | dwell-weighted neighbours |
| 6 | searchAugment | `searchAugment.ts` | search | `ALGO_V4_RANK_ENABLED_SEARCH` | `ALGO_V5_SEARCH_AUGMENT_ENABLED` | 7d search.no_results/result_click health lane |
| 7 | feedAugment | `feedAugment.ts` | feed | `ALGO_V4_RANK_ENABLED_FEED` | `ALGO_V5_FEED_AUGMENT_ENABLED` | filter.apply → filterAffinity lane |
| 8 | notifyTiming | `notifyTiming.ts` | notifications | `ALGO_V4_RANK_ENABLED_NOTIFICATIONS` | `ALGO_V5_NOTIFY_TIMING_ENABLED` | daily cap + dismiss back-off |
| 9 | messageSuggest | `messageSuggest.ts` | messaging | (eager) | `ALGO_V5_MESSAGE_SUGGEST_ENABLED` | drafted-deleted-rate damping |
| 10 | verified | `verified.ts` | discover | (eager) | `ALGO_V5_VERIFIED_ENABLED` (reserved) | — |
| 11 | serious | `serious.ts` | discover | (eager) | `ALGO_V5_SERIOUS_ENABLED` (reserved) | — |
| 12 | dtm | `dtm.ts` | matching | (eager) | `ALGO_V5_DTM_ENABLED` (reserved) | — |
| 13 | moves | `moves.ts` | discover | (eager) | `ALGO_V5_MOVES_ENABLED` (reserved) | — |
| 14 | beats | `beats.ts` | messaging | (eager) | `ALGO_V5_BEATS_ENABLED` (reserved) | — |
| 15 | new | `new.ts` | discover | (eager) | `ALGO_V5_NEW_ENABLED` (reserved) | — |
| 16 | aiMatch | `aiMatch.ts` | ai-match | (eager) | `ALGO_V5_AI_MATCH_ENABLED` (reserved) | — |
| 17 | registry | `registry.ts` | meta | (always on) | — | — |

**V5Feature union**: `forYou | aiPicks | postImpressionRerank | active | notifyTiming | messageSuggest | cf | searchAugment | feedAugment | new | verified | serious | dtm | moves | aiMatch | beats`.

**Key exports**: `scoreForYouV4`, `scoreForYouV5`, `scoreForYou` (dispatcher), `rankForYou`, `chronoOverlap`, `intentMatchScore`, `attentionFit`, `hesitationFit`. Flags helper in `services/shared/src/algo/flags.ts` exposes `v4RankEnabled(surface)`, `v5FeatureEnabled(feature)`, `v4FlagSnapshot()`.

---

## 3. Tracking Pipeline — Event Catalogue and Aggregation

**Catalogue source**: `services/shared/src/track/events.ts` — `TrackEventName` union, 50 event names across 20 families.

### Families
1. **Session / Device / Consent** (4): `session.start`, `session.heartbeat`, `session.end`, `consent.update`
2. **Navigation** (3): `page.view`, `page.leave`, `route.change`
3. **Engagement primitives** (9): `impression`, `dwell`, `scroll.depth`, `scroll.idle`, `click`, `click.rage`, `click.dead`, `cursor.sample`, `visibility.change`
4. **Forms** (4): `form.focus`, `form.change`, `form.submit`, `form.error`
5. **Perf / Errors** (7): `perf.web_vitals`, `error.js`, `error.network`, `error.long_task`, `error.slow_api`, `error.sse_disconnect`, `error.sse_reconnect`
6. **Discover / Swipe / Match** (4): `discover.card_view`, `discover.swipe`, `discover.match`, `discover.boost_view`
7. **Messaging** (6): `msg.thread_open`, `msg.compose_start`, `msg.send`, `msg.read`, `msg.reaction`, `msg.voice_record`
8. **Profile / Album** (5): `profile.view`, `profile.edit`, `album.upload`, `album.view`, `album.unlock_request`
9. **DTM / Quiz / Vibe** (5): `dtm.question_view`, `dtm.answer`, `dtm.complete`, `vibe.check_start`, `vibe.check_complete`
10. **Beats / Moves / Date** (5): `beats.play`, `beats.skip`, `moves.play`, `date.plan_open`, `date.plan_save`
11. **v4 Attention** (4): `attention.idle`, `attention.away`, `attention.return`, `attention.long_heartbeat`
12. **v4 Card** (6): `card.impression.50`, `card.impression.100`, `card.bio.expand`, `card.bio.collapse`, `card.photo.swipe`, `card.hover`
13. **v4 Swipe** (6): `swipe.start`, `swipe.abort`, `swipe.commit`, `swipe.undo`, `swipe.regret`, `swipe.repeat_pass`
14. **v4 Filters / Search** (7): `filter.open`, `filter.change`, `filter.apply`, `filter.reset`, `search.query`, `search.result_click`, `search.no_results`
15. **v4 Notifications** (4): `notification.shown`, `notification.opened`, `notification.dismissed`, `notification.snoozed`
16. **v4 Media** (5): `media.photo.zoom`, `media.video.play`, `media.video.pause`, `media.video.seek`, `media.video.complete`
17. **v4 Lifecycle** (2): `lifecycle.network`, `lifecycle.fullscreen`
18. **v4 Intent** (6): `intent.cta.hover`, `intent.price.hover`, `intent.profile.settle`, `intent.bookmark`, `intent.screenshot`, `intent.copy`
19. **v4 Chat micro** (4): `chat.typing.start`, `chat.typing.stop`, `chat.draft_deleted`, `chat.scroll_history`
20. **Generic** (1): `custom`

### `SignalReader` interface (`services/shared/src/algo/signals.ts`)
```ts
interface SignalReader {
  hashOf(userId: string): string;
  features(uidHash: string): Promise<FeatureRow | null>;
  pairCompat(aHash: string, bHashes: string[]): Promise<Map<string, PairRow>>;
  recentEvents(uidHash: string, evts: string[], days: number): Promise<EvtCount[]>;
  priorTargets(aHash: string, bHashes: string[], days: number): Promise<Map<string, number>>;
  targetImpressions(aHash: string, bHashes: string[], days: number): Promise<Map<string, number>>;
  dailyMatch(uidHash: string): Promise<{ bHash: string; score: number; computedAt: string } | null>;
  pairBehavior(aHash: string, bHashes: string[], days: number): Promise<Map<string, PairBehavior>>;
}
```

### `FeatureSnapshot.raw` v5 keys
| Key | Type | Source events | Used by | Computation |
|---|---|---|---|---|
| `dwellHistogram` | `number[5]` | `card.impression.100` durations | forYou v5 attentionFit | 5-bucket histogram over `HIST_EDGES_MS` |
| `hesitationP50Ms` | `number` | `swipe.commit{hesitationMs}` 14d | forYou v5 hesitationFit | Median visible→commit ms |
| `regretRate` | `0..1` | `swipe.regret / swipe.commit` | reserved v6 | Fraction of swipes undone within 3s |
| `repeatPassRate` | `0..1` | `swipe.repeat_pass / card.impression.100` | reserved v6 | Fraction of impressions on already-passed candidates |

### Redis keys / streams
| Key | Type | TTL | Writer | Reader | Purpose |
|---|---|---|---|---|---|
| `events:raw` | Stream | ∞ | ingest XADD | tracking-worker XREADGROUP `rollup` | Raw ingestion |
| consumer group `rollup` | Group | ∞ | tracking-worker XGROUP CREATE | tracking-worker XREADGROUP | Rollup consumers |
| `rl:global:${ip}` | counter | 60s | gateway | gateway | Global RL 100/min |
| `rl:auth:${ip}` | counter | 60s | gateway | gateway | Auth RL 10/min |
| `rl:sensitive:${ip}` | counter | 60s | gateway | gateway | Sensitive RL 5/min |
| `behavior:${userId}` | JSON | 60s | social LRU | social | Behavior profile |
| `ml:${userId}` | JSON | 60s | social | social | ML feature vector |
| `commstyle:${userId}` | JSON | 60s | social | social | Comm style |
| `analysis:${userId}` | JSON | 60s | social | social | Activity analysis |
| `ai-match:${userId}` | JSON | 60s | social | social | AI Match score cache |
| `suggestions:${chatId}:${userId}:${context}` | JSON | 30s | messaging | messaging | Pre-computed message suggestions |

### Histogram edges (shared contract)
```ts
const HIST_EDGES_MS = [0, 750, 2_000, 5_000, 10_000];
// Defined in services/tracking-worker/src/rollup.ts, mirrored in services/shared/src/algo/forYou.ts.
```

---

## 4. Prisma Models — Complete Inventory

Schemas under `services/{auth,users,social,messaging,content,notifications,shared,tracking-worker}/prisma/schema.prisma`. ~60 models total.

### User & Profile (9)
`User`, `Profile`, `ProfilePhoto`, `ProfilePrompt`, `ProfileInterest`, `Settings`, `PrivacySettings`, `MatrimonialProfile`, `BioDataAccessRequest`.

### Matching & Social (11)
`Like`, `MatchRequest`, `Match`, `MatchFeedback`, `MiamoMove`, `DiscoverFilter`, `Block`, `Report`, `ShowcaseItem`, `VibeCheck`, `Bookmark`.

### Messaging (4)
`Chat`, `Message`, `Beat`, `BeatEvent`.

### Content & Feed (16)
`FeedPost`, `FeedComment`, `FeedReaction`, `Story`, `StoryView`, `StoryComment`, `StoryLike`, `Video`, `VideoComment`, `VideoReaction`, `CreativityCategory`, `CreativityItem`, `CreativityView`, `CreativityReaction`, `CreativityComment`, `Trend`, plus `SearchLog`.

### Notifications & Activity (4)
`Notification`, `AuditLog`, `UserActivity`, `Session`.

### Tracking / Aggregation (5+) — owned by tracking-worker
`EventAggHourly`, `EventAggDaily`, `FeatureSnapshot`, `PairCompatCache`, `ConsentEvent`, plus `DtmMessage` (users) and `UserData` (users).

Full ownership matrix:

| Service | Models written |
|---|---|
| auth | User, Session, AuditLog (and Profile bootstrap on register) |
| users | Profile, Settings, PrivacySettings, Bookmark, SearchLog, UserData, DtmMessage |
| social | Like, MatchRequest, Match, MatchFeedback, MiamoMove, DiscoverFilter, Block, Report, ShowcaseItem, VibeCheck, BioDataAccessRequest |
| messaging | Chat, Message, Beat, BeatEvent |
| content | FeedPost, FeedComment, FeedReaction, Story, StoryView, StoryComment, StoryLike, Video, VideoComment, VideoReaction, CreativityCategory, CreativityItem, CreativityView, CreativityReaction, CreativityComment, Trend |
| notifications | Notification |
| tracking-worker | EventAggHourly, EventAggDaily, FeatureSnapshot, PairCompatCache, ConsentEvent |

**Tech debt**: `Profile` written by both `auth` (bootstrap) and `users` (updates); v6 needs a single owner.

---

## 5. Frontend Pages — Next.js App Router

Base: `services/web/src/app/`.

### Public (8)
`/`, `/login`, `/register`, `/terms`, `/privacy`, `/cookies`, `/community-guidelines`, `/coming-soon`.

### Protected `(main)` layout (24)
`/discover`, `/matches`, `/matches/incoming`, `/messages`, `/messages/chats`, `/profile`, `/settings`, `/search`, `/feed`, `/stories`, `/videos`, `/creativity`, `/showcase`, `/beats`, `/ai-match`, `/vibe-check`, `/serious-mode`, `/access`, `/safety`, `/love-language`, `/compatibility`, `/notifications`, `/date-ideas`, `/premium`, `/date-planner`, `/onboarding`.

**Tech debt**: No per-page error boundaries; auth gating relies entirely on layout cascade.

---

## 6. Redis — Key Patterns and Usage

Already enumerated in §3's Redis table. Summary:
- 1 ingestion stream + 1 consumer group.
- 3 rate-limit prefix families (gateway).
- 5 algorithm caches (social).
- 1 message-suggestion cache (messaging).
- **No** distributed cache invalidation today. All caches are read-through with short TTLs.

---

## 7. Tests — Count and Distribution

| Location | Files | Status |
|---|---|---|
| `services/shared/__tests__/*.test.ts` (algo + signal coverage) | 23 | Active |
| `services/shared/src/algo/__tests__/*.test.ts` | 13 | Active |
| `services/ingest/src/__tests__/server.test.ts` | 1 | Minimal |
| `services/tracking-worker/src/__tests__/*.test.ts` | 4 | Active |
| Repo-root `tests/*.test.ts` | 3 | E2E |
| **Total test files** | **~44** | — |

**Test count (vitest `npx vitest run`)**: **314 tests, all green** at branch fork point (`main @ 02fbc23`).

**Coverage gaps**: no automated tests for `messaging`, `content`, `notifications`, `users`, `social` services beyond what `shared` exercises. No smoke/integration/load/security tiers yet. Phase 18 brings the floor to 454.

---

## 8. Flags — Complete Inventory

### v4 rank-enabled (per surface, default off)
`ALGO_V4_RANK_ENABLED_DISCOVER`, `..._MESSAGING`, `..._BEATS`, `..._NOTIFICATIONS`, `..._SEARCH`, `..._FEED`, `..._AI_MATCH`, `..._DEEP_COMPAT` (reserved). Master switch: `ALGO_V4_WORKERS_ENABLED`.

### v5 per-algorithm (default off)
`ALGO_V5_FOR_YOU_ENABLED`, `..._AI_PICKS_ENABLED`, `..._ACTIVE_ENABLED`, `..._POST_IMPRESSION_RERANK_ENABLED`, `..._CF_ENABLED`, `..._SEARCH_AUGMENT_ENABLED`, `..._FEED_AUGMENT_ENABLED`, `..._NOTIFY_TIMING_ENABLED`, `..._MESSAGE_SUGGEST_ENABLED`, plus 7 reserved (`VERIFIED`, `SERIOUS`, `DTM`, `MOVES`, `BEATS`, `NEW`, `AI_MATCH`).

### v6 (to be added by this PR)
- `ALGO_V6_<FEATURE>_ENABLED` per algorithm (mirrors v5 pattern).
- `ALGO_V6_LEARNER_ENABLED` (Phase 16 online bandit).
- `PIPELINE_S1_ENABLED`, `PIPELINE_S2_ENABLED`, `PIPELINE_S3_ENABLED`, `PIPELINE_S4_ENABLED`, `PIPELINE_S5_ENABLED` (Phase 15 cascading pipeline).
- `TRACKING_TOTAL_STATE_ENABLED` (Phase 2 idle/nav/focus/dwell collectors).

### Other
`TRACKING_HASH_SECRET` (HMAC key, no default), `TRACKING_STREAM_KEY` (default `events:raw`), `TRACKING_GROUP` (default `rollup`), `TRACKING_READ_COUNT` (500), `TRACKING_READ_BLOCK_MS` (2000), `TRACKING_FLUSH_MS` (5000), `REDIS_URL`, `DATABASE_URL`.

**Rollback procedure**: every new flag defaults to `0` (off). Disable a feature by setting `ALGO_V6_FEATURE_ENABLED=0` and redeploying. The master kill for the worker pipeline is `ALGO_V4_WORKERS_ENABLED=0`.

---

## 9. Open Gaps for V6 Work

### Models needed
- **`SessionSummary`** — does not exist; required for Phase 2 session-end rollup (zeroActionSession, windowShopping, ghostedSelf, routesVisited, idleMs, …).
- **`UserMoveProfile`** + **`UserArchetype`** — Phase 4.
- **`UserWeightProfile`** — Phase 16 online learner.
- **`SessionSummaryArchive`** — Phase 17 retention (≥180d cold storage).
- **`PairBehaviorHistory`** — denormalised pair signal history (so `pairBehavior` doesn't fan out to two tables).

### `FeatureSnapshot.raw` v6 keys to add
- `dwellHistogram30d`, `hesitationP25Ms`, `hesitationP50Ms`, `hesitationP75Ms`, `attentionProfileLabel` (`reader|scanner|mixed`), `fatigueIndex`, `chronotypeOverlapDays`, `focusAffinityByKind` (per-route element-focus map), `idleRatio`, `zeroActionSessions7d`, `windowShoppingSessions7d`, `ghostedSelfSessions7d`.

### Events missing for total-state tracking (Phase 2)
- `attention.idle.enter` / `attention.idle.exit` (15s no-input threshold).
- `nav.route` (richer than `route.change`: from/to/mode/intent).
- `focus.element` (debounced 250ms; route + elementId).
- `intent.dwell` (route + elementId + dwellMs + scrollY).
- `session.summary` (derived at session.end; produced by tracking-worker).
- `profile.self_view_dwell`, `filter.hesitation`, `msg.voice_rerecord`, `notif.look_no_act`, `dtm.partial_abandon`.

### Services without v6 path
- All 17 algorithms (no `scoreForYouV6`, no v6 dispatchers).
- `discover` pipeline (no `services/social/src/discover/pipeline.ts` for the 5-stage funnel).
- `notifications` (no per-user daily-budget state).
- `messaging` (no typing-pattern signal aggregation for messageSuggest v6).
- `gateway` (no distributed tracing hook for v6 latency signals).

---

## 10. BLOCKER List — Ambiguities & Tech Debt for V6 Work

> Items prefixed `BLOCKER:` block a downstream phase. Items prefixed `DEBT:`
> are tracked but not blocking. Continue per §24 of the master prompt.

1. **BLOCKER: Profile dual-owner.** Written by both `auth` (register bootstrap) and `users` (updates). Phase 2 needs `profile.edit` to atomically join with `Profile` updates. **Decision**: Phase 2 treats `users` as sole writer; `auth` bootstrap migrated to call `users` internal endpoint. Document in Phase 7 backend audit.
2. **BLOCKER: `uidHash` not stored at registration.** Derived per-request from `TRACKING_HASH_SECRET`. If secret rotates without 7-day grace window, all historical joins break. **Fix in Phase 20.2**: store `uidHash` column on `User`, rotate online with previous-secret acceptance.
3. **DEBT: `events:raw` is single-shard.** v6 total-state will ~10× event volume. Phase 17 caps `MAXLEN ~ 10M`; consider shard-by-hash (`events:raw:0..N`) if p95 ingest latency > 80ms after rollout.
4. **DEBT: `EventAggDaily` timezone is UTC-only.** Indian users see "yesterday" wrong. Add `tzOffsetMinutes` to the aggregate key in Phase 8 DB audit; backfill optional.
5. **DEBT: `PairCompatCache` never invalidated on un-match.** Stale rows accumulate. Phase 17 retention job + invalidate-on-`Match.active=false` write.
6. **DEBT: Message encryption v3.1 uses unauthenticated IV.** v6 should switch to AES-GCM at rest. Track in Phase 20.
7. **DEBT: `FeatureSnapshot.raw` is unstructured JSONB.** v6 adds 12+ keys. Define a `FeatureSnapshotRawV6` TS type + Zod schema in `services/shared/src/algo/featureRawV6.ts`.
8. **DEBT: Ingest rate-limit is per-replica.** 100 replicas ⇒ no real cap per IP. Phase 17 marks `REDIS_URL` as required in prod.
9. **DEBT: No cold-start row for new users.** `FeatureSnapshot` null for 24h. Phase 16 (cold-start defaults) and Phase 3 (priors) need a zero-row written at registration.
10. **DEBT: `ALGO_V4_WORKERS_ENABLED` is all-or-nothing.** Split into per-worker flags in Phase 10 DevOps audit.
11. **DEBT: Consent scope is single `analytics`.** Phase 2 (total-state) and Phase 16 (feedback) need finer scopes; design a scope-array migration in Phase 8.
12. **DEBT: social/server.ts is ~2400 LOC.** v6 algorithm wiring will be hard to isolate. Out of scope for this PR; track in Phase 13 cleanup as a follow-up issue.
13. **DEBT: No tests for messaging/social/content/users/notifications services.** Phase 18 adds smoke + integration tiers.
14. **DEBT: Helm values are not version-pinned.** Phase 10 DevOps audit adds explicit constraints.

---

## Phase 1 closeout

- Branch: `feat/total-state-v6` (created off `main @ 02fbc23`).
- Test baseline: **314** tests, all green.
- Floor for this PR: **≥ 454** tests (per §22.1).
- Next: Phase 2 — total-state tracking (collectors, event catalogue additions, `SessionSummary` model + writer, `SignalReader` methods).

**End of INVENTORY_V2.md**
