# Phase 7: Code Quality & Performance Audit

**Date:** 17 May 2026  
**Scope:** Full Miamo codebase — backend services, frontend, Prisma schemas, infrastructure

---

## 1. console.log / console.error in Backend Services

**Total occurrences:** 24 across 7 service files  
**NODE_ENV guarded:** All `app.listen()` blocks are wrapped in `if (process.env.NODE_ENV !== 'test')` — however console.log inside those blocks is NOT stripped in production.

| File | Line | Content | Guarded? |
|------|------|---------|----------|
| `services/auth/src/server.ts` | 265 | `console.log('⚡ Miamo Auth Service...')` | Wrapped in `NODE_ENV !== 'test'` block (L263) but runs in prod |
| `services/auth/src/server.ts` | 269 | `console.log('🛑 signal received...')` | Same block |
| `services/auth/src/server.ts` | 272 | `console.log('✅ Auth service stopped')` | Same block |
| `services/content/src/server.ts` | 1569 | `console.log('⚡ Content Service...')` | Wrapped in `NODE_ENV !== 'test'` (L1568) |
| `services/content/src/server.ts` | 1572 | `console.log('🛑 signal received...')` | Same block |
| `services/content/src/server.ts` | 1575 | `console.log('✅ Content stopped')` | Same block |
| `services/gateway/src/server.ts` | 261 | `console.error('Proxy error:', err)` | **Unguarded** — runs on every proxy error |
| `services/gateway/src/server.ts` | 313-317 | 5× `console.log(...)` for startup | Wrapped in `NODE_ENV !== 'test'` (L311) |
| `services/gateway/src/server.ts` | 321 | `console.log('🛑 signal...')` | Same block |
| `services/gateway/src/server.ts` | 328 | `console.log('✅ Gateway stopped')` | Same block |
| `services/messaging/src/server.ts` | 697 | `console.log('⚡ Messaging...')` | Wrapped (L696) |
| `services/messaging/src/server.ts` | 700 | `console.log('🛑 signal...')` | Same block |
| `services/messaging/src/server.ts` | 703 | `console.log('✅ Messaging stopped')` | Same block |
| `services/notifications/src/server.ts` | 120 | `console.log('⚡ Notification...')` | Wrapped (L119) |
| `services/notifications/src/server.ts` | 123 | `console.log('🛑 signal...')` | Same block |
| `services/notifications/src/server.ts` | 126 | `console.log('✅ Notifications stopped')` | Same block |
| `services/social/src/server.ts` | 1564 | `console.log('⚡ Social...')` | Wrapped (L1563) |
| `services/social/src/server.ts` | 1568 | `console.log('🛑 signal...')` | Same block |
| `services/social/src/server.ts` | 1571 | `console.log('✅ Social stopped')` | Same block |
| `services/users/src/server.ts` | 376 | `console.log('⚡ User Service...')` | Wrapped |
| `services/users/src/server.ts` | 379 | `console.log('🛑 signal...')` | Same block |
| `services/users/src/server.ts` | 382 | `console.log('✅ Users stopped')` | Same block |

### Recommendations
- Replace `console.log`/`console.error` with a structured logger (Winston/Pino) that respects log levels
- `gateway/server.ts:261` `console.error` on proxy error should use a proper logger with request context
- Startup messages are acceptable but should use a logger with `info` level

---

## 2. Silent .catch(() => {}) Patterns

**Total occurrences:** 35 across backend + frontend

### Backend (5 occurrences)
| File | Line | Silenced Operation |
|------|------|--------------------|
| `services/auth/src/server.ts` | 177 | `prisma.profile.update` (set offline on logout) |
| `services/auth/src/server.ts` | 179 | `prisma.session.updateMany` (revoke sessions) |
| `services/auth/src/server.ts` | 202 | `prisma.session.updateMany` (revoke sessions) |
| `services/auth/src/server.ts` | 229 | `prisma.session.updateMany` (update lastActiveAt) |
| `services/content/src/server.ts` | 41 | `auditLog` fire-and-forget |
| `services/social/src/server.ts` | 51 | `auditLog` fire-and-forget |
| `services/messaging/src/server.ts` | 82 | `auditLog` fire-and-forget |
| `services/gateway/src/server.ts` | 238 | Unknown fire-and-forget |

