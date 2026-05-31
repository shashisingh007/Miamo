# LEARNING_SYSTEM_V6_5 — Master prompt

> Goal: turn Miamo's tracking pipeline into a per-user, per-surface (Discover & DTM) **online learning system** that ingests every meaningful action, idle period, and safety signal, adapts ranking weights as the user's behavior drifts, and stays cheap on memory.
>
> This prompt is execution-ready. Hand it to any agent (or a human) and they should be able to ship it phase-by-phase without further design discussion.

---

## 0. Ground rules (non-negotiable)

1. **No regressions.** `npm run typecheck` (11/11 clean) and `npm run test:full` (938 files / 12,323 tests passing) must remain green after every commit. Each phase is its own commit.
2. **Production tracking pipeline is preserved.** Do not change envelope schema (`v=1`), `events:raw` stream key, `uidHash` HMAC algorithm, or `TRACKING_HASH_SECRET`. All additions are additive.
3. **Consent gating is mandatory.** Every new event ships behind the existing `analytics` consent scope. `Do-Not-Track` and `TRACKING_KILL=1` must short-circuit before any new code path.
4. **Privacy invariants:**
   - Never write raw `userId` to Postgres tracking tables. Always `uidHash` (HMAC-SHA256, 22-char base64url).
   - Same hashing rule for any new target column (`tHash`, `pairHash`, etc.).
   - No PII in `payload` JSON; max payload size 32 KB unchanged.
5. **Memory budget:** tracking-worker pod stays under 1 GiB RSS. New aggregators must declare their max-key footprint in code comments.
6. **Latency budget:** ingest p50 < 3ms / p99 < 15ms; web SDK collectors must not block input handlers (use `requestIdleCallback` or microtasks for non-critical work).
7. **Two surfaces, two learners.** Every weight, bandit state, and feature snapshot that is surface-specific gets a composite key `(uidHash, surface)` where `surface ∈ { 'discover' | 'dtm' }`. Shared signals (chronotype, attention profile, etc.) stay surface-agnostic.

---

