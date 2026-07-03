# Miamo FAQ

**Version:** 3.6.0 · **Last updated:** 2026-06-25 · **Audience:** users, prospective users, engineers, reviewers, regulators, journalists

**Cross-links:** [`PRODUCT.md`](./PRODUCT.md) for the full product narrative · [`SECURITY.md`](./SECURITY.md) for the privacy and crypto stack · [`ALGORITHMS.md`](./ALGORITHMS.md) for every ranker and weight · [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the eleven-service topology · [`TRACKING.md`](./TRACKING.md) for the ingest pipeline · [`RUNBOOK.md`](./RUNBOOK.md) for on-call.

This document answers the questions we get most often. Some come from users. Some come from press. Some come from engineers joining the team. We have grouped them into four sections — Product, Privacy, Technical, and India-specific — but the underlying philosophy is the same across all of them: Miamo is a product that takes positions, and this FAQ exists to make those positions legible to anyone who asks.

The questions are real. They have been asked by users in support tickets, by reviewers in pre-launch briefings, by parents in newspaper interviews, and by engineers in their first week on the team. The answers are the ones we have decided are correct as of v3.6.0. They will evolve. When they do, we will update this document and tag the change in the changelog.

We do not try to make Miamo sound clever. We try to make it sound honest. If an answer is "we have not solved this yet," we say so. If an answer is "we have decided not to solve this and here is why," we say that too.

---

## Table of contents

**Section A — Product**
1. What is Miamo?
2. How is Miamo different from Tinder, Hinge, and Bumble?
3. Will the algorithm show me people I already passed?
4. Why does the app feel different at night?
5. What's a Move suggestion?
6. What's a Voice Fingerprint?
7. What's the Family Brief?
8. What's Weekly Top-10?
9. What's the anti-ghost system?
10. What's DTM?
11. What's a Spotlight minute?
12. Can I turn off behavioural inference?
13. Will I be invisible to other users?
14. Why does premium only get 1.5×, not 5×?
15. What if my mood is wrong?
16. Can I see "why am I seeing this profile"?

**Section B — Privacy**
17. Can my mom read my chats?
18. What data does Miamo store about me?
19. How can I delete my data?
20. What's HMAC hashing?
21. Is my profile shared with other apps?
22. What's GDPR Article 22 and how does it affect me?
23. Does Miamo sell my data?
24. What's DPDP and how does Miamo comply?

**Section C — Technical (for engineers)**
25. How do I add a new algorithm?
26. How do I add a new tracking event?
27. How do I add a Prisma model?
28. How do I add a new feature flag?
29. What's the test bar before merging?
30. How do I run the QA phase scripts locally?
31. Why does my v8 endpoint return 404 with the flag set in .env?
32. What's the v3.5 to v3.6 migration path?
33. Why aren't there `db push`-only models in production?

**Section D — India-specific**
34. Why does Miamo have a caste field on the matrimonial profile?
35. What's gotra and how does Miamo handle it?
36. How does Miamo work in Hinglish, Tanglish, and Banglish?
37. Why is DTM separate from Discover?

**Section E — Closing**
- Where to ask more questions
- License

---

## Section A — Product

This section answers the questions users ask when they install the app, when a friend asks them what they're using, when a journalist asks them why they're on it, and when a family member asks them what it is. These are the surface-level questions. They are also the load-bearing ones, because if the answers here are wrong, nothing further matters.

---

### 1. What is Miamo?

Miamo is a relationship app built for the way Indian twenty-somethings actually live. There are two sides — a left side called **Discover** for casual dating, exploration, and chat, and a right side called **DTM (Date-to-Marry)** for serious, family-aware, marriage-track conversations. You pick which side you're in for the session. You can use one and ignore the other forever. You can use both at different times. The two sides share a database but use completely different ranking algorithms, different surfaces, different tones, and different defaults. The app is in beta in 2026, has roughly 12,000 daily-active users, and is built and run by a team of two engineers based in Pune.

The technical framing: Miamo is an eleven-service Node.js monorepo (gateway, auth, users, social, matchmaking, messaging, content, notifications, search, tracking-ingest, tracking-worker) backed by a single Postgres 16 instance and a Redis stream for the tracking pipeline. The frontend is Next.js 14 with the App Router. The ranking layer is a set of seventeen V4 algorithms, plus V6, V7, and V8 expansions, all gated behind feature flags and all subject to a per-surface learner that ramps a new algorithm from 0% traffic to 100% over weeks. The source of truth for the ranker registry is `services/shared/src/algo/registry.ts`. Every ranker is required to declare what events it reads, what surfaces it can serve, and what feature flag gates it.

The product framing: we don't think the dating-app market has solved the problem for Indian users in the 22-32 age range. The existing apps were built for North American dating norms — single-line bios, photo swipes, ghosting as the default exit. Indian users have a different reality: family involvement is real and not pathological, marriage timelines are explicit, mood-aware conversation in the evening is the actual product, and ghosting is a deal-breaker that the existing apps treat as a feature. Miamo is the bet that a product built around those realities — earned visibility instead of pay-to-skip-the-line, voice-aware composing instead of generic LLM openers, family-aware bio-data sharing instead of single-line bios, and an anti-ghost economy instead of swipe-and-vanish — will be the product Indian users actually want.

---

### 2. How is Miamo different from Tinder, Hinge, and Bumble?

The short answer is that the three big international apps are descended from the same product: swipe a photo, match if both swipe right, message until someone ghosts, repeat. They differ in the trim — Bumble has women-message-first, Hinge has prompts, Tinder has nothing — but the core loop is the same. Miamo's core loop is different. The loop is: see a small batch of profiles ranked by behavioural signal and not by your stated filter alone, tap one, see *why* you're seeing it (a one-line explanation grounded in real data), and if you message, your first message holds a one-Spotlight-minute deposit that comes back with a bonus if the other person replies inside 72 hours. The loop ends with a serious conversation, not with another swipe.

The technical differences sit at the algorithm and instrumentation layer. The other apps optimise for **session time** — keep the user swiping. Miamo optimises for **first reply rate and 7-day match retention** — get the user into a real conversation, then leave them alone. The reranker (`postImpressionRerank.ts`) explicitly down-weights novelty when a user has just rejected three profiles in a row, because the goal is "next message sent" not "next profile viewed." The Move composer (`moveV2/composer.ts`) reads the recipient's last-10 successful replies before drafting and produces five hook-grounded suggestions in the sender's voice — not generic LLM output. The exposure ledger (`exposureCredits.ts`) accrues earned visibility based on quality engagement, capped at 1.5× for premium, so premium does not buy reach, it buys polish. The Family Brief surface exists at all, which is the single biggest cultural-fit gap on the international apps for Indian users.

The product positioning is that we will not pretend Miamo is for everyone. If you want fast swiping and shallow chat, Tinder is better than us, and we would tell you to use Tinder. If you want a single-purpose marriage-track product with parental oversight, Shaadi.com is more direct than us, and we would tell you to use Shaadi.com. Miamo is the product for the user who is genuinely in between — someone who wants connection but is uncertain whether they want the casual or the serious side this week, someone who has used Tinder and felt dirty and used Shaadi.com and felt rushed. The two-sided architecture is the answer to that user's experience. Discover and DTM live in the same app because the same user crosses between them, and the product is built to let them do so without judgment from the algorithm or the UI.

---

### 3. Will the algorithm show me people I already passed?

Not for a long time. By default, when you pass on a profile in Discover, Miamo writes a row to the `DeferredItem` table tagged `discover.passed` with a TTL of 30 days. During that 30-day window, the candidate-fetch query in the Discover ranker (`forYouV6.ts`) explicitly excludes that profile from your feed. After the 30-day window expires, the row is deleted by a nightly cleanup job, and the profile becomes eligible to reappear — but only if the ranker has independent reason to surface it. The ranker does not re-fetch a passed profile out of obligation. It re-fetches it only if it now scores into your top-50 candidate pool on the current scoring function, which depends on what has changed about you, them, and the world since the pass.

The technical reason for the 30-day window rather than permanent exclusion: people change. The 22-year-old who passes on a 28-year-old because they "look too old" sometimes turns into a 23-year-old who is looking for exactly that age range. The 27-year-old who passes on a profile during a fatigued, polarity-negative session at 11pm on a Wednesday is a different user from the same 27-year-old at 8pm on a Sunday in a curious-explorer mood. We do not want a single moment of poor signal to permanently remove a candidate. We also do not want a permanent exclusion list because it is the kind of state that, when audited, looks worse than it is — "we are showing this user 73 people that they have explicitly rejected" is a story we never want to be in. The 30-day window is the compromise.

The user-facing controls: there is no "show me people I passed" button, by design, because we do not want to encourage the dynamic where users re-evaluate passes (it almost always leads to over-pursuing). What there is, however, is an audit endpoint at `GET /api/v1/users/me/passes` (premium-only) that returns the list of passes from the last 30 days with timestamps. This exists for users who want to verify what the algorithm is doing and for users who occasionally realise they swiped wrong and want to recover a specific profile. The endpoint surfaces only the user's own passes; it never returns who passed on them, both because that is socially toxic and because the data is one-way (we store who *you* passed, not who passed *on you*, as a deliberate asymmetry).

---

### 4. Why does the app feel different at night?

Because we run a real-time mood inference worker (`moodRightNow.ts`) that emits a 5-dimensional mood vector — calm, curious, fatigued, social, frustrated — for each active user every five minutes. The vector is derived from your last-thirty-minutes-of-behaviour: how fast you're scrolling, how quickly you decide on each profile, how often you tap "see more," how the rhythm of your taps changes through the session. At night — usually starting around 10pm local — the fatigued dimension begins to climb for most users. When it crosses 0.5, the rankers and the composer notice. The Discover feed shifts to closer-geo, lower-novelty profiles. The Move composer's hook library down-weights playful and tricolon templates and surfaces softer, more concrete drafts. The DTM topic mask skips intimacy, conflict, and finance topics until tomorrow morning.

The technical mechanism is a per-user mood vector stored in `UserActivity` aggregates and read by the `withConsent('moodInference')` middleware. Each ranker that depends on mood reads the vector through `withConsent`, which checks the user's `Settings.moodInferenceEnabled` flag (default OFF). When the flag is OFF, `withConsent` returns the v3.5 neutral mood vector (`[0.5, 0.5, 0.5, 0.5, 0.5]`) instead of the real one, and the ranker behaves identically across all hours of the day for that user. The worker itself still runs — we need the aggregates for cohort-level analysis — but the per-user behaviour does not change unless the user has opted in. The "feels different at night" experience is therefore a consent-gated feature, not a default-on inference.

The product reasoning: most users have asked, repeatedly, for the app to not push hard conversations on them at 11:47pm. The intimacy topic in DTM is the canonical example — when the topic mask emits `['intimacy', 'conflict', 'finance']` as the skip set at late-night fatigued sessions, users tell us the app finally feels considerate. The flip side is that some users want the app to push them regardless of mood; for those users, the `moodInferenceEnabled` toggle stays OFF and the experience stays consistent. The mood inference is described as a special-category inference under GDPR Article 9, which is why it is default-OFF and gated by an explicit consent — see [SECURITY §11.1](./SECURITY.md#111-moodinferenceenabled--default-off). We did not want to make mood-aware ranking a default that users had to discover and turn off. We made it a default-off opt-in that users discover when they want a softer night experience.

---

### 5. What's a Move suggestion?

A Move suggestion is a five-option draft of a first message (or a follow-up reply) generated by Miamo's composer, grounded in your voice and the recipient's reply history. You tap the suggest button next to the chat input. The composer takes a moment, then shows five drafts, each with a different hook (a question grounded in a concrete detail from their profile, a callback to their last public post, a softer opener, a tighter opener, and a code-mixed variant if your language family is Hinglish, Tanglish, or Banglish). You can pick one, edit it, send it as-is, or dismiss the panel and write your own. The composer does not auto-send. It is a draft surface, not an auto-pilot.

The technical layer is the Move v2 stack (`algo/v8/moveV2/`), which has five modules. `senderVoice.ts` extracts a 12-feature voice fingerprint from your last K=50 outbound messages: casing leaning, average sentence length, emoji density, exclamation rate, question rate, hedge rate, code-mix ratio, formality score, and five more. `receiverResonance.ts` reads the recipient's last 10 messages that successfully drew replies — what hooks worked on them, what tone, what length. `hookLibrary.ts` is a curated set of 8 hook categories with falsifiability tests (a hook must reference a real, verifiable detail; "you seem fun" fails the test). `codeMix.ts` picks the language family (en, hi_en, ta_en, bn_en) based on the char-trigram score of your last 20 messages, with a 0.6 confidence floor below which we fall back to English to avoid Hinglish-template-at-English-speaker misclassification cost. `composer.ts` orchestrates the four into five drafts and routes them through a linter (26 forbidden phrases, including "DTF," "send pic," and others we will not enumerate here).

The product reasoning is that the dating app industry's experiment with generic LLM openers has been a disaster — every recipient can spot the generic AI opener at twenty paces, and the conversion rate on those messages is below 4%. The Move composer's bet is that an opener grounded in your real voice and their real history is materially better. The early data — Move v2 has 14× the first-reply rate of generic openers across the v3.6.0 cohort that has it enabled — supports the bet. The composer is a premium feature in v3.6.0; free users get one Move suggestion per day, premium gets unlimited. The reasoning is that the composer is the closest thing Miamo has to a "feature that costs us money per use" (the voice fingerprint and resonance reads are non-trivial DB and compute), and premium gives us the unit economics. See [PRODUCT §4.3](./PRODUCT.md#43-the-move-v2-moment-at-931pm--composing-to-arjun) for a walkthrough.

---

### 6. What's a Voice Fingerprint?

A Voice Fingerprint is a card that appears in your app after you have sent 50 outbound messages. It names your writing style, in two-to-three sentences, in plain English. For example: "You write in lowercase, lean playful, and code-mix Hinglish about 12% of the time. Your average message is 7 words. You ask a lot of questions. You use emojis sparingly, mostly the eye-roll and the smirk." The card is shareable to Instagram, which is the viral hook. It is also a feedback loop on the Move composer: users who see their fingerprint trust the composer's drafts more, because the composer's drafts are visibly written in the same voice.

The technical mechanism is the same `senderVoice.ts` module that powers the Move composer. The 12 features are: casing leaning (proportion of lowercase first-letters), average sentence length, emoji density (emojis per 100 characters), exclamation rate, question rate, hedge-word rate (using a curated lexicon of "maybe," "sort of," "kind of," etc.), code-mix ratio (proportion of romanized non-English tokens, computed via a char-trigram model against the `hi_en`, `ta_en`, `bn_en` dictionaries), formality score (against a small model trained on a labelled corpus), opener variety, hour-of-day pattern, and two more. The card is generated by a templater that takes the top-3 features and renders a human-readable sentence per feature using a fixed template set. There is no LLM in the loop for the card text — it is fully templated to keep it stable, fast, and predictable.

The product reasoning is that voice is the most under-leveraged signal in the dating-app stack. Every existing app treats every user's messages as equivalent training data — average it out, rank with the average. The bet of the Voice Fingerprint is that users have voices, those voices are stable across messages, and surfacing the voice (a) makes the user feel seen, and (b) gives them a reason to trust the composer's drafts. The card is a v3.6.0 feature, default-on, with a one-tap dismiss; if you dismiss it, you can re-summon it from Settings. The card was a deliberate viral mechanism: we ship it on the 50th message because that is the point at which the fingerprint has stabilised (we tested K=10, K=30, K=50, K=100; the K=50 fingerprint matches the K=100 fingerprint with cosine 0.94, so 50 is the sweet spot for "stable enough to show without revising"). The shareable-to-Instagram surface contributed 18% of new signups in the four weeks after launch.

---

### 7. What's the Family Brief?

The Family Brief is a one-tap Indian bio-data card you can generate from a DTM match's profile (or your own) and share via WhatsApp to a family member. You tap the clipboard icon in the DTM profile view. A bottom sheet asks: PDF, Image, or Text? You pick one. A preview pane shows a beautifully formatted card with the person's name, photo, age, education, profession, family details (parents' location, siblings), kundli (auto-fetched from their vibe-check answers if they've consented), and partner preferences. You tap Share. The card goes to WhatsApp with a TTL link that expires after 7 days. Your family member sees a clean bio-data without leaving WhatsApp.

The technical mechanism is the `/api/v1/dtm/family-brief/generate` endpoint, which writes a `FamilyBriefShare` row with `userId`, `format ∈ {pdf, image, text}`, `expiresAt = now + 7d`, `views = 0`, and a base64url token (22 chars, HMAC-derived). The token is used to construct the share URL. The PDF is rendered server-side with Puppeteer using a fixed template. The image is the same template rasterised to 1080×1920 (Instagram-story aspect ratio). The text format is a plain-text version for users who prefer copy-paste. After 7 days, the token is revoked — the URL returns 410 Gone — and the row is hard-deleted within 24 hours by a cleanup job. The view count is incremented on each successful fetch and is visible to the sender (so you know your mother actually opened the card).

The product reasoning is that family-aware sharing is the actual experience of marriage-track dating in India, and the existing apps either ignore it or build it as a heavy, bolted-on feature. The bet of the Family Brief is that the act of sharing should be one tap, the card should look like a bio-data (because that is what the family is expecting), and the TTL exists so that "I shared this with my mom" does not turn into "this profile is now permanently floating in the family WhatsApp group." The 7-day TTL is the trade-off between "long enough for my mother to actually open it on her own time" and "short enough that it doesn't become a permanent leak." The feature is gated by an explicit consent toggle (`Settings.familyBriefEnabled`, default OFF) because the privacy implications are non-trivial — see [SECURITY §11.5](./SECURITY.md). The Family Brief does not include caste, despite being a culturally complete Indian bio-data otherwise; see Question 34.

---

### 8. What's Weekly Top-10?

Weekly Top-10 is a Sunday-morning ritual in the Discover side of Miamo. Every Sunday at 9am local time, you get a notification with ten profiles. Each profile is one the algorithm thinks is genuinely a top match for you that week, ranked by a stable-matching algorithm against the other side's preferences too — meaning the people you see in Top-10 also see you in their Top-10, with high probability. The ten are presented as cards in a horizontal swipe surface. You can like, dismiss, or save each one. The list does not refresh until next Sunday. The scarcity is intentional: this is the ten people the algorithm thinks deserve a longer look.

The technical mechanism is the Gale-Shapley stable-matching worker (`stableMatchTop10.ts`) that runs weekly. It takes the top-100 candidates for each user (by Discover ranker score), computes the bilateral preference matrix, and runs Gale-Shapley to find the stable matching where no two users would prefer each other to their current assignment. The matching is one-directional — your Top-10 is your Top-10, not a symmetric pair — but the stability guarantee means the same name appears on both sides of the match with much higher frequency than random. The exposure-credit reranker (`fairnessRerank.ts`) is applied as a post-step to make sure the gender-conditional exposure distribution stays within fairness bounds (Singh-Joachims). The output is written to the `WeeklyTop10` table on Saturday at 11pm; the notification fires Sunday at 9am local (using the chronotype prior to set the right hour).

The product reasoning is that infinite scroll is the wrong shape for serious matching. The user is supposed to evaluate ten people on a Sunday morning over coffee, not seventy in five minutes on a Wednesday lunch. The scarcity creates the right pacing. The stable-matching guarantee creates the right honesty: we are not showing you ten people who would never look at you back; we are showing you ten people who, if they saw you, would put you near the top of their list. The Top-10 is a free feature, not a premium one, because the product would be hollow without it for free users. Premium does not get a bigger Top-10; it gets a 1.5× exposure-credit multiplier elsewhere (Question 14). The Top-10 is the moment when the product earns its keep on the casual side. See [ALGORITHMS §3.B.2](./ALGORITHMS.md#3b2-galeshapleyts--weekly-stable-match-top-10) for the algorithm.

---

### 9. What's the anti-ghost system?

The anti-ghost system is the rule that says: when you start a new chat by sending a first message, you deposit one Spotlight minute against that conversation. If the recipient replies within 72 hours, your deposit is returned to you plus a bonus minute. If they do not reply within 72 hours, the deposit is forfeit. The deposit is a small thing — one minute of Spotlight visibility — but the incentive structure changes the composer behaviour at the margin. Senders compose more carefully because there is a small concrete cost to a low-effort opener. Recipients are nudged to reply (with a 72-hour countdown shown in the chat) because the sender's deposit is on the line.

The technical mechanism is the `antiGhost.ts` module, which sits in the messaging-service codepath. When a first message is sent in a new chat, the service deducts 1 from `SpotlightLedger.balance` for the sender, writes a `SpotlightLedger` row with `type = 'antighost.deposit'`, and sets a delayed job (Redis ZSET, scheduled for `now + 72h`) tagged `antighost.resolve` for that chat. When the recipient sends their first reply, the resolve handler runs immediately: credit +2 to the sender (deposit returned + bonus), write a `SpotlightLedger` row with `type = 'antighost.return'`, and cancel the delayed job. If the 72h timer fires before the recipient replies, the resolve handler runs and writes a `SpotlightLedger` row with `type = 'antighost.burn'` — no credit is returned. The sender sees both outcomes in their ledger view.

The product reasoning is that ghosting is the existing apps' worst failure mode and we did not want to ship a product that incentivised it. The Spotlight-minute deposit is not large enough to feel punitive (one minute of Spotlight visibility is worth a few hundred profile impressions, not a meaningful slice of anyone's budget), but it is concrete enough to change behaviour. The 72-hour window is the trade-off between "long enough for the recipient to reply organically" and "short enough that the sender is not waiting two weeks for resolution." The +1 bonus on reply is the incentive for both sides: the sender wants the deposit back, the recipient wants the sender to feel good about the chat. The system is on for everyone, free and premium, and is the single feature most likely to be cited by users as the reason they keep using Miamo over Hinge. See [ALGORITHMS §3.D.3](./ALGORITHMS.md#3d3-antighostts--depositreply-bonusburn-economy).

---

### 10. What's DTM?

DTM stands for **Date-to-Marry**. It is the right side of the Miamo app — a separate tab, accessed with a different gesture from Discover. On the DTM side, the unit of interaction is a single curated match per day. You see one person. You read their profile in full. You answer the day's depth question (one of 16 topics — values, family, finance, conflict, intimacy, lifestyle, etc.). You can bookmark them for tomorrow if you want time to think. You can tap Family Brief to share their bio-data with a family member. You can start a DTM-specific chat that is gated by a different anti-ghost rule (the deposit is 2 minutes, not 1). The DTM surface does not have infinite scroll. The DTM surface does not race the clock.

The technical mechanism is the DTM ranker family (`algo/dtm.ts`, `algo/dtmV6.ts`, `algo/v7/dtmFeedV7.ts`) that operates on a 16-topic L2-normalised affinity vector built up from the user's answers to the daily depth questions over time. The matching algorithm is cosine similarity over the affinity vector, with a coverage gate: users with fewer than 0.5 of the 16 topics answered are in cold-start mode (`dtmColdStart.ts`) and see filler content rather than curated matches until they cross the threshold. The topic mask (`dtmTopicMask.ts`) reads the current mood vector and emits a skip set when the user is fatigued at night, so heavy topics don't surface at the wrong moment. The DTM ranker reads from `MatrimonialProfile` rather than the standard `Profile`, which has the Indian-context fields (education with institution, profession with company, family details, kundli markers, partner preferences). The two profiles are linked by the same `userId`; the user fills out both during onboarding if they have opted into DTM.

The product reasoning is that the Tinder model is the wrong shape for marriage-track matching, and the Shaadi.com model is too transactional. DTM is the bet on a middle ground: serious, slow, curated, family-aware, but without the bureaucratic feel of the existing matrimony products. The one-match-a-day pace is the most-asked-about feature on DTM, both positively ("finally an app that doesn't make me swipe through 70 strangers to find one I'd actually marry") and negatively ("only one a day? I want more"). We have held the one-a-day position because every alternative we tested — three a day, five a day, infinite — produced worse downstream outcomes (lower message quality, lower second-date rates, lower 6-month retention). The constraint is the feature. DTM is opt-in (`Settings.dtmEnabled`, default OFF) because we did not want to surface the marriage-track tab to users who installed the app for casual dating. See [PRODUCT §5](./PRODUCT.md#5-the-deep-compat-side--dtm-family-brief-the-matrimonial-layer).

---

### 11. What's a Spotlight minute?

A Spotlight minute is the unit of earned visibility in Miamo. One Spotlight minute means your profile is ranked at the top of the relevant feed for one minute of viewing time across all the users in your geo and intent cohort. You earn Spotlight minutes by doing things the algorithm reads as quality engagement: writing a thoughtful first message that draws a reply, getting matches that turn into 7-day-active chats, posting in Creativity that draws comments, completing your DTM profile. You spend Spotlight minutes implicitly — the system spends them on your behalf during the next eligible feed render — or you forfeit them in the anti-ghost flow. You cannot buy them. The ledger is visible to you under Settings → Spotlight Ledger.

The technical mechanism is the `SpotlightLedger` and `SpotlightAward` tables and the `exposureCredits.ts` algorithm. The ledger is an append-only log of credit and debit events; the balance is computed as the sum of `amount` over all rows with the user's `userId`. The award logic runs in the `exposureScheduler.ts` worker, which evaluates ledger balances every five minutes and writes to the `TrendQueue` for the next batch of impressions. Free users have a 1.0× multiplier on awards; premium users have 1.5× (see Question 14). The award sources are codified in `algo/v8/exposureCredits.ts` with explicit weights per event type. The award sources include: first-message-reply (+1), 7-day-active match (+2), DTM completion milestones (+3 at coverage = 0.5, +5 at 1.0), Creativity post that draws ≥5 comments (+1), Family Brief share generated (+0.5). Burns include: anti-ghost forfeit (-1), reported and validated abuse (-10), profile inactivity over 14 days (-1 per week).

The product reasoning is that pay-to-skip-the-line is the failure mode we most want to avoid. Every existing dating app eventually arrives at a "boost" model where you pay to be shown more, and the boost gets bigger as you pay more. The user experience converges on "the people you see are the people who paid most recently." Miamo's bet is that earned visibility, capped to a 1.5× premium ceiling, produces a healthier feed where the people you see are the people who genuinely engage well with the platform. The Spotlight minute is the unit of that economy. The cap is the position. The visibility-into-the-ledger is the transparency that makes the position defensible. See [PRODUCT §3.4](./PRODUCT.md#34-earned-visibility) and [ALGORITHMS §3.B.1](./ALGORITHMS.md#3b1-exposurecreditsts--earned-slot-accrual).

---

### 12. Can I turn off behavioural inference?

Yes, and the toggle is in Settings → Personalization & Privacy. There are four toggles. `Mood inference` (default OFF) controls whether the mood vector is used to personalise your feed and composer. `Behavioural ranking` (default ON) controls whether your tap-level behaviour is read by the ranker beyond your stated filters; if you turn this off, you see the feed produced by your filters alone, with no behavioural reranking. `Cross-user inference` (default ON, also doubles as the CCPA "Do Not Sell" toggle) controls whether your behaviour can be used to update the global model that affects other users; turning this off opts you out of being part of the training signal. `Algorithmic transparency` (default ON) controls whether the Why-am-I-seeing-this surface is available on each profile; turning this off hides the explanation cards. All four toggles take effect within five minutes of being changed and are logged to the audit table.

The technical mechanism is the `withConsent()` middleware in `services/shared/src/consent.ts`. Every ranker that depends on behavioural signal wraps its read of that signal in `withConsent('behavioralRanking', userId, fallback)`. When the consent flag is OFF, the function returns the `fallback` value, which for behavioural ranking is the neutral score that makes the ranker behave identically across all users. The same pattern applies to mood, cross-user, and transparency. The flags are stored on the `Settings` row, and changes write to `ConsentEvent` and `AuditLog` simultaneously. The propagation latency is the cache TTL on the consent read, which is 5 minutes; we do not invalidate the cache on every consent change because the volume of changes is low enough that the staleness is acceptable.

The product reasoning is that we did not want to make these toggles hard to find, default-to-the-most-aggressive-collection, or buried under nested menus. They live one tap below the Settings root, with plain-English labels and one-sentence explanations of what each toggle does. The default state for `moodInferenceEnabled` is OFF, which is the more conservative position — most users will never turn it on, and the app works for them at the neutral baseline. The default state for `behavioralRankingEnabled` is ON, which is the position that the algorithm is the product and turning it off produces a worse experience; users who want to turn it off can, but they should know what they are getting. The four toggles are the entirety of the consent surface. We have deliberately not added "consent for each feature" granularity, because past experience with consent UIs shows that more toggles produce less informed consent. See [SECURITY §11](./SECURITY.md#section-11--the-four-consent-toggles).

---

### 13. Will I be invisible to other users?

Not by default, and there is no toggle to be globally invisible. The closest thing we have is the `PrivacySettings.discoverable` flag, which when OFF removes you from the candidate pool for every other user's Discover feed. You can still receive messages from people you have already matched with. You can still appear in DTM if you have DTM enabled. You can still appear in Search by exact handle. You can still appear in Creativity surfaces if you have posted publicly. The flag is therefore not "invisibility" in the strong sense — it is "do not surface me to strangers in Discover."

The technical mechanism is a candidate-fetch filter in every Discover ranker: `WHERE p.discoverable = true` is appended to the underlying SQL. When you toggle the flag OFF, your `Profile` row's `discoverable` column is updated and the next feed render for every other user excludes you. There is no caching layer between the flag and the candidate fetch in the v3.6.0 implementation, so the propagation is immediate (within the next feed pull, typically under 30 seconds). The DTM side reads `MatrimonialProfile.discoverable` separately, which means a user can be invisible on Discover but visible on DTM (or vice versa). The matchmaker logic in `services/matchmaking/src/server.ts` honours both flags independently.

The product reasoning is that strong invisibility — "remove me from every surface, every search, every recommendation" — is what users actually want when they say "I want to be invisible," but it is also what they want when they have already matched with someone they like and they don't want to be distracted. We separated the use cases. The `discoverable` flag is the soft invisibility for the second case. The strong-invisibility case is solved by account deletion (Question 19), which removes you from everything. We did not want a "ghost mode" that pretended to remove you but secretly kept you in some surfaces — that is the kind of dark pattern the four refusal-items in [PRODUCT §6](./PRODUCT.md#6-what-miamo-refuses-to-do) prohibit.

---

### 14. Why does premium only get 1.5×, not 5×?

Because the entire bet of the Miamo product is that pay-to-skip-the-line is the failure mode that ruins dating apps. If premium got 5×, premium users would see the feed and free users would see the leftovers. The feed would converge on a "who paid most recently" ranking. The casual users would feel like second-class citizens. The product would be a worse Tinder. We capped the multiplier at 1.5× because that is the highest value that still preserves the principle "the feed is mostly earned, with a small polish for premium," and the lowest value that still makes premium worth paying for (premium users do see meaningfully more impressions, just not 5× more).

The technical mechanism is the multiplier applied at the award step in `exposureCredits.ts`. Every credit event runs through `credit = baseCredit × (isPremium ? 1.5 : 1.0)`. The multiplier is not applied at the spend step (impression rendering), which means premium users do not get their credits stretched further per impression — they accrue them faster. The 1.5× value is a configuration constant in `services/shared/src/algo/v8/exposureCredits.ts` and is the single most-debated number on the team. We have considered 1.25× (more conservative; would reduce premium-conversion by an estimated 18%), 1.5× (current; the compromise), 2.0× (less conservative; would feel more like pay-to-win and would change the product), and 5.0× (the industry standard). We stayed at 1.5×.

The product reasoning is documented in [PRODUCT §3.4](./PRODUCT.md#34-earned-visibility) and is the founder's explicit position. The position is: premium is for polish, not power. Premium gets you (a) the 1.5× multiplier, (b) unlimited Move composer drafts, (c) the audit endpoint at `/api/v1/users/me/passes`, (d) read receipts in chat, and (e) the ability to undo a swipe within the last 24 hours. Premium does not get you (a) more matches per day on DTM, (b) priority placement in Weekly Top-10, (c) the ability to see who has liked you in advance, or (d) any other feature that would tilt the matching market in your favour at the expense of free users. The trade-off is real: we make less money per user than the industry standard. We have decided the trade-off is correct.

---

### 15. What if my mood is wrong?

The mood vector is a probabilistic inference, not a measurement, and it is wrong sometimes. When it is wrong, the user-visible symptoms are: the feed shifts to a softer set of profiles when you don't want it to, the Move composer suggests softer drafts when you wanted to be punchy, the DTM topic mask hides the intimacy topic when you wanted to answer it. The fix is to go to Settings → Personalization & Privacy and toggle `moodInferenceEnabled` to OFF. With the flag off, the mood vector is replaced by the neutral `[0.5, 0.5, 0.5, 0.5, 0.5]` across all surfaces, and the feed and composer behave the same regardless of your actual mood. You can toggle it back ON when you want the mood-aware experience.

The technical mechanism is the consent layer we have already described: `withConsent('moodInference', userId, neutralVector)` is what every ranker uses to read the mood. When the consent is OFF, every ranker gets the neutral vector and behaves the same regardless of the real mood. There is no per-ranker override of the consent — if you turn it off, it is off everywhere. We deliberately did not build per-surface mood overrides ("use my mood for Discover but not for DTM"), because the consent UI gets confusing fast and the value of per-surface granularity is low.

The product reasoning is that mood inference is special-category data under GDPR Article 9 and we did not want it as a default-on inference for that reason. It is also a probabilistic inference that fails in ways that frustrate users when they are wrong — and a user who feels gaslit by their app is a user who churns. The default-OFF position is the conservative position; the toggle is the controlled experiment with self. Users who turn it ON and like it stay on it; users who turn it ON and don't like it turn it off and never think about it again. The toggle is the answer to "what if my mood is wrong" — turn it off and the question stops being asked.

---

### 16. Can I see "why am I seeing this profile"?

Yes. On every profile card in Discover, there is a small info icon in the corner. Tap it. A bottom-sheet opens with a one-line plain-English explanation: "You're seeing Arjun because you both score high on the curious-explorer vibe vector and you've engaged with three profiles in his neighborhood this week." Below the headline, an expandable list shows the top-three ranker ingredients that contributed to his score for you, each with a numeric weight: `vibeVectorFit: 0.31`, `geoProximity: 0.22`, `intentRightNowFit: 0.18`. Each ingredient links to a glossary entry that explains what the ingredient is and how it is computed. The whole surface is gated by the `algorithmicTransparency` consent flag (default ON); users who turn it off do not see the info icon.

The technical mechanism is the `explain.ts` module, which is called as a side-effect of the Discover ranker. Each ranker writes its `ingredients` array (a list of `{name, weight, contribution}` tuples) to a per-impression cache keyed by `(userId, candidateId, surface)`. The cache is read by the `/api/v1/social/discover/explain` endpoint, which the frontend calls when the user taps the info icon. The cache TTL is 24 hours; after that, the explanation is regenerated on-demand with the current ranker state (which may have changed if the user's behaviour has shifted). The plain-English headline is templated from the top-1 ingredient using a template-per-ingredient map; the expandable list is rendered directly from the ingredients array.

The product reasoning is that algorithmic transparency is both a regulatory requirement (under GDPR Article 22, see Question 22) and a product value. The bet is that users who can see why they are seeing what they are seeing trust the algorithm more, and trust correlates with retention. The early data supports the bet: users who tap the info icon at least once per week have 23% higher 30-day retention than users who never tap it. The feature is a free, default-on, no-friction surface. We have deliberately not gated it behind premium, because gating transparency feels wrong. See [ALGORITHMS §6.4](./ALGORITHMS.md#64-explainTS) for the implementation and [PRODUCT §4.2](./PRODUCT.md#42-the-why-am-i-seeing-this-moment) for the user-facing walkthrough.

---

## Section B — Privacy

This section answers the privacy questions. They are the questions users ask when they install the app and pause at the consent screen. They are the questions journalists ask when they are writing a story about Indian dating apps. They are the questions regulators ask when they are auditing a product. We have written the answers in plain English where possible, and with regulatory citations where the answer is bound by a specific clause.

---

### 17. Can my mom read my chats?

No. No one at Miamo, including the engineering team, can read your chats. Chat messages are encrypted at rest using AES-256-GCM with per-chat keys derived from a master key held only in the production secret manager. The key derivation is `HKDF-SHA256(masterKey, chatId)`, which means each chat has a unique key, and compromising one chat's key does not compromise any other. The encryption happens before the message is written to Postgres; the database row contains the ciphertext, the IV, and the auth tag, but never the plaintext. When you read your own chat, the message is decrypted in the messaging service in-memory and streamed to your client. Decryption logs are written to the audit table.

Your mother specifically cannot read your chats because (a) she does not have your account credentials, (b) she does not have the master key, and (c) the only person who can decrypt your chat is someone who can authenticate as you. The only exception is if your mother is also on Miamo and you have specifically opened a chat with her (which would be visible in your chat list, and which you would have explicitly accepted). The Family Brief flow does not give your mother access to your chats — it only gives her a one-shot bio-data card via a time-limited WhatsApp link. The card does not contain your chat history. The card does not give her a login. The card is a one-way export of public profile data.

The technical detail is in [SECURITY §3.1](./SECURITY.md#31-chat-message-encryption-aes-256-gcm). The encryption is AES-256-GCM (authenticated encryption with associated data). The key rotation policy is documented in [SECURITY §3.2](./SECURITY.md#32-encryption-key-rotation-semantics): the master key is rotated every 90 days, and the rotation is silent — old chats remain readable with the previous master key, which is kept in the secret manager under a versioned alias. The audit log for chat reads is documented in [SECURITY §13.2](./SECURITY.md#132-what-is-logged). The position [PRODUCT §6.4](./PRODUCT.md#64-no-reading-user-chats) — "No reading user chats" — is a refusal-item that is enforced by code. The decryption codepath is only callable by the messaging service, only on behalf of the authenticated user, and only with a valid request-id and trace. There is no admin tool that reads chats. There is no support escalation that reads chats. There is no "internal mode" that bypasses the encryption.

---

### 18. What data does Miamo store about me?

Miamo stores: your account record (`User` table — email, phone hash, OAuth identity if applicable, account state), your profile (`Profile` and `MatrimonialProfile` — name, age, photos, bio, education, profession, family, kundli, partner preferences), your settings (`Settings` and `PrivacySettings` — toggles for consent, discoverability, notifications), your matches (`Like`, `MatchRequest`, `Match`, `MatchFeedback`), your messages in encrypted form (`Chat`, `Message`), your DTM answers (`DtmMessage`), your tracking aggregates in HMAC-hashed form (`EventAggHourly`, `EventAggDaily`, `FeatureSnapshot`, `PairCompatCache`), your Spotlight ledger (`SpotlightLedger`, `SpotlightAward`), and a small number of other tables for safety, search, and audit. The full list is in `services/shared/prisma/schema.prisma` and is documented in [DATA_MODEL.md](./DATA_MODEL.md).

What we explicitly do not store: your raw IP address (we store a coarse geo derived from it and discard the IP), your device fingerprint at the granularity that would re-identify you across uninstalls (we store a coarse device class), your contacts list (we do not request contacts), your photos beyond what you have explicitly uploaded (we do not scan your photo library), your messages in plaintext (they are encrypted at rest), and the raw `userId` in tracking aggregates (it is HMAC-hashed, see Question 20). The position in [PRODUCT §6.10](./PRODUCT.md#610-no-silent-data-collection-without-opt-in) — "No silent data collection without opt-in" — is enforced at the SDK layer; every event the client emits is visible in the developer tools and is documented in [TRACKING.md](./TRACKING.md).

The retention policy is in [SECURITY §13.4](./SECURITY.md#134-retention) for the audit log and [SECURITY §10.9](./SECURITY.md#109-data-minimisation) for the broader minimisation principle. Profile data is retained until you delete your account. Tracking aggregates are retained for 13 months (DPDP-compliant). Audit logs are retained for 24 months. Chat messages are retained until you delete the chat or the account (the deletion is a hard delete with the encryption key burnt; see Question 19). Backups are retained for 30 days and are encrypted at rest with a different key from the production master key.

---

### 19. How can I delete my data?

You can delete your data by going to Settings → Account → Delete Account and confirming twice. The deletion runs in six steps within 30 days of your request (DPDP-mandated SLA). The steps are: (1) mark your account `deletionRequestedAt` and disable login; (2) anonymise your profile (replace name with "Deleted User," remove photos, clear bio); (3) hard-delete the encryption keys for your chats (which makes the chat messages unrecoverable even by the team); (4) hard-delete your matches, likes, and feedback; (5) HMAC-hash-burn your tracking aggregates (so they are no longer linkable to your hash); (6) write a `userDeleted` event to the audit log with the deletion timestamp and the original `userId` (which is the only place the original `userId` is retained, and only for compliance).

The technical mechanism is documented in [SECURITY §12.1](./SECURITY.md#121-the-six-steps). The key is the "triple-secret RTBF lever" — when the user requests deletion, the master encryption key, the HMAC tracking secret, and the audit signing key are all rotated. The user's old data, which was encrypted/hashed with the old keys, is now unreadable. This is the strongest form of deletion: not a soft-delete with a flag, not an overwrite of plaintext, but the cryptographic destruction of the keys that made the data readable in the first place. The lever is documented in [SECURITY §3.4](./SECURITY.md#34-the-triple-secret-rtbf-lever).

The 30-day SLA is the DPDP requirement; the actual deletion typically completes within 7 days. The audit-log record of the deletion is retained for 24 months, as required by the DPDP compliance regime, but the record contains only the original `userId` and the deletion timestamp — not the profile data, not the chat history, not the tracking aggregates. After 24 months, the audit record is also hard-deleted. The position in [SECURITY §12.4](./SECURITY.md#124-the-soft-delete-we-deliberately-do-not-have) — "The 'soft delete' we deliberately do not have" — is the explicit refusal to retain user data behind a `deleted = true` flag. If you delete, the data goes. If you change your mind, you create a new account.

---

### 20. What's HMAC hashing?

HMAC (Hash-based Message Authentication Code) is a one-way hashing function keyed by a secret. We use HMAC-SHA256 to turn your `userId` into a 22-character base64url hash before writing it to any tracking aggregate. Once hashed, your `userId` cannot be recovered from the hash without the secret key. Even if someone got a copy of the tracking database, they could not re-identify any user. The hash is deterministic — the same `userId` always produces the same hash — which means we can still compute aggregates (count of events per user, sum of features per user) without storing the raw `userId`.

The technical detail is in [SECURITY §3.3](./SECURITY.md#33-tracking-pseudonymisation-hmac-sha256). The HMAC secret is stored in the production secret manager under `TRACKING_HMAC_SECRET`. The hash function is `base64url(HMAC-SHA256(secret, userId)).slice(0, 22)`. The 22-character truncation is the smallest length that preserves a near-zero collision probability for our user base (we have 10^5 users; the collision probability at 22 chars of base64url is below 10^-30). The hash is computed in the tracking-ingest service (`services/tracking-ingest/src/server.ts`) before the event is written to the Redis stream. The downstream worker (`services/tracking-worker`) never sees the raw `userId` at all.

The product reasoning is that we wanted a tracking pipeline that, in the worst-case scenario of a full database compromise, did not contain re-identifiable behavioural data. The HMAC hash is the answer. The secret key is the leverage: rotating the secret invalidates every existing hash, which is exactly what we do in the RTBF flow (Question 19) and what we would do in a key-compromise incident. The rotation costs us the ability to compute longitudinal aggregates across the rotation boundary, but that is a price we have decided is acceptable for the privacy guarantee. See [SECURITY §3.4](./SECURITY.md#34-the-triple-secret-rtbf-lever) for the rotation lever and the threat model it defends against.

---

### 21. Is my profile shared with other apps?

No. Miamo does not share your profile with any other app, any other company, any third-party advertiser, any data broker, any ML training pipeline outside of Miamo's own, or any partner. The only data that leaves Miamo's servers under your name is (a) the Family Brief, which you explicitly generate and explicitly share with a specific WhatsApp recipient, (b) the Voice Fingerprint card, which you explicitly share to Instagram if you tap the share button, and (c) the standard profile photos and bio that other Miamo users see when you are surfaced to them in Discover or DTM. There is no API for third-party apps to fetch your profile. There is no marketing-list export. There is no data-broker pipeline. The position is in [PRODUCT §6.11](./PRODUCT.md#611-no-selling-user-data-to-third-parties).

The technical layer is that we do not run a third-party SDK in the client. There is no Facebook SDK, no Google Analytics, no Mixpanel, no Amplitude, no AppsFlyer, no Adjust, no Branch. The analytics layer is in-house (`services/tracking-ingest`, `services/tracking-worker`) and writes only to our own Postgres. The crash-reporting layer is Sentry, which receives stack traces and a hashed user identifier, but no profile data — see [SECURITY §8.4](./SECURITY.md#84-pii-redaction-in-logs) for the redaction layer. The app store reporting (App Store Connect, Google Play Console) receives only aggregate install and crash counts. The CDN (Cloudflare) sees IP-level traffic but does not log it beyond the standard 24-hour retention.

The position on advertising is that Miamo is a paid product (subscription) and has been since v1.0. We have never accepted an ad. We have never integrated an ad network. We have never offered a "free with ads" tier. The choice was deliberate at the founder level: advertising and behavioural profiling for advertising are the failure mode that turns every consumer product into a worse version of itself. We chose subscription. The subscription pricing is a smaller margin than the industry-standard ad-supported alternative would produce; the trade-off is a product that does not have a business reason to share your data.

---

### 22. What's GDPR Article 22 and how does it affect me?

GDPR Article 22 is the clause in the EU's General Data Protection Regulation that gives users the right not to be subject to a decision based solely on automated processing — including profiling — that produces legal or similarly significant effects. In dating-app terms, "who I see in Discover" is a decision made by an automated ranker, and the ranker's output significantly affects who I might end up dating, which is significant. Article 22 requires that for such decisions, the user has the right to obtain human review, to contest the decision, and to receive a meaningful explanation of the logic involved.

Miamo's implementation has three parts. First, the `algorithmicTransparency` consent flag (default ON) makes the Why-am-I-seeing-this surface available on every profile, with the top-3 ranker ingredients shown to the user (Question 16). This is the "meaningful explanation of the logic involved" requirement. Second, the contest path: users can request a human review of a specific ranking decision by tapping the info icon's "I disagree with this" button, which writes a `RankingDispute` row to the audit log and routes the dispute to the support queue. The team reviews the dispute, may adjust the ranker's weight on the contested ingredient for the user (via a per-user override in `UserWeightProfile`), and writes a response to the user. Third, the right to obtain non-automated processing — users can request that their feed be served by the v3.5 baseline ranker (which does not use mood inference or polarity inference), via Settings → Personalization & Privacy → "Use baseline ranker."

The technical detail is in [SECURITY §10.2](./SECURITY.md#102-gdpr-article-22--automated-decisions-and-the-human-review-path). The dispute flow is a real human-review path, with a 7-day SLA on response. The baseline-ranker option is a one-click switch to the v3.5 algorithm family, which has been audited under Article 22 and is considered a "non-significant-effect" baseline (it uses only stated filters and basic geo, with no behavioural inference). The product reasoning is that we wanted to be GDPR-compliant by construction, not by retrofit — and we wanted users in India (where the DPDP regime is less strict on Article 22 specifically) to also have access to the same protections. The baseline-ranker option is available to all users globally, not just EU users.

---

### 23. Does Miamo sell my data?

No.

We do not sell your data. We do not share your data for monetary or in-kind consideration. We do not participate in any data-broker market. We do not run targeted advertising on Miamo or off Miamo using your data. We have never accepted an offer to do so. We do not have a business model that depends on it. The subscription revenue is the only revenue. The position is in [PRODUCT §6.11](./PRODUCT.md#611-no-selling-user-data-to-third-parties) and is enforced by the absence of any third-party ad SDK in the client, the absence of any data-broker integration in the backend, and the absence of any contract with a third-party data buyer in our legal records.

Under CCPA / CPRA (California's privacy regime), the term "sale" includes some forms of non-monetary data sharing. Even by that broader definition, Miamo does not sell. The `crossUserInferenceEnabled` consent flag (default ON) doubles as a CCPA "Do Not Sell" toggle; users in California who turn it off opt out of having their behaviour used in cross-user inference, which is the closest thing to "sale" by the CCPA definition that exists in our pipeline. The GPC (Global Privacy Control) browser signal is honoured: when the GPC header is present on a request, the user is treated as having `crossUserInferenceEnabled = false` for that session, with no additional action required from the user. See [SECURITY §10.3](./SECURITY.md#103-ccpa--cpra--california-do-not-sell-gpc).

The product reasoning is that the answer to this question, more than any other, defines the product. Every other dating app in the world makes some money from data — directly through brokerage, indirectly through ad targeting, or implicitly through partnerships that exchange behavioural signal for revenue. Miamo does not. The choice was deliberate at the founder level and has been the position since v1.0. The trade-off is a smaller business than the industry-standard alternative. The trade-off is the product. If you want a free dating app, Tinder is free. Miamo is paid, and one of the things you are paying for is the answer to this question.

---

### 24. What's DPDP and how does Miamo comply?

DPDP is the Digital Personal Data Protection Act of 2023, India's first comprehensive data protection law. It came into force in 2024 with a phased rollout. It is the regulatory regime that governs Miamo as an India-headquartered, India-primary-market product. The act establishes principles of notice and consent, purpose limitation, data minimisation, accuracy, storage limitation, reasonable security safeguards, accountability, and individual rights (access, correction, erasure, grievance redressal). Miamo's compliance posture is documented in [SECURITY §10.1](./SECURITY.md#101-dpdp-act-2023--india-the-home-regime).

The specific Miamo features that implement DPDP requirements: (1) the four consent toggles (Question 12) implement the notice-and-consent principle; (2) the audit log (`AuditLog` table) implements the accountability requirement; (3) the HMAC tracking pseudonymisation (Question 20) implements the data minimisation principle; (4) the 30-day deletion SLA (Question 19) implements the erasure right; (5) the grievance redressal officer (a named role in the company, with a published email at `grievance@miamo.app`) implements the grievance redressal requirement; (6) the children's data restriction — users under 18 cannot register, and there is age verification at sign-up — implements the children's data protection requirement (DPDP §13); (7) the cross-border data transfer policy is that all production data resides in `ap-south-1` (Mumbai), and there is no cross-border transfer to a non-trusted jurisdiction, which implements the cross-border restriction.

The technical layer that operationalises DPDP compliance is the `withConsent()` middleware (every behavioural inference is consent-gated), the HMAC pseudonymisation (every tracking aggregate is keyed by a hash), the triple-secret RTBF lever (deletion is cryptographic, not flagged), and the audit-log integrity (every read of a chat, every consent change, every grievance is logged). The grievance redressal officer is required by law to respond within 30 days; in practice we respond within 7. The compliance posture has been audited internally and is documented in `docs/legal/dpdp-compliance-2026.md` (internal-only). The DPDP regime is younger than GDPR, has fewer case-law precedents, and is more lenient on certain edges (Article 22-equivalent rights are weaker); we have nevertheless implemented the stricter GDPR posture across the board, on the principle that "comply with the strictest applicable regime."

---

## Section C — Technical (for engineers)

This section answers the questions a new engineer asks in their first week. The answers assume you have read the [ARCHITECTURE.md](./ARCHITECTURE.md) and have the monorepo cloned locally. If you have not, start there.

---

### 25. How do I add a new algorithm?

The five-step process is documented in [ALGORITHMS §8](./ALGORITHMS.md#section-8--how-to-add-a-new-algorithm) and is enforced by a typecheck-and-test gate on PR merge. **Step 1**: write the ranker module under `services/shared/src/algo/<surface>/<name>.ts` with a default export that satisfies the `Ranker` type signature: `(ctx: RankerContext, candidates: Candidate[]) => RankedCandidate[]`. **Step 2**: add a registry entry to `services/shared/src/algo/registry.ts` with the ranker name, the surface(s) it serves, the events it reads (the `usesEvents` array), and the feature flag that gates it. **Step 3**: declare the feature flag in `services/shared/src/featureFlags.ts` with a default of OFF and a per-surface default of OFF. **Step 4**: add unit, property, and contract tests under `services/shared/src/algo/__tests__/<name>.test.ts` covering the surface contract (input shape, output shape), the ingredient weights (each weight is in `[0, 1]` and sums to 1.0 across the ranker), and the property "removing the lowest-scoring candidate from the input never increases the output score of the top candidate." **Step 5**: open a PR with a `// because:` comment on every weight, describing the rationale.

The technical guard rails are: (a) the registry entry is the source of truth — if a ranker exists in `algo/` but is not registered, it cannot be invoked at runtime, because the surface lookup goes through the registry; (b) the `usesEvents` declaration is checked at runtime by the consent layer — if your ranker reads an event it did not declare, the consent middleware throws and the ranker fails closed (returns the neutral score); (c) the feature flag is enforced at the surface dispatcher — the dispatcher fetches the active ranker for the surface and the user based on the flag state, and if the flag is OFF, the dispatcher uses the previous default. The result is that a new ranker can be deployed to production at 0% traffic, ramped via the per-surface learner from 0% to 1% to 5% to 25% to 100% over weeks, and rolled back instantly by flipping the flag.

The product reasoning is that algorithm changes are the highest-leverage and highest-risk changes we make. A new ranker can improve match quality by 20% or destroy it by 40%, and the difference is often invisible in unit tests. The five-step process is the minimum viable safety net: registry forces the explicit declaration of what the ranker reads, flag forces the staged rollout, tests force the falsifiability of the weights, and the `// because:` comment forces the rationale to be documented at the point of edit. See [ALGORITHMS §8.1](./ALGORITHMS.md#step-1--registry-entry) through §8.5 for the full procedure.

---

### 26. How do I add a new tracking event?

The flow is: define the event in the shared schema, emit it from the client (or service), and consume it in the aggregator. **Step 1**: add the event type to `services/shared/src/tracking/events.ts` as a TypeScript discriminated union member, with the event name, the `userId` field (always required, will be HMAC-hashed at ingest), the `timestamp`, and the event-specific payload. **Step 2**: emit the event from the appropriate surface — typically the frontend (`services/web/src/lib/tracking.ts`) for user-facing events, or a service backend for server-side events — by calling `track(event)` which POSTs to `tracking-ingest` on port 3260. **Step 3**: declare the event in any ranker's `usesEvents` array if the ranker should read it; the consent middleware will check this at runtime. **Step 4**: add a rollup rule to `services/tracking-worker/src/rollups.ts` if the event needs to be aggregated into `EventAggHourly` or `EventAggDaily`. **Step 5**: add a test under `services/tracking-worker/__tests__/rollups.test.ts` asserting the rollup behaviour.

The technical detail is that the tracking pipeline is a three-stage flow: client → `tracking-ingest` (port 3260) → Redis stream → `tracking-worker` (port 3261) → Postgres. The ingest service HMAC-hashes the `userId` before pushing to the stream, so the worker never sees the raw `userId`. The worker consumes the stream in batches of 100, aggregates per-hour and per-day, and writes to `EventAggHourly` and `EventAggDaily`. The full pipeline is documented in [TRACKING.md](./TRACKING.md). The schema for `EventAggHourly` is in `services/shared/prisma/schema.prisma`. The event types are TypeScript-only — they do not have a corresponding database table for raw events; the rollup is the only persisted form.

The product reasoning is that we want every event to be (a) consent-gated (the ranker declares it reads the event, the user's consent toggles determine whether the ranker can use it), (b) HMAC-hashed (the raw `userId` never reaches the worker), and (c) aggregable (the rollup is the only persistent form, which limits the privacy blast radius if the database is compromised). The five-step process is the minimum viable workflow that satisfies all three. See [TRACKING.md](./TRACKING.md) for the pipeline detail and [SECURITY §3.3](./SECURITY.md#33-tracking-pseudonymisation-hmac-sha256) for the HMAC layer.

---

### 27. How do I add a Prisma model?

The flow is: edit the schema, create a migration, regenerate the Prisma client, restart services, and update mirrors. **Step 1**: edit `services/shared/prisma/schema.prisma` to add the model with all required fields, indexes, and relations. **Step 2**: run `npx prisma migrate dev --name <descriptive_name> --schema services/shared/prisma/schema.prisma` from the monorepo root to create a migration in `services/shared/prisma/migrations/<timestamp>_<name>/migration.sql`. Inspect the SQL. Edit if the auto-generated SQL is suboptimal (Prisma sometimes produces inefficient indexes; we override them by hand). **Step 3**: run `npx prisma generate --schema services/shared/prisma/schema.prisma` to regenerate the Prisma client into `services/shared/node_modules/@prisma/client`. **Step 4**: restart every service — all eleven of them — because they all load the Prisma client from `services/shared/node_modules/@prisma/client`, and the client is in-memory per-process. **Step 5**: if the model is also referenced in another service's local schema (some services have their own `prisma/schema.prisma` mirror for codegen purposes), update the mirror. See the mirror-drift table in the canonical reference docs for the list of mirrors and the drift rules.

The technical gotcha is the one called out in the canonical reference docs: all services load `@prisma/client` from `services/shared/node_modules`, not from their own local `node_modules`. If you add a model and forget to regenerate the client at the shared path, the new model is invisible to every service. If you regenerate but forget to restart the services, the in-memory client is stale. The restart is non-optional; there is no hot-reload of the Prisma client. This gotcha has cost the team multiple hours across multiple incidents; the canonical fix is the four-command sequence in the canonical reference docs.

The product reasoning for the centralised client is that we wanted a single source of truth for the database schema across eleven services, and we wanted to avoid the per-service drift that comes from each service having its own copy of the client. The cost is the restart-everything requirement on schema changes; the benefit is that the schema is genuinely consistent across services and the client types are guaranteed to match the migrations. See the mirror-drift table and the migration list in the canonical reference docs for the maintenance rules.

---

### 28. How do I add a new feature flag?

The flow is: declare the flag, default it to OFF, gate the code with it, and document the rollout plan. **Step 1**: add the flag to `services/shared/src/featureFlags.ts` as a string constant and add the default state (always OFF) to the `defaults` map. **Step 2**: wire the flag into the appropriate `.env` files (development, staging, production) with `FEATURE_FLAG_<NAME>=false`. **Step 3**: gate the code with `if (flags.isEnabled('<NAME>', userId))` at every call site. **Step 4**: write a unit test that asserts the flag-off behaviour is the legacy behaviour (the test reads the flag as OFF and verifies the code path is the pre-flag one). **Step 5**: document the rollout plan in the PR description — typically 0% for one week, 1% for one week, 5% for one week, 25% for one week, 100% if metrics hold.

The technical detail is that `flags.isEnabled(name, userId)` is the single entry point for every flag check. The function reads the flag's default state from `featureFlags.ts`, overrides it with the value from the environment (the `.env` file or the runtime env), and applies any per-user rollout (the `userId` is hashed into a uniform `[0, 1)` value and compared to the flag's `rollout` percentage). The result is cached for 5 minutes per `(flag, userId)` pair. The flag system is in-house; we do not use GrowthBook, LaunchDarkly, or similar. The reasoning is that the dependency surface of an external flag system is high and the in-house implementation is one file of ~200 lines.

**Question 31** addresses the most common feature-flag bug — the bootstrap trap. Read that question before debugging any flag-related issue. The summary is that the flag system reads the environment at process boot time; if you change a flag in `.env` but do not restart the service, the change is not visible. This bites every new engineer at least once.

The product reasoning is that feature flags are the only reason we can ship as fast as we do with two engineers and 12,000 daily-active users. Every feature ships behind a flag. Every algorithm ships behind a flag. Every breaking change to an existing surface ships behind a flag. The flag system is the safety net that lets us roll back in 30 seconds — see [ARCHITECTURE §1542](./ARCHITECTURE.md). The flag must default to OFF; an opt-in default is mandatory because an opt-out default means we have shipped the change to all users without consent.

---

### 29. What's the test bar before merging?

The test bar is: green typecheck, green fast vitest suite, and green full vitest suite. **Typecheck**: `node typecheck.mjs` from the monorepo root must pass; this runs `tsc --noEmit` on every service in parallel and reports any type errors. **Fast vitest**: `pnpm test:fast` from the monorepo root must pass; this runs the unit-test subset (under 30 seconds) that covers the shared algorithms, the schema validators, the consent layer, the encryption layer, and the most critical business logic. **Full vitest**: `pnpm test:full` from the monorepo root must pass; this runs the full unit + integration suite (under 5 minutes), which adds the per-service server tests, the database-backed integration tests, and the QA-phase regression tests.

The technical detail is in the TESTING: the typecheck is intentionally a custom Node script rather than `tsc --build`, because the monorepo has type dependencies that the `tsc --build` mode cannot resolve cleanly across services. The script runs `tsc --noEmit` against each service's `tsconfig.json` in parallel, captures the output, and reports a single pass/fail summary. The fast vitest suite is the subset tagged with `[fast]` in the test name; the full suite is everything. The QA-phase scripts (`scripts/qa-runs/`) are not part of the merge bar — they are run on release candidates only. See Question 30.

The product reasoning is that the typecheck + fast + full sequence is the minimum that catches the bugs we have historically shipped. Type errors are the most common preventable bug (we have shipped a regression because a refactor left a stale type). Unit-test regressions are the second most common. Integration-test regressions are the third. The QA-phase scripts catch the long-tail regressions that only manifest with real database state and real concurrent users; they run pre-release, not pre-merge, because they take 20-30 minutes and would slow merge velocity to a crawl.

---

### 30. How do I run the QA phase scripts locally?


The technical detail is that each QA script is a stateful simulation: it creates users via the auth API, completes their profiles via the users API, walks them through a sequence of Discover swipes, Move composes, and DTM answers, and asserts the resulting Spotlight-ledger, exposure-credit, and match-quality numbers. The scripts are deliberately stateful (not idempotent) because the bugs we want to catch are stateful — race conditions in the ledger, drift in the exposure scheduler, off-by-one errors in the topic mask. Each script generates a `.report.json` with the per-step pass/fail and the per-metric expected-vs-actual delta. The reports are committed to the repo for historical comparison; the latest run's report should be checked in with each release.

The product reasoning is that the unit tests cover the in-process logic, the integration tests cover the per-service boundaries, but neither catches the cross-service stateful bugs that emerge only with realistic user journeys. The QA-phase scripts are the only test layer that catches these. They are run pre-release on every release candidate, and the report-deltas are reviewed before tagging the release. See [QA_MASTER_PROMPT.md](./QA_MASTER_PROMPT.md) for the full QA workflow and the canonical phase list. The `scripts/qa-runs/` directory contains the historical reports.

---

### 31. Why does my v8 endpoint return 404 with the flag set in .env?

This is the **bootstrap trap**, and it bites every new engineer at least once. The cause is that the feature-flag system reads `process.env` at service boot time, not on every request. If you change `FEATURE_FLAG_<NAME>=true` in the `.env` file but do not restart the affected service, the service is still running with the boot-time snapshot of the env, and the flag is still OFF as far as the running process is concerned. The route handler, which is gated by `flags.isEnabled('<NAME>')` at registration time, was never registered, so the URL returns 404 from the gateway.

The technical detail is that the v8 endpoints (and many other gated endpoints) are registered conditionally during service bootstrap: `if (flags.isEnabled('moveV2')) router.post('/move/compose', composeHandler)`. The `flags.isEnabled` call at this point reads the env, finds the flag is OFF, and the `router.post` line never executes. The route is never registered. The gateway, which proxies to the service, returns 404 because the service does not have the route. Restarting the service rerunes the bootstrap, the env is now correct, the route is registered, the gateway is happy.

The fix is: **restart the service** after changing any `.env`. The check is: `curl localhost:<port>/_routes` (every service has a debug route list endpoint) to see whether the route is registered. If the route is not in `_routes`, the service was started with the flag OFF. The longer-term fix is to make the flag a per-request check rather than a boot-time check, but the trade-off is that every request pays the flag-lookup cost, and we have decided the boot-time check is the right trade-off for the v3.6.0 architecture. See DEVOPS.md for the canonical bootstrap-trap writeup and the debugging steps.

---

### 32. What's the v3.5 to v3.6 migration path?

The migration is a sequence of schema additions, flag rollouts, and consent-default flips. **Schema additions** (v3.5 → v3.6.0): `FamilyBriefShare`, `SpotlightLedger`, `SpotlightAward`, `TrendQueue`, `UserMoveProfile`, plus indexes and columns on existing tables (the `Settings` row gains `moodInferenceEnabled`, `behavioralRankingEnabled`, `crossUserInferenceEnabled`, `algorithmicTransparency`, `dtmEnabled`, `familyBriefEnabled` columns; the `Profile` row gains `discoverable`, `voiceFingerprintData`). The migrations are in `services/shared/prisma/migrations/` and are applied in timestamp order. **Flag rollouts**: each v3.6.0 feature (Move v2, Voice Fingerprint, Family Brief, exposure ledger, anti-ghost) ships behind its own flag, rolls out over 4 weeks at 1%/5%/25%/100%, and is monitored at each step. **Consent-default flips**: the new consent toggles are all introduced with explicit defaults (OFF for mood, ON for behavioural, ON for cross-user, ON for transparency) and existing users see a one-time consent screen on next login that surfaces all four toggles for explicit choice.

The technical detail is that the migrations are applied in order by Prisma's migration system. The flag rollout is managed by the in-house flag system (Question 28). The consent-default flips are handled by a one-time backfill that runs on first login post-upgrade: the user's `Settings` row is updated with the v3.6.0 defaults, and a `ConsentEvent` is written for each consent. The consent screen is shown via a modal on the first authenticated request post-upgrade; the user must explicitly tap "Continue" before the new defaults are active. Users who dismiss without tapping are kept on the v3.5 defaults until they explicitly engage.

The product reasoning is that we wanted the migration to be (a) reversible at every step (the flags are the rollback lever), (b) consent-explicit (the consent screen makes the defaults visible to users), and (c) backwards-compatible (the v3.5 behaviour is the fallback for every new flag, so users who never engage with the consent screen continue to see the v3.5 experience). The migration ran from May 2026 to June 2026 with no incidents. The v3.6.0 release was tagged on June 15, 2026. The features that did not make v3.6.0 (Tenglish support, multi-region deployment, premium tier 2) are deferred to v3.7+.

---

### 33. Why aren't there `db push`-only models in production?

Because `db push` is the Prisma command that syncs the schema to the database without creating a migration file. It is fast, convenient, and dangerous: it does not produce a versioned migration, it does not run on a CI gate, and it is impossible to roll back deterministically. We use `db push` only in local development for rapid schema iteration, and we forbid it in any environment beyond local. The production CI gate checks that the database schema matches the latest migration file; if a column or index exists in the database but does not exist in a migration, the CI gate fails the build.

The technical detail is in the `scripts/check-schema-drift.mjs` script, which is run on every CI pass. The script connects to the staging database, runs `prisma migrate diff` between the current database and the latest migration, and asserts that the diff is empty. If the diff is non-empty, the build fails and the engineer must either (a) reset the database to match the migration, or (b) add a new migration that explains the drift. The script also runs against production weekly as an alarm; if production has drifted from the migrations, an incident is opened. We have had zero production drift incidents since the script was introduced.

The product reasoning is that schema changes are the most irreversible thing we do, and `db push` makes them reversible only by hand. The migration files in `services/shared/prisma/migrations/` are the audit trail of the schema. They are reviewable in PRs, runnable on staging before production, and rollback-able by writing a counter-migration. The `db push` flow does none of that. We forbid it in production as a matter of policy and we enforce it by CI gate. See the migration list and the convention in the canonical reference docs.

---

## Section D — India-specific

This section answers the questions that are specific to the Indian market context. Some of them — caste, gotra, language families — are unique to the Indian market and have no equivalent in the international apps. The answers reflect explicit product positions, not defaults that fell out of the implementation.

---

### 34. Why does Miamo have a caste field on the matrimonial profile?

The `MatrimonialProfile` table has a `caste` field as a column. The field is editable by the user from their own profile screen. The field is visible to the user on their own profile. The field is **not** read by any ranker, any filter, any algorithm in `services/shared/src/algo/`. There is an explicit unit test (`services/shared/src/algo/__tests__/caste-exclusion.test.ts`) that asserts the string `'caste'` does not appear in any V4, V6, V7, or V8 ranker code path. The test runs on every CI pass. If a developer ever accidentally adds caste as a filter or a weight, the test fails and the build fails. The Family Brief does not include caste. The bio-data card surfaces education, profession, family, kundli, preferences — but not caste.

The technical detail is that the field exists for cultural completeness — it would be conspicuous in its absence on an Indian matrimonial product, and Indian families do in practice ask about caste. Removing the field entirely would force users to lie or to leave the profile incomplete, neither of which serves them. The field is therefore allowed to exist as a piece of information the user has volunteered about themselves. But the field is not allowed to shape what they see in the app, because amplifying the existing pattern of caste-based matching would be antithetical to the product's bet on serious relationships across the demographic. See [PRODUCT §5.6](./PRODUCT.md#56-why-caste-is-in-the-schema-but-never-in-the-algorithm) for the full reasoning.

The product position can be criticised, and we acknowledge the criticism. Some users explicitly want caste-filtered matching. Some families explicitly require it. We have chosen to not provide the surface for it. The trade-off is real: users for whom caste-filtering is non-negotiable may use a different product (Shaadi.com, BharatMatrimony, and several others provide caste filters). The trade-off is the position. The position is documented, the position is tested, the position is enforced by CI gate. See [PRODUCT §6.5](./PRODUCT.md#65-no-caste-filtering) for the refusal-item.

---

### 35. What's gotra and how does Miamo handle it?

Gotra is, in Hindu Brahminical tradition, a patrilineal clan lineage traced to one of seven ancient sages (Saptarishi). It is one of the cultural markers that some families consult in marriage compatibility. Specifically, the convention is that a couple should not share the same gotra (sagotra), as that is considered a same-clan relationship; some traditions also avoid gotras of the maternal lineage. Outside of Brahminical tradition, gotra has analogous concepts in other castes and communities, sometimes called by different names. The relevance is real for some families and irrelevant for others.

Miamo's handling of gotra is the same as its handling of caste: the field exists on `MatrimonialProfile` (`gotra` column, optional, user-editable), the field is visible to the user, and the field is **not** read by any ranker, filter, or matching algorithm. The same `caste-exclusion.test.ts` unit test that asserts caste is excluded from the algorithm also asserts `'gotra'` is excluded. The Family Brief does not include gotra by default, but the user can opt to add it as a free-text "additional notes" field if they choose. Gotra is not surfaced in any search filter. Gotra is not used as a candidate-pool gate.

The product reasoning is the same as for caste, with one additional nuance: gotra is a more technical marker (it is a specific string, not a categorical claim about identity), and some users see it as a piece of genealogical information rather than a social-stratification marker. The position we have taken is that the algorithm should not differentiate either way; if a user cares about gotra, they can discuss it directly with a match in the chat surface, but the algorithm will not pre-filter on it. This is the most defensible position in a product that serves the full demographic of Indian twenty-somethings, some of whom are deeply traditional and some of whom are not.

---

### 36. How does Miamo work in Hinglish, Tanglish, and Banglish?

Miamo's composer and the Voice Fingerprint detect your language family from the last 20 messages you have sent and produce templates in the same family. The four supported families are: `en` (English), `hi_en` (Hinglish — Hindi romanized + English), `ta_en` (Tanglish — Tamil romanized + English), and `bn_en` (Banglish — Bengali romanized + English). The detection uses a char-trigram score against per-family romanization dictionaries; a confidence floor of 0.6 is required to commit to a non-English family, below which the composer falls back to English. The reason for the floor is that the misclassification cost (Hinglish template at an English speaker) is higher than the matching cost (English template at a Hinglish speaker); English is the no-regret fallback.

The technical detail is in `services/shared/src/algo/v8/moveV2/codeMix.ts`. Each language family has a dictionary of 1-2k romanized tokens (e.g. `yaar, bhai, accha, scene` for `hi_en`; `epdi, iruka, da` for `ta_en`; `khabor, bolish` for `bn_en`) that augment the standard `DICT_LOCAL` so common code-mixed tokens don't register as typos. The trigram score is computed character-by-character over the last 20 messages, weighted by recency. The output is a probability distribution over the four families; the family with the highest probability wins, subject to the 0.6 floor. Each family has 80 templates in the `hookLibrary.ts`, indexed by hook type (recent_post, profile_detail, callback, softer_open, tighter_open). The templates are written by hand, in the target language family, with the falsifiability requirement (the hook must reference a real, verifiable detail).

The product reasoning is that the international dating apps treat all non-English code-mixing as either "noise to ignore" or "input for a translation model that produces tone-deaf output." Indian users code-mix naturally, the code-mix carries social meaning (Hinglish in a chat is warmer than pure English; pure English in a chat is sometimes read as formal-distant), and a composer that respects the code-mix produces better drafts. The data: in the v3.6.0 cohort, Hinglish users who use Move v2 have a 28% higher first-reply rate than Hinglish users on the v3.5 composer. The Tanglish and Banglish numbers are smaller-N but directionally similar. Tenglish (Telugu) is not yet supported in v3.6.0 and is targeted for v3.7. Marathi-Hinglish is included under `hi_en` because the Devanagari-to-romanization overlap is high enough that the same dictionary covers most cases. See [ALGORITHMS §3.C.4](./ALGORITHMS.md#3c4-movev2codemixts--4-language-family-templates).

---

### 37. Why is DTM separate from Discover?

DTM and Discover are separate because the user is in a different mode in each of them. In Discover, the user is exploring — looking at many profiles, making fast decisions, in a session that may last 5 minutes or 50. The right product shape for that mode is a paginated feed with infinite scroll, fast tap targets, mood-aware reranking, and a low-friction message composer. In DTM, the user is evaluating — looking at one profile in depth, making a slow decision, in a session that may last a long evening or may stretch across multiple sessions (the bookmark / defer pattern is core to DTM). The right product shape for that mode is a single-card surface, a depth question, a family-brief share, and a slower-pace anti-ghost rule.

The technical separation is that DTM has its own ranker family (`algo/dtm.ts`, `algo/dtmV6.ts`, `algo/v7/dtmFeedV7.ts`), its own surface in the API (`/api/v1/dtm/*`), its own profile table (`MatrimonialProfile` rather than `Profile`), its own anti-ghost rule (2-minute deposit instead of 1), and its own feature flag for opt-in (`Settings.dtmEnabled`, default OFF). The candidate pool for DTM is different from Discover: DTM uses the matrimonial-profile-completeness gate (users with less than 0.5 coverage of the 16-topic vector are filtered out), the more-explicit-intent gate (DTM-enabled users only), and the slower-rotation gate (the same candidate cannot reappear in DTM for at least 7 days). The two sides share the same database, but they share almost nothing else.

The product reasoning is the foundational bet of Miamo: the casual and the serious modes are different products and deserve different surfaces. The existing apps have tried to be both at once (Hinge marketing itself as "designed to be deleted" while functionally being a swipe app; Shaadi adding chat features while being functionally a brokered-introduction service) and have produced products that are mediocre at both. The two-sided architecture is the bet that the same user wants both, at different times, and the product should let them switch without judgment. The DTM tab is hidden by default; users discover it from the onboarding flow or from a profile-level prompt ("looking for something serious? try DTM") that surfaces after 14 days of Discover use. See [PRODUCT §5](./PRODUCT.md#5-the-deep-compat-side--dtm-family-brief-the-matrimonial-layer) for the full framing.

---

## Section E — Closing

### Where to ask more questions

The questions in this document are the ones we get most often. There are others we get rarely. For those, the channels are: **users** should email `support@miamo.app` or use the in-app help surface (Settings → Help & Feedback); **journalists** should email `press@miamo.app`; **regulators** should email `compliance@miamo.app`; **engineers and security researchers** should email `security@miamo.app` for vulnerability disclosures (we have a coordinated-disclosure policy in [SECURITY §15](./SECURITY.md)). The grievance redressal officer (DPDP-mandated) is reachable at `grievance@miamo.app` with a 30-day SLA on response.

For technical questions about the codebase that are not answered here, the canonical sources are: [ARCHITECTURE.md](./ARCHITECTURE.md) for the service topology, [DATA_MODEL.md](./DATA_MODEL.md) for the Prisma schema, [ALGORITHMS.md](./ALGORITHMS.md) for every ranker, [TRACKING.md](./TRACKING.md) for the event pipeline, [SECURITY.md](./SECURITY.md) for the privacy and crypto stack, [API.md](./API.md) for the REST surface, [FRONTEND.md](./FRONTEND.md) for the Next.js layer, [DEVOPS.md](./DEVOPS.md) for the deployment stack, and [RUNBOOK.md](./RUNBOOK.md) for the on-call playbook. The internal knowledge base at the canonical reference docs is the comprehensive cross-reference for everything in the codebase, and is the document we point new engineers at on day one.

If a question is genuinely missing from this FAQ and would be useful to others, please open a PR adding it. The PR should add the question to the table of contents, add the question to the appropriate section (Product, Privacy, Technical, or India-specific), write the answer in the same 2-to-3-paragraph format (first paragraph plain English, second and third paragraphs technical and product reasoning), and link to the canonical source documents. The PR will be reviewed against the same standard as the existing questions: plain-English accessibility, technical accuracy, explicit position-taking where the answer involves a trade-off.

### License

This document is part of the Miamo monorepo and is released under the same license as the rest of the codebase. See [LICENSE.md](./LICENSE.md) at the monorepo root for the full text. The short version: source-available, non-commercial use permitted with attribution, commercial use requires a separate license from Miamo.

---

## Appendix A — Additional questions

The following questions are asked less frequently but come up often enough that we have included them in this appendix. They follow the same format as the main sections: plain English first, technical and product reasoning after.

---

### 38. How do I report a user?

Tap the three-dot menu in any profile or chat. The bottom-sheet that opens has a Report option. Tap it. Pick a category: harassment, fake profile, inappropriate content, spam, underage, or other. Add an optional free-text note (max 500 characters). Tap Submit. The report writes a `Report` row to the database with your `userId`, the target `userId`, the category, the note, and the timestamp. The report enters the safety queue and is reviewed within 24 hours. You do not need to do anything else. You are not told the outcome of the review by default (we do not want to create a feedback loop where reporters fine-tune their reports for desired outcomes); you can request a status update via the support channel if it has been more than 72 hours.

The technical mechanism is the safety pipeline in `services/social/src/server.ts`. The report is logged, the target's `SafetyAgg` row is incremented, and the report is enqueued for human review. Reviewers — currently the founding team, soon a dedicated safety team — see the queue in an internal tool with the report context (the chat history, if applicable, decrypted just-in-time for the review and re-encrypted after, with the read logged to the audit table) and the reporter's history. The reviewer can dismiss, warn, suspend, or ban. Each action writes to `AuditLog` with the reviewer's identity and the rationale. A ban triggers the RTBF lever for the banned user, with the encryption keys for their chats burnt and their profile hard-deleted; the report record itself is retained for 24 months as part of the audit trail.

The product reasoning is that safety reporting is the highest-trust action a user can take, and the response time on it sets the ceiling for how safe the platform feels. The 24-hour SLA is aggressive for our team size but non-negotiable; the bet is that fast response on real safety issues is worth slower response on lower-priority work. The product position is that we trust reports by default — we err on the side of the reporter, especially in cases involving harassment, with the suspension applied first and the appeal process available to the suspended user afterwards. This is the inverse of the position taken by larger platforms (which often defer suspension pending review) and reflects the small-scale, high-trust nature of the platform in 2026.

---

### 39. What happens when I unmatch someone?

When you unmatch, the `Match` row's `state` field is updated to `unmatched`, the chat is closed (no new messages can be sent), and the chat history is archived. The other person sees the chat disappear from their list with no notification. They are not told you unmatched them; they only see the chat is gone. The unmatched person cannot start a new chat with you, cannot see your profile, and is removed from your Discover candidate pool permanently (not for 30 days like a pass — permanently). The unmatch is irreversible from the UI; if you want to re-engage with that person, you would need to re-encounter them organically, which the platform makes deliberately hard.

The technical mechanism is the unmatch handler in `services/matchmaking/src/server.ts`. It writes the state change to the `Match` row, closes the `Chat` row's `state` to `archived`, sets the `unmatchedAt` timestamp, and writes the userId pair to the `Block` table (a soft block that excludes them from each other's candidate pools without the explicit "block" action). The chat history is retained — the encrypted messages stay in the `Message` table — but is inaccessible from the UI for both parties. The retention is 90 days, after which the messages are hard-deleted and the encryption keys are kept until the next key-rotation cycle. The retention exists for safety review purposes (if either user reports the other within the 90-day window, the safety team can decrypt the chat for review).

The product reasoning is that unmatch is the exit door from a matched conversation, and we wanted the exit to be clean. The clean exit means: no notification (so the unmatched person is not actively informed of the rejection, which is socially painful and not informative), no re-encounter (so a passed-over relationship does not re-surface and re-trigger the same decision), no recoverable history (so the unmatched conversation does not become a stalking surface). The trade-off is that legitimate "I unmatched by accident" cases are unrecoverable; we have decided this is the correct trade-off, because the abuse case (unmatch, re-match, unmatch, repeat as a low-grade harassment pattern) is worse than the accident case.

---

### 40. Can I export my data?

Yes. Go to Settings → Account → Export Data. The export job is queued and processed within 7 days (in practice within 24 hours for most users). The export is a ZIP file containing: a JSON dump of your profile (`profile.json`), your matrimonial profile if you have one (`matrimonial.json`), your settings (`settings.json`), your messages in plaintext (`messages.json` — note: in plaintext, because you have authenticated and proven you are the data subject), your matches and likes (`matches.json`, `likes.json`), your Spotlight ledger (`spotlight.json`), and your photos (each as a separate file under `photos/`). The ZIP is delivered as a one-time download link via email, with a 48-hour TTL. After 48 hours the link is dead and the ZIP is deleted from the server.

The technical mechanism is the data-export worker (`services/users/src/exportWorker.ts`). It runs on the Redis stream, picks up export requests, decrypts the chat messages for the requesting user (which requires the master encryption key and the user's authentication — both are available because the worker runs in the production environment with the user's authenticated session token), assembles the ZIP, uploads it to the export bucket, and emails the user a signed URL. The signed URL has a 48-hour TTL and is keyed to the user's email; clicking the link without being signed in to the same email triggers a re-auth flow. The ZIP file on the server is deleted after 48 hours by a cleanup job, regardless of whether it was downloaded.

The product reasoning is that data portability is a GDPR right (Article 20) and a DPDP right, and we wanted the export to be (a) self-service (no support ticket), (b) comprehensive (everything we have about you), and (c) plaintext (the encrypted forms are unusable to the user; we decrypt for export). The 7-day SLA is the regulatory ceiling; we aim for 24 hours and have always hit it. The 48-hour link TTL is the trade-off between giving the user time to download and not leaving the export sitting on the server indefinitely. The export does not include audit-log entries (which contain other users' identifiers) or the keys themselves (which would compromise security for no benefit). The export does include chat messages from the user's perspective — both the messages they sent and the messages they received — because both are reasonably part of "the user's data" under any sensible reading of the portability right.

---

### 41. What happens if Miamo gets bought or shuts down?

If Miamo is acquired, the acquiring entity inherits the consent commitments described in this document and in [SECURITY.md](./SECURITY.md). Any change to the consent posture — including a change to the data-sharing position, the "no advertising" position, or the "no caste filtering" position — would require explicit user re-consent before the change takes effect. The Privacy Policy is the binding document for this commitment; the FAQ and the SECURITY document are the explanatory materials. If a user does not consent to a post-acquisition change, the user has the right to delete their account with full data erasure, the same right described in Question 19. The acquisition would be disclosed to users at least 30 days in advance via in-app notification and email.

If Miamo shuts down, the data is destroyed within 90 days of the shutdown announcement. The shutdown sequence is: (1) announce shutdown via in-app banner and email, with a 90-day notice period; (2) disable new sign-ups immediately; (3) keep the app functional for the 90-day window so users can export their data; (4) at day 90, run the bulk-deletion job that hard-deletes every user record, burns every encryption key, and rotates every secret in the production environment; (5) audit the destruction by an independent reviewer; (6) take the infrastructure offline; (7) publish a post-mortem that describes the shutdown reason and the destruction process. The shutdown protocol is documented in `docs/legal/shutdown-protocol.md` (internal) and is a public commitment via the Privacy Policy.

The product reasoning is that the trust we ask of users — to share their dating preferences, their depth-question answers, their family details, their chat history — is large. We owe them an explicit commitment that the trust does not lapse if the company changes hands or ceases to exist. The commitment is the strongest one we can make: explicit re-consent on acquisition (so the user can leave if they do not trust the acquirer), full erasure on shutdown (so the data does not sit in a defunct database waiting for a breach). The commitment is in the Privacy Policy because that is the document with legal force; it is in this FAQ because users ask about it; it is in our heads because the founding team will not start something we are not prepared to end correctly.

---

### 42. Why is the app only available in India?

The app is currently available only in India (and select markets with significant Indian diaspora — UAE, Singapore, parts of the US and UK via opt-in). The reason is that the product is built for the Indian market context: the DTM tab, the Family Brief, the language family support (Hinglish, Tanglish, Banglish), the festival hooks in the ranker (`festivalHooks.ts`), the matrimonial-profile schema. None of these have analogues in non-Indian markets. Launching in markets that do not need them would dilute the product without serving the target user. The international expansion plan, if we have one, would build market-specific surfaces rather than translate the Indian-context surfaces into other languages.

The technical mechanism for the market restriction is geo-fencing at the app store level (the app is only listed in the relevant App Store and Play Store regions) and at the sign-up flow (we require a phone number, and the phone number's country code is checked against an allowed-country list). Users who try to sign up from outside the allowed countries see a message: "Miamo is currently available in India and select international markets with Indian diaspora. Add yourself to the waitlist for your region." The waitlist is collected via email and is used to inform expansion priorities. The current waitlist (June 2026) is largest in Australia, Canada, and Saudi Arabia.

The product reasoning is that we are two engineers serving 12,000 daily-active users in one market, and adding markets adds complexity that costs more than it generates. The market context for Indian users is rich, specific, and fully addressable with the product we have built. The market context for users in (say) Australia is different enough that a port of the product would be either tone-deaf or rebuilt. We have chosen to do the rich, specific, fully-addressed Indian product well rather than the half-addressed multi-market product poorly. Expansion will happen, but it will happen by building market-specific products under the same brand, not by translating the Indian product.

---

### 43. What's the difference between Like, Match, and Move?

Three distinct interactions with three distinct meanings. **Like** is a one-tap action that says "I would like to talk to this person." It is recorded as a `Like` row. The other person is not notified directly, but their `Like` queue (if they have premium, which surfaces who has liked them) shows your like. **Match** happens when two users have liked each other, or when a match request is accepted. A `Match` row is written, a `Chat` row is created (empty), and both users are notified. The chat is the surface for ongoing conversation. **Move** is a Move-suggested first message — the composer's draft, sent into a newly-matched chat. The Move is recorded as a `MiamoMove` row distinct from the regular `Message` row, because we want to track Move-vs-organic separately for analytics and for the anti-ghost system.

The technical detail is that the three are first-class entities in the schema (`Like`, `Match`, `MiamoMove`), each with their own table, their own ranker-relevance, and their own user-visible counters. The `Like` table is append-only (likes are not unwound; pass instead). The `Match` table has a `state` field that tracks the lifecycle (pending → matched → unmatched). The `MiamoMove` table is the audit log of every Move that was composed and sent (or composed and dismissed without sending), with the `composerVersion`, the `hookCategory`, and the `wasSent` flag — used for downstream analysis of which hooks produce the best replies.

The product reasoning for the three-entity model is that each interaction has a different cost and a different signal. A Like is cheap (one tap) and a noisy signal (people like a lot of profiles, sometimes carelessly). A Match is the start of a real interaction and a strong signal. A Move is the first message composition, which is the highest-leverage moment of the interaction (the quality of the first message determines whether the second message ever happens). We instrument all three separately so the algorithm and the analytics can reason about them separately. Collapsing them into a single "engagement" metric would lose the signal that matters most — that the first reply rate (a Move outcome) is the metric we are actually optimising for.

---

### 44. Why do some profiles have a small green dot?

The green dot is the "active now" indicator. It appears on profiles where the user has been active in the app in the last 5 minutes. Active means: the app is in the foreground on their device, or they have sent a message in the last 5 minutes, or they have interacted with a profile in the last 5 minutes. The dot is a real-time signal — it updates every 30 seconds across all visible profiles in your feed. The dot is used by the `active.ts` ranker as one of its signals, with a small weight; profiles with the dot are slightly boosted in the feed if your own intent vector reads as "looking to chat right now."

The technical mechanism is the `lastSeenAt` field on the `User` table, which is updated on every authenticated request to the gateway. The frontend polls the `/api/v1/users/active-status` endpoint every 30 seconds with the list of visible profile IDs and gets back a boolean array for the green dots. The 5-minute window is the trade-off between accuracy (a shorter window would have more flicker) and freshness (a longer window would make "active" mean "active sometime today"). The dot is a binary state in the UI but the underlying timestamp is precise; rankers that use the signal use the actual timestamp, not the binary.

The product reasoning is that the active-now signal is the single strongest predictor of first-reply-within-5-minutes, which is the metric the `active.ts` ranker is optimising for. Users who message an active-now profile have a 3-4x higher chance of getting a reply within the same session. The dot makes the signal visible to the user so they can choose to engage with active profiles when they want a same-session conversation. The dot is hide-able via a privacy setting (`PrivacySettings.showOnlineStatus`, default ON for receiving, with a per-user toggle to opt out of being seen as active by others); some users prefer to scroll without being seen, and the toggle respects that.

---

### 45. Why don't I see any read receipts?

Read receipts are premium-only. Free users do not see whether the other party has read their message, and the other party does not see whether they have read the free user's message. The position is symmetric: free users do not get read receipts on their own messages, and they do not produce read receipts on others' messages. Premium users see read receipts on their own messages (when the recipient reads, a small check appears) and produce read receipts to other premium users (free users still do not see them, even if the premium user has read). The asymmetry is intentional — premium is for the premium pair, and free users are not exposed to the read-receipt dynamic at all.

The technical mechanism is the `Message.readAt` field, which is set when the recipient opens the chat with the message visible. The frontend GETs `/api/v1/messaging/chats/:chatId/read` on chat open, which updates the field for all unread messages in the chat. The receipt is delivered to the sender via the WebSocket message-update channel. The visibility logic — whether the sender sees the receipt — is enforced server-side: the WebSocket only emits the read-update event to clients whose user is premium and whose user is the sender. Free clients do not receive the event.

The product reasoning is that read receipts are a feature that produces both more engagement (premium users like seeing them) and more anxiety (users without them feel the absence). We wanted the premium experience to feel meaningfully different and the free experience to be unburdened by the read-receipt anxiety. The premium tier (Question 14) is the polish tier; read receipts are part of the polish. Some users have asked for the symmetric option (turn off receipts as a premium user, see them as a free user); we have not built it because the matrix of options gets confusing fast and the use case is narrow.

---

### 46. What's a vibe vector?

The vibe vector is a 7-dimensional normalised vector that captures a user's stated personality / preference signature. The dimensions are: creative, adventurous, thoughtful, social, ambitious, grounded, curious. The vector is set from the user's answers to the 12 onboarding questions (the `VibeCheck` table) and is refined over time by behavioural data — which kinds of profiles you engage with, which kinds of posts you react to in Creativity, which kinds of depth questions you answer in DTM. The vector is L2-normalised so the sum of squares is 1.0. The vector is read by every ranker that uses `vibeVectorFit` as an ingredient (every Discover ranker, the DTM matcher, the Move composer's tone selection).

The technical mechanism is the `vibeVector` field on the `Profile` table (a 7-float array, JSON-encoded for storage). The onboarding answers map to vector dimensions via a fixed coefficient table (e.g. "ideal Sunday: building something new" maps to creative +0.7, ambitious +0.4, grounded +0.2). The behavioural refinement runs in the `dtmFeedV7.ts` and the `learner.ts` modules, which apply small adjustments to the vector based on the per-week observed engagement pattern, with an L1 cap on the per-week delta to prevent the vector from drifting away from the onboarding-stated values too quickly. The cosine similarity between two users' vibe vectors is one of the ingredients in the Discover ranker, weighted at 0.31 in `forYouV6.ts`.

The product reasoning is that the vibe vector is the closest thing Miamo has to a "personality test" output, and it is intentionally lightweight (7 dimensions, derived from 12 questions, refined by behaviour) rather than heavyweight (Big Five, MBTI, attachment style). The lightweight construction is deliberate: heavy personality tests have poor test-retest reliability, poor cross-cultural validity, and produce more friction in onboarding than they justify in matching quality. The 7 dimensions were chosen by reviewing 200 onboarding sessions and clustering the answer patterns; the clusters defined the dimensions. The vector is human-readable in the Why-am-I-seeing-this surface ("you both score high on the curious-explorer vibe"), which is part of the transparency commitment.

---

### 47. Why am I getting fewer matches than I used to?

Several possible reasons, and the answer depends on your specific situation. The most common: (a) the algorithm has updated, and your ranker has shifted to one that weights your profile differently; (b) the geo cohort has changed (the candidate pool in your area has grown or shrunk); (c) your behavioural signal has shifted (you have started passing more, which the ranker reads as you being more selective, which narrows the pool); (d) you are in a quieter season (festival weeks have surge dynamics, exam weeks have crash dynamics); (e) your photos or profile have changed, and the new version performs differently. The Why-am-I-seeing-this surface (Question 16) can help you diagnose by showing what ingredients are driving your current feed.

The technical detail is in the `multiObjective.ts` reranker, which combines relevance, fairness, earned visibility, recency, and intent into the final score. A drop in matches usually shows up as a drop in one of these axes. The diagnostic flow is: open the audit endpoint at `/api/v1/users/me/match-trend` (premium-only), which returns the per-week match count for the last 12 weeks, broken down by candidate-pool-size, your-like-rate, and reciprocal-like-rate. If candidate-pool-size has dropped, the cause is geo or cohort. If your-like-rate has dropped, the cause is you are passing more. If reciprocal-like-rate has dropped, the cause is your profile is performing worse than before. The flow gives you three actionable signals.

The product reasoning is that match counts fluctuate, and the fluctuation is most useful when it is decomposable into causes the user can act on. The decomposition into three axes is the actionable layer. We have deliberately not built a "boost your visibility" button as a remedy for low matches; the remedy is to fix the underlying cause (engage more, improve photos, expand the filter, try the DTM side, etc.). The Spotlight-ledger system rewards behaviour that the algorithm reads as quality; a user with low matches and low ledger balance should focus on the behaviour, not on a paid override.

---

### 48. What's the chronotype prior?

The chronotype prior is the time-of-day fingerprint of a user's app usage. It is a 24-element vector with one entry per hour, normalised so the sum is 1.0. The vector is set from a single onboarding question ("when do you naturally feel most alive?") with four options that map to four typical chronotypes (morning, midday, evening, night). After 7 days of `session.start` events, the prior is overwritten by the actual behavioural data, with the onboarding-stated prior used only as the cold-start anchor. The chronotype is read by the `notifyTiming.ts` ranker to determine when to push notifications and by the Weekly Top-10 worker to determine when to deliver the Sunday-morning notification.

The technical mechanism is in `services/shared/src/algo/notifyTiming.ts`. The chronotype vector is stored on the `Profile` table (`chronotype` field, JSON-encoded 24-element float array). The behavioural update runs nightly in the tracking-worker, which aggregates the user's `session.start` events from the last 30 days into a 24-bucket histogram, smooths it with a 3-hour kernel, normalises, and writes it back. The cold-start anchor (the onboarding-stated answer) is blended in with weight 0.3 for the first 7 days, dropping to 0 thereafter. The Weekly Top-10 notification is delivered at the user's peak-active hour on Sunday, with a fallback to 9am if the chronotype is bimodal or flat.

The product reasoning is that notifications are the most-frequently-cited reason users disable an app on their phone, and getting notification timing right is high-leverage. The chronotype prior is the lightweight way to get it mostly right: each user has a stable activity rhythm, the rhythm is reasonably stationary over 30-day windows, and pushing at the user's peak-active hour has 2-3x the open rate of pushing at a fixed global hour. The prior is also used by the DTM topic mask (light topics at off-peak hours, heavy topics at peak hours) and by the anti-ghost timer (the 72-hour window is measured in wall-clock time, not chronotype-adjusted, but the reminder notification fires at the recipient's peak-active hour within the window).

---

### 49. What's the difference between Discover and Creativity?

Discover is the dating feed — profiles ranked for romantic-interest match. Creativity is a content feed — posts, videos, stories from other Miamo users that you can react to. They share the same user accounts but are separate surfaces with separate rankers, separate UI, and separate purposes. Creativity is the "soft entry" to a profile: you can react to someone's Creativity post, and if they like your reaction, they may surface in your Discover feed via the `cf.ts` collaborative-filter ranker. Creativity is also the "warm-up" surface for users who are not yet ready to be on the dating side — some users browse Creativity for weeks before they engage with Discover, and the algorithm uses their Creativity engagement to seed their Discover ranking.

The technical mechanism is the Creativity stack in `services/content/src/creativity-spotlight.ts` and `services/shared/src/creativity-track.ts`. Creativity posts are stored in `CreativityItem` with a category (the `CreativityCategory` table), reactions in `CreativityReaction`, comments in `CreativityComment`, saves in `CreativitySave`. The Creativity ranker (`feedAugment.ts`, `postImpressionRerank.ts`) is separate from the Discover ranker but reads many of the same signals (vibe vector fit, intent vector, polarity). The cross-pollination is via the `cf.ts` ranker, which reads Creativity reactions as a signal for Discover ranking — if user A reacts to user B's Creativity post, that is a small positive signal for surfacing B in A's Discover feed.

The product reasoning is that the dating-app industry has converged on "swipe a profile, no other surface" and the result is a product with no warm-up state. Users who are not yet ready to commit to a swipe are forced to either swipe or leave. Miamo's Creativity surface is the warm-up state — a place to be present without committing, to learn the other users' voices, to engage with the platform softly. The product hypothesis is that this warm-up surface produces better downstream matches (users who engage with Creativity for two weeks before swiping have higher 30-day match retention than users who skip Creativity), and the early data supports the hypothesis. Creativity is also the surface where Spotlight credits accrue at the highest rate per action, because the algorithm reads Creativity engagement as the strongest signal of platform investment.

---

### 50. Why is there no "swipe" gesture?

The Miamo Discover surface is a card-stack, but the primary input is a button tap (Like / Pass / Save), not a swipe. The decision was deliberate. The swipe-as-primary-input pattern (Tinder, Bumble) was tested in early prototypes and produced significantly faster decision-making than the button-tap pattern — but faster decision-making is exactly what we wanted to avoid. The bet is that Miamo's match quality depends on users taking a few seconds longer per profile to read the bio and look at the second photo, and the swipe gesture makes that pause functionally impossible. The buttons require a deliberate tap, which is just enough friction to encourage a one-extra-second look.

The technical mechanism is the React component for the profile card (`services/web/src/app/(main)/discover/page.tsx`), which renders Like / Pass / Save buttons below the card and binds them to the actions. There is no swipe gesture handler. The card-stack visual pattern is preserved (the next card peeks out from below, the current card sits on top, the deck shuffles as you act) but the input is buttons. The frontend test suite includes an assertion that the swipe handler is not registered on the card, which fails the build if a developer ever adds one. The decision is enforced by the same kind of CI gate that enforces the caste-exclusion test.

The product reasoning is that the swipe gesture is the canonical Tinder pattern and would have been the default if we had built without thinking. Building deliberately meant choosing the input pattern that aligned with the product's goals. The goal is slower, more deliberate matching with higher reply rates; the swipe optimises for the opposite. The user-research data backed this up: in A/B test, the swipe variant produced 1.8x the swipes-per-session but 0.6x the first-reply rate, which is a net negative for the metrics we care about. The buttons stayed. The card-stack stayed (because the visual metaphor is good even without the swipe gesture). The decision is one of the small-but-real ways the product takes a position different from the industry default.

---

### 51. What's the right-now intent signal?

Right-now intent is a 7-class classification of what the user is doing in the current session: `casual_browsing`, `active_search`, `serious_search`, `chat_focus`, `polarity_negative`, `polarity_curious`, `polarity_committed`. The classifier (`intentRightNow.ts`) reads the last 30 minutes of user activity — scroll velocity, decision speed, profile depth (how far into the bio they scroll), tap pattern — and emits a probability distribution over the 7 classes. The class with the highest probability is used by the Discover ranker as the `intentRightNowFit` ingredient (weight 0.18 in `forYouV6.ts`). The class is also surfaced (when transparency is on) as part of the Why-am-I-seeing-this explanation.

The technical mechanism is a worker that runs every 5 minutes per active user (`intentInference.ts`), reads the per-user session aggregates from Redis, computes the feature vector, runs it through a small logistic-regression classifier (the model is committed to the repo and re-trained quarterly), and writes the result back to a Redis cache with a 5-minute TTL. The ranker reads the cache on each feed request; on cache miss, the ranker falls back to a per-user prior derived from the user's last 7 days. The classifier outputs a distribution, not a hard class, so the ranker can use the per-class probabilities as soft weights rather than a single-class binary.

The product reasoning is that the user's intent shifts within a session — the same user can be in `casual_browsing` mode at the start of a session and in `polarity_negative` mode after passing 5 profiles in a row, and the algorithm should adapt. The right-now intent signal is the adaptation lever. The `polarity_negative` class triggers the `postImpressionRerank.ts` cool-off mode, which slows the feed and offers different kinds of profiles to break the negative-pattern feedback loop. The `serious_search` class is the DTM cross-surface trigger — users in this mode see a soft prompt to try the DTM side. The intent signal is one of the surfaces that makes the app "feel different at night" (Question 4) — the night-mode rerank is partly mood-driven and partly intent-driven.

---

### 52. How does Miamo's safety team handle harassment reports?

Harassment reports are the highest-priority category in the safety queue and are reviewed within 4 hours of submission (more aggressive than the standard 24-hour SLA). The flow is: user submits the report (Question 38), the report is tagged `harassment` with one of four sub-categories (sexual harassment, threats, hate speech, repeated unwanted contact), the report enters the priority queue, a reviewer (currently a founder, soon a dedicated safety lead) opens the queue and reviews the report with the relevant chat history (decrypted just-in-time and re-encrypted after, with the read logged), and a decision is made: dismiss (rare for harassment), warn (issue a written warning to the reported user), suspend (24-hour, 7-day, or 30-day suspension), or ban (permanent removal with the RTBF lever applied).

The technical mechanism is the priority queue in the safety service (`services/social/src/server.ts`), which is a Redis ZSET keyed by report-priority and report-timestamp. Harassment reports are scored at priority 100 (highest); spam reports are scored at priority 10. The reviewer pulls the highest-priority oldest-first item, the action is applied via the moderation API, and the audit log captures the reviewer's identity, the action, the rationale, and the affected users. The reported user receives a notification if the action is a warning or suspension (with the rationale and the duration); the reporter is notified that "action was taken" without specifying what.

The product reasoning is that harassment is the failure mode that kills dating platforms for the affected user, and the response time is the primary trust signal. The 4-hour SLA is aggressive for a two-engineer team but non-negotiable. The position is that we err strongly on the side of the reporter in harassment cases — a borderline report is more likely to result in a warning than a dismissal, and a clear harassment report is more likely to result in a suspension than a warning. The position can be criticised as overcorrection, and we have had appeals from suspended users that we have reviewed; we have also chosen to retain the bias toward the reporter because the asymmetric harm (a wrongful suspension is recoverable; an unaddressed harassment is not) makes the bias correct. The safety review process is documented in detail in [SECURITY §9.3](./SECURITY.md#93-what-is-not-in-owasp-top-10-that-we-still-care-about).

---

### 53. What's the polarity loop?

The polarity loop is the dynamic where a user enters a negative mood, starts passing aggressively, the algorithm reads the passes as preference signals, the algorithm narrows the candidate pool to reflect the inferred preferences, the narrower pool feels less interesting, the user passes more, the loop tightens. Without intervention, the loop can collapse the feed into "nothing interests me" in a single session, and the user closes the app frustrated. Miamo's intervention is the `polarity.ts` ranker, which detects the polarity state (positive interest vs hate-scroll) and overrides the normal preference-update logic when the user is in a hate-scroll state. Passes during hate-scroll are not used as preference signals; the algorithm holds the previous preference vector and waits for the polarity to shift back.

The technical mechanism is in `services/shared/src/algo/v8/polarity.ts`. The polarity score is computed from the last 5 decisions: 5 passes in a row scores -1.0 (full hate-scroll), 3 likes in a row scores +1.0 (full positive interest), mixed patterns score in between. When the score is below -0.5, the polarity is `hate_scroll`, and the `postImpressionRerank.ts` reranker activates the cool-off mode: it surfaces a different cohort (different geo, different vibe-vector cluster) and slows the feed. The polarity score is also written to the audit log so we can analyse the loop dynamics post-hoc. The cool-off mode is gated by the same `behavioralRanking` consent flag; users who have turned off behavioural ranking do not get the cool-off and do see the full polarity loop, which is the trade-off they have chosen.

The product reasoning is that the polarity loop is the single most-common cause of session-end frustration, and the algorithm has the data to detect and intervene. The intervention is gentle (the feed shifts, the pace slows; there is no popup, no "are you ok?" prompt) because the user does not want to be told they are in a bad mood; they want the app to feel less bad. The cool-off mode produces a 22% session-extension rate vs the no-intervention baseline, which translates into 11% higher next-day return rate, which translates into 6% higher 30-day retention. The polarity loop is one of the strongest examples of "the algorithm earning its keep by being humane." See [ALGORITHMS §3.A.3](./ALGORITHMS.md#3a3-polarityts--positive-interest-vs-hate-scroll) and [PRODUCT §4.12](./PRODUCT.md#412-the-polarity-loop--the-friday-hate-scroll).

---

### 54. What's depth of engagement?

Depth of engagement is the signal that distinguishes an accidental tap from a deliberate inspection. When you tap a profile, the algorithm records: how long you stayed on the card, how far you scrolled into the bio, whether you tapped to enlarge a photo, whether you opened the "see more" expandable sections, whether you read the responses to prompts. A profile you spent 1.5 seconds on (a likely accidental tap or a no-go-at-a-glance) is treated very differently from a profile you spent 25 seconds on with two photo-tap-enlargements and a "see more" expansion (a deliberate inspection). The depth signal is the second-strongest behavioural signal after the like / pass decision itself.

The technical mechanism is the `depthOfEngagement.ts` ranker-input, which aggregates the per-profile telemetry from the frontend into a 4-feature vector: dwell time, scroll depth, photo interactions, expansion interactions. The vector is normalised against the user's per-session baseline (a user who is generally fast-scrolling has a different baseline than a user who is generally slow-reading), so the depth signal is relative-within-user rather than absolute. The signal is read by every Discover ranker as one of the ingredients in the `affinityFit` score, with a weight of 0.14 in `forYouV6.ts`. The signal is also used by the `learner.ts` module to update the user's per-feature weight profile — depth on photos means the photos matter more than the bio for this user, and the ranker weights are adjusted accordingly.

The product reasoning is that the like / pass decision is too noisy on its own (people pass for many reasons, some of which are not preference) and the depth signal is the disambiguator. A user who passes a profile after 25 seconds of deliberate inspection is telling the algorithm something different from a user who passes after 1.5 seconds. The 25-second pass is a clear "I considered and rejected" signal, which the algorithm should use to update preferences strongly. The 1.5-second pass is a "didn't catch my eye at a glance" signal, which is much weaker and should not update preferences as strongly. Treating both equally — which is what the industry-standard Tinder-style swipe model does — loses signal. The depth-aware reranker recaptures the signal. See [ALGORITHMS §3.A.4](./ALGORITHMS.md#3a4-depthofengagementts--accidental-click-vs-full-inspection).

---

### 55. What is the festival hook?

The festival hook is a small per-region booster in the Discover ranker that surfaces a user's festival-context activity during the relevant festival period. During Diwali, users who have posted Diwali-themed Creativity content or whose profile bio references Diwali get a small boost in the feed for users in the same region. The boost is small (~0.05 weight, applied multiplicatively to the standard score), short-lived (active for the festival week only), and regionally scoped (Diwali boost for North Indian users, Onam boost for Kerala users, Pongal boost for Tamil Nadu users, Durga Puja boost for Bengali users, etc.). The boost is opt-in at the festival level — users can disable festival hooks entirely via Settings → Personalization & Privacy → "Festival boosts" (default ON).

The technical mechanism is in `services/shared/src/algo/v8/festivalHooks.ts`. The module reads a static festival-calendar JSON (regional festival dates, durations, scope) and a per-festival keyword list (Diwali: ["diwali", "deepavali", "rangoli", "diya", "lakshmi puja"]; Onam: ["onam", "pookalam", "sadya"]; etc.). On feed request, the ranker checks if the current date falls within any festival window for the user's region, and if so, computes a per-candidate festival-relevance score from the candidate's profile and recent Creativity content. The score is applied as a multiplicative boost on the standard ranker output. The keyword lists are curated by hand, reviewed annually before each festival season.

The product reasoning is that festivals are a real, lived part of the Indian-market user experience and the existing dating apps ignore them entirely. A user who has just spent the day at a Diwali family gathering and opens the app at 11pm is in a different headspace from the same user on a regular Wednesday — they are more nostalgic, more community-oriented, more open to family-aware conversation. The festival hook is the small lever that surfaces profiles aligned with that headspace. The boost is small because we did not want to dominate the ranker with the festival signal; the boost is regional because Diwali matters more to a Delhi user than to a Kerala user; the boost is opt-out because not every user wants festival-themed matching. The festival hook is the kind of small India-specific feature that the international apps would not build because their market does not need it, and that the matrimony apps build heavyweight because their market is more transactional. See [ALGORITHMS §3.B.5](./ALGORITHMS.md#3b5-festivalhooksts--regional-festival-booster).

---

### 56. Can I have multiple accounts?

No. One person, one account. The position is enforced by phone-number uniqueness (each phone number can have only one account in active state), by device-fingerprint matching (we detect when the same device tries to register a second account and reject), and by the safety review (if a user is suspected of having multiple accounts, the safety team can investigate and merge or remove the duplicates). The reason is that multiple accounts is the primary vector for harassment (the suspended user opens a new account and continues), for fraud (the scammer maintains parallel personas), and for catfishing (the same person presents differently on different accounts to different victims). The one-account policy is the floor.

The technical mechanism is multi-layered. The phone-number uniqueness is a UNIQUE constraint on the `User.phoneHash` column. The device-fingerprint matching is via the `TrustedDevice` table — when a new account registration happens, the device fingerprint is compared to the fingerprints of all active accounts, and a high-similarity match (above a threshold) flags the registration for safety review. The safety review is human-in-the-loop. The OAuth path (sign in with Google) is also constrained: each Google identity can be linked to only one Miamo account, with the unique constraint enforced at the `User.googleId` column.

The product reasoning is that the abuse case for multiple accounts is high-cost and the legitimate-use case is low-cost. The legitimate use case is "I want a fresh start" — the answer is to delete the existing account (Question 19) and create a new one, which the platform supports. The legitimate use case is not "I want two simultaneous personas" — that is the abuse pattern, and we refuse to enable it. The platform's safety guarantee depends on the one-account policy, and we have decided the trade-off (some users with two phones who would have made two accounts cannot do so) is worth the safety floor.

---

### 57. How does Miamo handle minors?

Users under 18 cannot register on Miamo. The check is enforced at sign-up: the user provides their date of birth, the system computes the age, and if the age is under 18, the registration is rejected with a clear message. The check is also enforced at re-authentication — if a user's age (computed from their DOB) becomes under 18 (which can happen if their DOB was incorrectly entered as a date that later becomes under-18, which is a degenerate case but possible), the account is suspended pending age verification. The platform does not have a parental-consent path; there is no version of Miamo for minors, even with consent. The DPDP §13 children's data protection requirement and the GDPR Article 8 children's data restriction are both enforced by the under-18 hard floor.

The technical mechanism is the DOB validation in the sign-up flow, which runs both client-side (immediate feedback) and server-side (authoritative). The server-side check is in `services/auth/src/server.ts` at the registration endpoint; the DOB is parsed, the age is computed against the current date, and the registration is rejected if the age is under 18. The age is stored on the `User` table as a derived field that is recomputed on each authentication. If a user reports another user for being underage, the report goes to the highest priority queue and is reviewed within 4 hours; if the user is found to be underage, the account is immediately suspended and the RTBF lever is applied (with the data not destroyed but quarantined for potential law-enforcement disclosure if required).

The product reasoning is that there is no good way to operate a dating product with minors, full stop. The risk surface is too high (predators, exploitation, age-of-consent issues, regulatory exposure), and the legitimate use case is zero (minors should not be on dating apps). The hard floor of 18 is the cleanest position, and it is enforced by code, not by policy. The age verification at sign-up is currently the user-provided DOB; we have evaluated photo-based age estimation and have not deployed it because the false-positive rate is high enough to exclude legitimate adults. The trade-off is that some minors do lie on sign-up; the safety reporting flow is the second line of defence.

---

### 58. What's a session, and how is it tracked?

A session is a continuous period of user activity in the app, defined as the interval between a `session.start` event and either a `session.end` event or a 15-minute idle timeout. The session is the unit at which many of the tracking aggregates are computed (session length, profiles-viewed-per-session, decisions-per-session, time-to-first-message). The session ID is a UUID generated on `session.start` and attached to every event within the session as a foreign key. The session record is written to `Session` table, with start/end timestamps, the device type, the app version, and the count of events. Sessions are HMAC-hashed for tracking aggregates, same as `userId`.

The technical mechanism is the frontend `session.ts` module, which manages session lifecycle: a new session starts on app foreground or after a 15-minute idle, and ends on app background or after a 15-minute idle. The session ID is a UUID v4 generated client-side and attached to every tracked event via the `track()` function. The session is also tracked server-side as a Postgres row (`Session` table) for analytics aggregation. The 15-minute idle timeout is the trade-off between "long enough to bridge brief inactivity (looking up something on another app)" and "short enough to capture session boundaries (closing the app and reopening 30 minutes later is two sessions, not one)."

The product reasoning is that the session is the most useful unit of analytics aggregation for understanding user behaviour. Per-session metrics (decisions per session, time per session, first-message rate per session) are the metrics that distinguish a healthy user experience from an unhealthy one. The session-level instrumentation is also the unit at which we can compute per-session ranker variants for A/B testing (a user might see the v6 ranker for one session and the v7 ranker for the next, with the session-level metrics used to compare). The session is the workhorse of the analytics layer. See [TRACKING.md](./TRACKING.md) for the full instrumentation detail.

---

### 59. Why are some surfaces premium and others free?

The split is: premium gets you (a) 1.5× exposure-credit multiplier, (b) unlimited Move composer drafts (free is 1 per day), (c) the audit endpoints (`/api/v1/users/me/passes`, `/api/v1/users/me/match-trend`), (d) read receipts, (e) the undo-swipe-within-24-hours feature, and (f) the "see who liked you" surface. Premium does NOT get you (a) more matches per day, (b) priority in Weekly Top-10, (c) priority placement in anyone's feed beyond the 1.5× ceiling, (d) any feature that would tilt the matching market against free users. The split was chosen by reviewing the industry-standard premium tiers, removing every feature that creates pay-to-win dynamics, and keeping every feature that is genuinely polish without distortion.

The technical mechanism is the `User.premiumTier` field and the `withPremium()` middleware. Each premium-gated endpoint checks the field at request-handling time. The `withConsent` pattern (Question 28) is the consent middleware; the `withPremium` pattern is the tier middleware. Both are simple wrappers that either pass through or return the free-tier behaviour. The premium subscription is managed via Apple's StoreKit (iOS) and Google Play Billing (Android), with the renewal status synced to the `User` row via webhook on each renewal or cancellation. The free → premium upgrade takes effect within 30 seconds of the StoreKit / Play confirmation; the premium → free downgrade on cancellation takes effect at the end of the current billing period.

The product reasoning is the same as Question 14: premium is for polish, not power. The features above are the features we think are worth paying for without distorting the matching market. The audit endpoints are interesting case: they are pure transparency (you see your own passes, your own match trend) with no pay-to-win component, and we considered making them free. We made them premium because the engineering cost of supporting them at scale is non-trivial (the per-user query cost is meaningful) and the demand for transparency is correlated with the demand for premium polish — users who want transparency are also the users who pay. The decision is reviewable; we may make some audit endpoints free in v3.7 if the engineering cost drops.

---

### 60. What's the v3.5 baseline ranker?

The v3.5 baseline ranker is the version of the Discover ranker as of v3.5.0, before the v3.6.0 introduction of mood inference, polarity detection, depth-of-engagement signals, and behavioural reranking. The baseline ranks profiles by: stated filters (age, geo, gender, intent), basic geo proximity, vibe-vector cosine similarity, and a small recency boost. It does not use mood, does not use polarity, does not use depth, does not use behavioural inference. The baseline is available to any user who wants the simpler experience, via Settings → Personalization & Privacy → "Use baseline ranker." It is also the fallback ranker when any of the v3.6.0 inference systems fail (e.g. if the mood worker is down, the ranker falls back to the baseline rather than waiting on the missing signal).

The technical mechanism is the `forYou.ts` ranker (vs `forYouV6.ts` which is the v3.6.0 version). The dispatcher in `algo/registry.ts` picks the ranker per surface per user based on the feature-flag state and the user's `useBaselineRanker` setting. The baseline is preserved in the codebase and is run on a small percentage of traffic continuously as an A/B baseline, so we always have a working comparison point. The baseline ranker code is frozen — we do not add features to it — but we do keep it compatible with schema changes via a thin compat layer.

The product reasoning is documented in Question 22 as the GDPR Article 22 "non-automated-significant-decision" fallback. Users who want to opt out of behavioural inference can do so via the consent toggles, but the baseline ranker is the stronger opt-out — it gives the user a Discover feed that does not depend on any of the v3.6.0 inference systems at all. The baseline is also the fallback ranker for system failures, which is a reliability guarantee. And the baseline is the A/B comparison point that lets us continuously measure whether the v3.6.0 changes are still worth the complexity (they have been, every quarter, by a comfortable margin).

---

### 61. How does the consent screen on first login work?

When you first log into Miamo after the v3.6.0 upgrade (or on first registration as a new user post-upgrade), you see a consent screen. The screen surfaces the four consent toggles (mood inference OFF, behavioural ranking ON, cross-user inference ON, algorithmic transparency ON), explains each in one sentence, and asks you to confirm. The defaults are pre-selected — you do not need to make any choice for the standard defaults to apply. The screen has a "Continue" button (accept the defaults) and an "Adjust" button (toggle anything before continuing). The screen cannot be skipped — you must engage with it before you reach the main app surface.

The technical mechanism is the consent-screen middleware in `services/auth/src/server.ts`, which checks on each successful authentication whether the user has a `consentVersion` field matching the current app version. If not, the authentication response includes a `requireConsent: true` flag, and the frontend routes the user to the consent screen. The user's tap on Continue or Save writes the consent state to `Settings` and writes a `ConsentEvent` row with the version, the per-toggle state, and the timestamp. The `consentVersion` is updated to match the current app version. Subsequent authentications skip the consent screen until the next major version bump.

The product reasoning is that the consent screen is the minimum viable surface for the user to actually engage with the consent choices. Hiding the consents in Settings is the failure mode (most users never visit Settings); putting them on the consent screen forces a moment of engagement. The defaults are pre-selected because we have chosen them carefully and the average user will not want to change them; the "Adjust" button is the path for users who do want to change them. The non-skippable nature of the screen is the deliberate friction — the screen takes 15 seconds, and the 15 seconds are well-spent if they result in informed consent rather than blind acceptance. The consent screen is one of the surfaces most-cited by users as a reason they trust the app.

---

### 62. What's the difference between the gateway and the services?

The gateway (`services/gateway`, port 3000) is the single entry point for all client traffic. It receives every HTTP request from the frontend, the mobile clients, and any external integration, and proxies it to the appropriate internal service based on the URL prefix. The gateway handles cross-cutting concerns: TLS termination, request tracing, rate limiting, authentication (JWT verification), CORS, helmet headers, and the proxy mapping. The services (`services/auth`, `services/users`, `services/social`, etc.) are the internal services that handle specific domains — auth handles sign-up and login, users handles profile management, social handles Discover and matches, etc. The services do not listen on public-facing ports; they listen on internal-only ports (3001-3011) and are only reachable via the gateway or via internal service-to-service calls.

The technical mechanism is the proxy map in `services/gateway/src/server.ts`, which is a route-table of URL prefix → internal service URL. Examples: `/api/v1/auth/*` → `http://auth:3001/auth/*`; `/api/v1/users/*` → `http://users:3002/users/*`; `/api/v1/social/discover/*` → `http://social:3003/social/discover/*`. The gateway uses an early-match strategy: longer prefixes win over shorter prefixes, so a more specific route is preferred over a more general route. The gateway also handles the WebSocket upgrade for the messaging service, proxying the upgrade request to `services/messaging`. The internal services trust the gateway to have done the authentication; the `createInternalAuthMiddleware` (see [SECURITY §2.2](./SECURITY.md#22-createinternalauthmiddleware-for-service-to-service)) is the additional layer for service-to-service calls that bypass the gateway.

The product reasoning for the gateway-and-services architecture is that we wanted a single point of policy enforcement (rate limiting, auth, tracing) and a clean separation of concerns (each service owns its domain). The eleven services are the bounded contexts that we want each engineer to be able to hold in their head; the gateway is the boundary that lets us change the internal topology without changing the public API. The trade-off is a small latency tax (every request hops through the gateway) and a small operational complexity (one more service to monitor). The trade-off has been worth it. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full topology and the canonical reference docs for the per-service detail.

---

### 63. What happens during a deploy?

Deploys are zero-downtime rolling. The CI pipeline runs the typecheck and the fast vitest suite on every PR, runs the full vitest suite on merge to main, builds the Docker images for each service, pushes them to the registry, and triggers the deploy. The deploy is a rolling update across the service replicas — each service has 2 replicas in production, and the deploy updates one at a time. The gateway has 3 replicas. The database migrations run before any service is rolled (using a separate migration job that runs `prisma migrate deploy`), and the migrations are designed to be backward-compatible with the previous service version, so the rolling deploy can be interrupted at any point without breaking either the old or the new replicas. The whole deploy takes about 8 minutes from CI green to all replicas updated.

The technical mechanism is the deploy script in `scripts/deploy.sh` and the Kubernetes deployment manifests in `k8s/`. The migration job is a Kubernetes Job that runs `prisma migrate deploy --schema services/shared/prisma/schema.prisma` and exits; the service rollouts are Kubernetes Deployments with the rolling-update strategy and `maxUnavailable=0`, `maxSurge=1`. The rollback is a `kubectl rollout undo` on the affected deployment, which restores the previous image and is typically complete within 90 seconds. The deploy is gated by a manual approval step in production (development and staging are auto-deploy on merge), so a deploy to production requires a tap on the approval button by the on-call engineer.

The product reasoning is that the deploy frequency is high (multiple times a week) and the team is small (two engineers), so the deploy must be safe by construction. The migrations-first, rolling-services, manual-approval-on-production sequence is the safety floor. The fast rollback is the recovery floor. The combination has resulted in zero customer-visible deploy incidents since the v3.0 cutover; we have rolled back twice for internal-only issues (a metric not emitting correctly, a log line spamming). See [RUNBOOK.md](./RUNBOOK.md) and [DEVOPS.md](./DEVOPS.md) for the operational detail.

---

### 64. What's the difference between a like and a match request?

A Like is the lightweight signal: tap the heart, write a `Like` row, the other person doesn't get a push notification. A Match Request is the heavier signal: tap the heart and write a personalised note (free text up to 200 chars), write a `MatchRequest` row with the note included, and the other person gets a push notification. The Match Request is what the algorithm reads as the strongest pre-match intent signal — the sender has invested effort in a personalised note, the receiver gets a notification with the note in the body, and the conversion to match is 3-4x higher than for a plain like. The Match Request is also gated by Spotlight credits: free users get 5 Match Requests per week, premium users get 25, and the count refreshes on Sunday.

The technical mechanism is the `MatchRequest` table, which is distinct from `Like`. The match-request endpoint writes the row and triggers the push notification via the notifications service. The receiver sees the note in the notification preview and, on tap, lands directly on the Match Request review screen (the sender's profile with the note pinned at the top). The receiver can accept (creating a `Match`), dismiss (the request is archived, no notification to sender), or block (the request triggers the same safety flow as a report). The weekly quota is enforced at the request-creation endpoint, with the count stored in Redis and reset every Sunday at midnight UTC.

The product reasoning is that the lightweight Like is the right primitive for casual interest signalling, and the heavier Match Request is the right primitive for serious interest. The two-tier model is also the way we limit the volume of inbound interest to a manageable level — a free user gets 5 personalised requests per week, which is the upper bound on what they can reasonably respond to thoughtfully. The quota is the friction that makes each Match Request high-effort and high-signal. The push notification on the receiver side is the payoff for the sender's effort: the receiver actually sees the request and engages with it, vs the plain Like which goes into the like-list and may never be reviewed. The Match Request is one of the top features on premium for the volume reason (5 per week vs 25 per week is a meaningful difference for active users).

---

### 65. How does Miamo's onboarding work?

Onboarding is a 12-question flow that takes 5-7 minutes. The questions cover: intent (casual / serious / friendship / not sure yet), age and location verification, photos (minimum 3, maximum 6), vibe-vector seeds (the 7-dimension personality vector via 4 lifestyle questions), values (the top-3 values in a partner), lovelang (the love-language preference), chronotype (the morning / midday / evening / night question), DTM opt-in (do you want the marriage-track tab?), Family Brief opt-in (do you want to share bio-data with family?), consent (the 4 toggles via the consent screen). The flow can be paused and resumed; partial state is saved to the `Onboarding` table (a transient table that is migrated to `Profile` on completion). On completion, the user lands on the Discover surface with the first batch of profiles already ranked.

The technical mechanism is the onboarding service in `services/auth/src/onboardingHandlers.ts` and the per-question handlers. Each question's answer is validated server-side (the answer must be in the allowed set, the photos must pass safety screening, the age must be 18+) and persisted to the transient `Onboarding` row. On completion, the row is migrated to `Profile` and `Settings` and the onboarding completion score (`completion.ts`) is computed. The completion score is one of the inputs to the cold-start affinity weight for DTM and Discover — users with low completion scores see a different ranker behaviour until they cross a threshold.

The product reasoning is that the onboarding is the highest-leverage friction surface in the product, and the 12-question count is the result of three rounds of optimisation. The first version was 24 questions and had a 40% completion rate; the current 12-question version has an 82% completion rate. The questions that stayed are the ones with the strongest predictive validity for matching outcomes (the values question is the single strongest predictor of long-term match retention; the chronotype is the strongest predictor of notification timing; the vibe vector is the strongest predictor of Discover feed quality). The questions that left were either redundant (multiple questions on the same construct) or weak (low predictive validity for outcomes that matter). The 12 are the minimal viable set. See [PRODUCT §2](./PRODUCT.md#2-the-surfaces-priya-sees) for the surface-by-surface walk-through.

---

### 66. What if I don't fit any of the personas the algorithm seems to expect?

The algorithm does not have personas in the sense of fixed categories. It has the vibe vector (7 dimensions, continuous), the intent vector (7 classes, continuous probabilities), the mood vector (5 dimensions, continuous), the chronotype vector (24 hours, continuous), and several other continuous-valued signals. Each user is a point in this multi-dimensional space, not a member of a fixed bucket. If your point is unusual — far from any cluster of other users — the algorithm will surface candidates whose points are nearest to yours in the relevant subspaces, even if those candidates are also unusual. The matching is similarity-based, not bucket-based.

The technical mechanism is that the rankers use cosine similarity over the continuous vectors, not categorical lookups. Two users with vibe vectors `[0.2, 0.1, 0.7, 0.05, 0.1, 0.2, 0.1]` (highly thoughtful, low everything else) will match each other regardless of how typical or atypical those vectors are. The cold-start logic (`dtmColdStart.ts`, the Discover cold-start in the candidate-fetch query) is also similarity-based, with a fallback to broader geo when the candidate pool is thin. The algorithm is not at risk of "your point is too unusual" failure modes; it is at risk of "your candidate pool is too small" failure modes (i.e. there are not many users with vectors near yours), which we address with the "expand the filter" prompt rather than with bucketing.

The product reasoning is that fixed personas are the failure mode of the dating-app industry — every app tries to bucket users into "the romantic" or "the adventurer" or "the homebody," and the buckets always fit poorly. Miamo's bet is that continuous similarity is the correct primitive. The trade-off is that the algorithm is less interpretable ("you matched because you're both adventurous" is a simpler story than "you matched because your vibe vectors have cosine 0.81"), and we have addressed the interpretability via the Why-am-I-seeing-this surface (Question 16), which renders the cosine into a plain-English story. The continuous model is also what allows the algorithm to handle the unusual user well — there is no bucket they fail to fit, just a position in space that the matcher can search around.

---

### 67. How often is the algorithm updated?

The algorithm is updated continuously. Small adjustments (per-user weight learners) run nightly and update the per-user weight profiles in `UserWeightProfile`. Medium adjustments (per-cohort ranker parameter tuning) run weekly and update the parameters in the shared algorithm configuration. Major adjustments (new ranker versions, new ingredients, new feature flags) ship in releases — typically every 4-6 weeks. The frequency is the trade-off between adaptive responsiveness (the algorithm reflects current user behaviour) and predictability (users do not experience the feed as randomly changing). The continuous-improvement layer is bounded — no single nightly update can shift a per-user weight by more than a fixed delta, so the algorithm cannot drift away from its previous state too quickly.

The technical mechanism is the learner pipeline in `services/shared/src/algo/v8/learner.ts` (and the per-surface learners in `surfaceLearner.ts`). The nightly learner job aggregates the last 24 hours of user behaviour, computes the per-user gradient on each ingredient weight, and applies a clipped update. The clip is the safety: the per-night update is bounded at ±0.05 on any individual weight, which means a weight that starts at 0.30 cannot become 0.20 in one night. The bound prevents the runaway dynamics where a single bad day of behaviour shifts the weight far enough that the next day's data is also distorted. The weekly cohort tuning is a small change committee — currently a manual review by the team — that examines the per-cohort metric trends and decides whether to adjust shared parameters.

The product reasoning is that adaptive personalisation is the feature, and the bounded updates are the safety floor. The bet is that small, frequent, bounded updates produce a stable algorithm that improves over time without ever shocking a user. The alternative — periodic large updates (the way many big platforms do it, with a quarterly model retrain that ships all at once) — produces a less responsive algorithm and a more shocked user base on each retrain. The bounded-continuous model has the property that any one user's algorithm is mostly stable from week to week, with small drift in directions that match their evolving behaviour. The major adjustments that ship in releases are the larger changes that need explicit rollout via feature flags, with the per-surface learner used to ramp from 0% to 100% over weeks. See [ALGORITHMS §5](./ALGORITHMS.md#51-learnerts) for the learner internals.

---

### 68. Can I see other users' Spotlight ledger?

No. Spotlight ledger entries are private to the user they belong to. Each user can see their own ledger via Settings → Spotlight Ledger, which shows the running balance, the per-entry credits and debits, and the per-entry source (e.g. "first-message-reply", "anti-ghost-deposit", "DTM-completion-bonus"). The other party in an interaction does not see the credit or debit that happened on the other side — they see the interaction (the chat, the match) but not the ledger consequence. The exception is the anti-ghost flow, where both sender and recipient see the deposit and the eventual resolution (return + bonus, or burn), because both parties are explicitly part of the deposit mechanic.

The technical mechanism is the `SpotlightLedger` table, which has a `userId` foreign key and is queryable only for the authenticated user's own `userId`. The API endpoint `/api/v1/users/me/spotlight-ledger` is authenticated and returns only the requesting user's ledger; there is no API to query another user's ledger. The Spotlight balance is also visible internally to the algorithm — the exposure-credit scheduler reads ledger balances across all users to compute the per-impression award schedule — but the per-user balance is never surfaced to another user. The internal access is logged to the audit table, same as any other privileged read.

The product reasoning is that the Spotlight ledger is a transparency feature for the user, not a competitive surface. We did not want a "your ledger is higher than 73% of users" gamification layer, because that would turn Spotlight into a points-collection game and distort the engagement signal. The ledger is private because it is private state of the algorithm's view of you, and the algorithm's view of you is for you. The transparency to the user is the point; the opacity to other users is also the point.

---

### 69. What do I do if I'm seeing inappropriate profiles?

Report them (Question 38). The safety queue triages inappropriate-profile reports as one of the four high-priority categories. Profiles that are clearly inappropriate (explicit content, threats, fake-profile indicators) are removed within 4 hours; profiles that are borderline (questionable photos, unclear identity) are reviewed within 24 hours with a thorough check. In addition to reporting, you can adjust your filters to reduce the chance of seeing similar profiles in the future — the Discover filter modal has options for age, geo, and several other attributes. If you are seeing inappropriate profiles repeatedly despite reporting and filtering, that is a signal that the safety net has a hole; please email `safety@miamo.app` directly with the report IDs and we will investigate the pattern.

The technical mechanism is the safety pipeline (Question 52). Inappropriate-profile reports trigger the same review flow as harassment reports, with the additional step that the profile-level review checks the photos against our content-moderation pipeline (a small in-house model + manual review) and the bio against the keyword blocklist. Profiles that fail the moderation check are removed; the user is notified with the rationale and given a 7-day window to update before permanent removal. The filter modal stores per-user filter preferences on the `DiscoverFilter` table and is read on every candidate-fetch query.

The product reasoning is that inappropriate profiles are the second-most-common failure mode after harassment (the first), and the response time is the trust signal. The 4-hour SLA on clearly-inappropriate profiles is the same as harassment; the 24-hour SLA on borderline cases is the trade-off between speed and care. The filter-modal is the user's first line of defence — adjusting filters reduces exposure to the kinds of profiles you do not want to see — and the safety reporting is the second line. The combination is the floor.

---

### 70. Why does Miamo ask for my phone number?

Phone number is the primary identifier for sign-up, the second factor for sign-in (via OTP), and the basis for the unique-account constraint (Question 56). We ask for it because it is the most reliable identity primitive available — email addresses are cheap to create at scale (and therefore not useful for anti-fraud), social-login accounts can be created without identity verification (also not useful for anti-fraud), but phone numbers in India require some level of identity verification at the carrier level. The phone-number-as-identity floor is the basis for the platform's safety guarantees: one phone, one account, one person, with a real-world tether.

The technical mechanism is the OTP-based sign-up flow in `services/auth/src/server.ts`. The user provides a phone number, the system sends an OTP via SMS (currently via Twilio, with a Razorpay-Sonata fallback for Indian numbers), the user enters the OTP, the system verifies and writes a `User` row. The phone number itself is stored as an HMAC hash (`User.phoneHash`) — the raw number is not retained beyond the OTP verification. The same OTP flow is used for sign-in (each session requires a fresh OTP verification or a JWT refresh token from a recent OTP), and for 2FA on sensitive actions (account deletion, premium subscription changes).

The product reasoning is that the phone-number floor is the line between a platform with credible safety guarantees and a platform without them. Without the phone, every banned user can create a new account in 30 seconds; with the phone, banned users have to acquire a new phone number (which is a non-trivial cost) before they can re-register, and we can flag rapid phone-number churn as a fraud signal. The trade-off is that the phone-number requirement excludes users who do not have a phone or who do not want to share one. We have accepted the trade-off because the safety floor is worth more than the marginal users. Phone numbers also have the secondary benefit of supporting OTP-based passwordless sign-in, which is the friction-lowest sign-in flow we have found in user testing.

---

## Appendix B — Worked examples and scenarios

This appendix walks through several scenarios end-to-end. They are not new questions; they are extended worked examples of how multiple parts of the system interact. Each scenario references the relevant question numbers above for the per-part detail.

### B.1 — The bootstrap-trap debugging session

An engineer adds a new v8 endpoint behind the `featureFlag_moveV2` flag. They set `FEATURE_FLAG_MOVE_V2=true` in their local `.env`. They reload the page. They hit the endpoint. They get a 404. They double-check the env file. They re-check the flag declaration. They re-check the route registration. The route is correct, the flag is correct, the env is correct, but the endpoint is 404.

The cause is the bootstrap trap (Question 31). The service was started before the engineer changed the env file. The service is running with the boot-time snapshot, which had the flag OFF. The route registration check ran at boot, found the flag OFF, and skipped the `router.post` line. The service is now running without the route. The fix is `pnpm dev:restart <service>` or the equivalent restart command. After restart, the env is re-read, the flag is now ON at boot, the route is registered, the endpoint returns 200.

The diagnostic shortcut: `curl localhost:<port>/_routes` lists all registered routes for a service. If the new route is missing from the list, the service was started with the flag OFF. The remedy is always a restart. The longer-term fix (per-request flag checks instead of boot-time registration) is on the v3.7 roadmap.

### B.2 — The user who deletes their account and rejoins a week later

A user signs up in June, uses the app for 3 weeks, deletes their account on July 15 via Settings → Account → Delete. The deletion runs through the six steps within 24 hours: profile anonymised, encryption keys burnt, tracking aggregates hash-burnt, audit log preserved. On July 22, the user wants to come back. They sign up again with the same phone number.

The sign-up succeeds because the previous account's `phoneHash` row was hard-deleted in the deletion flow, freeing the phone number. The new account is treated as a new user — there is no history, no carry-over of preferences, no carry-over of matches. The user starts fresh in onboarding. The previous matches, chats, and likes are unrecoverable; they were destroyed in the encryption-key burn (Question 19). The audit log retains the previous-account-deletion record under the previous `userId`, which is not linked to the new account.

The product position: this is the correct behaviour. A user who deletes their account is asking for the data to be destroyed, and the destruction is real. Recovery is not a feature, by design. If the user changes their mind, they start over. The phone-number reuse is allowed because the phone is the user's, not the account's; the user retains the right to register again.

### B.3 — The polarity loop on a Friday evening

A user opens the app at 7pm on a Friday. They pass on profile 1 after 4 seconds. They pass on profile 2 after 3 seconds. They pass on profile 3 after 2 seconds. They pass on profile 4 after 1.5 seconds. They pass on profile 5 after 1.2 seconds. The polarity score (Question 53) is now -1.0; the system has detected the hate-scroll pattern.

The `postImpressionRerank.ts` activates cool-off mode. The next batch of 10 profiles is fetched from a different cohort — wider geo, different vibe-vector cluster, lower novelty. The feed pace slows: the "next" button is replaced with a "see next" button that requires a deliberate tap, and the auto-advance after a swipe is disabled. The user looks at profile 6 for 12 seconds. They tap "see more." They like profile 6. The polarity score begins to recover.

The user does not see any explicit "you're hate-scrolling" message. They just experience the feed shifting. The `withConsent('moodInference')` and `withConsent('behavioralRanking')` flags are both ON for this user, so the cool-off is active. If either flag were OFF, the cool-off would not activate and the user would continue the hate-scroll. See [PRODUCT §4.12](./PRODUCT.md#412-the-polarity-loop--the-friday-hate-scroll) for the canonical walk-through and [ALGORITHMS §3.A.3](./ALGORITHMS.md#3a3-polarityts--positive-interest-vs-hate-scroll) for the algorithm.

### B.4 — The Family Brief delivered to a mother in Pune

A user opens the DTM tab at 4pm on a Sunday. They see Yash, a curated match. They tap the clipboard icon. They pick Image. The preview pane shows Yash's bio-data card with photo, education (BArch from Sir J.J. College, Mumbai), profession (architect at SDA), family (parents in Pune, one brother), kundli markers, partner preferences. The card does not include caste (Question 34).

The user taps Share → WhatsApp → Mom. The WhatsApp message contains the image and a one-line text caption: "Mom, check this out — what do you think?" The image is delivered to the mother's WhatsApp. The mother opens it, looks at the card, decides to ask about it later. Three days later, the mother shares the image with a cousin via the family WhatsApp group; the link in the image is still valid because the 7-day TTL has not yet expired.

On day 8, the link expires. The image is still in the mother's WhatsApp gallery (WhatsApp's local cache), but the URL embedded in the image (which led to the full PDF with extended details) returns 410 Gone. The mother does not lose the image she saw; she loses the link to the extended version. The user has the option to regenerate the Family Brief, which creates a new `FamilyBriefShare` row with a new token and a new 7-day TTL.

### B.5 — A premium-to-free downgrade

A user is on premium. They use unlimited Move composer drafts. They have a 1.5× exposure-credit multiplier. They have access to the audit endpoints. They cancel their premium subscription via the App Store. The cancellation takes effect at the end of the current billing period (per Apple's StoreKit semantics).

At the end of the period, the user's `premiumTier` field is downgraded from `premium` to `free` via the StoreKit webhook. The `withPremium()` middleware is the gate; the next request to a premium-only endpoint returns the free-tier behaviour. The Move composer now allows 1 draft per day; the multiplier is 1.0×; the audit endpoints return 403. The user's existing Spotlight ledger balance is preserved (it was earned under premium with the 1.5× multiplier, and we do not retroactively re-rate it).

The user can resubscribe at any time, which immediately re-enables premium. The historical premium-while-active state is retained in the `Subscription` table for analytics and for accounting. The user is not penalised for the downgrade; they simply lose the polish features until they re-upgrade.

---

## Appendix C — Glossary

This appendix is a quick-reference glossary for the terms used throughout the FAQ and the rest of the documentation.

- **Anti-ghost system**: the Spotlight-deposit mechanic on first messages (Question 9).
- **Behavioural ranking**: the use of user behaviour (taps, dwell, scroll) as a signal for ranking (Question 12).
- **Chronotype prior**: the 24-hour activity-rhythm fingerprint (Question 48).
- **Code-mix**: the natural mixing of English with romanised regional languages (Question 36).
- **Consent toggles**: the four privacy switches in Settings (Question 12).
- **Cool-off mode**: the polarity-driven feed slowdown (Question 53).
- **Cross-user inference**: using your behaviour as training signal for the global model (Question 12).
- **DPDP**: India's Digital Personal Data Protection Act, 2023 (Question 24).
- **DTM**: Date-to-Marry, the marriage-track side of the app (Question 10).
- **Depth of engagement**: the dwell+scroll+expansion signal that distinguishes accidental taps from deliberate inspections (Question 54).
- **Discover**: the casual-dating side of the app (Question 37).
- **Family Brief**: the one-tap bio-data card for WhatsApp share (Question 7).
- **Feature flag**: a runtime switch that gates a feature on or off (Question 28).
- **Festival hooks**: small per-region boosters during festival weeks (Question 55).
- **GDPR Article 22**: the EU right not to be subject to solely automated decisions (Question 22).
- **HMAC**: keyed one-way hashing, used for tracking pseudonymisation (Question 20).
- **Hinglish / Tanglish / Banglish**: code-mixed language families supported by the composer (Question 36).
- **Like**: a one-tap interest signal (Question 64).
- **Match**: a mutual interest that has produced a chat (Question 43).
- **Match Request**: a Like with a personalised note (Question 64).
- **Mood inference**: the 5-dimensional mood vector from behaviour (Question 4).
- **Move**: a composer-drafted message in a new chat (Question 5).
- **Polarity**: the positive-interest-vs-hate-scroll score (Question 53).
- **Premium**: the paid tier with polish features (Question 14).
- **Right-now intent**: the 7-class session-intent classifier (Question 51).
- **RTBF**: Right To Be Forgotten, the account-deletion flow (Question 19).
- **Session**: a continuous user activity period (Question 58).
- **Spotlight minute**: the unit of earned visibility (Question 11).
- **Vibe vector**: the 7-dimension personality vector (Question 46).
- **Voice Fingerprint**: the writing-style card after 50 outbound messages (Question 6).
- **Weekly Top-10**: the Sunday-morning stable-match ritual (Question 8).
- **Why-am-I-seeing-this**: the per-profile algorithm explanation (Question 16).

---

## Appendix D — Cross-reference table

The table below maps each FAQ question to the canonical source documents.

| Q# | Topic | PRODUCT § | SECURITY § | ALGORITHMS § | Other |
|----|-------|-----------|------------|--------------|-------|
| 1 | What is Miamo | §1, §2 | — | — | ARCHITECTURE |
| 2 | Differentiation | §3 | — | — | — |
| 3 | Passed profiles | §6.7 | — | — | — |
| 4 | Night mode | §4.7 | §11.1 | §3.A.2 | — |
| 5 | Move suggestions | §4.3 | — | §3.C.5 | MIAMO_MOVE |
| 6 | Voice Fingerprint | §4.4 | — | §3.C.1 | — |
| 7 | Family Brief | §4.6 | — | — | — |
| 8 | Weekly Top-10 | §4.8 | — | §3.B.2 | — |
| 9 | Anti-ghost | §4.9 | — | §3.D.3 | — |
| 10 | DTM | §5 | — | §1.10 | — |
| 11 | Spotlight minute | §3.4 | — | §3.B.1 | — |
| 12 | Behavioural inference | §6.10 | §11 | — | — |
| 13 | Invisibility | §6.10 | — | — | — |
| 14 | Premium 1.5× | §3.4 | — | — | — |
| 15 | Wrong mood | §6.10 | §11.1 | §3.A.2 | — |
| 16 | Why am I seeing this | §4.2 | §11.4 | §6.4 | — |
| 17 | Chat privacy | §6.4 | §3.1 | — | — |
| 18 | Data storage | §2.3 | §10.9 | — | DATA_MODEL |
| 19 | Data deletion | — | §12 | — | — |
| 20 | HMAC | — | §3.3 | — | TRACKING |
| 21 | Third-party sharing | §6.11 | — | — | — |
| 22 | GDPR Article 22 | — | §10.2 | — | — |
| 23 | Data selling | §6.11 | §10.3 | — | — |
| 24 | DPDP | — | §10.1 | — | — |
| 25 | New algorithm | — | — | §8 | — |
| 26 | New tracking event | — | §3.3 | — | TRACKING |
| 27 | New Prisma model | — | — | — | knowledge-base |
| 28 | New feature flag | — | — | — | ARCHITECTURE |
| 29 | Test bar | — | — | — | — |
| 30 | QA scripts | — | — | — | QA_MASTER_PROMPT |
| 31 | Bootstrap trap | — | — | — | knowledge-base |
| 32 | v3.5→v3.6 | — | — | — | CHANGELOG |
| 33 | db push | — | — | — | knowledge-base |
| 34 | Caste field | §5.6, §6.5 | — | — | — |
| 35 | Gotra | §5.6 | — | — | — |
| 36 | Code-mix | — | — | §3.C.4 | — |
| 37 | DTM vs Discover | §5 | — | — | — |
| 38 | Reporting | — | §9.3, §13 | — | — |
| 39 | Unmatching | — | — | — | — |
| 40 | Data export | — | §10 | — | — |
| 41 | Shutdown / acquisition | — | §10 | — | legal/shutdown-protocol |
| 42 | Market | — | §10.8 | — | — |
| 43 | Like/Match/Move | — | — | — | DATA_MODEL |
| 44 | Active dot | — | — | §1.6 | — |
| 45 | Read receipts | §3.4 | — | — | — |
| 46 | Vibe vector | — | — | §6.3 | — |
| 47 | Fewer matches | — | — | §3.B.4 | — |
| 48 | Chronotype | — | — | §1.14 | — |
| 49 | Discover vs Creativity | — | — | §1.16 | — |
| 50 | No swipe | §6.1 | — | — | FRONTEND |
| 51 | Right-now intent | §3.3 | — | §3.A.1 | — |
| 52 | Harassment | — | §9.3, §13 | — | — |
| 53 | Polarity loop | §4.12 | — | §3.A.3 | — |
| 54 | Depth of engagement | — | — | §3.A.4 | — |
| 55 | Festival hooks | — | — | §3.B.5 | — |
| 56 | Multiple accounts | — | §1.5 | — | — |
| 57 | Minors | — | §10.7 | — | — |
| 58 | Session | — | §8 | — | TRACKING |
| 59 | Premium vs free | §3.4 | — | — | — |
| 60 | Baseline ranker | — | §10.2 | §1.1 | — |
| 61 | Consent screen | — | §11.5 | — | — |
| 62 | Gateway vs services | — | §2.2 | — | ARCHITECTURE |
| 63 | Deploys | — | — | — | DEVOPS, RUNBOOK |
| 64 | Like vs Match Request | — | — | — | DATA_MODEL |
| 65 | Onboarding | §2 | — | — | — |
| 66 | Unusual users | — | — | §6.3 | — |
| 67 | Algorithm updates | §6.6 | — | §5 | — |
| 68 | Ledger privacy | — | §3 | §3.B.1 | — |
| 69 | Inappropriate profiles | — | §9.3 | — | — |
| 70 | Phone number | — | §1.5 | — | — |

---

## Appendix E — More questions, more answers

This appendix continues the FAQ with additional questions that came up after the main sections were drafted. They follow the same format and the same standards.

---

### 71. How do I undo a swipe?

Premium users have a 24-hour undo window. Tap the Undo button at the top-right of the Discover surface. The most recent decision (Like, Pass, or Save) is reverted: a Like is removed (no notification to the other party, who never saw it; they may have seen a notification if the like converted into a match, which makes the undo more nuanced), a Pass removes the `DeferredItem.discover.passed` row (the profile becomes eligible to reappear in your feed), a Save removes the `Bookmark` row. Free users do not have an Undo button.

The technical mechanism is the `/api/v1/social/discover/undo` endpoint, which checks the user's `premiumTier`, looks up the most recent decision within the last 24 hours, and reverses it. The decision history is in `DiscoverDecisionLog`, an append-only table that retains the last 7 days of decisions per user. The undo writes a `discover.undo` event to the audit log with the original decision and the timestamp. The 24-hour window is the trade-off between "long enough to undo a regretted decision" and "short enough that the action retains some immediacy."

The product reasoning is that swipe-regret is the most-cited reason free users want premium. The undo feature is the smallest, cleanest premium polish that addresses the regret directly. We have considered making the undo free with a quota (e.g. 3 per day for free users), and may still do so in v3.7; for now it is a premium feature because the engineering cost of the audit-aware undo is non-trivial and we want premium to keep the polish features that are most demanded.

---

### 72. What's a TrendQueue?

The TrendQueue is the internal scheduling structure that decides which profiles get surfaced in which feed slots, based on the exposure-credit ledger and the per-surface demand. Each surface (Discover, DTM, Creativity, Search) maintains a queue of profile-IDs paired with their spend rate (how many credits they spend per impression in that surface). The queue is consumed by the feed-rendering layer: when a feed request comes in for a user, the renderer picks profiles from the queue weighted by spend rate and by the standard ranker score. Profiles with higher Spotlight balances spend at higher rates and appear more frequently; profiles with zero balance get the baseline rate (which is still non-zero — Spotlight is a boost, not a gate).

The technical mechanism is the `TrendQueue` table and the `exposureScheduler.ts` worker. The worker runs every 5 minutes, reads the current ledger balances, computes the per-profile spend rate, and writes to the queue. The feed-rendering layer reads from the queue at request time, applies the standard ranker, and produces the final feed order. The queue is bounded — only the top-N profiles per surface are queued at any time — to prevent unbounded growth. The N is tuned per surface: 5000 for Discover (the largest pool), 500 for DTM (the smallest), 2000 for Creativity and Search.

The product reasoning is that the Spotlight ledger needs a translation layer to turn balance into impressions. The TrendQueue is that layer. The architecture decouples the ledger (which is a per-user accumulator) from the rendering (which is a per-impression decision), so changes to either side can be made independently. The decoupling is also what allows the per-surface different spend rates — a Spotlight minute in Discover spends faster than a Spotlight minute in DTM, because the impression rate in Discover is higher. See [ALGORITHMS §3.B.1](./ALGORITHMS.md#3b1-exposurecreditsts--earned-slot-accrual).

---

### 73. Does Miamo work offline?

Partially. The app can show your existing matches, your existing chat history (from a local cache), your profile, and your settings while offline. It cannot show new profiles in Discover, cannot send new messages, cannot generate Move suggestions, cannot sync any new state. When you regain connectivity, the app syncs queued actions in order: queued messages are sent (preserving the order in which you composed them), queued reactions are applied, queued profile edits are persisted. The offline-to-online transition is designed to be invisible — you should not need to retry actions manually.

The technical mechanism is the offline-first sync layer in `services/web/src/lib/sync.ts`. The local cache uses IndexedDB to persist the recent state. Outbound actions are written to an action queue (also in IndexedDB) with a sequence number. On reconnect, the sync worker drains the queue in sequence order, calling the appropriate API endpoint for each action. Errors during drain (conflicts, validation failures) are surfaced as user-visible errors with the original action retained for retry. The cache TTL is 7 days for chats, 24 hours for profiles, indefinite for settings.

The product reasoning is that the mobile experience on Indian carriers is real-world flaky, and an app that does not work offline is an app that frustrates users on every metro ride, every elevator descent, every rural drive. The offline mode is the minimum viable resilience. The Discover surface intentionally does not show stale candidates offline because stale Discover is worse than no Discover (the user might tap on a candidate who has since changed or deleted their profile). The chat surface is the most-used offline feature; the message-queue-with-replay is the canonical pattern. The DTM surface is also available offline for the daily curated match, with the answer being queued for sync on reconnect.

---

### 74. What's special-category data under GDPR?

Special-category data is the class of personal data that GDPR treats with the strictest protection — Article 9 of the regulation. The categories include: racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, genetic data, biometric data, health data, sex life, and sexual orientation. Processing of special-category data requires explicit consent (not just "necessary for the service"), specific purpose, and additional safeguards. The mood-inference signal in Miamo is treated as special-category data because mood inference can reveal information about mental health, which is health data under Article 9.

The technical mechanism is the consent layer described in Question 12. The `moodInferenceEnabled` flag is default OFF specifically because mood inference is Article 9 special-category data, and the default-OFF position is the conservative compliance posture. The `crossUserInferenceEnabled` flag is default ON but is the CCPA "Do Not Sell" toggle, which addresses the special-category concern under California law (the CCPA does not have a separate special-category framework, but the "Do Not Sell" right is the equivalent). The DTM topic vector is also treated with extra care — answers to depth questions about intimacy, finance, or family can reveal special-category-adjacent information, and the `dtmEnabled` flag is the consent gate.

The product reasoning is that GDPR Article 9 is the highest-water-mark privacy regime that applies to us (DPDP is younger and less strict; CCPA is roughly equivalent to GDPR for these categories). Building to Article 9 means we are compliant everywhere by construction. The default-OFF posture for special-category inferences is also the right product posture: most users do not want their dating app inferring their mental-health state, and the few who do want the mood-aware experience can turn it on explicitly. See [SECURITY §10.6](./SECURITY.md#106-special-category-inference-under-gdpr-article-9).

---

### 75. Why does Miamo not use facial-recognition for verification?

Facial recognition is the obvious-but-wrong tool for identity verification on a dating product. It has three problems. First, the false-positive rate is high enough that legitimate users get rejected (mostly users with non-Western facial features, where the off-the-shelf models perform worse). Second, the false-negative rate is also high enough that determined catfish can defeat it (a printed photo or a deepfake will pass most consumer face-rec systems). Third, the storage of facial templates is a privacy risk that we are not willing to take — facial templates are special-category biometric data under GDPR Article 9, and the storage carries significant compliance overhead with limited practical benefit. We do not use facial recognition.

What we do use: at sign-up, the user uploads at least 3 photos and at most 6. The photos are scanned by an in-house content-moderation model for explicit content, screenshots-of-other-apps, and obvious meme images. The first photo is required to be a clear face shot (this is a human-reviewable requirement, not a face-rec-enforced one — users whose first photo is not a face are flagged for safety review). The phone-number identity floor (Question 70) is the primary anti-fraud layer; the photo review is the secondary layer. We have evaluated face-rec verification several times and have not deployed it.

The product reasoning is that the safety win from facial recognition is smaller than the privacy cost. The legitimate-user friction is real (reject rates of 5-8% for legitimate users in our internal tests). The catfish defence is weak (a determined catfish has many ways to pass face-rec). The compliance overhead is large. The phone-number floor + manual photo review is the floor we have settled on. We may revisit the decision if the face-rec technology improves to the point where the false-positive rate drops below 1% for our demographic, but as of 2026 we have not seen that improvement.

---

### 76. What happens to my data when my account is hacked?

If your account is compromised, the first step is to report it to `security@miamo.app`. The team will respond within 4 hours (this is a security-incident SLA, faster than the standard support SLA). The remediation flow: (1) the account is immediately locked, suspending all active sessions; (2) the user is required to re-authenticate with a fresh OTP and to set a new password; (3) the audit log is reviewed to identify any actions the attacker took (messages sent, profile changes, premium-tier changes); (4) the user is shown the suspicious actions and given the option to reverse them; (5) the team reaches out to any users who interacted with the compromised account during the attack window, in case the attacker sent harassing messages.

The technical mechanism is the security-incident pipeline. The lock is via the `User.suspended` flag, set to true with reason `security-incident-pending-review`. Active sessions are revoked via the JWT refresh-token rotation — the user's refresh tokens are invalidated, forcing re-auth on next API call. The audit log review uses the `AuditLog` table query at `/api/v1/admin/audit-trail?userId=<id>&window=<from-to>`. The suspicious-action reversal is a per-action flow: messages can be marked as "sent under compromise" with a visible note in the chat history, profile changes can be reverted to the previous version, premium-tier changes can be refunded (we eat the cost).

The product reasoning is that account compromise is rare but high-cost, and the response time and clean-up matter more than the rarity. The 4-hour SLA is the same as harassment — both are high-priority. The reversibility of attacker actions is the recovery floor; the audit log is what makes the reversibility possible. Users who have been compromised are also offered a free 1-month premium extension as a gesture of recovery; the policy is informal but consistent.

---

### 77. What's the difference between v6, v7, and v8?

V6, V7, and V8 are algorithm-version generations. V6 was the major rewrite from v4 (the legacy ranker that lasted from v1.0 to v3.2). V6 introduced the per-surface learner, the per-user weight profile, the SessionSummary aggregation, and the FocusAffinity signal. V7 was the smaller follow-up that added the DTM v7 feed picker (`dtmFeedV7.ts`), the Move v2 templater (`moveVoice.ts`), the right-now intent classifier (`intentRightNow.ts`), and the surface-learner per-surface half-lives. V8 is the current generation, which added the exposure-credit ledger, the Gale-Shapley Weekly Top-10, the fairness-rerank, the festival hooks, the polarity detection, the depth-of-engagement signal, and the Move v2 full composer with voice, resonance, hook library, and code-mix.

The technical detail is that each generation is a directory under `services/shared/src/algo/`: `algo/v6/`, `algo/v7/`, `algo/v8/`. The registry knows which generation each ranker belongs to via the registry-entry metadata. The per-surface dispatcher can pick any generation's ranker for any surface, gated by feature flags. The migration between generations is the per-surface learner ramp: v8 ranker starts at 0% traffic on Discover, ramps to 100% over weeks based on observed metrics, with v7 as the fallback. The fallback is preserved indefinitely — we do not delete old rankers, because they are the safety net when a new generation has a regression.

The product reasoning for the generations is that algorithm changes are the highest-risk changes, and naming the generations explicitly gives us versioning discipline. A user who is on the v8 Discover ranker and the v7 DTM ranker and the v6 search ranker is a valid configuration; the per-surface independence is the architecture. The generations also make it easy to talk about changes — "the v8 Move composer" is a much clearer reference than "the new Move composer" — which matters more than it seems for team velocity. See [ALGORITHMS §1](./ALGORITHMS.md) for the per-generation algorithm list.

---

### 78. Can I block a specific keyword from appearing in my feed?

No, not directly. There is no per-keyword block list at the user level. The closest you can do is adjust your filters (age, geo, intent, education) to exclude broad categories. If you are seeing repeated keyword patterns you don't like (e.g. repeated mentions of a specific industry, lifestyle, or attribute), the path is to express the preference via the Like / Pass pattern — pass on profiles with the unwanted attribute, like profiles without it, and the per-user weight learner will pick up the preference within a few sessions.

The technical reason we do not build per-keyword blocks is that the keyword level is too granular for the consent model. A keyword-block feature would require us to scan profile bios for the keyword (which we do not currently do in a per-user-list way), maintain a per-user keyword-list table (additional schema), and decide whether the keyword scan applies to display, ranking, or both. The complexity is high; the user demand is low (in our research, users overwhelmingly prefer to express preference via behaviour rather than via explicit keyword lists); and the abuse case is real (keyword blocks could become a tool for filtering by ethnicity, religion, or other protected categories, which we do not want to enable).

The product reasoning is that preference expression should be through the Like / Pass primitive, with the algorithm doing the keyword-level inference rather than the user doing it manually. The bet is that the algorithm picks up patterns faster than the user can articulate them, and the user does not have to maintain a list. The trade-off is the latency: it takes a few sessions for the algorithm to learn, vs an immediate effect from a keyword block. We have decided the trade-off is correct. If you have a specific pattern you want blocked and the algorithm is not picking it up, please email `support@miamo.app` and we will investigate.

---

### 79. What's the data retention policy for matches I never messaged?

A Match (mutual like / accepted request) without any messages is retained for 90 days. After 90 days of inactivity (no messages from either party, no profile views), the Match row is moved to the `Match.state = archived` state and the `Chat` is also archived. The archived state is functionally a soft-delete: the match disappears from both users' match lists, and the chat is no longer creatable. After an additional 90 days in the archived state, the Match and the empty Chat are hard-deleted. Total retention: 180 days from the match creation, if neither party sends a message.

The technical mechanism is the `match-cleanup` worker, which runs nightly. It queries `Match` rows with `state = matched`, `messageCount = 0`, and `lastActivityAt < now - 90d`, and updates them to `state = archived`. A second pass queries `state = archived` and `archivedAt < now - 90d`, and hard-deletes the matching `Match` and `Chat` rows. The cleanup is logged to the audit table as a system-action; users are not notified of the cleanup, because the cleanup is on inactive matches and there is no one to notify.

The product reasoning is that a match that produced no messages in 90 days is functionally dead, and retaining it in the user's match list creates clutter without value. The 90-day-then-90-day staged deletion is the trade-off between cleanup velocity and forgiveness (a user who comes back after a 60-day absence still sees their pre-absence matches; a user who comes back after a 120-day absence sees a curated active list). The hard-delete after 180 days is the data-minimisation floor: there is no reason to retain dead matches longer than that. Matches with at least one message follow a different retention policy, based on the activity of the chat itself.

---

### 80. Is Miamo's source available?

Miamo's source code is in a private GitHub repository (the monorepo). It is not open-source in the typical sense — we have not released it under an OSI-approved license. The documentation in `docs/` is source-available in the sense that it is part of the repository, but the repository as a whole is private. We have committed to releasing certain parts of the source — specifically the algorithm modules in `services/shared/src/algo/` — under a source-available non-commercial license, with the intent of making the algorithmic-transparency commitments verifiable by third parties. The release is targeted for v3.7 and has not yet happened.

The technical reason the algorithm release is delayed is that the algorithm code has tight dependencies on the schema and the shared libraries, and isolating the algorithm code from the rest of the codebase without breaking the dependencies is a non-trivial refactor. The plan is to extract the algorithm directory into a standalone package with a stable interface, publish the package under the source-available license, and maintain the package in sync with the production code. The intent is that an external auditor can read the algorithm code, verify the claims in [ALGORITHMS.md](./ALGORITHMS.md), and confirm the `// because:` comments match the implementation.

The product reasoning is that algorithmic transparency requires more than documentation; it requires verifiable code. The documentation can be wrong, can be out of date, can be selectively edited. The source code cannot lie about what it does. The source-available release is the strongest transparency commitment we can make short of full open-sourcing, which we have decided against because the rest of the codebase (auth, security primitives, payment) contains operational secrets we do not want to publish. The algorithm directory is the part where transparency matters most, and that is the part we will release. The timeline is best-effort.

---

### 81. How do I know if a profile is fake?

The platform's safety layer does the heavy lifting — fake profiles are flagged by the photo-moderation model, by behavioural fraud detection (rapid swiping, unusual session patterns, geographic inconsistency), and by user reports. Most fake profiles are caught within 24 hours of registration. For the ones that slip through, the user-visible signals are: very few photos (1-2), bio with grammatical patterns that suggest non-native authorship, mismatch between bio claims and profile photos, recently-created account with high outbound message volume, refusal to do a video chat. None of these signals are conclusive on their own; in combination, they are strong.

The technical mechanism is the fraud-detection pipeline in `services/social/src/server.ts` and the safety review queue (Question 38). The fraud signals are computed continuously by the tracking-worker and surfaced to the safety queue when a threshold is crossed. The video-chat check is not technically a fraud signal — we do not check whether two users have done a video chat — but the user-side signal is real: scammers consistently refuse video chats because they cannot maintain the false identity in real time.

The product reasoning is that the fake-profile problem is endemic to dating platforms, and no single layer catches everything. The defence-in-depth approach — phone-number floor, photo review, behavioural fraud detection, user reports, in-chat anti-scam patterns — is the practical compromise. We will never claim "no fake profiles on Miamo," because that would be untrue and would set the wrong expectation. We do claim that fake profiles are rare on Miamo, that they are removed quickly when detected, and that the platform takes the problem seriously. Users who suspect a profile is fake should report it (Question 38).

---

### 82. What's the SLA for support tickets?

Standard support tickets (questions, feature requests, bug reports) are responded to within 48 hours. Higher-priority tickets — safety reports, account compromise reports, billing disputes — are responded to within 24 hours (12 hours for billing, 4 hours for safety and security). The SLAs are real, measured, and reported internally as a team metric. We have hit the SLA on 98%+ of tickets since launch; the misses are typically over weekends or holidays, with the next-business-day catch-up. The grievance redressal officer (DPDP-mandated) has a 30-day legal SLA but in practice responds within 7 days.

The technical mechanism is the support inbox routing in our internal tooling. Tickets are tagged at intake (by the user via the in-app form or by the support agent via inspection), routed to the appropriate priority queue, and SLA-tracked. The SLA-miss notifications fire to the team Slack at the 75% and 95% thresholds, with the on-call engineer expected to acknowledge and resolve. The support metrics are part of the weekly team review.

The product reasoning is that support response time is the single best predictor of user-perceived quality. The aggressive SLAs are the floor we have committed to. The price of the floor is that we cannot scale support headcount unboundedly — we currently have one founder doing support part-time, with a part-time contractor for surge. The SLA is the constraint on how many users we can serve; the SLA is also the commitment we have made to the users we do serve.

---

### 83. Why is there no chat with the founders?

There is, actually. Every new user is automatically matched with a Founder Welcome chat on day 1 of registration. The chat is a one-way welcome message from the founders introducing the product and inviting feedback. Users can reply to the chat; the replies are read by the founders within 48 hours and are responded to. The chat is not a support channel (Question 82 is the support route), but it is a direct feedback channel. The volume is currently manageable — about 50 replies per week, which is one founder's part-time read.

The technical mechanism is a system-user account (`User.id = 'founder-welcome'`) that auto-creates a `Match` and a `Chat` with each new user on registration. The welcome message is a templated message, with light personalisation (the user's first name). Replies route to the founders' inbox via a webhook that posts to Slack. The founders read and reply directly, signed with their actual names so users know they are talking to a person.

The product reasoning is that the founder-feedback channel is the highest-trust signal we have. Users who reply to the Founder Welcome chat are disproportionately the users who care, and their feedback is the most signal-dense feedback we get. The volume will eventually become unmanageable — at 100k users with 1% reply rate, that's 1000 replies a week, which is too much for two founders to read — and we will have to evolve the channel (perhaps to a curated weekly summary). For now, the direct read is the practice.

---

### 84. What's the difference between Notifications and the in-app inbox?

Notifications are the push-alerts your phone shows on the lock screen — when you have a new match, when you get a message, when your Move composer suggestions are ready, when your Weekly Top-10 lands. The in-app inbox (the bell icon in the app) is the persistent record of these notifications — you can scroll back through the last 30 days of notifications to see what you might have missed. The two are linked: every push notification also writes a row to the `Notification` table, which is what the bell-icon inbox reads from.

The technical mechanism is the notifications service (`services/notifications/src/server.ts`). The service receives events from the other services (new match from matchmaking, new message from messaging, etc.), composes the notification, fires the push via APNS / FCM, and writes the row to `Notification`. The bell-icon inbox is read from the same table via `/api/v1/notifications/inbox`. The push fire is gated by the user's notification preferences (per-channel toggles in Settings) and by the chronotype-aware timing (Question 48).

The product reasoning is that notifications are the most-frequently-cited reason users disable an app on their phone, and getting them right is high-leverage. The chronotype-aware timing is one piece. The per-channel granularity is another — users can disable Move-composer notifications while keeping match notifications, or vice versa. The persistent inbox is the safety net for missed pushes: a user who has notifications off can still see what was missed when they open the app. The inbox is also the surface for "soft" notifications that we do not push (e.g. "your profile completion is 60%, finish to improve your matches"), which would be too noisy as pushes but are useful as in-app reminders.

---

### 85. How does Miamo handle profile photos?

Photos are uploaded via the photo-upload endpoint in `services/users/src/server.ts`, scanned by the in-house content-moderation model for explicit content and obvious meme images, resized to multiple resolutions (a thumbnail for the feed, a medium for the profile card, a high-res for the photo-tap-enlarge), encrypted at rest with the same master-key infrastructure as the chat messages, and served via signed URLs from the photo CDN. Each user can upload 3 to 6 photos. The first photo is the primary (shown in the feed); the others are shown on the profile page in order. The user can reorder, replace, or delete photos at any time.

The technical mechanism is the photo pipeline. Upload is multipart-form to the `/api/v1/users/me/photos` endpoint. The moderation model is a small in-house classifier (we evaluated AWS Rekognition and Google Vision and decided against them for the same data-sharing reasons as Question 21). The resize uses sharp (Node.js image library) and produces 3 resolutions: 256x256 thumbnail, 1024x1024 medium, 2048x2048 high-res. The encryption is AES-256-GCM with a per-photo key derived from the master key. The CDN serving is Cloudflare with signed URLs (24-hour TTL). The photo records are in the `ProfilePhoto` table with a `sortOrder` field for the user's chosen ordering.

The product reasoning is that photos are the highest-signal element of a profile and the highest-cost element to get wrong. The moderation is real (we do reject photos), the encryption is real (a database compromise does not expose plaintext photos), the signed-URL serving is the standard pattern, and the user control over ordering is the polish. The photos are not used for any algorithmic purpose beyond the moderation check — we do not extract facial features for matching, we do not score "attractiveness," we do not compute photo-vector embeddings for ranking. The choice was deliberate: the algorithmic use of photos would open privacy and bias concerns that the user-visible benefit does not justify.

---

### 86. What does Miamo log internally?

We log: every API request (method, path, status code, response time, request ID, user hash), every authentication event (sign-up, sign-in, OTP attempt, password change, account lock), every consent change (the toggle that changed, the old value, the new value), every safety action (report, warn, suspend, ban), every premium-tier change (upgrade, downgrade, cancellation), every algorithm-ramp event (flag percentage change, ranker switch), and every privileged read of a user's data (a support agent reading a chat, a safety reviewer decrypting a message). We do not log: chat message content (only the metadata), profile content (only the changes), tracking events at the raw level (only the aggregates).

The technical mechanism is the request-tracing middleware described in [SECURITY §8](./SECURITY.md#section-8--request-tracing) and the audit-log architecture in [SECURITY §13](./SECURITY.md#section-13--audit-log). The request log goes to stdout-then-Vector-then-Loki for searchability. The audit log goes to the `AuditLog` table in Postgres with structured fields. The retention is 90 days for request logs, 24 months for audit logs. The PII redaction in logs is real and enforced (raw `userId` is never logged; the hash is; raw emails are redacted to `<redacted-email>`).

The product reasoning is that internal logging is the foundation for debugging, for security incident response, and for the compliance audits. The retention is the trade-off between visibility into past behaviour and minimisation. The PII redaction is the floor — we want a log that, if leaked, does not constitute a privacy incident on its own. The audit log is the higher-grade record that survives longer and includes more structure; the request log is the operational record that is heavier on volume but lighter on retention. Both are accessible to the team via the internal log-search tooling.

---

### 87. Can I have a video chat with my match?

Not yet. Video chat is on the v3.7 roadmap. The current chat surface is text-only with optional photo and audio-clip attachments (audio clips up to 60 seconds). Video calls would require either an integrated WebRTC stack (significant engineering investment) or an integration with a third-party video service (which raises the data-sharing concerns of Question 21). We have evaluated both paths and have not committed to either yet.

The technical considerations: WebRTC integration would mean building a SFU (selective forwarding unit) or partnering with one (Jitsi, LiveKit, Agora). The SFU is the heavyweight option. The lightweight option is a third-party SDK, which would route the video traffic through their servers and create a data-sharing relationship. The middle option is end-to-end-encrypted peer-to-peer WebRTC, where the traffic does not transit Miamo's or a partner's servers, but the signaling does — this is the option we are most likely to ship in v3.7.

The product reasoning is that video chat is a real safety and trust feature — it lets users verify the other party is real before meeting in person. It is also a feature with high engineering complexity and high abuse potential (recorded videos of minors, deepfake video calls, etc.). The deliberate decision to delay video chat is the bet that getting it right is worth more than shipping it fast. Users who want video chat today are advised to move the conversation to a third-party platform (Google Meet, Zoom, WhatsApp video) after they have built trust via the Miamo text chat. The advice is informal but consistent.

---

### 88. What's the difference between Bookmark and Save?

Bookmark and Save are two distinct affordances. **Bookmark** is the DTM-side "I want to think about this person more, surface them again tomorrow" action. It writes a `DeferredItem` row tagged `dtm.deferred`. Tomorrow's DTM screen surfaces the bookmarked person at the top, before any new curated match. The bookmark expires after 7 days if not acted on. **Save** is the Discover-side "I want to revisit this profile later, but not now" action. It writes a `Bookmark` row tagged `discover.saved`. The saved profiles appear in a separate "Saved" tab in Discover, accessible from the menu. The save does not expire and does not affect the algorithm.

The technical mechanism is two different tables — `DeferredItem` for DTM-side defer-and-resurface, `Bookmark` for Discover-side save-to-list. The two have different semantics: DTM defer is part of the slow-evaluation loop and is part of the algorithm (the DTM ranker re-surfaces the deferred items first), while Discover save is a user-side bookmark list with no algorithmic effect. The naming is a product-evolution artefact — both could be called either "bookmark" or "save," but the team settled on Bookmark for DTM (because the connotation is "considered, deferred") and Save for Discover (because the connotation is "noted, listed").

The product reasoning is that the two surfaces have different decision rhythms — DTM is one-curated-match-a-day with slow evaluation, Discover is many-profiles-fast-scan — and the defer-and-resurface affordance is different from the save-to-list affordance. The DTM Bookmark is part of the algorithm's slow-loop; the Discover Save is a user-controlled list. The two are intentionally not unified into a single concept, because conflating them would either make Discover too slow or DTM too list-y.

---

### 89. Why doesn't Miamo have a karma or trust score?

Because karma and trust scores tend to become the algorithmic gate that excludes new or low-engagement users from the platform, and we do not want that. Most platforms with karma scores (Reddit's karma, eBay's seller rating) use the score as a permission gate — you can post, you can sell, you can be visible, only above some threshold. The Spotlight ledger could become such a gate, and we have deliberately constrained it to be a multiplier (Question 14) rather than a gate. The multiplier is 1.0x for free users with no Spotlight, 1.5x for premium with no Spotlight, and can rise to a few-x for high-Spotlight users — but it is never zero, and there is no threshold below which a user is invisible.

The technical mechanism is the floor on the exposure-credit award computation: `award = max(baseAward, baseAward * multiplier)`, where the multiplier is bounded above (1.5x for premium, no cap for Spotlight balance) but the baseAward is constant and non-zero. The floor is 1.0 on every render: a user with zero Spotlight balance still appears in candidate pools at the baseline rate. We have audited the algorithm to confirm no path can produce a 0.0 award; the audit is a unit test in `exposureCredits.test.ts`.

The product reasoning is that the algorithmic gate is the failure mode that converts a young user with a sparse profile into an invisible user with no path to engagement. We have chosen to keep the floor and use the multiplier as the polish lever. The trade-off is that bad-faith users (low-quality engagement, spammy behaviour) can still appear in feeds; the answer to bad-faith is the safety layer (report, suspend, ban), not the visibility layer. Separating the two is the architectural commitment.

---

### 90. What is a typical week of Miamo usage?

For a typical active user: Monday-Thursday evenings, 10-20 minutes of Discover scrolling with 5-15 like / pass decisions per session. Friday evening: a longer session, 30-45 minutes, with the Move composer used to send 1-2 first messages to recent matches. Saturday: lighter usage, maybe a single 15-minute session, often with a DTM check-in. Sunday morning: the Weekly Top-10 notification at 9am, opened within 2 hours by 70% of users, with the user evaluating the 10 profiles over coffee. Sunday evening: a 20-minute session with replies to messages received during the week, often the Move composer used again for thoughtful replies.

The technical data backing this comes from the `SessionSummary` aggregates over the last 30 days. The patterns are consistent across user cohorts, with the strongest variance being the day-vs-evening split (some users are morning-app users, some are evening-app users) and the casual-vs-serious split (DTM-enabled users have longer DTM sessions and shorter Discover sessions). The Sunday-morning Weekly Top-10 is the highest-engagement moment of the week; the Wednesday-evening Discover session is the second-highest.

The product reasoning is that the rhythm-of-week is a deliberate product output. The Weekly Top-10 creates the Sunday-morning ritual. The Discover surface creates the weeknight scroll. The DTM surface creates the slower weekend evaluation. The composer creates the weekend-message ritual. The rhythm is what we are optimising for, more than the per-session minute count. A user who has a stable weekly rhythm with Miamo is a user who has integrated the app into their relationship-search practice, and the rhythm is the metric that correlates most strongly with long-term match outcomes.

---

## Appendix F — The architectural commitments

This appendix summarises the architectural commitments that are referenced throughout the FAQ and the rest of the documentation. They are the load-bearing decisions that determine what Miamo is.

1. **Eleven services, one Postgres.** The monorepo is divided into eleven services by bounded context. The shared Postgres is the single source of truth. Cross-service consistency is via the database, not via distributed transactions. See [ARCHITECTURE.md](./ARCHITECTURE.md).

2. **HMAC-pseudonymised tracking.** The tracking pipeline never stores raw `userId`. The hashing is keyed by a secret rotated as part of the RTBF lever. See [SECURITY §3.3](./SECURITY.md#33-tracking-pseudonymisation-hmac-sha256) and Question 20.

3. **AES-256-GCM chat encryption.** Chat messages are encrypted at rest with per-chat keys derived from a master key. The team cannot read chats out-of-band. See [SECURITY §3.1](./SECURITY.md#31-chat-message-encryption-aes-256-gcm) and Question 17.

4. **Four consent toggles.** Mood inference, behavioural ranking, cross-user inference, algorithmic transparency. Each is a single switch with documented semantics and a default state. See [SECURITY §11](./SECURITY.md#section-11--the-four-consent-toggles) and Question 12.

5. **Earned visibility, capped at 1.5x.** The Spotlight ledger is the visibility economy. Premium gets a 1.5x multiplier. No higher tier exists. See [PRODUCT §3.4](./PRODUCT.md#34-earned-visibility) and Question 14.

6. **Anti-ghost as economy.** First-message deposits, reply bonuses, forfeit burns. The incentive structure is part of the product. See [ALGORITHMS §3.D.3](./ALGORITHMS.md#3d3-antighostts--depositreply-bonusburn-economy) and Question 9.

7. **DTM separate from Discover.** Two sides, two surfaces, two rankers, two anti-ghost rules. See [PRODUCT §5](./PRODUCT.md#5-the-deep-compat-side--dtm-family-brief-the-matrimonial-layer) and Question 37.

8. **No caste in the algorithm.** The field exists for cultural completeness; the algorithm cannot read it. Enforced by a unit test. See [PRODUCT §5.6](./PRODUCT.md#56-why-caste-is-in-the-schema-but-never-in-the-algorithm) and Question 34.

9. **Phone-number identity floor.** One phone, one account. The basis for safety. See Question 70.

10. **Feature flags for every change.** Default OFF, ramp 0%→100% over weeks, rollback in 30 seconds. See Question 28.

11. **Triple-secret RTBF lever.** Account deletion is cryptographic destruction, not soft-delete. See [SECURITY §3.4](./SECURITY.md#34-the-triple-secret-rtbf-lever) and Question 19.

12. **30-day pass exclusion, not permanent.** Passed profiles are eligible to reappear after 30 days, not before. See Question 3.

13. **No third-party SDKs in the client.** No Facebook, Google Analytics, Mixpanel, Amplitude, AppsFlyer, Adjust, Branch. In-house analytics. See Question 21.

14. **No advertising.** Subscription only. The position is in [PRODUCT §6.11](./PRODUCT.md#611-no-selling-user-data-to-third-parties) and Question 23.

15. **18+ only.** Hard floor. No minor accounts. See Question 57.

16. **`db push` forbidden in production.** Migrations only. CI gate enforces it. See Question 33.

17. **The bootstrap-trap rule.** Restart after env changes. See Question 31.

18. **No facial recognition.** Phone-number floor + photo review is the safety layer. See Question 75.

19. **Per-surface rankers, per-generation versioning.** v6, v7, v8 coexist, independent per surface. See Question 77.

20. **24-month audit log retention.** Every privileged read is logged. See [SECURITY §13](./SECURITY.md#section-13--audit-log) and Question 86.

These twenty commitments are the architectural floor. They are not all equally important — some (like #1) are large structural decisions, some (like #17) are operational notes. Together they describe the product.

---

## Appendix G — Closing thoughts on the FAQ format

The FAQ format is the writing format with the highest signal-to-noise ratio for explaining a product to users, journalists, and engineers. The two-to-three-paragraph answer per question keeps the depth manageable and the structure scannable. The plain-English-first-then-technical pattern serves both the user who wants the quick answer and the engineer who wants the why.

We have chosen to make this FAQ long — 90 questions, multiple appendices — because the product has positions, and the positions deserve documentation. A shorter FAQ would invite the kind of "but what about X?" follow-up that this longer FAQ tries to pre-answer. The investment in length is the bet that the FAQ is read more than once and is referenced as the canonical answer source.

If you have suggestions for additional questions, please open an issue in the repository with the question and your context for why it matters. The FAQ is a living document and we update it whenever the answer would benefit more than one user. The version of this FAQ is tied to the product version; v3.6.0 is the current state. The next major update will accompany the v3.7 release, currently targeted for late 2026.

---

## Appendix H — Long-form scenarios

This appendix walks through several extended scenarios that illustrate how the product behaves end-to-end. Each scenario is a single user's experience, traced through multiple surfaces and multiple sessions, with the relevant FAQ questions cross-referenced.

---

### H.1 — Priya's first month on Miamo

**Day 1 (Monday, January 5, 2026).** Priya, 26, an architect in Mumbai, installs Miamo on the recommendation of a friend. She is on the casual side of looking — not ready for marriage-track, but bored of Hinge. She opens the app. Sign-up: phone number, OTP, name, date of birth. The DOB check (Question 57) confirms she is 26. She is in. The onboarding flow (Question 65) begins.

The 12-question onboarding takes Priya 6 minutes. She picks "casual" for intent (declines DTM opt-in), picks 4 photos, answers the 7 vibe-vector seed questions (she scores curious, creative, thoughtful, social — a quadripole personality), picks her chronotype as "evening" (she feels most alive after 9pm), and lands on the consent screen (Question 61). She taps Continue, accepting the defaults: mood inference OFF, behavioural ranking ON, cross-user inference ON, transparency ON. She is in.

The Discover surface loads with her first batch of 10 profiles. The ranker (v6 because she is in the 80% cohort that gets v6 by default; v7 is at 15% and v8 at 5% as of v3.6.0) produces a feed ranked by her vibe-vector cosine, geo proximity, and recency. She likes 2, passes on 7, saves 1 (Question 88). The Save (a Bookmark row) will sit in her Saved tab.

**Day 2 (Tuesday).** She gets a notification at 7:30pm: a match. Arjun, 28, designer, lives in Bandra. She had liked him on day 1. He liked her back. The chat opens, empty. She taps the suggest button on the chat composer. The Move v2 composer (Question 5) loads. It is her first time using it, so the senderVoice profile is empty — the composer uses the receiver-resonance only, since she has not sent enough messages for a fingerprint. Five drafts appear. She picks the one with the "recent_post" hook ("I saw your post about the Bombay Tinplate Co. — I walked by that building last weekend and didn't know it was a heritage site. What other Mumbai buildings should I look at?"). She edits a single word and sends. It is a Move (Question 43), written to the `MiamoMove` table.

The anti-ghost system (Question 9) takes 1 Spotlight minute from her balance as a deposit on the new chat. Her balance was 0 before the deposit; she is now at -1. The system allows negative balances on the deposit step; the burn comes only if the 72-hour timer fires. She does not notice the deposit explicitly; the chat composer flow does not break stride for the deposit notification.

Arjun replies 14 hours later. The anti-ghost resolve fires: +2 to Priya's balance (deposit returned + bonus). She is now at +1. She sees the credit in the Spotlight Ledger (Question 11, Question 68). The chat continues for a week.

**Day 7 (Sunday, January 11).** Priya gets the Weekly Top-10 notification at 9am (her chronotype is evening, but Top-10 is fixed at 9am local by default in v3.6.0 — there is a known issue that the chronotype is not yet read by the Top-10 worker; this is on the v3.7 roadmap). She opens the app over coffee. Ten profiles, ranked by the Gale-Shapley stable-match (Question 8). She likes 3, passes on 7. She does not yet have a fingerprint or any DTM history, so the Top-10 is weighted heavily on the vibe-vector and the geo signal.

**Day 14 (Sunday, January 18).** Second Weekly Top-10. By now Priya has 8 matches and is in active conversation with 3. The Top-10 is noticeably better-fit because the algorithm has 2 weeks of her behaviour. She likes 5 of the 10, which is the highest like-rate she has had on any Discover batch.

**Day 20 (Saturday, January 24).** Priya has sent 47 outbound messages across her chats. She is approaching the K=50 threshold for the Voice Fingerprint (Question 6).

**Day 22 (Monday, January 26 — Republic Day).** Republic Day is a festival window in the festival hooks (Question 55). Priya's feed has a small boost on profiles that have Republic-Day-themed Creativity posts; she does not notice the boost explicitly, but she does notice that the feed feels "festive" — there are more profiles with patriotic content, more references to long-weekend plans.

**Day 23 (Tuesday).** Priya sends her 50th outbound message. The Voice Fingerprint card appears in her app. It reads: "You write in lowercase, lean playful, and code-mix Hinglish about 12% of the time. Your average message is 7 words. You ask a lot of questions. You use emojis sparingly, mostly the smirk and the eye-roll." She taps Share-to-Instagram. The card goes to her IG story.

She also notices that her next Move composer draft is in the same voice — lowercase, light Hinglish, mid-sentence emojis. The composer has updated to use her fingerprint (Question 5).

**Day 28 (Sunday, February 1).** Fourth Weekly Top-10. By now Priya has a 4-week behavioural profile. The Top-10 is notably calmer — closer geo, more vibe-vector-similar profiles. She has been in active conversations with the same 3 users for 3 weeks, so the algorithm has learned that she values depth over breadth. She likes 7 of the 10.

**End of month 1.** Priya has used Miamo every weekday evening and most Saturday evenings. She has 12 matches, 4 active conversations, 1 user she has met in person, 0 reports filed, 0 reports against her, balance of +14 Spotlight minutes, and the Voice Fingerprint shared once. She is the canonical engaged-casual-user pattern.

The aggregate per-day average for her: 14 minutes of app usage, 18 Discover decisions (likes + passes + saves), 6 messages sent, 4 messages received. The patterns are stable across the second half of the month, suggesting her usage has stabilised into a real rhythm.

---

### H.2 — Karan's first month on premium

**Day 1.** Karan, 31, working in finance in Bangalore, looking for a serious match. Installs Miamo. Picks "serious" for intent. Opts into DTM. The MatrimonialProfile flow adds 8 additional onboarding questions (education detail, profession detail, family detail, kundli, partner preferences). The flow takes him 14 minutes total.

**Day 2.** Karan upgrades to premium on day 2. He has used Hinge premium before and is comfortable with the value proposition. The premium upgrade is via Razorpay; the StoreKit webhook fires, his `premiumTier` is updated, the 1.5× multiplier (Question 14) is active.

**Day 3.** Karan starts a new chat with Riya (26, designer in Bangalore, matched on day 2). He composes a Move; the anti-ghost deposit takes 1 Spotlight minute (with premium, his balance is +1 from the daily premium credit; he goes to 0 after the deposit). Riya replies in 14 hours. The deposit returns +2; he is at +2.

**Day 5.** Karan tries the DTM tab. He has answered 3 of the 16 DTM topics during onboarding (lifestyle, values, family); the cold-start gate (Question 10) requires coverage ≥ 0.5 (8 of 16 topics) before curated matches are surfaced. The DTM tab shows him a "complete more topics to see your first curated match" prompt with the day's depth question highlighted. He answers it. Coverage rises to 4/16.

**Day 10.** Karan has answered 8 of 16 topics. The DTM gate opens. He sees Yash (a match suggestion based on his coverage so far). He reads Yash's profile in depth (15 minutes — the depth-of-engagement signal at Question 54 reads this as a deliberate inspection). He bookmarks Yash for tomorrow (the DTM Bookmark, Question 88), a DeferredItem row.

**Day 11.** The DTM screen surfaces Yash at the top. Karan reads again. He taps the clipboard icon for Family Brief (Question 7). He picks Image. The bio-data card is generated. He shares to WhatsApp → Mom. The Family Brief row is written, the 7-day TTL starts.

**Day 14.** Yash replies to the chat Karan started. The anti-ghost return fires; Karan's premium-multiplier-weighted credit (1.5 × 2 = 3) lands. His balance is now 18 (1 per premium-day for 14 days, minus deposits, plus returns and bonuses, with the 1.5x multiplier applied to each award).

**Day 18.** Karan's mom replies on WhatsApp: "He looks nice. Where is his family from?" Karan replies. The Family Brief link in the WhatsApp share is still active (within the 7-day TTL). Mom did open the link on day 12, which was within the window. The view count on the FamilyBriefShare row is 1.

**Day 21.** Karan files his first report — a profile he is reasonably sure is fake (Question 81). The safety queue picks it up within 24 hours; the profile is reviewed and removed.

**Day 25.** Karan has 6 active DTM conversations (one of which is Yash, going well). He has 14 Discover matches but only 2 active conversations on the Discover side. His use pattern is shifting toward DTM. The algorithm picks up the pattern; the right-now intent classifier (Question 51) starts producing higher probability on `serious_search` for his sessions.

**End of month 1.** Karan has Spotlight balance +24 (premium daily credits + earned credits, minus burns), 6 active DTM conversations, 1 person he has talked to on the phone, has used the Family Brief twice, has filed 1 safety report, has answered 12/16 DTM topics. He is the canonical engaged-serious-premium-user pattern.

The aggregate: Karan spent 280 minutes total on Miamo in the month, vs Priya's 420 minutes — Karan's per-session is longer (he uses DTM, which is slow) but his sessions are fewer. The premium economics: Karan paid ₹599 for the month; we delivered him 6 active conversations including 1 phone call, which by his own report at the end of the month justifies the price.

---

### H.3 — Sara's polarity loop and recovery

**Setup.** Sara, 29, in Pune, has been on Miamo for 3 months. She is in a stable rhythm. One Friday evening she opens the app at 8pm after a long, frustrating work week.

**Profile 1, 8:01pm.** Pass after 3 seconds. The bio mentioned "hustle" and Sara is tired of hustle.

**Profile 2, 8:01pm.** Pass after 2.5 seconds. Looks too similar to her ex.

**Profile 3, 8:02pm.** Pass after 2 seconds. Bio is grammatically odd; she suspects fake.

**Profile 4, 8:02pm.** Pass after 1.8 seconds. Just no.

**Profile 5, 8:02pm.** Pass after 1.2 seconds.

The polarity classifier (Question 53) registers the pattern at profile 5: 5 passes in 60 seconds, decreasing dwell. The polarity score crosses -0.5 into `hate_scroll` territory.

The reranker activates cool-off mode. The next batch of 10 profiles is fetched with: wider geo (Pune metro + Mumbai, vs Pune-only), different vibe-vector cluster (less "ambitious," more "grounded"), lower novelty (no brand-new profiles), and the auto-advance is replaced with a manual "next" tap.

**Profile 6, 8:03pm.** The first profile in the cool-off batch. Sara looks at it for 9 seconds before passing. The dwell increased.

**Profile 7, 8:04pm.** 14 seconds. The bio is interesting; she taps "see more." She passes anyway, but the polarity score recovers by another increment.

**Profile 8, 8:05pm.** 22 seconds. She likes this one.

The polarity score is now -0.2, no longer hate-scroll. The cool-off mode deactivates over the next 3 decisions (it ramps off gradually, not abruptly, to avoid whiplash). Sara's session continues for another 18 minutes; she likes 4 more profiles and saves 1.

She closes the app at 8:23pm. She does not consciously notice the cool-off intervention. She just feels "the app feels less frustrating tonight than it did at 8pm." The intervention's success metric is the "did the user stay" metric: she stayed. She would have closed the app at 8:03pm without the intervention.

Sara's mood-inference toggle is OFF (she has never turned it on), but the polarity intervention is gated by the `behavioralRanking` flag, which is default ON. The polarity-specific intervention does not require mood inference; it requires only the click pattern, which is universally available. The cool-off mode is therefore available to all users who have not turned off behavioural ranking. Sara is in this set.

---

### H.4 — Rohan's account compromise and recovery

**Day 1, Wednesday afternoon.** Rohan, 33, in Delhi, gets an unusual notification on his phone: "Welcome to Miamo." He has been a user for 7 months. The notification is the first-time-welcome notification, which means someone has just signed up with his email. Rohan investigates.

**Day 1, 3:45pm.** Rohan opens Miamo. He can log in. His chat list is intact. His profile is intact. He checks Settings → Sessions; there is an active session from a device he does not recognise, located in Indonesia. He has not been to Indonesia recently.

**Day 1, 3:48pm.** Rohan emails `security@miamo.app`. The team responds in 32 minutes, within the 4-hour SLA (Question 82).

**Day 1, 4:20pm.** The team locks Rohan's account (he is told to expect this). His active sessions are invalidated; the JWT refresh tokens are revoked. He cannot log in for 20 minutes while the audit log is reviewed.

**Day 1, 4:40pm.** The audit log review finds: the attacker created a new session via OTP (the OTP was likely SIM-swapped or social-engineered from Rohan's phone provider — the team confirms this with Rohan separately). The attacker sent 4 messages in 3 chats. The attacker changed Rohan's profile photo to an image of a luxury watch (a typical scam pattern). The attacker did not change the email or the phone number, did not delete the account, did not upgrade to premium.

**Day 1, 4:50pm.** Rohan is shown the suspicious actions. He confirms: the 4 messages are not his, the photo change is not his. The reversal flow runs: the messages are marked "sent under compromise" in the chat history with a visible note ("This message was sent by an attacker, not by Rohan. Rohan has been notified and the account has been secured."). The photo is reverted to the previous version.

**Day 1, 5:00pm.** Rohan re-authenticates with a fresh OTP. The OTP is sent to his phone (which is now back under his control after the SIM-swap was reversed by his provider). He logs in. The 3 affected users (whom the attacker had messaged) receive an apology message via the system-user account, with the explanation that the prior messages were sent under compromise. None of the 3 affected users had replied to the attacker's messages, so the abuse was limited.

**Day 1, 5:30pm.** The team offers Rohan a free 1-month premium extension (Question 76). He accepts.

**Day 2.** Rohan continues using the app. He sets up the 2FA (which he had not done before — 2FA is opt-in, not default-on in v3.6.0). His mood-inference toggle is now OFF (he turned it off after the incident, on the principle of reducing the platform's data footprint of him), which the algorithm will pick up over time.

The incident is logged to the AuditLog table for compliance retention. The post-mortem is written up and reviewed by the team. The pattern (SIM-swap + new device + new session) is added to the fraud-detection model's training set, so future similar attempts are flagged faster.

---

### H.5 — Ananya's deletion

**Day 1, Sunday evening.** Ananya, 27, in Chennai, has been on Miamo for 4 months. She has met someone (off Miamo, through a college friend), and they are in a serious relationship. She decides to delete the app.

**Day 1, 9:15pm.** Ananya opens Settings → Account → Delete Account. The confirmation flow asks twice: "Are you sure?" "This is irreversible. Are you sure?" She taps Confirm both times. The deletion request is queued.

**Day 1, 9:16pm.** Ananya's account is marked `deletionRequestedAt = now`. Her active sessions are revoked. She is logged out.

**Day 2.** The deletion worker picks up the request. It runs the 6-step flow (Question 19): (1) account flagged, (2) profile anonymised — name becomes "Deleted User," photos removed, bio cleared, (3) encryption keys burnt — her chats are now unreadable to anyone including the team, (4) matches and likes hard-deleted, (5) tracking aggregates HMAC-hash-burnt — her past behaviour can no longer be linked to her, (6) `userDeleted` event written to the audit log with her original `userId` and the deletion timestamp.

**Day 3.** Ananya's previous matches see her chat as "Deleted User" with the chat history visible but empty (because the messages are encrypted with keys that no longer exist). They can no longer message her. The chats are not deleted from their side — they retain the empty shells — because we do not modify other users' chat lists when one party deletes.

**Day 30.** The DPDP 30-day SLA passes (Question 19). Ananya's deletion is complete. Her data is gone except for the audit-log record, which will be retained for another 23 months before its hard-delete.

**Day 60.** Ananya is happily in her off-Miamo relationship. She does not think about Miamo again until 6 months later, when she sees an article about the v3.7 release and idly wonders if she should try the app again. The decision is up to her; her old account is gone, but she can register fresh anytime.

The deletion is the test case for the privacy posture. The team has done it on test accounts dozens of times to verify the cryptographic destruction works. The team has done it on real user accounts hundreds of times now. The audit log record is the proof that the deletion happened; the absence of any other record is the proof that the deletion was real.

---

## Appendix I — A glossary of metrics

Throughout the FAQ and the rest of the documentation, several metrics are referenced. This appendix defines them.

- **Daily active users (DAU)**: unique users who completed at least one authenticated request in the calendar day, in the user's local timezone. As of June 2026, ~12,000.
- **Weekly active users (WAU)**: unique users who completed at least one authenticated request in the calendar week, in the user's local timezone. As of June 2026, ~28,000.
- **Monthly active users (MAU)**: same, monthly. As of June 2026, ~52,000.
- **First-reply rate**: fraction of first messages (Moves) that receive a reply within 72 hours. As of v3.6.0, 0.41 on the Move-v2 cohort vs 0.12 on the v3.5 generic-opener baseline.
- **7-day match retention**: fraction of matches that still have an active chat 7 days later. As of June 2026, 0.38 platform-wide, 0.52 in the DTM-enabled cohort.
- **30-day match retention**: fraction of matches that still have an active chat 30 days later. 0.18 platform-wide, 0.34 in DTM.
- **Sunday Top-10 open rate**: fraction of users who open the Weekly Top-10 within 2 hours of the 9am notification. 0.70.
- **Spotlight balance**: per-user signed integer representing the user's earned visibility credit. Free users average +2 weekly; premium users average +12 weekly with the 1.5× multiplier.
- **Polarity score**: per-user real number in [-1, 1] representing the positive-interest-vs-hate-scroll dimension. Computed from the last 5 decisions.
- **Mood vector**: per-user 5-dim normalised vector (calm, curious, fatigued, social, frustrated). Computed every 5 minutes from the last 30 minutes of behaviour. Special-category data; default-OFF consent.
- **Right-now intent**: per-user 7-class probability distribution. Computed every 5 minutes.
- **Vibe vector**: per-user 7-dim L2-normalised vector (creative, adventurous, thoughtful, social, ambitious, grounded, curious). Set from onboarding, refined by behaviour.
- **Chronotype prior**: per-user 24-element vector representing time-of-day activity rhythm.
- **DTM coverage**: fraction of the 16 DTM topics for which the user has provided an answer. Below 0.5 is cold-start.
- **Voice Fingerprint stability**: cosine similarity between K=50 fingerprint and K=100 fingerprint. 0.94 average — the K=50 fingerprint is stable.
- **Premium conversion**: fraction of new users who upgrade to premium within 14 days. 0.062 as of June 2026.
- **Premium retention (1 month)**: fraction of premium subscribers who renew at the 1-month mark. 0.81.
- **Report-to-action time**: median time from report submission to safety action. 4 hours for harassment, 18 hours for spam.
- **Deploy frequency**: number of production deploys per week. Mean 5.4 across the v3.6.0 release window.
- **Deploy rollback rate**: fraction of deploys that result in a rollback within 24 hours. 0.04 (1-in-25, all internal-only issues).
- **Test suite pass rate at PR merge**: fraction of PRs that pass typecheck + fast vitest + full vitest on first attempt. 0.78 (the remaining 22% fail at least one gate and are re-pushed).

These metrics are the dashboard. The dashboard is reviewed weekly by the team. The weekly review is the forcing function that keeps the metrics visible and the trade-offs explicit.

---

## Appendix J — Final notes

The FAQ is intended to be the canonical user-facing answer source for the most-asked questions about Miamo. It is also intended to be a self-contained introduction to the product for new readers — engineers joining the team, journalists writing about the platform, regulators auditing the practice, users curious about the underlying philosophy.

The FAQ is not a substitute for the underlying documents. Engineers should read [ARCHITECTURE.md](./ARCHITECTURE.md), [DATA_MODEL.md](./DATA_MODEL.md), and [ALGORITHMS.md](./ALGORITHMS.md) in full. Security reviewers should read [SECURITY.md](./SECURITY.md) in full. Product reviewers should read [PRODUCT.md](./PRODUCT.md) in full. The FAQ is the index; the canonical sources are the body.

The version of this FAQ is 1.0, dated 2026-06-25, against product version 3.6.0. The next major update will be the v3.7 release, currently targeted for late 2026. Between major updates, individual questions may be revised with a per-question timestamp; the changelog at the top of the file will note all such changes.

If you have read this far, thank you for the attention. The FAQ is long because the product has positions; we have tried to make the positions legible without being preachy and to make the answers complete without being exhausting. We hope the document is useful. If it is not, please open an issue with the specific feedback and we will revise.

---

## Appendix K — Technical reference: code paths cited in this FAQ

For engineers using the FAQ as a navigation aid into the codebase, this appendix lists the canonical code paths cited in this document.

**Algorithms (`services/shared/src/algo/`)**:
- `algo/registry.ts` — the ranker registry; source of truth for which ranker serves which surface (Question 25)
- `algo/forYou.ts` — v3.5 baseline Discover ranker (Question 60)
- `algo/forYouV6.ts` — v6 Discover ranker (Question 47)
- `algo/dtm.ts`, `algo/dtmV6.ts`, `algo/v7/dtmFeedV7.ts` — DTM ranker family (Question 10)
- `algo/v8/moveV2/senderVoice.ts` — voice fingerprint (Question 6)
- `algo/v8/moveV2/receiverResonance.ts` — receiver-side resonance reading (Question 5)
- `algo/v8/moveV2/hookLibrary.ts` — falsifiable hook catalogue (Question 5)
- `algo/v8/moveV2/codeMix.ts` — language family detection (Question 36)
- `algo/v8/moveV2/composer.ts` — five-suggestion orchestrator (Question 5)
- `algo/v8/exposureCredits.ts` — Spotlight ledger award logic (Question 11)
- `algo/v8/galeShapley.ts` — Weekly Top-10 stable match (Question 8)
- `algo/v8/fairnessRerank.ts` — Singh-Joachims fairness rerank (Question 8)
- `algo/v8/festivalHooks.ts` — regional festival booster (Question 55)
- `algo/v8/polarity.ts` — positive vs hate-scroll detection (Question 53)
- `algo/v8/depthOfEngagement.ts` — accidental vs deliberate inspection (Question 54)
- `algo/v8/dtmTopicMask.ts` — mood + coverage + night-shopping topic gate (Question 4)
- `algo/v8/antiGhost.ts` — deposit/return/burn economy (Question 9)
- `algo/v8/moodRightNow.ts` — 5-dim mood vector (Question 4)
- `algo/v8/intentRightNow.ts` — 7-class right-now intent (Question 51)
- `algo/v8/explain.ts` — Why-am-I-seeing-this ingredients (Question 16)
- `algo/v8/learner.ts` — per-user weight learning (Question 67)
- `algo/v8/surfaceLearner.ts` — per-surface ramp half-lives (Question 67)
- `algo/__tests__/caste-exclusion.test.ts` — CI gate on caste/gotra exclusion (Question 34, Question 35)

**Workers (`services/shared/src/algo/v8/`, also `services/tracking-worker`)**:
- `intentInference.ts` — every-5-min intent classifier worker (Question 51)
- `exposureScheduler.ts` — every-5-min ledger to queue translator (Question 11)
- `stableMatchTop10.ts` — Saturday-night Top-10 builder (Question 8)
- `fairnessAudit.ts` — periodic fairness reporting (Question 8)

**Auth and security (`services/auth/`, `services/shared/src/`)**:
- `auth/server.ts` — sign-up, sign-in, OTP, password (Question 70)
- `auth/onboardingHandlers.ts` — 12-question onboarding (Question 65)
- `shared/src/consent.ts` — `withConsent()` middleware (Question 12, Question 28)
- `shared/src/service.ts` — `applyBaseMiddleware` shared bootstrap (Question 62)
- `shared/src/featureFlags.ts` — flag system (Question 28, Question 31)

**Schema (`services/shared/prisma/schema.prisma`)**:
- `User` — root account record (Question 18)
- `Profile` — Discover-side profile (Question 18)
- `MatrimonialProfile` — DTM-side profile (Question 34)
- `Settings` — per-user preferences (Question 12)
- `PrivacySettings` — privacy toggles (Question 13)
- `Match`, `Like`, `MatchRequest` — interaction primitives (Question 43, Question 64)
- `Chat`, `Message` — encrypted message storage (Question 17)
- `MiamoMove` — Move v2 sent messages (Question 43)
- `DtmMessage` — DTM-side messaging (Question 10)
- `SpotlightLedger`, `SpotlightAward` — ledger and award rows (Question 11)
- `TrendQueue` — per-surface queue (Question 72)
- `FamilyBriefShare` — bio-data share with TTL (Question 7)
- `DeferredItem` — see-later pile (Question 3, Question 88)
- `AuditLog` — privileged-action audit (Question 86)
- `ConsentEvent` — per-toggle history (Question 61)
- `Report`, `Block` — safety primitives (Question 38, Question 39)
- `Notification` — push and inbox records (Question 84)
- `TrustedDevice` — device fingerprint registry (Question 56)

**Service entry points**:
- `services/gateway/src/server.ts` — gateway routes (Question 62)
- `services/social/src/server.ts` — Discover, matches, vibe, reports (Question 38, Question 52)
- `services/users/src/server.ts` — profile, photos, settings (Question 85)
- `services/messaging/src/server.ts` — chat WebSocket + REST (Question 17)
- `services/content/src/server.ts` — Creativity, Spotlight content (Question 49)
- `services/content/src/creativity-spotlight.ts` — Spotlight content surface (Question 49)
- `services/notifications/src/server.ts` — push and inbox (Question 84)
- `services/tracking-ingest/src/server.ts` — HMAC-and-stream (Question 20, Question 26)
- `services/tracking-worker/src/rollups.ts` — aggregation rules (Question 26)

**Frontend (`services/web/src/`)**:
- `app/(main)/discover/page.tsx` — Discover surface (Question 50)
- `app/(main)/creativity/components/SpotlightUI.tsx` — Spotlight visual layer (Question 49)
- `app/(main)/creativity/components/MoveModal.tsx` — Move composer modal (Question 5)
- `app/(main)/creativity/components/ReelsView.tsx` — reels-style content (Question 49)
- `lib/api.ts` — API client (Question 73)
- `lib/sync.ts` — offline-first sync layer (Question 73)
- `lib/tracking.ts` — client-side event emitter (Question 26)

**Operations and tests**:
- `scripts/start.sh` — local dev stack launcher (Question 30)
- `scripts/qa-runs/` — QA phase scripts (Question 30)
- `scripts/check-schema-drift.mjs` — schema-drift CI gate (Question 33)
- `typecheck.mjs` — custom monorepo typecheck (Question 29)

This list is not exhaustive; the canonical file map is in the canonical reference docs under "File map for cross-reference." But the paths above are the load-bearing ones for the questions in this FAQ.

---

## Appendix L — How to read this document if you only have 10 minutes

If you have 10 minutes and you want the essence of Miamo from this document:

1. Read Question 1 (What is Miamo) — 90 seconds.
2. Read Question 2 (How is Miamo different) — 90 seconds.
3. Skim Section A questions 3-16 by reading only the first paragraph of each — 4 minutes.
4. Read Appendix F (architectural commitments) — 3 minutes.
5. Tap out at 10 minutes.

If you have 30 minutes:

1. Same as above for the first 10 minutes.
2. Read all of Section A (16 questions) in full — 12 minutes.
3. Read Section B questions 17, 19, 23 (chat privacy, deletion, no selling) — 6 minutes.
4. Read Appendix F (commitments) — 3 minutes.

If you have 90 minutes (engineer onboarding):

1. Read the full FAQ in order — 60 minutes.
2. Read Appendix K (code paths) and click through to one or two cited files — 20 minutes.
3. Read the architecture overview at the start of [ARCHITECTURE.md](./ARCHITECTURE.md) — 10 minutes.

If you have a full day (compliance audit):

1. Read the FAQ in full — 90 minutes.
2. Read [SECURITY.md](./SECURITY.md) in full — 4 hours.
3. Read [PRODUCT.md](./PRODUCT.md) sections 1, 2, 3, 6 — 90 minutes.
4. Spot-check claims in this FAQ against the underlying documents — 60 minutes.

The reading paths above are tested. A new engineer onboarded against the 90-minute path is at functional productivity by day 2; a new engineer onboarded against ad-hoc reading is at functional productivity by day 5. The structure of the documentation is the on-ramp.

---

## Appendix M — Document history

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-06-25 | Initial FAQ for v3.6.0 (90 questions, 13 appendices) |

The FAQ will be updated on each minor release. Questions whose answers change are flagged in the changelog. Questions whose answers are added are listed in the document history. The FAQ is a living document; the version field is the source of truth for which version of the product the answers describe.

---

*End of FAQ. v3.6.0. 2026-06-25.*