### Frontend (27 occurrences)
| File | Line | Silenced Operation |
|------|------|--------------------|
| `services/web/src/app/(main)/compatibility/page.tsx` | 91 | `api.getMatches()` |
| `services/web/src/app/(main)/settings/page.tsx` | 157 | Settings load |
| `services/web/src/app/(main)/settings/page.tsx` | 202 | `api.getBlockList()` |
| `services/web/src/app/(main)/messages/page.tsx` | 410 | `api.getChatBackgrounds()` |
| `services/web/src/app/(main)/messages/page.tsx` | 579 | Chat operation |
| `services/web/src/app/(main)/messages/page.tsx` | 612 | Chat operation |
| `services/web/src/app/(main)/messages/page.tsx` | 824 | `api.archiveChat()` |
| `services/web/src/app/(main)/discover/page.tsx` | 987 | AI score fetch |
| `services/web/src/app/(main)/discover/page.tsx` | 994 | `api.passUser()` |
| `services/web/src/app/(main)/creativity/page.tsx` | 75 | `api.getCreativityComments()` |
| `services/web/src/app/(main)/creativity/page.tsx` | 795 | `api.getCreativityCategories()` |
| `services/web/src/app/(main)/creativity/page.tsx` | 817 | `api.viewCreativityItem()` |
| `services/web/src/app/(main)/matches/page.tsx` | 140 | `api.getMatchSuggestions()` |
| `services/web/src/app/(main)/beats/page.tsx` | 1281 | `api.updateSettings()` (mute) |
| `services/web/src/app/(main)/stories/page.tsx` | 245 | `api.getStoryComments()` |
| `services/web/src/app/(main)/stories/page.tsx` | 366 | `api.viewStory()` |
| `services/web/src/app/(main)/stories/page.tsx` | 463 | `api.reportUser()` |
| `services/web/src/app/(main)/stories/page.tsx` | 525 | `api.reactToStory()` |
| `services/web/src/app/(main)/videos/page.tsx` | 99 | `api.getVideos()` |
| `services/web/src/app/(main)/profile/page.tsx` | 140 | Profile update |
| `services/web/src/app/(main)/layout.tsx` | 67 | Layout data fetch |
| `services/web/src/app/(main)/layout.tsx` | 85 | Layout data fetch |
| `services/web/src/app/(main)/layout.tsx` | 96 | Layout data fetch |
| `services/web/src/app/(main)/ai-match/page.tsx` | 24 | `api.getAiSuggestions()` |
| `services/web/src/app/(main)/ai-match/page.tsx` | 85 | `api.sendLike()` |
| `services/web/src/app/(main)/date-planner/page.tsx` | 130 | `api.getMatches()` |
| `services/web/src/app/(main)/vibe-check/page.tsx` | 116 | Vibe check operation |
| `services/web/src/lib/api.ts` | 319 | `activity/track` POST |

### Recommendations
- **Critical:** `.catch(() => {})` on data-loading operations (getMatches, getVideos, etc.) means users see empty state with no error feedback
- Add at minimum `console.warn` or a toast notification inside catches
- For fire-and-forget backend operations (auditLog), `.catch(() => {})` is acceptable but should at least log the error
- Create a `silentCatch` utility that logs but doesn't throw: `.catch(err => logger.warn('non-critical', err))`

---

## 3. `any` Type Usage

**Total across backend server.ts files:** 49

### Backend `: any` Count
| File | Count |
|------|-------|
| `services/content/src/server.ts` | 17 |
| `services/social/src/server.ts` | 11 |
| `services/messaging/src/server.ts` | 7 |
| `services/users/src/server.ts` | 7 |
| `services/notifications/src/server.ts` | 3 |
| `services/gateway/src/server.ts` | 3 |
| `services/auth/src/server.ts` | 1 |

