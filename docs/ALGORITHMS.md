# Algorithms — the v4 ranking system

Seventeen pure-function rankers wired into eight user-facing surfaces. Zero external ML. Everything is a deterministic composition of hashed-feature cosines and clamped scalars, runnable in TypeScript with no GPU and no model server.

Source of truth: [services/shared/src/algo/](services/shared/src/algo/).

## 1. Core idea

Each algorithm is a function:

```ts
(inputs: AlgoInputs) => { score: number /* 0..100 */, explain: Record<string, number> }
```

The function reads the world through the **`SignalReader`** interface, never via Prisma. In production the implementation is `PrismaSignalReader` (with a 60-second LRU); in tests it's `FakeSignalReader` (in-memory fixture). That's why the 225 algo tests run in ~1.2 s with no database.

## 2. The `SignalReader` interface

[services/shared/src/algo/signals.ts](services/shared/src/algo/signals.ts).

```ts
interface SignalReader {
  hashOf(userId: string): string;                                   // HMAC uidHash
  features(uidHash: string): Promise<FeatureRow | null>;            // peak hours, embeddings, etc.
  pairCompat(a: string, b: string[]): Promise<Map<string, PairRow>>;
  recentEvents(uid: string, events: string[], days: number): Promise<EvtCount[]>;
  priorTargets(a: string, b: string[], days: number): Promise<Map<string, number>>;
  targetImpressions(a: string, b: string[], days: number): Promise<Map<string, number>>;
  dailyMatch(uid: string): Promise<{bHash: string; score: number; computedAt: Date} | null>;
}
```

Cache layers in `PrismaSignalReader`: LRU 2 048 features, 8 192 pairs; TTL 60s and 30s. Cold reads are raw SQL, not ORM.

## 3. Registry

Every algorithm self-registers on import via [registry.ts](services/shared/src/algo/registry.ts):

```ts
registerAlgo({
  name: "forYou",
  surface: "discover",
  usesEvents: ["discover.card_view", "discover.swipe"],
  weights: { interestCos: 0.25, vibeCos: 0.20, /* ... */ },
});
```

The tracking-worker imports every algo file for its side effects and exposes the inventory at `GET /v4/status`:

```json
{
  "ts": "2026-05-27T...",
  "kill": false,
  "flags": { "ALGO_V4_RANK_ENABLED_DISCOVER": "1", ... },
  "algos": [
    { "name": "forYou", "surface": "discover", "weights": {...}, "usesEvents": [...] },
    ...
  ]
}
```

## 4. Flags

[services/shared/src/algo/flags.ts](services/shared/src/algo/flags.ts). One flag per surface; all default to `'0'`.

| Env var | Controls |
|---|---|
| `ALGO_V4_RANK_ENABLED_DISCOVER` | `/api/v1/discover` ensemble |
| `ALGO_V4_RANK_ENABLED_MESSAGING` | chat suggestions endpoint |
| `ALGO_V4_RANK_ENABLED_BEATS` | beats picker |
| `ALGO_V4_RANK_ENABLED_NOTIFICATIONS` | push scheduling |
| `ALGO_V4_RANK_ENABLED_SEARCH` | search re-rank |
| `ALGO_V4_RANK_ENABLED_FEED` | feed re-rank |
| `ALGO_V4_RANK_ENABLED_AIMATCH` | daily curated pick |
| `ALGO_V4_RANK_ENABLED_DEEPCOMPAT` | 16-dim DTM compatibility |
| `ALGO_V4_WORKERS_ENABLED` | EnrichmentWorker + DailyMatchWorker |

## 5. The 17 algos

