# Changelog

All notable changes are documented here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/).

## [3.6.0] — Unreleased

### Added — Algorithm overhaul foundation (schema + validators only)

- Foundation: new Prisma models `ExposureLedger`, `ExposureCredit`, `WeeklyTopMatch`, `FamilyBriefShare` (canonical in `services/shared/prisma/schema.prisma`, hand-mirrored into the content/social/users service schemas).
- Foundation: `Message` gains `audioUrl` / `audioDurationMs` / `transcript` / `transcriptStatus` columns (voice-note recording + deferred v3.7 transcription); all nullable, no existing rows touched.
- Foundation: `Settings` gains `moodInferenceEnabled`, `behavioralRankingEnabled`, `crossUserInferenceEnabled`, `algorithmicTransparency` consent toggles (defaults: `false`, `true`, `true`, `true`).
- Foundation: 16 new v8 tracking event Zod schemas registered in `V6_VALIDATORS` (intent.snapshot, engagement.depth_scored, mood.inferred, polarity.computed, exposure.credit_earned, exposure.slot_filled, move.composed, move.suggestion_accepted, voice_fingerprint.shown, voice_fingerprint.shared, family_brief.generated, family_brief.viewed, chat.deposit_made, chat.reply_bonus_paid, chat.ghost_burn, dtm.topic_masked) — all `.strict()` so client-side schema drift surfaces immediately.
- Migration `20260625000000_v3_6_overhaul_foundation` ships the idempotent SQL (every `CREATE` / `ADD COLUMN` / `CREATE INDEX` guarded by `IF NOT EXISTS` or a `pg_indexes` lookup, matching the pattern from `20260526120000_schema_hardening_indexes`).
- Foundation: `User.premium` + `User.premiumUntil` columns; `shared/premium.ts` resolver with 60s cache; wired into anti-ghost (`messaging/server.ts` deposit path), `exposureScheduler` (per-tick bulk fetch, replaces hardcoded `isPremium=false`), and Top-10 threshold (`social/server.ts` v8 discover block surfaces `top10Unlocked` + `isPremium` in `meta.v8`). Migration `20260625010000_user_premium_signal` (idempotent ADD COLUMN IF NOT EXISTS + guarded CREATE INDEX).

## [3.5.1] — Unreleased

### Fixed — Discover: hard-filter passed profiles

- **#1 user complaint globally** ("you keep showing me people I already passed") is now fixed. The legacy Discover ranker applied a *soft* penalty to passed profiles and relied on a 14-day implicit TTL that did not actually exclude them from the candidate pool. Profiles re-surfaced after a single skipped scroll-back, after a session refresh, or after the soft-penalty was outweighed by any positive signal.
- **social/server.ts** `GET /api/v1/discover` now folds the user's last-30d `UserActivity{ action: 'pass' }` distinct `targetId`s into the existing `blockedIds` NOT-IN clause **before** the candidate `prisma.user.findMany`. Passed profiles never enter the pool, so no downstream ranker / diversifier / wildcard slot can re-introduce them. Passes older than 30d re-enter the pool (gives users a chance to re-evaluate a year-old swipe).
- **shared/discover-passfilter** New module exposing `getRecentPassedTargetIds(prisma, userId)`. Safety-capped at 10k entries (users with >10k passes in 30d have their oldest pass "slip through" — strictly better than the prior "all pass-history shown forever" bug). Best-effort: query errors return `[]` and Discover continues to serve.
- **Feature flag** `DISCOVER_PASS_HARDFILTER_ENABLED` (default `1` / on). Set to `0` for emergency rollback without redeploy.
- **tests/discover-passfilter.test.ts** Unit tests cover: pass within window excludes the target; pass outside the 30d window does NOT exclude; never-passed user gets empty list; flag-off returns empty list; cross-user passes don't leak; only `action='pass'` excludes (not `like`/`view`); duplicate passes dedupe; 10k+ pass cap; query-error fallback.

## [3.5.0] — Unreleased

### Added — Creativity: earn paths, reels, AI Move, negative feedback