### Frontend Worst Offenders (>= 4 occurrences)
| File | Count |
|------|-------|
| `services/web/src/app/(main)/serious-mode/page.tsx` | 21 |
| `services/web/src/app/(main)/stories/page.tsx` | 19 |
| `services/web/src/app/(main)/matches/page.tsx` | 19 |
| `services/web/src/app/(main)/messages/page.tsx` | 15 |
| `services/web/src/lib/api.ts` | 14 |
| `services/web/src/app/(main)/creativity/page.tsx` | 10 |
| `services/web/src/app/(main)/profile/page.tsx` | 8 |
| `services/web/src/app/(main)/discover/page.tsx` | 8 |
| `services/web/src/app/(main)/beats/page.tsx` | 7 |
| `services/web/src/app/(main)/notifications/page.tsx` | 4 |

### Recommendations
- `api.ts` (14× `any`) is the most impactful to fix — define proper response types for all API methods
- Error handler signatures `(err: any, ...)` in every backend service should use `unknown` instead
- `serious-mode/page.tsx` (21× `any`) is the worst frontend offender — likely untyped DTM/matrimonial data
- Priority: **api.ts > server.ts error handlers > page components**

---

## 4. Files > 500 Lines

### Backend Files
| File | Lines |
|------|-------|
| `services/content/src/server.ts` | 1,582 |
| `services/social/src/server.ts` | 1,578 |
| `services/shared/prisma/seed.ts` | 1,130 |
| `services/shared/algorithms.ts` | 998 |
| `services/messaging/src/server.ts` | 710 |
| `services/shared/activity-analyzer.ts` | 690 |
| `services/content/prisma/seed-dtm.ts` | 569 |

### Frontend Files
| File | Lines |
|------|-------|
| `services/web/src/app/(main)/messages/page.tsx` | 1,645 |
| `services/web/src/app/(main)/serious-mode/page.tsx` | 1,481 |
| `services/web/src/app/(main)/beats/page.tsx` | 1,399 |
| `services/web/src/app/(main)/matches/page.tsx` | 1,301 |
| `services/web/src/app/(main)/discover/page.tsx` | 1,204 |
| `services/web/src/app/(main)/creativity/page.tsx` | 1,153 |
| `services/web/src/app/(main)/stories/page.tsx` | 891 |

### Total files > 500 lines: 14

### Recommendations
- `content/server.ts` (1,582) and `social/server.ts` (1,578) should be split into route modules (e.g., `routes/feed.ts`, `routes/stories.ts`, `routes/creativity.ts`)
- `messages/page.tsx` (1,645) should be decomposed into `<ChatList>`, `<ChatView>`, `<MessageBubble>`, `<ChatHeader>` components
- All frontend page.tsx files >800 lines are candidates for component extraction
- Target: no file exceeds 500 lines after refactoring

---

## 5. Duplicated Patterns

### 5a. `authMiddleware` — Duplicated 6× in every service

| File | Line |
|------|------|
| `services/auth/src/server.ts` | 43 |
| `services/content/src/server.ts` | 29 |
| `services/messaging/src/server.ts` | 60 |
| `services/notifications/src/server.ts` | 40 |
| `services/social/src/server.ts` | 39 |
| `services/users/src/server.ts` | 32 |

**Status:** Identical JWT-verification middleware copy-pasted into every service. Should be imported from `services/shared/`.

### 5b. `AppError` Class — Duplicated 2×

| File | Line |
|------|------|
| `services/auth/src/server.ts` | 34 |
| `services/shared/src/middleware/error.ts` | 4 (canonical, exported) |

**Status:** Shared `AppError` exists but `auth` has its own copy. Other services likely inline error creation.

### 5c. `AuthRequest` Interface — Duplicated 6×

