# Miamo — The Product Story

**Audience:** non-technical readers first, engineers second. Pair-write throughout: every section opens with what a user feels, then explains how the system makes it happen.

**Personas:**
- **Priya** — 28, Mumbai, architect at SDA in Lower Parel, trekker, photographer, vegetarian. She is the median user.
- **Arjun** — 29, Bangalore, product designer, photographer, recently back from Sikkim, owns one camera and one bicycle. He is the man Priya will meet.
- **Karan** — 32, Delhi, growth lead at a fintech in Defence Colony, premium subscriber, fatigued by four years on Tinder / Hinge / Bumble. He is the experienced user.
- **Riya** — 26, Bangalore, illustrator at a children's-book studio, casual user, opens the app maybe twice a week. She is the user who replies to Karan after fourteen hours.

**Version:** v3.6.0.

**Cross-links:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the eleven-service topology · [`ALGORITHMS.md`](./ALGORITHMS.md) for every weight and every `// because:` · [`TRACKING.md`](./TRACKING.md) for the ingest-stream-rollup pipeline · [`MIAMO_MOVE.md`](./MIAMO_MOVE.md) for the Move composer deep-dive · [`FRONTEND.md`](./FRONTEND.md) for the Next.js layout · [`SECURITY.md`](./SECURITY.md) for HMAC, AES, JWT, RTBF · [`RUNBOOK.md`](./RUNBOOK.md) for the on-call playbook.

---

## Table of contents

1. Why Miamo exists
2. The surfaces Priya sees
3. What makes Miamo different — six unique-vs-market features
4. A day with Priya — the v3.6.0 features as moments (twelve sub-stories)
5. The deep-compat side — DTM, Family Brief, the matrimonial layer
6. What Miamo refuses to do
7. The roadmap — shipped vs planned
8. A second persona — Karan's week on premium
9. The "what Priya feels" closing moment
10. License

---

## 1. Why Miamo exists

### 1.1 The 9:02pm Tuesday opener

It is 9:02pm on a Tuesday in late October. Priya is in her bedroom in Powai, Mumbai. Outside her window, the high-rise across the road has its lights stuttering off floor by floor as families finish dinner. A train sounds somewhere. The Hiranandani Gardens compound is quiet on weeknights. Priya has trekked to Triund last winter, photographed the same sunrise eighty times, eaten chai-and-Maggi in three states. She is twenty-eight, an architect at SDA in Lower Parel, single, and tired.

She has tried two other dating apps. The first one showed her forty-seven profiles in an hour and matched her with two. One never replied. The other sent "hey wyd 😏" at midnight. She closed it.

The second one let her filter by intent — but the matches still felt random. Some weeks she got marriage-minded engineers in Pune; other weeks, casual-bro photographers in Bandra who never opened the chat. The signal-to-noise was bad.

The week she met a graphic designer named Aman through a friend's house-party in Bandra was the only week she felt seen. They had nothing in common except the time of day they both liked to walk. He turned out, after three weeks, to be someone she did not want to spend more time with. But the texture of the meeting — the unhurried introduction, the friend-of-a-friend reassurance, the absence of a six-second swipe horizon — was a kind of dating she had forgotten existed.

Priya is not an edge case. She is the median.

### 1.2 The market context

There are roughly 150 million single Indians using dating apps.

That number is large enough that the incumbents — Tinder, Bumble, Hinge — have built businesses around it. It is small enough that a single design decision in those apps shapes the social experience of an entire generation. The incumbents make money by keeping Priya swiping; the longer she stays, the more ads they show. Their ranking optimizes for swipe rate, not for relationships. They measure the success of a session in seconds spent, not in conversations begun. They measure their quarter in DAU, not in marriages.

Their feature roadmaps are built on the back of that asymmetry: more photos, more filters, more "boosts," more notifications, more reasons to come back, fewer reasons to leave. Every new feature is benchmarked against the engagement-uplift it produces; relationship outcomes, if measured at all, are measured downstream and not allowed to dominate the dashboard.

Indian single life sits on top of that machinery, and it bends.

Priya's mother, in Pune, has asked Priya seven times this year about "settling down." Priya's two best friends are married. Her cousin's wedding card is on her fridge, the date in November underlined. The pressure on the surface looks unchanged from a decade ago. What has changed is the texture of the search. Where her mother went to family-introductions, Priya goes to her phone. Where her mother's success metric was "a meeting arranged through a trusted aunt," Priya's metric is "a conversation that did not die on day three." The surface of the search has digitized; the incentives of the surface have not changed in her favour.

The dating apps Priya has tried respond to the pressure of a market sized in the hundreds of millions by treating Priya as a unit of inventory. Her photos are ranked against other women's photos by an ELO score she will never see. Her bio is shown to people on the basis of their geo radius and her swipe-right rate. Her chronotype, her vocabulary, her hesitation, her regret, the way her thumb hovers for two seconds over a card before swiping right — all of that data is collected and not used. It is collected because instrumenting is cheap. It is not used because using it would require the company to optimize for a different number than the one their board reviews each quarter.

### 1.3 The mismatch

The mismatch between "engagement" optimization and relationship outcomes is the single fact that produces every other complaint about modern dating apps.

Engagement optimization values the user who returns daily for twenty minutes more than the user who finds a partner in three weeks and deletes the app. Engagement optimization values the user who matches with thirty people and converses with none more than the user who matches with three and meets one. Engagement optimization values the dopamine of a notification more than the slow-built trust of a Sunday-morning curated stack. Engagement optimization, in the limit, prefers Priya unhappy and engaged over Priya happy and gone.

The mismatch is not a moral failing of the incumbents — it is the rational output of their business model. They are public companies. They optimize for the metric their investors track. The metric their investors track is engagement. Engagement is, on the relationship-outcome axis, a noisy proxy at best and an actively misaligned signal at worst.

The mismatch also has a second-order effect that is harder to see.

The longer Priya stays in the swipe loop, the more her own behaviour adapts to the loop. She begins to evaluate profiles in two-second glances. She begins to send openers she does not believe in because the app has trained her that openers are cheap. She begins to forget the texture of patient conversation. The app teaches her the wrong skills for the thing it claims to deliver. She is, after six months on Tinder, worse at dating than she was at the start.

This is not a hypothetical claim. The cohort behaviour is visible in retention curves. The 90-day retention of a "swipe-and-match" cohort on the incumbents is 38% in our reproduced benchmarks. The 90-day retention of a "matched-and-met" cohort is 9%. The math is that users who actually meet partners through the apps leave; users who do not meet partners stay and swipe. The optimization function values the stayers. The product surface evolves to serve the stayers. The system has been, for fifteen years, optimizing against the very outcome it advertises.

### 1.4 The Miamo bet

Miamo exists because that experience is the norm, not the exception.

The bet is straightforward and unfashionable: the 1% of users who form real relationships are worth more to Miamo, both ethically and economically, than the 99% who swipe forever. Worth more ethically because the product is for them. Worth more economically because they tell three friends; because they describe Miamo in language that the incumbents cannot match ("this is the one that worked"); because their cohort retention is structurally different from the swipe-forever cohort (a user who finds a partner stops, but if she finds them through Miamo she becomes the highest-quality acquisition channel the product has).

We measure **what Priya does** — how long she lingers on Arjun's profile, whether she reads his bio in full, whether she replies in chat at 11pm or only at lunch, whether she re-reads his message twice before responding, whether she finishes typing and then deletes — and we use that to rank the next batch. We do not optimize for the number of swipes per session. We do not surface a "boost" button. We do not run a notification at midnight to drive a DAU number. We rank the stack so that the third profile she sees is the one she will actually want to see, not the one that maximises the probability of a right-swipe. The difference, measured over the population, is small in any one session and enormous in the aggregate over a year.

We optimize for **matches that become conversations, conversations that become dates, dates that become relationships.** We measure that. We instrument it. We tune the system against it. Every algorithm in `services/shared/src/algo/` has been written against that target. Every weight has a `// because:` comment explaining how it bends the system in the direction of relationships. Every feature flag is gated so that we can test, observe, and pull back without theatre.

### 1.5 Technical framing of the bet

Every surface in the app fires tracking events to an ingest edge (`services/ingest/`) which writes them to a Redis stream.

A worker (`services/tracking-worker/`) runs 13 background loops that roll those events into Postgres aggregates: hourly counts (`EventAggHourly`), daily counts with target sets (`EventAggDaily`), per-user feature snapshots (`FeatureSnapshot`), and pairwise compatibility caches (`PairCompatCache`).

Each of the 17 ranked algorithms (`services/shared/src/algo/`) reads from these aggregates and produces a score. The top-K are returned to the Discover endpoint. Every user-facing query goes through a gateway (`services/gateway/`) that handles rate-limiting and JWT verification.

The Prisma schema (`services/shared/prisma/schema.prisma`, 67 models, plus 4 new v3.6.0 models) is the source of truth; every other service loads `@prisma/client` from `services/shared/node_modules/`.

The architecture is fundamentally a measurement architecture. The product surface is small. The algorithm surface is medium. The instrumentation surface is large. That ratio — instrumentation > algorithm > UI — is the system that lets a small team optimize for the right number without drowning.

The instrumentation surface includes 49 base tracking events from v3.5 plus 16 new v8 events introduced in v3.6.0. Each event has a Zod schema (`services/shared/src/events.ts`), a payload cap, and a documented set of consumers. Each consumer is a worker loop or an algorithm registry entry. Each registry entry is gated by a feature flag.

The 13 worker loops are:
1. `rollupHourly` — every 5 minutes, aggregate raw events into `EventAggHourly`
2. `rollupDaily` — every hour, aggregate hourly into `EventAggDaily`
3. `featureSnapshot` — every 15 minutes, write per-user feature vectors
4. `pairCompat` — every 30 minutes, refresh pairwise compatibility caches
5. `learnerLoop` — every 10 minutes, ingest `MatchFeedback` and update weights
6. `intentInference` — every 30 seconds (v3.6.0), write real-time intent + mood
7. `exposureScheduler` — every 15 minutes (v3.6.0), accrue exposure credits
8. `stableMatchTop10` — Sunday 00:00 UTC (v3.6.0), Gale-Shapley weekly match
9. `fairnessAudit` — daily, compute gender-conditional Gini
10. `antiGhostSweep` — every 5 minutes (v3.6.0), burn expired deposits
11. `dailyMatchWorker` — daily 8pm local per user, write AI Pick
12. `notifyDispatch` — every minute, drain pending notifications through `notifyTiming`
13. `coldStorage` — hourly, compress aged events to S3-compatible storage

Each of these loops has a documented schedule, a documented input set, a documented output set, and a documented memory ceiling. See `TRACKING.md` for the full table.

See `ARCHITECTURE.md` for the eleven-service topology and `TRACKING.md` for the full pipeline.

---

## 2. The surfaces Priya sees

Miamo presents Priya a small number of surfaces. Each one fires tracked events. Each event becomes a row. Each row becomes a signal. Each signal becomes a knob the algorithms can turn.

### 2.1 The surface table

| Surface | What Priya does | What we measure | What the system feeds back |
|---|---|---|---|
| **Login** | Email + password (or phone OTP) | Nothing yet | Session JWT, 15-minute access + refresh-rotation |
| **Onboarding** | Answers 12 questions: "What are you looking for?" "Your ideal Sunday?" "Most important value in a partner?" | Priya's stated intent, vibe vector, lovelang, chronotype guess | Onboarding completion score (`completion.ts`); cold-start affinity weights for DTM |
| **Discover** | Swipes left/right on a stack of profiles | Dwell per card, bio-expand, photo-swipe, swipe direction + velocity + source, regret, repeat-pass, hesitation p50 | `EventAggHourly/Daily.meta.hist` → V8 ranker reranks the next batch |
| **Why-am-I-seeing-this** _(v3.6.0)_ | Taps the **i** icon on a Discover card | Click-through to explainer + "show me less like this" feedback | Article-22-compliant ingredient stars; negative feedback feeds the learner |
| **Weekly Top-10** _(v3.6.0)_ | Sunday morning tab; reads the named, dated, curated stack | Open + per-slot dwell + like/pass on a Top-10 candidate | `WeeklyTopMatch` row marked viewed; exposure spent from `ExposureCredit` |
| **Matches** | Sees the list of people who liked her back | Whether she opens them, in what order, with what speed | `MatchFeedback` writes; `notifyTiming` uses it for the bell |
| **Chat** | Types and sends messages | Reply latency, charLen, voice-record (re-record count), emoji use, message kind | `UserMoveProfile` is updated; the Move composer reads it |
| **Move v2** _(v3.6.0)_ | Taps ✨ Suggest next to the composer; picks one of five drafts | Suggestion-shown, suggestion-accepted, edit-distance from chosen draft | `move.composed`, `move.suggestion_accepted` events; sender voice updated |
| **Voice Fingerprint** _(v3.6.0)_ | After 50 outbound messages, opens a card that names her writing style | Shown + share-to-Instagram action | Viral hook; engages the composer-tuning loop |
| **Feed / Stories / Videos** | Scrolls posts from people she's interested in (matched + showcase access) | What she stops to read, what she ignores, dwell per post | `postImpressionRerank` demotes posts skipped >2× |
| **DTM (Date-to-Marry)** | Answers a daily depth question; reviews the day's deep match | Per-topic affinity, abandon rate, skip rate, family-brief views | `dtmTopicMask.ts` masks heavy topics late at night; `DtmMessage` cosine match |
| **Family Brief** _(v3.6.0)_ | In DTM, taps 📋, picks Image/PDF/Text, shares to WhatsApp | Generated + viewed counts; token TTL | `FamilyBriefShare` row with `expiresAt`; auto-revoked at expiry |
| **AI Picks** | Gets one "we think you'll click" daily | Open + action | `aiPicks.ts` runs daily via `DailyMatchWorker` |
| **Beats** | Sees overlap with a match's music taste | Whether she plays | Vibe-momentum signal for `aiPicks` |
| **Notifications** | Bell when "Arjun sent a message" | Open + dismissal + dismiss-backoff count | `notifyTiming.ts` picks the next minute Priya is most likely to look |
| **Settings → Personalization & Privacy** _(v3.6.0)_ | Toggles four consents: mood inference, exposure ledger, Move v2, Family Brief share | Each toggle written to `Settings`; consent event logged | Algorithms read the toggle through `withConsent()` and fall back to neutral when off |

### 2.2 What each surface actually is

#### Login

Priya types her email and password into a form that looks like every other form she has ever filled. She does not know that her password is bcrypt-hashed at cost 12, that the JWT she gets back has a 15-minute TTL, that a separate refresh token lets her stay signed in for thirty days, that the gateway will rate-limit a brute-force attempt at six attempts per minute per IP. She does not need to know. The login screen is, for her, two boxes and a button.

Pair-write: the auth service (`services/auth/`) issues the access JWT (`jose.SignJWT`, HS256, 15min), the gateway (`services/gateway/`) validates it on every request, and `errorHandler` is the last middleware on every service to normalise the 4xx/5xx response shape. The OTP path uses Twilio Verify with a per-phone rate cap of five OTPs per hour. The TrustedDevice model tracks devices that have authenticated in the last 30 days; a new device authentication triggers a security email to the user's primary email. Refresh-token rotation invalidates the prior refresh token on each new access-token mint so a stolen refresh token is single-use.

#### Onboarding

Priya answers 12 questions. They look casual ("ideal Sunday? cook together / drinks out / Netflix / hike"). They are not casual.

Each answer maps to a position on a vibe vector (creative / adventurous / thoughtful / etc.) and a chronotype prior (early-riser / night-owl / neutral). The "what are you looking for" question is the single highest-signal piece of data Miamo collects from a new user, because it sets the cold-start intent.

Pair-write: the onboarding completion score (`completion.ts`) feeds the cold-start affinity weight for DTM; users with completion < 0.5 are treated as `empty` coverage stage and DTM does not surface curated matches until they complete more of their profile. The vibe vector is a 7-dim normalized vector (creative, adventurous, thoughtful, social, ambitious, grounded, curious). The chronotype prior is set from a single onboarding question ("when do you naturally feel most alive?") and is overwritten by behavioural data after 7 days of `session.start` events. The 12 questions are stored as `VibeCheck` rows with the question ID and the selected answer.

#### Discover

This is the high-frequency surface.

Priya opens it, sees ten cards, and starts swiping. The act of swiping is, to her, atomic. To the system, it is a sequence: card surface, card impression at 50ms, card impression at 100ms, dwell, optional bio expand, optional photo swipe, optional rewind (regret), optional repeat-pass, swipe commit. Each step is a tracking event with a documented Zod schema.

Pair-write: the Discover endpoint (`GET /api/v1/discover`) calls the V8 ranker (`forYouV8`) which composes 17 V4 ingredients plus 5 V7 modules plus 17 V8 modules into a single score per candidate. The top 10 are returned. The whole call is under 80ms p50. The endpoint reads from `PairCompatCache` for pre-computed pairwise scores (fall-through to live compute on cache miss, with a stale-while-revalidate pattern that returns the stale row and queues a refresh job).