- **shared/spotlight-ledger** Expanded the Spotlight-minute earn surface from "post + first-match milestones" to a full engagement catalog:
  - `awardDailyLogin(userId)` — walks the last 30 days of `daily_login` rows, computes consecutive UTC-day streak, awards `+1..+5` minutes by streak tier (1d→+1, 3d→+2, 7d→+3, 14d→+4, 30d→+5). Idempotent per UTC day (uses `utcDayWindow` for the de-dupe scan).
  - `awardCommentLeft(userId, itemId, authorId)` — `+1` per comment authored, capped at `DAILY_CAP_COMMENTS=5` per UTC day (drops silently past the cap so the UX never breaks).
  - `awardReactionReceived(authorId, kind, reactorId)` — `+1` to the *author* per beat-class reaction received, capped at `DAILY_CAP_REACTIONS_RECV=20` per UTC day. Self-reactions are skipped.
  - `awardFirstAction(userId, kind)` — lifetime one-time `+5` award for `first_beat_sent` / `first_comment_sent` / `first_share_sent`, guarded by a `SpotlightAward @@unique([userId, kind])` row.
  - `awardCreativityStreak7d(userId)` — lifetime one-time `+10` once a user racks up 7 consecutive `daily_login` days.
  - `awardWeeklyTopCreator(userId, rank, weekKey)` — idempotent per `weekly_top_${isoWeekKey}` ISO-week key; `+20/+15/+10` for rank 1/2/3.
  - `listEarnOpportunities(userId)` — returns the 10-row opportunity catalog the new `EarnDrawer` UI renders, with per-row `status` (`available` | `claimed_today` | `completed` | `progress`) and `progress: {used, cap}` for the capped earn paths.

- **content service** Eight new routes under `/api/v1/creativity` (all proxied through gateway `feedLimiter`):
  - `GET  /reels?limit&category&authorId&cursor` — TikTok-style feed. Filters out items disliked / reported / hidden by viewer and items from `hide-author`'d authors (suppression sets built from `UserActivity.metadata`, parsed via the `parseMeta` JSON-string helper). Items are ranked by `trendScore + recencyBoost`. Fires `awardDailyLogin` fire-and-forget on every call so opening the reel counts as the daily check-in.
  - `POST /items/:id/dislike` — negative reaction; records `creativity.dislike` activity + `pass_feedback` row so the existing negative-signal-engine penalizes the author in subsequent `/discover` scoring.
  - `POST /items/:id/not-interested` — soft signal; records `creativity.not_interested` and suppresses the item from future `/reels`.
  - `POST /items/:id/report` — accepts `reason` body; records `creativity.report` (hard suppression + author penalty).
  - `POST /items/:id/hide-author` — author-level suppression; records `creativity.hide_author` keyed by `authorId`.
  - `GET  /items/:id/move-suggestions?n=3` — AI Move composer. Builds a `hookPool` from the item title + category + author top-interests, seeds an RNG with hash(`userId + itemId`), and returns up to `n` distinct tone-varied Move lines that pass the existing `moveVoice` linter (`MAX_LEN=90`, no forbidden phrases).
  - `GET  /spotlight/earn-opportunities` — opportunity catalog (drives the EarnDrawer UI).
  - `POST /spotlight/claim-streak` — manual claim for the 7-day creativity streak bonus.

- **content/server.ts** Action triggers wired into existing routes: `/react` fires `awardFirstAction('beat_sent')` + `awardReactionReceived`; `/comments` fires `awardFirstAction('comment_sent')` + `awardCommentLeft`; `/share` fires `awardFirstAction('share_sent')`. All side-effects are best-effort (errors logged, never thrown).