## 1. Architecture target (one diagram)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  WEB SDK (services/web/src/lib/track)                                   │
│                                                                         │
│  collectors → batcher → /v1/track (ingest)                              │
│  ─ existing: route, autotrack, scroll, swipe, attention, cards, ...     │
│  ─ NEW (Phase A):                                                       │
│      • idleCollector       (attention.idle.enter/exit)                  │
│      • navCollector        (nav.route from→to mode)                     │
│      • focusCollector      (focus.element debounced 250ms)              │
│      • intentDwellCollector(intent.dwell on element defocus)            │
│      • dtmCollector        (dtm.partial_abandon, dtm.question_skip,     │
│                             dtm.answer_revise)                          │
│      • profileSelfView     (profile.self_view_dwell on /me unmount)     │
│      • filterHesitation    (filter.hesitation chip hover→apply gap)     │
│      • voiceRerecord       (msg.voice_rerecord pair, attemptN)          │
│      • safety              (safety.block, safety.report,                │
│                             discover.unmatch, match.hold, match.unhold) │
│      • firstMove           (set firstMove:true on msg.send when         │
│                             thread_msgs_so_far===0)                     │
│                                                                         │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │  envelope v=1
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  INGEST (services/ingest)                                               │
│  Zod-validate → HMAC uid→uidHash → XADD events:raw MAXLEN ~100k         │
│  No changes required. 204 in <15ms p99.                                 │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  TRACKING-WORKER (services/tracking-worker)                             │
│                                                                         │
│  ─ existing: rollup(10s) → EventAggHourly/Daily                         │
│              feature(5m) → FeatureSnapshot                              │
│              compat(15m) → PairCompatCache                              │
│              embeddings(30m), dailyMatch(12h), coldStore(1h)            │
│                                                                         │
│  ─ NEW (Phase B):                                                       │
│     • sessionSummary.ts  (on session.end → SessionSummary row)          │
│     • firstMoveOutcome.ts(2x/day reconcile msg.send firstMove ↔         │
│                           msg.read same-pair within 24h)                │
│     • safetyRollup.ts    (5m → SafetyAgg per (uidHash,surface,kind))    │
│     • focusAffinity.ts   (5m → FocusAffinityHourly)                     │
│     • learnerLoop.ts     (10m → read recent outcomes, call              │
│                           learner.updateProfile(), upsert               │
│                           UserWeightProfile per (uidHash,surface))      │
│                                                                         │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  POSTGRES (services/shared/prisma/schema.prisma)                        │
│  ─ existing: EventAggHourly, EventAggDaily, FeatureSnapshot,            │
│              PairCompatCache, ConsentEvent                              │
│  ─ NEW (Phase C):                                                       │
│     • SessionSummary    (writer wired)                                  │
│     • FocusAffinityHourly(writer wired)                                 │
│     • UserWeightProfile (NOW with @@id([uidHash, surface]) composite)   │
│     • UserMoveProfile   (writer wired in Phase D)                       │
│     • SafetyAgg         (NEW: per-(uidHash,surface,kind) counters)      │
│     • FirstMoveOutcome  (NEW: per (aHash,bHash) reply-within-24h)       │
└──────────────────────┬──────────────────────────────────────────────────┘
                       │  via SignalReader interface
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ALGORITHMS (services/shared/src/algo)                                  │
│  ─ existing: 17 rankers read via SignalReader                           │
│  ─ NEW (Phase E):                                                       │
│     • SignalReader gains:                                               │
│        sessionSummaries(uidHash, days)                                  │
│        focusAffinity(uidHash, days)                                     │
│        safetySignals(uidHash, surface, days)                            │
│        firstMoveOutcomes(uidHash, days)                                 │
│        weightProfile(uidHash, surface)         // returns sampled       │
│                                                  weights via Thompson   │
│     • forYouV6 reads weightProfile('discover') instead of constants     │
│     • dtmAffinityV6 reads weightProfile('dtm')                          │
│     • Both call learner.recordOutcome() at decision time (post-swipe,   │
│       post-DTM-completion, post-block, post-unmatch, post-hold)         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase plan (each phase = 1 commit, all tests green)

### Phase A — Web SDK collectors + new event names (1 commit)

**Files to add/modify:**
- `services/shared/src/track/events.ts` — extend `TrackEventName` union with:
  ```
  'safety.block', 'safety.report', 'discover.unmatch',
  'match.hold', 'match.unhold',
  'dtm.question_skip', 'dtm.answer_revise',
  // (the v6 names attention.idle.enter/exit, nav.route, focus.element,
  //  intent.dwell, profile.self_view_dwell, filter.hesitation,
  //  msg.voice_rerecord, dtm.partial_abandon are already registered.)
  ```
  Add Zod payload validators in `services/shared/src/track/v6Validators.ts` for each new name.

- `services/web/src/lib/track/collectors/idle.ts` — pair `attention.idle.enter` / `attention.idle.exit`. Threshold: 30s of no input + no scroll + no visibility change. Use `requestIdleCallback` to keep main thread free. Cap idle events at 1/min per session to bound memory.

- `services/web/src/lib/track/collectors/nav.ts` — wrap Next.js `router.events` (or App Router equivalent) and emit `nav.route { from, to, mode }` where `mode ∈ 'push'|'replace'|'back'|'forward'`.

- `services/web/src/lib/track/collectors/focus.ts` — `IntersectionObserver` + `focusin`/`focusout` listeners on elements marked `data-focus-id`. Debounce 250ms. Emit `focus.element { route, elementId, kind }` where `kind ∈ 'card'|'chat'|'notif'|'list_item'|'cta'|'chip'`.