| File | Line |
|------|------|
| `services/auth/src/server.ts` | 41 |
| `services/content/src/server.ts` | 28 |
| `services/messaging/src/server.ts` | 59 |
| `services/notifications/src/server.ts` | 39 |
| `services/social/src/server.ts` | 38 |
| `services/users/src/server.ts` | 30 |

**Status:** Identical `interface AuthRequest extends Request { userId?: string; }` in every service.

### 5d. `auditLog` Helper — Duplicated 5×

| File | Line |
|------|------|
| `services/auth/src/server.ts` | 62 |
| `services/content/src/server.ts` | 44 |
| `services/social/src/server.ts` | 54 |
| `services/users/src/server.ts` | 41 |
| `services/messaging/src/server.ts` | 85 |

**Status:** Near-identical `async function auditLog(userId, action, details)` with fire-and-forget Prisma insert.

### 5e. Error Handler Middleware — Duplicated 6×

| File | Line |
|------|------|
| `services/auth/src/server.ts` | 257 |
| `services/content/src/server.ts` | 1559 |
| `services/messaging/src/server.ts` | 691 |
| `services/notifications/src/server.ts` | 114 |
| `services/social/src/server.ts` | 1558 |
| `services/users/src/server.ts` | 369 |

**Status:** `services/shared/src/middleware/error.ts` already exports `errorHandler` but NO service imports it.

### 5f. PrismaClient Initialization — 9 separate instances

| File | Line | connection_limit |
|------|------|-----------------|
| `services/auth/src/server.ts` | 15 | 10 |
| `services/content/src/server.ts` | 14 | 15 |
| `services/social/src/server.ts` | 14 | 15 |
| `services/users/src/server.ts` | 13 | 10 |
| `services/messaging/src/server.ts` | 45 | 10 |
| `services/notifications/src/server.ts` | 11 | 5 |
| `services/shared/src/service-base.ts` | 12 | **MISSING** ⚠️ |
| `services/shared/prisma/seed.ts` | 7 | N/A (seed) |
| `services/content/prisma/seed-dtm.ts` | 6 | N/A (seed) |

### Recommendations
- **High Priority:** Extract `authMiddleware`, `AuthRequest`, `auditLog`, and error handler into `services/shared/` and import them
- Total duplicated code: ~150 lines × 6 services = **~900 lines of dead weight**
- The shared module already exists (`services/shared/src/middleware/error.ts`, `services/shared/src/service-base.ts`) but nothing imports from it

---

## 6. Search Inputs

### Found search implementations:

| File | Lines | Pattern | Debounced? |
|------|-------|---------|------------|
| `services/web/src/app/(main)/search/page.tsx` | 18-65 | Full search page with name/id/city types | **Yes** (300ms debounce via `setTimeout`, L40-41) |
| `services/web/src/app/(main)/messages/page.tsx` | 547-549, 716-718, 845-849 | In-chat message search | **No** — fires on Enter/button only |
| `services/web/src/app/(main)/messages/page.tsx` | 1347, 1430, 1469 | Conversation list filter | **No** — client-side filter (ok) |
| `services/web/src/app/(main)/matches/page.tsx` | 726, 853-854, 1082 | Match search/filter | **No** — appears to be client-side filter (ok) |

### Recommendations
- Search page debounce ✅ already implemented at 300ms
- Message search (L716-718) makes API call on every Enter press — acceptable since it's explicit
- Client-side filters in messages list and matches list don't need debounce
- Consider adding `useDeferredValue` or `startTransition` for large list filtering

---

## 7. Like / Pass / Settings Toggle — Optimistic Updates

### Settings Toggles ✅ (GOOD)
- **File:** `services/web/src/app/(main)/settings/page.tsx` L160-175
- `toggle()` calls `setSettings(s => ({...s, [key]: newVal}))` **before** API call
- On failure: `catch { setSettings(s => ({...s, [key]: !newVal})) }` — proper rollback
- `updatePref()` also does optimistic update with rollback

