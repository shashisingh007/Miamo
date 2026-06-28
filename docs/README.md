# Miamo Documentation — The Master Reading Guide

**Purpose:** This file is the single canonical entry point to Miamo's documentation. If you read the 14 documents linked below in the order given, by the end you will understand every feature Miamo ships, every algorithm that powers it, every byte of data we store, and every protection we wrap around it.

**Who this is for:** Everyone. A non-technical reader can follow the same sequence as a senior engineer and finish with the same understanding — different depth, same shape.

**How to use this file:**
1. Read this guide top to bottom (15 minutes).
2. Pick a reading path that matches your role (§4 below).
3. Read the linked docs in sequence. Each doc opens with a "what you already know" recap so you can't get lost.
4. When you finish, you'll be able to answer: *"How does Miamo know what Priya needs right now?"* — at any depth the question demands.

---

## 1. The reading sequence (the master path)

Each link below is a stage. Each stage builds on the previous one. The full path is ~5-6 hours of reading; you can stop after stage 5 and still have a complete product understanding without engineering depth.

### Stage 1 — Understand the product
**[1. PRODUCT.md →](PRODUCT.md)**

Priya, 28, Mumbai, photographer, hiker. She opens Miamo at 9:02pm Tuesday. You follow her through the entire app: Discover, Move v2, match, chat, Family Brief, Voice Fingerprint, Weekly Top-10, the anti-ghost economy. Every feature explained as a story.

**What you learn:** What Miamo *does* for a user. The full product surface. The 6 features no other dating app ships. Why "behaviour-based matching" matters more than "swipe-based matching."

**Real-user scenario:**
> Priya opens Miamo. She sees Arjun. She taps his profile, reads his bio for 7 seconds, swipes through 4 photos, taps the **i** icon on his card. A popover shows: *★★★ shared interest: hiking, ★★ similar reply pace, ★ same chronotype.* She trusts the algorithm because it just told her *why*. She likes him. He likes her back. They match. The composer shows her 5 Move suggestions — all in her writing voice, all referencing his Sikkim photos. She picks one. She thinks: "wait, did I write this?" She sends it. He replies in 4 minutes.

---

### Stage 2 — Understand the owner's view
**[2. OWNER_GUIDE.md →](OWNER_GUIDE.md)**

The "tell my parent" doc. Single sitting. Covers the 4 layers (tracking → learning → ranking → composing), the 17 algorithms at a glance, what stays private, what's on the roadmap.

**What you learn:** Why Miamo's design choices add up to a defensible product. The KPIs the company cares about. The roadmap to v3.7+.

**Real-user scenario:**
> Karan, 32, Delhi, premium. He spends Monday matching with 3 people. He sends 1 message that gets a reply. By Tuesday, Miamo has assigned him 4.5 exposure credits (1 sticky-like + 3 for the reply + 0.5 for a long bio read). Wednesday: he crosses the 30-credit threshold, unlocking his Weekly Top-10. Sunday morning at 00:00 UTC, the Gale-Shapley worker runs and picks the 10 most compatible matches for him this week. He gets a notification: *"Your 10 most compatible matches for this week are ready."* Not infinite scroll. Just 10 names, ranked, dated, with a refresh-on-Sunday countdown.

---

### Stage 3 — Understand the system shape
**[3. ARCHITECTURE.md →](ARCHITECTURE.md)**

11 services + 17 worker loops + the request lifecycle. Mermaid diagrams for every major flow.

**What you learn:** What runs where. How a single request flows from Priya's phone, through the gateway, into the service that owns it, into Postgres, and back. Why Miamo is decomposed into 11 services and not 1 monolith.