- `services/web/src/lib/track/collectors/intentDwell.ts` — when a tracked element loses focus, emit `intent.dwell { route, elementId, dwellMs, scrollY }` if `dwellMs ≥ 800` (matches existing `useDwell` threshold).

- `services/web/src/lib/track/collectors/profileSelfView.ts` — on `/me` route unmount, emit `profile.self_view_dwell { dwellMs, sectionsViewed }`.

- `services/web/src/lib/track/collectors/filterHesitation.ts` — on Discover filter chip hover, start timer; on apply, emit `filter.hesitation { chipId, hesitationMs }` if ≥ 400ms.

- `services/web/src/lib/track/collectors/voiceRerecord.ts` — count attempts in chat compose, emit `msg.voice_rerecord { pairId, attemptN }` on each rerecord.

- `services/web/src/lib/track/collectors/dtm.ts` — extend existing DTM tracking:
  - On DTM unmount before `dtm.complete`: emit `dtm.partial_abandon { topic, answered, remaining }`.
  - On question skip: emit `dtm.question_skip { topic, qid }`.
  - On answer change: emit `dtm.answer_revise { topic, qid, fromValue, toValue }`.

- `services/web/src/lib/track/collectors/safety.ts` — wrap block/report/unmatch/hold UI handlers:
  - `safety.block { tid, surface }` (surface = where the block happened: 'discover'|'matches'|'messages')
  - `safety.report { tid, surface, reason }` (reason ∈ enum: 'spam'|'inappropriate'|'fake'|'underage'|'other')
  - `discover.unmatch { matchId, tid, surface }`
  - `match.hold { matchId, tid }` and `match.unhold { matchId, tid }`

- `services/web/src/lib/track/collectors/firstMove.ts` — small shim: when `msg.compose_start` fires, ask the chat store for `thread_msgs_so_far`. On `msg.send` for that thread, set `payload.firstMove = (thread_msgs_so_far === 0)`. Done in the existing collector — no new event name.

**Tests to add:**
- Unit tests in `services/shared/src/track/__tests__/v6Validators.test.ts` — one happy-path + one schema-violation test per new event name (~ 20 tests).
- Web tests in `services/web/__tests__/collectors/` — DOM-mock test per new collector (~ 8 tests). Verify: emits when expected, **doesn't** emit when consent withheld, doesn't emit when `Do-Not-Track` is set.

**Acceptance:** typecheck clean; new tests pass; full suite holds at 12,323+.

---

### Phase B — Tracking-worker rollups (1 commit)

**Files to add:**

- `services/tracking-worker/src/sessionSummary.ts` — subscribe to the rollup consumer's parsed event stream; for each `session.start`, `session.heartbeat`, every interaction event, accumulate per-session in a bounded LRU keyed by `sessionId` (cap 50k sessions in flight, evict oldest). On `session.end` (or 30 min of inactivity), upsert one `SessionSummary` row. Compute:
  - `durationMs`, `idleMs` (from `attention.idle.enter/exit` pairs)
  - `routesVisited` (from `nav.route`, capped at 64 entries with `dwellMs` per route)
  - `cardsViewed`, `swipesLeft`, `swipesRight` (from `card.impression.100` / `swipe.commit`)
  - `msgsSent`, `msgsRead` (from `msg.send` / `msg.read`)
  - `zeroActionSession` = `durationMs > 30_000 && (cardsViewed + msgsSent + clicks) === 0`
  - `windowShopping` = scrolled but no swipes
  - `ghostedSelf` = unread incoming + 0 outgoing in same thread
  
  Memory guardrail (in code comments): max 50k × ~2KB per session = 100 MiB worst case.

- `services/tracking-worker/src/firstMoveOutcome.ts` — runs every 30 min. Joins `msg.send WHERE firstMove=true` (last 25 h) with `msg.read WHERE pairId matches` (next 24 h after each send) and writes one `FirstMoveOutcome` row per `(aHash, bHash)`. Idempotent on `(aHash, bHash, sentAt::date)`.

