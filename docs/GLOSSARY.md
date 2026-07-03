# Miamo glossary

This glossary is the alphabetical index to every term — product, technical, regulatory, and operational — that appears in the Miamo codebase and documentation. It is the single place to look up "what does X mean here" without having to read three docs.

Entries follow a fixed shape:

- A bold heading with the term as it appears in code or product copy.
- One or two sentences of plain-English definition — what a non-engineer needs to understand.
- Where useful, one sentence of technical context — how it is implemented or wired.
- A "See also" line pointing at the docs that elaborate.

The glossary is intentionally redundant with the longer docs. The longer docs explain *why*; this file just answers *what*.

Per the cleanup-prompt §4.D.15, every term mentioned in code, ALGORITHMS.md, TRACKING.md, SECURITY.md, FRONTEND.md, ARCHITECTURE.md, DATA_MODEL.md, PRODUCT.md, or in the knowledge-base is defined here. If a term is missing, the rule is: add it, do not silently skip.

---

## A

**AB test.** A controlled experiment that splits users into two or more cohorts and measures whether a change produced a different outcome. In Miamo, AB tests are gated by `ALGO_V8_*` flags and learner ramp percentages, never by hard-coded user IDs, so that ramps and rollbacks are atomic.
See also: ALGORITHMS.md §1, DEVOPS.md, OWNER_GUIDE.md.

**accidental click.** A tap on a card that is followed within ~700 ms by a back-navigation or by a scroll that moves the card off-screen, with no zoom, no profile scroll past the second photo, and no DTM open. The depth-of-engagement classifier marks the event as `accidental` and the ranker discounts it to near zero, so a fat-thumbed swipe does not poison taste.
See also: ALGORITHMS.md §3.A.4 `depthOfEngagement.ts`, TRACKING.md §5.3.1.

**ACE (Average Causal Effect).** The expected difference in an outcome between the world where a treatment was applied and the world where it was not. Miamo does not estimate ACE end-to-end; it approximates with learner reward deltas and stable-match counterfactuals, and only the fairness audit reports a true ACE estimate (gender-conditional exposure delta).
See also: ALGORITHMS.md §3.B.3 `fairnessRerank.ts`, §7.4 `fairnessAudit.ts`.

**AES-256-GCM.** A symmetric authenticated-encryption cipher used to encrypt chat message bodies at rest. The implementation uses a 256-bit key, a fresh 96-bit IV per message, and stores the 128-bit auth tag alongside the ciphertext; tampered ciphertexts fail decryption rather than returning garbage.
See also: SECURITY.md §3.1, §3.2.

**AI cringe.** The internal name for any Move suggestion, opener, or generated bio that reads as machine-written — "I would love to learn more about your passions," "you seem like a fascinating person," etc. The Move v2 linter catches 26 distinct cringe phrases and the composer falls back to a hook from `hookLibrary.ts` rather than ship a cringe line.
See also: ALGORITHMS.md §3.C.5, §3.C.6, MIAMO_MOVE.md.

**algorithm transparency.** The product principle that every ranked surface (Discover, Reels, DTM feed, Move suggestions, Top-10) ships with an "why am I seeing this" explanation derived from the same ingredients the ranker used. Implemented by `explain.ts`, which reads the same feature snapshot the ranker read and renders the top three contributions as plain-English bullets.
See also: ALGORITHMS.md §6.4 `explain.ts`, PRODUCT.md, SECURITY.md §10.2.

**ALGO_V8_* flags.** The family of feature flags that gate the v3.6.0 ranking stack — `ALGO_V8_INTENT_RIGHT_NOW`, `ALGO_V8_MOOD`, `ALGO_V8_POLARITY`, `ALGO_V8_DEPTH`, `ALGO_V8_EXPOSURE`, `ALGO_V8_STABLE_MATCH`, `ALGO_V8_FAIRNESS`, `ALGO_V8_MULTI_OBJECTIVE`, `ALGO_V8_FESTIVAL_HOOKS`, `ALGO_V8_MOVE_V2`, `ALGO_V8_DTM_MASK`, `ALGO_V8_ANTI_GHOST`. Each flag defaults OFF in production, and each is ramped via the learner per-surface so that a regression can be rolled back without a deploy.
See also: ALGORITHMS.md §5.1 `learner.ts`, DEVOPS.md.

**anti-ghost.** The chat-economy module (`antiGhost.ts`) that requires a small deposit to send a first Move, pays a reply bonus if the receiver responds within 48 hours, and burns a fraction of the deposit if they ghost. The economy is intra-account credits, not real money, and the deposit is refunded if the receiver does not open the conversation at all.
See also: ALGORITHMS.md §3.D.3, MIAMO_MOVE.md, TRACKING.md §5.3.13–5.3.15.

**archetype.** One of four sender styles inferred from a user's outgoing-message corpus by the Move v2 voice fingerprint: `wordsmith` (long, lyrical, low-emoji), `voice_first` (uses voice notes ≥ 30% of replies), `visual` (photo-replies and sticker-heavy), `fast_replier` (median reply latency under 4 minutes). Archetype is one of the 12 features in the sender voice vector and biases which hook category the composer picks.
See also: ALGORITHMS.md §3.C.1 `senderVoice.ts`, MIAMO_MOVE.md.

**AuditLog.** The Prisma model that records consent-relevant and admin-relevant events — consent toggle changes, RTBF requests, admin role grants, encryption key rotations, fairness-audit runs. AuditLog rows are append-only, immutable, and exported to cold storage after 30 days; they are the evidence trail for DPDP and GDPR compliance.
See also: SECURITY.md §10.1, §10.2, DATA_MODEL.md.

**Article 22 (GDPR).** The GDPR provision that grants users a right not to be subject to a decision based solely on automated processing that produces legal or similarly significant effects, and a right to obtain human intervention and contest the decision. Miamo's matching is not "significant effect" in the legal sense, but the "why am I seeing this" path and a human-review opt-out are wired anyway because the precedent risk is asymmetric.
See also: SECURITY.md §10.2, PRODUCT.md.

**authMiddleware.** The Express middleware that verifies a JWT access token on every protected route, attaches `req.user = { id, role, ... }`, and rejects with 401 if the token is missing, malformed, expired, or fails signature verification. Mounted before every business-logic handler in users, social, content, and discover services.
See also: SECURITY.md §2.1.

---

## B

**bcryptjs.** The pure-JS implementation of the bcrypt password hash, used for all password-at-rest storage. Cost factor is 12 in production and 4 in test, and the hash is stored in `User.passwordHash` — never the plaintext, never an MD5/SHA shortcut.
See also: SECURITY.md §1.1.

**batchLadder.** The frontend pagination strategy (`batchLadder.ts`) that delivers Discover in groups of 10, inserts a deliberate "breathe" pause card after each ladder rung, and waits for a user gesture before loading the next 10. The ladder shape is what prevents the slot-machine doomscroll pattern and forces the user to make a real choice each batch.
See also: ALGORITHMS.md §2.1, PRODUCT.md.

**behavioral ranking.** The consent toggle that gates whether a user's implicit signals — dwell, zoom, scroll velocity, pass repeats — are fed into the ranker. Default is ON because without it the experience collapses to recency; the toggle is exposed in Settings and surfaced again on the first Discover open after install.
See also: SECURITY.md §11.2.

**BERT4Rec.** A 2019 sequential-recommendation paper (Sun et al.) that applies a bidirectional transformer to user-item interaction sequences. Cited in `forYouV6.ts` as the inspiration for the masked-history embedding head; Miamo does not run BERT itself in production, the embedding is precomputed offline by EmbeddingWorker.
See also: ALGORITHMS.md §1.2, §6.7.

**Beat.** A daily streak counter rewarded for sharing a music track via the Beats surface (`beats.ts`). A Beat does not affect Discover ranking but unlocks the Reels music-share row and grants exposure credits at multiples of 7.
See also: ALGORITHMS.md §1.13.

**bio-data.** The Indian matrimonial term for a one-page profile sheet that traditionally lists name, date of birth, gotra, education, family details, and a photo. Miamo's "matrimonial profile" surface composes a bio-data view from the user's DTM answers and verified fields, so a family member can read it without scrolling Discover.
See also: PRODUCT.md, FRONTEND.md.

**blocked author.** A user the viewer has explicitly blocked. The candidate pool builder filters blocked authors at the database level (Prisma `where: { authorId: { notIn: blockedIds } }`) before any ranking happens, so a blocked user can never appear even by ranker mistake.
See also: ALGORITHMS.md §1.1, DATA_MODEL.md.

**Boo.** A competitor dating app focused on personality-typed matching. Mentioned in the knowledge-base only for context; Miamo does not import any Boo concept directly, but the "personality-first" framing is one of the reasons Miamo's archetypes are inferred from behavior rather than self-reported MBTI.
See also: TRACKING.md.

---

## C

**calm.** One of the five mood dimensions inferred by `moodRightNow.ts` from session-shape signals — opposite of `agitated`. A calm mood biases the ranker toward longer-form profiles and DTM topics rather than fast-swipe candidates.
See also: ALGORITHMS.md §3.A.2.

**candidate pool.** The set of profiles eligible to enter a single ranked batch, after hard filters (age, geography, blocked, hidden, paused, verification-required, intent-mismatch) but before scoring. Built by `forYou.ts` and `forYouV6.ts` at the start of each Discover request; typical size is 200–800 candidates per request.
See also: ALGORITHMS.md §1.1, §1.2.

**casual scroll.** One of the seven intent classes inferred by `intentRightNow.ts` — the user is browsing without a strong goal, swipes are fast, profile reads are shallow, no chats are open. The ranker responds by lowering the exposure-credit boost (no point showing a high-stakes profile to someone who is half-watching TV).
See also: ALGORITHMS.md §3.A.1.

**caste field.** A profile attribute (`User.caste`) that exists because the Indian market expects it, but is never used as a ranker feature, never used in `dtm.ts`, and never read by the fairness audit except to verify that exposure is independent of caste within a 5% tolerance. The field is opt-in and defaults null.
See also: PRODUCT.md, DATA_MODEL.md.

**CCPA.** California Consumer Privacy Act, 2018, plus the 2020 CPRA amendments. The relevant Miamo obligations are Do Not Sell My Personal Information, the Global Privacy Control header, and the right to know / delete; all three are wired and exposed at `/settings/privacy`.
See also: SECURITY.md §10.3.

**chronotype.** The user's inferred preferred-active-hours pattern (morning lark / evening owl / late-night), used by `notifyTiming.ts` to schedule pushes and by `focusAffinity.ts` to learn which hours produce highest-quality engagement. Computed weekly by the FocusAffinityWorker; default for new users is "unknown" until 7 days of data are available.
See also: ALGORITHMS.md §1.14, TRACKING.md §6.12.

**code-mix.** The phenomenon of switching between languages within a single utterance (e.g. Hinglish: "yaar that was so good"). Miamo's `codeMix.ts` module recognises four families — Hindi-English (Hinglish), Tamil-English (Tanglish), Bengali-English, and a generic Indic-English fallback — and picks templates that match the receiver's observed mix ratio.
See also: ALGORITHMS.md §3.C.4.

**cold start.** The condition where a new user has too little behavioral data for the ranker to personalise. Miamo's cold-start path leans on explicit preferences (DTM cold-start questions), demographic priors, and a higher novelty-boost weight; the user transitions out of cold start after the first ~30 ranked impressions with at least one positive signal.
See also: ALGORITHMS.md §4.3 `dtmColdStart.ts`.

**collaborative filter (CF).** The recommender family that scores a candidate by looking at how similar users behaved with similar candidates. `cf.ts` builds a user-user similarity matrix from like / move / chat-reply signals and contributes one ingredient to the multi-objective ranker.
See also: ALGORITHMS.md §1.9.

**compose pattern.** The architectural pattern where the final ranked list is produced by composing a small number of independent rankers (forYou, cf, dtm, new, active) under a multi-objective combiner rather than by training a single end-to-end model. Composition makes each ingredient debuggable, ramp-able, and explainable on its own.
See also: ALGORITHMS.md §1, §3.B.4.

**ConsentEvent.** The Prisma model that records every consent-toggle change with timestamp, prior value, new value, source (settings page, onboarding, prompt), and userId. ConsentEvent is queried by the export endpoint to produce the "your consent history" CSV required under DPDP and GDPR.
See also: SECURITY.md §11, DATA_MODEL.md.

**content-based recommendation.** The recommender family that scores a candidate by feature similarity to candidates the user has positively interacted with (text embeddings, photo embeddings, DTM-answer overlap). One of the ingredients in `forYou.ts` and the dominant ingredient for cold-start users.
See also: ALGORITHMS.md §1.1.

**contextual bandit.** A reinforcement-learning algorithm class where the learner picks an action conditioned on a context vector and observes a scalar reward. Miamo's `learner.ts` runs a LinUCB-flavoured bandit per surface to set the weights of the multi-objective combiner ingredients.
See also: ALGORITHMS.md §5.1, §5.2.

**coverage stage (DTM).** A phase in the DTM topic ladder where the goal is to ask topics the user has not answered yet, even if they would not produce the highest expected engagement. Coverage stage runs for the first ~20 DTM answers; after that the picker shifts to engagement-stage selection.
See also: ALGORITHMS.md §3.D.1, §4.1.

---

## D

**dailyCap.** The maximum number of ranked impressions a single author can collect from a single viewer per day (default 1). Enforced in the candidate-pool builder so that a hot author does not eat every slot.
See also: ALGORITHMS.md §1.1.

**daily login streak.** The consecutive-day login counter shown on the home surface. It does not affect ranking; it exists to anchor the user in a routine and to gate exposure-credit bonuses every 7 days.
See also: PRODUCT.md, ALGORITHMS.md §3.B.1.

**decision fatigued.** One of the seven intent classes inferred by `intentRightNow.ts` — the user has scrolled past many candidates without a clear positive signal and is likely to swipe-pass anything. The ranker responds by inserting a deliberate breathe card and shrinking the next batch from 10 to 5.
See also: ALGORITHMS.md §3.A.1, §2.1.

**deferredItem.** A candidate the ranker chose to skip in the current batch but keep in a queue for the next batch (e.g. the user paused on a similar profile, so a near-duplicate is held back). Implemented as a per-session in-memory deque pruned by the DeferPrune worker every 6 hours.
See also: ALGORITHMS.md §1.17, TRACKING.md §6.14.

**depth of engagement.** The classifier (`depthOfEngagement.ts`) that maps a profile-view event onto one of {accidental, glance, scan, inspection, deep_inspection} using zoom count, scroll depth, photo carousel index, DTM open, and dwell time. The label is written into the FeatureSnapshot and used by every downstream ranker as a quality multiplier.
See also: ALGORITHMS.md §3.A.4, TRACKING.md §5.3.1.

**did.** The persistent anonymous device id minted by the client on first launch, written into the `ctx.did` field of every tracking envelope. Used to attribute pre-signup events and to detect duplicate-account abuse; HMAC-hashed at ingest before it touches Postgres.
See also: TRACKING.md §3.3, SECURITY.md §3.3.

**distraction browse.** One of the seven intent classes — the user is on Discover while waiting for something else (a Lyft, a meeting, a queue). Similar shape to casual scroll but with shorter session length; the ranker keeps the experience light and avoids high-stakes DTM topics.
See also: ALGORITHMS.md §3.A.1.

**distance fit.** A geometric scoring ingredient that compares the candidate's location to the viewer's location bucket; weighted higher for users who have set a strict distance preference. Computed lazily — a candidate that is filtered out by hard distance never enters the scorer.
See also: ALGORITHMS.md §1.1.

**DPDP Act 2023.** India's Digital Personal Data Protection Act, the home regulatory regime. The relevant Miamo obligations are explicit consent, notice in the user's preferred language, easy withdrawal, and the data fiduciary appointment — all four wired and audited.
See also: SECURITY.md §10.1.

**DTM (Date-to-Marry).** Miamo's deep-compatibility surface, a structured Q&A flow where users answer prompts about long-horizon preferences (family, faith, kids, money, geography). The DTM is the product feature that distinguishes Miamo from swipe-only apps and is the primary input to the deep-compat ranker `dtm.ts` / `dtmV6.ts`.
See also: ALGORITHMS.md §1.10, §4, PRODUCT.md.

**dtmTopicMask.** The gate (`dtmTopicMask.ts`) that hides a DTM topic from a user's feed if their current mood, coverage stage, or recent window-shopping pattern says they should not see it now. The mask is the "do no harm" rail that prevents heavy topics from landing on a user mid-anxious-scroll.
See also: ALGORITHMS.md §3.D.1.

---

## E

**EAS-256-GCM.** A common misspelling of AES-256-GCM. See AES-256-GCM.