- **web/creativity** Vertical reels UI (default landing view, replaces the grid as primary):
  - `ReelsView.tsx` — one-card-at-a-time stack with right-rail action column (Like / Beat / Move / Comment / Save / Share / Dislike / More). 3-dots menu surfaces "Don't show like this" / "Hide all from author" / "Report" / "View profile". Keyboard navigation: `↑/↓` or `j/k` to scroll, `l` to like. Auto-prefetches the next page when `idx ≥ length-2`. Dwell time tracked via `viewCreativityItem` on unmount.
  - Miamo **M** button (gradient pill with subtle `animate-ping`) opens the Move modal pre-filled with 1–3 AI-suggested openers as tappable chips that prefill the textarea.
  - `EarnDrawer.tsx` — bottom-sheet drawer listing the 10 earn opportunities with per-row progress bars and a "Claim" CTA for the 7-day streak bonus + "Buy minutes" link.
  - `creativity/page.tsx` — persisted `view: 'reels' | 'board'` toggle pill in the hero. Sort/search controls only render in board mode. Hero now shows `SpotlightBalancePill + Earn button + Vault` together.
  - `MoveModal.tsx` — added `suggestions?: Array<{ tone, line }>` prop; renders tappable chips above the textarea.
  - `api.ts` — eight new typed client methods: `dislikeCreativityItem`, `notInterestedCreativityItem`, `reportCreativityItem`, `hideCreativityAuthor`, `getCreativityReels(params)`, `getCreativityMoveSuggestions(id, n)`, `getSpotlightEarnOpportunities`, `claimSpotlightStreak`.

- **scripts/qa-runs/phase-13-creativity-reels.py** — End-to-end regression: login (uses `email`, not `identifier`) → create item → `/reels` (asserts balance ≥ before after a 500 ms settle for the fire-and-forget `daily_login`) → `/react` → `/comments` → `/share` → `/move-suggestions` (asserts 1..3 lines each with `tone` + `line`) → `/earn-opportunities` (asserts all 10 expected `kind`s are present) → `/dislike` (asserts item is suppressed from the next `/reels`) → `/not-interested` → `/report` → `/hide-author` (asserts no items from author in next `/reels`) → `/claim-streak`. Writes `phase-13-creativity-reels.report.json`.

### Negative-signal feedback loop

Dislike / not-interested / report / hide-author all route through `recordCreativityAction` and emit a `pass_feedback` row alongside the activity log, so the existing negative-signal-engine (used by Discover) automatically penalizes the offending author / category in subsequent ranker passes — no separate scoring path.

### Validation

- `node scripts/typecheck.mjs`: **11/11 packages clean** (`All 11 packages typecheck clean in 8253ms`)
- `npx vitest run --config vitest.fast.config.ts`: **21 files / 152 tests passed**
- `phase-13-creativity-reels.py`: **0 events / 0 signatures** (all 8 new endpoints return 200; reels suppression honored after dislike + hide-author; move-suggestions linter-clean; earn catalog complete)

## [3.4.0] — Unreleased

### Fixed
- **social/discover** `/api/v1/discover/pass` was destructuring `userId` from the request body while the canonical Discover schemas use `toUserId` — every Pass silently failed, so passed users kept reappearing in `/discover` and the negative-signal feedback loop never ran. Now accepts both `toUserId` (canonical) and `userId` (legacy alias).
- **social/discover** `/api/v1/discover/pass-feedback` had the same field-name drift; `passFeedbackBodySchema` now refines on `toUserId || userId` and the route mirrors the dual-read.
- **social/discover** `PUT /api/v1/discover/filters` used an API-name allowlist (`gender`, `sexuality`, `verifiedOnly`, `seriousOnly`) that didn't match the Prisma `DiscoverFilter` columns (`genders`, `sexualities`, `verified`, no `seriousMode`) — every PUT raised P2009 → 500. Replaced with a `FIELD_MAP` translation layer; `seriousMode` correctly routes to `Settings` instead.
- **shared/algorithms** Discover ranker non-determinism: `scoreForYou` (line ~365) and `scoreVerified` (line ~602) added `Math.random() * N` jitter to every candidate score, reshuffling the top 5 between back-to-back `/discover` calls. Introduced `stableJitter(viewerId, candidateId, windowMs = 5 min)` — FNV-1a-seeded `[0,1)` — so the head is stable within a window but the rotation still varies hourly.
- **content tsconfig** Excluded `services/shared/src/verification.ts` from the content service's TypeScript compilation. The content service's local Prisma schema does not declare `Otp` / `TrustedDevice`; pulling the verification helpers through the shared include caused 11 cross-service type errors.
- **web/api** `browseMatrimonial` / `browseMatrimonialAdvanced` parameter type was `Record<string, string>` but call-sites passed `{ limit: 10 }` — widened to `string | number | boolean` and `String()`-coerce inside the helper. Removes 8 TS errors in `services/web/src/app/(main)/serious-mode/page.tsx`.