- `services/tracking-worker/src/safetyRollup.ts` — every 5 min, scan recent `safety.*`, `discover.unmatch`, `match.hold/unhold` events; upsert `SafetyAgg` keyed `(uidHash, surface, kind, day)` with counts.

- `services/tracking-worker/src/focusAffinity.ts` — every 5 min, accumulate `focus.element` + `intent.dwell` events into `FocusAffinityHourly`. Cap unique `(route, elementId)` pairs per user per hour at 256 (drop lowest-dwell on overflow).

- `services/tracking-worker/src/learnerLoop.ts` — every 10 min, for each user with new outcomes since last run:
  1. Read current `UserWeightProfile(uidHash, surface)` (default if absent).
  2. Read recent decisions + their realised outcomes from `EventAggDaily.meta.targets` + `FirstMoveOutcome` + `SafetyAgg`.
  3. Compute reward vector via existing `extractRewards()` (pure function, already shipped).
  4. Call existing `learner.updateProfile(profile, outcome, rewards)` — already implemented in `services/shared/src/algo/learner.ts`.
  5. Upsert updated profile back into `UserWeightProfile`.
  
  Bound: 500 users per tick. If backlog grows, increase tick frequency before increasing batch size (avoids long DB locks).

**Wire all five into `services/tracking-worker/src/index.ts` orchestrator.** Each behind an env flag default-on (`SESSION_SUMMARY_ENABLED=1`, etc.) so they can be killed individually if a hot bug surfaces.

**Tests to add:**
- One unit test per worker file covering the happy path and the bounded-memory guard. Reuse `MemorySignalReader` test helpers from existing rollup tests.
- One integration test seeding ~100 events and asserting `SessionSummary`, `SafetyAgg`, `FirstMoveOutcome` get written correctly.

**Acceptance:** typecheck clean; new workers boot without warnings; full suite ≥ 12,323.

---

### Phase C — Schema additions (1 commit, only changes shared/prisma/schema.prisma)

**Add models** (write the migration file by hand under `services/shared/prisma/migrations/20260601000010_v6_5_learning_system/`):

```prisma
model SafetyAgg {
  uidHash String
  surface String   // 'discover' | 'dtm' | 'matches' | 'messages'
  kind    String   // 'block' | 'report' | 'unmatch' | 'hold' | 'unhold'
  day     DateTime // UTC-truncated
  count   Int      @default(0)
  meta    Json     @default("{}")  // e.g. {targets: {...capped at 64}}

  @@id([uidHash, surface, kind, day])
  @@index([day])
  @@index([uidHash, day])
}

model FirstMoveOutcome {
  aHash      String
  bHash      String
  sentAt     DateTime
  replied    Boolean
  replyMs    Int?     // null if not replied
  kind       String   // 'text' | 'voice' | 'media' | 'reaction'
  // additional context
  archetype  String?  // optional: cached recipient archetype at send time
  meta       Json     @default("{}")

  @@id([aHash, bHash, sentAt])
  @@index([aHash, sentAt])
  @@index([bHash, sentAt])
}
```

**Modify existing model** (this is a real migration, plan it):

```prisma
// BEFORE
model UserWeightProfile {
  uidHash         String   @id
  ...
}

// AFTER  — composite key for per-surface learning
model UserWeightProfile {
  uidHash         String
  surface         String   // 'discover' | 'dtm'
  weights         Json
  noveltyBoost    Float    @default(0.0)
  diversityBoost  Float    @default(0.0)
  explorationRate Float    @default(0.05)
  banditAlpha     Json
  banditBeta      Json
  lastUpdatedAt   DateTime @updatedAt
  schemaVersion   Int      @default(1)

  @@id([uidHash, surface])
  @@index([lastUpdatedAt])
}
```

**Critical migration step:** since `UserWeightProfile` has zero rows in production today (writer was never wired), the schema change is safe to apply destructively — the migration is a `DROP TABLE; CREATE TABLE` equivalent. Document this in the migration's leading SQL comment so reviewers don't panic.