**Real-user scenario:**
> Priya taps the heart on Arjun. Her phone sends a `POST /api/v1/discover/like` to the gateway on port 3200. The gateway rate-limits her (30 writes/user/min), verifies her JWT, proxies to the social service on port 3203. Social writes a `Like` row, checks if Arjun already liked her, finds yes, creates a `Match` row, creates a `Chat` row, queues a notification for Arjun, returns `{matched: true, chatId}`. Total wall-clock: 80ms. Meanwhile, asynchronously, her phone fires a `discover.swipe` event to ingest on port 3260; ingest writes to a Redis stream; the tracking-worker rolls it up 5 seconds later. Two layers, fully decoupled.

---

### Stage 4 — Understand the data
**[4. DATA_MODEL.md →](DATA_MODEL.md)**

Every Prisma model (70+) grouped into 12 semantic domains.

**What you learn:** Where every piece of data lives. Why `UserActivity.metadata` is JSON-as-string (legacy). Why `uidHash` (HMAC-SHA256) is the only ID tracking tables join on. Why `Match` has both user1Id and user2Id (no implicit ordering).

**Real-user scenario:**
> When Priya likes Arjun, three rows materialise: `Like (fromUserId: priya, toUserId: arjun)`, then if Arjun already had `Like (fromUserId: arjun, toUserId: priya)`, a `Match (user1Id: priya, user2Id: arjun, active: true)` plus a `Chat (matchId: ..., user1Id: priya, user2Id: arjun)` are created in one transaction. Priya never sees the row IDs — but the social service reads them on every subsequent Discover call to NOT show Arjun again (passed filter) and to surface him in the Matches tab.

---

### Stage 5 — Understand the API
**[5. API.md →](API.md)**

Every endpoint across 8 servers, 17 surfaces. For each: method, path, auth required, request body schema, response shape, feature flag, rate-limit bucket, one example curl.

**What you learn:** Where every feature lives at the HTTP layer. Which endpoints are public vs internal-only. Which are flag-gated. Why the rate-limit tiers are 60/30/20/60 (general/writes/expensive/feed).

**Real-user scenario:**
> Priya's Voice Fingerprint modal fires `GET /api/v1/users/me/voice-fingerprint` (auth required, no body, returns `{voice, archetype, sentMessageCount}`, flag `FEATURE_VOICE_FINGERPRINT_ENABLED`, rate-limit bucket "general"). The users service reads her last 50 outbound messages, runs `extractSenderVoice()`, returns the 12-feature vector. If the flag is OFF, the endpoint returns 404 (clean degrade). She never sees the difference because the modal just doesn't appear.

---

### Stage 6 — Understand the frontend
**[6. FRONTEND.md →](FRONTEND.md)**

Next.js 14 App Router. The 26 routes under `(main)/`. The shared layout. Zustand stores. Custom hooks. The v3.6.0 components (VoiceFingerprint, MoveV2Picker, FamilyBrief, WhyCard, WeeklyTop10, Settings Personalization section).

**What you learn:** How the web app is structured. How telemetry is emitted from the browser. Where the 6 new v3.6.0 surfaces live.

**Real-user scenario:**
> Priya opens https://miamo.app on her iPhone. Next.js serves the marketing landing. She taps "Open app" → routes to `/(main)/discover`. The `(main)/layout.tsx` checks her JWT via `useAuthStore`, finds it valid, lets her through. She swipes. Each swipe-commit fires a `useTrackEngagementDepth(profileId)` and a `useTrackPolarity(profileId)` hook, which emits two tracking events to ingest. She taps the i-icon WhyCard. The `WhyCard` component calls `api.getDiscoverWhy(targetId)`, renders 3 stars. If the flag is OFF, `getDiscoverWhy` returns null on the 404 and the WhyCard hides itself.

---

### Stage 7 — Understand the signals
**[7. TRACKING.md →](TRACKING.md)**

Phone → ingest envelope (32 KB cap, 50 events max, v=1) → Redis stream `events:raw` → 17 worker loops → Postgres aggregates → algorithms read. All 57 event types catalogued. All 17 workers with schedules. The HMAC privacy story.