#### Why-am-I-seeing-this

v3.6.0 surface.

The small **i** icon in the corner of every Discover card. Tap it and a popover slides up with up to three ingredient stars sorted by contribution.

Pair-write: the endpoint (`GET /api/v1/discover/:targetId/why`) reads `PairCompatCache.v6Score.breakdown` and explains the ranking in user-readable terms. This is Miamo's GDPR Article 22 human-review path: the user can always ask why, and the answer is grounded in the actual cached score, not a confabulation. The "show me less like this" link writes a `MatchFeedback` row that the learner consumes on its next tick. Rate-limited at 30 requests per minute per user.

#### Weekly Top-10

v3.6.0 surface.

A tab that appears Sunday morning and disappears Saturday night, with a countdown to the next batch. It is named ("week of October 26–November 1"), dated, and bounded — ten cards, no more.

Pair-write: the worker `stableMatchTop10.ts` runs Sunday 00:00 UTC, runs Gale-Shapley deferred-acceptance over eligible users, and writes `WeeklyTopMatch` rows. The act of viewing a slot debits one `ExposureCredit` from Priya's ledger. The tab UI reads the latest 10 `WeeklyTopMatch` rows for the current week (sorted by rank ascending) and renders them as a vertical card list with a countdown to the next Sunday 00:00 UTC.

#### Matches

Priya sees the list of people who liked her back.

The order is recency-with-rerank: the most recent matches at the top, with a small rerank to surface matches where reciprocal interest is highest (her `forYouV8` score over them × their inferred score over her).

Pair-write: the interaction signal is whether she opens a match and how fast. The matches list is populated by the `Match` Prisma model joined with `MatchFeedback` rows for personalisation cues. Opening a match writes a `match.opened` event that the `notifyTiming` learner uses to refine its open-window vector.

#### Chat

End-to-end encrypted (AES-256-GCM, per-message key, see `SECURITY.md`).

Priya types, sends, waits for a reply, replies. The system observes only the metadata: reply latency, message length, kind (text / voice / image), whether she re-recorded a voice note, whether she used an emoji. The actual content is unreadable to Miamo's DBAs.

Pair-write: the `UserMoveProfile` model accumulates the metadata into a sender-voice vector that the Move composer reads. The voice vector is a 12-feature array (lowercase-i ratio, em-dash count, average sentence length, emoji density, top-3 emojis, code-mix ratio, question rate, exclaim rate, tricolon rate, lowercase-only rate, sentence-final-period rate, ellipsis rate). The vector is updated on every outbound message via a streaming-update formula (no full re-extraction needed).

#### Move v2

v3.6.0 surface.

The ✨ Suggest button next to the chat composer. Tap it and a bottom-sheet slides up with five drafts written in Priya's voice, referencing Arjun's recent posts and hooks from the 8-category library.

Pair-write: the five-stage composer pipeline runs in under 150ms. The full deep-dive lives in `MIAMO_MOVE.md`. The five drafts are returned with hook-category labels in metadata (not shown to Priya) so the learner can correlate hook-category with acceptance rate. The linter has 26 new forbidden phrases in v3.6 and three AI-signature heuristics.

#### Voice Fingerprint

v3.6.0 surface.

After 50 outbound messages, a card appears: "Your voice fingerprint is ready." Priya taps. A 1080×1920 canvas-rendered image names her archetype (wordsmith / voice-first / visual / fast-replier), her top emoji, her em-dash usage, her lowercase-i ratio. A share-to-Instagram intent at the bottom. The viral hook for the product.

Pair-write: `GET /api/v1/users/me/voice-fingerprint` returns the archetype + top features. The web component `VoiceFingerprint.tsx` renders to canvas and offers an Instagram Story intent + an `image/png` fallback. Emits `voice_fingerprint.shown` and `voice_fingerprint.shared` events.

#### Feed / Stories / Videos

Posts from matched users and showcase-access users.

Priya scrolls. The `postImpressionRerank` algorithm demotes posts she has skipped twice, because the absence of a stop is a stronger signal than the presence of one.

Pair-write: the Feed endpoint reads `FeedPost` rows from matched + showcase-access users, ranks via `feedAugment` (recency × engagement × surface-affinity), and applies `postImpressionRerank` to demote posts skipped more than twice in the user's last 100 impressions. Stories use a separate model (`Story`) with 24h expiry and view tracking via `StoryView`.

#### DTM

The deep-compat tab.

One question a day, slower, deeper. The full topology lives in §5 of this doc.

Pair-write: DTM is gated by a `Settings.dtmEnabled` toggle, default OFF. Users who want the depth tab must explicitly opt in. Once opted in, DTM runs on its own algorithm family (`algo/dtm.ts`, `algo/dtmV6.ts`) with a 16-topic affinity vector and a cold-start gating mechanism.

#### Family Brief

v3.6.0 surface.

In DTM, on a curated match's profile, a 📋 button. Tap it, pick PDF / Image / Text, share to WhatsApp. A `FamilyBriefShare` row with a 7-day TTL and a base64url token. The mother receives a bio-data card without leaving WhatsApp.

Pair-write: `POST /api/v1/dtm/family-brief/generate` returns the token URL. The public endpoint `GET /api/v1/dtm/family-brief/:token` is unauthenticated, rate-limited, and rejects after expiry with 410 Gone. Image format rendered via Puppeteer at 1080×1350 and cached for 24h.

#### AI Picks

The single "we think you'll click" match of the day, surfaced at 9am Priya-local.

Pair-write: read by `aiPicks.ts`, fed by `DailyMatchWorker`. Distinct from Weekly Top-10 in that it is daily, not weekly, and it is one match, not ten. The Daily Match Worker runs at a per-user-local 8am and writes the AI Pick to a `DailyMatch` row; the surface reads the row at first user-visit-of-day.

#### Beats

Music-taste overlap between Priya and a match.

Spotify-style. When they have ≥5 songs in common, a Beats card appears in the chat. It is a soft conversation starter, not a ranking signal.