**Sync rule (per repo memory `/memories/repo/repo-health-audit-2026-05-31.md`):** after editing `services/shared/prisma/schema.prisma`, run:
```bash
for s in auth content messaging notifications social users; do
  cp services/shared/prisma/schema.prisma services/$s/prisma/schema.prisma
done
```
Then `npm run typecheck` to confirm no service drifted.

**Acceptance:** migration applies cleanly to a fresh DB; `npm run db:migrate` from repo root succeeds; existing tests still green.

---

### Phase D — SignalReader extension + algorithm wiring (1 commit)

**Modify** `services/shared/src/algo/signals.ts`:
- Add interface methods (mark optional for backwards compat with existing tests):
  ```ts
  interface SignalReader {
    // ...existing...
    safetySignals?(uidHash: string, surface: 'discover'|'dtm', days: number): Promise<SafetyRow[]>;
    firstMoveOutcomes?(uidHash: string, days: number): Promise<FirstMoveOutcomeRow[]>;
    weightProfile?(uidHash: string, surface: 'discover'|'dtm'): Promise<UserWeightProfile | null>;
  }
  ```
- Implement on `PrismaSignalReader` with a 60s in-memory LRU cache (same TTL/capacity as existing `features()` cache).

**Modify** `services/shared/src/algo/forYouV6.ts`:
- Replace hardcoded weight constants with `await reader.weightProfile(uidHash, 'discover')` (fall back to existing constants if null).
- After ranking is committed by Discover service, call `learner.recordOutcome({uidHash, surface:'discover', candidate, ...})` via a new fire-and-forget queue. Tracking-worker's `learnerLoop.ts` consumes these outcomes.

**Add** `services/shared/src/algo/dtmLearningV6.ts` (NEW, ~150 LOC) — DTM analog of `forYouV6`:
- Reads `weightProfile(uidHash, 'dtm')`.
- Adapts question ordering and topic weighting based on user's recent answer patterns + `dtm.partial_abandon` rate + `focus.element kind='chip'` affinity.
- Emits outcomes (completion, abandonment, revision) to the learner queue with `surface:'dtm'`.

**Add** outcome consumers — when these events land, the learner sees them as rewards:
- `discover.match` → +1 reward on the candidate that won
- `discover.unmatch` (within 7d of match) → −0.5 regret signal
- `safety.block` → −1 hard negative (also blacklists the candidate from future ranking)
- `safety.report` → −1 hard negative + safety review queue
- `match.hold` → 0 (neutral, signals user wants time to decide; do not penalize)
- `match.unhold` → +0 (neutral)
- `firstMove.replied` → +0.5 reward on the recipient archetype match
- `dtm.complete` → +1 on the topic vector chosen
- `dtm.partial_abandon` → −0.3 on the topic (suggests we asked the wrong things)

**Tests:**
- `services/shared/src/algo/__tests__/forYouV6.weightProfile.test.ts` — verify ranker uses bandit-sampled weights when profile exists, falls back when null.
- `services/shared/src/algo/__tests__/dtmLearningV6.test.ts` — verify question reordering shifts after `dtm.partial_abandon` events.
- `services/shared/src/algo/__tests__/learnerLoop.outcomes.test.ts` — verify each outcome type produces the documented reward sign and magnitude.
- `services/shared/src/algo/__tests__/safety.blocklist.test.ts` — verify a `safety.block` removes the candidate from `forYouV6` output.

**Acceptance:** all new tests pass; existing 12,323 still green.

---

### Phase E — Discover & DTM service integration (1 commit per service)

**`services/content` (Discover endpoints) and `services/social`:**
- After computing the swipe-deck, call `learner.recordOutcome` for each impression (lightweight: just records that we showed these candidates).
- After `swipe.commit`, call `learner.recordOutcome({outcome: 'swipe', dir, ...})`.
- After `discover.match`, call with reward sign +1.