### Discover Pass ⚠️ (PARTIAL)
- **File:** `services/web/src/app/(main)/discover/page.tsx` L993-998
- `handlePass()` fires `api.passUser().catch(() => {})` — fire-and-forget
- Moves to next profile immediately — **optimistic by nature** (card is discarded)
- Missing: no error feedback if passUser fails

### Discover Like/Move ⚠️ (NOT OPTIMISTIC)
- **File:** `services/web/src/app/(main)/discover/page.tsx` L1001-1013
- `handleMove()` awaits `api.sendMiamoMove()` — **blocks UI** until response
- Falls back to `api.sendLike()` on failure — **adds latency**
- User sees delay before card advances

### Story Like ❌ (NOT OPTIMISTIC)
- **File:** `services/web/src/app/(main)/stories/page.tsx` L391-395
- `handleLike()` awaits `api.likeStory()` then sets state from response
- Like count/state updates only **after** server responds
- Should toggle `liked` state immediately and reconcile on response

### Story React ✅ (FIRE-AND-FORGET)
- **File:** `services/web/src/app/(main)/stories/page.tsx` L525
- `api.reactToStory().catch(() => {})` — fire-and-forget, effectively optimistic

### AI Match Like ❌ (NO FEEDBACK)
- **File:** `services/web/src/app/(main)/ai-match/page.tsx` L85
- `api.sendLike().catch(() => {})` — fire-and-forget with zero UI feedback

### Beat Mute ❌ (NO FEEDBACK)
- **File:** `services/web/src/app/(main)/beats/page.tsx` L1281
- `api.updateSettings().catch(() => {})` — fire-and-forget, no confirmation

### Recommendations
- **Critical:** Story like should be optimistic (toggle immediately, reconcile)
- **Critical:** Discover move/like should advance card immediately then reconcile
- **Medium:** AI match like and beat mute need visual feedback (button state change, toast)

---

## 8. Heavy Pages for Lazy Loading

| File | Lines | Lazy Loading? |
|------|-------|---------------|
| `services/web/src/app/(main)/messages/page.tsx` | 1,645 | ❌ No |
| `services/web/src/app/(main)/serious-mode/page.tsx` | 1,481 | ❌ No |
| `services/web/src/app/(main)/beats/page.tsx` | 1,399 | ❌ No |
| `services/web/src/app/(main)/matches/page.tsx` | 1,301 | ❌ No |
| `services/web/src/app/(main)/discover/page.tsx` | 1,204 | ❌ No |
| `services/web/src/app/(main)/creativity/page.tsx` | 1,153 | ❌ No |
| `services/web/src/app/(main)/stories/page.tsx` | 891 | ❌ No |
| `services/web/src/app/(main)/profile/page.tsx` | 486 | ❌ No |
| `services/web/src/app/(main)/date-planner/page.tsx` | 473 | ❌ No |
| `services/web/src/app/(main)/vibe-check/page.tsx` | 397 | ❌ No |
| `services/web/src/app/(main)/settings/page.tsx` | 387 | ❌ No |
| `services/web/src/app/(main)/love-language/page.tsx` | 304 | ❌ No |

**No `next/dynamic` or `React.lazy` usage found anywhere in the frontend.**

### Recommendations
- Use `next/dynamic` with `{ ssr: false }` for heavy sub-components within pages (modals, detail views, charts)
- Particularly impactful: the chat view inside `messages/page.tsx`, story viewer in `stories/page.tsx`, profile detail modals in `matches/page.tsx`
- Consider route-level code splitting via Next.js parallel routes or intercepting routes

---

## 9. Image Usage