Pair-write: Beats data lives in the `Beat` and `BeatEvent` models. The overlap is computed on-demand for each open chat. Beats is also a `beats.ts` algorithm in the registry (#12) but the ranker weight is low because shared music taste is a noisy selection signal for the demographic. Beats is primarily a conversation-starter UX, not a ranking primitive.

#### Notifications

The bell.

`notifyTiming.ts` picks the minute Priya is most likely to open the app, based on her last 28 days of `session.start` events. If she has dismissed three consecutive notifications, the system defers the next one to 09:00 UTC the following day (the dismiss back-off).

Pair-write: daily cap: 4. The dispatch worker (`notifyDispatch.ts`) runs every minute, scans pending notifications, calls `notifyTiming.ts#pickNextWindow` for each, and either delivers or queues. The open-likelihood vector for each hour is recomputed daily.

#### Settings → Personalization & Privacy

v3.6.0 surface.

Four toggles: (a) mood inference on/off, (b) exposure ledger participation on/off, (c) Move v2 suggestions on/off, (d) Family Brief generation on/off.

Pair-write: each toggle writes to the `Settings` table and emits a `ConsentEvent` row. Algorithms read the toggle through a `withConsent()` helper and, when off, fall back to the v3.5 neutral behaviour. The Settings panel is the only surface where these toggles appear; they are not buried, not behind multi-step flows, not preset to ON without disclosure at onboarding.

### 2.3 The instrumentation philosophy

Every surface emits tracked events. Every event becomes a row, every row a signal, every signal a knob the algorithms can turn. The whole thing is engineered so that **Priya never sees that she is being watched.** The app just gets quietly better.

The instrumentation is dense but the surface is calm. This is not a contradiction. A car's engine is dense; the driver sees a steering wheel and three pedals. The complexity is on the inside.

The contract for instrumentation is:
- Every event has a Zod schema (`services/shared/src/events.ts`).
- Every event has a documented set of consumers (workers and algorithms).
- Every event has a payload cap (32 KB per envelope, 50 events per batch).
- Every event is HMAC-hashed at the user level before storage.
- Every event has a TTL in the raw stream (24 hours; aged events compress to cold storage).

The contract for the rolling aggregates is:
- Every row is keyed by a user-hash (HMAC-SHA256 to 22 base64url chars), never raw `userId`.
- Every row is bucketed (hourly, daily, weekly) and has a documented retention period.
- Every row is read by at least one algorithm registry entry; orphan tables are removed.
- Every row is consent-gated; the `withConsent()` helper checks the user's settings before reading the row into an algorithm.

The contract for the algorithms is:
- Every algorithm is gated by an environment-variable feature flag.
- Every algorithm has a `// because:` comment on each weight in source.
- Every algorithm produces an explainable breakdown that the `why` endpoint can surface.
- Every algorithm has a unit test asserting determinism (given the same input, the same output).

This is the architecture. The Priya-feels paragraph above is the user experience. The two are linked by a measurement loop that is invisible to her by design.

---

## 3. What makes Miamo different — the six unique-vs-market features

This is the battlecard. Read the "How it works" column only if you write code.

### 3.1 The summary table

| Feature | Tinder / Bumble / Hinge today | Miamo v3.6.0 | How it works |
|---|---|---|---|
| **Behavioural ranking** | Photo-first ELO with stated preferences | The 17 V4 ranker + the V8 multi-objective layer reads dwell, bio-read, reply speed, regret, return-rate, repeat-pass, hesitation | `services/shared/src/algo/forYou.ts` + `forYouV8.ts` |
| **Real-time intent + mood** | None | Seven-class intent vector (casual_scroll / distraction_browse / intentional_browse / reply_mood / review_existing / serious_search / decision_fatigued) + five-dim mood vector (rage / calm / curious / receptive / fatigued), 90-second TTL | `algo/v8/intentRightNow.ts`, `algo/v8/moodRightNow.ts`; worker `tracking-worker/src/intentInference.ts` |
| **Earned visibility** | Pay-to-promote ("boost") | An `ExposureLedger` accrues credits from positive engagement; weekly Gale-Shapley pass writes a curated Top-10; Singh-Joachims rerank corrects for gender-conditional Gini ≤0.40 | `algo/v8/exposureCredits.ts`, `algo/v8/galeShapley.ts`, `algo/v8/fairnessRerank.ts`; worker `stableMatchTop10.ts` |
| **Voice-aware Move composer** | Generic LLM openers | Sender voice vector (12 features extracted from K=50 outbound msgs) × receiver resonance (last-10 successful replies) × hook library (8 categories) × code-mix (4 lang families: en, Hinglish, Tanglish, Banglish) × linter (26 new forbidden phrases) → five drafts | `algo/v8/moveV2/{senderVoice,receiverResonance,hookLibrary,codeMix,composer}.ts` |
| **Family Brief** | Generic profile shares | One-tap Indian bio-data card (PDF or 1080×1920 Image or Text); shareable via WhatsApp with TTL token | `algo/v8/familyBrief.ts`; endpoint `POST /api/v1/dtm/family-brief/generate` |
| **Anti-ghost** | None | Sender deposits 1 Spotlight minute on a new chat; recipient replies in 72h → deposit returned + bonus minute; doesn't reply → deposit burns | `algo/v8/antiGhost.ts`, hooks into `messaging/server.ts` |

### 3.2 Behavioural ranking

**What Priya feels.**

Priya does not know that the order of her Discover stack tonight is different from the order it would have been at 11am. She just knows that the third profile she sees tonight is interesting enough that she expands the bio, and the second profile she saw this morning was not. The app, to her, has good days and bad days. Good days are the days the stack feels right. Bad days are the days she swipes left on all ten and closes the app. She does not see the input data behind the order. She just feels the order.

**What Tinder / Bumble / Hinge do.**

They run an ELO score on every profile, primarily seeded by the first-glance right-swipe rate on the user's main photo, with a smaller weight for shared interests and a geo radius cutoff.

The ELO is one-dimensional. It moves only when someone swipes. It does not move when someone lingers but does not swipe. It does not move when someone reads the bio in full. It does not move when someone re-reads a profile a day later. The data exists; the system does not use it. This is the design choice that produces the entire category's complaints.

**What Miamo does.**

The V4 ranker reads seventeen signals, not one.

The V6 layer composes them with explicit weights. The V8 layer adds a multi-objective re-rank that balances relevance × earned-visibility × fairness × recency-freshness × intent-fit.

The result is a stack that adapts not just to Priya's swipe rate but to her dwell, her bio-reads, her reply speed, her regret, her repeat-pass, her hesitation. The math is in `ALGORITHMS.md`. The point is that the signal space is dense and the weights are explicit. Every weight has a `// because:` comment in source explaining how it bends the system. Every weight is exposed as an environment variable so we can tune at runtime.

The ranker also has a fairness floor. The Singh-Joachims rerank (`algo/v8/fairnessRerank.ts`) does up to 12 adjacent swaps per ranking pass to keep the gender-conditional Gini coefficient ≤ 0.40. The floor exists because behavioural ranking, naively applied, amplifies the high-engagement minority; without a correction, the top 5% of male users would receive 60% of the impressions. With the correction, the top 5% receive ~25%, which is the Gini we have measured to be sustainable in our beta cohort.

The seventeen V4 signals, in summary form:
1. Interests overlap
2. Vibe match
3. Behavioural similarity (chat-reply latency, message length)
4. Chronotype match
5. Verification trust
6. Distance
7. Age difference
8. Activity recency
9. Collaborative-filter signal ("people who liked you also liked...")
10. Serious-intent score
11. AI Match symmetric prediction
12. Beats overlap (low weight)
13. Notify-timing chronotype prior
14. Search augment (when Priya searches, results re-rank by compatibility)
15. Feed augment (Priya's feed engagement informs ranker)
16. Post-impression rerank (skipped posts demote candidate)
17. Registry / new-joiner boost

The V6 layer adds learner-driven weight refinement: each weight has a base value and a learner-delta in `[-0.02, +0.02]`. The learner-delta is updated daily by the `learnerLoop.ts` worker reading `MatchFeedback` rows.

The V8 layer adds:
- `intentRightNowFit` (0.06 weight) — softmax over Priya's current 7-class intent vector
- `moodRightNowFit` (0.04 weight) — fit to Priya's 5-dim mood vector
- `polarityDamper` — multiplicative on `noveltyFit`, in `[0.3, 1.0]`
- `depthOfEngagementBoost` — multiplicative on the composite, in `[0.95, 1.05]`
- `exposureCreditBoost` — additive on the composite, capped at +0.04
- `fairnessRerank` — post-composition Singh-Joachims pass

The total weight sums to 1.000 after composition. The composer pattern in `services/shared/src/algo/math.ts` is the canonical pattern; every algorithm follows it.

### 3.3 Real-time intent + mood

**What Priya feels.**

It is 11:47pm on a Wednesday. Priya is in bed, scrolling Discover one more time. She doesn't notice it, but the next batch is calmer. Closer geo. Lower novelty. The Move composer next to her chat input, if she taps Suggest, returns shorter and softer drafts. The DTM tab, if she opens it, skips the heavy questions (intimacy, conflict, finance) and offers a "tomorrow morning?" deferred-answer button. She does not see the shift. She just feels that the app is calmer. She closes it at 11:52pm and falls asleep.

**What the incumbents do.**

Nothing.

The notion that a user's session has a real-time emotional state, or that their right-now-intent is different from their stated-intent in their profile, is not a primitive in any incumbent's ranker. Tinder's ranker treats Priya at 11:47pm as identical to Priya at 11:00am, modulo whatever cohort-level diurnal smoothing they have applied to their CTR model. The user as a moment-in-time is invisible. The user is a static feature vector.

**What Miamo does.**

Every 30 seconds while Priya is active, the `intentInference.ts` worker reads her last 30 events from the rollup, runs `algo/v8/intentRightNow.ts` (a 7-class log-linear softmax), and writes `FeatureSnapshot.raw.intentRightNow = {intentVec, computedAt, ttlMs: 90000, algoVersion: 'v8.0'}`.

The seven classes are:
1. `casual_scroll` — quick swipes, low dwell, no bio expands
2. `distraction_browse` — irregular swipe pattern, occasional dwell, no commits
3. `intentional_browse` — slow swipes, high dwell, bio expands, careful commits
4. `reply_mood` — chat-focused session, low Discover activity
5. `review_existing` — opens matches list, re-reads past chats
6. `serious_search` — DTM-focused, deep bios, high commit rate
7. `decision_fatigued` — late-session, rejecting everything, no commits

The same worker, on the same tick, also runs `algo/v8/moodRightNow.ts` and writes a 5-dimensional mood vector: `{rage, calm, curious, receptive, fatigued}`. Both are stored with a 90-second TTL; they are never persisted past TTL because that is the privacy contract.

The Discover ranker reads the intent vector and adjusts the `intentRightNowFit` ingredient with a 0.06 weight. The DTM topic mask (`algo/v8/dtmTopicMask.ts`) reads the mood vector and, when `fatigued ≥ 0.5` and `localHour ≥ 23`, emits a skip set: `['intimacy', 'conflict', 'finance']`. The Move composer hook library (`algo/v8/moveV2/hookLibrary.ts`) downranks `playful` and `tricolon` templates when fatigued is high. The whole loop is gated by the `mood inference` consent toggle in Settings; with the toggle off, the worker still runs (so the system can compute aggregates) but `withConsent()` returns the v3.5 neutral behaviour to the user.

The classifier is a log-linear softmax with hand-engineered features (swipe velocity, dwell mean, bio-expand rate, photo-swipe rate, recent right-swipe rate). It is not a neural network. It is interpretable. The weights are in source. The output is explainable.

### 3.4 Earned visibility

**What Priya feels.**

Priya has been on Miamo for six weeks. Her bio is full. Her photos are good. She replies to her matches within a day. She has slow, careful read patterns — she expands bios, she looks at all the photos, she sometimes returns to a profile the next morning to look again. She is, in the system's vocabulary, a high-engagement user.

The system does not surface this to her. What she notices, instead, is that her Sunday-morning Weekly Top-10 tab consistently has good matches; that her own profile appears in other people's Sunday tabs more often than her cousin's, who joined the same week but is on the app twice a year; and that her notifications have started arriving at the times she is actually likely to open them.

**What the incumbents do.**

Pay-to-promote.

A boost on Tinder costs Priya money and surfaces her profile to more people for thirty minutes. The pay-to-promote mechanic creates a structural advantage for users who can afford to pay over users who cannot. It does nothing to reward Priya for being a thoughtful user; it rewards her for being a paying user. The two are not the same.

**What Miamo does.**

The `ExposureLedger` (a Prisma model new in v3.6.0) accrues credits to Priya whenever she does something that signals high engagement: a bio-read, a thoughtful slow swipe right, a reply within 24 hours, a Move-composer-accepted suggestion. The credits go into `ExposureCredit` rows tagged by source.

Every Sunday at 00:00 UTC the worker `stableMatchTop10.ts` runs an eligibility filter (opted-in, ≥7 days active, ≥30 exposure credits earned), builds two preference lists (Priya's preferences over her eligible candidates, and the symmetric one for each candidate), and runs classical Gale-Shapley deferred-acceptance. The output is up to 10 `WeeklyTopMatch` rows. The act of viewing a slot debits one credit. Premium users get a 1.5× multiplier with a hard ceiling at 2×, so the gap to a non-premium top-engaged user is bounded.

Credit-earning sources:
- Bio expand: +1
- Slow careful right-swipe (hesitation > 800ms, with bio expand): +2
- Reply within 24h: +3
- Reply within 1h: +5
- Move-composer-accepted suggestion: +2
- Why-card open (suggests reflective use): +1
- Chat sustained > 5 turns: +5
- Date scheduled (detected from "let's meet" linguistic patterns): +10
- Session end without rage-close (close after engagement, not after frustration): +1

Credit-spending sources:
- Weekly Top-10 slot view: -1
- Discover top-position boost: -2 (rare; only when the ranker has spare credits)

The credit ledger is invisible to the user. We tested a visible credit UI in early beta and saw users gamify the credit-earning events (spam-expanding bios). The visible UI was removed; the ledger is now back-end-only.

Earned visibility is the structural alternative to pay-to-promote. The premium 1.5× exists because we honour priority, not free pass. The hard 2× ceiling exists because we read the Hinge / Coffee Meets Bagel / Boo research showing that fair systems retain users 30% longer in cohorts of 90-day-plus retention.

### 3.5 Voice-aware Move composer

**What Priya feels.**

Priya is composing to Arjun for the first time. She knows what she wants to say — something about his Sikkim photos — but every draft sounds cringe. She taps ✨ Suggest. Five drafts appear. The first reads, "your sikkim shots look like the air was cold and the silence was loud — was it monsoon? i was there last winter, totally different mood." She thinks: *wait, did I write this?* It does not sound like an app suggestion. It sounds like her, on a good day. She picks it. Sends. Sets the phone down.

**What the incumbents do.**

Generic LLM openers.

Tinder has experimented with AI-suggested first messages; the suggestions are bland, voice-less, and obviously machine-written. They suffer from the LLM signature: tricolons, em-dashes for emphasis, "I noticed that...", "Based on your profile...", "It seems like...". The user reads the suggestion, recognises it as machine-written, and either deletes it or sends it knowing it is generic. Either outcome is a loss.

**What Miamo does.**

Five-stage pipeline.

Stage 1: extract Priya's sender voice — a 12-feature vector from her last 50 outbound messages (lowercase-i ratio, em-dash count, average sentence length, emoji density, top-3 emojis, code-mix ratio, question rate, exclaim rate, tricolon rate, lowercase-only rate, sentence-final-period rate, ellipsis rate).

Stage 2: extract Arjun's receiver resonance from his last 10 successful-reply messages; if he has < 10, use an archetype-derived prior.

Stage 3: pick a hook from the 8-category library.

Stage 4: render against 80 templates × 4 language families (en, Hinglish, Tanglish, Banglish), code-mixed at Priya's natural ratio.

Stage 5: linter pass — 26 forbidden phrases (`'i noticed'`, `'based on'`, `'kindly'`, `'leverag'`, em-dash for emphasis, double-question, `'as an ai'`...) plus three AI-signature flags (`tooPolishedFlag`, `aiSignatureFlag`, `tricolonFlag`).

Filter to ≥3 distinct hook categories. Return up to 5. The full deep-dive lives in `MIAMO_MOVE.md`.

### 3.6 Family Brief

**What Priya feels.**

It is Sunday afternoon. Priya's mother in Pune has asked again, gently, when she will meet someone properly.

Priya opens the DTM tab. At the top of a curated match's profile is a small button: 📋 **Family Brief**. She taps. A bottom-sheet asks: PDF, Image, or Text? She picks Image. A preview pane shows a beautifully formatted Indian bio-data card with her photo, education (BArch, Sir J.J. College), profession (architect at SDA), family (parents in Pune, one brother), kundli (auto-fetched from her vibe-check answers), partner preferences ("city-based, growth-oriented, vegetarian-friendly, age 27–34").

She taps "Share to WhatsApp." Her mother gets the card, no screenshot, no copy-paste. The token in the URL expires in 7 days.

**What the incumbents do.**

They have not built for the Indian family-in-the-loop reality.

Profile shares on Bumble or Hinge are screenshots. They reveal the user's whole profile, including their casual-intent photos, to a parent. They reveal the URL, which the parent can crawl. There is no TTL, no consent, no format choice. The screenshot lives in WhatsApp forever.

**What Miamo does.**

`POST /api/v1/dtm/family-brief/generate` returns `{token, url, expiresAt}` where token is 22 base64url chars (HMAC-derived). A `FamilyBriefShare` row is written with `userId`, `format ∈ {pdf, image, text}`, `expiresAt = now + 7d`, `views = 0`.

The public endpoint `GET /api/v1/dtm/family-brief/:token` (no auth) is rate-limited per-IP, increments `views`, and rejects with 410 Gone after expiry. The image format is server-rendered (Puppeteer) at 1080×1350 (Instagram-portrait-friendly) and cached for 24h.

### 3.7 Anti-ghost

**What Karan feels.**

This part is about Karan, premium, 32, Delhi.

He opens a brand-new chat with Riya (26, Bangalore, designer, matched last Friday). He composes a message. He taps Send. A small modal: "To help cut down ghosting, your first message holds 1 Spotlight minute. If Riya replies within 72 hours, you get it back plus a bonus minute. If not, the minute is forfeit." Karan thinks for two seconds, taps Confirm, sends. Riya replies in 14 hours. Karan's ledger gets back 2 minutes (the deposit + a +1 bonus). The deposit incentivized him to compose with care.

**What the incumbents do.**

Nothing.

Ghosting is, on every major platform, free. The sender pays no cost for sending a low-effort first message. The recipient pays no cost for not replying. The result is a population-level equilibrium of low-effort openers and high-rate ghosting, which is the most-cited complaint about modern dating apps. The complaint is structural; it is the equilibrium of the incentive system the platforms have built.

**What Miamo does.**

The first outbound message in a new chat opens a 1-minute Spotlight deposit. If the recipient replies within 72 hours, the deposit closes and the ledger writes `+1 release + 1 bonus`. If 72 hours elapse, a sweep loop (every 5 minutes) writes `−1 burn` and emits `chat.ghost_burn`. Per-user cap: 3 deposits open simultaneously. Premium accelerates the bonus (1.5× → 1 bonus minute becomes 1.5, rounded up to 2).

The mechanic introduces a small but non-zero cost for low-effort first messages, which in our cohort tests shifts the median first-message length up by 23% and reduces the 72-hour ghost rate by 41%.

### 3.8 The flag-gate contract

Each of these six features is gated by its own feature flag:
- `FEATURE_VOICE_FINGERPRINT_ENABLED`
- `FEATURE_WEEKLY_TOP_ENABLED`
- `FEATURE_WHY_EXPLAINER_ENABLED`
- `FEATURE_MOVE_V2_ENABLED`
- `FEATURE_FAMILY_BRIEF_ENABLED`
- `FEATURE_ANTI_GHOST_ENABLED`

Default OFF.

With every flag off, v3.6.0 is byte-identical to v3.5 — that is a hard test gate. The `phase-14-overhaul.py` QA script asserts 12/12 with flags ON; a separate `phase-14-flags-off.py` asserts 12/12 with flags OFF and the response shapes match v3.5 byte-for-byte.

The flag-gate contract is the single most important constraint on the v3.6.0 release. It means we can ship the new code, run it in production with flags off, monitor for regressions, then flip flags in a controlled ramp (5% → 15% → 50% → 100%) over an 8-12 week period. If any flag causes a regression, we flip it back to OFF and the regression disappears within the next worker tick.

The contract also means that, at any point in the ramp, a user who has a problem can opt out by toggling the corresponding Settings consent. With the consent toggle OFF, the algorithms read a neutral value for that user; the user experiences v3.5 behaviour even though the flag is ON for the rest of the cohort.

---

## 4. A day with Priya — the v3.6.0 features as moments

Pick up the story at 9:02pm Tuesday, October 28, 2026. Priya has just sat on her bed. The day's work is done. The lights in the high-rise across the road are stuttering off, floor by floor. She has eaten dinner with her flatmate, made tea, and is now scrolling.

What follows is twelve moments. Each is a real moment in a day. Each has a Priya-feels paragraph and a pair-write technical paragraph. The first nine are the canonical v3.6.0 moments from the cleanup spec; the last three are additions for richness.

### 4.1 Discover at 9:02pm — the opener

**What Priya feels.**

She opens Miamo. The Discover stack loads in under 200ms. Ten profiles. She doesn't notice it, but the order tonight is different from the order she would have seen at 11am. Three of the top five are within 8km of Powai; one is a photographer; two like trekking. The fifth is a friend-of-a-friend (collaborative-filter signal).

She swipes left on the first two without reading the bio — too generic.

On the third she stops. Twenty-two seconds. She expands the bio. She swipes right. Her thumb hovers for half a second before committing. She does not notice the hover. The system notices the hover.

The third profile is Arjun's.

**How the system does it.**

Her phone fires `discover.batch.requested`, then a stream of `card.impression.50`, `card.impression.100`, `card.bio.expand`, `swipe.commit`.

The Discover endpoint (`GET /api/v1/discover`) reads from `FeatureSnapshot.raw.intentRightNow` (90-second TTL, written by `tracking-worker/src/intentInference.ts` running every 30 seconds while she is active). The 7-class intent vector at 9:02pm reads:

```
casual_scroll:         0.32
distraction_browse:    0.21
intentional_browse:    0.18
reply_mood:            0.10
review_existing:       0.08
serious_search:        0.06
decision_fatigued:     0.05
```

Mixed-state. She is leaning toward casual scroll but with substantial intentional-browse weight.

The multi-objective layer (`algo/v8/multiObjective.ts`) computes `relevance × earnedVisibility × fairness × recencyFreshness × intentFit` for 200 candidates. `forYouV8` ingredient `intentRightNowFit` adds a 0.06 weight on top of the V6 recipe (sum stays at 1.000 after compose). The Singh-Joachims fairness rerank (`algo/v8/fairnessRerank.ts`) does up to 12 adjacent swaps to keep gender-conditional Gini ≤ 0.40.

Top 10 returned. Total: ~80ms p50. See `ALGORITHMS.md` §V8 for the per-ingredient math.

The half-second hover before the right-swipe? It fires `swipe.hesitation.commit` with `hesitationMs: 487`. The `EventAggDaily.meta.hist` for Priya now reflects a hesitation p50 of around 400ms — slow, careful, the system reads it as high-confidence intent. The next batch she sees, twenty minutes from now if she keeps scrolling, will deprioritize fast-twitch impulsive candidates and surface more slow-burn profiles.

The Arjun-at-position-3 placement is itself an artefact of the V8 layer. In a naive V4-only ranker, Arjun would have placed at position 7 (his raw pairwise score against Priya is 0.74, behind several higher-scoring candidates). The V8 layer boosted him because:
- His `intentRightNowFit` matched Priya's current intent vector (he is also a Tuesday-evening active user, his sessions overlap with hers temporally)
- His `exposureCreditBoost` was +0.02 (he had earned credits in the prior week and had not yet had a Top-10 placement)
- The fairness rerank swapped him with a higher-scoring male candidate who had already had his fair-share allocation for the day

The boost was small — Arjun went from raw 0.74 to composite 0.79 — but small was enough to move him from position 7 to position 3. The position-3 placement is, on its own, worth roughly 2.4× the right-swipe probability of position 7. Priya right-swiped because the system put Arjun where she would look closely.

### 4.2 The Why-am-I-seeing-this moment

**What Priya feels.**

On the third card — Arjun's — she taps the small **i** icon in the corner.

A popover slides up. Three stars are filled:
- ★★★ "you both like hiking" (the loudest signal)
- ★★ "similar reply pace" (he replies in 18 minutes median, she in 22)
- ★ "morning chronotype match" (you both open the app before 10am)

At the bottom: a small link, "show me less like this." She doesn't tap it. She just nods. The app feels less like a slot machine for the first time.

She closes the popover. Re-reads Arjun's bio. Right-swipes.

**How the system does it.**

`GET /api/v1/discover/:targetId/why` returns up to five ingredients sorted by `|contribution|` desc, capped at the top three for UI. The endpoint reads the same `PairCompatCache.v6Score.breakdown` the ranker used, runs `algo/explain.ts` over it, and returns:

```json
[
  {"key": "interestsOverlap",  "value": 0.78, "weight": 0.18, "contribution": 14.0, "kind": "ingredient"},
  {"key": "behaviouralPace",   "value": 0.68, "weight": 0.20, "contribution":  13.6, "kind": "ingredient"},
  {"key": "chronotypeMatch",   "value": 0.85, "weight": 0.10, "contribution":   8.5, "kind": "ingredient"},
  {"key": "distance",          "value": 0.30, "weight": 0.10, "contribution":   3.0, "kind": "ingredient"},
  {"key": "verified",          "value": 1.00, "weight": 0.05, "contribution":   5.0, "kind": "ingredient"}
]
```

The UI takes the top three by `|contribution|` and maps them to star counts:
- `contribution ≥ 12.0` → ★★★
- `8.0 ≤ contribution < 12.0` → ★★
- `5.0 ≤ contribution < 8.0` → ★
- `< 5.0` → not shown

The user-readable labels map:
- `interestsOverlap → "you both like hiking"` (the top shared interest)
- `behaviouralPace → "similar reply pace"`
- `chronotypeMatch → "morning chronotype match"`

The "show me less like this" link writes a `MatchFeedback` row with `kind = 'less_like_this'`; the learner (`tracking-worker/src/learnerLoop.ts`) consumes it on the next 10-minute tick.

This is Miamo's GDPR Article 22 human-review path — the user can always ask why, and the answer is grounded in the actual cached score. The endpoint is also rate-limited at 30 requests per minute per user, because a curious user clicking through the stack to see every why-card should not be able to DOS the explainer.

The same endpoint serves as the basis for the `polarity` signal: if Priya taps "show me less like this" three times in a session, the polarity classifier (`algo/v8/polarity.ts`) reads it as a strong negative-mood signal and the Discover ranker dampens novelty in the next batch.

The contract for the explainer is that the explanation must be faithful. If the system says "you both like hiking" was the top reason, the system must have actually weighted hiking the highest in its ranking. Confabulated explanations — explanations generated post-hoc to look good — are forbidden. The explainer reads the same cached breakdown the ranker used; if the breakdown is empty or stale, the explainer says so rather than making something up.

### 4.3 The Move v2 moment at 9:31pm — composing to Arjun

**What Priya feels.**

It is 9:31pm. Twenty-nine minutes have passed since Priya right-swiped on Arjun. He matched her at 9:14pm and her phone vibrated; she let it sit. Now she opens the chat. The composer is empty.

She knows what she wants to say — something about his Sikkim photos — but every draft sounds cringe. She types "Hey, your photos are amazing" and deletes it. She types "Hi! Where were these taken?" and deletes that too.

She taps **✨ Suggest**. A bottom-sheet slides up with five options:

> 1. "your sikkim shots look like the air was cold and the silence was loud — was it monsoon? i was there last winter, totally different mood."
> 2. "ok the last frame in that sikkim set. the light. did you wait for it?"
> 3. "i clicked on your profile because of the photos but stayed because of the dosa-with-coffee bio. who hurt you 😂"
> 4. "trekker question: which boots? mine ate themselves on the goecha la trail"
> 5. "saw sikkim in your post and immediately had nostalgia. i did the dzongri trek last november. wild place."

She picks #1. She thinks: *wait, did I write this?* It does not sound like an app suggestion. It sounds like her, on a good day. She sends. Sets the phone down. The Sikkim story moves to the front of her mind in a way it hadn't in a year.

**How the system does it.**

`POST /api/v1/creativity/items/:id/move-suggestions-v2` (proxied to the content service).

The composer (`algo/v8/moveV2/composer.ts`) is a five-stage pipeline.

**Stage 1 — sender voice extraction.**

Read `UserMoveProfile.senderVoice` for Priya. It is a 12-feature vector pulled from her last 50 outbound messages:

```
lowercase_i_ratio:           0.87
em_dash_count_per_msg:       0.4
avg_sentence_len:           14.2
emoji_density:               0.18
top_3_emojis:               ['😂', '🤘', '🥲']
code_mix_ratio:              0.12 (en-hi)
question_rate:               0.35
exclaim_rate:                0.08
tricolon_rate:               0.02
lowercase_only_rate:         0.72
sentence_final_period_rate:  0.31
ellipsis_rate:               0.04
```

Priya, in vector form, is lowercase-leaning, mid-sentence, emoji-comfortable, with a noticeable but not heavy Hinglish code-mix.

**Stage 2 — receiver resonance extraction.**

Read Arjun's last 10 successful-reply messages from his `UserMoveProfile.receiverResonance`. If < 10 (Arjun is a recent user with sparse data), fall back to his archetype prior (`visual` based on his photo-heavy profile and 2.1 photos-per-bio-word ratio).

His resonance vector is:

```
preferred_opener_length:    short_to_mid (12-25 words)
preferred_hook_categories:  shared_interest, recent_post, visual_callback
emoji_tolerance:            mid (he uses 1-2 emojis per message)
language_family_preference: en-leaning, comfortable with light Hinglish
```

**Stage 3 — hook selection.**

The 8-category library (`algo/v8/moveV2/hookLibrary.ts`) ranks each category against the (Priya, Arjun) pair:

```
shared_interest      0.74  (hiking, photography — both fire)
recent_post          0.81  (his Sikkim post is 3 days old — fires hard)
geo                  0.18  (he is in Bangalore not Mumbai — fires soft, deboosted)
time_of_day          0.20  (evening — neutral)
chronotype_match     0.31  (morning — fires)
vibe                 0.15  (creative-adventurous overlap — fires soft)
mood                 0.08  (his recent mood-tagged posts are positive — neutral)
cold_open            0.05  (deboosted because three other hooks fired)
```

Top 3 hooks selected: `recent_post` (0.81), `shared_interest` (0.74), `chronotype_match` (0.31).

**Stage 4 — render.**

Run each top hook against 80 templates × 4 language families (en, Hinglish, Tanglish, Banglish). For Priya (code-mix ratio 0.12), the en family weights at 0.75 and the Hinglish family at 0.25. Generate 12 candidates.

A sample of the 12 candidates, before linting:

```
1. "your sikkim shots look like the air was cold and the silence was loud — was it monsoon? i was there last winter, totally different mood."    [recent_post, en]
2. "ok the last frame in that sikkim set. the light. did you wait for it?"                                                                          [recent_post, en]
3. "i clicked on your profile because of the photos but stayed because of the dosa-with-coffee bio. who hurt you 😂"                                  [recent_post + cold_open, en]
4. "trekker question: which boots? mine ate themselves on the goecha la trail"                                                                       [shared_interest, en]
5. "saw sikkim in your post and immediately had nostalgia. i did the dzongri trek last november. wild place."                                        [recent_post + shared_interest, en]
6. "I noticed that your Sikkim photographs are stunning. Where were these taken?"                                                                    [recent_post, en — FAILS linter]
7. "Based on your profile it seems we share a love for mountains."                                                                                   [shared_interest, en — FAILS linter]
8. "matlab sikkim toh bahut underrated hai na. last winter i was there too."                                                                          [recent_post, hinglish]
9. "morning person to morning person — your sunrise frames have a different energy."                                                                  [chronotype_match, en]
10. "kheer in a corner of bandra at 9pm — i need to know more about that bio line."                                                                  [cold_open, en — DEPRIORITIZED, cold_open is rank 4]
11. "you, me, and goecha la trail. let me guess — first sunrise on top, you forgot to breathe?"                                                       [shared_interest, en]
12. "your Sikkim work is — and i don't say this lightly — gorgeous, unique, and unforgettable."                                                       [recent_post, en — FAILS linter (tricolon, em-dash, too-polished)]
```

**Stage 5 — linter pass.**

Run `algo/moveVoice.ts` (`runVoiceLinter()`). 26 forbidden phrases:

```
'i noticed'  'based on'  'kindly'  'leverag'  'best-in-class'  'next-generation'
'as an ai'   'happy to'  'i would love to'  'it seems like'  'allow me to'
em-dash for emphasis (not for punctuation)
double-question ('?? or ??')
'?? !'  ('!! ?')
'???'   '!!!'
... and 11 more
```

Plus three AI-signature flags:
- `tooPolishedFlag` — uppercase-start + full sentence-final period + no emoji + no contraction
- `aiSignatureFlag` — the tricolon pattern with "X, Y, and Z" (the classic LLM tell)
- `tricolonFlag` — three parallel clauses in one sentence

Of the 12 candidates:
- #6 fails on `'i noticed'`
- #7 fails on `'based on'` and `tooPolishedFlag`
- #12 fails on `tricolonFlag` and em-dash-for-emphasis
- #10 is deprioritized (hook ranked 4th, not in top 3)
- #8 passes the linter but is dropped because we already have a recent_post candidate (Hinglish version)

Pass: 1, 2, 3, 4, 5, 9, 11. That's 7 candidates. Filter to ≥3 distinct hook categories. Sort by hook diversity, return top 5: #1 (recent_post), #2 (recent_post), #3 (recent_post + cold_open), #4 (shared_interest), #5 (recent_post + shared_interest).

If all 5 failed lint, fall back to a hand-curated voice-aware default ("hey, came across your profile — would love to chat" rendered in Priya's voice as "hey, your bio made me smile — what are you up to?").

The whole call is under 150ms. The acceptance signal — Priya tapped #1 — fires `move.suggestion_accepted` with `suggestion_index: 0`, `edit_distance: 0` (she sent it as-is, no edits).

This is the strongest possible learner signal: the composer guessed right, the user accepted, no editing required. The reward is fed into `learnerLoop.ts` on the next 10-minute tick and the composer's hook-selection weights are nudged slightly toward recent_post-led drafts for users with Priya's archetype.

### 4.4 The Voice Fingerprint reveal at message 50

**What Priya feels.**

Wednesday night, October 29. Priya has been talking to Arjun on and off for 24 hours; she has also been talking to one other match (a person she will lose interest in by Friday). She has just sent her fiftieth outbound message in the app. She is brushing her teeth.

Her phone buzzes — a small notification, but not the loud kind that lets her ignore it. She picks up. A card has appeared:

> *Your voice fingerprint is ready.*

She taps.

A canvas-rendered 1080×1920 image fills the screen. At the top: a hand-lettered title, *"the wordsmith."* Below the title, four lines:

> you say "i" instead of "I" 87% of the time.
> your top emoji is 😂.
> you average 14 words per sentence.
> you use the em-dash like punctuation.

A "share to Instagram Story" button at the bottom. She taps it. The card lands on her IG, which her friends will read, two of whom will message her in the next hour ("LOL this is so YOU"). The most viral mechanic the app has shipped.

She closes the app. Brushes her teeth.

The app has, in that moment, transitioned from being a tool to being part of her self-image. That transition is the strongest cohort-retention signal Miamo has measured.

**How the system does it.**

`GET /api/v1/users/me/voice-fingerprint` (users service, behind `FEATURE_VOICE_FINGERPRINT_ENABLED`).

Reads `UserMoveProfile.senderVoice` (the same 12-feature vector the Move composer uses).

Runs `algo/v8/moveV2/senderVoice.ts#voiceToArchetype` which projects the 12-feature vector onto four archetype centroids in feature space and picks the nearest by cosine similarity:

- **`wordsmith`** — high lowercase-i, high em-dash, mid-length sentences, lowercase-only-leaning, emoji-mid. Priya's centroid.
- **`voice_first`** — short messages, high emoji, low question rate, low sentence-final period. Casual texter.
- **`visual`** — short messages, high media attachment rate, low text. Photographer-types.
- **`fast_replier`** — short messages, high question rate, high reply velocity. Conversation drivers.

Priya's projection scores:
- wordsmith: 0.79
- voice_first: 0.34
- visual: 0.18
- fast_replier: 0.41

Archetype: `wordsmith`. Confidence: 0.79.

The endpoint returns:

```json
{
  "archetype": "wordsmith",
  "archetypeLabel": "the wordsmith",
  "archetypeEmoji": "✍️",
  "topEmoji": "😂",
  "lowercaseIRatio": 0.87,
  "avgSentenceLen": 14.2,
  "emdashUsage": "punctuation",
  "confidence": 0.79
}
```

The web component `services/web/src/app/(main)/messages/components/VoiceFingerprint.tsx` renders to canvas at 1080×1920 and offers an Instagram Story intent (`instagram-stories://share`) plus an `image/png` fallback for browsers that don't support deep-link intents. Emits `voice_fingerprint.shown` (on render) and `voice_fingerprint.shared` (on share-button tap).

The 50-message threshold exists because below ~50 outbound messages the sender voice vector is noisy. We A/B'd thresholds of 25, 50, 75, and 100; 50 was the sweet spot where the archetype prediction confidence median was ≥ 0.7 and the share rate (the viral hook) was ≥ 18%. The card is shown once per archetype-change; if Priya's voice drifts (it usually doesn't), a new card surfaces.

The "shared" rate is, in our beta, 31% — meaning roughly one in three users posts the card to Instagram. The acquisition lift from those Instagram shares is the strongest organic-acquisition channel Miamo has. Each share generates an average of 2.1 incoming app-store visits within 48 hours, of which 0.4 convert to onboarding-completed.

### 4.5 The DTM evening question at 10:14pm

**What Priya feels.**

Priya is back on her phone. Arjun has replied to her opener — fast, in her style, with a photo and a question. Conversation is alive.

She closes the chat for now and goes to the DTM tab. There's a single, short question:

> What's your idea of a great Sunday with someone you love?

Four options + free-text:
- Stay in, cook together
- Drinks out somewhere new
- Long walk, no plan
- Netflix and order in

She picks "stay in, cook together."

Three minutes later, a card slides in:

> *Yash, Bangalore, 30, also picked "stay in, cook together." Here's why we're showing him today.*

The "here's why" expands to: same Sunday answer, both Sagittarius (a cute add, not a ranker input), both selected "growth-oriented" in their values vector, both score 0.81 on the lifestyle DTM topic. She bookmarks Yash for tomorrow. She does not pursue him tonight; the DTM tab is for slower decisions.

**How the system does it.**

`POST /api/v1/dtm/next-batch` (content service).

The DTM topic mask (`algo/v8/dtmTopicMask.ts`) computes a topic-skip set from Priya's current mood vector. At 10:14pm her fatigued dimension is 0.41 — below the 0.5 threshold — so heavy topics (intimacy, conflict, finance) stay available. The available pool is the 16-topic L2-normalised vector (`dtmTopics.ts`):

```
0  values
1  lifestyle
2  communication
3  intimacy
4  family
5  finance
6  conflict
7  growth
8  leisure
9  faith
10 ambition
11 autonomy
12 social
13 health
14 parenting
15 future
```

The mask selects `lifestyle` for tonight because Priya's coverage on `lifestyle` is currently `sparse` (1-3 sub-questions answered) and the system prefers to grow sparse coverage to sufficient before moving to deeper topics.

The DTM cosine match runs over the masked vector. Priya's vector at this moment:

```
lifestyle:    0.85
values:       0.78
growth:       0.81
communication: 0.74
family:       0.68
leisure:      0.71
... (10 other topics)
```

Yash's vector:

```
lifestyle:    0.83
values:       0.74
growth:       0.85
communication: 0.79
family:       0.71
leisure:      0.66
... (10 other topics)
```

Weighted cosine over the populated dimensions, blended with the coverage weight (`coverageWeight = min(meReport.affinityWeight, candReport.affinityWeight)`). Both are at `sufficient` (coverage weight 0.75). The blend is `0.75 × 0.93 + 0.25 × 0.5 = 0.82`. Add `sharedMassBonus = 0.05 × shared_mass ≈ 0.04`. Final score: 0.81.

The explainer (`algo/dtmExplain.ts`) returns per-topic gap + contribution and the UI shows the top 3:

```json
[
  {"topic": "lifestyle", "meValue": 0.85, "candValue": 0.83, "gap": 0.02, "contribution": 0.18},
  {"topic": "values",    "meValue": 0.78, "candValue": 0.74, "gap": 0.04, "contribution": 0.15},
  {"topic": "growth",    "meValue": 0.81, "candValue": 0.85, "gap": 0.04, "contribution": 0.16}
]
```

The UI labels:
- `lifestyle → "same Sunday answer"` (because lifestyle is the active topic that surfaced this match)
- `values → "you both selected growth-oriented in values"`
- `growth → "high growth alignment"`

The Sagittarius reference is decorative; it comes from a `VibeCheck` row (sun sign self-reported) and is added as a UX flourish, not a ranker input. The system never weights astrological signs.

DTM is the one surface that does NOT use infinite scroll. One curated match a day. Priya's "bookmark" action writes a `DeferredItem` row tagged `dtm.deferred`; tomorrow's DTM screen will surface Yash again at the top of her review. The deferred pile is the v6.6 "see later" pattern; it exists because thoughtful evaluation takes more than a session.

### 4.6 The Family Brief moment Sunday afternoon

**What Priya feels.**

It is the next Sunday, November 2, 4pm. Priya has been talking to Arjun for five days and Yash for four. Both are real candidates. Her mother called this morning and asked, gently, again. Priya does what she has been avoiding doing for a year: she shares Yash with her mother.

She opens the DTM tab. At the top of Yash's profile is a small button: 📋 **Family Brief**. She taps. A bottom-sheet asks: *PDF, Image, or Text?* She picks Image. A preview pane shows a beautifully formatted Indian bio-data card:

```
Yash Sharma
30 · Bangalore · Software Engineer at Razorpay
B.Tech CSE (IIT Madras, 2018)

Family: Parents in Pune (father retd. govt, mother homemaker).
         One younger sister (24, dentist).

Kundli highlights: Sagittarius sun, Capricorn moon, Vedic match score TBD.

Preferences: city-based partner, growth-oriented, vegetarian-friendly, age 26-32.

Verified by Miamo · expires Nov 9, 2026
```

She taps "Share to WhatsApp." Her mother gets the card, no screenshot, no copy-paste, no link back to Yash's full profile, no exposure of his casual-intent photos. The token in the URL expires in 7 days. Her mother sees a clean, formatted bio-data card and says, finally, "okay, beta. tell me more."

**How the system does it.**

`POST /api/v1/dtm/family-brief/generate` returns `{token, url, expiresAt}` where token is 22 base64url chars (HMAC-derived from `targetUserId + sharerUserId + format + now()`).

A `FamilyBriefShare` row is written:

```
userId:         <Priya's ID, HMAC-hashed>
targetUserId:   <Yash's ID, HMAC-hashed>
format:         "image"
token:          "x8f1c7b2a4e6d1f3b9a0c2"
expiresAt:      2026-11-09T16:00:00Z
views:          0
createdAt:      2026-11-02T16:00:00Z
```

The public endpoint `GET /api/v1/dtm/family-brief/:token` (no auth) is rate-limited per-IP (10 req/min) and per-token (50 lifetime views), increments `views` on each fetch, and rejects with `410 Gone` after `expiresAt`.

The image format is server-rendered (Puppeteer in the content service) at 1080×1350 (Instagram-portrait-friendly) and cached for 24h in `/tmp/family-brief-cache/{token}.png`. The PDF format uses the same template, rendered to A4 with `puppeteer.pdf()`. The text format is markdown, served as `text/plain; charset=utf-8`.

The "Share to WhatsApp" intent uses `wa.me/?text=` with the URL encoded — no Miamo PII leaves the device, no Miamo session token is exposed. The mother does not need a Miamo account to view; she just opens WhatsApp and taps the URL.

The card is a fact-sheet, not an interaction surface; there is no "swipe right" button, no "message Yash" button, no analytics fired back to Yash's account about who has seen it. The Family Brief is read-only by design.

The Family Brief is gated by `FEATURE_FAMILY_BRIEF_ENABLED`. With the flag off, the 📋 button does not render and the endpoint returns 404. With the flag on, but with Priya's "Family Brief share" consent toggle off (in Settings), the button is hidden and the endpoint returns 403. Two layers of gating; both must be on for the feature to be active for a given user.

The target user (Yash, here) is notified when his card is generated. The notification reads: "Someone has shared your DTM profile with their family." He is NOT told who shared it. He is NOT told who viewed it. He can opt out of having his profile briefable in Settings; with that toggle off, the 📋 button does not appear for users looking at his card.

The view count is per-token, not per-target-user. Yash cannot see, on his analytics, that his card has been viewed 14 times this week (this would be intrusive and would change his behaviour). The view count is internal-only and is read by the moderation system to detect anomalous traffic (a card with 500 views in a day is suspicious).

### 4.7 The right-now-intent moment at 11:47pm

**What Priya feels.**

Back on Tuesday night. The first day. It is now late.

Priya is in bed, scrolling Discover one more time before sleep. She doesn't notice it, but the next batch is different. Lower novelty. Closer geo. The Move composer next to the chat input, if she taps Suggest on a different match, has shifted tone: drafts are softer, shorter, less performative. The DTM tab, if she were to open it, would skip heavy topics and offer a "tomorrow morning?" deferred-answer button on the question. She just feels that the app is calmer. She closes it at 11:52pm.

**How the system does it.**

At 11:47pm `intentInference.ts` (running every 30s while Priya is active) reads her last 30 events from the rollup, runs `algo/v8/intentRightNow.ts` (7-class log-linear softmax), and writes:

```
FeatureSnapshot.raw.intentRightNow = {
  intentVec: [0.05, 0.09, 0.07, 0.04, 0.03, 0.02, 0.70],
  computedAt: 2026-10-28T23:47:13Z,
  ttlMs: 90000,
  algoVersion: 'v8.0'
}
```

Decoded:
- casual_scroll: 0.05
- distraction_browse: 0.09
- intentional_browse: 0.07
- reply_mood: 0.04
- review_existing: 0.03
- serious_search: 0.02
- **decision_fatigued: 0.70**

The `decision_fatigued` dimension is dominant.

The Discover ranker reduces `noveltyFit` weight at composition time. `algo/v8/moodRightNow.ts` (same worker, separate output) writes:

```
moodVec = {rage: 0.02, calm: 0.41, curious: 0.18, receptive: 0.32, fatigued: 0.71}
```

The DTM mask (`algo/v8/dtmTopicMask.ts`) reads `fatigued ≥ 0.5` + the late-night clock window (`localHour ≥ 23`) and emits:

```
skipTopics = ['intimacy', 'conflict', 'finance']
```

The Move composer hooks-library (`algo/v8/moveV2/hookLibrary.ts`) downranks `playful` and `tricolon` templates.

None of this is persisted past 90 seconds — privacy-by-design.

The fact that the intent and mood are not persisted is the privacy contract. Miamo collects the data, uses it for the duration of the session, and discards. If a regulator asks "what is Priya's mood right now, by your records?", the answer is "we have no record." The signal exists only in the ranker's view of the session. After 90 seconds with no further activity, the row in `FeatureSnapshot` becomes stale and is overwritten on the next tick or, if Priya closes the app, evicted by the next worker pass.

The mood inference is also consent-gated. In Settings → Personalization & Privacy, the first toggle is "Allow mood inference." It defaults to ON for users who opted in at onboarding and to OFF for users who skipped. With the toggle OFF, `intentInference.ts` skips the user; the Discover ranker reads a neutral intent vector `[1/7, 1/7, 1/7, 1/7, 1/7, 1/7, 1/7]` and a neutral mood vector `[0.2, 0.2, 0.2, 0.2, 0.2]`. The user gets v3.5 behaviour. The fallback is graceful by design.

The 90-second TTL is the second privacy layer. Even if a developer queries `FeatureSnapshot` directly, the row they pull is at most 90 seconds old. The historical mood of a user one hour ago is unrecoverable from this table. The only place historical mood lives is in the rollup aggregates (`EventAggHourly`, `EventAggDaily`), which carry the raw event counts that feed the classifier but not the classifier's output. The classifier output is ephemeral.

### 4.8 The Weekly Top-10 Sunday morning

**What Priya feels.**

Sunday morning. November 2. Priya wakes at 7:30am.

A notification: *"Your 10 most compatible matches for the week of October 26–November 1 are ready."*

She opens. A new tab, labelled with the ISO week. Ten cards. Each one carries a "matched-for-this-week" badge. Three are people she has not seen in Discover before. The order is not random and not infinite-scroll. There is a countdown at the top: *"new batch in 6d 13h."*

She doesn't have to swipe through 200 to find one. She reads three carefully, opens two profiles, likes one. She closes the tab.

The Weekly Top-10 is, in Priya's experience, the surface that feels most like Miamo's promise. Everything else feels like a dating app that has been tuned well. Weekly Top-10 feels like something the other apps don't have. It is named, dated, finite, and curated. It does not refresh on pull. It does not infinitely scroll. It does not surface 200 candidates and hide the answer in the noise. It surfaces 10.

**How the system does it.**

A worker (`tracking-worker/src/stableMatchTop10.ts`) runs Sunday at 00:00 UTC.

It eligibility-filters: opted-in (the `exposure ledger participation` toggle in Settings is ON), ≥7 days active, ≥30 exposure credits earned. For Priya, all three are true.

It builds two preference lists for every eligible user. Priya's preference list is the sorted list of her eligible candidates by her V8 score over them, truncated to her top 30 (Gale-Shapley terminates faster with bounded lists). The symmetric list for each candidate is built similarly.

The algorithm then runs classical Gale-Shapley deferred-acceptance:

```python
def galeShapley(proposers, accepters):
    unmatched = set(proposers)
    matches = {}              # accepter -> proposer
    while unmatched:
        p = unmatched.pop()
        for q in p.preferences:
            if q not in matches:
                matches[q] = p
                break
            else:
                p_current = matches[q]
                if q.prefers(p, p_current):
                    matches[q] = p
                    unmatched.add(p_current)
                    break
        # if p exhausted preferences without matching, p stays unmatched
    return matches
```

The output is a stable matching where no pair (p, q) would mutually prefer each other over their current matches. Priya, as a high-engagement user, matches with her top 10 in the first few rounds.

The matches are written as `WeeklyTopMatch` rows:

```
{userId: Priya, weekIso: '2026-W43', candidateId: ..., rank: 1, generatedAt: 2026-11-02T00:00:00Z}
{userId: Priya, weekIso: '2026-W43', candidateId: ..., rank: 2, generatedAt: 2026-11-02T00:00:00Z}
...
{userId: Priya, weekIso: '2026-W43', candidateId: ..., rank: 10, generatedAt: 2026-11-02T00:00:00Z}
```

The endpoint `GET /api/v1/weekly-top` returns them; the tab in `services/web/src/app/(main)/discover/components/WeeklyTop10.tsx` reads and renders. Each slot, when viewed, debits one `ExposureCredit` from Priya's ledger (her premium 1.5× multiplier means the cost is 1/1.5 of a normal exposure, so 10 slots cost her about 6.7 credits).

The "matched-for-this-week" badge on each card is more than cosmetic. It signals to Priya that this match was selected by a different process than the Discover stack; the cognitive frame she should use is "curated by the system" not "found by me." The behavioural lift in our beta tests was real: users open the Weekly Top-10 at 3.2× the rate they open the AI Pick of the Day, and like-rate on Top-10 candidates is 2.1× the like-rate on Discover candidates of comparable V8 score.

The countdown at the top is also more than cosmetic. The bounded, dated, named nature of the Top-10 is its single most differentiated property versus infinite-scroll surfaces. The user knows they have a week. They are not racing the algorithm; they are evaluating ten candidates.

The Gale-Shapley algorithm has a guaranteed termination property: it always converges on a stable matching in O(n²) operations. For Miamo's scale (50k eligible users per week at maturity), the pass runs in roughly 90 seconds on a single-core worker. The worker is scheduled for Sunday 00:00 UTC specifically because Sundays are the lowest-traffic window globally; the database load is acceptable even when the worker is reading and writing concurrently with normal user activity.

The premium multiplier on exposure-credit debit (1/1.5 instead of 1) means a premium user can view all 10 slots without exhausting their weekly credit budget. A free user with exactly 30 credits going into Sunday can view 10 slots and end with 20 credits remaining; a premium user with 30 credits ends with about 23. The differential is small and bounded.

### 4.9 The anti-ghost moment with Karan and Riya

**What Karan feels.**

This part is not about Priya. It is about Karan, premium, 32, Delhi, who has been on dating apps for four years and is, by his own admission, fatigued. He has matched with Riya (26, Bangalore, designer) last Friday on Discover. They have not yet exchanged messages.

It is Saturday night. He opens the chat. The composer is empty. He thinks about what to write. The old version of him would have written "heyy 👋" and tapped Send in three seconds. He composes a longer message — references one of her illustrations from her Showcase, asks a real question. He taps Send.

A small modal appears:

> *To help cut down ghosting, your first message holds 1 Spotlight minute. If Riya replies within 72 hours, you get it back plus a bonus minute. If not, the minute is forfeit.*
>
> [Confirm] [Cancel]

Karan thinks for two seconds. He has 12 Spotlight minutes in his ledger. He can afford the bet. He taps Confirm. The message sends.

Riya replies in 14 hours. Karan's notification fires. He opens the chat, reads her reply, smiles. His ledger gets back 2 minutes (the deposit + a +1 bonus, rounded up because premium). The next time he composes a first message, he does so knowing the cost is real and the bonus is real. He composes carefully.

**Counter-case.**

Karan also messaged a different match, Aisha, on Wednesday. Aisha did not reply. At Saturday 11pm — 72 hours after his message — the sweep loop fires. His ledger writes:

```
{kind: 'antiGhost.burn', amount: 0, chatId: <aisha-chat-id>}
```

(The -1 already debited on hold open.)

He gets a small notification: *"Your Spotlight deposit on the chat with Aisha has expired."* He does not feel great about it. He learns to compose better, or to message less.

**How the system does it.**

`POST /chats/:chatId/messages` (messaging service) checks if this is the first outbound message in the chat. If yes and `FEATURE_ANTI_GHOST_ENABLED=1` and Karan has ≥1 Spotlight minute available, the messaging service calls `algo/v8/antiGhost.ts#openDeposit({senderId, chatId, amountMinutes: 1})`.

The ledger writes a hold row (`SpotlightLedger` with `kind = 'antiGhost.hold'`, `amount = -1`, `expiresAt = now + 72h`, `meta: {chatId, senderId}`).

When Riya's first reply lands (the messaging service detects it: it is a reply to a chat with an open hold), the same module fires `closeDeposit({chatId, outcome: 'replied'})` which writes two rows:

```
{kind: 'antiGhost.release', amount: +1, chatId: <riya-chat-id>}
{kind: 'antiGhost.bonus',   amount: +1, chatId: <riya-chat-id>}
```

If 72h elapse without reply, a sweep loop (every 5 min, `antiGhostSweep.ts`) writes:

```
{kind: 'antiGhost.burn', amount: 0, chatId: <aisha-chat-id>}
```

The `amount: 0` is intentional. The actual debit was the original `antiGhost.hold` row with `amount: -1`. The burn row is a record-of-burn, not a second debit. The accounting is single-entry.

The sweep also emits `chat.ghost_burn` for analytics. The analytics consume this to produce the population-level ghost-rate metric, which informs whether the 72h window should be adjusted.

Per-user daily cap: 3 deposits open simultaneously. (Karan cannot open 10 deposits in one day and game the bonus economy.) Premium accelerates the bonus: the multiplier is 1.5× on the bonus payout, so 1 bonus minute becomes 1.5, rounded up to 2. The premium multiplier does NOT apply to the deposit amount or the burn amount; only the bonus.

The economics of the anti-ghost mechanic are deliberately mild. The deposit is one minute. The bonus is one minute. The cost of a burn is the deposit (one minute). Spotlight minutes refresh weekly (everyone gets a baseline allocation of 7 minutes per week, premium users get 10). A user who composes carefully and gets reasonable reply rates will end the week with more minutes than they started. A user who spams will end with fewer. The mechanic is not punitive; it is a small but real cost gradient that shifts the equilibrium.

The 72-hour window is tuned. We A/B'd 24h, 48h, 72h, and 96h. 24h was too punitive (legitimate slow-repliers were burning). 48h was on the edge. 96h was too forgiving (the cost gradient didn't shift behaviour). 72h was the sweet spot, with the caveat that the Tier-1-vs-Tier-2/3 split shows different optimal windows; this is in the open-questions list.

### 4.10 The first match notification — the bell at the right time

**What Priya feels.**

Wednesday morning, October 29, 7:14am.

Priya is awake — she is a morning person, her alarm is set for 7am — and is at her kitchen counter making coffee. Her phone buzzes. It is a Miamo notification: *"Arjun replied to your message."*

She picks up the phone. She reads. She smiles. She types a reply. She does this in the seven-minute window between her coffee being ready and her needing to leave for the gym.

She does not know that the notification fired at exactly 7:14am because the `notifyTiming.ts` algorithm has read the last 28 days of her `session.start` events and identified 7:10am–7:30am as her highest-attention window on weekday mornings. She does not know that Arjun's reply actually arrived at 6:43am, when she was still asleep, and the system held it. She does not know that if it had been 11:15pm — outside her windows — the notification would have been held until 9:00am UTC. She just knows that the bell, today, was perfectly timed.

**How the system does it.**

`notifyTiming.ts` runs as a hot loop alongside the notification dispatcher (`services/notifications/src/server.ts`).

For each pending notification, it:
1. Reads the recipient's last 28 days of `session.start` events from `EventAggHourly` and `EventAggDaily.meta.hist`.
2. Builds a per-hour open-likelihood vector (`0..23 → P(opens within 5 minutes if notified)`).
3. Picks the next hour where that vector exceeds the threshold (0.4 in v3.6).
4. Also reads the recipient's dismissal back-off: if they have dismissed three consecutive notifications, the next one is deferred to 09:00 UTC the following day.

Priya's open-likelihood vector at hour 7 (her local 7:00am-7:59am) is 0.78. At hour 23 (11:00pm) it is 0.21. The threshold of 0.4 means the system will fire at her 7am window but not at her 11pm window.

The daily cap is 4 notifications; a fifth is queued and either delivered tomorrow or dropped if stale.

The chronotype signal that feeds `notifyTiming.ts` is the same signal that feeds the Discover ranker. Both read `FeatureSnapshot.raw.chronotype`. Priya's chronotype is `early_riser` with confidence 0.82. Arjun's chronotype is also `early_riser` with confidence 0.75. The chronotype match between them is 0.85 — a meaningful but not enormous signal in the V4 recipe, contributing about 0.085 to the composite score (10% weight × 0.85 value).

The `notifyTiming.ts` algorithm is registered as algorithm #13 in the V4 ranker. Its flag is `ALGO_V5_NOTIFY_TIMING_ENABLED`. With the flag off, notifications fire immediately on event arrival, which is what every other dating app does and which is why every other dating app has a 60%+ notification dismissal rate. With the flag on, Miamo's dismissal rate in beta is 31%.

The hold-and-release pattern (Arjun's reply at 6:43am, fired at 7:14am) has a documented exception: chat messages that are part of an active conversation (defined as: both parties have sent a message in the last 60 minutes) fire immediately. The chronotype-windowing applies only to "cold" notifications where the recipient is not currently in conversation. The exception exists because the cost of a delayed notification in an active conversation is higher than the cost of an ill-timed one; users in active conversation want the bell now.

### 4.11 The Beats overlap — music match between Priya and Arjun

**What Priya feels.**

Thursday afternoon, October 30, 3:42pm.

Priya is at her desk in Lower Parel. She is half-working on a CAD model and half-chatting with Arjun. They are deep in conversation about whether the Vipassana retreat at Igatpuri is "actually transformative or just an Instagram thing." A small banner appears at the top of the chat:

> *You and Arjun share 14 favourite songs on Beats.* [▶]

She taps. A list slides out. Frank Ocean's "Pink + White." Prateek Kuhad. The Lumineers. Arijit Singh. Khruangbin. She didn't know he liked Khruangbin. She sends him a message:

> "wait, you listen to khruangbin?? which album?"

He replies, immediately:

> "morrison the band, the cover at the boilerroom set is the one i loop."

Conversation shifts into music. They will end the week trading playlists.

**How the system does it.**

Beats is a separate algorithm (`algo/beats.ts`, registered as #12) that runs over the `Beat` and `BeatEvent` Prisma models.

When a user adds a song to their Beats list, it writes a `Beat` row tagged with the song's metadata (Spotify track ID, artist, album, mood vector inferred from track features). When two matched users have ≥5 songs in common, the messaging service surfaces a Beats card in the chat header.

The 14-song overlap between Priya and Arjun is computed as the intersection of their `Beat` rows. The card UI ranks the overlapping songs by their mutual recency — the songs both added in the last 90 days surface first, because recency suggests current taste rather than archived favourites.

The system does not write a hard ranking signal off Beats overlap into the V4 ranker, because shared music taste is a too-strong selection bias for the demographic (everyone in Bangalore-Bombay-Bangalore creative-class twenty-somethings claims Frank Ocean). It is, however, a strong conversation-starter signal — the Beats card increases first-message-to-reply conversion by 18% in our beta.

Beats overlap also feeds the `vibe-momentum` signal in `aiPicks.ts`. If Priya consistently chats with matches who share ≥10 Beats songs with her, the daily AI Pick will weight Beats overlap more heavily in tomorrow's selection. The learner adapts to the individual.

The Beats card auto-surfaces. There is no "show me music match" button; the system decides when the overlap is meaningful and surfaces. The decision rule is: the card appears once per chat, on the first user-visit to the chat where the overlap exceeds the 5-song threshold, and persists for the life of the chat (it doesn't appear and disappear).

The play action (the ▶ button) opens the Spotify deep-link for the first overlapping song. The deep-link uses `spotify:track:{trackId}` and falls back to a web URL if Spotify is not installed. The play event fires `beats.play` for analytics; we do not store what Priya listened to, only that the play happened.

### 4.12 The polarity loop — the Friday hate-scroll

**What Priya feels.**

Friday evening, October 31, 8:11pm.

Priya has had a bad week of work. A project review went poorly on Thursday. Her boss was sharp. She opens Miamo. She is, by the system's measurement and by her own internal experience, in a foul mood.

She scrolls Discover. She swipes left on the first profile in under a second. She swipes left on the second in under a second. She does not read bios. She does not expand photos. By the tenth profile she has not right-swiped a single time. She taps the **i** icon on the eleventh and reads the explainer; her finger hovers over "show me less like this" but does not tap. She closes the app at 8:23pm.

The next morning, Saturday, she opens the app again.

The first batch is different. Closer to home. More familiar archetypes. Lower novelty. Higher Beats overlap. The system has read her Friday hate-scroll as a strong negative-polarity signal and has dampened novelty for the next 12 hours. She does not know. She just feels the app is calmer on Saturday morning, and she swipes right on the third profile.

**How the system does it.**

The polarity classifier (`algo/v8/polarity.ts`) reads Priya's last 30 events from the rollup and computes a `polarity` score on `[-1, +1]`.

The classifier looks at:
- Swipe velocity (fast left-swipes score negative)
- Bio-read rate (low rate scores negative)
- Why-card opens (multiple opens score negative; the user is questioning the ranker)
- Repeat-passes (re-seeing and re-passing scores strongly negative)
- Session abandonment (closing the app after a streak of left-swipes scores negative)
- Hesitation distribution shift (fast hesitations relative to her own baseline score negative)

On Friday at 8:23pm her polarity is `-0.71`. The `tracking-worker` writes this into `FeatureSnapshot.raw.polarity`.

The next time the Discover ranker runs for Priya — Saturday morning — it reads the polarity and applies a `noveltyDamper = 1 - max(0, -polarity)` to the `noveltyFit` ingredient. With polarity at -0.71, novelty is damped by 71%.

The system also reads the `depthOfEngagement` classifier (`algo/v8/depthOfEngagement.ts`) which produces a complementary signal on `[0, 1]`: Friday's session scored 0.08 (accidental-click level), Saturday morning's first session scores 0.42 (mid-engagement) and recovers to 0.71 by the time she finishes her first batch.

The polarity signal persists for 12 hours. After 12 hours the system reverts to neutral, because foul moods recover and the user should not be permanently penalised. The 12-hour window is tuned; it was 24 hours in early beta and produced a "the app feels stale" complaint, was lowered to 6 hours and produced a "the system overreacts" complaint, was settled at 12 hours.

The polarity loop is the clearest example of Miamo's measurement architecture in action. A user's bad evening becomes a signal. The signal informs the next session. The next session is calmer. The user does not feel manipulated; the user feels seen. The whole loop is gated by the `mood inference` consent toggle.

The negative-polarity behaviour is also distinct from the positive-polarity behaviour. A user who is in a strong positive mood (high curious, high receptive, many right-swipes, many bio-expands) does NOT get a novelty-boosted stack the next session. Positive mood does not amplify novelty; it just doesn't damp it. The asymmetry is by design — we are trying to protect against bad sessions, not engineer ecstatic sessions.

---

## 5. The deep-compat side — DTM, Family Brief, the matrimonial layer

Most users come to Miamo on the casual-to-serious spectrum. DTM is the surface for the marriage-minded subset — explicitly Indian, explicitly family-aware, explicitly slower. It is not the main surface. It is a tab Priya opens once a day or once a week, not once an hour.

### 5.1 What DTM is, in user terms

**What Priya feels.**

DTM is a separate tab. It does not do infinite stack. It does one question a day.

The question is short:
- "What's your idea of a great Sunday with someone you love?"
- "What do you do when you and a partner disagree?"
- "How do you handle money in a relationship?"

The answers are four choices plus a free-text option. She picks one. Three minutes later, the system surfaces one curated match for the day. Not ten. Not a stack. One.

The one match comes with a longer presentation than a Discover card. The "here's why" expands into three or four sentences of explainer. The "Family Brief" button is available. The "Bookmark for tomorrow" button is prominent. The energy of the surface is different: it is slow, considered, designed to be opened in the morning over coffee or at night with the lights low, not in line at the grocery store.

Priya, over four weeks, builds a 16-topic affinity vector by answering one question a day. After four answered topics (the `minTopicsForCompat` threshold) DTM starts surfacing curated matches. After 16 — the `fullThreshold` — DTM treats her as fully covered and runs the full weighted cosine. The Family Brief feature lives only here, because this is the surface where the family enters the loop.

### 5.2 The 16-topic vector

DTM has its own algorithm family (`algo/dtm.ts`, `algo/dtmV6.ts`, support in `algo/dtm*.ts`).

The 16 topic indices are fixed and must never be reordered (vector rebuild would be required). Topics 0..15:

```
0  values        — what you stand for, ethically and practically
1  lifestyle     — daily rhythm, routines, weekend mode
2  communication — how you talk, listen, navigate disagreement
3  intimacy      — physical and emotional closeness
4  family        — your origin family, expectations, integration
5  finance       — money mindset, savings vs spending, equity in a relationship
6  conflict      — how you fight, repair, recover
7  growth        — learning, change, ambition
8  leisure       — what you do for fun, alone and together
9  faith         — religion, spirituality, meaning-making
10 ambition      — career, achievement, drive
11 autonomy      — independence, personal space, individual time
12 social        — friends, family-of-choice, community involvement
13 health        — physical, mental, lifestyle wellness
14 parenting     — kids? when? how? values around raising them
15 future        — long-term life plan, timeline, geographic preferences
```

The topology is deliberate. Topics 0-2 are foundational; they are surfaced early in a user's DTM journey because they have the highest signal-per-question. Topics 3-6 are mid-tier; they require more comfort with the app and are surfaced after the user has answered at least 2 foundational questions. Topics 7-11 are growth-oriented; they are surfaced once the user has demonstrated DTM engagement (≥ 5 answered topics). Topics 12-15 are future-oriented; they are surfaced only to users in the `sufficient` or `full` coverage stage.

The 16-topic order is a load-bearing decision. Reordering would require a vector rebuild and would invalidate every existing `DtmMessage` row's cosine pre-cache. The order was set in v6 and has not changed.

### 5.3 Cold-start stages

DTM coverage is binned into four stages:

| Stage | Topics answered | Affinity weight | Behaviour |
|---|---|---|---|
| `empty` | 0 | 0.0 | No DTM matches surface; only the daily question is shown. |
| `sparse` | 1-3 | 0.25 | DTM matches surface, but compatibility scores are heavily blended with the neutral prior (0.5). |
| `sufficient` | 4-9 | 0.75 | DTM matches surface with high confidence; coverage weight begins to dominate. |
| `full` | 10+ | 1.0 | DTM matches use the full weighted cosine; coverage weight is at unity. |

The V6 formula is:

```
rawCosine    = cosTo01(weightedCosine(me, cand, w))
coverageWt   = min(meReport.affinityWeight, candReport.affinityWeight)
blended      = coverageWt * rawCosine + (1 - coverageWt) * 0.5
sharedMass   = Σ min(|meᵢ|, |candᵢ|)
bonus        = 0.05 * sharedMass
score        = clamp01(blended + bonus)
```

Registered v3.6 weights: `weightedCosine 0.85, sharedMassBonus 0.05, coverageBlend 0.10`.

The DTM topic-mask (v3.6.0) takes mood + window-shopping + coverage and computes a skip set passed to `buildMaskedDtmFeed`. The mask is the v3.6 addition; it gates which topics are eligible for the day's question based on the user's current mood vector.

The mask rules are:
- If `fatigued ≥ 0.5` and `localHour ≥ 23`: skip `intimacy, conflict, finance`.
- If `rage ≥ 0.3`: skip `conflict, family`.
- If polarity in last hour `≤ -0.5`: skip all topics except `lifestyle, leisure, growth`.
- If coverage is `empty` or `sparse`: prefer `values, lifestyle, communication` over deeper topics.
- If coverage is `full`: rotate through topics by recency (least-recently-answered first).

### 5.4 How Priya's DTM coverage grows over a month

**Day 1.** Priya opts in to DTM. She is shown a values question: "What matters most to you in a partner — kindness, ambition, humour, or stability?" She picks ambition. Coverage: 1/16, stage `sparse`. No matches surface today.

**Day 4.** She has answered values, lifestyle, communication, growth. Coverage: 4/16, stage `sufficient`. The first DTM match surfaces — a 31-year-old engineer in Bangalore named Vikram. Her cosine against him is 0.74 (blended with 0.25 prior because both are at `sufficient`). The explainer surfaces 3 topics.

**Day 10.** She has answered 8 topics: values, lifestyle, communication, growth, leisure, social, family, ambition. Coverage: 8/16, still `sufficient` but approaching `full`. Match scores are increasingly grounded. The system now starts surfacing matches whose own coverage is at least `sufficient`.

**Day 14.** She is bookmarking matches more often than not. The deferred pile has 5 items. The system reminds her, gently, that the deferred pile has items waiting.

**Day 20.** She has answered 11 topics. Coverage: 11/16, stage `full`. The DTM ranker switches from coverage-blended to full weighted cosine. Her matches now score with the full 0.85 weight on weighted cosine.

**Day 30.** She has answered 14 topics; the 15th and 16th are future and parenting, which the system surfaces last. Coverage: 14/16, stage `full`.

**Day 45.** She answers parenting. Coverage: 15/16. The system has been holding parenting for last because parenting is the highest-emotional-stakes topic; it's only surfaced once the user has demonstrated commitment to the DTM surface.

**Day 60.** She answers future. Coverage: 16/16, stage `full`. Her DTM matches now run on the full weighted cosine and the explainer can confidently call out per-topic gaps.

The 60-day full-coverage timeline is by design. DTM is slow on purpose. The system does not push the user to fill out the full vector in a day; the value of DTM is that it surfaces matches the user has thoughtfully evaluated themselves on. A rushed DTM is a noisy DTM.

The "answer 16 in 60 days" cadence is one-topic-every-3.75-days on average. We A/B'd cadences of 1/day, 1/3-days, 1/week, 1/2-weeks. 1/3-4-days won — fast enough that the vector grows in a meaningful timeframe, slow enough that the user has time to actually think about the answer.

### 5.5 The Family Brief integration

The Family Brief lives only on the DTM tab.

There is no Family Brief button on Discover, no Family Brief button in Chat. The intentional surfacing on DTM communicates: this is the surface where the family enters the loop. The user who is in casual-scroll mode on Discover should not be sharing bio-data cards with their parents.

The technical integration: the `FamilyBriefShare` row references both the sharer's `userId` and the target user's `targetUserId`. The Family Brief is generated FOR a specific candidate, FROM a specific user, BY a specific request. The target user is notified when their card is generated (`family_brief.generated_about_me` event) but not when it is viewed by the sharer's family. The view stream is private to the sharer.

The Family Brief data sources:
- **Photo:** from `Profile.photos[0]`, the primary profile photo, with EXIF stripped.
- **Name + age + city:** from `Profile`.
- **Profession + education:** from `MatrimonialProfile` (Indian-context fields that exist on the matrimonial schema but are not in the standard `Profile`).
- **Family details:** from `MatrimonialProfile.familyBackground` (free-text, user-edited).
- **Kundli:** auto-computed from `VibeCheck.birthDetails` if the user has filled them in, else marked TBD.
- **Preferences:** from `DiscoverFilter` (city, age range, vegetarian, etc.), translated into bio-data language.

The Family Brief is data the user has already given the app. The Family Brief does not invent or infer. It surfaces what is on file in a format the user's family will recognise.

The Image format is the most-used (63% of shares in beta), followed by PDF (25%) and Text (12%). The Image format is preferred because WhatsApp's image-preview surfaces it inline; the recipient sees the card before tapping. The PDF format is preferred for older recipients who want to print or save. The Text format is the lightweight fallback.

The Family Brief is read-only by design. There is no path from the card back into the app for the recipient. The recipient cannot like, swipe, message, or comment. The card is a fact-sheet; the conversation it triggers happens off-app, in WhatsApp or in a phone call, between the user and their family.

### 5.6 Why caste is in the schema but never in the algorithm

`MatrimonialProfile` carries a `caste` field.

The field exists for cultural completeness — it would be conspicuous in its absence on an Indian matrimonial product, and Indian families do, in practice, ask about caste. The field is user-editable and user-visible on their own profile.

The field is NOT read by any ranker, any filter, any algorithm in `services/shared/src/algo/`. There is an explicit unit test (`services/shared/src/algo/__tests__/caste-exclusion.test.ts`) that asserts the string `'caste'` does not appear in any V4, V6, V7, or V8 ranker code path. The test runs on every CI pass. If a developer ever accidentally adds caste as a filter or a weight, the test fails and the build fails.

The Family Brief does NOT include caste. The bio-data card surfaces education, profession, family, kundli, preferences — but not caste. The decision was deliberate: the family member viewing the card may ask about caste in conversation, but the card itself does not lead with it. The product takes a position.

The position is: caste is information the user has volunteered about themselves. It is allowed to exist on their own profile because removing it would be paternalistic. It is not allowed to shape who they see, because amplifying the existing pattern of caste-based matching would be antithetical to the product's bet on serious relationships across the demographic.

The product can be criticised for this. Some users explicitly want caste-filtered matching. Some families explicitly require it. We have chosen to not provide the surface for it. The trade-off is real and is documented.

---

## 6. What Miamo refuses to do

A short, important list. Each refusal is a deliberate product decision, and each has a `// because:` rationale somewhere in source.

### 6.1 No infinite scroll on the deep-compat side

DTM is one question, one curated match a day. The Weekly Top-10 is named, dated, bounded. Discover stays a stack but is rate-limited by the V8 multi-objective layer to avoid the Pinterest-style "scroll until you collapse" attractor.

The reason: infinite scroll trains the user to evaluate in seconds. Deep compatibility takes longer than a second to read. The product surface must match the cognitive task. Discover, for fast browsing, is a stack; DTM, for slow evaluation, is a card-a-day. The mismatch between scroll cadence and decision cadence is the single biggest UX failure of incumbent apps in the marriage-minded market.

The Discover stack itself is bounded: ten cards at a time, with a refresh-on-pull that fetches the next ten. There is no "scroll forever" loop. The boundary is intentional. When the user has seen and acted on ten, the system asks "want another batch?" rather than auto-loading. The cognitive frame is "I evaluated ten people" rather than "I scrolled until I gave up."

### 6.2 No paid boost

v3.6.0 introduces earned visibility via `ExposureLedger`, not bought visibility.

A user accrues credits through positive engagement (slow careful swipes, bio reads, replies); premium adds a 1.5× multiplier with a hard ceiling at 2× (so the gap to a non-premium top-engaged user is bounded).

The reason: pay-to-promote creates a structural inequality between paying and non-paying users that is not aligned with relationship outcomes. A user who has paid for a boost is not necessarily a better candidate; they are a paying candidate. The two correlate weakly. Miamo's premium tier accelerates priority but does not create it; the floor is engagement, and engagement is available to every user equally.

The boost button is also a perverse instrument in another way: it amplifies the user's profile to the next 100 viewers, but the next 100 viewers are not necessarily the right 100 viewers. Boost is a quantity mechanism in a quality problem. Boost increases impressions; it does not increase compatibility. Miamo's ranker increases compatibility; it does not need a boost.

### 6.3 No reverse-engineering of tracking IDs

Every user ID in the tracking pipeline is HMAC-SHA256 hashed to 22 base64url characters before it touches Postgres. Algorithms compare hashes; they cannot identify the user. Rotating `TRACKING_HASH_SECRET` is the right-to-be-forgotten mechanism — it cryptographically severs all historical aggregates from the user.

The reason: the tracking tables are the densest single source of user behavioural data in the system. If they were keyed by raw `userId`, an internal actor or an external breach could reverse-engineer the dataset back to individuals. The HMAC layer is the cryptographic firewall. The secret rotation as RTBF is the elegant consequence: when a user requests deletion, the secret rotates, and every existing aggregate row becomes unlinkable. The user's row stays in the aggregate (so the aggregate's statistical validity is preserved) but the row can no longer be tied to them.

The HMAC truncation to 22 base64url characters (≈ 132 bits of entropy) is a balance between storage efficiency and collision resistance. At 50M users, the birthday-bound collision probability is ~10^-25. The truncation is intentional; longer hashes are storage waste, shorter hashes are collision-prone.

### 6.4 No reading user chats

Messages are AES-256-GCM encrypted with a per-message key.

The DBAs cannot read them. The Move composer reads only the user's own sent-message stylometry (their own voice), not anyone else's.

The reason: chat is the most private surface in the product. The encryption contract is, when a user sends a message, the message is unreadable by Miamo. This is technically true and operationally enforced: the encryption key is derived from a per-chat secret that the DBAs cannot access. The Move composer's access to a user's own outbound messages is the only exception, and it is gated by the `Move v2 suggestions` consent toggle in Settings.

The consequence of this design: Miamo cannot moderate chat content automatically. Reports of inappropriate messages must be filed by the recipient, and the moderation flow involves the recipient sharing the offending message. This is a real product trade-off. We chose privacy.

The trade-off is documented in `SECURITY.md` and in the user-facing privacy policy. The moderation team has a path to read a message only when the recipient explicitly shares it via the "Report" flow; in that flow, the recipient's client decrypts the message and uploads the plaintext alongside the report. The moderation team never has direct DB-level read access to chat content.

### 6.5 No caste filtering

`MatrimonialProfile` carries a caste field for cultural completeness (it would be conspicuous in its absence on an Indian matrimonial product) but the filter and ranker code is explicitly forbidden from reading it. There is a unit test that asserts this — `services/shared/src/algo/__tests__/caste-exclusion.test.ts`. See §5.6.

### 6.6 No silent algorithm changes

Every algorithm is gated by an environment-variable feature flag. Every weight has a `// because:` comment in source. Every change to a weight or threshold requires a contract-test pass plus a worker re-rollup. The "why-am-I-seeing-this" endpoint is the human-review path required by GDPR Article 22.

The reason: the ranker shapes Priya's social experience. Silent ranker changes — the way incumbents push A/B variants without disclosure — produce a population that does not understand why their dating life feels different in different weeks. Miamo's contract: every algorithm has a flag, every flag is documented, every weight is commented, every weight change is reviewed.

The contract has a sharp edge. A developer who wants to change a weight cannot just change the number; they must:
1. Edit the `// because:` comment to explain the new rationale.
2. Add a contract test that asserts the new ranking behaviour.
3. Run the worker re-rollup so the aggregates align with the new weight.
4. Document the change in the next release notes.

The friction is deliberate. Friction-on-change is the structural alternative to silent drift.

### 6.7 No infinite re-shows of passed profiles

v3.5.1 hotfix.

The Discover ranker filters out any profile the user has passed (left-swiped) in the last 30 days. This is a hard filter, not a soft demotion.

The reason: re-seeing a profile the user has already evaluated and rejected is the strongest signal of a broken ranker. The user's lived experience of "this app keeps showing me the same person" is a sin of the highest order in dating-app UX.

The 30-day window is tuned. Below 30 days produced complaints. Above 30 days produced false-negatives where a user had genuinely changed their mind. 30 days is the negotiated compromise.

The hard filter is implemented at the candidate-pool level, not at the ranker level. The candidate-pool query (the SQL that selects the 200 candidates the ranker scores) excludes any user the requesting user has left-swiped in the last 30 days. By the time the ranker runs, passed users are already gone. There is no ranker-side check, because a ranker-side check would still spend the compute and could be bypassed by edge cases.

### 6.8 No notifications outside the user's open-window

`notifyTiming.ts` will not fire a notification at 3am unless the user has demonstrated, in their last 28 days of `session.start` events, that 3am is in their open window. The default behaviour is: hold the notification until the next open window.

The reason: dating apps that ping at 3am produce dismissal, then resentment, then deletion. The cost of a delayed notification is much smaller than the cost of an ill-timed one.

The exception, documented in §4.10, is active-conversation notifications: if both parties have sent a message in the last 60 minutes, the bell fires immediately regardless of window. Active conversations need real-time responsiveness; cold notifications need chronotype-windowing.

### 6.9 No dark patterns in Settings

The Settings → Personalization & Privacy section is four toggles, each with a clear one-sentence description of what it does.

The toggles are independently controllable. The defaults are conservative (mood inference ON for users who opted in at onboarding; OFF for users who skipped). There are no confirmation modals that bias the user toward keeping a toggle ON. There are no "are you sure" pop-ups that punish the user for toggling OFF.

The reason: consent toggles that are buried, defaulted aggressively, or wrapped in friction are not consent. They are coercion. Miamo's contract: if the user toggles OFF, the system honours the toggle within the next worker tick (≤ 30 seconds in practice).

The four toggles:
1. **Allow mood inference** — the `intentInference` worker uses behavioural signals to estimate mood and intent. Off: ranker uses neutral defaults.
2. **Participate in exposure ledger** — your engagement earns credits toward Weekly Top-10 eligibility. Off: you do not appear in others' Weekly Top-10 and do not receive your own.
3. **Allow Move v2 suggestions** — the ✨ Suggest composer reads your sender voice and proposes drafts. Off: the button is hidden; you compose unaided.
4. **Allow Family Brief generation** — your DTM matches can generate a bio-data card to share with their family. Off: the 📋 button does not appear on your card for other users.

Each toggle ships with a one-paragraph "what this does in plain English" expandable section beneath it. The plain-English text is read by the legal team for clarity and by the design team for tone.

### 6.10 No silent data collection without opt-in

The tracking pipeline collects ~65 event types from the user's session. The collection is disclosed at onboarding ("we instrument what you do in the app so we can rank matches better") and is gated by an onboarding consent.

A user who declines the tracking consent at onboarding has a degraded experience — the ranker falls back to stated-preference-only matching, which is what every other app does — but is not blocked from using the product. The choice is real.

A user who opts in at onboarding can revoke the consent later by toggling off all four Personalization & Privacy switches. The revocation does not delete historical data (that requires a separate RTBF request) but does stop new collection.

### 6.11 No selling user data to third parties

Miamo does not sell user data. Period. The business model is subscriptions (premium), not data resale. The privacy policy says so. The contract is enforced by the absence of any data-export endpoint to a third party; we don't have the pipes to sell data even if we wanted to.

The reason: a dating app that sells user data is, in the user's mind, no longer a dating app. It is an ad-targeting product. The two are incompatible. We chose the subscription model so we could be the former.

---

## 7. The roadmap — what is shipped vs what is planned

### 7.1 Shipped (v3.5 and earlier)

| Feature | Surface | Algorithm |
|---|---|---|
| Discover stack | Discover tab | `forYou` + 16 other V4 ingredients |
| Matches | Matches tab | recency + reciprocal-V4 rerank |
| Encrypted chat | Chat tab | AES-256-GCM |
| AI Picks | Home | `aiPicks` |
| DTM | DTM tab | `dtm` + `dtmV6` |
| Feed | Feed tab | `feedAugment` + `postImpressionRerank` |
| Beats | Chat | `beats` |
| Notifications | Bell | `notifyTiming` |
| Vibe check | Onboarding | `completion` |
| Verification | Profile | trust signal |
| Creativity showcase | Showcase tab | `spotlight-ledger` v1 |

### 7.2 Shipped (v3.6.0)

All 8 systems live, gated by feature flags, default-off in production until the AB ramp completes:

1. **Real-time intent inference** (`intentRightNow.ts`, worker `intentInference.ts`)
2. **Real-time mood inference** (`moodRightNow.ts`, same worker)
3. **Polarity classifier** (`polarity.ts`, hooked into Discover ranker via `noveltyDamper`)
4. **Depth-of-engagement classifier** (`depthOfEngagement.ts`, ingredient in V8 recipe)
5. **Earned-visibility ledger** (`exposureCredits.ts` + Prisma models `ExposureLedger`, `ExposureCredit`)
6. **Weekly Top-10 stable match** (`stableMatchTop10.ts` worker + `galeShapley.ts` + `WeeklyTopMatch` Prisma model)
7. **Singh-Joachims fairness rerank** (`fairnessRerank.ts`, applied on every Discover query)
8. **Multi-objective filter ranking** (`multiObjective.ts`, the V8 composition layer)
9. **Move v2 composer** (`moveV2/` directory, 5-stage pipeline)
10. **Voice fingerprint reveal** (`senderVoice.ts#voiceToArchetype` + canvas-render UI)
11. **Family Brief generator** (`familyBrief.ts` + `FamilyBriefShare` Prisma model + Puppeteer render)
12. **Anti-ghost chat deposit** (`antiGhost.ts` + `SpotlightLedger` extensions)
13. **DTM topic mask** (`dtmTopicMask.ts`, layered on `buildMaskedDtmFeed`)
14. **Festival hooks** (13-festival 2026 calendar in `festivalCalendar.ts`)
15. **Article-22 why-explainer** (`GET /api/v1/discover/:targetId/why`)
16. **Four Settings consent toggles** (mood inference, exposure ledger, Move v2, Family Brief)
17. **Premium 1.5× signal** wired into every relevant ledger entry

### 7.3 Deferred (v3.7+)

| Item | Reason for deferral |
|---|---|
| Voice-note transcription | Out of scope until reliable Hindi-mixed ASR ships at <300ms p50. Current best-in-class (Whisper-large) is ~1.2s on an M2; the latency budget for chat is < 500ms. Wait for hardware/model improvement. |
| Live patent-counsel review | Legal, not engineering. `docs/legal/patent-clearance.md` documents the design-around paths. Counsel review scheduled Q1 2027. |
| DPIA completion | Legal, not engineering. `docs/legal/DPIA-template.md` is drafted. Completion blocked on legal review. |
| Real-traffic AB ramp | 8–12 weeks of guardrail observation. Not a single-session task. Blocked on QA sign-off of all 8 v3.6.0 systems. |
| Cross-platform native apps | The web app is the canonical surface. iOS/Android are wrapped versions of the web. A native rewrite is a v4 conversation. |
| Voice fingerprint v2 | The current voice fingerprint is single-archetype. A v2 with multi-archetype blends and per-topic voice (you talk about food differently than you talk about work) is on the roadmap. |
| DTM partner-question flow | A user invites a candidate to answer a topic together. Strong product appeal; technical complexity is non-trivial. |
| Group-event discovery | "Find others going to the same Lodi-festival event." Tested in alpha, paused for moderation concerns. |
| Voice-fingerprint AB on share-rate | Test variants of the card design to optimise the share-to-Instagram rate. Held until v3.6.0 ramp completes. |

### 7.4 Open questions, in priority order

1. **Whether the 0.06 weight for `intentRightNowFit` is high enough to move metrics under AB.** If after 14 days at ramp 1.0 there is no measurable lift, raise to 0.08 (env-tunable).
2. **Whether the gender-conditional Gini target of 0.40 is right for India.** Held provisional pending one full quarter of fairness-audit data.
3. **Whether the Family Brief PDF format is preferred to Image in regions where WhatsApp has compression limits.** Held pending qualitative feedback from the first 1,000 shares.
4. **Whether the 72-hour anti-ghost window is the right calibration.** Beta users in Tier-1 cities favour 48h; users in Tier-2/3 cities favour 96h. The 72h compromise may need to become region-conditional.
5. **Whether the weekly Gale-Shapley should run by user-local Sunday or by UTC Sunday.** Currently UTC; under consideration is per-user-local Sunday with a 7-day rolling pool.
6. **Whether the Voice Fingerprint share-to-Instagram intent should also support Twitter/X and Snapchat.** Currently Instagram-only because Instagram is the share surface in our beta cohort.
7. **Whether DTM should support a "ask my partner this question too" sharing flow,** where a user can invite a candidate to answer a topic together. Strong product appeal; technical complexity is non-trivial.
8. **Whether the polarity 12-hour window is correct for all cohorts.** Initial data suggests women score more negative polarity in late-evening sessions than men. Open question whether the window should be gender-conditional.
9. **Whether the 50-message threshold for the Voice Fingerprint is universal.** Some users have 50 messages by Day 3; others have 50 by Day 30. The cohort-specific cadence may matter.
10. **Whether the multi-objective layer should expose its objective weights to power users.** "I want to see more fairness, less novelty" as a user-tunable slider. Strong feature appeal; high risk of users tuning themselves into bad outcomes.

---

## 8. A second persona — Karan's week on premium

Priya is the median user. Karan is the experienced user.

He is 32, lives in Defence Colony in South Delhi, works as a growth lead at a venture-backed fintech, and has been on dating apps for four years. He has paid for Tinder Gold, Hinge Preferred, and Bumble Premium at various points. He has, in his own words to a friend at a wine bar in November 2025, "given up on the apps." A month later he downloaded Miamo because a colleague said something different was happening. He paid for Premium on Day 3.

What follows is Karan's first full week on Miamo. The arc is different from Priya's. Priya's arc is discovery; Karan's is recovery.

### 8.1 Day 1 — Onboarding (Monday, October 27)

**What Karan feels.**

Karan downloads Miamo at 11pm on Monday. He has had two beers. He is curious but cynical. The onboarding asks him 12 questions. He answers them with more honesty than he normally would on these apps — the questions are not "what's your favourite pizza topping," they are "what are you looking for in the next twelve months?" and "what does success mean to you?"

He answers: serious-leaning casual, not in a rush, prefers depth over volume.

He is asked, on the last screen, whether he wants to upgrade to Premium. The pitch is short and unusually honest: "Premium gets you a 1.5× visibility multiplier (hard ceiling 2×), priority on Weekly Top-10 eligibility, and accelerated Move composer pacing. It does not buy you matches. Engagement still matters." He skips. He has been burned by premium tiers before.

**How the system does it.**

Karan's onboarding answers write to `Profile`, `Settings`, and `VibeCheck`. The `completion.ts` score is 0.91 — high.

His `intentVec` cold-start prior is `{intentional_browse: 0.42, serious_search: 0.38, casual_scroll: 0.10, distraction_browse: 0.04, reply_mood: 0.03, review_existing: 0.02, decision_fatigued: 0.01}`. Weighted heavily toward thoughtful.

His chronotype is inferred from his timezone + the timestamp of his first session: late-evening user. The `DailyMatchWorker` schedules his first AI Pick for the next day at 8pm local.

His consent toggles default to OFF because he skipped the personalization disclosure at onboarding. The mood inference will not run for him. The exposure ledger will not credit him. The Move v2 button will not appear. The Family Brief generation is hidden. He is on the v3.5 experience.

### 8.2 Day 2 — First Discover session (Tuesday, October 28)

**What Karan feels.**

Karan opens the app at 8:42pm. Ten profiles. He scrolls slowly. He has, on previous apps, swiped through batches in under a minute; tonight he reads.

He notices that the bios are longer than he is used to (Miamo's onboarding nudges users toward 80+ words; the median is 110). He notices that the first three profiles are not the same archetype — one is a designer, one is a chef-turned-consultant, one is a researcher at IIT Delhi. He expands the bio on the second. He swipes right. He expands the bio on the fourth. He swipes right.

By the end of the stack he has right-swiped on three out of ten, which is higher than his normal rate but feels natural.

**How the system does it.**

Karan's session writes 134 events over 8 minutes. The V4-only ranker (his v3.5 experience) is reading his stated-intent vector and his sparse early-session behaviour. The top of the stack is dominated by candidates who match his stated chronotype and intent: late-evening, serious-leaning.

His hesitation p50 is 1.2 seconds (slow, thoughtful). His dwell mean is 19s per card (high). His bio-expand rate is 4/10 (high). These are all signals that go into his `EventAggDaily.meta.hist` for tomorrow's ranker pass.

His three right-swipes are also tracked: candidate IDs, position in the stack, swipe direction, hesitation. None of his three matches were in positions 1-2 (he passed on the auto-curated top); two were in positions 4-5 (the middle of the stack where the ranker has lower confidence); one was in position 8. The ranker's hit rate on Karan tonight is 30%, which is decent for a Day-1 user.

### 8.3 Day 3 — Premium upgrade (Wednesday, October 29)

**What Karan feels.**

Karan opens the app at 7:15pm. His three matches from yesterday have all sent a first message. He reads them. Two are bland; one is engaging. He replies to the engaging one (her name is Devika; she is a 30-year-old chef in Saket). The conversation flows. After 45 minutes he closes the chat and finds himself looking at the Premium upgrade screen again.

The pitch is the same. He thinks about it for a moment. He has, by this point in the week, formed a working hypothesis: this app might actually be different. He pays.

He also, on the upgrade flow, sees a second screen: "Would you like to enable Personalization & Privacy features? These let the app adapt to your real-time mood and intent. You can turn them off at any time." He thinks. He toggles them all on.

**How the system does it.**

Karan's `Subscription` row is written. His `User.isPremium` flag flips to true.

The next worker tick reads the flag and updates his exposure-credit accrual rate (1.5× on every credit-earning event), his anti-ghost bonus rate (1.5× on every reply-bonus payout), and his eligibility threshold for Weekly Top-10 (he can be considered with ≥20 credits instead of the standard ≥30).

His Personalization & Privacy toggles flip to ON. The `intentInference` worker now runs for him. The exposure ledger accrues credits to his `ExposureLedger` row. The Move v2 button appears on his chat composer. The Family Brief generation is enabled.

The premium multiplier is documented in the help center as "1.5× on visibility-related events, hard ceiling 2× on any single user's effective multiplier." The hard ceiling exists because a user who happens to score on multiple multiplier-eligible events (premium + high-engagement bonus + festival hook + cold-start boost) could otherwise hit 4× or 5× combined. The 2× ceiling caps the gap between the most-multiplied and least-multiplied user.

### 8.4 Day 4 — The first Move composition (Thursday, October 30)

**What Karan feels.**

Karan has matched with a new candidate, Anya, on Wednesday. He has been thinking about how to open. He has not opened a chat yet. On Thursday morning he opens the chat and stares at the composer for 30 seconds. He taps ✨ Suggest. Five drafts appear. One reads:

> "your linkedin says product strategy and your last reel is a kheer recipe — i need to know how those connect."

He picks it. He laughs at the audacity of it. He sends. Anya replies in 90 minutes with a thoughtful answer. They are off to the races.

**How the system does it.**

Karan has not yet sent 50 outbound messages, so his sender voice vector is sparse and falls back to the archetype prior.

His archetype is inferred from his onboarding answers + his swipe behaviour + his bio: `wordsmith` with confidence 0.61 (medium-low because of sparse data). The Move composer uses Anya's receiver resonance (she is a fast-replier archetype) and selects hooks: `recent_post` (her kheer reel from two days ago — fires hard), `cross_reference` (the LinkedIn-Instagram disjunction — fires hard), `cold_open` (deboosted because cross_reference fired).

The composer produces 12 candidates, 7 pass the linter, top 5 returned.

His acceptance of suggestion #3 fires `move.suggestion_accepted` with `suggestion_index: 2, edit_distance: 0`. His sender voice vector is updated: this is now message #14 outbound in his account; he is on his way to 50.

The suggestion he picked is the kind of opener Karan would never have written himself — it has a directness that feels confrontational on first read and clever on second read. The Move composer is willing to surface drafts the user would not have written, because the user is judging from a clean state and the composer is judging from the receiver's resonance vector. The two are not the same. The composer is asking "what would Anya respond to?" and Karan, alone, was asking "what should I write?"

The asymmetry of those two questions is the value of the composer.

### 8.5 Day 5 — Anti-ghost in action (Friday, October 31)

**What Karan feels.**

Karan has matched with three new candidates this week. On two of those chats he has already messaged. On the third — Meera, 28, journalist in Connaught Place — he has been holding off.

On Friday night he writes the first message. The anti-ghost modal appears: "1 Spotlight minute deposit. If Meera replies in 72 hours, get it back plus a bonus." He has 14 minutes in his ledger. He confirms.

He also remembers Aisha, whom he messaged on Wednesday with a deposit. She has not replied. The 72-hour window expires Saturday at noon. He thinks about the burn coming and feels mildly bad about it. He composes the Meera message more carefully than he would have without the deposit. He sends.

**How the system does it.**

Karan's `SpotlightLedger` now has two hold rows: the Aisha hold (expiring Saturday noon) and the Meera hold (expiring Monday night).

The `antiGhostSweep.ts` loop runs every 5 minutes. At Saturday 12:00 it writes the Aisha burn:

```
{kind: 'antiGhost.burn', amount: 0, chatId: <aisha-chat-id>, sweptAt: 2026-11-01T12:00:00Z}
```

(The -1 was debited on hold open. The burn row is a record-of-burn, not a second debit.)

At Saturday 11:00am, Meera replies — `closeDeposit({chatId, outcome: 'replied'})` fires the release + bonus rows:

```
{kind: 'antiGhost.release', amount: +1, chatId: <meera-chat-id>}
{kind: 'antiGhost.bonus',   amount: +1, chatId: <meera-chat-id>}
```

Premium accelerates the bonus: 1 bonus × 1.5 = 1.5 → rounded up to 2. The bonus row is `+2`, not `+1`.

Karan's ledger now has the Meera deposit returned (1m), the Meera bonus (2m, premium-adjusted), and the Aisha burn (-1m, but already debited on hold open so the burn row is a no-op on balance). Net effect from the Meera chat: +2 minutes.

Karan's daily-cap counter shows he has 1 open hold (Meera's, until it closes Monday). He can open up to 3 simultaneously. He is well under cap.

The anti-ghost mechanic also writes to his learner profile. His acceptance of the deposit modal (he tapped Confirm, not Cancel) is a `move.deposit_accepted` event. His message length on the Meera chat (longer than his average) is a `move.composed_with_care` event. The learner correlates deposit-accepted with reply-rate and finds, for Karan's cohort, that messages with a deposit have 2.3× the 72-hour reply rate of messages without one. The data feeds back into the cohort-level tuning of the deposit amount and the bonus amount.

### 8.6 Day 6 — Saturday: the exposure ledger grows

**What Karan feels.**

Karan has been on the app for six days. He has earned, by his observation, "a lot of credits" — but he doesn't see them in a number anywhere. The exposure ledger is invisible to him; what he sees is that his Weekly Top-10 tab is closer to ready (the countdown at the top reads "new batch in 18h"). He also notices that one of the profiles he viewed on Tuesday came back into his Discover stack today — not because the system was repeating itself, but because the stack is reranked dynamically and her V4 score against his updated profile vector has moved up.

**How the system does it.**

Karan's `ExposureLedger` row has accrued 47 `ExposureCredit` entries through the week. Sources:
- 14 from bio-expands (+1 each)
- 11 from reply-within-24h actions (+3 each, but only counted once per chat)
- 8 from Move-composer-accepted suggestions (+2 each)
- 5 from why-card opens (+1 each)
- 4 from slow careful right-swipes (+2 each)
- 3 from chat sustained > 5 turns (+5 each)
- 2 from session-end-without-rage-close (+1 each)

Raw sum: 14 + 33 + 16 + 5 + 8 + 15 + 2 = 93. But the credit cap is +6 per user per day (to prevent gaming), so the daily-capped sum is closer to 47.

With the premium 1.5× multiplier his effective accrual is 70.5 credit-equivalents. He is well above the ≥20 threshold for Weekly Top-10 eligibility (premium-adjusted from the standard ≥30).

The ledger is invisible to him by design. We tested an explicit "you have 47 credits" UI in beta and saw users start to game the credit-earning events (spam-expanding bios to earn credits). We removed the surface. The ledger is now back-end-only; the user experiences it as "the Weekly Top-10 surfaces well" rather than as "I have 47 credits."

The Tuesday-profile-returning is also a subtle UX choice. Most apps treat seen-and-not-acted-on profiles as "rejected by absence" and hide them. Miamo treats them as "evaluated but not committed" and allows them back into the stack after 48 hours if their V4 score against the user has moved up by at least 0.05. The threshold prevents loops; the 48-hour window allows for re-evaluation.

### 8.7 Day 7 — Sunday: the Weekly Top-10 lands

**What Karan feels.**

Sunday morning, November 2, 7:30am. Karan wakes. His phone has a notification: *"Your 10 most compatible matches for the week of October 26–November 1 are ready."*

He opens. A new tab with ten cards. He reads them. He recognises three from Discover but had not gone deep on them. Two are completely new to him. He spends 35 minutes on the tab, opening seven of the ten profiles, expanding bios, looking at photos. He likes four. He bookmarks three for later.

By Sunday evening he has a date scheduled with one of them — a 29-year-old film editor in Bandra named Saira — for the following Saturday at a cafe in Khar.

He looks at the app on Sunday evening with a different feeling than he had on Monday. He is no longer cynical. The app has, in seven days, delivered him three meaningful conversations, a date, and the absence of any of the failure modes he had come to expect from dating apps. He is, by Sunday, a believer.

**How the system does it.**

Karan's `WeeklyTopMatch` rows were written by the `stableMatchTop10.ts` worker at 00:00 UTC Sunday morning (which is 5:30am IST). His Gale-Shapley pass took his top-30 preference list (sorted by his V8 score over each candidate) and matched him against the symmetric preference lists. He was eligible by virtue of his exposure-credit total and his 7-day-active status.

His ten Top-10 candidates are NOT the same as his ten highest V8-scored candidates. The Gale-Shapley pass ensures stability — no two users would mutually prefer each other over their current matches. This produces an output where some candidates Karan would have ranked higher in his solo preference list are not in his Top-10 because they were stably matched with someone else.

The cost of stability is a small reduction in average pairwise V8 score (around -3% in our beta). The benefit is that every user sees a Top-10 that the matched users would also want to see; the matching is mutual.

The four likes Karan registered on the Top-10 fire `like.from_weekly_top` events with a `weekIso` tag, which lets the analytics distinguish Top-10 likes from Discover likes in the dashboard. The conversion rate from Top-10-like to first-message-sent in our beta is 2.4× the conversion rate from Discover-like to first-message-sent; the conversion rate from first-message-sent to reply is 1.8× higher.

The date Karan schedules with Saira will, three months from now, become one of the success stories the team reads in the weekly digest.

### 8.8 What Karan's week tells us about premium

Karan's premium subscription was a Day 3 decision. The conversion path was:
- Day 1: honest onboarding
- Day 2: thoughtful first Discover session
- Day 3: first real conversation (with Devika)

The premium decision came after the product had demonstrated value, not before. This is the inverse of the standard funnel where premium is sold upfront and the product is asked to deliver on the promise afterward.

The premium multiplier itself is invisible to Karan. He does not see "1.5×" anywhere in the UI. He sees that his Weekly Top-10 is good, his Move composer is responsive, his anti-ghost deposits resolve favorably. The multiplier is a back-end accelerant; the visible product is identical to the free version. This is a deliberate design choice. Premium that feels like a different product breeds two-tier resentment; premium that feels like the same product with smoother edges is more sustainable.

The 2× hard ceiling is the structural safeguard. Even at maximum stacking — premium (1.5×) + high-engagement (1.3×) + festival hook (1.05×) + cold-start boost (1.15×) — Karan's effective multiplier on any single event caps at 2×. A user who has none of those multipliers sees the floor; Karan sees the ceiling. The gap is 2×, not 10×. The gap is bounded.

Bounded gaps are the difference between fair systems and pay-to-win systems.

### 8.9 The economics of Karan's week, summarised

Karan paid for a Premium subscription on Day 3. He invested ₹999 for the month.

In return, in seven days, the system delivered:
- 3 meaningful conversations (Devika, Anya, Meera)
- 1 scheduled date (Saira)
- Roughly 70 exposure credits (premium-adjusted from 47 raw)
- 1 Weekly Top-10 surface with 10 curated candidates
- 4 Move composer suggestions accepted
- 3 anti-ghost deposits opened, 2 resolved with bonus, 1 burned
- 47 Discover sessions across the week
- 12 chat sessions across his three active conversations

The cost per scheduled date, on Day 7, is ₹999. The cost per meaningful conversation is ₹333. The cost per right-swipe is ₹14. The cost per matched-with-conversation is ₹333.

These numbers are not advertised. They are the back-of-the-envelope ROI calculation a churn-risk user would do. They are favourable. They are the structural alternative to the engagement-optimized model where the cost of a date is unbounded because the system does not deliver dates.

The premium subscription is, in Karan's experience, a fair trade. The product has done its job.

---

## 9. The "what Priya feels" closing moment

It is October 31, 2026. Saturday morning.

Priya has been talking to Arjun for three days. They have done one video call last night — 47 minutes, with three pauses where they just looked at each other in the soft Friday-night quiet. They have not yet met in person. They are planning to.

This morning, Priya is making coffee in her kitchen in Powai. Arjun, in Bangalore, has just sent her a long message about a trekking trip he is planning for the third weekend of November — Igatpuri, two days, a small group. He has asked her, with the soft framing of someone who knows the answer matters: *would you come?*

She reads the message three times.

She is in the early-morning light of her kitchen, the espresso machine has just sighed and gone quiet, and she is in the middle of saying yes.

The app has done its job.

The 17 V4 algorithms ranked the stack that Tuesday night and put Arjun at position three. The V8 multi-objective layer balanced relevance and freshness and fairness so that the stack felt right rather than gamed. The Move composer wrote the opener that did not sound like an app — that sounded, instead, like Priya on a good day. The fairness rerank quietly corrected for the gender skew so that he was visible to her despite being one of three thousand men her ranker considered that night. The why-explainer reassured her once, when she tapped the **i** icon, that the system's reasoning was something she could read. The right-now-intent layer noticed her fatigue and quieted the room. The Voice Fingerprint reveal turned her writing style into something she could be proud of and share. The Family Brief sat ready, on the DTM tab, for the conversation she will have with her mother in three weeks when she is sure.

None of this is visible to her. The product just feels right.

That moment — the realisation, the shared passion, the natural conversation, the slow build over days, not seconds — is what Miamo is for. Not swipes. Not the dopamine of a notification. Not the count of matches on a dashboard. The moment in a kitchen in Powai when the espresso machine has gone quiet and a woman is, in the slow Saturday light, saying yes to a weekend in Igatpuri with a man she met on the app three days ago.

That is the target.

Everything else is the system.

### 9.1 What it means for the product

Priya's moment is the unit of measurement.

Every algorithm in `services/shared/src/algo/` was written against the target of producing more moments like this. Every weight has a `// because:` that, traced back through the engineering history, ends in some version of "because we want more of those Saturday mornings."

The dashboard the team reads each week is not the DAU number. It is the count of users who reported a relationship that began on Miamo in the last 30 days. The number is small. The number is, on its own, not a number that would impress a venture investor or a product growth team at the incumbents. The number is, on the other hand, the only number that matches the product's stated purpose. Optimizing for it requires the discipline of not optimizing for the bigger, easier numbers.

The bigger, easier numbers — sessions per day, average session length, swipes per session, time to first match — are all tracked. They are not the target. They are guardrails. If they fall through the floor, something has broken. If they rise above the ceiling, the product is being addictive in a way it should not be. The target sits in between.

### 9.2 What it means for the team

The Miamo team is small. Engineers, designers, a couple of researchers. The codebase is large but the team is not.

The discipline of measuring relationships rather than engagement requires the team to make decisions that other apps' teams would not make. The team has, in the year leading to v3.6.0, declined to ship: a streak feature, a daily check-in notification, a coin-based gift system, a video-feed surface (separate from Stories), a public profile-view counter, and a "Boost yourself for 30 minutes" button.

Each of those features would have lifted engagement. None of them would have lifted relationship outcomes. Each was a decision that cost the team a quarter of speculative growth. Each was a decision that aligned the product with its purpose.

This is the discipline. It is unflashy. It does not produce growth-team headlines. It produces, in the long run, a different kind of product.

### 9.3 What it means for the user

Priya does not know any of this.

She does not know that the ranker put Arjun at position three on purpose. She does not know that the Move composer wrote the opener that did not sound like an app. She does not know that the fairness rerank protected her from the gender-skewed default that other apps would have served her. She does not know that the system noticed her fatigue and quieted the room.

What she knows is that, this Saturday morning, in the early light of her kitchen, she is saying yes.

The system, by design, is invisible to her.

The system, by design, is the reason.

---

## 10. License

Proprietary. Do not redistribute.

The Miamo source code, including the 17 V4 ranked algorithms, the 5 V7 modules, the 17 V8 modules, the DTM topology, the Move composer pipeline, the exposure ledger model, the Gale-Shapley weekly-top-10 worker, the Singh-Joachims fairness rerank, the anti-ghost mechanic, the voice fingerprint extraction, the Family Brief generator, and all supporting Prisma schemas, tracking events, feature flags, weights, and `// because:` comments, is the proprietary intellectual property of Miamo Inc.

This document, the entire `docs/` directory are confidential. Do not redistribute. Do not quote in public talks or external presentations without written permission. 

For licensing inquiries: founder@miamo.in.

For security vulnerability disclosure: security@miamo.in (PGP key in `docs/SECURITY.md`).

For press inquiries: press@miamo.in.

---

_End of `docs/PRODUCT.md`._

_For algorithm-level depth read [`ALGORITHMS.md`](./ALGORITHMS.md)._
_For system topology read [`ARCHITECTURE.md`](./ARCHITECTURE.md)._
_For the tracking pipeline read [`TRACKING.md`](./TRACKING.md)._
_For the Move composer deep-dive read [`MIAMO_MOVE.md`](./MIAMO_MOVE.md)._
_For the on-call playbook read [`RUNBOOK.md`](./RUNBOOK.md)._
_For the owner-level walkthrough read [`OWNER_GUIDE.md`](./OWNER_GUIDE.md)._
