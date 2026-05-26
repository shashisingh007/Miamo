# Changelog

All notable changes are documented here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/).

## [3.1.0] — Unreleased

### Security
- **gateway** Strict CSP: removed `'unsafe-inline'` from `scriptSrc` and `styleSrc`; added `baseUri 'none'` and `formAction 'none'`. Gateway serves JSON+SSE only, so no inline assets are needed.
- **gateway** Pre-verify JWT format with `/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/` before `jwt.verify()` on both Authorization header and SSE `?token=`. Cheap rejection of malformed probes.
- **gateway** New per-user rate limiter (`expensiveLimiter`, 20/min) applied to `/api/v1/discover` and `/api/v1/search` to throttle heavy DB/ML queries.
- **social** Self-report/self-block/self-unmatch guards on `/api/v1/matches/by-user/:userId/{report,block,DELETE}`.
- **users** `PUT /api/v1/profiles/me/prompts` now rejects non-array and arrays >10 items.
- **docker-compose / .env.example** Replaced hardcoded `JWT_SECRET`, `INTERNAL_SERVICE_KEY`, and `POSTGRES_PASSWORD` with `${VAR:?required}` interpolation. Compose now fails fast if `.env` is missing required secrets.

### DRY / Tooling
- **shared** New `services/shared/src/errorHandler.ts`. Replaced 6 near-duplicate Express error handlers across auth, users, social, messaging, content, notifications with a single import. The Prisma P2003-on-userId → 401 special case (previously only in content) is now applied uniformly.
- **repo** Added Husky 9 + lint-staged 15 scaffolding. Pre-commit hook is a no-op until matchers are populated.
- **repo** Added `.github/dependabot.yml`: weekly npm/docker/github-actions updates, patch+minor grouped, majors require manual review.

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
- **messaging** `POST /api/v1/messages/chats/:chatId/messages`, `/messages/:id/react`, `/chats/:chatId/theme` validated with zod (`sendMessageBodySchema` caps content at 5000 chars and restricts `type` to a known enum).
- **content** `POST /api/v1/feed`, `PUT /api/v1/feed/:id`, `/feed/:id/{react,comments}`, `POST /api/v1/stories`, `/stories/:id/{react,comments}`, `POST /api/v1/videos`, `/videos/:id/{react,comments}` validated with zod. Visibility restricted to enum `everyone|matches|private`.
- **notifications** `POST /api/v1/notifications/mark-read` validated with zod (`ids` array capped at 500).

### Idempotency
- **shared** New `services/shared/src/idempotency.ts` middleware. When the caller sends an `Idempotency-Key` header (8-128 chars of `[A-Za-z0-9_-]`), atomically reserves the key per-user in Redis with `SET key 1 NX EX 86400`. Collisions return 409 `IDEMPOTENCY_REPLAY`. Fails open if `REDIS_URL` is not set or Redis is unreachable, so the middleware never hard-blocks writes. Currently mounted on `POST /api/v1/messages/chats/:chatId/messages` and `POST /api/v1/discover/like` as the two highest-value duplicate-prone endpoints.

### Tracing
- **shared** New `services/shared/src/requestId.ts` middleware auto-mounted via `applyBaseMiddleware` and the gateway. Mints a UUID for each request (or echoes a safe incoming `X-Request-Id`), attaches to `req.id`, sets `X-Request-Id` response header, and the gateway forwards it to downstream services. Now surfaced in `errorHandler` response envelopes and 5xx log lines.

### Polish
- **web** Shadow-ladder consistency sweep: 17 card-tier surfaces in `serious-mode/page.tsx` and `serious-mode/components/ProfileEditor.tsx` migrated from default `shadow-sm` to brand token `shadow-soft` (the lowest tier in `tailwind.config.ts` boxShadow ladder). Micro shadows (status dots, swatches) kept on `shadow-sm`.

### Testing
- **repo** Added Vitest 2 + supertest 7. Root `vitest.config.ts` excludes `services/web/**` (Next.js has its own test setup). Scripts: `npm test`, `npm run test:watch`, `npm run test:coverage` (python suite moved to `npm run test:python`).
- **shared** 30 unit tests covering `schemas.ts` (11), `validate.ts` (4), `errorHandler.ts` (4), `requestId.ts` (4), and `idempotency.ts` (4 incl. malformed-key 400, no-Redis fail-open). All passing.

## [3.0.0]
Initial backend-hardening + responsive frontend release. See git history for details.