**What you learn:** How a single Priya swipe becomes a behavioural signal that influences who she sees tomorrow. Why we hash userIds with HMAC-SHA256 (RTBF is just a secret rotation). Why ingest is intentionally lossy (always 204).

**Real-user scenario:**
> Priya swipes for 30 seconds. Her phone fires 47 tracking events. The browser batches them every 2.5 seconds into 4 envelopes. Ingest writes them to Redis. 5 seconds later, the rollup worker aggregates: `EventAggHourly { uidHash, evt: 'card.impression.100', bucket: '21:00', count: 12, meta: {hist: [...]} }`. Next morning, the embedding worker reads 30 days of these aggregates and updates Priya's behaviour vector. 17,000× compression. Her behavioural fingerprint stays current without melting the database.

---

### Stage 8 — Understand the algorithms
**[8. ALGORITHMS.md →](ALGORITHMS.md)**

The big one. 17 V4 ranked algorithms + 5 V7 modules + 17 V8 modules. For each: plain-English description, signals it reads, the formula, weights with `// because:` rationale, a worked Priya × Arjun example, the surface that calls it, the feature flag, the file path. Plus a 5-step recipe for adding a new algorithm.

**What you learn:** Why Arjun scored 0.796 against Priya. Why Karan's Top-10 was computed by Gale-Shapley with proposer-optimal stable matching. Why the fairness re-rank uses Singh-Joachims with gender-conditional Gini. Why the right-now-intent ingredient gets a 0.06 weight in the v8 recipe.

**Real-user scenario:**
> Arjun scores against Priya: `interestCos 0.82 × 0.18 + vibeCos 0.71 × 0.15 + behaviorCos 0.68 × 0.15 + reciprocalIntent 1.0 × 0.10 + attentionFit 0.85 × 0.10 + hesitationFit 0.71 × 0.08 + chronotype 1.0 × 0.07 + ageSim 0.88 × 0.05 + distance 0.92 × 0.05 + cadenceFit 0.85 × 0.04 + moveStyleCompat 0.70 × 0.03 = 0.796`. He lands at position 3 in Priya's Discover. Then the v8 fairness re-rank checks the gender-conditional Gini, finds Priya hasn't seen many female-presenting candidates this week, and bumps a different candidate up — Arjun stays at 3 but the rest of the top-10 shifts.

---

### Stage 9 — Understand the Move composer
**[9. MIAMO_MOVE.md →](MIAMO_MOVE.md)**

Deep-dive on Move v2 — the 5-suggestion composer that "writes like you." Sender voice extraction (12 features from last 50 outbound messages). Receiver resonance (last 10 successful replies). Hook library (8 categories). Code-mix templates (80 templates × 4 language families: en, Hinglish, Tanglish, Banglish). The expanded linter (42 forbidden phrases + 3 compound flags). Why no LLM.

**What you learn:** Why the suggestion that gets sent is *"Your Sikkim post — what was the trek like when the second monsoon hit?"* and not *"I noticed your photos are amazing! What trek is that?"*

**Real-user scenario:**
> Priya taps ✨Suggest. The composer reads her last 50 outbound messages and extracts: `medianLengthChars: 32, emojiRate: 0.18, topEmojis: ['😂','🙃','🎒'], lowercaseIRate: 0.87, archetype: 'wordsmith'`. It reads Arjun's last 10 successful replies and finds his preferred opener kind is `question` and tone is `reflective`. It looks at shared hooks: his Sikkim post is 3 days old (freshness 0.65 × specificity 0.9 × recent_post prior 0.30 = 0.18). The composer generates 5 candidates, filters one out for a forbidden phrase, shows the remaining 4 + 1 fallback. Priya picks the one that says *"your Sikkim post — what was the second monsoon like?"*. She thinks: "did I write this?"

---

### Stage 10 — Understand the safety net
**[10. SECURITY.md →](SECURITY.md)**

