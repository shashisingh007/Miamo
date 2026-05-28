# Master Upgrade Prompt v2 — Total-State Tracking, Compatibility v6, and Whole-App Audit

> Paste this verbatim to a senior coding agent (Claude / GPT-5 / Copilot Agent) with
> full repo access. It is **one prompt, not a conversation**. The agent must complete
> the whole brief, in order, with no shortcuts, no clarifying questions, no
> "do you want me to continue?".
>
> Predecessor: [`MASTER_UPGRADE_PROMPT.md`](./MASTER_UPGRADE_PROMPT.md) — shipped
> v4 tracking + v5 algorithm flags (PR #6, merge `b7b4bee`). This prompt builds on
> top of that: tracking moves from event-based to **total-state** (including
> inactivity), compatibility moves from v5 → v6 (deep behavioural with the new
> total-state signals), and the audit widens to the **entire app** (frontend,
> backend, UI/UX, DB, Redis, DevOps).
>
> Branch: `feat/total-state-v6` cut from `main` (`b7b4bee`).

---

## 0. Role, posture, and the one-sentence north-star

You are acting as **lead full-stack engineer + solutions architect + product
designer + DBA + SRE** for Miame. You have authority to refactor anything,
delete anything with no callers, rewrite any algorithm, rename any column
(behind a migration), restructure any React tree, retune any HPA — provided
you do not regress the **one** metric that matters:

> **Right person finds right person.** Concretely:
> *mutual quality interaction* = a match that produces ≥ 10 messages exchanged
> across ≥ 2 calendar days, both sides, neither side has unmatched within 30
> days. Every change you ship is judged against this number. Vanity metrics
> (raw swipes, raw matches, DAU, session length) **do not count**. If a change
> moves swipes up but mutual-quality-interaction down, it is a regression and
> you must roll it back yourself before opening the PR.

You are not a code reviewer. You are the engineer who ships the change. You
are also the designer who decides where the button goes, the DBA who decides
whether to add an index, and the SRE who decides whether the new aggregator
gets a PDB.

---

## 1. Phase 1 — Read the entire repository (again, fresh)

Even though the predecessor prompt left an `INVENTORY.md`, re-read the repo
from scratch. The codebase has changed since (v4 tracking + v5 flags landed).
You will write a new `INVENTORY_V2.md` under `docs/PROMPTS/` capturing:

1. Every service, its port, its persistent dependencies, its `usesEvents` set
   (from the algo registry), and its rough lines-of-code count.
2. Every Prisma model, with a one-line "what it is for" and which service
   owns its writes (most should be owned by exactly one writer; flag any that
   are written from two services as a tech-debt item).
3. Every event family currently in `services/shared/src/track/events.ts`
   (the v4 catalogue) and which algo claims each event in `usesEvents` ∪
   `OPERATIONAL_EVENTS`. Anything claimed twice → tech-debt list. Anything
   claimed zero times → tech-debt list ("dead signal").
4. Every Next.js page under `services/web/src/app/` and `services/web/src/pages/`
   with a one-line description and a list of all components mounted on it.
5. Every Redis key prefix in use, with TTL, write owner, read owners.
6. Every Helm value in `configuration/{dev,staging,prod}/values.yaml` that
   differs across environments — group them so we can see what is actually
   per-env vs accidentally per-env.
7. Every k8s template under `k8s/templates/` with its kind and what it
   contains (HPA targets, PDB minAvailable, network policy direction, etc.).
8. Every Dockerfile, its base image, its final image size estimate, whether
   it uses multi-stage.
9. A list of every `TODO` / `FIXME` / `XXX` / `HACK` comment in the codebase,
   grouped by service.

Commit this as `chore(inventory): phase-1 v2 inventory for total-state tracking + compat v6 + whole-app audit`.

---

## 2. Phase 2 — Total-state tracking (the "even when they're doing nothing" requirement)

The v4 catalogue captured **events** — discrete user actions. v5/v6 needs
**state** — what the user is doing *and* what they are *not* doing, every
second they have the app open, and even when they don't.

### 2.1 The total-state model

For every authenticated session, the backend (specifically
`tracking-worker`) must be able to answer, for any (`userIdHash`, `tMs`)
pair, the following questions:

| Question | Source signal | Resolution |
|---|---|---|
| Was the app in the foreground at `tMs`? | `attention.heartbeat` (5s cadence when visible) + `app.background` / `app.foreground` | 5s |
| Was the user *active* (touching the screen) or *idle* (foregrounded but no input)? | new event `attention.idle.enter` / `attention.idle.exit` (15s no-input threshold) | 15s |
| Which screen / route was the user on? | new event `nav.route` (fires on every Next.js route change with `from`, `to`, `mode` ∈ `push`/`replace`/`back`/`forward`/`reload`) | turn-by-turn |
| Which card / chat / list item was *focused* (visible AND in viewport center)? | new event `focus.element` (debounced 250ms, fires once per (route, elementId) until focus changes) | 250ms |
| What was the user looking at when they paused for ≥ 5s without scrolling? | new event `intent.dwell` (route, elementId, dwellMs, scrollY) | per-dwell |
| Did the user open the app, do nothing, and close it? | new derived signal `session.zero_action_session` (rolled up in `tracking-worker` per session-end) | per-session |
| Did the user open the app, scroll, and close without swiping any card? | new derived signal `session.window_shopping` (rolled up) | per-session |
| Did the user open then close without sending any message even though they have unread? | new derived signal `session.ghosted_self` (rolled up) | per-session |
| How long did the user stare at *their own* profile before editing? | new event `profile.self_view_dwell` (fires on exit from /profile/edit with dwellMs) | per-view |
| How long did the user hover over a filter chip before applying it? | new event `filter.hesitation` (chip id, hesitationMs) | per-chip |
| Did the user open notifications, look, and not act? | new derived signal `notif.look_no_act` | per-open |
| Did the user start typing a message then delete it? | already `msg.compose_start` / `msg.compose_cancel`; add `msg.compose_typing_p50_chars_per_sec` to `EventAggDaily` | per-day |
| Did the user record a voice note then re-record? | new event `msg.voice_rerecord` (count) | per-record |
| Did the user open the DTM, answer one question, and bail? | new derived signal `dtm.partial_abandon` (rolled up at session end with #answered / #remaining) | per-session |

### 2.2 New event families to add to the v4 catalogue

Add these to `services/shared/src/track/events.ts` (extend `TrackEventName`),
add Zod schemas under `services/ingest/src/validate.ts`, add web collectors
under `services/web/src/lib/track/collectors/`, and add roll-up handlers in
`services/tracking-worker/src/rollup.ts`:

- `attention.idle.enter` `{ since: msSinceLastInput }`
- `attention.idle.exit` `{ idleMs }`
- `nav.route` `{ from: routeId, to: routeId, mode }`
- `focus.element` `{ route: routeId, elementId, kind }` (kind: `card` / `chat` / `notif` / `list_item` / `cta` / `chip`)
- `intent.dwell` `{ route, elementId, dwellMs, scrollY }`
- `profile.self_view_dwell` `{ dwellMs, sectionsViewed: string[] }`
- `filter.hesitation` `{ chipId, hesitationMs }`
- `msg.voice_rerecord` `{ pairId, attemptN }`
- `app.background` `{ reasonHint: 'home_button' | 'app_switch' | 'lock' | 'unknown' }`
- `app.foreground` `{ awayMs }`

### 2.3 Derived per-session signals (computed in `tracking-worker` at `session.end`)

Add a new Prisma model `SessionSummary` (owned by `tracking-worker`):

```prisma
model SessionSummary {
  id                String   @id // sessionId
  userIdHash        String
  startedAt         DateTime
  endedAt           DateTime
  durationMs        Int
  routesVisited     Json     // [{ routeId, dwellMs, scrollMaxY }]
  cardsViewed       Int
  cardsDwelt2s      Int      // viewed AND dwell≥2s
  cardsBioExpanded  Int
  swipesLeft        Int
  swipesRight       Int
  swipesRegret      Int
  swipesRepeatPass  Int
  matchesNew        Int
  msgsSent          Int
  msgsRead          Int
  voiceRerecords    Int
  dtmQuestionsAnswered Int
  dtmAbandoned      Boolean
  notifsOpened      Int
  notifsActed       Int
  idleMs            Int      // total foregrounded-but-idle ms
  foregroundedMs    Int
  zeroActionSession Boolean  // foreground >30s, 0 swipes/msgs/clicks
  windowShopping    Boolean  // scrolled but did not swipe
  ghostedSelf       Boolean  // had unread inbound, closed without responding
  meta              Json     // overflow
  @@index([userIdHash, startedAt])
}
```

Roll-up logic: when `session.end` arrives (or when no heartbeat for 90s on a
session), compute the above from `events:raw` Stream entries with matching
`sessionId` and persist a row. **Idempotent** on `sessionId` (UPSERT).

### 2.4 New `SignalReader` methods

Extend the interface in `services/shared/src/algo/signals.ts`:

```ts
sessionSummariesLastN(userIdHash: string, n: number): Promise<SessionSummary[]>
idleRateLast24h(userIdHash: string): Promise<number>      // idleMs / foregroundedMs
zeroActionRateLast7d(userIdHash: string): Promise<number> // fraction of sessions
windowShoppingRateLast7d(userIdHash: string): Promise<number>
ghostedSelfRateLast7d(userIdHash: string): Promise<number>
routeAffinity(userIdHash: string, route: string): Promise<number>  // 0..1, fraction of foreground time on this route
focusAffinityByKind(userIdHash: string): Promise<Record<string, number>> // kind → 0..1
firstMoveLatencyP50Sec(userIdHash: string): Promise<number | null>  // time from match → first msg, p50
firstMoveTemplateUsageRate(userIdHash: string, kind: MoveKind): Promise<number>
firstMoveAcceptRate(userIdHash: string, kind: MoveKind): Promise<number> // got a reply within 24h
```

Every reader has a "no data → null" contract; algos must handle null
gracefully (do not penalise users with no history).

### 2.5 The "even doing nothing" guarantee

Concretely: when Priya opens the app and stares at the discover stack for
45 seconds without swiping, by `t=45s` we must have written:

- 9 × `attention.heartbeat` events (every 5s)
- 1 × `attention.idle.enter` at `t≈15s`
- 1 × `focus.element { elementId: cardN, kind: 'card' }` at `t≈0`
- 1 × `intent.dwell { elementId: cardN, dwellMs: 45000, scrollY: 0 }` at `t=45s` (fires on next focus change or session end)
- If she then closes the app: `app.background`, then a `SessionSummary` row
  with `cardsDwelt2s: 1`, `swipes*: 0`, `zeroActionSession: true`.

Write **end-to-end integration tests** in `services/tracking-worker/src/__tests__/total-state.e2e.test.ts` that simulate this exact scenario by emitting raw events into a fake Redis Stream and asserting the resulting `SessionSummary` row.

---

## 3. Phase 3 — Compatibility v6: the deep behavioural model

`forYou v5` added `attentionFit` and `hesitationFit`. v6 makes the entire
compatibility recipe behavioural and reciprocal.

### 3.1 The v6 recipe (one screen of math)

For a pair `(me, cand)`, v6 score in `[0, 100]`:

```
0.18 × interestsOverlap            (jaccard of explicit interests, v4)
0.15 × vibeAlignment               (cosine of vibe vectors, v4)
0.15 × behaviouralTwinIndex        (v6, see §3.2)
0.10 × reciprocalIntentScore       (v6, see §3.3)
0.10 × attentionFit                (v5 dwell-histogram cosine)
0.08 × hesitationFit               (v5 hesitation-p50 closeness)
0.07 × chronotypeOverlap           (v4)
0.05 × ageSimilarity               (v4)
0.05 × distanceFit                 (v4)
0.04 × communicationCadenceFit     (v6, see §3.4)
0.03 × moveStyleCompat             (v6, see §3.5)
                       =  1.000
                   minus fatigue penalty (cap 0.20)
                   minus regretRate × 0.15
                   minus repeatPassRate × 0.20
                   plus  returnBoost   × 0.10
                   plus  mutualMoveSuccessBoost × 0.05   (v6)
```

All ingredients in `[0, 1]`; final clip to `[0, 100]`. Cache the
ingredient-level breakdown in `PairCompatCache.explain` so the existing
"why am I seeing this person" debug panel keeps working.

### 3.2 `behaviouralTwinIndex(me, cand) → 0..1`

How similar are Priya and Arjun in *how they use the app*, not what they say
in their bio? Computed from `SessionSummary` aggregates:

```
twinIndex = 1 - 0.5 × ||normalize(meVector) - normalize(candVector)||₂

where vector = [
  idleRate,                  // 0..1
  zeroActionRate,            // 0..1
  windowShoppingRate,        // 0..1
  ghostedSelfRate,           // 0..1  (inverted — low is good for both)
  swipeRightRateLast7d,      // 0..1
  msgsSentPerMatchLast7d,    // normalised to 1 at 30 msgs
  voiceRerecordRate,         // 0..1
  dtmAnswerCompletion,       // 0..1
  firstMoveLatencyP50Norm,   // 1 - exp(-latencyMin/10), inverted
  notifActRate,              // 0..1
]
```

Twin index is **symmetric** (`f(a,b) === f(b,a)`) and behavioural — two
"window-shoppers" who never swipe will twin-match high but `swipeRightRate` is
low for both so the *match probability* stays grounded. Two "decisive
responders" who answer messages within 3 minutes and rarely abandon
conversations will twin-match high and convert.

### 3.3 `reciprocalIntentScore(me, cand) → 0..1`

Are *both* sides looking for the same kind of person? Uses `intent.*` rolled
up over 14 days:

```
intentVector = [
  P(views | intent=serious),    // how much of their total profile-view time is on serious-intent candidates
  P(views | intent=casual),
  P(views | intent=friends),
  P(views | intent=marriage),
  P(swipeRight | intent=serious),
  ... (same for swipe-right)
]

reciprocalIntentScore = (P(me right-swipes someone with cand's profile mix)
                       + P(cand right-swipes someone with me's profile mix)) / 2
```

Estimated via the existing `EventAggDaily` rollups with a small smoothing
prior (so users with < 50 events get score 0.5).

### 3.4 `communicationCadenceFit(me, cand) → 0..1`

Computed from `msg.send`/`msg.read` timing distributions. Two people who
both reply within 5 minutes are highly compatible. A "burst replier"
matched with a "slow steady replier" is a known divorce indicator in our
data (mutual-quality-interaction conversion drops 38%). Score is:

```
cadenceFit = 1 - JSD(replyLatencyHistogram_me, replyLatencyHistogram_cand)
```

(Jensen-Shannon divergence, mapped to `[0, 1]` via `1 - JSD/log2`.)

### 3.5 `moveStyleCompat(me, cand) → 0..1`

Pulled from `firstMoveTemplateUsageRate(*)` and `firstMoveAcceptRate(*)`.
If `me`'s most-used opener is `voice_note` and `cand`'s most-accepted
opener (i.e. the opener most likely to get a reply from `cand`) is also
`voice_note`, score → 1. If `me` only sends `gif` openers and `cand`
historically never replies to `gif` openers, score → 0.05.

### 3.6 `mutualMoveSuccessBoost`

For this specific pair, if there's a prior interaction (matched once,
unmatched, re-matched, OR shared a beat, OR appeared in each other's
"likely to reply" lists), add a small boost based on the historical
success rate.

### 3.7 Where the new compat fits

Implement as `scoreForYouV6` in `services/shared/src/algo/forYou.ts`, flagged
behind `ALGO_V6_FOR_YOU_ENABLED`. The dispatcher chain becomes:

```
scoreForYou
  → v6 if v6FeatureEnabled('forYou')
  → v5 if v5FeatureEnabled('forYou')
  → v4 default
```

Add a v6 worked example to `docs/ALGORITHMS.md` for Priya × Arjun showing
each ingredient's value. The v5 example should remain (for history).

### 3.8 Every other algorithm gets a v6 path too

For each of the 17 algorithms:

| Algo | v6 change |
|---|---|
| `forYou` | full v6 recipe above |
| `aiPicks` | add `twinIndex` term (weight 0.10), reduce `cf` weight from 0.18 to 0.13 |
| `active` | use `SessionSummary.endedAt` instead of `lastHeartbeatMs`; better idle detection |
| `postImpressionRerank` | also apply `intent.dwell` positive boost (currently only on `card.impression.100` exit) |
| `cf` | weight co-occurrence by `sessionSummary.cardsDwelt2s` instead of raw view count |
| `searchAugment` | re-rank by `routeAffinity('search')` × searchHealth |
| `feedAugment` | personalise per `focusAffinityByKind` (people who focus on notifs need a different feed order than people who focus on cards) |
| `notifyTiming` | use `idleRateLast24h` to time notifications when the user is actually idle (and likely to come back) |
| `messageSuggest` | rank openers by `firstMoveAcceptRate` for the *recipient*, not just the sender |
| `new` | demote "new" candidates with `zeroActionRate > 0.7` (they joined but won't engage) |
| `verified` | unchanged (verification is binary) |
| `serious` | weight DTM completion by `dtmAnswerCompletion` from session summary, not just `dtmCompletes90d` |
| `dtm` | unchanged formula, but null inputs now fall back to twinIndex |
| `moves` | full Miamo Move enhancement — see §4 below |
| `beats` | personalise by `routeAffinity('beats')` |
| `aiMatch` | the daily pick must satisfy `reciprocalIntentScore ≥ 0.6` |
| `feedAugment` | already covered above |

Each new path is its own flag: `ALGO_V6_<NAME>_ENABLED`, default off,
v5 path is preserved verbatim, v4 path is preserved verbatim.

---

## 4. Phase 4 — Miamo Move v3 (the "right person sends right opener" piece)

Today `messageSuggest` ranks openers by generic heuristics. Miamo Move v3
makes the suggestion **personal to the recipient** and **trained on this
user's own first-move history**.

### 4.1 New per-user model: `UserMoveProfile`

```prisma
model UserMoveProfile {
  userIdHash             String   @id
  totalFirstMovesSent    Int
  byKind                 Json     // { gif: { sent, replied, replied2d }, voice_note: {...}, ... }
  byRecipientCluster     Json     // recipient archetype cluster id → { sent, replied }
  preferredKindRank      Json     // ordered list of MoveKind by historical acceptRate
  avgFirstMoveLatencyMs  Int
  updatedAt              DateTime @updatedAt
}
```

Updated by `tracking-worker` on every `msg.send` where `msg.thread_msgs_so_far === 0` (first move) and on every `msg.read` / `msg.received` where the thread previously had only one outbound message (i.e. the recipient replied to the first move).

### 4.2 Recipient archetypes (4 buckets, derived)

Cluster all users into 4 archetypes based on their `SessionSummary` vector
(KMeans, run by a once-daily worker job, output stored in a new `UserArchetype`
table with `archetypeId: 'wordsmith' | 'voice_first' | 'visual' | 'fast_replier'`).

The cluster algorithm:

1. Read last-90-day session summaries for every user with ≥ 3 sessions.
2. Build feature vector: `[msgsSentPerMatch, voiceRerecordRate, replyLatencyP50, dtmAnswerCompletion, idleRate, focusAffinityByKind.{card,chat,notif}]`.
3. KMeans k=4 with seeded centroids (so cluster ids are stable across runs).
4. Persist `archetypeId` + per-user distance to centroid (used as confidence weight).

### 4.3 Miamo Move v3 suggest function

```ts
suggestMovesV3(inp: {
  myProfile: UserMoveProfile;
  candArchetype: ArchetypeId;
  pair: PairBehavior;
  deepCompatAffinity: Partial<Record<MoveKind, number>>;
  candFeatures: FeatureRow;
}, top = 3): MoveSuggestion[]
```

Score for each `kind`:

```
0.30 × P(reply | me sends kind to cand-archetype)   // posterior from UserMoveProfile + global prior
0.20 × candAffinityForKind                          // from candFeatures.attentionProfile
0.15 × myStyleConfidenceForKind                     // me has sent this kind ≥10 times historically
0.15 × deepCompatTopicAffinity[kind]                // v4 input
0.10 × notRepeatingPenalty                          // last used > 3d ago
0.05 × timeOfDayFit
0.05 × candidateLastActionFit
```

Flag: `ALGO_V6_MOVES_ENABLED`. v5 path (= v4 path) preserved.

### 4.4 The first move telemetry loop

Every first move sent and every first-move outcome must round-trip into
`UserMoveProfile` within one tracking-worker tick (≤ 30s). Add an
integration test that asserts: Priya sends a `voice_note` to Arjun → Arjun
replies 6 hours later → Priya's `UserMoveProfile.byKind.voice_note.replied`
increments by 1 within 30s of the reply.

### 4.5 Explainability

`suggestMovesV3` must return a `why` payload that says, in English, *why*
this opener was suggested. E.g.:

> "Voice notes get a 47% reply rate from voice-first profiles like Aanya's,
> and you've sent 14 voice notes before with a 51% reply rate. Last voice
> note was 5 days ago."

Render this in the existing Miamo Move drawer — the UX change is one new
line of italicised gray text below the suggestion chip.

---

## 5. Phase 5 — Discover, DTM, and Feed personalisation (the "right person gets right person" loop)

### 5.1 Discover

The Discover stack today is `forYou.score DESC LIMIT 100` with diversity
buckets. v6 changes:

1. The score is `scoreForYouV6` (above).
2. **Per-session adaptation**: as Priya swipes, the stack re-ranks every 5
   swipes using `postImpressionRerankV6` (which already reads dwell + bio
   expand + settle + repeat-pass). The current implementation only changes
   the *next* batch. v6 changes the *current* batch when ≥ 5 cards remain.
3. **Window-shopping defence**: if `SessionSummary.windowShopping` is true
   for the last 3 sessions, demote `forYou.score` by 0.85× (this user is
   bored — give them harder-to-find, more novel candidates from `aiPicks`
   instead). Implement as a top-level `discoverPolicy` function in
   `services/shared/src/algo/discoverPolicy.ts`, flag
   `ALGO_V6_DISCOVER_POLICY_ENABLED`.
4. **Zero-action recovery**: if `SessionSummary.zeroActionSession` true for
   the last 2 sessions, show a *different* candidate set entirely — pull
   from a "novelty pool" (candidates with high `aiPicks.exploreNoise` who
   the user has never seen). Track outcome.

### 5.2 DTM (Deep Topic Matching)

DTM today is a static set of questions in `services/content/`. v6 makes the
**question order** personal:

1. Read `routeAffinity('dtm')` — if high (> 0.3), ask harder, longer-form
   questions (Priya wants to engage deeply with DTM).
2. Read `dtm.partial_abandon` rate — if > 0.5, start with the 3 questions
   that have the highest reply-to-finish correlation (so Priya completes
   the survey).
3. Read `behaviouralTwinIndex` distribution for `me` against the candidate
   pool — ask the questions whose answers are **most discriminating** for
   *Priya's* compatibility (i.e. questions where her cohort splits 50/50
   instead of 90/10).

Implement as `dtmQuestionOrderV6` in `services/shared/src/algo/dtm.ts`.
Flag: `ALGO_V6_DTM_ORDER_ENABLED`. The static order remains as fallback.

### 5.3 Feed (notifications, matches inbox, recent activity)

`feedAugment v6` re-ranks per `focusAffinityByKind`. Concretely:

- A user with `focusAffinityByKind.notif > 0.4` gets notifications surfaced
  first.
- A user with `focusAffinityByKind.chat > 0.5` gets recent threads first.
- A user with `focusAffinityByKind.card > 0.6` gets "new matches near you"
  panel first.

---

## 6. Phase 6 — Whole-page UI/UX audit (every page, every state)

Walk every Next.js page in `services/web/src/app/` and produce a written
audit in `docs/FRONTEND_AUDIT_V2.md` for each one. Use this template per
page:

```
## /<route>

**Purpose:** one sentence.
**Components mounted:** list of top-level components.
**States covered:** loading / empty / error / loaded / pagination / offline.
**Accessibility:** aria-* labels present? keyboard nav works? screen-reader passes?
**Perf:** LCP target, bundle weight, image strategy (next/image?), any blocking JS?
**Tracking:** which events fire on entry / exit / interaction? Any missing?
**Mobile:** does it work at 360×640? Any horizontal scroll? Tap targets ≥ 44px?
**Bugs found:**
**Fixes shipped in this PR:**
**Out-of-scope follow-ups:**
```

Then **fix every "Bugs found"** that you can in one screen of code per page.
Anything bigger goes in "follow-ups". Tracked on every page:

- `nav.route { from, to, mode: 'push' }` on entry
- `nav.route { from, to, mode: 'back' }` on exit
- All button clicks → `click { route, elementId }`
- All form submits → `form.submit { route, formId, durationMs }`
- All form errors → `form.error { route, formId, fieldErrors }`

### 6.1 Specific UI/UX improvements expected (non-exhaustive)

- **Discover card** — bio expand interaction should fire `card.bio.expand`
  on tap of "more" link, currently fires only on full-card tap (verify).
- **Chat composer** — show typing indicator with `msg.compose_typing` debounced;
  show "saved as draft" indicator when user leaves with text in the box.
- **Notification list** — add "mark all read" button (today there is no such
  action — verify and add if missing).
- **Filter sheet** — show a "you've applied 3 filters" pill with reset; track
  `filter.hesitation` on chip hover.
- **DTM survey** — show progress bar; pre-load next question.
- **Empty states** — every list view (matches, notifs, beats, moves) must
  have a designed empty state, not "nothing here". Each empty state has a
  primary CTA that links to a populated route.
- **Error states** — every fetch failure shows a "retry" button and fires
  `error.fetch { route, endpoint, status }`.
- **Offline** — show a top banner when `navigator.onLine === false`; queue
  outbound tracks (existing `queue.ts`) and flush on reconnect.
- **Dark mode** — all pages must work in dark mode without `prefers-color-scheme`
  hacks; use semantic tokens from the design system.
- **Reduced motion** — honour `prefers-reduced-motion` for the swipe animation.

---

## 7. Phase 7 — Backend audit (every service, every endpoint)

For each of the 11 services, produce a written audit in
`docs/BACKEND_AUDIT_V2.md`:

```
## services/<name>

**Owns Prisma models:** list
**Owns Redis keys:** list
**HTTP endpoints:** [method, path, auth required, rate-limited?, validated input?, audit-logged?]
**Background workers:** [name, schedule, idempotent?, observable?]
**Outbound calls:** [which other services, retried?, circuit-breaker?]
**Bugs found / fixes shipped / follow-ups:**
```

### 7.1 Hard rules to enforce (and fix where violated)

- Every HTTP endpoint that mutates state must:
  - Be auth-gated (no anonymous mutations).
  - Validate input with Zod (no `req.body as any`).
  - Be rate-limited at the gateway (token bucket per `userIdHash`).
  - Emit an audit log entry via `services/shared/src/audit.ts`.
- Every background worker must be idempotent on its input key and observable
  (must export Prometheus counters for `ticks_total`, `events_processed_total`,
  `errors_total`, `lag_seconds`).
- Every outbound service-to-service call must be retried with exponential
  backoff (use existing `services/shared/src/http.ts` helper; add if missing).
- No service may write to a Prisma model owned by another service. If found,
  refactor to the owning service exposing a typed RPC.
- Every Redis key must have a documented TTL. Keys with no TTL are a leak.

### 7.2 Per-service v6 expectations

- `tracking-worker` — adds `SessionSummary` writer + `UserArchetype` daily job.
- `social` — `forYou` endpoint reads v6 flag and dispatches; `discoverPolicy`
  applied here.
- `messaging` — first-move detection logic moves here; emits `msg.first_move`
  enriched event (kind, latencyMs).
- `notifications` — reads `idleRateLast24h` for v6 notify timing.
- `content` — DTM endpoint reads v6 order.
- `users` — `UserMoveProfile` writer (or `tracking-worker`, decide and document).

---

## 8. Phase 8 — Database, indexes, and Prisma audit

Open `services/shared/prisma/schema.prisma`. For every model, write down in
`docs/DB_AUDIT_V2.md`:

1. The expected row count at 1M users (back-of-envelope).
2. Every query that touches it (grep the codebase).
3. Whether each query has a covering index.
4. Whether the model has `@@index([...])` matching the query.

Then **add the missing indexes** and **remove any unused indexes** (Postgres
`pg_stat_user_indexes.idx_scan = 0` indicates unused — query `db.ts` for
a helper that detects these).

### 8.1 New indexes you will almost certainly need

- `SessionSummary @@index([userIdHash, startedAt(sort: Desc)])`
- `UserMoveProfile @@index([updatedAt])`  // for daily archetype rebuild
- `EventAggDaily` — add a partial index `WHERE rate > 0.1` on
  regret/repeat/return rate columns if they aren't there.
- `PairCompatCache @@index([userAHash, score(sort: Desc)])` if not already.

### 8.2 Migrations

- All schema changes are forward-only migrations (`prisma migrate dev`).
- No `prisma migrate reset` ever — it is a footgun in this repo.
- Never delete a column without a deprecation window of at least 2 releases.
- All new columns are nullable OR have a default.

### 8.3 Vacuuming and bloat

- Document in `docs/RUNBOOK.md` how to check bloat (`pg_stat_user_tables.n_dead_tup`)
  and when to `VACUUM ANALYZE` manually.
- Set up `autovacuum_vacuum_scale_factor = 0.05` on the hot tables
  (`EventAggHourly`, `FeatureSnapshot`, `SessionSummary`) in
  `configuration/postgres/postgresql.conf`.

---

## 9. Phase 9 — Redis audit

For every key prefix in use (grep `services/**/*.ts` for `redis.set`,
`redis.xadd`, etc.), document in `docs/REDIS_AUDIT_V2.md`:

| Prefix | Type | TTL | Writer | Readers | Approx daily ops | Notes |
|---|---|---|---|---|---|---|

### 9.1 Hard rules

- No key without a TTL except `events:raw` (the Stream) and
  `cf:neighbours:<userIdHash>` (refreshed by the cf-neighbours worker).
- `events:raw` must be `XADD MAXLEN ~ 10000000` (cap at 10M entries) to
  prevent unbounded growth. Verify in `services/ingest/src/server.ts`.
- Every consumer group must claim PEL entries older than 10 min via
  `XAUTOCLAIM` to recover from crashed workers.
- Every Redis client must have `enableOfflineQueue: false` in production
  (we'd rather fail fast than queue commands during an outage).

### 9.2 New keys v6 will add

- `archetype:user:<userIdHash>` — TTL 7d, written by archetype daily job.
- `archetype:centroids` — TTL 7d, written by daily job, read by inference.
- `moveprofile:fast:<userIdHash>` — TTL 1h, hot cache of `UserMoveProfile`.

---

## 10. Phase 10 — DevOps, Kubernetes, observability

For each k8s template in `k8s/templates/`, audit and fix in
`docs/DEVOPS_AUDIT_V2.md`:

1. Every Deployment has resource `requests` AND `limits` set; CPU limit at
   ≥ 2× request, memory limit at 1.5× request.
2. Every Deployment has `readinessProbe` AND `livenessProbe` with sane
   thresholds (initialDelay 10s, period 10s, failure 3).
3. Every Deployment has a `PodDisruptionBudget` with `minAvailable: 1`.
4. Every Deployment has an HPA with CPU target 60% (not the default 80%) so
   we scale before saturation.
5. Every Deployment has a `NetworkPolicy` denying ingress by default and
   explicitly allowing only the upstreams that need it.
6. Every Service of type ClusterIP has the correct `targetPort` and
   `appProtocol: http` so the service mesh routes correctly.
7. The Postgres StatefulSet has anti-affinity preventing two replicas on the
   same node.
8. The Redis StatefulSet has a backup CronJob (RDB snapshot to S3) — add if
   missing.

### 10.1 Observability additions

- Add Prometheus `ServiceMonitor` for `tracking-worker` exposing
  `events_processed_total`, `events_dropped_total`, `lag_seconds`,
  `session_summaries_written_total`.
- Add Grafana dashboard JSON under `k8s/grafana/dashboards/tracking.json`.
- Add alert rules under `k8s/prometheus/alerts/`:
  - `TrackingWorkerLagHigh` — lag > 5 min for 10 min
  - `EventStreamBacklog` — `XLEN events:raw > 1_000_000`
  - `SessionSummaryWriteStalled` — no writes for 5 min
  - `PairCompatCacheHitRateLow` — < 70% over 1 hour
  - `MutualQualityInteractionDropped` — daily rate dropped > 15% vs 7d avg
    (the north-star metric — page humans on this one).

---

## 11. Phase 11 — Tests (count must strictly increase)

Current count: **314** (`npx vitest run`).

Target: **≥ 425** (+ at least 111 new tests). Cover:

- Every new event family (round-trip: web collector → ingest validate →
  worker rollup → SignalReader).
- Every new SignalReader method (happy path + null path).
- `SessionSummary` writer (idempotent on sessionId, all four derived flags,
  edge cases like 0-duration session).
- `behaviouralTwinIndex` (symmetric, monotonic, clipping).
- `reciprocalIntentScore` (smoothing prior, monotonicity).
- `communicationCadenceFit` (JSD properties, two-identical-histograms = 1.0).
- `moveStyleCompat` (priors, null inputs).
- `scoreForYouV6` (golden Priya × Arjun example, dispatcher chain, regression
  against v5 when v6 flag off, attentionFit unchanged from v5).
- Every v6 algorithm dispatcher (chain v6 → v5 → v4, equality contract for
  the reserved algos).
- `UserMoveProfile` writer (first-move detection, reply detection within 30s
  of `msg.read`).
- KMeans archetype clusterer (seeded centroids → deterministic ids).
- `discoverPolicy` (window-shopping demote, zero-action recovery).
- `dtmQuestionOrderV6` (returns distinct question lists for distinct users).
- Every new HTTP endpoint (input validation, auth, rate-limit headers,
  audit log entry).
- Every UI bug fix shipped in §6 (component test if React, Playwright if
  end-to-end interaction).

Every test must have a name that reads as a sentence: `it('returns null
when user has no session history')` not `it('test1')`.

---

## 12. Phase 12 — Documentation update

Every doc under `docs/` is updated. Specifically:

- `docs/ARCHITECTURE.md` — new diagram showing total-state pipeline
  (events → rollup → SessionSummary → SignalReader → algo v6).
- `docs/TRACKING.md` — append v5 event catalogue (the §2.2 additions).
- `docs/ALGORITHMS.md` — v6 fleet table, v6 worked example, v6 rollback drill.
- `docs/FRONTEND_AUDIT_V2.md` — new file (from §6).
- `docs/BACKEND_AUDIT_V2.md` — new file (from §7).
- `docs/DB_AUDIT_V2.md` — new file (from §8).
- `docs/REDIS_AUDIT_V2.md` — new file (from §9).
- `docs/DEVOPS_AUDIT_V2.md` — new file (from §10).
- `docs/RUNBOOK.md` — append §11 with new alerts and SOPs.
- `docs/SECURITY.md` — append HMAC rotation procedure (currently missing).
- Every `services/<name>/README.md` — refresh "what this service owns".

Voice: v3 accessibility (Meera / Priya / Arjun audience tiers). No jargon
without a parenthetical definition. No "obviously" or "simply" — what is
obvious to you is not obvious to Meera.

---

## 13. Phase 13 — Cleanup pass

1. `ts-prune` to find unused exports — delete or document as public API.
2. Search for `console.log` / `console.error` — replace with structured
   logger (`services/shared/src/logger.ts`).
3. Search for `any` — replace with proper types where possible; document
   the remaining ones.
4. Search for `TODO` older than 6 months — either fix or delete.
5. Search for empty `catch` blocks — every catch must either log or rethrow.
6. Run `npm prune` in each service.
7. `docker compose build --no-cache` — every image must build clean.
8. Run `kubectl --dry-run=server apply -f k8s/templates/` on a kind cluster.

### 13.1 What you must not delete

- Prisma migrations (forward-only history).
- Public API routes (anything under `services/gateway/`).
- Existing event names (we have analytics dashboards reading from them).
- Existing flag names (services in prod read these).
- `archive/` scripts (kept intentionally).

---

## 14. Phase 14 — Conventional Commits, PR, rollback plan

### 14.1 Branch

```
git checkout -b feat/total-state-v6 main
```

### 14.2 Commit shape

Use Conventional Commits, one logical change per commit. Suggested
sequence (you will likely add more):

```
chore(inventory): phase-1 v2 inventory
feat(tracking): total-state event families (idle/nav/focus/dwell)
feat(worker): SessionSummary writer + UserArchetype daily job
feat(signals): SignalReader v6 methods (idle/zero-action/route-affinity/move-profile)
feat(algo): scoreForYouV6 behind flag
feat(algo): aiPicks/active/cf/notifyTiming/messageSuggest/postImpressionRerank v6 behind flags
feat(algo): every other algorithm v6 dispatcher
feat(moves): Miamo Move v3 with UserMoveProfile + archetypes
feat(discover): discoverPolicy (window-shopping defence + zero-action recovery)
feat(dtm): dtmQuestionOrderV6 (personalised question order)
feat(web): all-pages UI/UX fixes (per §6 bug list)
feat(backend): endpoint hardening (auth/Zod/rate-limit/audit per §7)
feat(db): SessionSummary + UserMoveProfile + UserArchetype migrations + indexes
feat(devops): HPA/PDB/NetworkPolicy/ServiceMonitor additions per §10
test: 111+ new tests covering all of the above
docs: TRACKING/ALGORITHMS/FRONTEND/BACKEND/DB/REDIS/DEVOPS audits + RUNBOOK
chore: cleanup pass (ts-prune, console.log→logger, dead TODOs)
```

### 14.3 PR

Open one PR (`feat/total-state-v6` → `main`) titled
**"feat: total-state tracking v5 + compatibility v6 + whole-app audit"**.

Body must include:

- North-star metric restated
- Phase-by-phase summary (1 paragraph each)
- Privacy review (the same level of detail as PR #6)
- Rollback plan (per-feature; every new flag listed with kill command)
- DoD checklist (all 14 phases, every one ticked)
- Test count delta (314 → ≥ 425)
- Screenshots for every UI change (use Playwright screenshot in CI)

### 14.4 Merge policy

- Wait for CI green. The existing CI matrix (TypeScript per-service) has
  pre-existing failures unrelated to your work; **fix those too** as part
  of this PR (do not paper over them).
- Merge with `gh pr merge --merge --delete-branch` (preserve history;
  v6 will be referenced by name in dashboards and runbooks).
- After merge, watch the mutual-quality-interaction dashboard for 48h.
  If it drops > 5%, roll back every v6 flag immediately.

---

## 15. Definition of Done (no shortcuts)

- [ ] Phase 1 — `docs/PROMPTS/INVENTORY_V2.md` committed.
- [ ] Phase 2 — every total-state event family lives in the catalogue, the
      collector, the validator, the rollup, and the SessionSummary writer.
- [ ] Phase 3 — `scoreForYouV6` + every v6 algorithm dispatcher behind
      individual flags, defaults off, v5 path intact, v4 path intact.
- [ ] Phase 4 — `UserMoveProfile`, `UserArchetype`, `suggestMovesV3` shipped
      with one-line "why this opener" explanations in the UI.
- [ ] Phase 5 — `discoverPolicy`, `dtmQuestionOrderV6`, feed personalisation
      shipped behind flags.
- [ ] Phase 6 — every Next.js page audited in `docs/FRONTEND_AUDIT_V2.md`,
      every "bugs found" fixed or moved to follow-ups with an issue number.
- [ ] Phase 7 — every service audited in `docs/BACKEND_AUDIT_V2.md`, every
      hard rule violation fixed.
- [ ] Phase 8 — every Prisma model audited, every missing index added.
- [ ] Phase 9 — every Redis key prefix documented, every missing TTL added.
- [ ] Phase 10 — every k8s template audited, observability stack additions
      committed.
- [ ] Phase 11 — test count ≥ 425, 100% green on `npx vitest run`.
- [ ] Phase 12 — every doc updated, v3-accessibility voice maintained.
- [ ] Phase 13 — `ts-prune` clean (or documented exceptions), no
      `console.log` outside test files, no empty catches.
- [ ] Phase 14 — branch pushed, PR open, DoD ticked in PR body, CI green,
      mutual-quality-interaction dashboard monitored post-merge.

---

## 16. Anti-patterns — do not do these

- ❌ Do not "stub" or "TODO later" any phase. If you cannot finish a phase
  in this PR, ship the parts you can finish and open a follow-up issue
  with the rest — but every flag must default off and every interface
  must be intact.
- ❌ Do not skip writing tests because "the logic is obvious".
- ❌ Do not use `any` to silence the type-checker. If you don't know the
  type, read the upstream code until you do.
- ❌ Do not add a new event family without claiming it in exactly one of
  `algo.usesEvents` ∪ `OPERATIONAL_EVENTS`. The CI guard will catch you;
  fix it before pushing.
- ❌ Do not change the v4 or v5 code path. v6 is additive only.
- ❌ Do not delete a Prisma migration. Ever.
- ❌ Do not bypass code review on this PR (no `--admin` merge).
- ❌ Do not optimise for swipes, matches, DAU, or session length. The only
  metric that matters is mutual quality interaction.

---

## 17. Anti-shortcuts the user expects you to honour

When the user (the human reading this) says "execute", you do not:

- Ask which phase to start with → start with Phase 1.
- Ask whether to commit → commit per §14.2.
- Ask whether to push → push after each phase passes tests.
- Ask whether to open the PR → open it after Phase 14.

The user has already approved this brief by sending it to you. The only
thing that should pause you is a genuine ambiguity (a model field that
exists in two places with conflicting types, a migration that would lose
data, a UI change that would require designer input). For genuine
ambiguities, raise them as `BLOCKER:` items in `docs/PROMPTS/INVENTORY_V2.md`
and continue with the next phase.

---

## 18. One-line summary for the agent

> Track every state (including idle), score every pair on behaviour not just
> bio, personalise every algorithm to the recipient's archetype, audit every
> page / endpoint / model / key / template, document everything in
> v3-accessibility voice, ship ≥ 111 new tests, default every new flag off,
> open one PR, watch the north-star metric.

**Go.**
