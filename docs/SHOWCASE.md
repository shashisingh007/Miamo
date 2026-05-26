# Showcase (v3.2)

Showcase is the v3.2 portfolio surface that replaces the legacy Creativity feed.
It is a quieter, intentional space where users post real things they make so
that matches can be sparked from interest in the work, not just the photo.

## Item model

`ShowcaseItem` (Prisma): per-user portfolio entries with category, type
(`link` / `image` / `text` / `voice`), pinned flag, move/match counters,
visibility (`everyone` / `matches` / `private`).

## Caps (server-enforced)

- Max **6 pinned items per user** (`SHOWCASE_PIN_LIMIT`, 409).
- ~**10 MB total bytes per user** (`SHOWCASE_QUOTA_EXCEEDED`, 413).
- Voice clips ≤ 120 s.
- External links restricted to the 11-platform allowlist
  (`SHOWCASE_LINK_ALLOWLIST`): YouTube, SoundCloud, Spotify, GitHub, Behance,
  Substack, Bandcamp, Vimeo, Are.na, Vimeo, Instagram (reels/posts only).

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET    | `/api/v1/showcase` | Board, 24/page, cursor-based, pinned first |
| GET    | `/api/v1/showcase/users/:userId` | One user's items |
| POST   | `/api/v1/showcase` | Create — validated by `showcaseCreateBodySchema` |
| PUT    | `/api/v1/showcase/:id` | Update — owner-only |
| DELETE | `/api/v1/showcase/:id` | Delete — owner-only |

All routes flow through `requireAuth` then the gateway's `feedLimiter`
(60 req/min/user).

## Deferred for follow-up

- AI Move suggestions reusing `/ai-match` (rate-limit 10/min/user).
- Move flow anchored to item with `targetType:'showcase'` + system chat note
  "Started from {item title}".
- Image resize pipeline (1080px WebP) — currently the server only enforces
  the `bytes` aggregate cap.
