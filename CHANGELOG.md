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

## [3.0.0]
Initial backend-hardening + responsive frontend release. See git history for details.