**`services/content` (DTM endpoints):**
- On `dtm.complete`, call `learner.recordOutcome({surface:'dtm', outcome:'complete', topic, ...})`.
- On detected partial-abandon (server-side via `session.summary` rollup, not just client-side event), enqueue the negative reward.

**Tests (integration):**
- `services/content/__tests__/discover.learner.integration.test.ts` — fake user, run 20 swipes, verify `UserWeightProfile(uidHash, 'discover')` weights move from default toward observed-preference direction.
- `services/content/__tests__/dtm.learner.integration.test.ts` — same for DTM.

**Acceptance:** end-to-end loop verified; weights drift after ≥10 outcomes.

---

## 3. Memory & performance guardrails (must be in code, not just docs)

| Component | Hard cap | Where enforced |
|---|---|---|
| `RollupConsumer` in-memory hour map | 200k unique `(uidHash, evt, hour)` keys | `rollup.ts` — flush early if exceeded |
| `RollupConsumer` in-memory day map | 100k unique `(uidHash, evt, day)` keys | same |
| `sessionSummary.ts` LRU | 50k in-flight sessions | `lru-cache` package, eviction logged |
| `focusAffinity.ts` per-user-per-hour | 256 unique `(route, elementId)` | `focusAffinity.ts` — drop lowest-dwell |
| `learnerLoop.ts` batch | 500 users / tick | env `LEARNER_BATCH=500` |
| `events:raw` Redis stream | MAXLEN ~ 100k | already enforced by ingest XADD |
| `web SDK` IndexedDB queue | 10 MB / device | already enforced |
| Web SDK new collectors total CPU | ≤ 2% of main thread (measure on mid-tier Android) | document in collector header comment, verify with Chrome DevTools |

**Forbidden patterns** (will be flagged in code review):
- Module-level unbounded `Map` or `Set` accumulators in worker code (the existing module-level Maps in `services/shared/src/algo/*` for suffix automaton / eertree / BK-tree / Aho-Corasick are *grandfathered* per repo memory — do not add new ones).
- Synchronous DB writes in hot paths (must be batched + async).
- Reading from Postgres inside a tight web-request handler more than once per request.

---

## 4. Security checklist

- [ ] Every new event payload Zod-validated **server-side** (not just client). Reject (silently 204) on malformed.
- [ ] `safety.report` reason field uses an enum, not free-form text. If product wants free text, gate it in a separate column with stripping (no PII / no URLs / max 280 chars).
- [ ] `safety.block` and `safety.report` write to `SafetyAgg` AND to the existing safety pipeline (audit log) — both. Tracking is observability; the safety action itself remains a first-class API call.
- [ ] `UserWeightProfile.weights` JSON is type-validated on read (Zod schema) — corrupted JSON falls back to defaults instead of crashing the ranker.
- [ ] Migration adds row-level cleanup for GDPR right-to-be-forgotten. Extend `services/tracking-worker/src/forget.ts` to delete from `SafetyAgg`, `FirstMoveOutcome`, `UserWeightProfile`, `UserMoveProfile`, `SessionSummary`, `FocusAffinityHourly`.
- [ ] No new endpoint exposes raw event data to the web client. Only aggregates.
- [ ] Rate-limit outcomes in the learner queue: max 100 outcomes/user/hour. Beyond that, sample. (Stops a malicious client from poisoning their own weights via fake activity.)

---

## 5. Test posture

- **Unit:** each new file ships with ≥ 1 happy-path test + ≥ 1 edge-case test. Use existing vitest 2.1.9.
- **Integration:** the two end-to-end learner loops above (Discover, DTM).
- **Property tests:** for `learner.updateProfile`, add fast-check tests:
  - Weights always sum to ~ 1.0 (within 1e-9).
  - Posterior moves toward observed preferences after enough samples.
  - Bandit α/β never go negative.