**EventAggHourly / EventAggDaily.** Prisma materialised tables that store hourly and daily roll-ups of tracking events per user, used by the ranker as the warm-cache layer (instead of recomputing from the raw stream). Written by the RollupConsumer loop and read by the FeatureAggregator and CompatWriter loops.
See also: TRACKING.md §6.3, §6.4, DATA_MODEL.md.

**exposure credit.** A unit of earned visibility (`exposure.credit_earned` event). A user accrues credits by completing high-quality actions — verified selfie, deep DTM answer, helpful reply, weekly streak — and spends them implicitly by being ranked higher in candidate pools the next time they would otherwise be invisible.
See also: ALGORITHMS.md §3.B.1, TRACKING.md §5.3.7.

**ExposureLedger.** The Prisma model that records every credit grant, slot fill, and credit expiry. The ledger is the audit trail for "why was I shown more this week" — a user can pull their ledger row and see the four credits that earned them four extra slots.
See also: ALGORITHMS.md §3.B.1, DATA_MODEL.md.

**exposure scheduler.** The worker loop (`exposureScheduler.ts`) that walks the ledger every five minutes, picks credits that should fill a slot in the next batch, and writes the assignment to a Redis key the ranker reads at request time. Decouples the slow credit accounting from the fast ranking path.
See also: ALGORITHMS.md §7.2, TRACKING.md §6.17.

**expDecay.** Shorthand for exponential decay with a configurable half-life, applied to recency-sensitive ingredients (latest dwell, recent message reply, last seen). Each ingredient picks its own half-life — surface learner has a slow half-life (7 days), polarity has a fast one (45 minutes).
See also: ALGORITHMS.md §2.5 `surfaceLearner.ts`.

**explore epsilon.** The probability that the ranker bypasses its best-scored candidate and inserts a deliberately novel one, used by the bandit to keep learning. Default epsilon is 0.05 in production, 0.10 in test surfaces, and is itself one of the parameters the learner tunes.
See also: ALGORITHMS.md §5.1.

---

## F

**fairnessRerank.** The reranker (`fairnessRerank.ts`) that applies a Singh-Joachims gender-conditional reshuffle to the top-K of every Discover batch so that exposure is balanced within the K window, subject to a relevance-loss budget. Default budget is 5% — relevance loss above that aborts the rerank for that batch and the fairness audit flags it.
See also: ALGORITHMS.md §3.B.3, §7.4.

**family brief.** A one-page summary of a candidate's matrimonially-relevant fields (faith, family, education, location) that the user can share with a family member without sharing the chat history. Generated on demand by the family-brief composer; the `family_brief.generated` and `family_brief.viewed` events are tracked.
See also: TRACKING.md §5.3.11, §5.3.12, PRODUCT.md.

**fatigue penalty.** A score reduction applied to a candidate the viewer has seen recently without engaging (no zoom, no DTM open, no Move). The half-life is 36 hours; a candidate not engaged with at impression #5 is shown ~half as often at impression #6.
See also: ALGORITHMS.md §1.1.

**FeatureSnapshot.** The frozen record of every input feature the ranker read for a single batch — candidate ids, scores, ingredient contributions, learner weights, flag values. Snapshot is written to cold storage and is the evidence the "why am I seeing this" explainer reads from.
See also: ALGORITHMS.md §6.4, TRACKING.md §6.15.

**feature flag.** A boolean (or rampable percentage) that gates a code path so it can be turned off without a deploy. Miamo's flags live in `services/shared/src/flags.ts` and default OFF for every v8 feature; the learner ramps them in 1% steps with automatic rollback on metric regression.
See also: ALGORITHMS.md §5.1, DEVOPS.md.

**festivalHooks.** The reranker that promotes candidates whose region celebrates the currently-active festival (Diwali, Pongal, Eid, Christmas), for users who have opted into festival-aware ranking. Calendar is regional, not global — Pongal boosts Tamil-region users, not all Indian users.
See also: ALGORITHMS.md §3.B.5.

**FirstMoveOutcome.** The Prisma model that records the outcome of a user's first Move to a given recipient — replied, ghosted, blocked. Used by the LearnerLoop to attribute long-horizon reward back to the Move-composer ingredients.
See also: TRACKING.md §6.10, DATA_MODEL.md.

**FocusAffinityHourly.** The hourly aggregate of "what hours produce the highest-quality engagement for this user" — high zoom, high DTM open, high reply rate. Read by `notifyTiming.ts` to schedule pushes and by `intentRightNow.ts` as a prior for casual-scroll vs serious-mode.
See also: TRACKING.md §6.12.

---

## G

**galeShapley.** The stable-matching algorithm (1962, Gale and Shapley) used by `galeShapley.ts` to compose the weekly Top-10 — every user proposes to their preferences, every receiver accepts the best proposal so far, the result is a stable assignment where no pair would mutually defect. Runs once per week by the `stableMatchTop10` worker.
See also: ALGORITHMS.md §3.B.2, §7.3.

**GDPR.** The General Data Protection Regulation, the EU baseline. Miamo treats GDPR as a superset rail — if a workflow is GDPR-compliant it is also DPDP- and CCPA-compliant — but each regime gets its own audit trail in `AuditLog`.
See also: SECURITY.md §10.

**ghost burn.** The deposit forfeit applied to a sender whose first Move went unanswered for 7 days, with no profile-view-back from the receiver. The burn is a fraction of the deposit (default 25%); the rest is refunded. The economy is bounded so a serial ghoster cannot bankrupt a sender.
See also: ALGORITHMS.md §3.D.3, TRACKING.md §5.3.15.

**ghosted self.** A user whose own outgoing Moves consistently go unanswered. The signal is fed into the Move v2 voice fingerprint as a negative cue (push toward shorter, more concrete hooks) and into the negative-signal-engine as a flag to suggest a profile review.
See also: ALGORITHMS.md §3.C.1, services/shared/negative-signal-engine.ts.

**Gini coefficient.** The classical inequality measure, applied to weekly exposure across users to detect a "Pareto-tail" collapse where a few users get all the impressions. The fairness audit alarms if Gini exceeds 0.62; the rerank budget is tuned to keep Gini under 0.55.
See also: ALGORITHMS.md §7.4.

**gotra.** A Hindu kinship clan label, traditionally used in matrimonial matching to avoid same-gotra marriages. Stored on `User.gotra` as opt-in metadata; used only by the matrimonial-profile surface, never by the Discover ranker.
See also: PRODUCT.md, DATA_MODEL.md.

**GRU4Rec.** A 2016 sequential-recommendation paper (Hidasi et al.) that uses a gated recurrent unit on user-session sequences. Cited in `surfaceLearner.ts` as the inspiration for the per-surface session-shape encoder; Miamo runs the lightweight per-session encoder online, not the full GRU.
See also: ALGORITHMS.md §2.5.

**guardrail metric.** A metric the learner watches as a hard constraint, not an objective — e.g. "block rate must not increase more than 0.5pp," "fairness Gini must not exceed 0.62". A guardrail breach triggers an automatic ramp-down regardless of the primary reward.
See also: ALGORITHMS.md §5.1.

---

## H

**half-life decay.** The pattern of weighting an event by `exp(-t/τ)` where τ is the half-life. Used everywhere from the recency boost (τ = 6 hours) to the learner reward attribution (τ = 7 days) to the fatigue penalty (τ = 36 hours).
See also: ALGORITHMS.md §2.5.

**helmet.** The Express middleware package (`helmet`) that sets a suite of security HTTP headers — X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Content-Security-Policy. Mounted before any business handler in every service.
See also: SECURITY.md §5.1, §5.2.

**Hinge "Most Compatible".** Hinge's daily curated pick, comparable to Miamo's AI Match. Cited in product docs as a reference shape; Miamo's AI Match differs in that it is sourced from the multi-objective combiner with explainable ingredient bullets, not a black-box model.
See also: ALGORITHMS.md §1.4, PRODUCT.md.

**Hinglish.** Hindi-English code-mix, the largest of the four language families recognised by `codeMix.ts`. Detection is by token-level language id; ratio threshold for "Hinglish" is between 25% and 75% non-English tokens in the user's last 50 sends.
See also: ALGORITHMS.md §3.C.4.

**HMAC-SHA256.** Hash-based message authentication code with SHA-256. Miamo uses HMAC-SHA256 with a server-side secret to pseudonymise `userId` and `did` before either touches Postgres in the tracking pipeline — the raw id is never persisted, the HMAC is the join key.
See also: SECURITY.md §3.3, TRACKING.md §2.

**hookLibrary.** The curated set of opener templates (`hookLibrary.ts`) the Move v2 composer draws from when the receiver's voice fingerprint requests a concrete, falsifiable hook (e.g. "you mentioned cycling — flat or hills?" rather than "I love your energy"). About 180 hooks organised into ~14 categories.
See also: ALGORITHMS.md §3.C.3.

**hook category.** A bucket of hooks tagged by topic and tone — `place_specific`, `food_specific`, `music_specific`, `book_specific`, `outdoor`, `craft`, `pet`, etc. The composer's category picker is one of the bandit arms the learner tunes per-receiver-archetype.
See also: ALGORITHMS.md §3.C.3.

---

## I

**idempotency.** The property that a repeated request with the same `Idempotency-Key` header produces the same effect as a single request. The middleware stores the first response keyed by `(userId, key)` in Redis with a 24-hour TTL and returns it on duplicate; fail-open semantics mean a Redis outage allows the request through rather than blocking.
See also: SECURITY.md §7.

**ingest service.** The Express service (port 3260) that accepts tracking envelopes from the web and mobile clients, validates the envelope shape, HMAC-hashes ids, and XADDs the event onto the Redis stream. Stateless and horizontally scaled.
See also: TRACKING.md §2.

**intent class (7).** The seven labels output by `intentRightNow.ts`: `serious`, `casual_scroll`, `distraction_browse`, `decision_fatigued`, `chat_focused`, `dtm_focused`, `settle`. Each gates a different downstream policy in the ranker.
See also: ALGORITHMS.md §3.A.1.

**intent inference.** The worker loop that runs `intentRightNow.ts` against rolling session-shape features every 30 seconds and writes the result to a Redis key the ranker reads at request time. Sub-millisecond read path; tens-of-milliseconds compute path.
See also: ALGORITHMS.md §7.1.

**intent right now.** The current value of the intent class for a given user, refreshed every 30 seconds. Distinguished from a user's stable intent (`User.intent = "serious"` set during signup) — right-now is the moment-to-moment override.
See also: ALGORITHMS.md §3.A.1.

**intentFitRightNow ingredient.** The score contribution from "does this candidate match the viewer's right-now intent" — e.g. a casual-scroll viewer is shown lighter candidates, a serious viewer is shown candidates with deep DTM answers. One of the ingredients in the multi-objective combiner.
See also: ALGORITHMS.md §3.B.4.

**ITP (Safari).** Apple's Intelligent Tracking Prevention, the browser feature that caps first-party cookie lifetimes for known trackers. Miamo's web client minimises ITP exposure by storing the session JWT in an HttpOnly cookie with `SameSite=Lax` and refreshing via a same-origin path.
See also: SECURITY.md §10.5.

---

## J

**jaccard.** The Jaccard similarity coefficient — size of intersection divided by size of union of two sets. Used as a cheap similarity ingredient for DTM-answer overlap and for hook-category fit; cheap enough to recompute per request without caching.
See also: ALGORITHMS.md §1.1.

**JWT (HS256).** JSON Web Token signed with HMAC-SHA256. Miamo's access tokens are HS256, lifetime 15 minutes, refresh tokens are HS256, lifetime 30 days; signature key is rotated quarterly without invalidating outstanding tokens (the verifier checks against both current and previous key).
See also: SECURITY.md §1.2, §1.3, §1.4.

---

## K

**knip.** The dead-code detector run in CI (`knip.config.ts`). Flags exports that are never imported, files that are never reached, and dependencies declared but not used; PR CI fails if `knip` reports new findings.
See also: DEVOPS.md.

---

## L

**learner.** The contextual-bandit core (`learner.ts`) that adjusts ingredient weights per surface based on observed reward. Each surface (Discover, Reels, DTM, Move) has its own learner instance with its own state and its own ramp rate.
See also: ALGORITHMS.md §5.1.

**learner ramp.** The per-surface ramp percentage controlling how aggressively the learner moves weights from its prior. Ramp starts at 1% on a new flag, doubles every 24 hours if no guardrail breaches, caps at 100% (full learner control).
See also: ALGORITHMS.md §5.1.

**learnerLoop.** The worker loop (`learnerLoop` in TRACKING.md §6.13) that walks the event stream, computes per-surface rewards, and writes updated learner weights to Redis every 60 seconds. The loop is idempotent on event id — replaying the stream does not double-credit.
See also: TRACKING.md §6.13.

**learnerRewards.** The reward functions (`learnerRewards.ts`) — one per surface — that map a sequence of tracked events to a scalar reward. Discover's reward is depth-weighted positive engagement minus block rate; Move v2's reward is reply-within-48h.
See also: ALGORITHMS.md §5.2.

**light topic (DTM).** A DTM topic the topic-mask deems safe to ask in a non-serious mood — favourite cuisine, weekend habits, dream travel. Contrasted with "heavy" topics (kids, finances, faith) that are masked unless the user is in serious mode.
See also: ALGORITHMS.md §3.D.1.

**LinUCB.** The 2010 contextual-bandit paper (Li et al.) that derives an upper-confidence-bound policy for linear reward models. Cited in `learner.ts` as the inspiration; Miamo's implementation uses a diagonal covariance approximation for speed.
See also: ALGORITHMS.md §5.1.

---

## M

**Match Group.** The publicly-traded operator of Tinder, Hinge, OkCupid, Match. Cited in the product doc only as the market incumbent; Miamo's strategic position is "the app you use after Match Group apps stop working for you."
See also: PRODUCT.md.

**matrimonial profile.** A surface that presents a candidate's profile in bio-data form, suitable for sharing with a family member. Composed from verified fields, DTM answers, and the family brief; the surface is opt-in and never the default.
See also: PRODUCT.md.

**message reply (sticky).** A reply to a first Move that lands within 48 hours, marked sticky because it is one of the highest-weight positive signals in the learner reward. A sticky reply collapses fatigue penalties for the receiver and grants exposure credits to the sender.
See also: ALGORITHMS.md §3.D.3, TRACKING.md §5.3.14.

**Miamo Move.** The product feature that composes a personalised first message from the sender's voice fingerprint, the receiver's resonance profile, and a hook from the library. The composer surfaces five suggestions and learns from which one the sender chose (or whether they wrote their own).
See also: ALGORITHMS.md §3.C.5, MIAMO_MOVE.md.

**mood right now.** The 5-dimensional mood vector (`moodRightNow.ts`) — calm-agitated, focused-distracted, open-closed, light-heavy, lonely-social — inferred from session-shape signals every ~30 seconds. Mood is the gate for DTM topic mask and the bias term for hook category selection.
See also: ALGORITHMS.md §3.A.2.

**moodInferenceEnabled.** The consent toggle that gates whether the mood inference runs at all. Default is OFF (mood inference is a heavier consent ask than behavioral ranking because users intuitively recoil from "the app is reading my mood"); the toggle is exposed in the onboarding flow with a plain-English description.
See also: SECURITY.md §11.1.

**moveProfile.** A per-user record (`UserMoveProfile`) that stores the latest voice fingerprint, archetype, recent hook performance, and Move-v2 learner state. Read on every composer request; written by the LearnerLoop and the voice-fingerprint job.
See also: ALGORITHMS.md §6.2.

**moveVoice.** The Move v2 voice templater + linter (`moveVoice.ts`) — generates a candidate template from the sender's archetype, then runs the cringe-phrase linter, then returns the survivor. Distinct from the composer, which orchestrates five voice outputs into a final suggestion set.
See also: ALGORITHMS.md §2.3.

**moveV2 composer.** The orchestrator (`composer.ts`) that calls senderVoice, receiverResonance, hookLibrary, codeMix, and moveVoice to produce a ranked list of five suggestions per Move request. The user picks one (or edits one, or writes their own); the choice is the learner reward signal.
See also: ALGORITHMS.md §3.C.5.

**multi-objective ranking.** The composition pattern (`multiObjective.ts`) that combines relevance, fairness, earned exposure, recency, and intent-fit into a final score per candidate. Weights are set per surface by the learner; combiner is linear with non-negative weights.
See also: ALGORITHMS.md §3.B.4.

---

## N

**negative-signal-engine.** The module (`services/shared/negative-signal-engine.ts`) that detects user-level patterns suggesting trouble — ghosted-self, no-reply streak, block-received rate — and triggers product responses (profile-review nudge, reduced fatigue, easier hook templates). The engine never penalises the user in the ranker; it only helps.
See also: services/shared/negative-signal-engine.ts.