### `<img>` Tags (Unoptimized) — 30+ occurrences
**Major offenders:**
| File | Count | What |
|------|-------|------|
| `discover/page.tsx` | 4 | User profile photos, gallery images |
| `messages/page.tsx` | 4 | Logo spinners, file previews |
| `creativity/page.tsx` | 6 | Media thumbnails, user avatars, upload previews |
| `matches/page.tsx` | 6 | Match photos, profile images |
| `stories/page.tsx` | 4 | Story media, thumbnails |
| `serious-mode/page.tsx` | 2 | Profile photos |
| `beats/page.tsx` | — | (uses SVG only) |
| `feed/page.tsx` | 1 | Post media |
| `profile/page.tsx` | 1 | User photos |
| `videos/page.tsx` | 1 | Video thumbnails |

### `next/image` (Optimized) — Only 5 files
| File | Usage |
|------|-------|
| `premium/page.tsx` | Logo/branding |
| `register/page.tsx` | Onboarding images |
| `login/page.tsx` | Login branding |
| `app/page.tsx` (landing) | Landing images |
| `components/ui/miamo-logo.tsx` | Logo component |

### Recommendations
- **Critical:** ~30 raw `<img>` tags need migration to `next/image` for:
  - Automatic lazy loading
  - WebP/AVIF conversion
  - Responsive srcsets
  - CLS prevention via width/height
- Priority: user photos in `discover/` and `matches/` (most viewed pages)
- For user-uploaded content with unknown dimensions, use `fill` + `sizes` prop
- Loading spinner `<img src="/logo.png">` pattern (messages, creativity, matches) should use a React spinner component instead

---

## 10. Database Indexes

### Existing Indexes
The schema is **identical** across all 7 Prisma schemas (shared single schema file). Total: **~85 @@index + ~20 @@unique** declarations.

**Key indexed fields:**
- User: `email`, `username`, `miamoId`
- Profile: `city`, `gender`, `datingIntent`, `seriousMode`, `sexuality`, `lookingFor`, `height`
- Like: `[fromUserId, toUserId, targetType, targetId]` (unique), `[toUserId]`
- Match: `[user1Id, user2Id]` (unique), `[user1Id]`, `[user2Id]`
- MatchRequest: `[fromUserId, toUserId, targetType, targetId]` (unique), `[toUserId, status]`
- Chat/Message: `[chatId, createdAt]`, `[senderId]`
- Story: `[authorId, createdAt]`, `[expiresAt]`
- Notification: `[userId, read, createdAt]`
- UserActivity: `[userId, createdAt]`, `[userId, action, targetType]`, `[targetType, targetId]`
- Session: `[userId, revoked]`, `[token]`, `[userId, lastActiveAt]`

### Missing Indexes (based on query patterns in server.ts files)

| Query Pattern | File:Line | Missing Index |
|--------------|-----------|---------------|
| `block.findMany({ OR: [{ blockerId }, { blockedId }] })` | social:170, 842, 885; content:495 | Already indexed ✅ |
| `like.findMany({ fromUserId })` | social:175, 890 | Has `@@unique([fromUserId, toUserId, ...])` but **no single-column `fromUserId` index** ⚠️ |
| `vibeCheck.findMany({ userId })` | social:809, 837 | `[userId, createdAt]` ✅ and `[userId, active]` ✅ |
| `matrimonialProfile.findMany({ religion, caste })` | content:903, 1124, 1461 | `[religion, caste]` ✅ |
| `bioDataAccessRequest.findMany({ ownerId, status })` | content:996, 1047 | `[ownerId, status]` ✅ |
| `creativityItem.findMany({ category, authorId })` | content:510, 736 | Has `[category]` and `[authorId]` separately — **missing composite** ⚠️ |
| `profileInterest.findMany({ userId })` | social:275, 882; content:430 | `[userId]` ✅ |
| `dtmMessage.findMany({ senderId, recipientId })` | content:1499, 1520, 1525 | `[senderId, recipientId, createdAt]` ✅ |
| `user.findMany({ gender, city, age range })` | social:269, 894 | Only single-column indexes — **missing composite `[gender, city]`** ⚠️ |