- **Performance:** add a vitest perf bench (`vitest bench`) that asserts:
  - `sessionSummary.ts` processes 10k events in < 200ms.
  - `learnerLoop.ts` updates 500 profiles in < 500ms.
- **Sonar / sanity:** the existing `npm run typecheck` (parallelized via `scripts/typecheck.mjs`) must remain ≤ 25s wall time. New code must respect existing TS strictness; do not introduce `any` or `@ts-ignore`.

---

## 6. Rollout

1. Ship Phase A (collectors + event names) **dark** — events flow but no consumer reads them yet. Verify ingest p99 unchanged.
2. Ship Phase B + C (workers + schema) — `SessionSummary`, `SafetyAgg`, `FirstMoveOutcome`, `UserWeightProfile` start filling. **Read-only** until next phase.
3. Ship Phase D — `forYouV6` and `dtmLearningV6` start *reading* `UserWeightProfile` but only at 5% traffic via existing flags (`ALGO_V6_LEARNER_RAMP=0.05` → `0.25` → `1.0`).
4. Ship Phase E — Discover and DTM endpoints record outcomes. Full loop closed.
5. After 7 days at 100%, remove old static-weight code paths.

**Kill switches at every layer:**
- `TRACKING_KILL=1` (existing) — kills all ingest.
- `LEARNER_LOOP_ENABLED=0` — pauses weight updates without disabling ranking.
- `ALGO_V6_LEARNER_RAMP=0` — falls back to static weights instantly.
- Per-collector flag in web SDK: `NEXT_PUBLIC_TRACK_<NAME>_ENABLED` — disables one collector without redeploying everything.

---

## 7. Out of scope (explicitly NOT to do in v6.5)

- vitest 2 → 3 upgrade (breaks; needs separate decision).
- ESLint/Prettier rollout (would auto-rewrite hundreds of files).
- npm-workspaces consolidation (`@miamo/db` package). The Prisma schema-sync rule continues until that refactor lands.
- Replacing `prom-client` or any observability tooling.
- Touching the existing 17 ranking algorithms beyond reading `weightProfile()`. Their internal math is grandfathered.
- Adding new JS dependencies. Use what's already in `package.json`. (`lru-cache` is already a transitive dep via Prisma — verify before importing.)

---

## 8. Verification gate (must run before merging each phase)

```bash
cd /Users/singhshs/Downloads/Miamo

# 1. Typecheck
npm run typecheck                                # must end "All 11 packages typecheck clean"

# 2. Tests
npm run test:full                                # must end "938 passed (938) / 12323+ passed"

# 3. Production audit
npm audit --omit=dev                             # must remain "found 0 vulnerabilities"

# 4. Memory smoke (on the worker)
node --expose-gc services/tracking-worker/dist/index.js &
WORKER_PID=$!
sleep 60
ps -o rss= -p $WORKER_PID                        # must be < 1048576 (= 1 GiB in KiB)
kill $WORKER_PID

# 5. Ingest latency smoke (synthetic)
# Send 1000 events through /v1/track, measure p99 < 15ms.
```

If any of these fail, do not merge. Roll back to the previous green commit.

---

## 9. Prompt-as-spec — paste this to start work

> You are working in `/Users/singhshs/Downloads/Miamo`, branch `main`. Read `docs/PROMPTS/LEARNING_SYSTEM_V6_5.md` end-to-end before touching any code. Implement Phase A only. Do not start Phase B until I review and approve. Each phase must be one commit. Verify with the gate in §8. Do not modify the existing 17 ranking algorithms, the envelope schema, or the `TRACKING_HASH_SECRET`. After Phase A, post a summary of: (1) files created, (2) events newly emitted, (3) before/after of `npm run typecheck` timing, (4) test counts. Then stop.

---

**Version:** v6.5  
**Author:** prepared 31 May 2026  
**Status:** ready for execution