**no-mask reason.** The audit field written when the DTM topic mask chooses to mask a topic — `{ reason: "mood_heavy" | "coverage_done" | "window_shopping" | "no_consent" }`. Surfaced in the user-side "why was this hidden" explanation.
See also: ALGORITHMS.md §3.D.1, TRACKING.md §5.3.16.

**notification timing.** The push-timing optimiser (`notifyTiming.ts`) that picks the best hour and minute to send a notification per user, balancing chronotype, recent open rate, and global rate caps. Decisions are written to a notification queue 15 minutes before send, allowing late cancellation.
See also: ALGORITHMS.md §1.14.

**novelty boost.** The ranker ingredient that prefers candidates the viewer has not seen recently. Higher weight in cold-start, lower weight in steady state; the boost is what keeps Discover from collapsing into a small loop of the same five profiles.
See also: ALGORITHMS.md §1.1.

---

## O

**OAuth.** The delegated-authorisation protocol. Miamo supports Sign in with Apple (OAuth-flavoured) and Sign in with Google; both flows exchange the upstream id-token for a Miamo session JWT via the auth service.
See also: SECURITY.md §1.

**Otp.** The Prisma model that stores one-time passcodes for phone-based sign-up and 2FA. Codes are 6 digits, hashed at rest, single-use, and expire in 10 minutes; a rate limit caps generation at 5 per hour per phone number.
See also: SECURITY.md §1.5, DATA_MODEL.md.

**OWASP Top-10.** The Open Web Application Security Project's ranked list of common web vulnerability classes. Miamo's security doc maps each category to the implementation and explicitly calls out which categories the codebase over- and under-invests in.
See also: SECURITY.md §9.

---

## P

**pair compat cache.** The Redis cache of precomputed pair compatibility scores written by the CompatWriter loop. Keyed by `(viewerId, candidateId)`; TTL 24 hours; warm-cache hit rate ≥ 95% under steady state.
See also: TRACKING.md §6.5.

**pairCompatV6.** The pair-compatibility scorer (`pairCompatV6.ts`) — combines DTM-answer overlap, voice resonance, archetype fit, and shared-context features into a single 0-1 score. Read by `forYouV6.ts`, `dtmV6.ts`, and the family brief generator.
See also: ALGORITHMS.md §6.3.

**passing (Discover).** The user gesture of swiping past a candidate without engaging. Miamo distinguishes "pass" from "block" — pass is a low-cost signal, block is a hard delete; both feed the ranker but with very different weights.
See also: PRODUCT.md.

**photo zoom.** The user gesture of pinching to zoom on a profile photo. Counted as a strong positive engagement signal — a zoom is harder to fake than a tap and correlates with later reply behaviour.
See also: ALGORITHMS.md §3.A.4.

**polarity classifier.** The classifier (`polarity.ts`) that maps a session segment onto {positive_interest, neutral, hate_scroll}. Hate-scroll detection is the negative end — the user is racing through candidates with quick passes; the ranker responds by inserting a breathe card.
See also: ALGORITHMS.md §3.A.3.

**premium.** The paid tier. Premium users receive a 1.5× multiplier on exposure credits, access to AI Match and the family brief without quota, and priority on the weekly Top-10 candidate set. Premium does not bypass fairness rerank.
See also: PRODUCT.md.

**Prisma.** The ORM Miamo uses across every service. All services load `@prisma/client` from `services/shared/node_modules` — there is one canonical generated client; regenerating the client requires restarting every service.
See also: ARCHITECTURE.md, DATA_MODEL.md.

**profile completion score.** The 0-1 score of how complete a user's profile is — required photos, required fields, at least one DTM answer, a verified selfie. The score gates Discover eligibility (must be ≥ 0.7 to appear in candidate pools).
See also: PRODUCT.md.

**Priya.** The persona used throughout Miamo documentation to anchor product decisions — a 28-year-old urban Indian woman who wants serious matrimonial outcomes without the bio-data theatre. Every doc section opens with a "what Priya feels" pass before the technical pass.
See also: TRACKING.md, SECURITY.md, PRODUCT.md.

---

## Q

**quality action (exposure credit).** A user action that earns an exposure credit — verified selfie, completed DTM answer, helpful reply received, weekly streak hit. The list is small and the credits are small; the design intent is that quality is rewarded, not gamified.
See also: ALGORITHMS.md §3.B.1.

---

## R

**rage like.** A like sent after a chain of passes, often within a single second of the candidate appearing. Detected by `polarity.ts` as a hate-scroll-followed-by-spike and discounted in the ranker — a rage like rarely converts to a reply.
See also: ALGORITHMS.md §3.A.3.

**rate limit.** The per-route per-user request cap enforced at the gateway. Tiers are: auth (5 per 10 minutes), ingest (200 per minute), default authenticated (60 per minute), default anonymous (10 per minute). Counter storage is Redis with sliding-window TTL.
See also: SECURITY.md §4.

**receiver resonance.** The Move v2 module (`receiverResonance.ts`) that summarises "what kinds of openers does this person actually reply to" — concrete vs abstract, code-mixed vs monolingual, short vs long. The composer reads resonance to pick a hook category that fits.
See also: ALGORITHMS.md §3.C.2.

**reciprocity score.** The pairwise statistic in `moves.ts` measuring whether a sender and receiver have a back-and-forth pattern beyond the first message. High reciprocity is the strongest positive ranker signal; low reciprocity (after multiple chats) suggests fit problems and triggers a profile-review nudge to both sides.
See also: ALGORITHMS.md §1.11.

**requestId.** The per-request UUID minted by the request-tracing middleware, propagated through service-to-service calls in the `X-Request-Id` header, included in every log line, and included in the error envelope. Lets a single user-report be traced across all 11 services.
See also: SECURITY.md §8.1, §8.2.

**ReelsView.** The new vertical-video surface (`services/web/src/app/(main)/creativity/components/ReelsView.tsx`) introduced in v3.5.0. Each reel is a Spotlight candidate; engagement here feeds the Spotlight ledger and the creativity-track learner.
See also: services/web/src/app/(main)/creativity/components/ReelsView.tsx.

**repeat pass.** The signal where the same viewer passes the same candidate twice (or more) across separate sessions. A repeat pass is treated as a strong hide signal — the candidate is removed from that viewer's pool for 30 days.
See also: ALGORITHMS.md §1.1.

**right-now-intent.** Synonym for "intent right now" — the moment-to-moment intent class. See intent right now.
See also: ALGORITHMS.md §3.A.1.

**right to be forgotten (RTBF).** The user-side right to compel deletion of their data. Miamo's implementation is the triple-secret RTBF lever (SECURITY.md §3.4) — flipping a per-user secret invalidates HMAC joins to tracking data, flipping a per-table secret invalidates encryption-at-rest, flipping a per-service secret invalidates audit-log signatures. Delete is unrecoverable.
See also: SECURITY.md §3.4.

**right to explanation.** The user-side right to receive a human-readable account of why an automated decision was made. Miamo's explainer (`explain.ts`) returns the top three ingredient contributions for any ranked surface; for the family brief, the explanation is the field-level provenance.
See also: ALGORITHMS.md §6.4, SECURITY.md §10.2.

---

## S

**safety agg.** The aggregate score (Safety roll-up, TRACKING.md §6.9) combining block-received rate, report-received rate, and ghost rate per user. Used by the negative-signal-engine to flag profiles for review, never by the Discover ranker directly.
See also: TRACKING.md §6.9.

**SASRec.** Self-Attentive Sequential Recommendation (Kang and McAuley, 2018), a transformer-style sequence recommender. Cited in `forYouV6.ts` as an inspiration for the self-attention head over recent engagement events; the production implementation is a lightweight per-session encoder, not full SASRec.
See also: ALGORITHMS.md §1.2.

**scroll velocity.** The pixels-per-second rate at which a user is moving through Discover or Reels. High velocity is the dominant hate-scroll signal; low velocity with high zoom is the dominant deep-inspection signal.
See also: ALGORITHMS.md §3.A.4, §3.A.3.

**sender voice.** The Move v2 module (`senderVoice.ts`) that builds a 12-feature voice fingerprint from a user's outgoing-message history — archetype, mean length, emoji rate, voice-note rate, code-mix ratio, opener style, etc. The fingerprint is the input to the composer's voice templater.
See also: ALGORITHMS.md §3.C.1.

**serious mode.** A user state — either set explicitly ("I am here for marriage") or inferred from sustained serious-intent right-now classifications. Unlocks heavy DTM topics, biases the candidate pool toward verified profiles, and grants a small exposure-credit bonus.
See also: ALGORITHMS.md §1.8.

**session summary.** The compact per-session record (`SessionSummary`) summarising counts, dwell, depth, mood trajectory, and outcome (matched, did-not-match, opened-DTM, opened-Move). Written by the SessionSummaryWorker on session close; used as the canonical replay input for the learner.
See also: TRACKING.md §6.11.

**SessionSummary.** The Prisma model behind the session summary. Stored hot for 30 days, then archived to cold storage; the cold form retains everything except the chat-content reference.
See also: DATA_MODEL.md, TRACKING.md §6.11.

**settle (intent settle).** One of the seven intent classes — a user who has consistently engaged with one specific candidate over multiple sessions and is now revisiting only to confirm. The ranker recognises settle and surfaces the existing chat path rather than re-ranking new candidates.
See also: ALGORITHMS.md §3.A.1.