### Recommendations
- Add `@@index([fromUserId])` on Like model for `findMany({ fromUserId })` queries
- Add composite `@@index([category, authorId])` on CreativityItem
- Add composite `@@index([gender, city])` on Profile for discover/match queries
- Consider `@@index([online, gender, city])` for "active users near me" queries

---

## 11. Connection Pooling

| Service | connection_limit | pool_timeout |
|---------|-----------------|--------------|
| auth | 10 | 20s |
| content | 15 | 20s |
| social | 15 | 20s |
| users | 10 | 20s |
| messaging | 10 | 20s |
| notifications | 5 | 20s |
| **shared/service-base** | **MISSING** ⚠️ | **MISSING** ⚠️ |

### Recommendations
- `services/shared/src/service-base.ts` PrismaClient has **no connection_limit configured** — will use Prisma default (unlimited connections)
- Since all services share the same PostgreSQL instance, total pool = 10+15+15+10+10+5 = **65 connections** — reasonable for a single instance
- For production, calculate max connections: `max_connections / num_services` (PostgreSQL default is 100)
- Add `connection_limit` to shared service-base

---

## 12. Rate Limiting

### Coverage
| Service | Global Rate Limit | Specific Limiters |
|---------|-------------------|-------------------|
| auth | 1000/15min | — |
| content | 2000/15min | — |
| social | 2000/15min | — |
| users | 2000/15min | — |
| messaging | 2000/15min | — |
| notifications | 2000/15min | — |
| **gateway** | 5000/15min (user-aware) | **Auth: 30/15min** ✅ |

### Gateway Rate Limiting Detail
- **Global:** 5000 req/15min per user ID (or IP if unauthenticated)
- **Auth-specific:** 30 req/15min per IP — good for brute-force prevention
- Key generator uses `x-user-id` header or IP fallback

### Recommendations
- **Missing:** No per-endpoint rate limiting for expensive operations:
  - `/api/v1/discover` (profile queries) — should be ~100/15min
  - `/api/v1/search` — should be ~60/15min
  - `/api/v1/feed` POST (content creation) — should be ~30/15min
  - `/api/v1/likes` POST — should be ~200/15min (prevent like-bombing)
- Individual service rate limits (2000/15min) are redundant if gateway already limits — consider removing them to reduce overhead
- Add sliding window algorithm for smoother rate limiting

---

## 13. Input Sanitization & Security

### What Exists
| Feature | Status |
|---------|--------|
| **Helmet** | ✅ Enabled on all 7 services with `crossOriginResourcePolicy: 'cross-origin'` |
| **Zod validation** | ✅ Frontend login/register forms use `zodResolver` |
| **Header sanitization** | ✅ Gateway strips `x-forwarded-host`, `x-original-url`, `x-rewrite-url` |
| **Rate limiting** | ✅ All services + gateway-level auth limiter |
| **CORS** | ✅ Gateway has origin allowlist |

### What's Missing
| Gap | Severity |
|-----|----------|
| **No backend input validation** (Zod/Joi) on any API endpoint | 🔴 Critical |
| **No XSS sanitization** (DOMPurify/sanitize-html) on user content | 🔴 Critical |
| **No SQL injection protection** beyond Prisma's built-in parameterization | 🟡 Medium (Prisma handles this) |
| **No CSRF protection** | 🟡 Medium (JWT-based auth mitigates this) |
| **No request body size validation** in services (only express.json limit) | 🟡 Medium |
| **No file upload validation** (type/size) visible in backend | 🔴 Critical |
| Frontend only validates login/register — **no Zod on any settings, profile, or content forms** | 🟡 Medium |

### Recommendations
- **Critical:** Add Zod schemas for all API endpoints (especially content creation, messaging, profile updates)
- **Critical:** Add `sanitize-html` or `DOMPurify` (via `isomorphic-dompurify`) for user-generated text content
- Add `express-validator` or Zod middleware for request body validation
- Set `express.json({ limit: '1mb' })` explicitly on all services

---

## 14. Frontend Shared Code