### Added
- **docs** `docs/QA_MASTER_PROMPT.md` — 12-phase master QA prompt covering pre-flight, endpoint sweep, Discover, DTM, settings, profile, learning loop, cold-start gauntlet, and acceptance gates per phase.
- **scripts/qa-runs** Three persistent phase scripts that run against a live local stack:
  - `phase-1-2-endpoint-sweep.py` — Logs in 4 personas; exercises Discover, Matches, Vibe, Search, Settings, Profile, gating across ~150 calls.
  - `phase-3-4-discover-dtm.py` — Discover filters round-trip, DTM symmetry, access request, gotra conflict.
  - `phase-10-learning-loop.py` — Ranker determinism (5-min stable jitter), `aiPicks` reorders default ranker, AI-match suggestions, tracking ingest envelope, negative-signal exclusion, DTM A↔B symmetry.
  - `phase-11-cold-start.py` — Brand-new OTP signup, profile completion 30 → 95, first-creativity-post bonus, self-exclusion in `/discover`, sym-like → match round-trip.
  - All four scripts back off on HTTP 429 with exponential retry so rapid full-suite runs no longer trip the gateway rate limiter.

### Validation
- `npm test` (fast suite): 21 files / 152 tests pass
- `npm run typecheck`: 11/11 packages clean
- `phase-1-2-endpoint-sweep.py`: 0 events / 0 signatures
- `phase-3-4-discover-dtm.py`: 0 events / 0 signatures
- `phase-10-learning-loop.py`: 0 events / 0 signatures (ranker top-5 stable, aiPicks reorders, DTM 50≈50)
- `phase-11-cold-start.py`: 0 events / 0 signatures (cold→95 profileScore, +5 first-post bonus, sym-like match)

## [3.3.0] — Unreleased

### Added
- **shared/algo (V7)** 5 new pure modules: `dtmFeedV7` (steady-state DTM batch builder, 6-term recipe + 3-tier penalties), `batchLadder` ("show 10, breathe, next 10" pagination with momentum-aware breatheMs ∈ [1800, 3200]), `rightNow` (sub-millisecond mood / momentum blend: 0.35 hourBias + 0.30 surfaceMomentum + 0.20 recencyHeat + 0.15 moodGuess), `moveVoice` (4-tone × 4-template Move renderer with 16-phrase forbidden-tone linter, `MAX_LEN=90`, 1000-render contract test), `surfaceLearner` (per-surface learner-state discriminator with half-lives `{discover:14d, dtm:30d}`).
- **shared/track (V7)** 24 new Zod schemas in `V6_VALIDATORS` map: `discover.swipe`, `swipe.commit/undo/regret/repeat_pass`, `card.impression.50/100`, `card.hover`, `card.bio.expand/collapse`, `card.photo.swipe`, `dtm.answer/question_view/complete`, `msg.send/read/reaction`, `notification.shown/opened/dismissed`, `search.query/result_click/no_results`. All boundary-validated; envelope (v=1) unchanged.
- **db** `UserWeightProfile.surface String @default("discover")` + `@@id([uidHash, surface])` — splits learner state per surface without code changes to the 17 ranked recipes.
- **docs** `docs/OWNER_GUIDE.md` — owner-friendly single-page walkthrough of tracking → learning → ranking → Move with mermaid diagrams and worked examples. `docs/MIAMO_MOVE.md` — deep dive on the Move composer (tones, linter, decision flow, why no LLM). `docs/ALGORITHMS.md` and `docs/TRACKING.md` extended with V7 sections.