**Sikkim (Priya's photo destination).** An illustrative example used in product docs — "Priya posted a photo from Sikkim" — to make the hook-library examples concrete. Sikkim is not a coded special case; the hook library is regional in general.
See also: PRODUCT.md.

**Singh-Joachims.** The Singh and Joachims (2018) fair-ranking paper that defines exposure parity under a relevance-loss budget. Implemented in `fairnessRerank.ts` as a gender-conditional rerank within the top-K of every Discover batch.
See also: ALGORITHMS.md §3.B.3.

**social graph (lack thereof in Miamo).** Miamo deliberately does not maintain a social graph (mutual friends, friends-of-friends). The market premise is that matrimonial outcomes do not benefit from social-graph leakage; the absence is a product position, not a missing feature.
See also: PRODUCT.md.

**spotlight.** The creativity surface where eligible users are featured for 24-hour visibility windows after a high-quality reel. Spotlight is the v3.5.0 mechanism for earned exposure on the creativity track; ledger-backed and rate-limited.
See also: services/content/src/creativity-spotlight.ts, services/shared/src/spotlight-ledger.ts.

**SpotlightLedger.** The ledger-style record of every spotlight grant, slot fill, and expiry. Lives in `services/shared/src/spotlight-ledger.ts`; the test suite in `tests/spotlight-ledger.test.ts` covers the concurrency cases.
See also: services/shared/src/spotlight-ledger.ts, tests/spotlight-ledger.test.ts.

**SpotlightAward.** The Prisma model that records each spotlight grant — userId, reelId, windowStart, windowEnd, source (quality-action, weekly-top-10, manual-admin). Written by the spotlight ledger and read by the creativity-spotlight composer.
See also: DATA_MODEL.md, services/content/src/creativity-spotlight.ts.

**stable jitter.** A small per-user deterministic noise term added to ranker scores so that two viewers with identical taste do not see identical decks. The jitter is seeded by `userId` and changes daily; deterministic so it is reproducible in tests, jittered so the rerank cannot exploit it.
See also: ALGORITHMS.md §1.1.

**stable matching.** The property that no two users would mutually prefer each other to their current assignment. Achieved by Gale-Shapley in the weekly Top-10 worker; not enforced for the streaming Discover surface (which would be too expensive).
See also: ALGORITHMS.md §3.B.2.

---

## T

**Tanglish.** Tamil-English code-mix, one of the four language families in `codeMix.ts`. Detection uses Tamil script presence plus token-level language id; the templater picks Tanglish hooks when the receiver's last 50 sends are between 30% and 70% Tanglish.
See also: ALGORITHMS.md §3.C.4.

**top-decile.** The top 10% of users on a given metric (exposure, engagement, completion). Top-decile thresholds are dynamic — recomputed weekly — so a user's status reflects current activity, not lifetime.
See also: ALGORITHMS.md §3.B.1.

**TopicMask (DTM).** The mask object returned by `dtmTopicMask.ts` — `{ allowedTopics: [...], maskedTopics: [...], reasons: { topicId: reason } }`. Read by `dtmBatch.ts` when composing the DTM feed; surfaced to the user via the "why was this hidden" path.
See also: ALGORITHMS.md §3.D.1, §3.D.2.

**Tracking.** The umbrella name for the analytics + signals pipeline — ingest service, Redis stream, 17 worker loops, Postgres roll-up tables. Tracking is the substrate every ranker reads from.
See also: TRACKING.md.

**TrackEventName.** The enum of allowed event names in the tracking envelope, validated at ingest. Adding a new event requires updating the catalog, the type, the schema, and at least one worker; CI fails if any of the four is missing.
See also: TRACKING.md §5.

**TrendQueue.** The queue (`tests/trend-queue-concurrency.test.ts` covers it) that batches trend-detection work across the creativity track. Concurrency-safe; the test enforces that two writers cannot double-credit the same trend.
See also: tests/trend-queue-concurrency.test.ts.

**tricolon (in linter).** A rhetorical pattern of three-item lists ("smart, kind, funny"). The Move v2 linter flags AI-cringe tricolons (where all three items are generic) but allows specific tricolons ("Marathi, Marwari, married-to-a-Mumbai-rent").
See also: ALGORITHMS.md §3.C.6.

---

## U

**UserActivity.** The Prisma model storing per-user rolled-up activity — last-seen, sessions-7d, depth-mean, polarity-trend. Read by the candidate-pool builder and the right-now-intent classifier; written by the FeatureAggregator loop.
See also: TRACKING.md §6.4, DATA_MODEL.md.

**UserWeightProfile.** The per-user storage of learner weights for the multi-objective combiner — relevance, fairness, earned, recency, intent. Each user has their own weight vector; the learner ramps the vector toward the surface-global optimum at the surface-specific ramp rate.
See also: ALGORITHMS.md §5.1.

**UserMoveProfile.** The per-user storage of Move v2 state — voice fingerprint, archetype, recent hook performance, code-mix family. Read by the composer on every Move request; written by the LearnerLoop and the voice-fingerprint job.
See also: ALGORITHMS.md §6.2.

---

## V

**validate middleware.** The Express middleware (`validate()`) that runs a zod schema against the incoming request body, query, and params, rejects with 422 on validation failure, and returns the parsed value typed. Mounted before every handler that takes user input.
See also: SECURITY.md §6.1.

**verifications (selfie/ID).** The two verification flows — selfie verification (live capture matched to profile photo) and ID verification (government ID matched to selfie). Both are opt-in; verified users appear in the trust-gated `verified.ts` ranker and receive an exposure-credit bonus.
See also: ALGORITHMS.md §1.7, PRODUCT.md.

**VibeCheck.** A pre-Move surface where the sender previews how their voice fingerprint reads to the receiver — "your last five openers were short, concrete, and Hinglish-mixed; this receiver replies to that style 60% of the time." VibeCheck is informational, not gating.
See also: MIAMO_MOVE.md.

**Voice Fingerprint.** The 12-feature vector summarising a user's outgoing-message style. See sender voice.
See also: ALGORITHMS.md §3.C.1, TRACKING.md §5.3.9, §5.3.10.

**voice notes.** Audio messages sent in chat. Counted toward the voice-first archetype; the receiver's reply rate on voice notes is one of the inputs to receiver resonance.
See also: ALGORITHMS.md §3.C.2.

---

## W

**weekly top 10.** The weekly stable-match-assigned Top-10 set per user (`stableMatchTop10` worker). Produced by Gale-Shapley over the week's high-affinity candidates, fairness-reranked before delivery, presented as a curated set distinct from the streaming Discover.
See also: ALGORITHMS.md §3.B.2, §7.3.

**WeeklyTopMatch.** The Prisma model recording each user's weekly Top-10 assignment — viewerId, candidateIds, weekStart, weekEnd, source-flags. Append-only; previous weeks remain queryable for the explainer.
See also: DATA_MODEL.md.

**why am I seeing this.** The user-facing explainer (`explain.ts`) that returns the top three ingredient contributions for a ranked impression in plain English. The right-to-explanation rail under GDPR Article 22; the algorithm-transparency rail under product principle.
See also: ALGORITHMS.md §6.4.

**window shopping.** A behavioral pattern where a user revisits the same small set of candidates without engaging — opens the profile, scrolls, leaves, repeats. Detected by `dtmTopicMask.ts` as a signal to delay heavy DTM topics for that viewer.
See also: ALGORITHMS.md §3.D.1.

**withConsent.** The helper wrapper that gates a feature path on a consent flag — `withConsent("moodInferenceEnabled", () => inferMood(...))`. If consent is off, the wrapper returns a neutral default rather than running the inference; logs the skip for the audit trail.
See also: SECURITY.md §11.

---

## X

**XADD.** The Redis stream append command. Used by the ingest service to write tracking events; the second arg is `*` (auto-id) and the third is the event payload serialised with JSON. Append latency is sub-millisecond under steady state.
See also: TRACKING.md §4.

**XREADGROUP.** The Redis stream consume command (with consumer groups). Used by every worker loop to consume events at-least-once with explicit XACK on success. Failed consumes are retried after a 60-second pending-entry-list scan.
See also: TRACKING.md §6.3.

---

## Y

(No Y entries yet — reserved for future terms.)

---

## Z

**zustand.** The lightweight React state library used by the web client. State stores live in `services/web/src/lib/` and the new hooks (`useCachedResource.ts`, `useScrollRestore.ts`) build on top of zustand for cross-route persistence.
See also: services/web/src/lib/, services/web/src/hooks/useCachedResource.ts, services/web/src/hooks/useScrollRestore.ts.

---

## Additional terms (cross-reference)

The remaining entries below cover terms referenced in code, docs, or product copy that did not fit cleanly into a single letter section above. They are still alphabetical within this appendix and follow the same shape.

**ACL primitives.** The per-resource access-control building blocks — `canRead(user, resource)`, `canWrite(user, resource)`, `canAdmin(user, resource)`. Composed into route-specific middleware; the helpers return `{ allowed: boolean, reason?: string }` for audit logging.
See also: SECURITY.md §2.3.

**activity-analyzer.** The module (`services/shared/activity-analyzer.ts`) that computes derived activity metrics — recent depth mean, polarity trend, session-shape features. Reads from EventAggHourly and writes to UserActivity; the central feature-store for the right-now classifiers.
See also: services/shared/activity-analyzer.ts.

**activeRanker.** Synonym for `active.ts` — the online-now ranker that surfaces candidates currently active in the app. See active ranker entry below.
See also: ALGORITHMS.md §1.6.

**active ranker.** The ranker (`active.ts`) that surfaces candidates currently active in the last 15 minutes. Used as one of the ingredients in the multi-objective combiner and as a standalone surface ("Active now").
See also: ALGORITHMS.md §1.6.

**ai picks.** The Discover ensemble (`aiPicks.ts`) that calls multiple sub-rankers (forYou, cf, dtm, new) and ensembles their outputs into a single deck. Distinct from AI Match (single top pick) — AI Picks returns a deck.
See also: ALGORITHMS.md §1.3.

**AI Match.** The single top pick surfaced daily per user (`aiMatch.ts`). Selected from the AI Picks ensemble by argmax score with a same-author rate cap; the daily limit is one per user.
See also: ALGORITHMS.md §1.4.

**author rate cap.** The cap on how many slots a single author can occupy in a single deck or surface (default 1). See dailyCap.
See also: ALGORITHMS.md §1.1.

**back-end-for-front-end (BFF).** The gateway pattern — the web client talks to a single gateway, the gateway fans out to the 11 services. Miamo's gateway is the auth + routing layer at port 3000.
See also: ARCHITECTURE.md.

**batch.** A single ranked group of 10 candidates delivered to Discover. See batchLadder.
See also: ALGORITHMS.md §2.1.

**breathe card.** The pause card inserted between batches in Discover, displaying a short prompt ("take a breath; the next ten are coming"). Renders for a fixed 2-second minimum or until the user gestures.
See also: PRODUCT.md, ALGORITHMS.md §2.1.

**candidate id.** The internal UUID for a candidate row. Distinct from `userId` (the candidate is the same user but referenced from the viewer's perspective); the distinction matters in tracking envelopes where both fields can appear.
See also: TRACKING.md §3.

**chat-focused.** One of the seven intent classes — the user is on Discover briefly between active chats. The ranker responds by surfacing candidates the user has prior context with (mutual passes, mutual likes) rather than novel candidates.
See also: ALGORITHMS.md §3.A.1.

**cf signature.** The collaborative-filter user signature — a sparse vector of "who I have positively engaged with". Updated incrementally by the LearnerLoop; never persisted in raw form, only as the projection used by `cf.ts`.
See also: ALGORITHMS.md §1.9.

**cold storage.** The archival tier (S3 + Glacier) for tracking events, feature snapshots, and session summaries older than 30 days. Hot data is queried from Postgres; cold data is queried from Parquet files on demand.
See also: TRACKING.md §6.15.

**ColdStore.** The worker loop (TRACKING.md §6.15) that moves rolled-up tables older than 30 days from Postgres to S3 Parquet, updates the data dictionary, and trims the hot tables.
See also: TRACKING.md §6.15.

**compatWriter.** The worker loop (TRACKING.md §6.5) that walks the pair-compatibility job queue, calls `pairCompatV6.ts` per pair, and writes results to the Redis warm cache and the Postgres cold table. Runs continuously with priority for high-recency pairs.
See also: TRACKING.md §6.5.

**ConsentEvent table.** See ConsentEvent.

**CORS.** Cross-Origin Resource Sharing. Miamo's gateway sets `Access-Control-Allow-Origin` to the web client origin only — no wildcard; credentialed requests are allowed for the web client and rejected for any other origin.
See also: SECURITY.md §5.3.

**CSP.** Content Security Policy — the browser-side header that restricts script, style, image, and connect sources. Miamo's CSP is strict-dynamic with a nonce; the nonce is regenerated per response in the gateway.
See also: SECURITY.md §5.2.

**dailyMatch worker.** The worker loop that produces the per-user "today's matches" set used by the home surface. Distinct from the weekly Top-10 — daily matches are a softer ranking, weekly Top-10 is stable-matched.
See also: TRACKING.md §6.8.

**DailyMatchWorker.** See dailyMatch worker.
See also: TRACKING.md §6.8.

**data dictionary.** The internal catalog of every table, column, type, and retention policy. Lives in `services/shared/data-dictionary.md`; updated alongside every schema change.
See also: DATA_MODEL.md.

**data fiduciary.** The DPDP-defined role of the entity responsible for personal-data processing decisions. Miamo's data fiduciary appointment is recorded in the AuditLog and surfaced at `/privacy/governance`.
See also: SECURITY.md §10.1.

**data minimisation.** The principle that only the data needed for a stated purpose is collected and retained. Miamo's minimisation rails are the consent toggles, the HMAC pseudonymisation, the 30-day hot-cold transition, and the auto-prune workers.
See also: SECURITY.md §10.9.

**DeferPrune.** The worker loop that prunes the deferred-item queues and expired exposure credits. Runs every 6 hours; idempotent.
See also: TRACKING.md §6.14.

**deferred queue.** The per-session queue of deferredItems held for the next batch. See deferredItem.
See also: ALGORITHMS.md §1.17.

**diaspora.** The non-resident user segment (NRI). Has slightly different ranking priors — distance fit is downweighted, festival hooks are upweighted, English-mono is more common than code-mix.
See also: PRODUCT.md.

**diversity rerank.** The reranker step that diversifies the top-K by candidate cluster — prevents the top 10 from all looking the same. Implemented as a MMR-style pass over the cluster ids.
See also: ALGORITHMS.md §3.B.4.

**Do Not Sell.** CCPA-defined user choice — the user opts out of any sale of their personal data. Miamo does not sell personal data, so Do Not Sell is a no-op for us, but the UI is wired to set the user-side flag and the choice is honoured in any future data-sharing arrangement.
See also: SECURITY.md §10.3.

**dtmAnswerHistory.** The per-user record of DTM answers — topic id, value, timestamp, source. Read by the topic picker (no repeats) and by `pairCompatV6.ts` (overlap scoring).
See also: ALGORITHMS.md §4.2.

**dtmBatch.** The masked DTM feed composer (`dtmBatch.ts`) — calls `dtmTopicMask.ts` for the gate, then the topic picker for the order, then the cold-start handler for new users. Returns a deck of 5 DTM topics per session.
See also: ALGORITHMS.md §3.D.2.

**dtmColdStart.** The DTM cold-start handler (`dtmColdStart.ts`) that picks 5 starter topics for a user with no answer history, balancing coverage and engagement-probability priors.
See also: ALGORITHMS.md §4.3.

**dtmExplain.** The DTM-specific explainer (`dtmExplain.ts`) that says why a specific DTM topic was picked or masked. Distinct from the general `explain.ts`; specialised for DTM ingredients.
See also: ALGORITHMS.md §4.4.

**dtmFeedV7.** The successor DTM picker (`dtmFeedV7.ts`) that adds mood-conditioning and coverage-stage logic. Behind a flag; ramping behind the learner.
See also: ALGORITHMS.md §2.2.

**dtmTopics.** The static + dynamic topic catalog (`dtmTopics.ts`). Static topics ship with the app; dynamic topics are added via the admin console and tagged by faith, language, region.
See also: ALGORITHMS.md §4.1.

**dwell.** The time a user spends on a profile card before swiping away. Measured in milliseconds; one of the dominant features in `depthOfEngagement.ts`.
See also: ALGORITHMS.md §3.A.4.

**embedding worker.** The worker loop (TRACKING.md §6.6) that computes user and content embeddings (text + photo) and writes them to a vector index. Offline; refreshed daily per user.
See also: TRACKING.md §6.6.

**EmbeddingWorker.** See embedding worker.
See also: TRACKING.md §6.6.

**enrichment worker.** The worker loop (TRACKING.md §6.7) that enriches raw tracking events with derived attributes — depth label, polarity label, intent label — and writes the enriched form back to the event store.
See also: TRACKING.md §6.7.

**EnrichmentWorker.** See enrichment worker.
See also: TRACKING.md §6.7.

**Express.** The Node HTTP framework Miamo uses across every service. Every Miamo service is a standalone Express app; the gateway is also Express.
See also: ARCHITECTURE.md.

**fail-open.** The pattern where a dependency outage allows the request through rather than blocking it. Miamo applies fail-open to idempotency, rate limiting, and consent checks — the risk of denied service is judged greater than the risk of duplicate processing in those paths.
See also: SECURITY.md §7.3.

**fairnessAudit.** The worker (`fairnessAudit.ts`) that walks the week's exposure ledger, computes per-protected-class exposure parity and Gini, and alarms on threshold breaches. Runs weekly; output is read by the learner as a guardrail.
See also: ALGORITHMS.md §7.4.

**fairness budget.** The maximum allowable relevance-loss the fairness rerank may incur (default 5%). Beyond the budget, the rerank aborts and the original ranking is returned with a flag.
See also: ALGORITHMS.md §3.B.3.

**feedAugment.** The reranker (`feedAugment.ts`) that augments the home feed with timely candidates from outside the primary ranker — fresh signups, returning users, festival-matched users.
See also: ALGORITHMS.md §1.16.

**feature aggregator.** The worker loop (TRACKING.md §6.4) that rolls up raw events into hourly and daily aggregates per user. The middle layer between the raw stream and the candidate-pool builder.
See also: TRACKING.md §6.4.

**FeatureAggregator.** See feature aggregator.

**focusAffinity worker.** The worker loop (TRACKING.md §6.12) that computes the per-user per-hour quality-engagement profile. Reads from EventAggHourly; writes to FocusAffinityHourly.
See also: TRACKING.md §6.12.

**FocusAffinityWorker.** See focusAffinity worker.

**force.** The Reels-internal "force-rerank" override admin flag — never used in production, exists for debugging and demo flows. Documented here so a reader who grep-finds it can confirm it is intentional.
See also: services/content/src/creativity-spotlight.ts.

**forget endpoint.** The ingest endpoint `POST /forget` that takes a userId and emits a tombstone event into the stream; downstream workers see the tombstone and prune the user's rows. Part of the RTBF flow.
See also: TRACKING.md §2.4.

**forYou.** The canonical Discover ranker (`forYou.ts`) — the v3.5 surface that combines content-based, collaborative-filter, distance, recency, and verified ingredients. Replaced by `forYouV6.ts` behind a flag in v3.6.0.
See also: ALGORITHMS.md §1.1.

**forYouV6.** The v6 successor to forYou (`forYouV6.ts`) — adds the right-now ingredients (intent, mood, polarity, depth), the earned-exposure ingredient, and the fairness-rerank gate. Ramped behind `ALGO_V8_*` flags.
See also: ALGORITHMS.md §1.2.

**FrontEnd.md.** The doc covering the web client architecture, routing, state, and rendering patterns. Reference for ReelsView, SpotlightUI, and the new EarnDrawer.
See also: FRONTEND.md.

**galeShapley solver.** The implementation of Gale-Shapley used by the stable-match worker. See galeShapley.
See also: ALGORITHMS.md §3.B.2.

**gateway.** The Express service at port 3000 that fronts every public route, applies auth, rate limiting, idempotency, and CORS, then proxies to the appropriate internal service.
See also: ARCHITECTURE.md, SECURITY.md.

**generated client.** The Prisma client generated from the canonical schema. There is exactly one — `services/shared/node_modules/@prisma/client` — and every service imports from it; regenerating requires restarting every service.
See also: ARCHITECTURE.md.

**Global Privacy Control (GPC).** The browser-set header indicating the user has globally opted out of data sale and certain processing. Miamo honours GPC as equivalent to a Do Not Sell signal under CCPA.
See also: SECURITY.md §10.3.

**hate scroll.** See polarity classifier.

**hot data.** Data stored in Postgres queryable in single-digit-millisecond time. Contrasted with cold data (S3 Parquet, hundreds-of-milliseconds query time).
See also: TRACKING.md §6.15.

**HS256.** HMAC with SHA-256, the JWT signing algorithm Miamo uses for access and refresh tokens. See JWT.
See also: SECURITY.md §1.2.

**Idempotency-Key header.** The HTTP header `Idempotency-Key` set by the client to mark a request as idempotent. The idempotency middleware reads this header and stores the response keyed by `(userId, key)` for 24 hours.
See also: SECURITY.md §7.

**ingredient.** A single scoring component in the multi-objective combiner — relevance, fairness, earned exposure, recency, intent fit. Each ingredient is independent, ramp-able, and explainable.
See also: ALGORITHMS.md §3.B.4.

**ingredient explainer.** The function that returns "this ingredient contributed X to the final score because Y". Used by `explain.ts` and `dtmExplain.ts` to compose the user-facing "why am I seeing this".
See also: ALGORITHMS.md §6.4.

**intent inference loop.** See intent inference.

**intent.snapshot event.** The v8 tracking event (`intent.snapshot`) emitted by the right-now-intent worker every 30 seconds with the current intent label and confidence. Consumed by the FeatureAggregator and the learner.
See also: TRACKING.md §5.3.3.

**JSON envelope.** The shape of every tracking event — `{ v: 1, ctx: {...}, event: {...} }`. The envelope is validated at ingest before the event reaches the stream.
See also: TRACKING.md §3.

**JSON Web Token.** See JWT.

**JWT format pre-verify regex.** The regex applied to a JWT before signature verification — three base64url segments separated by dots. Rejects malformed tokens cheaply before the signature check.
See also: SECURITY.md §1.4.

**knip findings.** The output of the knip dead-code detector. See knip.
See also: DEVOPS.md.

**LearnerLoop.** See learnerLoop.

**LinUCB-flavoured.** Describes Miamo's learner — uses the LinUCB confidence-bound update but with diagonal covariance for speed. See LinUCB.
See also: ALGORITHMS.md §5.1.

**load shedding.** The pattern of dropping non-critical work under load. Miamo's ingest service load-sheds analytics events under sustained pressure (returns 202 without writing) while continuing to accept auth and ranker requests.
See also: SECURITY.md, DEVOPS.md.

**matched (state).** The user has matched with a candidate — typically via a sent and accepted Move. Distinct from "liked" (one-sided) and "chatting" (post-match).
See also: PRODUCT.md.

**matrimonial.** The product positioning — long-horizon serious-intent matching, distinguished from casual dating. Cited throughout PRODUCT.md as the strategic axis.
See also: PRODUCT.md.

**Miamo Move v2.** The v3.6.0 successor to Miamo Move, replacing the single-template composer with the five-suggestion ensemble (sender voice + receiver resonance + hook library + code-mix + cringe linter). See Miamo Move.
See also: ALGORITHMS.md §3.C, MIAMO_MOVE.md.

**moveProfile.** See moveProfile (under M).

**moveV2 linter.** The 26-phrase cringe-detection linter that runs on every composed suggestion before it leaves the composer. See AI cringe.
See also: ALGORITHMS.md §3.C.6.

**multi-objective combiner.** The implementation of multi-objective ranking. See multi-objective ranking.
See also: ALGORITHMS.md §3.B.4.

**new ranker.** The recency-boost ranker (`new.ts`) that surfaces freshly-joined users to existing members. Used as an ingredient in the multi-objective combiner and as a standalone surface ("New here").
See also: ALGORITHMS.md §1.5.

**no-show.** An event in the anti-ghost economy where the receiver did not open the conversation within the deposit window. Deposit is refunded in full; no burn.
See also: ALGORITHMS.md §3.D.3.

**non-resident Indian (NRI).** See diaspora.

**notifyTiming.** See notification timing.

**oneOf (validator).** A zod combinator used in request validation. Used in the tracking envelope schema for the polymorphic event field.
See also: SECURITY.md §6.

**onlyIfConsented.** Helper synonym for withConsent. See withConsent.
See also: SECURITY.md §11.

**openness (mood).** One of the five mood dimensions — open vs closed. High openness means the user is more receptive to suggestions and lighter DTM topics.
See also: ALGORITHMS.md §3.A.2.

**outgoing-message corpus.** The history of messages a user has sent. Read by the sender-voice fingerprint job; never read by the ranker directly (only the derived fingerprint is).
See also: ALGORITHMS.md §3.C.1.

**pair compat.** Short for pair compatibility. See pairCompatV6.
See also: ALGORITHMS.md §6.3.

**pause card.** See breathe card.

**per-resource ACL.** See ACL primitives.

**PII redaction in logs.** The log middleware step that replaces PII fields (email, phone, name) with redaction markers before the log line is shipped. Applied uniformly across every service.
See also: SECURITY.md §8.4.

**polarity.computed event.** The v8 tracking event (`polarity.computed`) emitted by the polarity worker with the current session polarity label. Consumed by the FeatureAggregator.
See also: TRACKING.md §5.3.2.

**postImpressionRerank.** The reranker (`postImpressionRerank.ts`) that adjusts the next batch's candidate scores based on observed engagement in the current batch — a positive zoom on candidate A boosts similar candidates in batch +1.
See also: ALGORITHMS.md §1.17.

**preferenceSnapshot.** The frozen record of a user's stated and derived preferences at the start of a session. Read at session-open; not re-read mid-session, so the user sees a consistent decking pattern within a session.
See also: ALGORITHMS.md §5.4.

**preview lint.** The Move v2 lint pass that runs on the suggestion before it is shown to the user. Distinct from the post-send lint (which never blocks, only flags).
See also: ALGORITHMS.md §3.C.6.

**priority slot.** A slot in the candidate pool reserved for earned-exposure assignments (premium users, high-credit users, weekly-top-10 candidates). Priority slots are filled before relevance-rank slots.
See also: ALGORITHMS.md §3.B.1.

**productive scroll.** The opposite of hate scroll — sustained engagement with deeper-than-glance interactions. Detected by the polarity classifier as `positive_interest`.
See also: ALGORITHMS.md §3.A.3.

**push timing.** See notification timing.

**rate limiter (Redis sliding window).** The implementation of rate limiting — counters stored in Redis with sliding-window TTL, atomic INCR + EXPIRE. Cheap, distributed, and fair.
See also: SECURITY.md §4.

**ReceiverResonance.** See receiver resonance.

**Redis stream.** The append-only event log used as the ingest backbone. Indexed by event id; consumed by 17 worker loops with explicit XACK semantics.
See also: TRACKING.md §4.

**relevance loss budget.** See fairness budget.

**request envelope.** See JSON envelope.

**request tracing middleware.** See requestId.

**RollupConsumer.** The primary worker loop (TRACKING.md §6.3) that consumes raw events from the Redis stream and writes hourly roll-ups to EventAggHourly. The "lung" of the tracking pipeline.
See also: TRACKING.md §6.3.

**rolled-up table.** A Postgres table containing pre-aggregated events at hourly or daily granularity. EventAggHourly, EventAggDaily, FocusAffinityHourly, UserActivity, SafetyAgg.
See also: TRACKING.md §6.

**RTBF.** See right to be forgotten.

**SafetyRollup.** The worker loop (TRACKING.md §6.9) that aggregates block-received, report-received, and ghost rates per user into SafetyAgg. Read by the negative-signal-engine.
See also: TRACKING.md §6.9.

**sanitize.** The HTML and control-character sanitiser applied to free-text inputs (bio, messages, DTM answers). Distinct from validate (which checks shape) — sanitize transforms.
See also: SECURITY.md §6.3.

**schema catalog.** The set of zod schemas in `services/shared/src/schemas.ts` covering every request body, every event envelope, every tracking event. Single source of truth for input shapes.
See also: SECURITY.md §6.2.

**SDK.** Software development kit — used in Miamo only in the context of the Anthropic SDK for the Move v2 composer's optional LLM fallback path. Provider-default is the in-house template engine; LLM fallback is behind a flag and disabled in production.
See also: MIAMO_MOVE.md.

**searchAugment.** The reranker (`searchAugment.ts`) that augments a user search query with personalised candidates ranked by relevance to the query. Distinct from the search service's keyword match.
See also: ALGORITHMS.md §1.15.

**senderVoice.** See sender voice.

**serverless cold start.** Not applicable to Miamo — Miamo's services are long-running Express processes, not serverless functions. The term appears in some legacy docs and is included here to clarify it is not used.
See also: ARCHITECTURE.md.

**session-shape features.** The bundle of features summarising the current session — dwell, scroll velocity, zoom count, polarity, mood, intent. Read by every right-now classifier.
See also: ALGORITHMS.md §3.A.

**session summary worker.** See SessionSummary.

**SessionSummaryWorker.** The worker loop (TRACKING.md §6.11) that writes SessionSummary on session close. Idempotent; the close trigger is either a 5-minute inactivity timeout or an explicit client signal.
See also: TRACKING.md §6.11.

**shadow ramp.** A ramp where the new code path runs but its output is discarded — used to validate latency and error-rate under production load before the output is actually shown. The learner runs every new ingredient on a 24-hour shadow ramp before enabling output.
See also: ALGORITHMS.md §5.1.

**Singh, Joachims.** See Singh-Joachims.

**SLA.** Service level agreement. Miamo's internal SLAs are 200 ms p99 for Discover, 500 ms p99 for DTM, 100 ms p99 for Move composer. Tracked by the request-tracing middleware.
See also: DEVOPS.md.

**spotlight ledger.** See SpotlightLedger.

**stableMatchTop10.** The worker (TRACKING.md §6.18) that runs Gale-Shapley over the week's high-affinity candidates to produce per-user Top-10. See galeShapley.
See also: ALGORITHMS.md §7.3.

**streak.** The consecutive-day counter (login streak, Move streak, reply streak). Drives small exposure-credit grants at multiples of 7.
See also: PRODUCT.md.

**surface.** A distinct user-facing experience — Discover, Reels, DTM, Move, AI Match. Each surface has its own learner instance and its own ramp rate.
See also: ALGORITHMS.md §2.5.

**surfaceLearner.** See learner; see learnerLoop. The per-surface learner instance and its half-life decay logic.
See also: ALGORITHMS.md §2.5.

**templater.** A function that fills a template with concrete values from a feature vector. The Move v2 voice templater and the family-brief templater are the two production templaters.
See also: ALGORITHMS.md §2.3.

**throughput rate cap.** The per-user per-day cap on ranked impressions. Default 500; premium 750. Prevents pathological doomscroll states.
See also: PRODUCT.md.

**timezone.** Stored per user (`User.timezone`) and used by the notification-timing worker. Defaults to the device's reported zone at signup; user can override in Settings.
See also: PRODUCT.md.

**tombstone event.** The marker event written to the stream by the forget endpoint, signalling downstream workers to prune a user's rows. See forget endpoint.
See also: TRACKING.md §2.4.

**topic mask.** See TopicMask.

**TopicPicker.** The DTM topic-selection function. See dtmFeedV7.
See also: ALGORITHMS.md §2.2.

**TrackEvent.** The shape of a single tracking event payload — `{ name: TrackEventName, ts: number, payload: {...} }`. Validated at ingest.
See also: TRACKING.md §3.4.

**tracking envelope.** See JSON envelope.

**tracking pseudonymisation.** The HMAC-SHA256 of userId and did applied at ingest before any persistence. See HMAC-SHA256.
See also: SECURITY.md §3.3.

**transparency log.** The append-only log of every consent change, RTBF action, and admin operation. See AuditLog.
See also: SECURITY.md §10.1.

**triple-secret RTBF.** The RTBF mechanism using three secrets — per-user, per-table, per-service — such that flipping any one renders prior data unrecoverable. See right to be forgotten.
See also: SECURITY.md §3.4.

**TTL.** Time-to-live. Used uniformly for cache entries, idempotency keys, rate limit windows, and OTP codes. Specified per use site.
See also: SECURITY.md.

**verifications worker.** The worker that processes verification submissions (selfie, ID). Async; result is written to `User.verifications` and an exposure-credit grant is recorded.
See also: PRODUCT.md.

**voice fingerprint job.** The offline job that recomputes the 12-feature voice fingerprint per user. Runs nightly; on-demand on signup after the first 20 sent messages.
See also: ALGORITHMS.md §3.C.1.

**voice_fingerprint.shown event.** The v8 tracking event (`voice_fingerprint.shown`) emitted when the VibeCheck preview is shown to the user. See VibeCheck.
See also: TRACKING.md §5.3.9.

**voice_fingerprint.shared event.** The v8 tracking event (`voice_fingerprint.shared`) emitted when the user opts to share their voice fingerprint with a receiver (via Move v2). Distinct from showing — sharing is the user's affirmative choice.
See also: TRACKING.md §5.3.10.

**warm cache.** The Redis layer between the slow Postgres compatibility cold table and the fast ranker. Hit rate ≥ 95% under steady state. See pair compat cache.
See also: TRACKING.md §6.5.

**weekly streak.** The 7-consecutive-day login streak that unlocks a small exposure-credit grant.
See also: PRODUCT.md.

**weight vector.** The per-surface vector of ingredient weights tuned by the learner. See UserWeightProfile.
See also: ALGORITHMS.md §5.1.

**withConsent wrapper.** See withConsent.

**worker loop.** A long-running consumer of the Redis stream that performs a specific transformation — roll-up, aggregate, embed, enrich, etc. Miamo has 17 worker loops as of v3.6.0.
See also: TRACKING.md §6.

---

## Implementation notes for future maintainers

This glossary is intentionally exhaustive on terms that appear in the codebase or product surface. Three rules govern additions:

1. **A new term in the codebase requires a glossary entry in the same PR.** This is checked manually in review; there is no CI gate yet.
2. **A glossary entry must point at exactly one canonical doc that elaborates.** If the term is so new that no doc covers it, write a stub elaboration in the relevant doc before adding the glossary entry.
3. **A glossary entry must not exceed ~8 lines.** If you need more, the term belongs in a doc, not the glossary. The glossary is the index, not the reference.

The current term count is roughly 220 entries across all letters; the file is intentionally over-broad so that a reader unfamiliar with the codebase can grep here first and follow the See-also pointers to the deep doc.

For maintenance, the canonical source-of-truth docs in priority order are:

- `docs/ALGORITHMS.md` — every algorithm and ranking term.
- `docs/TRACKING.md` — every event, worker, and tracking concept.
- `docs/SECURITY.md` — every authentication, authorisation, encryption, and privacy term.
- `docs/PRODUCT.md` — every product surface and persona.
- `docs/ARCHITECTURE.md` — every service, port, and infrastructure term.
- `docs/DATA_MODEL.md` — every Prisma model and column.
- `docs/FRONTEND.md` — every web client surface and component.
- `docs/MIAMO_MOVE.md` — every Move v2 detail.
- docs/architecture/v3.6-market-scan.md — the historical and competitive context.

When in doubt, prefer adding the entry over skipping it. A glossary too thick to scan is better than a glossary too thin to be useful — that is the cleanup-prompt §4.D.15 stance and it is the stance applied here.

---

## Appendix — terms intentionally omitted

A handful of terms appear in branch names, prototype PRs, or scratch files but are not part of the production code path. They are listed here so a maintainer who greps for them can confirm the omission is intentional:

- `forYouV5` — predecessor to `forYouV6`; removed in v3.5.0.
- `forYouV7` — experimental successor; never shipped, code deleted.
- `dtmV5` — predecessor to `dtmV6`; removed in v3.5.0.
- `moveV1` — predecessor to `moveV2`; ringfenced behind a kill flag, will be removed in v3.7.0.
- `legacyTracker` — pre-envelope tracker; removed in v3.4.0.
- `swipeRanker` — internal nickname for `forYou.ts` in early commits; no longer in use.
- `personalityVector` — early attempt at MBTI-style modelling; abandoned in favour of behavioral archetypes.
- `castMatch` — typo of "casteMatch" in one early branch; never merged.

If you find a reference to any of these in production code, that is a bug — please file an issue.

---

## Appendix B — extended definitions

The entries in the main alphabet are deliberately terse — one or two sentences plus a technical line — because the glossary's job is to be greppable, not to be the reference. A handful of terms warrant a longer treatment because they are load-bearing across many docs, and the See-also links are not sufficient when a reader needs the concept in one place. Those extended definitions are gathered here.

**Extended: ALGO_V8_* flag family.** The v3.6.0 rollout introduced a family of feature flags prefixed `ALGO_V8_`, one per major new ingredient or surface. The shape is rigid: every flag is a percentage in `[0, 100]`, stored in Redis under the key `flags:algoV8:<name>`, and read by every service through the shared flags module. The percentage means "what fraction of requests on the gated surface use the new path." A flag at `0` is the dark-launch state — the new code is loaded but never executed. A flag at `100` is full rollout — the old code path is unreachable. Flags between `0` and `100` use the per-user stable hash so that a single user is consistently on one side or the other across requests; the hash function is `HMAC-SHA256(userId, "algoV8")` modulo 100. The learner is allowed to tune the flag downward (never upward) if guardrail metrics breach; ramps upward are an explicit manual operation through the admin console with two-person review. The family of flags as of v3.6.0 is enumerated under ALGO_V8_* flags in the main alphabet; the canonical doc is ALGORITHMS.md §5.1.

**Extended: anti-ghost economy.** The chat economy in `antiGhost.ts` is a four-step exchange: (1) sender composes a Move, (2) sender pays a deposit at send time, (3) receiver receives the Move within their inbox; if the receiver replies within 48 hours, the sender receives the deposit plus a reply bonus; if the receiver does not open the conversation, the deposit is refunded in full (no-show); if the receiver opens and does not reply within 7 days, a fraction of the deposit is burned (ghost burn) and the rest refunded. The currency is intra-account credits, not real money, and the absolute amounts are small (a typical deposit is 5 credits, a typical user has ~200 credits). The economy is designed to nudge — a deliberate friction on sending low-effort first Moves, a deliberate reward for receivers who close the loop — not to gate access. Edge cases: a receiver who blocks the sender mid-window triggers an immediate full refund; a sender who deletes their account mid-window has their deposit forfeited to the platform pool; a Move that the linter caught after sending (rare) is refunded silently. The whole economy is governed by `ALGO_V8_ANTI_GHOST` and can be turned off without affecting any other Move v2 flow.

**Extended: archetype inference.** A user's archetype is one of `wordsmith`, `voice_first`, `visual`, `fast_replier`, inferred from their outgoing-message corpus. The inference job runs nightly per user with at least 20 sent messages; users below that threshold have no archetype set and the composer falls back to a generic templater. The job computes five derived metrics per user: median message length in characters, voice-note rate (voice notes / total sends), photo-reply rate, median reply latency in seconds, emoji rate. The four archetypes are then assigned by a rule cascade — voice-note rate above 30% wins voice_first first, then photo-reply rate above 25% wins visual, then median length above 200 characters wins wordsmith, then median latency below 240 seconds wins fast_replier, with ties broken by the first match in this order. Users who match none default to wordsmith because it has the lightest downstream policy. Archetype drift is allowed — a user moving from voice_first to wordsmith over several months is tracked and the new archetype takes effect on the next nightly job. The archetype is one of the 12 features in the voice fingerprint; the other 11 features are continuous, archetype is the only categorical.

**Extended: candidate pool construction.** The candidate pool for a single Discover request is built in three passes: hard filter, soft filter, scoring candidate. Hard filter removes blocked, hidden, paused, age-out, geography-out, and verification-required-but-not-verified candidates at the Postgres level — these candidates never enter memory. Soft filter applies the fatigue penalty (recently seen without engagement) and the daily-cap (this author already shown today) as score modifiers, not exclusions — the candidate stays in the pool but is downweighted. Scoring candidate is the surviving set fed into the multi-objective combiner, typically 200 to 800 candidates for a typical viewer. The pool size is bounded by an internal cap of 1500 to keep ranker latency under 200 ms; if the hard-filter step returns more than 1500, a deterministic per-viewer sample is taken. The deterministic sample uses a per-viewer seed so that the same viewer sees the same sample twice in a row (stable jitter applied), but the sample is recomputed daily so that the pool refreshes.

**Extended: code-mix detection.** The `codeMix.ts` module recognises four language families: Hindi-English (Hinglish), Tamil-English (Tanglish), Bengali-English, and Indic-English fallback. Detection is in two stages: (1) script detection on the raw message text — Devanagari script for Hindi, Tamil script for Tamil, Bengali script for Bengali; (2) token-level language id on the script-Roman portion, using a lightweight n-gram classifier shipped with the app (no network call). The classifier returns a per-token language probability; the message-level mix ratio is the fraction of tokens classified as non-English with probability above 0.6. A user is assigned to a family if their last 50 sent messages have a mix ratio between 25% and 75% in that family; below 25% the user is assigned monolingual English, above 75% the user is assigned monolingual non-English. The composer picks templates from the user's assigned family, then code-mixes them at the same ratio. Misclassifications are most common at the script-Roman boundary for users who write transliterated Sanskrit terms (e.g. "namaste yaar" can be misread as Tanglish); the impact on the composer is small because hooks are generic across families and the mix ratio is what differs.

**Extended: collaborative filter (CF) signature.** Each user has a CF signature — a sparse vector indexed by other users, with values representing positive engagement weight (like, Move sent, reply received, deep DTM read). The signature is built incrementally by the LearnerLoop: each positive event adds to the corresponding entry, each pass or block subtracts. Values are clipped to `[-1, +1]` per pair to prevent any single pair from dominating. The signature is the input to `cf.ts`, which scores a candidate by the dot product of the viewer's signature with a candidate signature constructed from the candidate's likers, repliers, and DTM-readers. The signature is never persisted in raw form — only the projection used by `cf.ts` is stored, as a 64-dimensional float vector per user, recomputed nightly. The projection is a randomised SVD initialised with a fixed seed so it is reproducible. Edge cases: a user with no positive events has a zero signature and CF contributes zero to their score; a user with very strong asymmetric signals (high inbound likes, zero outbound) has a one-sided signature and CF biases toward similar one-sided candidates.

**Extended: depth of engagement classifier.** The classifier output is a five-class label — accidental, glance, scan, inspection, deep_inspection. The features it reads are: zoom count, scroll depth (fraction of profile scrolled), photo carousel max index, DTM open boolean, dwell time, exit gesture (swipe direction). The classifier is a rule cascade, not a trained model — the rules are deliberately interpretable so that a user-side "why was this counted as accidental" path can be wired. Rule cascade: dwell under 700 ms with no zoom and no DTM → accidental; dwell 700–2000 ms with at most one carousel index → glance; dwell 2000–8000 ms or carousel index above 1 → scan; DTM open or dwell above 8000 ms → inspection; DTM open and dwell above 15000 ms and zoom count above 2 → deep_inspection. The classifier output is written into the FeatureSnapshot for the request and used as a quality multiplier by every downstream ranker. The ranker's reward function weights the labels approximately {accidental: 0, glance: 0.1, scan: 0.4, inspection: 1.0, deep_inspection: 2.0} — these weights are themselves bandit-tuned.

**Extended: exposure credits and the ledger.** Exposure credits are the unit of earned visibility. A user accrues credits by completing high-quality actions — verified selfie (10 credits), completed DTM cold-start (5 credits), deep DTM answer (1 credit each, capped at 5 per day), helpful reply received (2 credits), weekly login streak (3 credits at multiples of 7). Credits do not expire in production (an explicit decision — expiry would be punitive). Each credit is recorded as an ExposureLedger row with timestamp, source, and a granted-by reference. The exposure scheduler runs every five minutes and consumes credits by writing slot-fill assignments to Redis: for each user with non-zero credit balance, the scheduler picks the next-batch slot with the highest expected reward conditional on the credit and writes the assignment. The ranker reads the assignment at request time and inserts the credit-holder into the candidate pool with a priority flag that survives the fairness rerank (priority slots are reranked among themselves, not displaced). Credit consumption is logged as a `exposure.slot_filled` event so the user can trace exactly which credit produced which impression.

**Extended: fairness rerank under Singh-Joachims.** The Singh and Joachims fair-ranking framework (2018) defines exposure parity as a property of a ranked list where the expected visibility of items from each protected group is proportional to their relevance — i.e. group exposure should not over- or under-represent relative to group quality. Miamo's `fairnessRerank.ts` implements this for gender as the protected attribute, within the top-K of every Discover batch (K = 20 by default). The reranker first computes the relevance-only ranking, then perturbs the order to equalise gender exposure while respecting a relevance-loss budget. The budget is computed as the cumulative DCG (discounted cumulative gain) loss from the perturbation, expressed as a fraction of the relevance-only DCG. The default budget is 5%. If the perturbation cannot equalise within the budget, the reranker emits the relevance-only ranking with a `fairness_aborted` flag, which the fairness audit then surfaces. The perturbation uses a swap-based local search starting from the relevance-only ranking. The fairness audit weekly recomputes exposure parity over a 7-day window and reports per-cohort Gini; threshold breach (Gini above 0.62) triggers a learner ramp-down on the surface.

**Extended: HMAC pseudonymisation in the tracking pipeline.** Every tracking envelope contains `ctx.userId` and `ctx.did` as raw identifiers when the client sends it. At ingest, before the event is persisted to the Redis stream, both fields are replaced by `HMAC-SHA256(value, secret)` where `secret` is the per-table HMAC secret stored only in the ingest service. The HMAC is irreversible without the secret — there is no rainbow-table attack on a 256-bit secret — so the persisted user id in the stream is unjoinable to the auth-side user id without the secret. This is the foundation of the triple-secret RTBF: deleting the per-user secret invalidates all HMAC joins for that user, effectively deleting their tracking footprint without touching the rows. The HMAC is stable across events for the same user, so the FeatureAggregator can roll up per-user stats; it is not stable across users, so privacy is preserved against cross-user inference attacks. The HMAC is also stable across `did` and `userId` separately — the same user logging in on two devices has two distinct `did` HMACs but one `userId` HMAC, allowing the rollups to attribute correctly.

**Extended: intent inference.** The right-now intent classifier is a rule cascade over rolling session-shape features computed by the activity-analyzer. The inputs are: last 60 seconds of dwell, last 60 seconds of pass rate, last 60 seconds of zoom rate, current DTM open status, current chat open status, current session length, prior intent. The seven output classes are casual_scroll, distraction_browse, decision_fatigued, chat_focused, dtm_focused, serious, settle. The cascade: chat open in foreground → chat_focused; DTM open in foreground → dtm_focused; session length > 20 minutes and pass rate > 80% → decision_fatigued; session length < 2 minutes and pass rate < 20% → casual_scroll; prior intent = serious and recent zoom rate > 5% → serious; prior intent persisted on settle target for 3+ sessions → settle; default → distraction_browse. The classifier runs every 30 seconds per active user and writes the output to a Redis key with 60-second TTL. The ranker reads the key at request time; a missing key means "no signal" and the ranker uses the user's stable intent (`User.intent`) as the fallback.

**Extended: learner reward attribution.** The learner is a contextual bandit that needs to attribute reward back to the ingredient choices that produced an impression. Miamo's attribution is multi-horizon: an impression is credited with three rewards — immediate (within 30 seconds of the impression, dominantly engagement-quality), short-horizon (within 24 hours, dominantly reply behaviour), long-horizon (within 7 days, dominantly retention). Each horizon has its own bandit instance per surface; the three are combined in the final weight vector with horizon weights {0.2, 0.5, 0.3} so that short-horizon rewards (which correlate strongest with our actual objective — matches) dominate. Attribution is event-id-based: the impression event has an id; downstream events carry the impression id in their ctx; the LearnerLoop joins by id. Misattribution risk: a user who engages deeply with candidate A and then with candidate B 10 minutes later could see B's reward attributed to A; we mitigate by capping the attribution window per-impression to 5 minutes for the immediate-horizon reward.

**Extended: Move v2 composer pipeline.** The composer pipeline runs every time a sender opens the Move surface against a specific receiver. Step 1: load the sender's voice fingerprint (cached, 5-minute TTL). Step 2: load the receiver's resonance profile (cached, 1-hour TTL). Step 3: pick the code-mix family from the receiver's profile, taking the sender's family as a secondary signal. Step 4: pick 3 candidate hook categories from the receiver's category-replied-to-most-recently list. Step 5: for each (family, category) pair, ask the moveVoice templater for one template per archetype; collect 5 candidate suggestions total. Step 6: run the cringe linter against each candidate; any that fail are dropped. Step 7: if fewer than 5 survive, pull additional templates from the generic hook library to backfill. Step 8: rank the 5 by an internal score (template-archetype fit × category-receiver fit × novelty against the sender's recent first Moves) and return the top 5 in ranked order. The whole pipeline runs in under 100 ms on the median request, well within the 500 ms SLA for the Move surface. The user picks one (or edits one, or writes their own); the choice is the learner reward.

**Extended: mood inference.** Mood is a 5-dimensional vector — calm-agitated, focused-distracted, open-closed, light-heavy, lonely-social. Each dimension is in `[-1, +1]`. The inference job runs every 30 seconds per active user with mood inference enabled (default OFF), reading session-shape features from the activity-analyzer. The inference is a per-dimension rule cascade rather than a trained model — interpretability is more valuable here than accuracy, because mood inference is the most sensitive of the v8 ingredients from a consent perspective. Calm-agitated: high scroll variance → agitated, low scroll variance with steady dwell → calm. Focused-distracted: long sessions on one surface → focused, frequent surface switching → distracted. Open-closed: high acceptance of suggestions (Moves opened, DTMs answered) → open; high rejection rate → closed. Light-heavy: dwelling on light DTM topics → light, dwelling on heavy DTM topics or matrimonial profile views → heavy. Lonely-social: session timing late-night and solo-app behaviour → lonely, session timing aligned with active social hours → social. The output is written to a Redis key with 60-second TTL; the ranker and dtmTopicMask read at request time. Default-off consent is the rail — without consent, no mood is computed and no key is written, and downstream readers see "no signal" and use neutral defaults.

**Extended: multi-objective ranking combiner.** The combiner takes per-candidate ingredient scores and produces a single ranked score. Ingredients as of v3.6.0: relevance (from forYouV6 or cf or content), fairness adjustment (from the rerank stage), earned exposure (from the priority-slot assignment), recency (expDecay against last-seen), intent fit (from intentFitRightNow). The combiner is linear with non-negative weights — `score = sum(w_i * ingredient_i)` — and the weights are per-surface, tuned by the learner. Non-negativity is enforced because the system is more interpretable that way: every ingredient is a positive lever. The combiner runs after every per-ingredient computation completes (in parallel where possible) and feeds the fairness rerank, which then feeds the diversity rerank, which produces the final batch. Weights are not exposed to the user but are exposed to the audit log; a user querying their feature snapshot sees the per-ingredient contribution, not the weight.

**Extended: notification timing.** The push-timing optimiser picks the hour and minute to send a single notification per user per day. Inputs: user's chronotype (morning lark / evening owl / late-night / unknown), recent open rate by hour, recent reply-after-open rate by hour, global rate cap (no more than 3 pushes per user per day across all sources), regional do-not-disturb window (default 22:00–07:00 local). The optimiser runs every 15 minutes against the global queue, decides which notifications to release for the next 15-minute window, and writes the release-time to the queue entry. Decisions are revocable — a notification scheduled but not yet released can be cancelled if the user opens the app naturally before the release time. The optimiser learns per-user: a user whose 09:00 push is consistently ignored will have 09:00 down-weighted within 7 days; a user whose 21:30 push gets opened reliably will have 21:30 up-weighted. The chronotype prior decays as personal evidence accumulates.

**Extended: pair compatibility (pairCompatV6).** Pair compat is the per-pair score in `[0, 1]` that represents "how compatible are viewer V and candidate C". Inputs: DTM-answer overlap (Jaccard on tagged answers), voice resonance (cosine similarity of voice fingerprints), archetype fit (predefined 4x4 matrix), shared-context features (faith, language family, region, age band). Each input contributes 0 to 1; the combiner is a weighted sum with weights tuned per surface — Discover weights overlap higher, the matrimonial profile surface weights faith and region higher, DTM weights overlap and resonance equally. The score is cached per pair for 24 hours; cache invalidation triggers on either user changing a DTM answer, updating their voice fingerprint, or changing profile fields that affect shared-context. The CompatWriter loop walks a job queue (new users, recently-changed users, recently-viewed pairs) and refreshes the cache. Read latency is sub-millisecond from Redis; cold-path compute is ~50 ms per pair when the cache is missing.

**Extended: polarity classifier.** Polarity is a three-class label — positive_interest, neutral, hate_scroll. The classifier runs every 30 seconds per active user and labels the rolling 2-minute session window. Inputs: pass-to-engage ratio, scroll velocity, average dwell, gesture-aggressiveness (taps per second). Rule cascade: pass rate > 80% AND scroll velocity > p90 → hate_scroll; pass rate < 30% AND dwell > median AND zoom count > 0 → positive_interest; default → neutral. The classifier output is written to a Redis key with 60-second TTL. The ranker's response to hate_scroll is to insert a breathe card in the next batch and shrink the next batch from 10 to 5 — the goal is to break the hate-scroll loop, not to reward it with more candidates. The classifier is sensitive to the no-data case: a user with fewer than 10 events in the rolling window is labelled neutral by default to avoid spurious hate_scroll on session start.

**Extended: ranker explainability (explain.ts).** The explainer reads the FeatureSnapshot for a single impression and returns the top three ingredient contributions in plain English. The shape is `{ candidateId, ingredients: [{ name, contribution, plainEnglish }] }`. The plain-English line is a templated phrase per ingredient — e.g. for relevance, "your recent likes overlap with their photos and bio"; for fairness adjustment, "the order was rebalanced to give equal visibility to candidates of all genders"; for earned exposure, "this candidate earned an extra slot by completing their DTM"; for recency, "this candidate joined recently"; for intent fit, "this candidate matches your current intent (serious/casual_scroll/etc)". The plain-English template is not generated by an LLM — it is a fixed phrase per ingredient with parameter substitution. The user surfaces the explainer by tapping "why am I seeing this" on any ranked impression. The explainer is the implementation of GDPR Article 22's right-to-explanation rail.

**Extended: stable matching weekly Top-10.** The weekly Top-10 is the curated set of 10 candidates per user produced by Gale-Shapley over the week's high-affinity candidates. The set is intended to be high-confidence and durable — a user sees the same 10 for the week, refreshable on Monday morning. The construction: for each user, take their top-50 candidates by pair compat; build a preference list ordered by score with stable jitter; run Gale-Shapley with users as proposers and candidates as receivers, settling on a stable assignment; output the top 10 of the resulting matched candidates. Gale-Shapley guarantees no blocking pair — no two users would mutually prefer each other to their current assignment. The fairness rerank is applied to the Top-10 after Gale-Shapley to maintain gender parity within each user's set, subject to the 5% relevance-loss budget. The output is written to WeeklyTopMatch and surfaced to the user via the "your weekly matches" home-page row. The weekly cadence is deliberate — the user is meant to inspect each match carefully, not swipe through.

**Extended: validate middleware.** The middleware (`validate()`) is the universal request-validation gate. It accepts a zod schema and a target (`body`, `query`, `params`) and replaces the original target with the parsed result on success or returns 422 with a field-level error object on failure. The 422 response is the only path by which a malformed request leaves the gateway — schema failure short-circuits before any business logic. The schemas are catalogued in `services/shared/src/schemas.ts` and are imported by every service. Schema reuse is the rule — if two endpoints accept similar shapes, they share a schema rather than duplicating. The middleware is mounted before every handler that takes user input; the convention is enforced by knip-style review (any handler reading `req.body` without `validate()` upstream is flagged). The middleware is the first defence against injection, oversized payloads, unexpected fields, and type confusion.

**Extended: voice fingerprint.** The voice fingerprint is a 12-feature vector per user, computed nightly from the user's outgoing-message corpus. The 12 features: median message length (chars), p90 message length, emoji rate, voice-note rate, photo-reply rate, median reply latency (seconds), opener-style category (greeting/observation/question), tense distribution (past/present/future ratios), question rate, code-mix family, archetype (categorical), novelty score (against the user's older corpus to detect drift). The vector is the input to the Move v2 voice templater and a row in the moveProfile. The fingerprint is cached for 5 minutes per request; a user who sends a Move minutes after a recompute will see the fresh fingerprint. The fingerprint is never shared in raw form with another user — the VibeCheck preview shows a derived summary, not the vector. Sharing the vector itself is gated by an explicit `voice_fingerprint.shared` event and is a future-feature opt-in.