### Existing Shared Files
| File | Lines | Purpose |
|------|-------|---------|
| `services/web/src/lib/api.ts` | 324 | API client class with all endpoints |
| `services/web/src/lib/utils.ts` | ~12 | `cn()` classname utility |
| `services/web/src/lib/constants.ts` | — | App constants |
| `services/web/src/hooks/useTrackActivity.ts` | 225 | Activity tracking hooks |
| `services/web/src/hooks/useSSE.ts` | — | Server-sent events hook |

### Existing UI Components (13 files)
| Component | File |
|-----------|------|
| Button | `components/ui/button.tsx` |
| Input | `components/ui/input.tsx` |
| Modal | `components/ui/modal.tsx` (213 lines) |
| Toast | `components/ui/toast.tsx` (188 lines) |
| Skeleton | `components/ui/skeleton.tsx` (334 lines) |
| MiamoLogo | `components/ui/miamo-logo.tsx` (279 lines) |
| ErrorBoundary | `components/ui/error-boundary.tsx` |
| EmptyState | `components/ui/empty-state.tsx` |
| InfiniteScroll | `components/ui/infinite-scroll.tsx` |
| PullToRefresh | `components/ui/pull-to-refresh.tsx` |
| PageTransition | `components/ui/page-transition.tsx` (160 lines) |
| Providers | `components/providers.tsx` |
| UI Index | `components/ui/index.tsx` (216 lines — barrel export) |

### What's Missing
| Missing Shared Code | Found Inline In |
|---------------------|-----------------|
| `useDebounce` hook | Manual `setTimeout` in search/page.tsx |
| `useOptimisticUpdate` hook | Ad-hoc in settings, discover |
| `UserAvatar` component | Raw `<img>` in 8+ pages |
| `UserCard` / `ProfileCard` component | Duplicated across discover, matches, search, ai-match |
| `LoadingSpinner` component | `<img src="/logo.png" className="animate-pulse">` in 5+ places |
| `ConfirmDialog` component | Inline modal patterns in matches, messages |
| `usePagination` / `useInfiniteScroll` hook | Ad-hoc pagination in multiple pages |
| TypeScript types for API responses | `any` types everywhere |
| Error handling utility | `catch(() => {})` everywhere |

### Recommendations
- Create `hooks/useDebounce.ts` — used in 3+ places
- Create `hooks/useOptimisticMutation.ts` — standardize optimistic update pattern
- Create `components/UserAvatar.tsx` using `next/image` — replace 30+ raw `<img>` tags
- Create `components/UserCard.tsx` — reusable profile card for discover, matches, search, ai-match
- Create `components/LoadingSpinner.tsx` — replace logo-as-spinner pattern
- Create `types/api.ts` — define all response types, eliminate `any`

---

## Summary: Priority Matrix

### 🔴 Critical (Do First)
1. **Backend input validation** — Zero Zod/validation on API endpoints
2. **XSS sanitization** — No sanitization on user content
3. **Silent `.catch(() => {})`** — 35 instances hiding errors from users
4. **Duplicated code** — `authMiddleware` 6×, `auditLog` 5×, `AuthRequest` 6×, error handler 6×

### 🟡 High (Do Soon)
5. **`any` types** — 49 in backend, 100+ in frontend; start with `api.ts`
6. **Raw `<img>` tags** — 30+ unoptimized images, migrate to `next/image`
7. **No lazy loading** — Zero `next/dynamic` usage across 24 pages
8. **Missing optimistic updates** — Story like, discover move, AI match like
9. **Missing database indexes** — `Like.fromUserId`, `Profile[gender, city]`

### 🟢 Medium (Do Later)
10. **File sizes** — 14 files >500 lines need decomposition
11. **Replace console.log** — Structured logger for production
12. **Per-endpoint rate limiting** — Currently only global limits
13. **Shared service-base connection pooling** — Missing `connection_limit`
14. **Frontend shared components** — UserAvatar, UserCard, LoadingSpinner extraction