Password storage (bcryptjs cost 12). Chat encryption (AES-256-GCM, per-message random key + IV). JWT (HS256, 15-min access). HMAC user IDs in tracking. Rate-limit tiers. Strict CSP. OWASP Top-10. DPDP Act 2023 compliance. GDPR Article 22. CCPA. Apple ATT. Safari ITP. The 4 consent toggles. The RTBF flow.

**What you learn:** Why Miamo can say with a straight face that even our DBAs can't read Priya's chats. Why deleting her account is just a `TRACKING_HASH_SECRET` rotation. Why the v3.6.0 Why-am-I-seeing-this card is required by EU law.

**Real-user scenario:**
> Priya sends "hey arjun :)" — 14 bytes plaintext. The messaging service generates a 32-byte random AES-256-GCM key, encrypts the message with a random 12-byte IV, stores the ciphertext + IV + 16-byte auth tag in `Message.content`. If a hacker steals the Postgres dump, they get ciphertext only — no master key. If Priya hits "Delete my account," the RTBF worker rotates `TRACKING_HASH_SECRET`; her future tracking aggregates use a new hash, the old hash can never be joined to her ID again. Her Postgres rows are deleted in 6 SQL statements.

---

### Stage 11 — Understand the operations
**[11. DEVOPS.md →](DEVOPS.md)**