---

## Appendix C — historical, deprecated, and curiosity entries

A handful of terms appear in older docs, comment trails, or branch names and are useful only to readers who encounter them in the codebase or git history. They are kept here in case someone greps the glossary for context.

**ALGO_V7_*.** The v3.5.0 flag family, predecessor to ALGO_V8_*. Most v7 flags are at 100% in production and have been promoted to default-on; the remaining are kept in code for rollback safety until v3.7.0. See ALGO_V8_* flags for the current pattern.

**ALGO_V6_*.** The v3.4.0 flag family. All v6 flags have been retired and the code paths inlined. References in git history only.

**bandit reward.** Synonym for learner reward. See learner reward attribution.

**bestPick.** The internal nickname for AI Match in early commits. The current name is aiMatch; bestPick still appears in some test fixtures and is the same concept.

**bio-data sheet.** Synonym for bio-data and matrimonial profile. See bio-data.

**chat-deposit.** Synonym for the deposit in the anti-ghost economy. See anti-ghost.

**compatibility.** Generic term for the pair compat score. See pairCompatV6.

**creativity track.** The product surface family covering Reels, Spotlight, and the EarnDrawer. The "track" framing emphasises that earned exposure on the creativity surfaces is decoupled from Discover ranking — a user with a hot reel does not automatically get more Discover slots.