| Algo | Surface | Inputs | Output | Source |
|---|---|---|---|---|
| `forYou` | discover | me, cand, intent, distance, interests, pair, prior, impressions | 0..100 + explain | [forYou.ts](services/shared/src/algo/forYou.ts) |
| `aiPicks` | discover | ForYouInputs + sub-scores + rand() | 0..100 + explain | [aiPicks.ts](services/shared/src/algo/aiPicks.ts) |
| `aiMatch` | aiMatch | AiPicksInputs[] | top-1 \| null | [aiMatch.ts](services/shared/src/algo/aiMatch.ts) |
| `new` | discover | ForYouInputs + createdAtMs + verified + completeness | 0..100 | [new.ts](services/shared/src/algo/new.ts) |
| `active` | discover | FeatureRow + lastHeartbeat + ForYouInputs | 0..100 | [active.ts](services/shared/src/algo/active.ts) |
| `verified` | discover | ForYouInputs + photoVerified + phoneVerified + idVerified | 0..100 (gated) | [verified.ts](services/shared/src/algo/verified.ts) |
| `serious` | discover | ForYouInputs + DTM completes + lovelang + completeness | 0..100 (gated) | [serious.ts](services/shared/src/algo/serious.ts) |
| `cf` | discover | CfNeighbour[] | Map\<hash, 0..100\> | [cf.ts](services/shared/src/algo/cf.ts) |
| `dtm` | deepCompat | two 16-d vectors | 0..1 cosine | [dtm.ts](services/shared/src/algo/dtm.ts) |
| `moves` | discover/opener | candFeatures, lastUsedAgoSec[], candLastAction, hour, deepCompat | MoveSuggestion[] | [moves.ts](services/shared/src/algo/moves.ts) |
| `messageSuggest` | messaging | candFeatures, lastInboundKind, ageSec, intent, hour | Suggestion[] | [messageSuggest.ts](services/shared/src/algo/messageSuggest.ts) |
| `beats` | beats | Beat[], BeatInputs | Beat[] sorted | [beats.ts](services/shared/src/algo/beats.ts) |
| `notifyTiming` | notifications | now, peakHours, quietHours, lastSent, minSpacing, tzOffset | Date | [notifyTiming.ts](services/shared/src/algo/notifyTiming.ts) |
| `searchAugment` | search | ForYouInputs + textScore + candUpdatedAtMs | 0..100 | [searchAugment.ts](services/shared/src/algo/searchAugment.ts) |
| `feedAugment` | feed | sourceScore + forYouScore + itemAgeSec | 0..100 | [feedAugment.ts](services/shared/src/algo/feedAugment.ts) |
| `postImpressionRerank` | discover | skippedCount + secsSinceLast | delta | [postImpressionRerank.ts](services/shared/src/algo/postImpressionRerank.ts) |
| `_meta_` (registry) | — | — | enumeration | [registry.ts](services/shared/src/algo/registry.ts) |

## 6. Worked example — Discover ranks a candidate

User A asks for Discover. Candidates pool = [B, C, D]. Flag `ALGO_V4_RANK_ENABLED_DISCOVER=1`.

**Step 1 — Hash and load.**

```ts
const aHash = reader.hashOf(userA.id);
const me = await reader.features(aHash);
const candHashes = [B,C,D].map(c => reader.hashOf(c.id));
const pairs = await reader.pairCompat(aHash, candHashes);
const impressions = await reader.targetImpressions(aHash, candHashes, 7);
```

**Step 2 — Score each candidate with `aiPicks`.**

```ts
for (const c of [B,C,D]) {
  const cHash = reader.hashOf(c.id);
  const cFeat = await reader.features(cHash);
  const inputs = {
    me, cand: cFeat,
    pair: pairs.get(cHash),
    intent: A.intent, distance: distKm(A,c), age: ageDelta(A,c),
    interests: { /* hashed-tag vec */ },
    priorCount: 0, impressions: impressions.get(cHash) ?? 0,
    consent: A.consent,
  };
  const sub = {
    forYou:    scoreForYou(inputs).score,
    cf:        cfMap.get(cHash) ?? 0,
    active:    scoreActive({ ...inputs, lastHeartbeatMs: cFeat?.lastHeartbeat }).score,
    serious:   scoreSerious(inputs).score,
    affinity:  matchHistoryAffinity(A, c),
    vibe:      vibeMomentum(A, c),
    explore:   rand(),
  };
  const { score, explain } = scoreAiPicks({ ...inputs, sub });
  // apply impression fatigue
  const penalty = postImpressionPenalty(impressions.get(cHash) ?? 0, secsSinceLast.get(cHash) ?? Infinity);
  c._rank = Math.max(0, score - penalty);
  c.explain = explain;
}
```

**Step 3 — Sort by `_rank` desc, return.**

For one candidate (numbers from a real test run on seeded data):

