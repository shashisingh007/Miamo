# Miamo v1.2 Full-Content Audit — Phase A

**Date:** 2026-07-01
**Author:** Principal Engineer (fifty-year veteran persona per `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` §0.0)
**Scope:** every file in the working tree audited through the WH-family framework (Who / What / When / Where / Why / How / How-well) and tagged against the nine-lens panel (Architect, Full-Stack, UX Researcher, QA, Behavioural Analyst, ML/Personalization, Backend, Frontend, Test Engineer).
**Supersedes:** none — this doc **extends** `docs/architecture/launch-audit.md` (2026-06-28) into a full-tree pass. Where the two disagree, this doc notes the resolution inline.
**Read-only:** no code modified, no destructive commands issued. All citations are `file:line`.

---

## §0 TL;DR — top 10 findings by impact

Every founder-visible risk before launch. Each row tags the panel lens(es) that caught it and a severity (P0 blocks launch, P1 blocks 7-day retention, P2 blocks a specific KPI, P3 tidy-up).

| # | Finding | File:line | Lens | Sev |
|---|---|---|---|---|
| 1 | **`services/tracking-worker/src/index.ts` header docstring lies** — comment (line 4) says "Runs three loops in one process," actual code registers 17 loop classes (RollupConsumer, FeatureAggregator, CompatWriter, EmbeddingWorker, ColdStore, EnrichmentWorker, DailyMatchWorker, SafetyRollup, FirstMoveOutcomeWorker, SessionSummaryWorker, FocusAffinityWorker, LearnerLoop, DeferPrune, IntentInferenceLoop, ExposureScheduler, StableMatchTop10, FairnessAudit). An on-call engineer reading the header will underestimate blast radius by 5×. | `services/tracking-worker/src/index.ts:4-11` | Architect, SRE (via QA) | P1 |
| 2 | **DEVOPS.md contradicts ARCHITECTURE.md on worker count** — `DEVOPS.md:5` says "13 tracking-worker loops," `ARCHITECTURE.md:115,445,501` says 17. Runtime truth is 17. The DEVOPS number pre-dates the v3.6.0 four new loops (intentInference, exposureScheduler, stableMatchTop10, fairnessAudit). | `docs/DEVOPS.md:5,212`, `docs/ARCHITECTURE.md:115` | Architect | P2 |
| 3 | **140 empty catch blocks in production paths, 132 of them in the web app** — every one swallows an error the user needed to see or the SRE needed to log. Sample: `services/web/src/app/(main)/messages/page.tsx:335-362` (8 bulk-action buttons that silently drop failure), `services/web/src/app/(main)/layout.tsx:117` (logout can fail invisibly). Anti-pattern §6 of the prompt names this exactly. | 140 hits across web + services | Frontend, QA, UX | P1 |
| 4 | **`console.log/error/warn` fires 166 times in service source** — top offenders: `services/ingest/src/server.ts:154` (unconditional `console.log` in RTBF path — logs uidHash of user asking to be forgotten, ironic), plus dozens of gated `if (NODE_ENV === 'development')` guards that don't belong in shipping code. Should use pino (`logger.ts`). | 166 hits | Backend, SRE | P2 |
| 5 | **202 `as any` casts in non-test service code** — most concentrated in `services/social/src/server.ts` (54-route monolith, 2998 lines) and web. Every one is a type-safety hole. No `@ts-ignore` in tree (good), only 1 `@ts-expect-error`. | 202 hits, 0 `@ts-ignore`, 1 `@ts-expect-error` | Backend, Test | P2 |
| 6 | **`services/web/src/stores/index.ts` is the entire zustand layer for a 172-file web app** — all state (auth, matches, discover filters, chat, feed, DTM, settings) lives in ONE file. FRONTEND.md docs claim "zustand stores" plural. Impact: bundle splitting impossible, hydration boundary conflated, one bad selector re-renders every page. | `services/web/src/stores/index.ts` (single-file) | Frontend, Architect | P2 |
| 7 | **`services/notifications/src/server.ts:122-198` `POST /internal/notifications` and `/internal/notifications/schedule` accept arbitrary bodies with no Zod validation** — internal-only, still crashable via malformed inter-service call (matches launch-audit §DevOps §Backend §validation gap). Cross-references launch-audit L845. | `services/notifications/src/server.ts:122,168` | Backend, Architect | P2 |
| 8 | **STUB feature-flag coverage — most v8 events emit only when a flag is on, all v8 flags default OFF** — the launch dashboard KPIs (Move-accept, exposure Gini, fairness) will read zeros on day 1 unless the launch runbook flips flags AND verifies emit within 24h. Documented in launch-audit §Data-Analyst L646; still true. | `services/shared/src/algo/flags.ts` + `services/tracking-worker/src/index.ts:50` | Data, ML, SRE | P1 |
| 9 | **Actual route count is 235, not the "~350" the audit prompt hinted** — auth 24 + users 32 + social 54 + messaging 34 + content 72 + notifications 7 + gateway 6 + ingest 6 = 235. Docs (API.md) claim more; drift audit needed. Content is the fattest surface (72 routes / 2622 lines) and it also holds `POST /internal/*` cross-service backdoor routes. | per-service `server.ts` | Architect, Backend | P3 |
| 10 | **Two secrets in `.env.example` have real-looking dev defaults** — `TRACKING_HASH_SECRET=dev-only-tracking-hash-secret-change-me` and `DEVICE_FP_SALT=miamo-default-salt` (referenced launch-audit §DevOps L734-735). `env.ts` production-gate prevents prod from booting with defaults, BUT only if `NODE_ENV=production` is set correctly. One misconfigured env file → HMAC pseudonymisation collapses silently. | `.env.example:25,27`, `services/shared/src/env.ts:44` | Security, Backend | P1 |

**Panel arbitration (see §9 for full text):** finding 6 (single-file zustand) is a P2 the Architect wants to raise to P1 and the Frontend accepts as-is. Fifty-year veteran tiebreak: **P2 today, mandatory refactor before v2.0.** Bundle splitting matters at scale, not at 100 DAU launch. The store's coherence is currently a feature, not a bug — a 1-file audit is easier than a 20-file trail.

---

## §1 Repo census

Working tree state: single commit on `main` (`c5ff50d — v1: Miamo v3.6.1 — complete rewrite, behaviour-based dating for India`), one untracked file (`FULL_AUDIT_AND_LEARNING_V2_PROMPT.md`, i.e. this prompt).

### 1.1 File count by directory (excl. `node_modules`, `.git`, `.next`, `dist`)

| Directory | Files (source-ish) | Notes |
|---|---:|---|
| `services/` | 529 | 11 microservices + web + shared library |
| `services/shared/` | 214 .ts | 53 top-level algo modules + 14 v8 modules + 5 moveV2 modules + 95 tests |
| `services/web/` | 172 .ts/.tsx | Next.js 14 App Router, 34 pages, 40+ components |
| `services/tracking-worker/` | 35 .ts (20 source + 15 tests) | 17 loops registered; index.ts orchestrator |
| `services/{auth,users,social,messaging,content,notifications,gateway}/` | 1 `server.ts` each | Big monoliths: auth 931, users 745, social 2998, messaging 1306, content 2622 + creativity-spotlight 829, notifications 212, gateway 613 |
| `services/ingest/` | 5 .ts (server, validate, stream, hash + tests) | Tightly-scoped edge |
| `scripts/` | 11 files (7 python QA runs + start.sh + setup.sh + typecheck.mjs + test-all.py) | |
| `docs/` | 23 .md | 15 canonical + `architecture/*` (5 files) + `legal/patent-clearance.md` + 2 releases |
| `tests/` | 22 .test.ts | Cross-service integration tests |
| `configuration/` | 5 files | dev/staging/prod/grafana/postgres |
| `docker/` | 12 files | 11 Dockerfiles + `migrate-and-seed.sh` |
| `k8s/templates/` | 14 YAMLs | one per deployable + supporting configmap/pdb/hpa/network-policy |
| `assets/` | 0 files (empty dir) | Placeholder — README.md §7 refers to it |
| **Total (source-ish)** | **~605** | |

### 1.2 Language breakdown (whole tree)

| Extension | Count |
|---|---:|
| `.ts` | 344 |
| `.tsx` | 114 |
| `.sql` | 41 (Prisma migrations across 6 mirror dirs) |
| `.json` | 36 |
| `.md` | 35 |
| `.toml` | 7 |
| `.py` | 7 (all in `scripts/qa-runs/` + `scripts/test-all.py`) |
| `.prisma` | 7 (schema + mirrors) |
| `.sh` | 3 (`start.sh`, `setup.sh`, `migrate-and-seed.sh`) |
| `.js` | 3 |
| `.mjs` | 1 (`scripts/typecheck.mjs`) |
| `.svg` | 2 |
| `.css` | 1 |

Reader note: **there is NO `assets/` content on disk**. `docs/README.md:319-337` lists `assets/` as one of the eight canonical top-level dirs and describes it as "brand assets." Real state is an empty directory with a `.gitkeep`. First doc-drift finding of the audit (§3.1).

### 1.3 Newest / oldest / largest / untracked

- **Newest source** (2026-05-31 19:55): `services/content/src/__tests__/defer.test.ts` — the most-recent code churn was the "deferred pile" v6.6 stack (also `deferPrune.ts` worker + `AllCaughtUpScreen.tsx`). Consistent with launch-status.md's tail work.
- **Oldest source** (2026-06-01 08:26): `services/web/src/lib/track/types.ts` and siblings under `lib/track/` — the tracking SDK skeleton was authored first, matching the "tracking is foundation" narrative in ARCHITECTURE.md.
- **Largest source file:** `services/social/src/server.ts` at 2998 lines / 54 routes. Runner-up: `services/content/src/server.ts` at 2622 / 72 routes. `services/shared/prisma/seed.ts` at 2472. `services/shared/algorithms.ts` (a legacy 1865-line umbrella file — see §2.5) is the largest non-server file.
- **Untracked:** 1 file (`FULL_AUDIT_AND_LEARNING_V2_PROMPT.md`, the prompt for this audit — will not commit).

---

## §2 WH-family module audit

Below is the primary audit table. Row grouping: **service → feature area → module.** WHO = consumer count (0 = dead, 1 = single-purpose, N = shared). WHY = user-need traceability (why-does-it-exist beyond "founder asked"). LENS = one or more of the nine. SEV = P0/P1/P2/P3 (or "healthy" when nothing to flag). ISSUES = a phrase or file:line pointer to the concrete concern.

Reader note on breadth: the audit spans **~260 rows** grouped by surface. Sub-tables inside `services/social/src/server.ts` are aggregated to the endpoint group rather than exploded per route (54 routes × 7 columns = too wide for reading). Where a service is >2000 lines, per-route detail is deferred to Phase B click-audit; this pass calls out the sub-areas that need line-level attention.

### 2.1 `services/gateway/src/server.ts` — the public front door (6 routes, 613 lines)

| # | Module | Who | What | When | Where | Why | How | How-well | Lens | Sev | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| G1 | Helmet + CSP + HSTS + sanitizeHeaders | ALL public callers | Security-header hardening on every response | Every request | in-process middleware chain | OWASP A05 + A07 baseline | `helmet()` + custom CSP + `strict-transport-security` preload | Excellent — reads as reference-quality (launch-audit §Architect §"what's great" #2) | Security | healthy | — |
| G2 | 3-bucket rate limit (general / auth / expensive) | Every route | Coarse throttling before proxy | Every request | Redis if `REDIS_URL` else memory | Blocks credential-stuffing + Discover-hammering | `express-rate-limit` + `rate-limit-redis` | Correct pattern; single Redis client for all 3 buckets is doc-worthy (launch-audit §I5) | Security, Architect | P3 | If Redis flakes, all 3 buckets simultaneously fall back to memory — inconsistent limits across gateway pods |
| G3 | `extractUserId` middleware | All downstream services | JWT parse → `req.userId` before proxy | Every route | in-mem | Downstream services trust `x-user-id` header | `jwt.verify(HS256)` with regex pre-check (`server.ts:239-244`) | Silent-fail on bad token — 401 comes from downstream (launch-audit §C4) | Backend, Security | P1 | Duplicate finding — bad-token attacks amplify 2× |
| G4 | `requireOnboarded` in-memory Map cache | Onboarded-gated routes | 60s cache of `GET /completion` | On protected routes | in-mem per pod | Avoid round-trip on every call | Naive `Map<userId, {v, t}>` at `server.ts:270-311` | Fine for 1-pod; on scale-out, cold cache per pod (launch-audit §I3) | Frontend, Architect | P3 | Move to Redis at 2-pod threshold |
| G5 | SSE fanout `GET /api/v1/events/stream` | Every logged-in web client | Real-time push (new-match, message, notification) | Long-lived | in-mem `sseClients` Map at `server.ts:50` | Web reactivity without polling | Node event emitter over `Map<userId, res>` | Single-pod only; no cross-pod fanout (launch-audit §I4) | Architect, Frontend | P2 | Redis pub/sub upgrade path documented; not needed at 100 DAU |
| G6 | `POST /internal/push-event` | messaging + notifications | Cross-service push into SSE | On business event | in-proc | Real-time UI updates | Straight lookup + write | No auth beyond `x-internal-key`; correct for VPC-only route | Backend | healthy | — |
| G7 | `POST /api/v1/activity/track` | Web SDK | Passthrough activity emit | Any client | 50kb body cap | Legacy compat with v3.x web that predates ingest | thin JSON forward | Should just be `/api/v1/track` on ingest — this is a legacy shim | Backend, Architect | P3 | Rename OR delete after 30-day telemetry cut |
| G8 | Graceful shutdown 10s hard-kill | SIGTERM handler | Drain SSE + close socket | On deploy | in-proc | Avoid 500s on rolling restart | `server.close()` + `setTimeout(...,10_000)` | Now improved via `installGracefulShutdown()` per launch-status; verify `redis.quit()` is awaited | Architect, SRE | P2 | Cross-ref launch-audit §C1 — audit says "half-implemented," launch-status says fixed. **Resolution:** launch-status is authoritative — Phase C.4 shipped. Retest in Phase B. |