**creativity-spotlight.** The server-side module (`services/content/src/creativity-spotlight.ts`) that composes the Spotlight surface. See spotlight.

**creativity-track.** The shared module (`services/shared/src/creativity-track.ts`) holding the track-level state. See creativity track.

**daily-cap.** Synonym for dailyCap. See dailyCap.

**deck.** A delivered ranked batch — 10 candidates with a breathe card between batches. See batch.

**deep DTM.** A DTM answer with at least 200 characters or with an attached photo or voice note. Counts as a quality action.

**Discover.** The primary streaming candidate surface. Composed by the multi-objective combiner with batchLadder pagination.

**doomscroll.** The pattern of sustained passive scrolling. Miamo's design specifically opposes doomscroll — the batchLadder, breathe cards, intent classes, and decision-fatigued response are all anti-doomscroll mechanisms.

**double-credit.** A bug class — the same event credited twice in the learner reward, by stream replay or by attribution misjoin. The LearnerLoop is idempotent on event id to prevent this; the trend-queue concurrency test covers a similar class for trends.

**earn drawer.** The bottom-sheet UI on Creativity that explains how a user earns Spotlight slots. Implemented in `services/web/src/app/(main)/creativity/components/EarnDrawer.tsx`.

**EarnDrawer.** See earn drawer.