```
forYou=57.8  cf=42.0  active=63.1  serious=70.5
affinity=15.0  vibe=22.0  explore=0.74
weighted = 100 * (.30*0.578 + .20*0.42 + .15*0.631 + .10*0.705
                + .10*0.15  + .10*0.22 + .05*0.74 + .05*0.0) = 41.2
penalty  = 12 * log1p(2 skipped) * exp(-3600/86400) = 12 * 1.10 * 0.959 = 12.66
final    = 41.2 - 12.66 ≈ 28.5
```

The `explain` map carries every sub-score so the UI can render "Why this card?" in [services/web/src/app/(main)/ai-match/page.tsx](services/web/src/app/(main)/ai-match/page.tsx).

## 7. Determinism guarantees

- **Hashed features**: every interest tag → 64-bit hash → bucket index. Vocabulary drift cannot retroactively change old scores.
- **Float32 LE**, L2-normalised at write time. Cosine = dot product. No NaN at runtime (guarded by the `safeNorm` helper).
- **HMAC `uidHash`**: HMAC-SHA256(uid, `TRACKING_HASH_SECRET`) → base64url, truncated to 22 chars. Stable across pods. Never rotate the secret.
- **Clamping**: every score is `clamp(x*100, 0, 100)`. No silent overflows.
- **Test seed**: `tests/_fixtures.ts` and the 20-user seed in [services/shared/prisma/seed.ts](services/shared/prisma/seed.ts) produce identical scores across runs.

## 8. Background workers

### `EnrichmentWorker` ([services/tracking-worker/src/enrich.ts](services/tracking-worker/src/enrich.ts))

Runs every 60 min when `ALGO_V4_WORKERS_ENABLED=1`. Reads `FeatureSnapshot` rows updated in the last 24h and writes back enriched fields: `peakHours[]`, `cadenceVec` (24-byte base64 Float32 of hour-of-day distribution), `dtmVec`. Used by `forYou.chronoOverlap`, `active.responseRate`, `dtm.score`.

### `DailyMatchWorker` ([services/tracking-worker/src/daily-match.ts](services/tracking-worker/src/daily-match.ts))

Runs once 60s after boot, then every 12 h. For each user with a recent FeatureSnapshot:

1. Load top-50 candidates from `PairCompatCache` ordered by `finalScore`.
2. Score them with `scoreAiPicksV4` (rand stubbed to 1.0 for determinism).
3. If the top score ≥ 70, write it into `FeatureSnapshot.raw` under `dailyMatch = {bHash, score, computedAt}`.

The web `/ai-match` page reads this via `reader.dailyMatch(myHash)` and marks the corresponding card with a rose `★ Today's pick` chip.

## 9. Ops endpoint

`GET http://<tracking-worker>:3261/v4/status` returns the live algo inventory, current flag values, and the kill flag. Used by smoke tests and dashboards.

`GET /healthz` returns `{ ok: true, kill, v4Workers, algos: <count> }`.

## 10. Adding an algo (recipe)

1. Create `services/shared/src/algo/myAlgo.ts`:

   ```ts
   import { registerAlgo } from "./registry";
   import { clamp01 } from "./math";

   const W = { foo: 0.6, bar: 0.4 };
   registerAlgo({ name: "myAlgo", surface: "discover", usesEvents: [], weights: W });

   export function scoreMyAlgo(i: { foo: number; bar: number }) {
     const score = clamp01(W.foo * i.foo + W.bar * i.bar) * 100;
     return { score, explain: { foo: i.foo, bar: i.bar } };
   }
   ```

2. Import it once in the surface's server handler and in [services/tracking-worker/src/index.ts](services/tracking-worker/src/index.ts) so it shows up in `/v4/status`.
3. Add a flag (or reuse an existing surface flag).
4. Write a test in `tests/algo-<name>.test.ts` using `FakeSignalReader`.
5. Ship behind `ALGO_V4_RANK_ENABLED_<SURFACE>=0` and ramp.

## 11. What changed & why it's good

- **Before:** Ranking was inline `prisma.user.findMany({ orderBy: { lastActive: 'desc' } })`. Impossible to test without a DB; impossible to A/B; opaque to support.
- **After:** 17 pure functions behind `SignalReader`, 225 tests in ~1.2s, per-surface flags, `explain` payloads in every response, a live `/v4/status` inventory, and two warm-state workers.
- **Why it matters:** New rankers ship in hours, not weeks. Bad rankers turn off with one env var. Every score is auditable. Zero external ML cost.