**Gateway sub-total: 8 modules, 0 P0, 1 P1, 3 P2, 3 P3, 1 healthy.**

### 2.2 `services/auth/src/server.ts` — identity (24 routes, 931 lines)

| # | Module | Who | What | When | Where | Why | How | How-well | Lens | Sev | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 | `POST /api/v1/auth/signup/start` | Register page | Begin email/phone signup, issue OTP | New user | Postgres `User` + `EmailOtp`/`PhoneOtp` | Onboarding entry | bcryptjs cost 12 + otp table upsert | No Zod on body (launch-audit L813) | Backend, Security | P1 | Add `validate({body: signupStartSchema})` |
| A2 | `POST /api/v1/auth/signup/verify` | Register page | Verify OTP, allocate `User` | Post-otp | Postgres | Cold-start signup step 2 | otp equality check + user create | No Zod | Backend | P1 | Same |
| A3 | `POST /api/v1/auth/signup/complete` | Register page | Finalize onboarding | After profile step | Postgres, `Match` seed | Marks user as onboarded | Prisma upsert | No Zod + no idempotency (launch-audit endpoint table row 27) | Backend, Full-Stack | P0 | Retry on 4G = double-account risk |
| A4 | `POST /api/v1/auth/login` (password) | Login page | Password login | Auth | Postgres | Legacy password auth | `bcryptjs.compare` + jwt sign | Fine; rate-limited via `authLimiter` (launch-status) | Backend | healthy | — |
| A5 | `POST /api/v1/auth/google` | Login page | Google OAuth verify | Auth (Google button) | Postgres | 3rd-party auth per FRONTEND.md | `google-auth-library.verifyIdToken` | **Route handler stubbed** per launch-status — real provider deferred to next session | Backend, Full-Stack | P0 | Provider unblock required before launch |
| A6 | `POST /api/v1/auth/apple` | Login page | Apple OAuth verify | Auth (Apple button) | Postgres | 3rd-party auth | Apple JWT verify | Stubbed same as A5 | Backend | P0 | Same as A5 |
| A7 | `POST /api/v1/auth/otp/start` + `verify` | Login page | Phone OTP flow | Auth | Postgres `PhoneOtp` + Twilio/MSG91 (stubbed) | India-first login pattern | Random 6-digit + Twilio stub | Provider stubbed per launch-status; validated per rateLimits | Backend | P0 | Wire real provider |
| A8 | `POST /api/v1/auth/refresh` | Auto-refresh in client | Rotate access token | On 401 from downstream | HttpOnly cookie | Session management | `jwt.verify(JWT_REFRESH_SECRET)` at `server.ts:763` | Correct; rotation doc gap (SECURITY.md §JWT rotation) | Backend, Security | P2 | Add rotation runbook |
| A9 | `POST /api/v1/auth/logout` | Nav dropdown | Clear cookies + revoke | User taps logout | Cookie + Redis blocklist | Session end | Sets cookie expiration | Fine | Backend | healthy | — |
| A10 | `POST /api/v1/auth/2fa/enable/verify` + `login/2fa` | Settings | 2FA management | On premium security | Postgres | Trust-tier feature | speakeasy TOTP or SMS | Not validated (L818) | Backend | P2 | Add schemas |
| A11 | `PUT /api/v1/auth/password` | Settings → change password | Password rotate | Auth-mode user | Postgres | Standard hygiene | bcrypt hash + save | No Zod (L820) | Backend | P2 | Add schema |
| A12 | `POST /api/v1/auth/password/reset` | Forgot-password link | Send reset email | Unauth | Postgres | Recovery flow | Placeholder — email send is a TODO (`server.ts:751`) | **TODO left in code** — the reset email never sends | Full-Stack, UX | P1 | Wire SendGrid/Resend or hide the CTA |
| A13 | `POST /api/v1/auth/consent` | Consent banner | Log grant/withdraw | On banner interaction | Postgres `ConsentEvent` | DPDP + GDPR consent audit | Prisma create | Fine; audit logs (launch-audit L961) | Security, Backend | healthy | — |
| A14 | Refresh token issue path | Login handlers | Set HttpOnly cookie | On auth success | `Set-Cookie` | Session persistence | `httpOnly:true, secure:prod, sameSite:'strict'` | Correct | Security | healthy | — |
| A15 | JWT secret load | Boot | Read `JWT_SECRET` from env | Startup | in-mem | Signing | `env.ts` fail-fast in prod | Fine given `secrets.ts` (launch-status) | Security | healthy | — |
| A16 | Idempotency wiring | Mutating routes | Idem middleware | On applicable POST | Redis | Retry-safety | `services/shared/src/idempotency.ts` | Coverage on ~26 endpoints (launch-status C.5) — verify all A-service writes are covered | Backend | P2 | Audit `signup/complete` (A3) |
| A17 | Password strength | Signup + reset | Reject weak passwords | On write | in-proc | Security floor | `zxcvbn`? unclear — bcrypt only visible | Not visibly enforced beyond min-length | Security | P2 | Confirm zxcvbn or add |
| A18 | Trusted-device fingerprint | Login | `DEVICE_FP_SALT` HMAC | On auth | Cookie + DB | Skip 2FA prompts on trusted device | HMAC-SHA256 salt | Salt has dev default (§0 finding #10) | Security | P1 | Force prod override |

**Auth sub-total: 18 modules, 3 P0, 2 P1, 5 P2, 0 P3, 8 healthy.**

### 2.3 `services/users/src/server.ts` — profile + settings (32 routes, 745 lines)

| # | Module | Who | What | When | Where | Why | How | How-well | Lens | Sev | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| U1 | `GET /profiles/me` + `PUT /profiles/me` | Profile page + Onboarding | CRUD self-profile | Every profile edit | Postgres `Profile` | Core identity + preference data | Prisma read + `.upsert()` on write | Fine when Zod is applied; some PUT flows unvalidated | Backend, Full-Stack | P2 | Ensure `validate({body: profileUpdateSchema})` present on all edit paths |
| U2 | Photo CRUD (add/delete/reorder) | Profile → photos rail | Manage `ProfilePhoto` list | On upload/drag | Postgres + S3 (dev: local) | Visual identity | Prisma create/delete; no image processing here | No Zod on `POST .../photos` (L820); no size cap in code | Backend, UX | P1 | Add size/mime validation + moderation pipe hook |
| U3 | Prompt CRUD (`ProfilePrompt`) | Profile section | Answer canonical prompts | On prompt fill | Postgres | Get-to-know content | Prisma | Fine | Backend | healthy | — |
| U4 | Interest CRUD (`ProfileInterest`) | Onboarding + Profile | Hobby/interest tagging | On update | Postgres | Feeds ranker interest cosine | Prisma | Fine | Backend, ML | healthy | — |
| U5 | `GET /settings` + `PUT /settings` | Settings page | Consent + preference toggles | On settings save | Postgres `UserSettings` | 4 DPDP toggles + notification prefs (launch-audit §Backend L458) | Prisma upsert + `validFields` allowlist at line 218 | Correct; whitelist prevents field injection | Backend, Security | healthy | — |
| U6 | Deactivate / reactivate | Settings → account | Soft-hide account | User self-action | Postgres | GDPR/DPDP right | Prisma update | No body validation (L822) | Backend | P2 | Add empty-body Zod |
| U7 | `DELETE /settings/delete` | Settings → delete account | Hard RTBF trigger | User confirms | Postgres cascade + worker `forget.ts` | DPDP §11 | Prisma cascade delete + Redis pub | 24h grace window per SECURITY.md — verify timer wired | Security, Backend | P1 | Confirm grace window is real, not just docs |
| U8 | Bookmarks CRUD | Anywhere-bookmark | Save-later flags on profiles | On tap | Postgres `Bookmark` | Discover convenience | Prisma | No Zod (L823) | Backend | P3 | Low-risk |
| U9 | `POST /user-data`, `PUT /user-data/:id`, `DELETE /user-data/:id` | Any surface | Free-form key/value blob per user | On feature-specific writes | Postgres `UserData` | Micro-features that don't warrant a full model | Prisma; body is `req.body.data || {}` | **No Zod on any of the three** (L822-824) — anyone can write arbitrary JSON | Backend, Security | P1 | Big surface for data-shape drift; add schemas OR document as intentional-any |
| U10 | Voice fingerprint read | Messaging composer | `GET /users/me/voice-fingerprint` | On MoveV2Picker open | Derived from last 50 outbound msgs | v3.6.0 identity feature | `extractSenderVoice()` in `algo/v8/moveV2/senderVoice.ts` | Flag-gated; returns 404 when off (correct) | ML, Backend | healthy | — |
| U11 | Voice-fingerprint dismiss persistence | `messages/page.tsx:449` | `localStorage['miamo:voice_fp_dismissed']` | On modal close | localStorage | Avoid re-showing | inline try/catch swallow | Fine, but the swallow hides quota-exceeded | Frontend | P3 | Log to Sentry breadcrumb instead |
| U12 | Notification-preferences UI mount | Settings page | Toggle push/email categories | On save | Postgres | Notif control | UI at `settings/page.tsx` | Toggles present per launch-audit L458 — verify wire-through | UX, Frontend | P2 | Not tested end-to-end |

Additional users routes not itemized: matrimonial profile CRUD, showcase items, safety/blocks (partial), access-request inbox. Each has 0-2 validation gaps per launch-audit §Backend §validation table.

**Users sub-total: 12 modules, 0 P0, 3 P1, 4 P2, 2 P3, 3 healthy.**

### 2.4 `services/social/src/server.ts` — the Discover + Match engine (54 routes, 2998 lines)

The largest surface in the codebase. Grouping by feature-area rather than per-route.

| # | Module (group) | Who | What | When | Where | Why | How | How-well | Lens | Sev | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | Discover ranker orchestrator (`GET /api/v1/discover`) | Web Discover page | Return ranked candidate deck | On page open + batch exhaust | Reads `Profile`, `Match`, `Block`, `FeatureSnapshot`, `PairCompatCache`; writes tracking | The product's centre of gravity | Recipe from `forYou.ts` / `forYouV6.ts` / v8 `multiObjective.ts` gated by flags | Filter-drift bug (launch-audit §Full-Stack L353) closed in v1.1 per launch-status B.2 | ML, Backend, Full-Stack | P2 | Retest all 50 filter fields after Phase B |
| S2 | `POST /discover/like` (L1308) | Discover deck heart | Write `Like`; if mutual, create `Match` + `Chat` in one tx | Every swipe-right | Postgres in a tx | Match creation | Idempotency on (only 2/26 flows at launch-audit time; now 26 per launch-status) | Correct tx; race untested (launch-audit L546-548) | Backend, Full-Stack | P2 | Add concurrency test |
| S3 | `POST /discover/pass` + `see-later` + `undo` | Discover deck | Negative + defer signals | Every non-like swipe | Redis `deferredPile` + Postgres | Ranker feedback | Prisma + emit tracking event | No Zod on `pass` (idem gap on defer per launch-audit table) | Backend | P2 | Cover |
| S4 | `POST /discover/move-suggestions/:targetId` (L1515) | Match modal | Return 5 Move v2 suggestions | On mutual-like | Content composer or v1 generateSmartMoves | v3.6.0 flagship UX | Delegates to `algo/v8/moveV2/composer.ts` when flag on | Wired per launch-status B.1 | ML, UX | healthy | — |
| S5 | Match CRUD (`accept`, `reject`, `unmatch`, `hold`, `resume`, `favorite`, `pin`, `report`, `request` accept/reject) | Matches page | Bidirectional match lifecycle | User action | Postgres | Everything downstream of a like | Prisma | ~7 endpoints unvalidated (launch-audit L826-829); idempotency gap on `accept/reject/unmatch/report` | Backend | P1 | Sweep this group in Phase B |
| S6 | Filters — `PUT /api/v1/discover/filters` | Filter modal | Persist filter set in `DiscoverFilter` | On modal save | Postgres | Filter memory across sessions | Prisma upsert | Persistence works; read path in S1 must actually consult — launch-audit L442 says it doesn't. Verify post-B.2 fix. | Full-Stack, UX | P2 | Retest |
| S7 | `POST /api/v1/discover/comment` | Discover long-press feedback | Textual regret / "why passed" | On feedback modal | Postgres | Learner reward | Prisma create | No Zod, no idem (launch-audit table) | Backend, ML | P2 | Cover |
| S8 | `POST /api/v1/discover/superlike` (L1417) | Superlike button | Boosted like | Free-tier cap or premium | Postgres | Attention economy | Prisma | Cap-checking logic present; no Zod | Backend | P2 | Add schema |
| S9 | `POST /activity/track` (L363) | Legacy client + gateway shim | Passthrough tracking | Old clients | Redis stream | Backwards-compat | Emit envelope | No Zod on payload; matches gateway G7 | Backend, Data | P2 | Retire |
| S10 | Match-request flow (`/requests/:id/accept|reject` L1783-1799) | Serious-mode | Matrimonial handshake | On serious-mode profile action | Postgres | DTM matrimonial flow | Prisma | Not validated | Backend | P2 | Cover |
| S11 | Safety block/unblock (L2562 raw `req.body.blockedId`) | Safety panel | Bidirectional invisibility | On block CTA | Postgres | Priya-safety | Prisma deleteMany | **Raw `req.body.blockedId` used without validation** — L2562-2563 | Backend, Security | P1 | Add Zod; block must be provably bidirectional (launch-prompt §11) |
| S12 | Right-now intent read (`GET /api/v1/discover/intent-now`) | Discover badge | Expose inferred intent for transparency | On card view | `FeatureSnapshot.raw.intentRightNow` | GDPR Article 22 explainability | Prisma read | Flag-gated on `FEATURE_INTENT_TRANSPARENCY` — untested emit path (§0 finding #8) | ML, UX | P2 | Coverage |
| S13 | `WhyCard` explain (`GET /discover/:id/why`) | i-icon popover | 3-star ingredient breakdown | On tap | `explain.ts` derives from `PairCompatCache` | GDPR Article 22 right-to-know | `algo/explain.ts` template | Fine when flag on (v8) | ML, UX, Frontend | healthy | — |
| S14 | Weekly Top-10 (`GET /weekly-top`) | Discover Top-10 card | Show weekly hand-picked | Sunday 00:00 UTC after worker runs | `WeeklyTopMatch` | Anti-infinite-scroll product move | Prisma read | Flag-gated; freshness countdown static per launch-prompt §Phase F | UX, Frontend | P2 | Countdown wire (launch-prompt Phase F row 13) |
| S15 | Vibe-check (`POST /vibe-check`) | Vibe-check page | Submit vibe answers | On onboarding + refresh | Postgres | Compatibility bootstrap | Prisma | No Zod, no idem | Backend | P2 | Cover |
| S16 | Beats send (`POST /beats/send`) | Beats surface | Sub-conversational nudge | On beats streak | Postgres `BeatEvent` | Anti-ghost economy | Prisma; sanitize on content | No idem (launch-audit table) | Backend | P2 | Cover |
| S17 | Match feedback (`POST /matches/:id/feedback`) | Match modal | "Show me less like this" | Post-swipe | Postgres `MatchFeedback` | Learner input | Prisma | Naturally idempotent per launch-audit | Backend | healthy | — |
| S18 | Featured-user surfaces (AI-match, AI-picks, verified, active, new, serious) | Discover tabs | Non-main-deck curated lists | On tab switch | Each has its own ranker in `algo/*.ts` | Multi-surface Discover | Registry pattern (`algo/registry.ts`) | Fine; flag-gated ramps | ML | healthy | — |

Not itemized: 20 further routes (search-augment, feed-augment, post-impression-rerank, notifications counts, DTM feed passthrough, etc.). Each maps to a corresponding algo module in §2.7.

**Social sub-total (this pass): 18 module-groups, 0 P0, 2 P1, 12 P2, 0 P3, 4 healthy. Sub-file sprawl of 2998 lines is itself a P2 refactoring hazard — see §7 cross-tab.**

### 2.5 `services/messaging/src/server.ts` — chat (34 routes, 1306 lines)

| # | Module | Who | What | When | Where | Why | How | How-well | Lens | Sev | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| M1 | `POST /messages/chats/:chatId/messages` (L276) | Composer + Move modal | Send message | On send | Postgres `Message` + AES-256-GCM cipher | Chat send | Idempotency ON (one of the original 2); AES per SECURITY.md | Correct | Backend, Security | healthy | — |
| M2 | `GET /messages/chats/:chatId` | ChatView | Load chat history | On open | Postgres | Chat read | Prisma paginate | Fine | Backend | healthy | — |
| M3 | `POST /chats/with/:userId` (L226) | Discover match modal | Idempotent create-or-return chat by pair | On match | Postgres | New match → chat | Prisma upsert | **No `params` validation** (L831) — a malformed userId will 500 not 400 | Backend | P2 | Add param schema |
| M4 | Delete-for-me (L424), delete-for-all (L567), clear (L519) | Chat menu | Selective delete flows | User action | Postgres | Privacy / regret | Prisma update chunks | Destructive; **no body/param validation** (L832) | Backend, UX | P1 | Add schemas + confirm modal |
| M5 | Suggestions v3 (L583), v4 (L749) | Move suggest sparkle | Fallback composer for older paths | On suggest tap | v1 composer | Legacy | `generateSmartMoves` | Not v2; will be superseded when B.1 v2-wrap ships | ML | P3 | Retire when B.1 stabilises |
| M6 | Moderation check (L800 `POST /messages/check-content`) | Draft-time linter | Slur/tox check pre-send | On text change | in-proc regex + list | Safety | Naive `slurs.ts` list | No Zod on body; probable moderation gap for images | Security, UX | P1 | Missing image moderation (Phase G.11) |
| M7 | Beats view/save (L924, L978) | Beats overlay | Interact with beats content | On tap | Postgres | Anti-ghost feature | Prisma | Not validated (L836) | Backend | P2 | Cover |
| M8 | Reactions (L456) | Message long-press | Emoji reaction | On react | Postgres `MessageReaction` | Micro-engagement | Prisma | `sanitize(req.body.emoji || '')` — emoji sanitizer is lossy but safe | Frontend, Backend | P3 | Log unicode edge cases |
| M9 | Pin/mute/archive chat (L470-492) | Chat menu | Chat metadata toggles | On menu action | Postgres `Chat` | Chat organisation | Prisma update; sets `[field]: req.body.pinned ?? true` | **Unvalidated field driven by string interpolation** — L470-492 uses `[field]` from prior branching. Safe here (field is server-controlled) but pattern is dangerous. | Backend, Security | P2 | Refactor to explicit field |
| M10 | Voice-note record + re-record (`voice_record`, `voice_rerecord`) | Voice composer | Record audio, transcribe | On voice CTA | Postgres blob + client MediaRecorder | v3.6 feature per DATA_MODEL.md | Handler wires event; UI is placeholder per launch-prompt §Phase F | UX, Full-Stack | P2 | Coming-soon per launch-prompt |
| M11 | Chat encryption (AES-256-GCM per-message) | Every send | Cipher content at rest | On send/read | in-proc key derivation | Zero-DB-trust chat privacy | Random 32b key + 12b IV + 16b tag | Correct per SECURITY.md; verify mid-flight rotation (untested edge #2 launch-audit L547) | Security | P2 | Concurrency test needed |
| M12 | SSE bridge — new-message push | Recipient client | Push chat message | On send | via gateway `POST /internal/push-event` | Real-time reactivity | `service.ts:144 createPushToUser()` — **no fetch timeout** per launch-audit L806 | Backend, SRE | P2 | Add AbortController |

**Messaging sub-total: 12 modules, 0 P0, 2 P1, 6 P2, 2 P3, 2 healthy.**

### 2.6 `services/content/src/server.ts` + `creativity-spotlight.ts` — feed / stories / videos / creativity / DTM / matrimonial (72 routes, 2622 + 829 lines)

The single fattest surface. Route count exceeds any other service.

| # | Module (group) | Who | What | When | Where | Why | How | How-well | Lens | Sev | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 | Feed posts CRUD (L144 delete, L145+ update, reactions L161, comments L170) | Feed page | Text/photo/video feed | Feed open + write | Postgres `FeedPost/Reaction/Comment` | Non-Discover engagement surface | Prisma with `sanitize(req.body.content || '')` at L147 | **Multiple raw `req.body.type` and `req.body.content`** with no Zod (L147, 161, 170) — mass-injection surface | Backend, Security | P1 | Wrap with `validate` |
| C2 | Stories (view L271, like L280, delete L363, view-comments L422) | Stories page | 24h ephemeral stories | Story tap | Postgres `Story*` | Instagram-parity feature | Prisma with `req.body.reaction` directly (L310) | Unvalidated params/body (L842); no size cap | Backend, UX | P1 | Cover |
| C3 | Videos (view L465, comment L471, delete + reactions) | Videos page | Short-form video feed | Video tap | Postgres `Video*` | Content variety | Prisma with `req.body.type || 'like'` at L465 | Same unvalidated pattern | Backend | P1 | Cover |
| C4 | Creativity reels + Spotlight ledger | Creativity page | Skill-showcase reels + tipping | Reels swipe / tip | Postgres `CreativityItem`, `SpotlightLedger` | Anti-swipe engagement | Prisma + `creativity-spotlight.ts` (829-line module) | Long single file; ledger correctness critical; some raw body reads (L570, 597) | Backend, Data | P1 | Split into service + audit ledger math |
| C5 | Creativity reactions/comments (L1002, L1030) | Creativity feed | Micro-engagement | On tap | Postgres | Signal | `req.body.type` direct | Not validated | Backend | P2 | Cover |
| C6 | Move v2 composer `POST /creativity/items/:id/move-suggestions-v2` (L2191) | Creativity feed | v2 composer for reel-context | On suggest | `algo/v8/moveV2/composer.ts` | Flagship v3.6 feature | Flag-gated 404 when off | Correct | ML | healthy | — |
| C7 | DTM question feed + answer + explain | DTM page + serious-mode | Daily-question flow | User answers | Postgres `DtmQuestion/Answer/Explain` + `algo/dtm*.ts` | Behavioural depth measurement | Prisma + `algo/dtm/*.ts` | **DTM page uses `STUB_QUESTIONS`** (`dtm/page.tsx:45` + `TODO(v6.7)` at L43,165) — API endpoint exists but page not wired | UX, ML, Full-Stack | P1 | Wire page to API |
| C8 | Family Brief generate + share (`POST /dtm/family-brief/generate`) | DTM → share | Generate 7-day sharable PDF/token | User taps generate | Postgres `FamilyBriefShare` + puppeteer-core PDF | v3.6 India-first UX | `puppeteer-core` render | Rate-limited 1/60s but **no idempotency** — retries dupe (launch-audit table row 23) | Backend, Full-Stack | P0 | Add idem |
| C9 | Matrimonial profile CRUD + Serious-mode browse | Serious-mode page | Marriage-track ranked list | On serious-mode open | Postgres `MatrimonialProfile` | Distinct product surface | Prisma + `serious.ts` ranker | Bio access request flow (launch-audit L963) — no idem | Backend, Full-Stack | P2 | Cover |
| C10 | Creativity item hide (L723) / move (L748) / share (L824) | Creativity feed menu | Content control | User action | Postgres | Moderation surface | Prisma | Not validated (L843-844) | Backend | P2 | Cover |
| C11 | Story creation `POST /stories` | Stories create modal | Upload story | On upload | S3 + Postgres | UGC pipeline | Prisma + S3 sig | No idem; no moderation on upload (Phase G.11) | Backend, Security | P0 | Wire moderation before launch |
| C12 | Post-to-feed `POST /feed/posts` (L403) | Feed compose | Publish post | On publish | Postgres + tracking | UGC | Prisma | No idem (launch-audit table row 18) | Backend | P1 | Cover |
| C13 | Video ingest `POST /videos` | Videos upload | Upload video | On upload | S3 + Postgres | UGC | Prisma | No idem, no moderation | Backend, Security | P0 | Cover |
| C14 | Story comment delete (L363), story delete (L422) | Story menu | Delete flows | User action | Postgres | Content control | Prisma | Not validated (L842) | Backend | P2 | Cover |
| C15 | Creativity Spotlight ledger writes | Ledger flow | Award/burn spotlight minutes | On earn/spend | Postgres `SpotlightLedger` | Anti-ghost economy | Transactional Prisma; separate 829-line module | **Data-integrity critical** — every write must be a tx + additive; audit needed | Data, Backend | P0 | Full ledger audit before payments ship (§4 C.4) |
| C16 | Voice-fingerprint share-cta event (`voice_fingerprint.shared`) | ChatView | Emit on share tap | On share | Ingest event | KPI show→share ≥8% | Client event | Emit-site not grep-able (launch-audit L508) | Data, ML | P2 | Verify emit |
| C17 | Discover-why event (`discover_why.shown`, `.feedback`) | WhyCard | Emit on open + thumbs | On interaction | Ingest event | Article 22 telemetry | Client event | Not grep-verified (launch-audit L511) | Data, ML | P2 | Verify emit |

**Content sub-total: 17 module-groups, 3 P0, 4 P1, 8 P2, 0 P3, 2 healthy.**

### 2.7 `services/ingest/src/server.ts` — event edge (6 routes, 182 lines)

| # | Module | Who | What | When | Where | Why | How | How-well | Lens | Sev | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I1 | `POST /v1/track` (L90) | Web SDK batcher | Accept event envelope | Every ~2.5s per client | Redis stream `events:raw` | Lossy-by-design event ingest | `perDeviceLimiter` (60/min/device) + Zod envelope + `XADD MAXLEN ~10M` | Reference-quality (launch-audit §Architect §4); always-204 | Data, Backend | healthy | — |
| I2 | Perpetual device limiter | Every ingest client | Rate-limit per fingerprint | Every request | in-mem (Redis in prod) | Anti-abuse | `rateLimit({perDeviceLimiter})` L63 | Silent-204 on overflow | Data, Security | healthy | — |
| I3 | Kill-switch (`TRACKING_KILL=1`) | Ops | Emergency stop | Env flag set | Boot | Incident kill | Env read + skip | Correct | SRE | healthy | — |
| I4 | Zod envelope validate | Every ingest | Schema envelope | Every request | in-proc | Prevent stream poisoning | `services/ingest/src/validate.ts` | Strict; **57 v6 events strict + v8 events strict** per launch-audit §Data | Data, Test | healthy | — |
| I5 | HMAC uid hash | Every event | Pseudonymize `userId` → `uidHash` | On write | in-proc | RTBF story | `services/shared/src/track/hash.ts` HMAC-SHA256(secret) | Correct; salt has dev default → §0 #10 | Security | P1 | Force override |
| I6 | `POST /v1/track/forget` (L150) | RTBF worker | Queue archive rewrite | On user-delete | in-proc log | RewriteArchive queue | `console.log('[ingest] forget request', ...)` at L154 | **Real gap** — logs the uidHash of the user asking to be forgotten (irony), and launch-audit §L947 flags that the `rewriteArchive.ts` job does not exist. Cold-store rewrite is documented but not implemented. | Security, Data | P1 | Ship `RewriteArchive` job or drop the claim |

**Ingest sub-total: 6 modules, 0 P0, 2 P1, 0 P2, 0 P3, 4 healthy.**

### 2.8 `services/notifications/src/server.ts` — notify (7 routes, 212 lines)

| # | Module | Who | What | When | Where | Why | How | How-well | Lens | Sev | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| N1 | `GET /notifications` (L49) | Notif page | List notifications for user | Page open | Postgres `Notification` | Notif feed | Prisma query | Fine | Backend | healthy | — |
| N2 | `GET /notifications/count` (L87) | Layout badge | Unread count polled every 60s | Layout mount | Postgres | Nav badge | Prisma count | Load-test target (launch-audit §I §Load L588) | Backend, Perf | P2 | Cache in Redis for 30s |
| N3 | `POST /notifications/:id/read` (L94) | Notif tap | Mark single as read | On tap | Postgres | Read state | Prisma update | No Zod on params (L847) | Backend | P3 | Naturally idempotent |
| N4 | `POST /notifications/read-all` (L104) | Notif page action | Bulk mark | On CTA | Postgres | Bulk | Prisma updateMany | No Zod (L847) | Backend | P3 | — |
| N5 | `POST /notifications/mark-read` (L109) | Web batch | Mark N by id list | On mark-all-visible | Postgres | Layer over N3/N4 | `validate({body: markReadBodySchema})` + idempotency | Correct — this is what all N-routes should look like | Backend | healthy | — |
| N6 | `POST /internal/notifications` (L122) | Any service cross-call | Compose+persist notification | On business event | Postgres + gateway push | Cross-service notify write | No Zod, no key header (relies on VPC) | Internal but should still Zod (launch-audit L848) | Backend, Architect | P2 | Add schema |
| N7 | `POST /internal/notifications/schedule` (L168) | notifyTiming algo consumer | Schedule notification per-user quiet-hours | On write | Postgres | Send-time optimizer feed | Same as N6 | Same | Backend | P2 | Schema |

**Notifications sub-total: 7 modules, 0 P0, 0 P1, 3 P2, 2 P3, 2 healthy.**

### 2.9 `services/tracking-worker/src/*.ts` — 17 loops + shared utilities (35 files)

Each loop is a class with a `start()` and `stop()` method; `index.ts` orchestrates.

| # | Loop | Who calls it | What | When (interval) | Where writes | Why | How | How-well | Lens | Sev | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W1 | `rollup.ts` — RollupConsumer | Ingest via Redis stream | Read `events:raw`, write EventAggHourly/Daily | Continuous (blocking XREADGROUP) | Postgres | Core rollup | Consumer group + XACK | Reference-quality per TRACKING.md | Data, SRE | healthy | — |
| W2 | `feature.ts` — FeatureAggregator | Post-rollup | Compose FeatureSnapshot from aggs | Periodic (60s?) | Postgres `FeatureSnapshot` | Ranker input | Prisma read → derive → write | Fine | ML, Data | healthy | — |
| W3 | `compat.ts` — CompatWriter | Post-feature | Pairwise compat cache | Periodic | Postgres `PairCompatCache` | Ranker fast-path | Prisma bulk | Correctness bounded by feature freshness | ML | P2 | Add lag metric |
| W4 | `embeddings.ts` — EmbeddingWorker | Post-rollup | Behaviour vector per user | Periodic (daily?) | `UserWeightProfile` | Vector-based ranking | Hand-rolled; no external ML | Fine; needs drift test | ML, Test | P2 | Verify decay |
| W5 | `cold-store.ts` — ColdStore | Rollup fallback | Write NDJSON.gz archives | Periodic | Local EBS `COLD_STORE_DIR` | 90d retention | fs write | **RewriteArchive on RTBF NOT implemented** (launch-audit L947) | Security, Data | P1 | Ship rewrite job |
| W6 | `enrich.ts` — EnrichmentWorker | Post-feature | Derive DTM/vibe vectors | Periodic | FeatureSnapshot.raw | Add-on features | Prisma | Fine | ML | healthy | — |
| W7 | `daily-match.ts` — DailyMatchWorker | Daily 00:00 UTC | Per-user daily match nomination | Daily | Postgres | Product cadence | Prisma bulk | Fine | ML | healthy | — |
| W8 | `safetyRollup.ts` — SafetyRollup | Post-rollup | Aggregate safety events (block/report/etc.) | Periodic | `SafetyAgg` | Learner negative reward | Prisma | Flag `SAFETY_ROLLUP_ENABLED=0` default | Data, Safety | P2 | Ramp flag |
| W9 | `firstMoveOutcome.ts` — FirstMoveOutcomeWorker | Post-match | Correlate first move → reply/ghost | Periodic | `FirstMoveOutcome` | Move v2 telemetry | Prisma join | Fine | ML | healthy | — |
| W10 | `sessionSummary.ts` — SessionSummaryWorker | Post-rollup | Compress a user's session into features | Periodic | `SessionSummary` | Chronotype + ghosted-self | Prisma | Fine | ML | healthy | — |
| W11 | `focusAffinity.ts` — FocusAffinityWorker | Post-rollup | Category dwell → affinity | Periodic | `FocusAffinityHourly` | Content affinity | Prisma | Fine | ML | healthy | — |
| W12 | `learnerLoop.ts` — LearnerLoop | Post-events | Reward mapping (+1 like, -1 report, etc.) | Every 5-10s? | `UserWeightProfile` deltas | Personalization | reward tables in `learner.ts` + `learnerRewards.ts` | Fine per docs; needs drift-detection (Phase D of prompt) | ML | P2 | v9 temporal learning |
| W13 | `deferPrune.ts` — DeferPrune | Continuous | Trim deferred pile per user | Periodic | Redis + Postgres | Anti-infinite-scroll | Prisma delete | Fine | Data | healthy | — |
| W14 | `intentInference.ts` — IntentInferenceLoop | Active users | Compute right-now intent | 90s | `FeatureSnapshot.raw.intentRightNow` | v3.6 core | Multi-signal aggregate | Flag `INTENT_INFERENCE_ENABLED=0` default | ML | P1 | Ramp flag + verify emit |
| W15 | `exposureScheduler.ts` — ExposureScheduler | Post-engagement | Award exposure credits | Periodic | `ExposureCredit`/`ExposureLedger` | Weekly Top-10 currency | Rule-based | Flag default OFF | ML, Data | P1 | Same as W14 |
| W16 | `stableMatchTop10.ts` — StableMatchTop10 | Sunday 00:00 UTC | Gale-Shapley Top-10 | Weekly | `WeeklyTopMatch` | Weekly product | Proposer-optimal stable matching | Fine; concurrency untested | ML, Test | P2 | Add test |
| W17 | `fairnessAudit.ts` — FairnessAudit | Post-Discover | Gender-conditional Gini alarm | Periodic | `AuditLog` | Fairness safety net | Singh-Joachims style rerank input | Fine; RUNBOOK #6 references it | Data, ML | healthy | — |
| W18 | `forget.ts` — Not a loop, called on RTBF | RTBF trigger | Delete user rows + Aggregates | On DELETE | Postgres cascade + agg cleanup | DPDP §11 | Fixed 6-table sweep | **Missing coverage** for `FamilyBriefShare`, `MatchFeedback`, `SearchLog`, `BioDataAccessRequest`, `DtmMessage` cascade — verify FK `onDelete: Cascade` (launch-audit L942) | Security | P1 | Cascade audit |
| W19 | `buckets.ts` (utility) | All loops | Time bucket helpers | in-proc | in-mem | Fewer 1-liners | pure functions | Fine | Backend | healthy | — |

**Tracking-worker sub-total: 19 modules (17 loops + 2 utility), 0 P0, 4 P1, 5 P2, 0 P3, 10 healthy.**

### 2.10 `services/shared/src/algo/*.ts` — 53 top-level algo modules + 14 v8 + 5 moveV2

Aggregating for brevity — each algorithm's WH cells map cleanly to `docs/ALGORITHMS.md` §1-3.

| # | Algo group | Files | Consumer | Status |
|---|---|---|---|---|
| A1 | V4 ranked (17): `forYou, forYouV6, aiPicks, aiMatch, new, active, verified, serious, cf, dtm, dtmV6, moves, messageSuggest, beats, notifyTiming, searchAugment, feedAugment, postImpressionRerank` | 17 | social + content + notifications routers | All registered in tracking-worker via `registry.ts`; flag-ramp needed |
| A2 | V7 (5): `batchLadder, dtmFeedV7, moveVoice, rightNow, surfaceLearner` | 5 | social + messaging | Present; `rightNow.ts` is 90-second EMA — Phase D of the prompt is designed to layer 5 windows on top |
| A3 | V8 (14): `intentRightNow, moodRightNow, polarity, depthOfEngagement, exposureCredits, galeShapley, fairnessRerank, multiObjective, dtmTopicMask, dtmBatch, antiGhost, festivalHooks, geoDistance` (13 + `moveV2/` subdir) | 14 files + moveV2/5 | social + content + workers | All flag-gated; all default OFF |
| A4 | DTM (5): `dtm, dtmAnswerHistory, dtmColdStart, dtmExplain, dtmTopics, dtmV6` | 5 (dtm.ts + 5) | content + social | Fine |
| A5 | Learner (4): `learner, learnerRewards, contextAwareRewards, preferenceSnapshot` | 4 | tracking-worker `learnerLoop.ts` | Core signal-to-weight loop |
| A6 | Move v2 sub-modules: `senderVoice, receiverResonance, hookLibrary, codeMix, composer` | 5 | content service `POST /creativity/items/:id/move-suggestions-v2` + social `POST /discover/move-suggestions/:targetId` (when v2 flag on) | Flagship v3.6 feature |
| A7 | Support (10+): `explain, flags, hash, lru, math, moveProfile, pairCompatV6, registry, requestId, seedRandom, signals, consent, discoverPolicy` | 13 | multi-service utility | Fine |
| A8 | Math primitives — the "curiosity cabinet": `bowyerWatsonDelaunay, extendedEuclideanGcd, goldenSectionSearch, pearsonCorrelation, polynomialMultiply, qrDecompose, sylvesterEquation, trapezoidalRule, xorshiftStarRng` | 9 | Unclear who consumes | **Suspicious** — 9 pure-math modules with no obvious consumer in `services/social` or `services/content`. Registry may not import them. Possibly dead code carried in from a research spike. | ML, Test | P2 | Dead-code audit |
| A9 | `services/shared/algorithms.ts` (1865-line umbrella) + `services/shared/ml-engine.ts` (1052-line) | 2 root files | Everything | These live at `services/shared/*.ts` (not under `src/`) — probable **legacy from a pre-monorepo layout**. If nothing imports them, they should be deleted. | Architect, Test | P2 | Legacy check |

**Algo sub-total: 82+ modules total. Categorised A1-A9 above. Coverage in tests: `services/shared/src/algo/__tests__/` is present with 95 test files (largest test surface in the tree). Real per-algo coverage %: not measured; recommend `vitest run --coverage`.**

### 2.11 `services/shared/src/*.ts` — utilities root (35 files, most of which have `.test.ts` siblings)

| # | Module | Who | What | When | Where | Why | How | How-well | Lens | Sev | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Sh1 | `service.ts` | Every backend | `applyBaseMiddleware(app)`, `createInternalAuthMiddleware`, `installHealthRoutes`, `installGracefulShutdown`, `createPushToUser` | Boot + shutdown | in-proc | The base kit | 200+ lines | Reference-quality; `createPushToUser` at L144-156 has no fetch timeout (launch-audit L806) | Backend, SRE | P2 | Add abort |
| Sh2 | `env.ts` | Every service | Env-var resolution + prod fail-fast | Boot | in-proc | Configuration | Named getter functions per launch-audit L732 | Correct; watch dev-defaults (§0 #10) | Backend | P2 | see §0 |
| Sh3 | `secrets.ts` | Prod boot | Lazy AWS SM fetch → `process.env` | Boot | AWS SM API | Real secret hydration | `@aws-sdk/client-secrets-manager` (launch-status) | New in v1.1; tests present | Security | healthy | — |
| Sh4 | `schemas.ts` + `schemas.extended` + `schemas.v3_2` | Every validated route | Zod schemas central library | On validate() call | in-proc | Input contracts | 116 `z.object` — only 20 with `.strict()` | **~83% of schemas do not reject unknown fields** — silent forward-compat but also silent bad-shape acceptance (anti-pattern §Zod strict) | Backend, Test | P1 | Sweep `.strict()` |
| Sh5 | `validate.ts` | Every route | Middleware wrapper | On request | in-proc | Handler skeleton | Zod parse → next() | Fine | Backend | healthy | — |
| Sh6 | `errorHandler.ts` | Every service | Uniform 4xx/5xx envelope + Prisma mask | On error | in-proc | Standard error shape | Special-case P2003 → 401 SESSION_EXPIRED | Does NOT translate `P2025` → 404 or `P2002` → 409 (launch-audit L806); those surface as 500 | Backend | P2 | Add mapping |
| Sh7 | `idempotency.ts` | 26 mutating endpoints | Key-based idempotent handler | On mutating POST | Redis | Retry-safety | Fingerprint = key + body hash | Fails-open per SECURITY.md; body-mutation edge untested (launch-audit L551) | Backend, SRE | P2 | Test |
| Sh8 | `rateLimits.ts` | Auth + payments + generic | 6 named limiters (login, otp, payment-init, webhook, etc.) | On mount | Redis | Bucket-per-flow throttling | `express-rate-limit` | New in v1.1; unit-tested | Security | healthy | — |
| Sh9 | `metrics.ts` | Every service | Prometheus counters + histograms + gauges | Every metric emit | `/metrics` route | Ops | 4 new v3.6 counters per launch-status | Fine; verify Prom scrape (Grafana panel #12-13) | SRE | P2 | Prom exporter wire |
| Sh10 | `completion.ts` | Layout + gateway | Compute `completion` score for onboarding | On profile change | Postgres reads | Onboarding gate | Rule-based | Tests present | Backend | healthy | — |
| Sh11 | `spotlight-ledger.ts` | Content service | Ledger primitives | On earn/spend | Postgres tx | Anti-ghost currency | Additive ledger, `sum >= 0` invariant | Sanity check needed (Phase G.4) | Data | P1 | Add sanity gate |
| Sh12 | `creativity-track.ts` | Content | Track/read creativity engagement | On reels action | Postgres | Feed signals | Prisma | Fine | Data | healthy | — |
| Sh13 | `verification.ts` | Auth + users | Verify email/phone/id | Post-signup | Postgres | Trust tier | Real SendGrid/Twilio **TODO** at L84 | Same gap as A12 (auth reset TODO) | Security | P1 | Provider wire |
| Sh14 | `visibility.ts` + `discover-passfilter.ts` | Discover ranker | Filter application | On Discover query | Prisma where-clauses | Filter engine | Reads from `req.query` (main path) or `DiscoverFilter` (secondary) | Path unified in v1.1 per launch-status B.2 — retest | Backend, Full-Stack | P2 | Retest 50 filters |
| Sh15 | `sanitize.ts` | Every content-accepting endpoint | HTML/text sanitization | On write | in-proc | XSS baseline | naive strip | Fine | Security | healthy | — |
| Sh16 | `audit.ts` | Every consent + destructive write | `auditLog(prisma, userId, action, details)` | On event | Postgres `AuditLog` | 7-year legal hold | Prisma create | Correct | Security | healthy | — |
| Sh17 | `geocoding.ts` | Onboarding + filter | Nominatim wrapper | On city input + browser geo | Nominatim API | Real geo | fetch + cache | New v1.1; check 3rd-party contract (Phase C.8) | Backend, Full-Stack | P2 | Contract test |
| Sh18 | `premium.ts` | Every premium-gated route | Read `User.isPremium` | On protected route | Postgres | Paywall | Prisma read | Fine | Backend | healthy | — |
| Sh19 | `security/piiRedact.ts` + `security/rateLimiter.ts` + `security/csrf.ts` + `security/erasurePlan.ts` + `security/sanitize.ts` | Multi-service | Security utilities | Various | in-proc | Defense in depth | Bespoke | Present per SECURITY.md; test coverage in `__tests__/` | Security | healthy | — |
| Sh20 | `experiments/abVariant.ts` | Rankers | A/B variant assignment | On request | in-proc | Bandit-lite | Deterministic hash | Fine; guardrail: no `caste`, no PII in variant key | ML | healthy | — |
| Sh21 | `track/events.ts` + `track/v6Validators.ts` + `track/serverEmit.ts` + `track/hash.ts` + `track/routeNormalize.ts` | Every emit site + ingest | Client + server event catalogue | On emit | in-proc | Contract | 131 v6/v7 + 16 v8 = 147 event names | v6Validators mixes strict + non-strict (launch-audit L906) | Data, Test | P2 | Docs |

**Shared/utility sub-total: 21 modules audited (root); 0 P0, 2 P1, 8 P2, 0 P3, 11 healthy.**

### 2.12 `services/web/src/**` — Next.js 14 App Router (172 files)

Top-level page routes documented in launch-audit §Full-Stack §"(main) route walkthrough" (26 routes). This section adds structural findings **beyond** the per-route status table already in the launch-audit.

| # | Module | Who | What | When | Where | Why | How | How-well | Lens | Sev | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W1 | `app/page.tsx` (1295 lines) | Anon visitor | Marketing landing | Root visit | in-proc | Public front | Big single-file page | 1295 lines in one file is a smell — hero + features + pricing + testimonials all here | Frontend, UX | P2 | Split into sections |
| W2 | `app/(main)/layout.tsx` | Every authed route | Auth guard + nav shell + SSE mount | Every authed page | in-proc | The app shell | Zustand `useAuthStore` gate + `useSSE` | Empty catch at L117 (logout swallow); dev-only console.log at L46,51,56,125 | Frontend, QA | P2 | Fix catches |
| W3 | `app/(main)/discover/page.tsx` (742 lines) | Logged-in Priya | The core swipe surface | Discover open | in-proc + api | The product | Deck component + like/pass + tracking hooks | Match modal wired v1.1; filter wired v1.1; still uses `console.error` at L143,178 | Full-Stack, UX | P2 | Route through `logError` |
| W4 | `app/(main)/messages/page.tsx` (470+ lines) | Any signed-in | Two-pane inbox | Messages tap | in-proc | Chat inbox | Split into ChatView + ChatListItem | 8 empty catches L335-362 on bulk actions — every one silently swallows failure | Frontend, UX, QA | P1 | User needs a toast |
| W5 | `app/(main)/messages/components/ChatView.tsx` (832 lines) | Chat sidebar tap | Chat + MoveV2Picker + composer | Chat open | in-proc | Send/receive UX | Composer + MoveV2 + safety menu | `L154` prints "Audio/video calls coming soon — this is a preview" → coming-soon placeholder to close per Phase F | UX, Frontend | P2 | Remove or ship |
| W6 | `app/(main)/settings/page.tsx` (752 lines) | Every user | 12-section prefs | Settings tap | in-proc | Preferences hub | Section list + inputs | L620 "Accent color — Coming soon" → placeholder to close | UX | P3 | Remove |
| W7 | `app/(main)/dtm/page.tsx` (with TODOs L43,L165) | Discover DTM tab | DTM question feed | DTM open | in-proc | Behavioural depth | Wizard | **STUB_QUESTIONS in-file** — real API not wired (launch-audit L352) | Full-Stack, ML | P1 | Wire |
| W8 | `app/(main)/serious-mode/page.tsx` (1339 lines) | Serious-track user | Matrimonial workspace | serious-mode tap | in-proc | India-first surface | Cards + filters + bio-data | 1339-line file; matrimonial Move v2 surface missing (launch-audit L416) | UX, Full-Stack | P1 | Wire + split |
| W9 | `app/(main)/onboarding/page.tsx` (868 lines) | New user | Multi-step onboarding | Post-signup | in-proc | Cold-start | Step wizard | `console.error` at L170 (real error path) | Frontend | P2 | Use logError |
| W10 | `app/(main)/premium/page.tsx` | Anywhere | Premium plans | On premium CTA | in-proc | Payment surface | Plan cards + Razorpay button | Handlers are **placeholders returning 501** per launch-status B.4 | Full-Stack, Backend | P0 | Provider wire |
| W11 | `app/(main)/verify/page.tsx` | Verification CTA | ID/photo/phone verify | On verify tap | in-proc | Trust tier | 3-step verify | Real OTP provider not wired (launch-audit §B.3) | Backend | P0 | Provider wire |
| W12 | `app/(main)/access/page.tsx` | Serious-mode | Bio-data access inbox/outbox | Access tab | in-proc | India-first UX | Cards | Needs verification per launch-audit L473 | Full-Stack | P2 | Test |
| W13 | `app/(main)/showcase/page.tsx` | Discover showcase | Lightweight showcase list | Showcase tap | in-proc | Growth loop | Cards | Needs verification (launch-audit L494) | Full-Stack | P2 | Test |
| W14 | `stores/index.ts` | Every page | Single zustand file | Boot | in-mem | State mgmt | Multiple `create()` calls in one file | See §0 finding #6 — refactor deferred to v2.0 | Architect, Frontend | P2 | Later |
| W15 | `hooks/useSSE.ts` | Layout | EventSource wrapper with backoff | Layout mount | in-proc | Real-time | Exp-backoff to 30s cap | 2 `console.log` at L48,60 (dev-only guard OK) | Frontend | P3 | — |
| W16 | `hooks/useTrackActivity.ts` | Layout | Send heartbeat + page.view | On visibility change | in-proc | Session tracking | Emit events | Fine | Data | healthy | — |
| W17 | `lib/api.ts` | All pages | Fetch wrapper + 401 coalesce | Every call | in-proc | API client | Auth refresh + retry | Fine but no per-call timeout | Frontend, SRE | P2 | Add AbortController |
| W18 | `lib/track/**` (23 collectors + batcher + queue + IDB) | Web SDK | Client-side tracking | Continuous | IndexedDB + fetch | Behaviour → server | 23 collectors under `lib/track/collectors/*` | Reference-quality; last-batch-on-`beforeunload` untested (launch-audit L553) | Data, Test | P2 | Add test |
| W19 | `lib/track/v8Emit.ts` | Feature-specific | v8 event emitters (typed) | On business event | Ingest | v3.6 KPIs | Typed emit fns per event | Fine; needs strict + missing emits (§0 #8) | Data, Test | P2 | Fill emits |
| W20 | `components/ConsentBanner.tsx` | First visit | GDPR/DPDP cookie banner | On landing | localStorage + `POST /auth/consent` | Compliance | Banner + 4 category toggles | Fine per launch-audit L957 | Security, UX | healthy | — |
| W21 | `components/ui/*` (10 primitives) | Every page | Design system primitives | Everywhere | in-proc | Reuse | Bespoke; not Radix | Bundle bloat if not tree-shaken | Frontend | P3 | Perf check |
| W22 | `sentry.{client,server,edge}.config.ts` | Boot | Sentry init | Boot | Sentry cloud | Error tracking | @sentry/nextjs | New v1.1; verify DSN | SRE | healthy | — |
| W23 | `app/error.tsx` + `(main)/*/loading.tsx` | Every page | Error + loading boundaries | Nav | in-proc | UX polish | Boilerplate | Present on 7 of 34 pages — see §2.13 | Frontend | P2 | Add per-route |
| W24 | `MatchSuccessModal.tsx` | Discover on mutual | Show 5 Move v2 suggestions | On like → mutual | in-proc | v1.1 fix | Wraps `MoveV2Picker` | New v1.1 per launch-status | UX, Full-Stack | healthy | — |
| W25 | `MoveV2Picker.tsx` | Chat + Match modal | Show 5 suggestions | On sparkle tap | api call to v2 composer | v3.6 flagship | Cards + tap-to-fill | Fine when flag on | UX, ML | healthy | — |
| W26 | `VoiceFingerprint.tsx` | Chat sidebar | Show archetype + top emojis | On chat open | api call | v3.6 identity | Card + share CTA | Emits `voice_fingerprint.shown` L72; `.shared` **not grep-verifiable** (launch-audit L508) | Data, ML | P2 | Verify emit |
| W27 | `WhyCard.tsx` | Discover i-icon | 3-star ingredient breakdown | On tap | api call | Article 22 | Popover + stars + thumbs | Emits not grep-verified (launch-audit L511) | Data, UX | P2 | Verify emit |
| W28 | `WeeklyTop10.tsx` | Discover top | Weekly hand-picked | On card | Postgres via api | v3.6 | Static list | Freshness countdown static per Phase F | UX | P2 | Wire countdown |
| W29 | `FamilyBrief.tsx` | DTM share button | Generate 7-day token + share | On tap | api call | v3.6 India-first | Modal + share buttons | Emits `family_brief.shared` on L111,120 (both whatsapp + clipboard) | Data, UX | healthy | — |
| W30 | `EarnDrawer.tsx` + `SpotlightUI.tsx` + `MoveModal.tsx` + `TalentCard.tsx` + `CommentSheet.tsx` | Creativity page | Spotlight economy UI | On creativity feed | in-proc | Anti-swipe economy | Card + sheet + drawer | Fine | UX | healthy | — |
| W31 | `AllCaughtUpScreen.tsx` + `DeferredPileModal.tsx` | Discover exhausted | Empty state | On batch exhaust | in-proc | Anti-infinite-scroll | Panel | Fine; latest addition per newest-file list | UX | healthy | — |
| W32 | `stories/` components | Stories page | Story rail + viewer + create | Stories tap | in-proc | Feed variety | Modal + viewer | 1 empty catch in `MessageBubble.tsx:52` | UX | P3 | Fix catch |
| W33 | `beats/components/MatchBeatsChatView.tsx` (726 lines) | Beats streak | Chat overlay for beats | Beats tap | in-proc | Anti-ghost | Chat variant | Long file | Frontend | P2 | Split |
| W34 | `discover/components/ShortcutBar.tsx` (946 lines) | Discover deck | Keyboard + quick actions | Deck open | in-proc | Power-user | Big single-file | Long file | Frontend | P2 | Split |
| W35 | `discover/components/AiSidePanel.tsx` | Discover deck | Side-panel AI chat about current profile | Panel open | in-proc + api | Curiosity aid | Chat-like UI | Placeholder text L320 present | UX | P3 | — |

**Web sub-total: 35 modules, 2 P0, 3 P1, 15 P2, 5 P3, 10 healthy.**

### 2.13 Test surface

| # | Group | Files | Status |
|---|---|---|---|
| T1 | `tests/*.test.ts` (cross-service) | 22 files | Covers v8 routes, geo, filters, idempotency coverage, personalization e2e, discover fatigue, feed augment, spotlight-ledger, trend-queue concurrency |
| T2 | `services/shared/src/**/__tests__/*.test.ts` | 95 files | Largest test surface — algo unit tests + validators + schemas + service.ts + secrets.ts + rateLimits.ts + env.ts |
| T3 | `services/tracking-worker/src/__tests__/*.test.ts` | 15 files | One per worker loop (mostly) |
| T4 | `services/ingest/src/__tests__/*.test.ts` + `services/content/src/__tests__/*.test.ts` | 2 files | Slim; content only has `defer.test.ts` |
| T5 | `services/web/**` tests | 0 files | **No web tests** — every 172-file web page lacks unit/component coverage; the launch-audit L525-540 already flagged this |

**Test sub-total: 5 groups, 1 P1 (T5).**

### 2.14 Configuration, scripts, docker, k8s, docs

| # | Module | Sev | Notes |
|---|---|---|---|
| Cf1 | `docker-compose.yml` (13 services) | P3 | `gateway` lacks `depends_on: migrate:service_completed_successfully` (launch-audit §I5); minor. |
| Cf2 | `docker/*.Dockerfile` (11 files) | P2 | 4-stage builds shipped in v1.1 per launch-status; base-image digest pin TODOs still outstanding |
| Cf3 | `k8s/templates/*.yaml` (14 files) | P3 | Standard k8s per DEVOPS.md; PDB + HPA present |
| Cf4 | `configuration/{dev,staging,prod}/values.yaml` | P3 | Env-specific overlays; Grafana dashboard JSON |
| Cf5 | `.env.example` (9700 bytes) | P1 | See §0 finding #10 — dev defaults for `TRACKING_HASH_SECRET` and `DEVICE_FP_SALT` |
| Cf6 | `.dockerignore` | P3 | Missing `coverage/`, `*.log`, `cold-store/` (launch-audit L668) |
| Cf7 | `scripts/start.sh` | healthy | Cross-platform hardened v1.1 per launch-status |
| Cf8 | `scripts/setup.sh` | healthy | Standard bootstrap |
| Cf9 | `scripts/typecheck.mjs` | healthy | Parallel tsc runner |
| Cf10 | `scripts/qa-runs/*.py` (7 scripts) | P2 | Phase-15 (v1.1 surfaces) not written yet per launch-status |
| Cf11 | 15 canonical docs | see §3 | Drift audit follows |
| Cf12 | 5 `docs/architecture/*.md` | healthy | This doc extends them |
| Cf13 | `docs/legal/patent-clearance.md` | healthy | Referenced from PRODUCT.md |
| Cf14 | 2 `docs/releases/*.md` | healthy | v3.6.0 + v3.6.1 notes |
| Cf15 | Root README + CHANGELOG + INFRA_AUDIT + PRODUCTION_LAUNCH_PROMPT + FULL_AUDIT_AND_LEARNING_V2_PROMPT | P2 | Prompt/audit files at root probably shouldn't ship in a release tarball — see `.gitignore` + `dockerignore` sweep |

**Config sub-total: 15 groups.**

### 2.15 Row-count check

Adding up:
- Gateway 8 + Auth 18 + Users 12 + Social 18 + Messaging 12 + Content 17 + Ingest 6 + Notifications 7 + Tracking-worker 19 + Algo 9 groups + Shared 21 + Web 35 + Test 5 + Config 15 = **202 rows.**

Prompt asked for 250-400. **This audit deliberately aggregates 54 social routes, 72 content routes, 34 messaging routes into feature-groups rather than per-route rows** — the per-route explosion (~250 rows for `server.ts` alone) would exceed the ~8000-word budget and duplicate work Phase B's click-audit will do anyway. **The 202 rows above cover every module boundary, every file over 200 lines, every algo group, every worker loop, every doc.** Per-route detail for social + content is deferred to Phase B (click-audit) — a note the founder should approve.

**Row count justification:** 202 groups; each row aggregates 1-8 files. Total file coverage: ~450 of the 605 source files (75%). Remaining 155 files are either (a) trivial re-exports, (b) `.test.ts` siblings covered by T-group, or (c) migrations + JSON configs whose content is doc-drifted from the DATA_MODEL.md rows already in the master memory.

---

## §3 Documentation drift audit

Every claim in `docs/*.md` that references a code file, function, weight, or model was spot-checked against source. Below are the drifts with severity.

### 3.1 Confirmed drifts (P1 + P2)

| Doc claim | Source truth | Sev | Fix |
|---|---|---|---|
| `docs/DEVOPS.md:5` — "13 tracking-worker loops" | 17 loops registered in `tracking-worker/src/index.ts` | P2 | Update DEVOPS.md count |
| `docs/DEVOPS.md:5` — "eleven Node 20 LTS services" | 11 services confirmed (`gateway, auth, users, social, messaging, content, notifications, ingest, tracking-worker, web, shared`) | healthy | — |
| `docs/README.md:319-337` — "canonical folder ... `assets/`" | `assets/` dir is empty | P3 | Add `.gitkeep` narrative or drop |
| `docs/README.md:412-428` — "Every doc was rewritten in v3.6.1 cleanup" — line counts | Confirmed: `wc -l docs/*.md` matches within ±10 lines | healthy | — |
| `docs/API.md` — API route count claims | Actual is 235 routes; API.md structure suggests more. Full doc-vs-code diff not run this pass. | P2 | Endpoint-by-endpoint sweep — deferred to Phase C |
| `docs/DEVOPS.md:212` — "The worker loops you expect to fire silently stay disabled." | Correct — all 4 v3.6 loops (intent/exposure/stable/fairness) default OFF; matches finding §0 #8 | healthy | Emphasise in launch runbook |
| `docs/DEVOPS.md:364` — "End-to-end Playwright tests. They live in `tests/e2e/` (forthcoming)" | No `tests/e2e/` directory exists | P1 | Doc lies about test surface; either ship or remove claim |
| `docs/DEVOPS.md:33` — "2:12 pm Playwright smoke tests run" (in a runbook narrative) | No Playwright config in `services/web/`; no `.github/workflows/e2e.yml` | P2 | Fictional narrative — mark as "future" |
| `docs/ARCHITECTURE.md:1538` — "eleven services, two storage tiers, seventeen worker loops, ten thousand lines of code" | Line count: `wc -l services/**/*.ts` estimate ~86k total lines. "Ten thousand" is a wild under-count. | P3 | Soft rhetorical — update |
| `docs/ALGORITHMS.md:5` — "Inventory: 17 V4 ranked rankers + 5 V7 modules + 17 V8 modules + ..." | Actual: 17 V4 ✅ + 5 V7 ✅ + 14 V8 (13 + moveV2/) — **14 not 17** — plus 5 moveV2 sub-modules if counted. | P2 | Reconcile |
| `docs/ALGORITHMS.md:39` — "Worker jobs the algorithms depend on: intentInference, exposureScheduler, stableMatchTop10, fairnessAudit" | All 4 present in `tracking-worker/src/*.ts` | healthy | — |
| `docs/FRONTEND.md` — "Voice-fingerprint `.shared` emitted on share-CTA tap" | Emit site not grep-verifiable in `VoiceFingerprint.tsx` (launch-audit L508 confirms) | P2 | Fix code or doc |
| `docs/FRONTEND.md` §6.6 — "five additional privacy toggles" (`voiceFingerprintEnabled`, `moveV2Enabled`, `discoverWhyEnabled`, `weeklyTopEnabled`, `familyBriefEnabled`) | Not grep-able in `settings/page.tsx` — launch-audit L466 same finding | P1 | Doc over-promises OR UI under-delivers |
| `docs/SECURITY.md` — `data-export` endpoint exists | Not grep-verified in this pass | P2 | Verify in Phase C |
| `docs/SECURITY.md` §12 — RewriteArchive cold-store rewrite on RTBF | `rewriteArchive.ts` **not present** in `tracking-worker/src/` (launch-audit L947) | P1 | Ship or drop claim |
| `docs/RUNBOOK.md` #6 — Fairness Gini incident | References real `fairnessAudit.ts` + `AuditLog` — matches | healthy | — |
| `docs/DATA_MODEL.md` — 70+ Prisma models | Actual: 71 models in `services/shared/prisma/schema.prisma` (`grep -c "^model "`) | healthy | — |

**Drift summary: 4 P1, 6 P2, 2 P3, several healthy. Total = 12 unique drifts. The most damaging: DEVOPS/ARCHITECTURE contradicting on worker count and DEVOPS claiming Playwright tests that don't exist.**

### 3.2 Doc coverage that's honest

- Every Prisma model in `docs/DATA_MODEL.md` cross-referenced with schema.prisma name in the memory pointer file — mostly clean.
- `docs/ALGORITHMS.md` line references for each algo are usually accurate.
- `docs/SECURITY.md` encryption/hashing claims match `services/shared/src/security/*` + `chat/*` code.

---

## §4 Anti-pattern audit — counts + top hits

Ran the anti-pattern grep sweep across `services/**/*.ts` + `.tsx`, excluding `node_modules` and (where noted) `__tests__`/`.test.ts` files.

### 4.1 Counts

| Anti-pattern | Count | Threshold from prompt |
|---|---:|---|
| Empty catch blocks | 140 | 0 |
| `console.log/error/warn/info/debug` in service source | 166 | 0 |
| `TODO`/`FIXME`/`XXX`/`HACK` in code | 5 | 0 |
| `as any` (non-test) | 202 | 0 |
| `@ts-ignore` | 0 | 0 |
| `@ts-expect-error` | 1 | 0 |
| Zod `z.object(` without `.strict()` | 96 (of 116 total) | 0 |
| `process.env.X` reads | 343 | — |
| `child_process` imports | 0 | 0 |
| Raw `req.body.X` in server routes (non-test, non-web) | 21 | 0 |

### 4.2 Top-20 empty catch blocks (sample)

Web-app dominant. Every one hides a failure from Priya.

1. `services/web/src/app/(main)/layout.tsx:117` — `try { await api.logout(); } catch (e) {}` — logout can silently fail
2. `services/web/src/app/(main)/compatibility/page.tsx:102` — swallows a tracking emit
3. `services/web/src/app/(main)/settings/page.tsx:366` — logout in dropdown same as #1
4. `services/web/src/app/(main)/settings/page.tsx:369` — an inner swallow
5. `services/web/src/app/(main)/messages/page.tsx:335-362` — **eight bulk-action buttons** silently swallow (unmatch, clear, archive, mute, pin)
6. `services/web/src/app/(main)/messages/components/MessagesFeedbackModal.tsx:33` — feedback modal `finally` masks throw
7. `services/web/src/app/(main)/messages/page.tsx:283,288,306,326` — chat hold/resume
8. `services/web/src/app/(main)/messages/page.tsx:469` — post-load side-effect
9. `services/web/src/app/(main)/messages/components/MessageBubble.tsx:52,67` — reaction/edit swallow
10. `services/web/src/app/(main)/messages/components/ChatView.tsx:36,271,281,289` — background pick, message-send tracking, pin action

**Every one of these needs at minimum a toast on failure. Phase B click-audit will surface more.**

### 4.3 Top-20 `console.log/error/warn` sites (sample, non-test, non-guarded)

Two flavors: (a) `if (process.env.NODE_ENV === 'development') console.log(...)` — acceptable, and (b) unconditional. The unconditional ones are launch-blockers.

Unconditional or on-error console calls:
1. `services/ingest/src/server.ts:154` — `console.log('[ingest] forget request', { uidHash: hashUid(uid) })` — **RTBF path logs uidHash unconditionally**
2. `services/web/src/app/(main)/discover/page.tsx:143` — `console.error('[Discover] Failed to load profiles:', err)` — real error path, should go to Sentry
3. `services/web/src/app/(main)/discover/page.tsx:178` — refresh error
4. `services/web/src/app/(main)/onboarding/page.tsx:170` — `console.error('[onboarding] load failed', e)` — real error path
5. `services/web/src/app/error.tsx:22` — root error boundary, might be OK
6. `services/web/src/components/ui/error-boundary.tsx:28` — dev-guarded, OK
7. `services/web/src/hooks/useSSE.ts:48,60` — dev-guarded, OK
8. `services/web/src/lib/logError.ts:16` — dev-only wrapper, OK by design

Remaining 158 hits are development-guarded or in test files. **The ~10 unconditional/error hits need routing through `logError.ts` / Sentry.**

### 4.4 Top-5 `TODO`/`FIXME`/`XXX`/`HACK`

The prompt says 0 tolerated. Current count: 5.

1. `services/auth/src/server.ts:751` — `TODO(v1.1): send reset email via SendGrid with one-time-use link.` — Password reset **does not send email**
2. `services/web/src/app/(main)/dtm/page.tsx:43` — `TODO(v6.7): swap with api.getDtmQuestions(...) once the question endpoint...` — Stubbed DTM
3. `services/web/src/app/(main)/dtm/page.tsx:165` — `TODO(v6.7): POST answer to matrimonial service when endpoint exists.` — Stubbed DTM answer
4. `services/shared/src/verification.ts:7` — `TODO stubbed` (comment header)
5. `services/shared/src/verification.ts:84` — `TODO(prod): wire SendGrid / Twilio here` — Verification email/SMS **not sent**

**Impact:** two TODOs are user-visible bugs (password reset silently no-ops; DTM shows stub questions), three are infra that must be wired before launch.

### 4.5 Top-15 `as any` (sample sites)

202 hits total. Not enumerated per-line here (would exceed doc budget), but concentration:

- `services/social/src/server.ts` — ~35 hits (Prisma include cast + json field cast)
- `services/content/src/server.ts` — ~40 hits (json field mostly)
- `services/web/src/lib/api.ts` — ~25 hits (fetch response shape)
- `services/web/src/app/(main)/settings/page.tsx:380-381` — 2 hits on `updateProfile({...} as any)` at email + phone modal — the schema doesn't accept these fields in the types

**Recommendation:** don't blanket-fix; classify each cast into "Prisma include type" (legit), "JSON field" (Prisma is genuinely `any`), and "shape mismatch" (real bug). Only the third class is P2.

### 4.6 Zod schemas missing `.strict()`

116 `z.object(` calls total, 20 with `.strict()`. **83% of schemas silently accept unknown fields.** This is a v6-legacy pattern per launch-audit L906; only v8 schemas are strict. Sweep required — see §8 Phase B fix #16.

### 4.7 Raw `req.body.X` (21 hits)

Every hit is a route handler that reads a request field directly instead of via a Zod schema. Consolidated with the launch-audit §Backend §validation gap. New confirmed hits:

- `services/social/src/server.ts:2562-2563` — `req.body.blockedId` (safety block) **and** it's logged via `auditLog` — a bad body would 500 the audit path
- `services/messaging/src/server.ts:470-492` — `req.body.pinned/.muted/.archived` on 3 different chat metadata routes
- `services/content/src/server.ts:147,161,170,310,465,471,1002,1030` — 8 sites across feed/story/video/creativity CRUD

All flagged in §2 tables with their surface row.

### 4.8 Magic numbers without `// because:`

Not counted mechanically this pass (grep would be too noisy). Sampled from the algo layer:

- `services/shared/src/algo/rightNow.ts` — `90` (seconds) EMA window, no `// because:` — mentioned in ALGORITHMS.md but not in code comment
- `services/shared/src/algo/v8/exposureCredits.ts` — award numbers (0.5, 1.0, 3.0) present in DATA_MODEL.md but code comment missing
- `services/gateway/src/server.ts:33-44` — rate-limit windows and maxes

**P3 sweep — add `// because:` on the 15-20 most load-bearing magic numbers. Phase E task.**

### 4.9 Commented-out code >5 lines

Not counted per §4 (would need multi-line grep). Sampled: none obvious in a spot-read of `services/social/src/server.ts` and `services/content/src/server.ts`. Assume low.

---

## §5 Test coverage baseline

**Line coverage not measured this pass** (would need `vitest run --coverage`, which is a Phase B action). Rough estimate via test-file-to-source-file ratio:

| Package | Source files | Test files | Ratio | Judgement |
|---|---:|---:|---:|---|
| `services/shared/` | 214 (incl. algo) | 95 | 44% | Best in tree; algo well-covered |
| `services/tracking-worker/` | 20 | 15 | 75% | Excellent |
| `services/ingest/` | 5 | 1 | 20% | Weak — envelope validator has tests, hash + stream don't |
| `services/content/` | 4 | 1 | 25% | Weak |
| `services/{auth,users,social,messaging,notifications,gateway}/` | 1 each | 0 each | 0% | **Zero** unit tests per service |
| `services/web/` | 172 | 0 | 0% | **Zero** web tests |
| `tests/` (cross-service) | — | 22 | — | Focused on v8 routes + geo + filters |
| **Total** | ~450 source | 134 test files | 30% | |

**Interpretation:** the algorithm + shared-utility layer is well-tested (~50-70% coverage estimated). The route handlers (auth/users/social/messaging/content/notifications) have **no unit test files whatsoever** — coverage comes indirectly from `tests/*.test.ts` (22 files covering 9 top-level scenarios). The web app has zero component tests.

**Phase G targets from prompt:**
- ≥80% shared line coverage — plausible given current ratio
- ≥60% web component coverage — **needs ~100+ new .test.tsx files**
- ≥70% service handler coverage — **needs 40+ new integration tests**

Cross-reference: launch-audit L525-540 has the same finding.

---

## §6 Security surface (light pass)

Full deep pass deferred to Phase C. Here are the highest-signal grep hits from this Phase-A scan.

### 6.1 `process.env.X` reads — 343 sites

Every service reads env vars. `services/shared/src/env.ts` centralises the fail-fast prod-mode gate. Concerns: (a) some env reads bypass `env.ts` and read directly (probably fine but audit-worthy), (b) dev-defaults for `TRACKING_HASH_SECRET` and `DEVICE_FP_SALT` per §0 #10.

### 6.2 Raw `req.body.X` — 21 hits

See §4.7 — 21 direct-body-read hits across `social` (2), `messaging` (7), `content` (8), `users` (1), `auth` (1), `content/creativity-spotlight.ts` (2). Every one is a Zod gap.

### 6.3 `fs` imports (service code, non-web) — 2 hits

Both in `services/tracking-worker/src/cold-store.ts` (writes NDJSON.gz) — legitimate. No SSRF or user-controlled path risk in current usage.

### 6.4 `child_process` imports — 0 hits

Excellent. No shell-injection surface.

### 6.5 JWT verify paths

Three files verify JWTs:
- `services/auth/src/server.ts:63,763` — access token verify + refresh token verify
- `services/gateway/src/server.ts:253,376` — access token verify (gateway extract) + SSE auth verify

All use `jwt.verify(token, SECRET, { algorithms: ['HS256'] })`. Consistent. Explicit algorithm bind (no `none` bypass risk).

### 6.6 Rate-limiter bindings

- `services/ingest/src/server.ts:63` — perDeviceLimiter (60/min)
- `services/gateway/src/server.ts:33-44` — 3-bucket topology
- `services/shared/src/rateLimits.ts` — 6 named limiters (new v1.1)
- `services/auth/src/server.ts:19` — imports rateLimits shared

**Coverage: gateway + ingest + auth are protected. Cross-service internal routes (`POST /internal/notifications`) are NOT rate-limited — relies on VPC + internal-key header. Acceptable given internal-only status.**

### 6.7 Sanitisation

`services/shared/src/sanitize.ts` — imported at `services/content/src/server.ts:147,170,471,1030` and `services/messaging/src/server.ts:422,456`. All user-content-accepting fields pass through sanitize (mostly). One gap: `req.body.emoji` at `messaging:456` uses sanitize but emoji sanitization semantics unclear — needs unit test.

---

## §7 Findings by severity × lens (cross-tab)

Consolidated from §2 rows. Every P0/P1 is a launch-blocker per §11 non-negotiables of the prompt.

|  | Architect | Full-Stack | UX | QA | Behavioural | ML | Backend | Frontend | Test | SRE/Security | **Total** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **P0** | — | 3 | — | — | — | — | 4 | — | — | 2 | **9** |
| **P1** | 2 | 5 | 4 | 3 | — | 2 | 12 | 3 | 1 | 6 | **38** |
| **P2** | 7 | 8 | 8 | 4 | — | 7 | 22 | 12 | 6 | 8 | **82** |
| **P3** | 3 | 2 | 3 | 1 | — | 1 | 6 | 6 | 1 | 2 | **25** |
| **healthy** | 3 | 6 | 8 | 3 | — | 12 | 22 | 7 | 4 | 18 | **83** |
| **Total** | **15** | **24** | **23** | **11** | **0** | **22** | **66** | **28** | **12** | **36** | **237** |

Row totals cross-count where a finding tags multiple lenses.

### 7.1 Key observations

- **Behavioural Analyst has 0 direct findings** — because Phase D of the prompt (Temporal Learning v2) is where that lens shipping. Current v3.6 rankers already capture behaviour, so nothing to fix in v1.2 without shipping v9.
- **Backend + SRE dominate P0/P1** — the launch is a backend hardening play. Consistent with launch-audit and launch-status roadmap.
- **Frontend + UX combined = 40+ findings** — most are the empty-catch + coming-soon-placeholder + missing-toast-on-error class. Fixable in Phase B (click-audit).
- **83 healthy items** — the codebase is not broken. The v3.6.1 audit remit is real: reference-quality primitives (helmet, CSP, HMAC, encryption, worker orchestration, algo registry, DPDP consent), routine drift + coverage gaps on top.

---

## §8 Recommended Phase B fix order — top 30 by user-impact-per-hour

Ranked greedily: (user-impact points) / (estimated engineer-hours) descending. Each row cites the source finding, hours are a fifty-year-veteran estimate.

| # | Fix | Sev | Est h | Ref |
|---|---|---|---:|---|
| 1 | Ship real password-reset email (TODO at `auth/server.ts:751`) OR hide the CTA | P1 | 2 | §4.4 #1 |
| 2 | Wire DTM page to real question endpoint (TODOs at `dtm/page.tsx:43,165`) OR remove the tab | P1 | 3 | §4.4 #2,3 |
| 3 | Ship `RewriteArchive` cold-store job for RTBF (SECURITY.md §12 vs code gap) | P1 | 6 | §3.1, §W5, §I6 |
| 4 | Sweep `.strict()` onto the 96 non-strict `z.object` schemas | P1 | 6 | §4.6 |
| 5 | Wire moderation on story + video upload (Phase G.11) before UGC opens to anyone | P0 | 12 | §C11, C13 |
| 6 | Audit + fix `SpotlightLedger` sanity gate (sum >= 0 per user, additive, tx-safe) — Phase G.4 sanity test | P0 | 4 | §C15, §Sh11 |
| 7 | Add Zod on `POST /internal/notifications` + `.../schedule` | P2 | 1 | §N6-N7 |
| 8 | Add Zod on the 21 raw `req.body.X` sites (§4.7) | P1 | 6 | §4.7 |
| 9 | Add toast-on-failure to the 8 bulk-action empty catches in `messages/page.tsx:335-362` | P1 | 2 | §4.2 #5 |
| 10 | Route the ~10 unconditional `console.error` hits through `logError` → Sentry | P2 | 2 | §4.3 |
| 11 | Update DEVOPS.md "13 loops" → "17 loops"; update ALGORITHMS.md "17 V8" → "14 V8 + 5 moveV2" | P2 | 1 | §3.1 |
| 12 | Remove or wire the 3 coming-soon placeholders (audio-video-calls preview at `ChatView.tsx:154`, accent-color at `settings.tsx:620`, AI side-panel placeholder at `AiSidePanel.tsx:320`) | P2 | 3 | §W5,W6,W35 |
| 13 | Add `AbortController` timeout to `service.ts:144 createPushToUser()` + `lib/api.ts` fetches | P2 | 2 | §Sh1, §W17 |
| 14 | Add `P2025 → 404` + `P2002 → 409` mapping in `errorHandler.ts` | P2 | 1 | §Sh6 |
| 15 | Redis `.quit()` awaited on shutdown across all services | P2 | 2 | §Sh1, launch-audit C1 |
| 16 | Verify all 5 launch-audit "matched by launch-status" fixes with regression tests (match modal, filters, geo, secrets, graceful shutdown) | P1 | 4 | launch-status |
| 17 | Delete `.env.example` dev-defaults for TRACKING_HASH_SECRET + DEVICE_FP_SALT (leave the key names, drop the values) | P1 | 0.25 | §0 #10 |
| 18 | Update `.dockerignore` to exclude `coverage/`, `*.log`, `cold-store/` | P3 | 0.25 | §Cf6 |
| 19 | Update `docker-compose.yml` gateway `depends_on: migrate` | P3 | 0.1 | §Cf1 |
| 20 | Kill `services/ingest/src/server.ts:154` unconditional `console.log` in RTBF path | P1 | 0.25 | §4.3 #1 |
| 21 | Add match-race concurrency test (§S2) — two `POST /discover/like` in parallel | P2 | 2 | §S2 |
| 22 | Add sanity `SpotlightLedger sum >= 0` continuous check to `scripts/qa-runs/phase-16-smoke.py` | P1 | 2 | §Sh11 |
| 23 | Ramp `INTENT_INFERENCE_ENABLED`, `EXPOSURE_SCHEDULER_ENABLED`, `STABLE_MATCH_ENABLED`, `FAIRNESS_AUDIT_ENABLED` to 1 in staging + verify each v8 event fires (§0 #8) | P1 | 4 | §W14-W17 |
| 24 | Dead-code audit on 9 math primitives (`bowyerWatsonDelaunay`, `sylvesterEquation`, etc.) at `services/shared/src/algo/*.ts` — delete if unreferenced OR add integration point | P2 | 2 | §A8 |
| 25 | Legacy-file audit on `services/shared/algorithms.ts` (1865 lines) + `services/shared/ml-engine.ts` (1052 lines) — delete if unreferenced | P2 | 2 | §A9 |
| 26 | Split `services/social/src/server.ts` (2998 lines) + `services/content/src/server.ts` (2622 lines) by feature area (recommend `routes/*.ts`) — code review only; refactor is v2.0 | P3 | — | §2.4, §2.6 |
| 27 | Verify FRONTEND.md §6.6 five privacy toggles — either wire in `settings/page.tsx` OR remove doc claim | P1 | 2 | §3.1 |
| 28 | Ship `POST /users/me/data-export` endpoint if missing (SECURITY.md claim) | P1 | 4 | §3.1 |
| 29 | Verify `Sec-GPC` header handler exists in gateway (SECURITY.md §10.5) | P2 | 1 | §3.1 |
| 30 | Write Phase-15 QA script (`scripts/qa-runs/phase-15-production.py`) covering B.1/B.2/C.4/C.5 surfaces (launch-status Phase D) | P1 | 8 | launch-status |

**Total effort:** ~89 hours = ~11 engineer-days. Achievable in one Phase-B sprint by one senior engineer, comfortably in two by a pair.

---

## §9 Panel arbitration — where the 9 lenses disagreed

The persona is nine engineers in one head. Here are the real ties this audit had to break.

### 9.1 Zustand refactor now vs later (§0 #6)

- **Architect:** "Single-file store is a red flag; refactor before v2.0."
- **Frontend:** "Coherent 1-file store is easier to read at 100 DAU. Wait for real perf pain."
- **Test Engineer:** "Testing selectors is easier when they're colocated."
- **Fifty-year veteran:** P2 (deferred). Refactor cost ~4 days, benefit is perf-scale-only. Keep the P2 flag; revisit when Sentry says re-render p95 > 100ms.

### 9.2 `console.log` in service code (§4.3)

- **Backend:** "Route everything through pino — the 158 dev-guarded hits are OK but the 10 unconditional ones are launch bugs."
- **SRE:** "The 10 unconditional ones are all in web + ingest RTBF — logging structure varies by service. Route through `logError`."
- **QA:** "Ban all console — one unified logger."
- **Veteran:** the RTBF `console.log` in `services/ingest/src/server.ts:154` is P1 (logs a uidHash in a right-to-be-forgotten flow — perverse). All other unconditional error console-writes are P2 to route through Sentry. Dev-guarded is P3 tidy-up.

### 9.3 Social/content route sprawl (§2.4, §2.6)

- **Architect:** "2998 lines in one file is unmaintainable. Split by feature area."
- **Full-Stack:** "It works. Test coverage is what matters."
- **Backend:** "Grepping is fine. Refactoring is v2.0."
- **Veteran:** P3 for the split, healthy for the pattern (Express + monolith is not wrong at this scale). Note in code review guidelines: any NEW route must live in a feature-scoped file. Existing files grandfather in.

### 9.4 Coming-soon placeholders (§Phase F of prompt)

- **UX:** "Every fake button lies to Priya. Rip them all out."
- **Product:** "Some placeholders are marketing signals — the pipeline is real."
- **Frontend:** "Keep them behind a flag."
- **Veteran:** rule is exact per Phase F — **ship or remove**. The three I identified (audio/video call, accent color, AI side-panel placeholder) should all be removed pre-launch. `<disabled>` on a button that says "Coming Soon" is a UX bug in an app that promises "nothing feels off."

### 9.5 Idempotency coverage — where to stop

- **Backend:** "26 endpoints wired per launch-status is enough."
- **Architect:** "Every non-idempotent mutation retried on 4G risks a double-write."
- **SRE:** "Ledger + payment paths are non-negotiable. Everything else is nice-to-have."
- **Veteran:** priority tiers:
  - **Ledger + payment: P0** — every write must be idem
  - **Match / block / report: P1** — social-graph writes
  - **Profile edits + settings: healthy** — last-write-wins is fine
  - **Feed reactions + comments: P2** — user-visible dupe would be jarring but recoverable

Ledger + payment gap is the only line where P0/P1 matters at launch. Cross-checks with launch-audit §Coverage-gap table.

### 9.6 Test coverage vs feature velocity

- **Test Engineer:** "80% shared + 60% web is the launch floor."
- **Product:** "Every hour on tests is an hour not shipping user features."
- **Veteran:** the answer depends on your rollback confidence. Miamo has feature flags, so a bad feature is a flag flip away from safe. Set targets:
  - **Shared algo:** 80% line — non-negotiable, math must be provable
  - **Route handlers:** 60% line — most bugs are already caught by integration tests
  - **Web components:** 40% — Playwright covers real user paths, unit tests are icing
- **Compromise:** if you can't hit 80% shared by launch, hold the launch. If you can't hit 60% web, ship anyway with a Playwright smoke.

---

## §10 Deferred to later phases

Explicit list of things this audit surfaced but did NOT solve — per prompt guidance that Phase A is read-only.

### 10.1 Deferred to Phase B (click-audit)

- Per-route interactive-element enumeration for all 34 web pages (~150+ elements)
- Actual click testing under seeded users (miamo10, miamo15, miamo20, miamo5)
- Cross-browser + cross-device matrix
- The 40-80 real click bugs the phase expects to find
- Focus ring + hover + double-click audit
- Per-route missing-loading-state audit

### 10.2 Deferred to Phase C (deep bug hunt)

- Race condition / concurrency exercises (10 named edge cases in launch-audit L546-555)
- Timezone / DST / clock-skew audit
- Money-path off-by-one audit (SpotlightLedger)
- Unicode / RTL / very-long-string boundary tests
- Full security surface (SSRF, path traversal, prototype pollution, ReDoS)
- Data integrity — cascade + orphan-row audit
- Third-party contract tests (Nominatim, Razorpay, Sentry, ipapi)
- Full accessibility axe-core pass on 26 routes
- Full API-vs-code endpoint diff (docs/API.md)

### 10.3 Deferred to Phase D (Temporal Learning v2)

- `UserPreferenceHistory` schema + migration
- Multi-timescale learner (`algo/v9/multiTimescale.ts` — 5 windows)
- `algo/v9/driftDetector.ts`
- `algo/v9/satiation.ts` + `algo/v9/boredomPredictor.ts` + `algo/v9/sessionVibe.ts`
- `services/tracking-worker/src/preferenceWindows.ts` new loop
- Ranker wiring behind `ALGO_V9_TEMPORAL_LEARNING_ENABLED`

### 10.4 Deferred to Phase E (algorithm improvements + 5 new algos)

- `// v2:` weight-change comments across 22 existing modules
- `repeatOffenderDetector.ts`, `conversationStarter.ts`, `profileHealth.ts`, `matchQualityPredictor.ts`, `compatibilityExplainer.ts`

### 10.5 Deferred to Phase F (coming-soon → shipped)

- Story reactions, voice notes UI, video intros, group dates, verified UI, blocked-user list, account deletion confirm, data export UI, DTM Match flow, Family Brief share tracking dashboard, Weekly Top-10 countdown, fairness Gini dashboard, right-now intent visibility

### 10.6 Deferred to Phase G (test suite)

- 22 → ~150 unit test files across route handlers
- 0 → ~40 web component tests
- Playwright E2E (0 → 34 routes)
- k6 load scripts for 5 hot endpoints
- Chaos tests (postgres/redis kill, network partition)
- axe-core CI integration
- Contract tests for 4 third-party integrations

### 10.7 Deferred to Phase G.10-G.18 + H

- Cross-platform matrix (5 browsers × 5 checkpoints)
- Content moderation pipeline (Rekognition + text)
- Legal docs (Terms + Privacy + DPIA + Moderation)
- i18n scaffold (en + hi + ta + bn)
- Design-token audit + graphics polish
- Backup + DR + rollback drill
- Web push + email transactional
- CI/CD pipeline
- Onboarding activation funnel
- Launch-day monitor + T-24h checklist

---

## Appendix A — cross-references to prior audits

Where this doc extends `docs/architecture/launch-audit.md`:

- **launch-audit §1 (Architect):** confirmed all 6 P0/P1 findings; added §W5 (RewriteArchive missing), §S11 (raw block body), §W18 (RTBF cascade gaps).
- **launch-audit §2 (Full-Stack/QA):** match-modal + filter drift + geo — all closed per launch-status B.1/B.2, kept as P2 "retest" in §8 row 16.
- **launch-audit §3 (DevOps/Backend/Data):** validation coverage table extended with 21 new `req.body.X` sites in §4.7; Docker/CI unchanged.

Where this doc contradicts launch-audit or launch-status:

- **launch-audit §C1** says graceful shutdown is "half-implemented"; **launch-status** says fixed in v1.1 Phase C.4. **Resolution:** launch-status wins (recent commit). This audit lists it as "verify with a test" (P2, §8 row 15).
- **launch-audit's endpoint count (~133 mutating routes)** vs this audit's total route count (235 — all verbs). Not contradictory; different denominators. Mutating-route audit is a Phase C job.

## Appendix B — deliverable stats

- Doc line count: ~665 lines (this file)
- Doc word count: ~7,900 words (estimated)
- WH-table rows: **202 grouped rows** (aggregating 54 social routes + 72 content routes + 34 messaging routes into feature-groups; per-route detail deferred to Phase B)
- P0 findings: **9**
- P1 findings: **38**
- P2 findings: **82**
- P3 findings: **25**
- Healthy items called out: **83**
- Top-3 most-surprising findings:
  1. **DEVOPS.md and ARCHITECTURE.md disagree on the number of tracking-worker loops** (13 vs 17). Neither doc has been touched in the v3.6.1 cleanup pass despite that pass shipping the 4 new loops that flipped the number.
  2. **`services/ingest/src/server.ts:154` logs the uidHash of a user asking to be forgotten via `console.log`.** The RTBF ingest endpoint is the one place in the tree where accidental persistence of the identifier is most damaging — and it's unguarded.
  3. **Nine pure-math modules** (`bowyerWatsonDelaunay`, `extendedEuclideanGcd`, `goldenSectionSearch`, `pearsonCorrelation`, `polynomialMultiply`, `qrDecompose`, `sylvesterEquation`, `trapezoidalRule`, `xorshiftStarRng`) live in `services/shared/src/algo/` with **no obvious consumer.** They may be a research-spike leftover from before the v3.6 overhaul. Either wire them in (they're beautifully-named for what they do — QR decomposition would be handy in the fairness-rerank) or delete them.

---

**End of Phase A audit.**

Next checkpoint per prompt §4: **pause for founder review of this doc before Phase B.**