**event id.** The Redis stream id assigned at XADD. Used by every downstream worker as the idempotency key.

**event payload.** The body of a tracking event — the per-event-name typed object inside the envelope's event field. See TrackEvent.

**event v8.** The set of 16 new tracking events introduced in v3.6.0. See TRACKING.md §5.3.

**festival booster.** Synonym for festivalHooks. See festivalHooks.

**fingerprint.** Generic for the voice fingerprint. See Voice Fingerprint.

**flat earner.** A user whose exposure credits are at or near zero — neither earning nor losing significantly. Most users are flat earners in steady state.

**flag percentage.** The percentage rollout of an ALGO_V8_* flag. See ALGO_V8_* flag family.

**flat-line user.** A user with no engagement for 7+ days. Surfaced to the re-engagement worker; receives a single low-pressure push at the optimal time.

**glance.** One of the five depth-of-engagement labels. See depth of engagement.

**gridless.** Internal nickname for the Reels UI, contrasting with the older grid-based Discover. See ReelsView.

**hot card.** A profile that has received unusually high engagement in the past 24 hours. Subject to the dailyCap to prevent runaway visibility.

**hot path.** Code path on the latency-critical request flow. Hot paths in Miamo are: candidate-pool build, ingredient compute, combiner, fairness rerank, response serialise.

**hot user.** A user whose engagement-emitted events are above p99 in the last 24 hours. Subject to a soft rate limit on impressions to prevent one user from skewing aggregate metrics.

**identity-of-a-card.** The user-perceived identity of a profile in the deck — distinct from the candidateId in the ranker. The two diverge when a candidate's profile is updated mid-session; the identity stays stable for the session.

**impression.** A single delivered candidate render — the row that gets logged as a `feed.impression` event. The unit of exposure.

**inactive user.** A user who has not opened the app in 14+ days. Subject to a single weekly re-engagement push; after 60 days, removed from active candidate pools.

**ingredient weights.** The per-surface weight vector tuned by the learner. See multi-objective ranking combiner.

**internal user.** A user account belonging to a Miamo employee, flagged in the database. Internal users are excluded from production candidate pools and from the fairness audit, and their actions do not feed the global learner.

**ladder.** The batchLadder pagination shape. See batchLadder.

**learner state.** The full state of the bandit — weights, prior, reward history. Persisted per surface in Redis with periodic Postgres snapshots.

**legacy ranker.** Synonym for forYou.ts (v3.5.0). Retained until v3.7.0 for rollback.

**LinUCB-diag.** Miamo's diagonal-covariance simplification of LinUCB. See LinUCB.

**locality.** Generic for region — the user's locality is their city plus a regional bucket. Used by festivalHooks and notifyTiming.

**locality festival map.** The mapping from regional bucket to active festivals on a given date. Maintained manually with quarterly review.

**long-horizon reward.** The 7-day reward in the learner attribution. See learner reward attribution.

**masked DTM.** A DTM topic the topic mask deemed unsafe to ask in the current mood/coverage state. See dtmTopicMask.

**masked impression.** An impression delivered with a partial render — typically because consent for a feature was not granted. Rare.

**matchPool.** The intermediate candidate set used by the stable-match worker. See galeShapley.

**Move composer pipeline.** See Move v2 composer pipeline.

**Move pre-flight.** The pre-send validation pass on a Move suggestion — cringe linter, repetition check, recipient-block check. Runs before the send button is enabled.

**Move profile.** See moveProfile.

**Move v2 suggestion set.** The 5-element ranked list returned by the composer. See Move v2 composer pipeline.