### Removed
- **shared/algo (Phase J, c8e841d)** 530 unused dtmTopic*.ts feature scorers + their sibling tests. Canonical `dtmTopics.ts` retained.
- **shared/algo (Phase K, c885e7f)** 1,198 more files (599 unused pure-algorithm modules + 599 sibling tests where the only importer was the test file itself). Preserved V7 deliverables (`batchLadder`, `dtmFeedV7`, `moveVoice`, `rightNow`, `surfaceLearner`) and the 53 actively-used modules. **Net result:** algo source tree shrank from ~917 files to 53; tests from ~8869 to 892; full-suite `vitest run` finishes in 4.7 s.

### Validation
- typecheck: 11/11 packages clean
- `vitest run`: 90 files / 892 tests pass
- `npm audit --omit=dev`: 0 production vulnerabilities

## [3.2.0] — Unreleased

### Added
- **db** `Profile.completionScore`, `Profile.completionMissing` + 11 optional DTM fields (`familyBackground`, `educationLevel`, `educationInstitution`, `employer`, `incomeBand`, `subCommunity`, `maritalStatus`, `willingToRelocate`, `familyInvolved`, `expectedTimeline`, `kundliUrl`).
- **db** New `ShowcaseItem` model — per-user portfolio items (category, type, pinned, moveCount, matchCount, visibility, bytes).
- **db** New `AccessRequest` model — field-level access lifecycle (`pending|approved|denied|revoked|expired`) with `@@unique([fromUserId,toUserId,field])`.
- **shared** `completion.ts` — pure `computeCompletionScore()` and `recomputeAndPersistCompletion()`; casual threshold 60, DTM threshold 80; 5-bucket weighted scoring.
- **users** `GET /api/v1/profiles/me/completion`; recomputation on `PUT /api/v1/profiles/me`.
- **gateway** `requireOnboarded` middleware (60s in-memory cache, fail-open) applied to discover, matches, ai-match, messages, beats, showcase, access. 403 envelope: `{ code:'ONBOARDING_INCOMPLETE', requiredScore, currentScore, missingFields[], dtm }`.
- **content** `POST/GET/PUT/DELETE /api/v1/showcase` — 11-platform link allowlist, 6-pin/user cap, ~10 MB bytes/user cap, cursor pagination 24/page.
- **social** `/api/v1/access/requests` full lifecycle (create/inbox/outbox/approve/deny/revoke) with spam controls (5 outbound, 3 per field, 7-day deny cooldown) and +30-day default expiry on approve.
- **shared/schemas** New zod: `showcaseCreate`, `showcaseUpdate`, `showcaseMove`, `accessRequestCreate`, `accessRequestDecision`, `dtmProfileUpdate` + constants `SHOWCASE_CATEGORIES`, `SHOWCASE_LINK_ALLOWLIST`, `ACCESS_FIELDS`.
- **web** `/onboarding` page (server-driven 6-step progress), `/showcase` board, `/access` inbox/outbox UI.
- **web** DTM mode CSS tokens (`--miamo-dtm-accent`, `--miamo-dtm-hairline`, `--miamo-dtm-bg`) gated by `[data-mode="dtm"]`.
- **docs** `docs/SHOWCASE.md`, `docs/ACCESS_CONTROL.md`.

### Tests
- 60 → 84 (+24 new): 18 v3.2 schema unit tests, 5 completion scoring tests, 1 constants test.

### Notes
- `/creativity` route remains live; the 301 to `/showcase` will be enabled once feature parity (composer + comments + reactions) lands.
- AI Move suggestions and persisted access SSE notifications are deferred.

## [3.1.0] — Unreleased

