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
- **web** Fixed-bottom sheets in `creativity/{page,UploadModal,CommentSheet}` and the discover-card action bar now pad against `env(safe-area-inset-bottom)` so the home-indicator no longer overlaps tappable controls.: removed `'unsafe-inline'` from `scriptSrc` and `styleSrc`; added `baseUri 'none'` and `formAction 'none'`. Gateway serves JSON+SSE only, so no inline assets are needed.
- **gateway** Pre-verify JWT format with `/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/` before `jwt.verify()` on both Authorization header and SSE `?token=`. Cheap rejection of malformed probes.
- **gateway** New per-user rate limiter (`expensiveLimiter`, 20/min) applied to `/api/v1/discover` and `/api/v1/search` to throttle heavy DB/ML queries.
- **social** Self-report/self-block/self-unmatch guards on `/api/v1/matches/by-user/:userId/{report,block,DELETE}`.
- **users** `PUT /api/v1/profiles/me/prompts` now rejects non-array and arrays >10 items.
- **docker-compose / .env.example** Replaced hardcoded `JWT_SECRET`, `INTERNAL_SERVICE_KEY`, and `POSTGRES_PASSWORD` with `${VAR:?required}` interpolation. Compose now fails fast if `.env` is missing required secrets.

## [3.0.0]
Initial backend-hardening + responsive frontend release. See git history for details.