**multi-armed bandit.** The general class of which contextual bandit (Miamo's learner) is a specialisation. See contextual bandit.

**negative signal.** Generic for an event that lowers a candidate's score for the viewer — pass, block, report, prolonged ghosting. See negative-signal-engine.

**neutral default.** The value returned by a feature path when its gating consent is off. See withConsent.

**no-signal user.** A user with too few events for any classifier to label them. Treated as neutral on every dimension.

**onboarding flow.** The first-launch sequence — sign-up, phone verify, photo upload, initial preferences, DTM cold-start, mood/behavior consent. All consent toggles are explicit; defaults are documented in SECURITY.md §11.

**opt-out.** Synonym for consent withdrawal. See ConsentEvent.

**outgoing message.** A message the user sent. The corpus for the voice fingerprint.

**override flag.** A flag that bypasses a normal ramp — used only for emergency rollbacks. Logged in AuditLog.

**pair score.** Synonym for pair compat. See pairCompatV6.

**partial render.** An impression with one or more fields missing due to consent or privacy gating. Tracked separately from normal impressions in the audit log.

**peers.** Users with similar archetypes and similar engagement patterns to the viewer. Used as a CF neighbourhood.

**per-surface learner.** The bandit instance for a specific surface. See learner.

**phantom click.** A click event with no preceding render event — typically a network-replay artifact. Filtered at ingest.

**positive signal.** Generic for any event that raises a candidate's score — like, Move sent, Move replied to, deep DTM read, photo zoom.

**postcondition.** A property the ranker output must satisfy — no blocked candidates, no daily-cap-exceeded authors, every candidate has a valid profile. Checked in a debug assertion in development; never in production.

**precondition.** A property the candidate pool must satisfy — at least 50 candidates after hard filter (else degraded mode). Checked at runtime.

**privacy review.** The internal review every new tracking event undergoes before merging. Checks: necessity, payload contents, retention.

**profile photo.** The primary photo on a user's profile. Subject to verification (selfie match) for verified status.

**push token.** The device-side identifier used by APNs and FCM for push delivery. Stored encrypted at rest; rotated on every signin.

**quality action.** A user action that earns exposure credit. See quality action.

**rage burst.** A short sequence of rage likes followed by passes. Detected by the polarity classifier and treated as hate-scroll.

**ramp guard.** The automatic rollback trigger that lowers an ALGO_V8_* flag if a guardrail metric breaches. See guardrail metric.

**reciprocity.** The pairwise back-and-forth pattern. See reciprocity score.

**refresh token.** The longer-lived JWT used to mint new access tokens. See JWT.

**regional bucket.** A geographic clustering used for distance fit and festival hooks. Buckets are city-level for Tier-1, district-level for Tier-2, state-level for rural.

**reply bonus.** The credit paid to the sender when the receiver replies within 48 hours. See anti-ghost.

**reply within 48h.** The sticky-reply window in the anti-ghost economy. See message reply (sticky).

**resonance profile.** The receiver-side profile read by the Move v2 composer. See receiver resonance.

**retention.** The product metric — what fraction of users return on day N. The long-horizon learner reward proxies for retention.

**right-now ingredient.** Any of intent fit, mood fit, polarity, depth — the ingredients sourced from the right-now classifiers.

**rolling window.** The time-bounded window over which a classifier or aggregator operates. Defaults: classifier 2 min, aggregator 1 hour, daily roll-up 24 hours.

**RTBF lever.** See triple-secret RTBF.

**Safari ITP cap.** The 7-day first-party cookie cap. See ITP.

**SafetyAgg.** The Postgres table storing the safety roll-up. See safety agg.

**safety score.** Synonym for safety agg score.

**sample fairness.** The fairness check applied to candidate-pool downsampling — the sample must preserve the protected-class distribution of the full pool. Enforced as a postcondition.

**send latency.** The time from user tap to push delivery. SLA target p99 1 second.

**serious intent.** The intent class representing high engagement and marriage-focused behaviour. See serious mode.

**session.** A bounded sequence of user activity, ended by 5-minute inactivity or explicit close. Each session produces one SessionSummary.

**session close.** The trigger for SessionSummaryWorker. See SessionSummary.

**shadow flag.** A flag that runs code in shadow mode — output discarded, only latency and error rate observed. See shadow ramp.

**shared signal.** A signal both viewer and candidate emit. Reciprocal engagement is a shared signal.

**short-horizon reward.** The 24-hour reward in the learner attribution. See learner reward attribution.

**signature key.** The HS256 secret used to sign JWTs. Rotated quarterly with rolling validity.

**slot.** A position in a delivered batch. See batch and batchLadder.

**slot fill.** The act of placing a candidate into a slot. See exposure scheduler.

**social mood.** The lonely-social dimension of the mood vector. See mood right now.

**stable jitter seed.** The per-user deterministic seed for the stable jitter. See stable jitter.

**stable matching.** See stable matching (under S).

**stable signal.** A signal whose value is stable across a session — set at session open and not changed. Stable signals include intent (per session) and preference snapshot.

**stack rank.** Synonym for ranked list.

**stale flag.** A flag whose code path is no longer reachable in production. Flagged for removal in the next release.

**state-of-the-world.** The full set of features the ranker reads — FeatureSnapshot is the persisted form.

**sticky chat.** A chat that has more than 10 message exchanges. Sticky chats produce a strong long-horizon reward signal.

**streak credit.** An exposure credit granted at multiples of 7 consecutive days. See streak.

**surface.** See surface (under S).

**surfaceLearner.** See surfaceLearner (under S).

**talent card.** The component (`services/web/src/app/(main)/creativity/components/TalentCard.tsx`) that renders a creator on the creativity track. Distinct from the Discover profile card.

**TalentCard.** See talent card.

**template.** A parameterised opener body. See hookLibrary.

**timezone bucket.** A coarse 4-hour timezone group used for batch scheduling. Distinct from the per-user timezone.

**tombstone.** See tombstone event.

**top-K rerank.** The fairness or diversity rerank applied to the top-K candidates of a batch. See fairnessRerank.

**touch event.** A raw client-side input event. Aggregated into session-shape features.

**toxic signal.** A signal that, if amplified, harms long-horizon retention — e.g. promoting rage likes. The learner is explicitly designed to discount toxic signals.

**track event.** See TrackEvent.

**traffic shaping.** The pattern of capping a user's impressions to prevent runaway exposure. See throughput rate cap.

**trend queue.** See TrendQueue.

**triple-secret.** See triple-secret RTBF.

**unread badge.** The chat-list unread counter. Updated optimistically; reconciled with server state on app foreground.

**upgrade flow.** The path from free to premium. Implemented in the users service.

**user-side flag.** A consent toggle exposed to the user. See SECURITY.md §11.

**v8.** Shorthand for the v3.6.0 algorithm and tracking stack. See ALGO_V8_* flag family.

**verified.** A user who has passed selfie verification. See verifications.

**verifier user.** A user who has volunteered to help with verification reviews. Internal-only as of v3.6.0.

**warm-up.** The first 10 minutes of a session, during which classifiers run with reduced confidence and the ranker biases toward conservative ingredient weights.

**weekly cycle.** The Monday-morning refresh cycle for the weekly Top-10 and the fairness audit. See weekly top 10.

**weekly streak.** See streak.

**withdrawal.** A consent withdrawal recorded in ConsentEvent. The downstream code paths react within minutes (consent-gated workers read the latest event).

**worker idempotency.** The property that a worker can be killed and restarted without re-doing finished work. Achieved by event-id-based dedup in each consumer.

**workflow audit.** A periodic review of every multi-step flow (signup, Move, DTM, RTBF) against the documented spec. Quarterly cadence.

**writeback worker.** A worker that writes back from a derived store to the canonical store — e.g. UserActivity → User. Limited use; only for fields the ranker reads on every request.

**XADD latency.** The Redis stream append latency. Sub-millisecond under steady state, single-digit milliseconds under burst.

**XREADGROUP latency.** The Redis stream consume latency. Single-digit milliseconds; bounded by network round-trip.

**zod.** The TypeScript-first schema validator used by the validate middleware. Every schema in the catalogue is a zod schema.

**zustand store.** A state container in the web client. See zustand.

---

## Appendix D — cross-references by document

For maintainers, the inverse index from doc to glossary terms. This is the cheap way to verify that no term in a doc is missing from the glossary.

**ALGORITHMS.md key terms:** algorithm transparency, ALGO_V8_* flags, anti-ghost, archetype, batchLadder, BERT4Rec, candidate pool, code-mix, collaborative filter, compose pattern, contextual bandit, dailyCap, decision fatigued, deferredItem, depth of engagement, dtmTopicMask, exposure credit, ExposureLedger, exposure scheduler, expDecay, explore epsilon, fairnessRerank, FeatureSnapshot, festivalHooks, galeShapley, GRU4Rec, half-life decay, hookLibrary, hook category, intent class, intent inference, intent right now, intentFitRightNow ingredient, jaccard, learner, learner ramp, LinUCB, mood right now, multi-objective ranking, novelty boost, pair compat cache, pairCompatV6, polarity classifier, receiver resonance, reciprocity score, ReceiverResonance, SASRec, sender voice, serious mode, Singh-Joachims, stable jitter, stable matching, TopicMask, UserWeightProfile, weekly top 10, why am I seeing this, window shopping.

**TRACKING.md key terms:** did, EventAggHourly, EventAggDaily, FocusAffinityHourly, ingest service, intent.snapshot event, mood.inferred event, polarity.computed event, requestId, SessionSummary, TrackEvent, TrackEventName, voice_fingerprint.shown, voice_fingerprint.shared, XADD, XREADGROUP, RollupConsumer, FeatureAggregator, CompatWriter, EmbeddingWorker, EnrichmentWorker, DailyMatchWorker, SafetyRollup, FirstMoveOutcome, SessionSummaryWorker, FocusAffinityWorker, LearnerLoop, DeferPrune, ColdStore, intentInference, exposureScheduler, stableMatchTop10, fairnessAudit, tombstone event.

**SECURITY.md key terms:** AES-256-GCM, authMiddleware, bcryptjs, ConsentEvent, AuditLog, CCPA, CORS, CSP, DPDP Act 2023, GDPR, Article 22, GPC, helmet, HMAC-SHA256, idempotency, ITP, JWT, OAuth, OWASP Top-10, Otp, rate limit, right to be forgotten, right to explanation, sanitize, validate middleware, withConsent, moodInferenceEnabled, behavioral ranking, triple-secret RTBF, PII redaction in logs.

**PRODUCT.md key terms:** Priya, AI Match, bio-data, blocked author, caste field, daily login streak, family brief, ghosted self, gotra, Hinge "Most Compatible", matrimonial profile, Miamo Move, passing, photo zoom, premium, profile completion score, social graph (lack thereof in Miamo), serious mode, streak, surface, verifications, weekly streak.

**ARCHITECTURE.md key terms:** Express, gateway, generated client, Prisma, service ports, Redis stream, back-end-for-front-end.

**DATA_MODEL.md key terms:** AuditLog, ConsentEvent, ExposureLedger, FeatureSnapshot, FirstMoveOutcome, FocusAffinityHourly, moveProfile, Otp, SessionSummary, SpotlightAward, SpotlightLedger, UserActivity, UserMoveProfile, UserWeightProfile, WeeklyTopMatch.

**FRONTEND.md key terms:** breathe card, EarnDrawer, ReelsView, SpotlightUI, TalentCard, zustand.

**MIAMO_MOVE.md key terms:** AI cringe, anti-ghost, archetype, hook category, hookLibrary, Miamo Move, Move v2 composer, moveProfile, moveV2 composer, moveV2 linter, receiver resonance, sender voice, VibeCheck, voice fingerprint, voice notes.

This index is for maintenance only — it does not need to be exhaustive, just enough that a maintainer can confirm coverage at a glance.

---

## Appendix E — terms by domain

The same terms organised by domain rather than alphabet. Useful when a reader wants to learn an area rather than look up a single term.

### Ranking and recommendation

**Active ranker.** The online-now ranker (`active.ts`). One ingredient in the multi-objective combiner.

**AI Match.** The single top pick surfaced daily per user. Distinct from the deck-style AI Picks.

**AI Picks.** The Discover ensemble that calls multiple sub-rankers and ensembles the result.

**Candidate pool.** The set of profiles eligible to enter a ranked batch, post hard-filter pre-scoring.

**Compose pattern.** The architectural pattern of combining many small interpretable rankers under a multi-objective combiner.

**Collaborative filter (CF).** The recommender that scores by user-user similarity. Implemented in `cf.ts`.

**Content-based recommendation.** The recommender that scores by feature similarity. One ingredient in `forYou.ts`.

**DTM ranker.** `dtm.ts` / `dtmV6.ts` — the deep-compat ranker that uses DTM-answer overlap.

**Fairness rerank.** `fairnessRerank.ts` — the Singh-Joachims gender-conditional reranker.

**ForYou.** The canonical Discover ranker. `forYou.ts` and `forYouV6.ts`.

**Multi-objective ranking.** The combiner that produces a final ranked score from per-ingredient scores.

**New ranker.** `new.ts` — the recency-boost ranker.

**Pair compatibility.** The per-pair score in `[0, 1]`. Computed by `pairCompatV6.ts`.

**Serious ranker.** `serious.ts` — the intent-gate ranker that surfaces only serious-intent candidates to serious-intent viewers.

**Stable matching.** The Gale-Shapley pass that produces the weekly Top-10.

**Verified ranker.** `verified.ts` — the trust-gate ranker for verified candidates.

### Tracking and analytics

**Activity analyzer.** `services/shared/activity-analyzer.ts` — computes derived activity metrics from the raw event store.

**ColdStore worker.** Moves rolled-up tables to cold storage after 30 days.

**CompatWriter.** Writes pair compat scores to the warm cache.

**DailyMatch worker.** Produces the "today's matches" set used by the home surface.

**DeferPrune.** Prunes deferred-item queues and expired exposure credits every 6 hours.

**EmbeddingWorker.** Computes user and content embeddings; refreshed daily.

**EnrichmentWorker.** Enriches raw events with derived labels (depth, polarity, intent).

**Event envelope.** The `{ v: 1, ctx, event }` shape of every tracking event.

**Exposure scheduler.** Walks the exposure ledger and writes slot-fill assignments to Redis.

**FairnessAudit worker.** Computes weekly fairness Gini and alarms on breach.

**FeatureAggregator.** Rolls raw events into hourly and daily aggregates.

**FirstMoveOutcomeWorker.** Records the outcome of a user's first Move to a given recipient.

**FocusAffinityWorker.** Computes per-user per-hour quality-engagement profile.

**Ingest service.** The Express service that accepts and validates tracking envelopes.

**IntentInference worker.** Runs the intent classifier every 30 seconds per active user.

**LearnerLoop.** Walks the event stream and updates learner weights.

**Pseudonymisation.** HMAC-SHA256 of userId and did at ingest.

**Redis stream.** The append-only event log that is the ingest backbone.

**RollupConsumer.** The primary worker loop that consumes raw events into EventAggHourly.

**SafetyRollup.** Aggregates safety signals per user into SafetyAgg.

**SessionSummaryWorker.** Writes a SessionSummary on session close.

**StableMatchTop10 worker.** Runs Gale-Shapley over the week's high-affinity candidates.

**TrackEvent.** The shape of a single event payload.

**Trend queue.** The concurrency-safe queue for trend-detection work.

### Security and privacy

**AES-256-GCM.** The symmetric authenticated-encryption cipher used for chat at rest.

**AuditLog.** The append-only log of consent-relevant and admin-relevant events.

**Authentication.** Passwords (bcryptjs), JWTs (HS256), OAuth (Apple, Google), OTP.

**Authorization.** authMiddleware, createInternalAuthMiddleware, per-resource ACL primitives.

**bcryptjs.** The password-hashing algorithm. Cost factor 12 in production.

**CCPA.** California Consumer Privacy Act, 2018, with 2020 CPRA amendments.

**ConsentEvent.** The Prisma model recording every consent-toggle change.

**Consent toggles.** moodInferenceEnabled, behavioralRankingEnabled, marketingEmailsEnabled, dataExportEnabled.

**CORS.** Cross-Origin Resource Sharing. Origin-locked to the web client.

**CSP.** Content Security Policy. Strict-dynamic with per-response nonce.

**DPDP Act 2023.** India's Digital Personal Data Protection Act.

**GDPR.** General Data Protection Regulation. Article 22 is the automated-decisions rail.

**GPC.** Global Privacy Control header, honoured as Do Not Sell.

**Helmet.** Express middleware for security headers.

**HMAC-SHA256.** The keyed hash used for pseudonymisation at ingest.

**Idempotency.** The middleware that deduplicates requests by Idempotency-Key.

**ITP.** Safari Intelligent Tracking Prevention. First-party cookie cap.

**JWT.** JSON Web Token. HS256 signed, 15-min access, 30-day refresh.

**OAuth.** Sign in with Apple, Sign in with Google.

**Otp.** The Prisma model storing one-time passcodes.

**OWASP Top-10.** The web vulnerability classes Miamo maps against.

**Rate limit.** Per-route per-user request cap at the gateway.

**RequestId.** The per-request UUID for tracing across services.

**RTBF.** Right to be forgotten. Triple-secret implementation.

**Sanitize.** HTML and control-char sanitiser for free-text inputs.

**Triple-secret RTBF.** Per-user + per-table + per-service secret system.

**Validate middleware.** zod-backed request validation.

**withConsent.** The helper wrapper that gates a feature path on a consent flag.

### Product surfaces

**Beats.** Daily music-share surface. Streak-counted.

**Bio-data.** The Indian matrimonial one-page profile sheet, composed from DTM + verified fields.

**Creativity track.** The product surface family for Reels and Spotlight.

**Discover.** The primary streaming candidate surface.

**DTM (Date-to-Marry).** The deep-compatibility Q&A surface.

**EarnDrawer.** The bottom-sheet UI explaining how a user earns Spotlight slots.

**Family brief.** The shareable one-page summary of a candidate.

**Home.** The landing surface with daily matches and entry points to Discover, DTM, Reels.

**Matrimonial profile.** The bio-data presentation of a candidate.

**Miamo Move.** The personalised first-message composer surface.

**Reels.** The vertical-video surface introduced in v3.5.0.

**Settings.** The user-facing surface for consent, profile, account.

**Spotlight.** The earned-visibility 24-hour window on the creativity track.

**Top-10.** The weekly stable-matched curated set per user.

**VibeCheck.** The pre-Move surface previewing voice-fingerprint reads.

### Algorithm V8 (right-now) modules

**depthOfEngagement.** Five-class depth label per impression.

**intentRightNow.** Seven-class intent classifier per session.

**moodRightNow.** Five-dimensional mood vector per session.

**polarity.** Three-class session polarity classifier.

### Algorithm V8 (earned visibility) modules

**exposureCredits.** Earned slot accrual.

**fairnessRerank.** Singh-Joachims gender-conditional rerank.

**galeShapley.** Weekly stable-match Top-10.

**festivalHooks.** Regional festival booster.

**multiObjective.** The combiner.

### Algorithm V8 (Move v2) modules

**moveV2/codeMix.** Four language family templates.

**moveV2/composer.** Five-suggestion orchestrator.

**moveV2/hookLibrary.** Concrete falsifiable hooks.

**moveV2/receiverResonance.** What does this person reply to?

**moveV2/senderVoice.** 12-feature voice fingerprint.

### Algorithm V8 (DTM safeguards)

**antiGhost.** Deposit / reply-bonus / burn economy.

**dtmBatch.** Masked DTM feed composer.

**dtmTopicMask.** Mood + coverage + window-shopping gate.

### Data models (Prisma)

**AuditLog.** Audit trail of consent and admin events.

**ConsentEvent.** Per-user consent change history.

**ExposureLedger.** Per-credit grant and consumption record.

**FeatureSnapshot.** Frozen ranker inputs per impression.

**FirstMoveOutcome.** Per-pair Move outcome.

**FocusAffinityHourly.** Per-user per-hour quality engagement.

**SessionSummary.** Per-session shape and outcome.

**SpotlightAward.** Per-grant spotlight record.

**UserActivity.** Per-user rolled-up activity.

**UserMoveProfile.** Per-user Move v2 state.

**UserWeightProfile.** Per-user learner weights.

**WeeklyTopMatch.** Per-user weekly Top-10 record.

### Personas and product framing

**Priya.** The 28-year-old urban Indian woman persona.

**Anil.** Less-used; the male-perspective counterpart in some docs.

**Diaspora.** The non-resident Indian user segment.

**Family member.** The user-adjacent person who reads the matrimonial profile or family brief.

**Hot card.** A high-engagement profile.

**No-signal user.** A user with too few events to classify.

**Verified user.** A user who has passed selfie verification.

### Operational

**Ramp.** The percentage rollout of a feature flag.

**Guardrail.** A metric the learner watches as a hard constraint.

**Shadow ramp.** A ramp where output is discarded.

**Warm cache.** The Redis layer between Postgres and the ranker.

**Cold storage.** S3 Parquet archive for data older than 30 days.

**Hot path.** Latency-critical code on the request flow.

**SLA.** Service level agreement.

**Knip.** Dead-code detector run in CI.

---

## Appendix F — quick-reference cheat sheet

A one-line-per-term summary for the most-queried terms. When in doubt, search this section first.

- AI cringe = machine-sounding text, blocked by Move v2 linter
- AI Match = daily single top pick (vs AI Picks = deck)
- ALGO_V8_* = the v3.6.0 flag family, 0–100% rollout, learner-tunable down
- anti-ghost = deposit + reply bonus + burn economy on first Move
- archetype = wordsmith / voice_first / visual / fast_replier
- batchLadder = 10 candidates → breathe card → next 10
- BERT4Rec = cited paper, inspiration for forYouV6 embedding head
- candidate pool = post-filter pre-score set, 200–800 per request
- code-mix = four language families (Hinglish / Tanglish / Bengali / generic)
- compose pattern = many small rankers under a multi-objective combiner
- CF = collaborative filter, user-user similarity
- contextual bandit = LinUCB-flavoured learner with diagonal covariance
- DTM = Date-to-Marry, the deep-compat Q&A surface
- depth of engagement = accidental / glance / scan / inspection / deep_inspection
- expDecay = exponential decay with per-ingredient half-life
- exposure credit = unit of earned visibility, recorded in ExposureLedger
- fairnessRerank = Singh-Joachims gender-conditional rerank, 5% loss budget
- family brief = shareable one-page candidate summary
- FeatureSnapshot = frozen ranker inputs per impression, audit-readable
- galeShapley = stable matching used for weekly Top-10
- ghost burn = 25% deposit forfeit on 7-day no-reply
- HMAC-SHA256 = pseudonymisation of userId and did at ingest
- hookLibrary = 180 concrete falsifiable opener templates
- intent class = 7 labels from intentRightNow
- learner = per-surface contextual bandit
- learner ramp = 1% → 100% per-surface bandit weight blend
- LinUCB = cited paper, inspiration for the learner
- mood right now = 5-dimensional mood vector, default-OFF consent
- Move v2 = the v3.6.0 composer with 5 suggestions
- multi-objective = linear combiner of relevance / fairness / earned / recency / intent
- pair compat = per-pair score in [0, 1], cached 24h
- polarity = positive_interest / neutral / hate_scroll
- Priya = the canonical persona, urban 28-year-old Indian woman
- right to be forgotten = triple-secret RTBF lever
- SASRec = cited paper, inspiration for the per-session attention encoder
- Singh-Joachims = the fair-ranking paper implemented by fairnessRerank
- spotlight = earned 24-h visibility window on the creativity track
- stable jitter = per-user deterministic noise on ranker scores
- Top-10 = weekly stable-matched curated set
- triple-secret RTBF = three-secret deletion that renders prior data unrecoverable
- voice fingerprint = 12-feature vector of sender style
- why am I seeing this = explain.ts surface for ranked impressions
- XADD = Redis stream append used at ingest
- XREADGROUP = Redis stream consume used by workers
- zustand = React state lib used by the web client

---

## Appendix G — glossary maintenance log

For maintainers, a brief running log of glossary additions per release. Newest first.

**v3.6.0 (current).** Added: ALGO_V8_* family, intent right now, mood right now, polarity, depth of engagement, exposure credits, ExposureLedger, exposure scheduler, fairnessRerank, galeShapley, Singh-Joachims, multi-objective ranking, festivalHooks, Move v2 composer, senderVoice, receiverResonance, hookLibrary, codeMix, moveVoice, dtmTopicMask, dtmBatch, antiGhost, FirstMoveOutcome, SessionSummary, FocusAffinityHourly, UserActivity, UserMoveProfile, UserWeightProfile, WeeklyTopMatch, SpotlightLedger, SpotlightAward, creativity track, ReelsView, EarnDrawer, TalentCard. Removed: ALGO_V7_* references (retired to history). Renamed: bestPick → AI Match (legacy nickname retained in appendix).

**v3.5.0 (previous).** Added: Spotlight surface, creativity track, Reels view, family brief, VibeCheck (preview-only). Removed: legacyTracker references. Renamed: swipeRanker → forYou (legacy nickname retired).

**v3.4.0.** Added: HMAC pseudonymisation, ConsentEvent, AuditLog. Removed: pre-envelope tracking events. Renamed: none.

**v3.3.0.** Added: pairCompatV6, FocusAffinityHourly, EventAggHourly, EventAggDaily. Removed: pairCompatV5 references. Renamed: none.

---

## Appendix H — glossary policy

The glossary is governed by §4.D.15 of the cleanup-prompt, which states: every term used in the codebase or documentation must have an entry; no synonym padding; no skipping of technical terms; alphabetical order; one or two sentences of plain-English definition; one sentence of technical context where useful; a See-also pointer to the canonical deep doc.

In practice, the policy translates to four operational rules:

1. **Coverage rule.** A term mentioned in any doc, code comment, or component name must appear here. The reverse is not true — the glossary is allowed to define terms that no longer appear in code (historical entries) for grep-ability.

2. **Concision rule.** Each entry is at most 8 lines. If a term needs more, it lives in a longer-form doc, and the glossary points there. Extended treatments live in Appendix B by exception, not by default.

3. **Alphabetical rule.** Within each letter, terms are in case-insensitive alphabetical order. Compound terms are alphabetised by the first significant word ("daily login streak" under D, not under L).

4. **See-also rule.** Every entry that has a deeper home in a doc cites that doc with section number. Entries that are self-contained (curiosity entries, deprecated entries) need not cite.

A pull request that introduces a new term without a glossary entry is non-compliant. A PR that introduces a glossary entry without a See-also pointer is non-compliant unless the term is self-contained. A PR that removes a term from the codebase should move the glossary entry to the deprecated appendix, not delete it — somebody is going to grep for it.

The policy is light, not heavy. The point is to have an index, not a treatise.

---

End of glossary.