### Security
- **gateway** Strict CSP: removed `'unsafe-inline'` from `scriptSrc` and `styleSrc`; added `baseUri 'none'` and `formAction 'none'`. Gateway serves JSON+SSE only, so no inline assets are needed.
- **gateway** Pre-verify JWT format with `/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/` before `jwt.verify()` on both Authorization header and SSE `?token=`. Cheap rejection of malformed probes.
- **gateway** New per-user rate limiter (`expensiveLimiter`, 20/min) applied to `/api/v1/discover` and `/api/v1/search` to throttle heavy DB/ML queries. New `feedLimiter` (60/min/user) wraps `/api/v1/{feed,stories,videos,creativity}` to bound infinite-scroll scraping.
- **social** Self-report/self-block/self-unmatch guards on `/api/v1/matches/by-user/:userId/{report,block,DELETE}`.
- **users** `PUT /api/v1/profiles/me/prompts` now rejects non-array and arrays >10 items.
- **docker-compose / .env.example** Replaced hardcoded `JWT_SECRET`, `INTERNAL_SERVICE_KEY`, and `POSTGRES_PASSWORD` with `${VAR:?required}` interpolation. Compose now fails fast if `.env` is missing required secrets.

### DRY / Tooling
- **shared** New `services/shared/src/errorHandler.ts`. Replaced 6 near-duplicate Express error handlers across auth, users, social, messaging, content, notifications with a single import. The Prisma P2003-on-userId → 401 special case (previously only in content) is now applied uniformly.
- **repo** Added Husky 9 + lint-staged 15 scaffolding. Pre-commit hook is a no-op until matchers are populated.
- **repo** Added `.github/dependabot.yml`: weekly npm/docker/github-actions updates, patch+minor grouped, majors require manual review.
- **repo** Added `.github/workflows/ci.yml`: runs the vitest suite on every push/PR plus a per-service `tsc --noEmit` matrix (auth, users, social, messaging, content, notifications, gateway).
- **services/*** tsconfigs now exclude `**/*.test.ts`, `**/*.spec.ts`, and `**/*.integration.test.ts` from the compile graph so test fixtures never leak into production builds. All 7 services pass `tsc --noEmit` clean.

### UI / UX
- **web** `Button` base class gains `focus-visible:ring-2 focus-visible:ring-rose-main focus-visible:ring-offset-2 focus-visible:ring-offset-white`. Keyboard users now see a visible focus state matching the brand.
- **web** Root viewport now declares `viewportFit: 'cover'` so iOS notch/home-indicator devices render fullscreen with `env(safe-area-inset-*)` available.
- **web** Mobile bottom nav (`(main)/layout.tsx`) now applies `pb-[max(0.5rem,env(safe-area-inset-bottom))]` and bumps every tap target to ≥ 44×44 px.
- **web** Fixed-bottom sheets in `creativity/{page,UploadModal,CommentSheet}` and the discover-card action bar now pad against `env(safe-area-inset-bottom)` so the home-indicator no longer overlaps tappable controls.

### Observability
- **shared** New `services/shared/src/metrics.ts` ships `metricsMiddleware(service)` that auto-mounts a Prometheus `/metrics` endpoint on every service (auth/users/social/messaging/content/notifications/gateway). Exposes `miamo_http_requests_total`, `miamo_http_request_duration_seconds` (11 latency buckets), `miamo_http_errors_total`, plus default Node.js process metrics — all labeled `service|method|route|status`.

### Validation
- **shared** New `services/shared/src/validate.ts` (zod middleware) + `services/shared/src/schemas.ts` (reusable primitives: email, password, displayName, register/login/refresh/forgot-password bodies, cursor pagination, id/userId params). Errors respond with `{ error: { code: 'VALIDATION_ERROR', fields: [...] } }`.
- **auth** `/api/v1/auth/{register,login,refresh}` now use zod schemas instead of hand-rolled `if (!field)` chains. Email is auto-lowercased+trimmed by zod; sanitize() still runs for HTML/control-char stripping.
- **users** `PUT /api/v1/profiles/me`, `/profiles/me/prompts`, `/profiles/me/interests` validated with zod (`updateProfileBodySchema`, `profilePromptsBodySchema`, `profileInterestsBodySchema`). All field-level length and range checks (age 18-120, height 50-250, bio ≤2000, etc.) now run in middleware.
- **social** `POST /api/v1/discover/{like,pass,comment}`, `/safety/report`, `/vibe-check` validated with zod.
- **messaging** `POST /api/v1/messages/chats/:chatId/messages`, `/messages/:id/react`, `/chats/:chatId/{theme,pin,mute,archive}`, `PUT /api/v1/messages/messages/:id` (edit), `POST /api/v1/beats/start`, `/beats/:id/complete` validated with zod (`sendMessageBodySchema` caps content at 5000 chars and restricts `type` to a known enum; `chatThemeBodySchema` now accepts either `theme` or `background`; pin/mute/archive require boolean toggles).
- **users** `PUT /api/v1/settings`, `/settings/privacy` validated with zod (`settingsUpdateBodySchema`, `privacyUpdateBodySchema`) — typed boolean toggles and bounded string fields. Server-side whitelist still runs after middleware.
- **content** `POST /api/v1/feed`, `PUT /api/v1/feed/:id`, `/feed/:id/{react,comments}`, `POST /api/v1/stories`, `/stories/:id/{react,comments}`, `POST /api/v1/videos`, `/videos/:id/{react,comments}` validated with zod. Visibility restricted to enum `everyone|matches|private`.
- **notifications** `POST /api/v1/notifications/mark-read` validated with zod (`ids` array capped at 500).

### Idempotency
- **shared** New `services/shared/src/idempotency.ts` middleware. When the caller sends an `Idempotency-Key` header (8-128 chars of `[A-Za-z0-9_-]`), atomically reserves the key per-user in Redis with `SET key 1 NX EX 86400`. Collisions return 409 `IDEMPOTENCY_REPLAY`. Fails open if `REDIS_URL` is not set or Redis is unreachable, so the middleware never hard-blocks writes. Currently mounted on `POST /api/v1/messages/chats/:chatId/messages` and `POST /api/v1/discover/like` as the two highest-value duplicate-prone endpoints.

### Tracing
- **shared** New `services/shared/src/requestId.ts` middleware auto-mounted via `applyBaseMiddleware` and the gateway. Mints a UUID for each request (or echoes a safe incoming `X-Request-Id`), attaches to `req.id`, sets `X-Request-Id` response header, and the gateway forwards it to downstream services. Now surfaced in `errorHandler` response envelopes and 5xx log lines.

### Polish
- **web** Shadow-ladder consistency sweep: 17 card-tier surfaces in `serious-mode/page.tsx` and `serious-mode/components/ProfileEditor.tsx` migrated from default `shadow-sm` to brand token `shadow-soft` (the lowest tier in `tailwind.config.ts` boxShadow ladder). Micro shadows (status dots, swatches) kept on `shadow-sm`.
- **web** Added `@media (prefers-reduced-motion: reduce)` safety net in `globals.css` that collapses every custom keyframe and transition to ~0ms for users with the OS-level Reduce Motion preference.
- **web** New `services/web/src/app/error.tsx` and `not-found.tsx` segment routes — brand-styled fallbacks (rose-gold chrome, focus-visible rings on action buttons, requestId/digest displayed when available) replace Next.js' default unstyled 404 / error pages.
- **web** SEO + PWA metadata: new `robots.ts`, `sitemap.ts`, and `manifest.ts` files under `src/app/` (Next.js App Router auto-routes them at `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`). Robots disallows all authenticated app surfaces; manifest enables "Add to Home Screen".

### Testing
- **repo** Added Vitest 2 + supertest 7. Root `vitest.config.ts` excludes `services/web/**` (Next.js has its own test setup). Scripts: `npm test`, `npm run test:watch`, `npm run test:coverage` (python suite moved to `npm run test:python`).
- **shared** 30 unit tests covering `schemas.ts` (11), `validate.ts` (4), `errorHandler.ts` (4), `requestId.ts` (4), and `idempotency.ts` (4 incl. malformed-key 400, no-Redis fail-open). All passing.
- **shared** Plus 5 supertest integration tests in `stack.integration.test.ts` that boot a minimal Express app with the full shared middleware chain (requestId → validate → handler → errorHandler) and assert request-id propagation, validation 400 shape, custom AppError mapping, and 5xx requestId surfacing. Total: 35 tests across 6 files.

## [3.0.0]
Initial backend-hardening + responsive frontend release. See git history for details.