Local dev. **The bootstrap trap** (`set -a; source .env; set +a` before `start.sh local dev` — otherwise v8 flags don't load). Production topology (k8s, 3 envs). CI/CD. Secrets. Prometheus metrics. The 17 worker loops table. Migration flow. Cold storage.

**What you learn:** How to run Miamo locally in 5 minutes. How to ship a migration safely. Why `npm run typecheck` runs all 11 packages in parallel.

**Real-user scenario:**
> An engineer on a Mac wants to test the v3.6.0 Move v2 composer locally. They `colima start`, `docker compose up postgres redis`, `cd services/shared && npx prisma migrate dev`, copy `.env.example` to `.env`, set `FEATURE_MOVE_V2_ENABLED=1`. Crucially, before `bash scripts/start.sh local dev`, they run `set -a; source .env; set +a` (the bootstrap trap — `start.sh` doesn't source `.env`). They open http://localhost:3100, log in as `miamo10@miamo.test`, match with miamo20, tap ✨Suggest, see 5 suggestions. If they forgot the `source .env`, the endpoint would return 404 and the suggestions wouldn't appear.

---

### Stage 12 — Understand the on-call playbook
**[12. RUNBOOK.md →](RUNBOOK.md)**

22 incidents, each with: severity, what user sees (Priya/Arjun/Karan/Riya), what dashboard shows, first-check command, ranked likely causes, copy-pasteable fix, prevention. Plus a postmortem template.

**Real-user scenario:**
> Tuesday 11pm. Pager: "fairness Gini 0.51, gender male." On-call opens RUNBOOK.md, searches "Gini." Finds Incident #6. Symptom matches. First-check: `psql -c "SELECT details FROM AuditLog WHERE action='fairness_audit' ORDER BY createdAt DESC LIMIT 1"`. Output: `{m: 0.51, f: 0.38, o: 0.41}`. Likely cause #1: `card.impression.50` aggregation skew due to a recent surge in male sign-ups. Fix: bump `FAIRNESS_RERANK_TOP_N` from 50 to 80 via env, restart social service. Verify: re-trigger fairness audit, watch Gini drop.

---

### Stage 13 — Reference: FAQ
**[13. FAQ.md →](FAQ.md)**

90+ questions across Product, Privacy, Technical, India-specific. Read top-to-bottom once, then grep when you need it.

**Real-user scenario:**
> A new user, Ananya, signs up. Three days later her sister asks if Miamo is safe. Ananya hands her the FAQ. Sister skims questions 17-24 (Privacy section): chat encryption, HMAC user IDs, DPDP compliance, GDPR Article 22. She's satisfied. Ananya keeps using the app.

---

### Stage 14 — Reference: Glossary
**[14. GLOSSARY.md →](GLOSSARY.md)**

Every term defined, alphabetical. Product terms (Move, DTM, Family Brief, Spotlight minute). Technical terms (HMAC, compose pattern, stable jitter, learner ramp).

**Real-user scenario:**
> Engineer reading ARCHITECTURE.md hits the term "stable jitter." Opens GLOSSARY.md, reads: *"FNV-1a-seeded deterministic randomness window. Ensures top-5 ranker order stays constant within a 5-minute window for the same viewer-candidate pair, but rotates beyond that. See also: ALGORITHMS.md §V8 ranker."* Back to ARCHITECTURE.md.

---

## 2. Quick-reference TOC

If you don't want to read in sequence, jump to the doc that owns the topic:

| Topic | Doc |
|---|---|
| What Miamo does | [PRODUCT.md](PRODUCT.md) |
| One-sitting overview | [OWNER_GUIDE.md](OWNER_GUIDE.md) |
| Services, ports, request flow | [ARCHITECTURE.md](ARCHITECTURE.md) |
| A Prisma model | [DATA_MODEL.md](DATA_MODEL.md) |
| An API endpoint | [API.md](API.md) |
| A Next.js route or hook | [FRONTEND.md](FRONTEND.md) |
| A tracking event | [TRACKING.md](TRACKING.md) |
| An algorithm formula | [ALGORITHMS.md](ALGORITHMS.md) |
| The Move v2 composer | [MIAMO_MOVE.md](MIAMO_MOVE.md) |
| Auth, encryption, privacy | [SECURITY.md](SECURITY.md) |
| Run locally, ship to prod | [DEVOPS.md](DEVOPS.md) |
| Something is broken | [RUNBOOK.md](RUNBOOK.md) |
| A question I have | [FAQ.md](FAQ.md) |
| A term I don't recognise | [GLOSSARY.md](GLOSSARY.md) |
| v3.6 design history | [architecture/v3.6-overhaul-design.md](architecture/v3.6-overhaul-design.md) |
| v3.6 release notes | [releases/v3.6.0.md](releases/v3.6.0.md) |
| Patent clearance | [legal/patent-clearance.md](legal/patent-clearance.md) |

---

## 3. The cast (consistent across every doc)

Every example uses the same four users.

| Name | Age | City | Persona | Premium? | Used to illustrate |
|---|---:|---|---|---|---|
| **Priya** | 28 | Mumbai | Photographer, hiker, casual-scroll-to-intentional-browse | No | The default user. |
| **Arjun** | 29 | Mumbai | Photographer too, serious-search, fast replier | No | The match. Move v2 composer. |
| **Karan** | 32 | Delhi | Premium, serious-marriage track, DTM-heavy | Yes | Premium-only features. |
| **Riya** | 26 | Bangalore | DTM-only profile, hate-scroll late at night | No | Negative-signal flows. |

Plus cameos by **Ananya** (cold-start) and **Rohan** (security incidents).

---

## 4. Reading paths by role

### 4.1 Non-technical reader (designer, PM, parent)
PRODUCT → OWNER_GUIDE → FAQ §Product+§Privacy → GLOSSARY (reference). **~1.25 hours.**

### 4.2 New backend engineer
PRODUCT (skim) → ARCHITECTURE → DATA_MODEL → API → TRACKING → ALGORITHMS §"How to add a new algorithm" → DEVOPS §"Local dev". **~2.5 hours.**

### 4.3 New frontend engineer
PRODUCT → ARCHITECTURE §services → API §relevant surfaces → FRONTEND → TRACKING §"What the SDK does" → GLOSSARY §UI. **~1.5 hours.**

### 4.4 New ML engineer / algorithms reader
PRODUCT → ARCHITECTURE → TRACKING → ALGORITHMS → MIAMO_MOVE → DATA_MODEL §Tracking. **~2.75 hours.**

### 4.5 New SRE / on-call
ARCHITECTURE → DEVOPS → RUNBOOK → SECURITY §secrets+§rate-limits. **~1.5 hours.**

### 4.6 Founder / owner
PRODUCT → OWNER_GUIDE → architecture/v3.6-market-scan → FAQ → releases/v3.6.0. **~2 hours.**

### 4.7 Security / compliance reviewer
PRODUCT §"What stays private" → SECURITY → DATA_MODEL §Tracking → legal/patent-clearance → architecture/v3.6-overhaul-design §E. **~1.5 hours.**

---

## 5. Documentation conventions

These rules apply to every doc under `docs/`.

### 5.1 Pair-write
Every concept has two paragraphs:
- **Plain English first** — what the user feels. No jargon. A non-technical reader can stop here.
- **Technical second** — the math, the data flow, the code reference.

### 5.2 The four users
Every example uses Priya / Arjun / Karan / Riya. Never invent new names. Never reuse one for multiple personas.

### 5.3 Numbers are real
Every weight, every threshold, every TTL is the actual value from the source code. If a doc claims a number the source doesn't, the doc is wrong.

### 5.4 Citations
Every algorithm reference cites a file path. Every endpoint reference cites a server.ts handler. Every Prisma model reference cites a schema line.

### 5.5 Mermaid for flows
Sequence diagrams use mermaid blocks (render natively on GitHub).

### 5.6 No marketing words
Banned: *leverage*, *synergy*, *best-in-class*, *next-generation*, *world-class*, *cutting-edge*.

### 5.7 Every new feature ships its doc
A PR that adds a feature without adding to the corresponding doc gets rejected. The docs are the source of truth, not a trailing artifact.

---

## 6. What's NOT in the primary reading path

Two subdirectories under `docs/` contain reference material that lives outside the 15-doc reading sequence:

- **`docs/architecture/`** — deeper design memos: the v3.6 overhaul design and the competitive market scan that informed it. Linked from PRODUCT.md and OWNER_GUIDE.md where relevant. Read these when you want to understand *why* a v3.6 decision was made.
- **`docs/legal/patent-clearance.md`** — IP audit performed before the v3.6 ramp. Required reading for security/compliance reviewers; otherwise reference-only.

`docs/releases/` is also reference-only — one file per release with the full notes.

---

## 7. Folder structure (the canonical pattern)

The repository follows a strict pattern. **Nothing belongs at the root that doesn't fit this map.**

### A note on folder ordering

The founder brief requested this sequence at the root:

> `configuration / assets / docker / docs / k8s / scripts / services / tests`

Filesystem listings are alphabetical, not insertion-order. Forcing the brief's sequence would require numeric prefixes like `01-configuration/`, `02-assets/` — that's ugly, breaks every relative import path in the codebase, and conflicts with how `git`, `ls`, IDEs, and CI tools render directories.

**Decision (v3.6.1):** keep alphabetical order, document the **logical reading order** below to match the founder's intent. The sequence is the same set of folders; only the display order differs.

| Logical reading order (founder's intent) | Actual sort (alphabetical) |
|---|---|
| 1. configuration (env-specific values) | assets |
| 2. assets (brand) | configuration |
| 3. docker (build) | docker |
| 4. docs (everything documented) | docs |
| 5. k8s (deploy) | k8s |
| 6. scripts (ops) | scripts |
| 7. services (code) | services |
| 8. tests (verification) | tests |

When you list the root, just read the alphabetical view as if it were the logical order above. Both contain the same 8 folders + canonical configs at root.


```
Miamo/
├── README.md                 ← the repo entry point
├── CHANGELOG.md              ← chronological release history
├── .env.example              ← documented environment variables (~140)
├── .gitignore  .gitattributes  .nvmrc  .dockerignore
├── .husky/                   ← git pre-commit hooks
├── .github/                  ← CI workflows + dependabot
├── docker-compose.yml        ← local-dev Postgres + Redis
├── package.json              ← monorepo orchestration
├── package-lock.json
├── knip.json                 ← dead-code config
├── vitest.config.ts          ← full suite config
├── vitest.fast.config.ts     ← fast (CI) suite config
│
├── assets/                   ← brand assets
├── configuration/            ← env-specific values (dev/staging/prod/grafana/postgres)
├── docker/                   ← service Dockerfiles + migrate-and-seed.sh
├── docs/                     ← all documentation (see §1-§6 above)
├── k8s/                      ← Kubernetes manifests + templates
├── scripts/                  ← operational scripts
│   ├── start.sh         (local boot)
│   ├── setup.sh                  (one-time setup)
│   ├── typecheck.mjs             (parallel tsc driver)
│   ├── test-all.py               (python QA runner)
│   └── qa-runs/                  (6 phase scripts + their JSON reports)
├── services/                 ← 11 microservices + shared library
│   ├── shared/                   (Prisma + 53 algorithms + middleware)
│   ├── gateway/  auth/  users/  social/  messaging/  content/  notifications/
│   ├── ingest/  tracking-worker/
│   └── web/                      (Next.js 14 app)
└── tests/                    ← cross-service integration tests
```

**Inside `docs/`:**

```
docs/
├── README.md                 ← the master reading guide (you are here)
├── PRODUCT.md                ← Priya's narrative
├── OWNER_GUIDE.md            ← single-sitting non-technical overview
├── ARCHITECTURE.md           ← 11 services + 17 worker loops + flows
├── DATA_MODEL.md             ← every Prisma model
├── API.md                    ← every endpoint
├── FRONTEND.md               ← Next.js app
├── TRACKING.md               ← signals pipeline
├── ALGORITHMS.md             ← every ranking algorithm + worked examples
├── MIAMO_MOVE.md             ← Move v2 deep-dive
├── SECURITY.md               ← auth, encryption, privacy, compliance
├── DEVOPS.md                 ← local dev, k8s, CI, observability
├── RUNBOOK.md                ← incident playbook
├── FAQ.md                    ← 90+ questions
├── GLOSSARY.md               ← every term defined
│
├── architecture/             ← deeper design docs (v3.6 overhaul, market scan)
├── legal/                    ← patent clearance memo
└── releases/                 ← per-release notes (v3.6.0.md, v3.6.1.md)
```

**Inside `services/shared/src/algo/`** (53 algorithm modules — see ALGORITHMS.md):

```
services/shared/src/algo/
├── (legacy V4 ranked algorithms, 17 files: forYou, forYouV6, aiPicks, aiMatch, active, beats, cf,
│   dtm, feedAugment, messageSuggest, moves, new, notifyTiming, postImpressionRerank,
│   searchAugment, serious, verified)
├── (V7 modules, 5 files: batchLadder, dtmFeedV7, moveVoice, rightNow, surfaceLearner)
├── (DTM modules: dtmAnswerHistory, dtmColdStart, dtmExplain, dtmTopics, dtmV6)
├── (Learner: learner, learnerRewards, contextAwareRewards, preferenceSnapshot)
├── (Support: consent, discoverPolicy, explain, flags, hash, lru, math, moveProfile,
│   pairCompatV6, registry, requestId, seedRandom, signals)
└── v8/                       ← v3.6.0 generation (17 modules)
    ├── intentRightNow.ts  moodRightNow.ts  polarity.ts  depthOfEngagement.ts
    ├── exposureCredits.ts  galeShapley.ts  fairnessRerank.ts  multiObjective.ts
    ├── dtmTopicMask.ts  dtmBatch.ts  antiGhost.ts  festivalHooks.ts
    └── moveV2/  (senderVoice, receiverResonance, hookLibrary, codeMix, composer)
```

**What's NOT allowed at the root:**
- Stray markdown files (other than README.md + CHANGELOG.md)
- Working notes (`B3_*.md`, `NOTES.md`, etc.) — never commit; they belong in a scratch branch and get deleted once their content is folded into a permanent doc
- Scratch test outputs
- Editor backup files (`*.bak`, `*.tmp`, `*.swp`, `.DS_Store`, `*.orig`, `*.rej`)
- Per-developer config (`.vscode/`, `.idea/`)
- Build artifacts (`dist/`, `build/`, `.next/`) — gitignored

The structure is enforced by:
1. The v3.6.1 cleanup pass (see `releases/v3.6.0.md` §Cleanup).
2. Knip rules (`knip.json`) flagging stray files.
3. `.gitignore` blocking build outputs and editor files.
4. PR review.

---

## 8. Document statuses (current as of v3.6.1)

| Doc | Lines | Last refresh | Status |
|---|---:|---|---|
| README.md (this file) | ~380 | 2026-06-25 | ✅ current |
| PRODUCT.md | 1,876 | 2026-06-25 | ✅ current |
| OWNER_GUIDE.md | 1,554 | 2026-06-25 | ✅ current |
| ARCHITECTURE.md | 1,603 | 2026-06-25 | ✅ current |
| DATA_MODEL.md | 2,576 | 2026-06-25 | ✅ current |
| API.md | 4,416 | 2026-06-25 | ✅ current |
| FRONTEND.md | 1,595 | 2026-06-25 | ✅ current |
| TRACKING.md | 1,999 | 2026-06-25 | ✅ current |
| ALGORITHMS.md | 2,957 | 2026-06-25 | ✅ current |
| MIAMO_MOVE.md | 1,706 | 2026-06-25 | ✅ current |
| SECURITY.md | 1,554 | 2026-06-25 | ✅ current |
| DEVOPS.md | 1,528 | 2026-06-25 | ✅ current |
| RUNBOOK.md | 2,422 | 2026-06-25 | ✅ current |
| FAQ.md | 1,570 | 2026-06-25 | ✅ current |
| GLOSSARY.md | 1,806 | 2026-06-25 | ✅ current |
| **Total** | **~31,000 lines** | | |

Every doc was rewritten or significantly refreshed in the v3.6.1 cleanup.

---

## 9. Where to start, by question

**"What is Miamo?"** → [PRODUCT.md](PRODUCT.md)
**"Why is Miamo different from Tinder?"** → [PRODUCT.md](PRODUCT.md) or [OWNER_GUIDE.md](OWNER_GUIDE.md) §Five differentiators
**"How does the algorithm work?"** → [ALGORITHMS.md](ALGORITHMS.md)
**"How do you write Move suggestions that sound human?"** → [MIAMO_MOVE.md](MIAMO_MOVE.md)
**"Where does my data live?"** → [DATA_MODEL.md](DATA_MODEL.md) + [SECURITY.md](SECURITY.md)
**"How do I run Miamo locally?"** → [DEVOPS.md](DEVOPS.md) §Local development
**"Something is broken in production."** → [RUNBOOK.md](RUNBOOK.md)
**"What does [term] mean?"** → [GLOSSARY.md](GLOSSARY.md)
**"What changed in the latest release?"** → [releases/v3.6.0.md](releases/v3.6.0.md) and [../CHANGELOG.md](../CHANGELOG.md)
**"Who owns the algorithm?"** → [ALGORITHMS.md](ALGORITHMS.md) §How to add a new algorithm
**"How is Miamo GDPR/DPDP compliant?"** → [SECURITY.md](SECURITY.md) §Privacy & regulation

---

_If you've read this far and the path makes sense, you're ready. Open [PRODUCT.md](PRODUCT.md) and meet Priya._
