# FRONTEND.md — Miamo Web App (v3.6.0)

> The frontend lives in `services/web/`. It is a single Next.js 14 App-Router
> application that serves every authenticated surface (Discover, Matches,
> Messages, Profile, Creativity, DTM, and 20 others). This document is the
> canonical map of that app — its layout, routes, stores, hooks, and the
> components introduced in v3.6.0.
>
> Format: each subsection pairs a **"What Priya / Arjun / Karan / Riya sees"**
> paragraph (what a real user perceives) with a **"What the code does"**
> paragraph (what the implementation actually executes). Use the user-facing
> half when designing or QA-ing; use the code half when refactoring or
> wiring instrumentation.

---

## 0. Quick reference

| Thing | Where |
|---|---|
| Next.js app root | `services/web/src/app/` |
| Authenticated layout | `services/web/src/app/(main)/layout.tsx` |
| Public layout | `services/web/src/app/(auth)/` (login, register, forgot-password) |
| Zustand stores | `services/web/src/stores/index.ts` |
| Custom hooks | `services/web/src/hooks/*.ts` |
| Design system primitives | `services/web/src/components/ui/` |
| API client | `services/web/src/lib/api.ts` |
| Tracking pipeline | `services/web/src/lib/track/` |
| Global constants (nav, options) | `services/web/src/lib/constants.ts` |
| App Router metadata | `services/web/src/app/{robots,sitemap,manifest}.ts` |

Dev: `cd services/web && npm run dev` (port 3100).
Build: `cd services/web && npm run build && npm run start`.

---

## 1. Next.js 14 App Router layout

### 1.1 What Priya sees

Priya opens `miamo.in` on her phone. She is taken to a brand-aligned landing
hero with "Sign in" and "Create account" CTAs. After logging in she lands on
`/discover` and from then on every page she visits — Matches, Messages,
Profile, Creativity, the Settings she opens at 2am — all share the same
shell: a sidebar on the left (on desktop), a header at the top with a bell
and her avatar, and on mobile a four-tab bottom nav. She never sees a full
page reload between any of these screens; the cards just slide and blur in.

### 1.2 What the code does

The app is structured around the Next.js App Router's "route group" feature.
Two groups partition the surface:

- **`services/web/src/app/(auth)/`** — login, register, forgot-password,
  reset-password. No app chrome, no auth guard. Renders the bare brand and a
  centered card.
- **`services/web/src/app/(main)/`** — every authenticated route. Shares one
  `layout.tsx` that contains the sidebar, header, mobile nav, SSE wiring,
  auth gate, and onboarding gate.

The route group syntax (`(main)`) keeps the segment in the URL invisible —
`(main)/discover/page.tsx` resolves to `/discover`, not `/main/discover`.
That lets the unauthenticated and authenticated trees share a single root
`app/layout.tsx` (where global CSS, fonts, and `<Providers>` mount) while
still rendering different chrome.

Each route is its own `page.tsx` inside `(main)/<route>/page.tsx`. Every
authenticated `page.tsx` declares `'use client'` because the entire app is
heavily client-stateful (Zustand, persistent localStorage, SSE, framer
animations). Pages that need a quick spinner ship a sibling `loading.tsx`
(currently `(main)/loading.tsx`, `(main)/discover/loading.tsx`,
`(main)/messages/loading.tsx`).

Other metadata files at the app root:

- `app/error.tsx` — root segment error boundary (renders a "Something went
  off-track" card with `Try again` / `Go home` buttons).
- `app/not-found.tsx` — branded 404 (rose gradient, "Page not found", back-to-
  Miamo CTA).
- `app/robots.ts` — `MetadataRoute.Robots`. Allows `/`, `/login`, `/register`,
  `/forgot-password`; disallows every authenticated path.
- `app/sitemap.ts` — public-only sitemap entries (`/`, `/login`, `/register`,
  `/forgot-password`).
- `app/manifest.ts` — PWA manifest (`name: 'Miamo — Premium Dating App'`,
  `theme_color: '#C97856'`, single SVG icon).

The root `app/layout.tsx` mounts `<Providers>` from
`services/web/src/components/providers.tsx`, which wires the toast system, a
`ConsentBanner`, and a global error boundary.

---

## 2. The shared `(main)/layout.tsx`

`services/web/src/app/(main)/layout.tsx` is the single most important file in
the frontend. Every authenticated experience is rendered as `children` inside
this layout, so changes here ripple to all 26 routes.

### 2.1 What Arjun sees

Arjun signs in. For about 250 ms he sees the animated Miamo logo bloom on
the off-white background — "Loading…". Then the sidebar slides in from the
left, the header materializes at the top, and Discover fades up with a soft
y-axis nudge and a faint blur lifting away. The sidebar shows the Miamo
wordmark with a small Premium crown badge next to it, a primary nav section
(Discover, Matches, Messages, Profile, Beats, Creativity), and a collapsible
**More** section (Stories, Videos, Date Ideas, Vibe Check, Compatibility,
Date Planner, Love Language, Notifications, AI Match, Search, Verify,
Safety, Premium, Settings). At the bottom: his avatar + display name + a
copper progress ring showing his profile score, then a discreet "Sign out".

The header shows the current page title in the brand font, and on the right
a bell icon. When Riya messages him, the bell pulses with a copper "1"
badge, and a frosted toast slides in from the top-right with her name and
message preview. On mobile Arjun loses the sidebar; instead a glassy bottom
nav appears with 4 icons (Discover, Matches, Messages, Profile) and a More
button that takes him to /profile and reveals the long tail.

### 2.2 What the code does

`MainLayout({ children })` is a client component that does six things in
order:

1. **Hydration gate.** Zustand persist is async — the layout subscribes via
   `useAuthStore.persist.onFinishHydration(...)` and stays in the
   "Loading…" spinner state until hydration finishes. A fallback check
   (`useAuthStore.persist.hasHydrated()` plus a synchronous
   `getState().isAuthenticated`) covers SPA navigations where persist has
   already flushed.

2. **Auth guard.** Once hydrated, if `isAuthenticated === false` the layout
   triggers a hard `window.location.href = '/login'`. Hard nav (not
   `router.push`) is deliberate — it forces an unmount of every cached
   client state and prevents stale data leaking across users.

3. **Onboarding gate.** A second effect calls `api.getCompletion()`. If
   `score < threshold` the user is bounced to `/onboarding` via
   `router.replace`. Five paths are **exempt** from this gate so users can
   still act on time-sensitive items even with an incomplete profile:
   `/onboarding`, `/profile`, `/settings`, `/notifications`, `/access`,
   `/serious-mode`. The gate fails open — any error from `getCompletion()`
   is swallowed so a flaky API doesn't soft-brick the whole app.

4. **SSE connection.** `useSSEConnection(isAuthenticated)` opens a singleton
   `EventSource` to the gateway. Three listeners are bound here:
   - `new-notification` → bumps the bell badge count, shows a top-right
     toast (`msgToast`) unless the user is already on `/messages`.
   - `new-message` → triggers `refreshUnread()` which re-fetches
     `api.getChats()` and sums `unreadCount` across chats. The total
     updates the small copper bubble overlaid on the Messages icon in
     both the sidebar and the bottom nav.
   - A 60-second poll fallback re-fetches `api.getNotificationCount()` in
     case SSE drops.

5. **Initial profile + notification fetch.** On auth, the layout fires
   three parallel calls: `api.getMe()` (populates the sidebar avatar +
   profile score), `api.getNotificationCount()`, and `refreshUnread()`. A
   401 or 404 on `getMe()` triggers `clearAuth()` + a hard redirect to
   `/login` (defensive: server-side session may have been revoked while
   the client still held a stale token).

6. **Chrome render.** Three pieces:

   - **Sidebar (`<aside>`).** Hidden below `lg:`. Renders `NAV_MAIN` (always
     visible) and `NAV_SECONDARY` (collapsible under a "More" header whose
     open state is mirrored to `localStorage["miamo-nav-more-open"]`).
     Each item is a Framer `motion.div` with a hover x-shift and an
     active-state dot animated via `layoutId="nav-active-dot"`. The
     Messages item gets an overlaid unread-count badge. Bottom: user
     profile card + Score Ring + Sign-out button.

   - **Header.** 72 px high. Shows the page title — derived from
     `pathname.split('/').filter(Boolean)[0]` with a small alias table
     (`onboarding → My Profile`, `serious-mode → Date to Marry`, etc.).
     On the right: bell icon with the live unread-notification badge.

   - **Mobile bottom nav.** Shown below `lg:`. Renders the first four
     `NAV_MAIN` items plus a "More" affordance that links to `/profile`.
     The nav pads its bottom with `env(safe-area-inset-bottom)` for iOS
     notch and Android gesture-pill clearance.

7. **Page transition.** `{children}` is wrapped in `AnimatePresence
   mode="wait"`. Each page mounts with `opacity + y + blur` then unmounts
   with a soft fade. Three pages opt out (`/messages`, `/beats`,
   `/videos`) because they own their own full-height scroll containers; a
   plain wrapper is used for `/serious-mode` (which is itself a
   multi-section workspace).

8. **Error boundary.** `<ErrorBoundary>` from `@/components/ui/error-boundary`
   wraps `{children}`. This is the second of three error-boundary layers
   (root → layout → page-level) so a thrown error in a single route only
   blanks that route, not the whole shell.

---

## 3. Routes inventory — all 26 `(main)/*` routes

Every authenticated surface lives under `services/web/src/app/(main)/`.
Every route is `'use client'` and fires `useTrackPageView('<routeName>')`
plus `useTrackScrollDepth('<routeName>')` for analytics. The table below
lists each route, what Priya/Arjun/Karan/Riya sees, and the key API calls
made by that page. (Detailed source-of-truth route walkthroughs live in
docs/TRACKING.md / docs/ALGORITHMS.md §6.)

### 3.1 Table of all 26 routes

| # | Route | File | What the user sees | Key API calls |
|---|---|---|---|---|
| 1 | `/access` | `access/page.tsx` | Two-tab inbox/outbox of field-level data-access requests (Photos, Phone, Family info, Income, Kundli, Last name, Exact city, Socials, Email). Approve / Deny / Revoke / Withdraw per row. | `GET /access/requests/{inbox,outbox}`, `POST /access/requests/{id}/{approve,deny}`, `DELETE /access/requests/{id}` |
| 2 | `/ai-match` | `ai-match/page.tsx` | "How AI Match works" explainer + list of top AI matches with 7-bar ensemble breakdown (For-You, Collaborative, Active now, Serious intent, Match-history affinity, Vibe momentum, Exploration). | `getAiSuggestions`, `sendLike` |
| 3 | `/beats` | `beats/page.tsx` | Beats (ephemeral message streaks). Four stat cards + filter chips + selectable chat view with media beats (photo/video/voice/music/gif) and ice-breakers. | `getBeats`, `startBeat`, `completeBeat`, `missBeat`, `expireBeat`, `restoreBeat`, `archiveBeat`, plus per-event endpoints (view, replay, save, screenshot, download) |
| 4 | `/compatibility` | `compatibility/page.tsx` | 3-section × 4-question quiz with animated `CompatibilityRing` result and past-results history. | `getMatches` |
| 5 | `/creativity` | `creativity/page.tsx` | Creativity v3.5 Spotlight economy: compact hero with `SpotlightBalancePill`, Earn/Vault buttons, milestone chip, category chips, sort tabs, search, and a unified `ReelsView` feed. | `getCreativityItems`, `viewCreativityItem`, plus every endpoint touched by ReelsView/MoveModal/CommentSheet/ShowcaseComposer/SpotlightUI |
| 6 | `/date-ideas` | `date-ideas/page.tsx` | 28 hand-curated date ideas across 8 categories. "Surprise Me" spotlight pick, save bar, 2-col expandable cards. | None — static data |
| 7 | `/date-planner` | `date-planner/page.tsx` | 5-step modal wizard: pick match → vibe → venue → time + budget → activities + notes. Saved plans render as cards. | `getMatches` |
| 8 | `/discover` | `discover/page.tsx` | Card-deck Discover experience: ShortcutBar quick filters, Undo, Saved-for-later, thumbnail strip, `ProfileCard` with Pass/Move/Like/Super Like/See Later, right-rail `AiSidePanel`. | `getDiscover`, `passUser`, `passUserFeedback`, `sendMiamoMove`, `sendLike`, `superLikeUser`, `getAiScore`, `getMoveSuggestions`, `deferItem`, `listDeferred`, `saveDiscoverFilters` |
| 9 | `/dtm` | `dtm/page.tsx` | DTM daily-question feed: one prompt at a time with textarea, Skip/Save/See later, terminal "all caught up" with revisit deferred. | `deferItem({surface:'dtm'})`, `listDeferred({surface:'dtm'})` (and `getDtmQuestions` once the matrimonial service ships it) |
| 10 | `/feed` | `feed/page.tsx` | Vertical post feed with ComposeBox (text + image/video attach), filter chips (All/Thoughts/Photos/Date Ideas/Moods/Milestones), and per-post like/comment/save/share/menu. | `getFeed`, `createPost`, `deletePost`, `reactToPost`, `commentOnPost`, `getPostComments` |
| 11 | `/love-language` | `love-language/page.tsx` | 8-question love-language quiz mapping to 5 outcomes (Words of Affirmation, Acts of Service, Quality Time, Physical Touch, Receiving Gifts). | None — static questionnaire |
| 12 | `/matches` | `matches/page.tsx` | Three-tab Matches: **Incoming** likes / **Matches** grid / **On Hold** deferred. StoriesRail strip on top. Pinned section, bulk-select Resume All, ContextMenu with smart positioning. | `getIncomingLikes`, `getMatches`, `matchBack`, `matchBackWithMove`, `holdIncoming`, `resumeIncoming`, `hideIncoming`, `favoriteMatch`, `pinMatch`, `unmatch`, `reportMatch`, `blockUser`, `blockByUser` |
| 13 | `/messages` | `messages/page.tsx` | Two-pane messenger: chat list (with select-mode bulk actions, Hidden/Archived/Held filter) on the left, ChatView on the right. SSE-driven real-time refresh. | `getChats`, `getArchivedChats`, `pinChat`, `muteChat`, `archiveChat`, `clearChat`, `unmatchByUser`, `reportByUser`, `blockByUser`, plus every ChatView endpoint (`getChatMessages`, `sendMessage`, `editMessage`, etc.) |
| 14 | `/notifications` | `notifications/page.tsx` | Notifications grouped by Today / This Week / Earlier. Per-row sender avatar + type icon (match/comment/beat/message/like/story/match_request). | `getNotifications`, `markNotificationRead`, `markAllNotificationsRead` |
| 15 | `/onboarding` | `onboarding/page.tsx` | Completion-graded form with hero score card + expandable bucket cards. Casual buckets: identity, city, photos, bio, prompts, interests, lifestyle, lookingFor, profession, verification. DTM buckets cover marriage flow. | `getCompletion`, `getMyProfile`, `getMatrimonialProfile`, `updateProfile`, `updateMatrimonialProfile`, `updatePrompts`, `updateInterests`, `nearestCity`, plus `searchCities` |
| 16 | `/premium` | `premium/page.tsx` | Three plan cards (Free / Premium / Platinum) with feature bullets, "MOST POPULAR" pill, "Selected! Payment coming soon" stub CTA. | None (placeholder UI) |
| 17 | `/profile` | `profile/page.tsx` | Profile view + inline editor: parallax hero, animated `ScoreRing`, story-ring avatar button, social-proof row, photo grid with lightbox, About + Prompts + Interests cards, sidebar with completion checklist and Get Verified CTA. | `getMyProfile`, `updateProfile`, `updatePrompts`, `updateInterests`, `uploadPhoto`, `nearestCity`, `getMyStories` |
| 18 | `/safety` | `safety/page.tsx` | 8-card Safety Center: Report a User, Block & Privacy, Verification, Scam Prevention, Emergency Resources, Community Guidelines, Consent & Boundaries, Meeting Safely. Inline report form, tel:112 dialer confirm. | `reportUser`, `getSafetyTips` |
| 19 | `/search` | `search/page.tsx` | Three search-type chips (Name / Miamo ID / City), debounced input, result rows with View Profile / Like buttons. | `search`, `sendLike` |
| 20 | `/serious-mode` | `serious-mode/page.tsx` | Full DTM workspace: hamburger sidebar with Browse / Profile / Matches / Numerology / Kundli / DTM Chat / Access Control / Partner Preferences / Privacy & Security / Bio Data Templates. | `getMatrimonialProfile`, `updateMatrimonialProfile`, `browseMatrimonial`, `browseMatrimonialAdvanced`, `getMatrimonialMatches`, `getMatrimonialNumerology`, `getMatrimonialNumerologyCompat`, `getMatrimonialCompatibility`, `uploadKundli`, `getDtmChats`, `sendDtmMessage`, `getCompletion`, `getMatrimonialTemplates` |
| 21 | `/settings` | `settings/page.tsx` | 12-section left rail: Account / Privacy & Visibility / Discovery / Communication / Beats / Notifications / Appearance / Preferences / Safety / Subscription / Help & Feedback / Data & Account. Right pane swaps. v3.6.0 adds **Personalization & Privacy** controls. | `getSettings`, `updateSettings`, `updatePrivacy`, `updateProfile`, `updatePassword`, `getBlockList`, `unblockUser`, `exportData`, `deactivateAccount`, `deleteAccount`, `logout` |
| 22 | `/showcase` | `showcase/page.tsx` | Lightweight showcase list (legacy or pre-Creativity surface). Category chips + item list with pinned badge, title, body, link, match/move counts. | Direct `fetch /api/v1/showcase?category=<cat>` |
| 23 | `/stories` | `stories/page.tsx` | Horizontal story row + My Stories Insights card (view/like/comment counts; Post-to-Feed action) + From-Your-Matches grid + Tips card. | `getStories`, `getMyStories`, `createStory`, `viewStory`, `likeStory`, `reactToStory`, `getStoryComments`, `commentOnStory`, `deleteStoryComment`, `postStoryToFeed`, `deleteStory`, `getStoryViewers`, `getStoryLikes` |
| 24 | `/verify` | `verify/page.tsx` | Three-step verification flow: email OTP → phone OTP → selfie URL. Auto-skips completed steps. Dev mode exposes `_devCode`. | `getVerificationStatus`, `sendEmailOtp`, `verifyEmailOtp`, `sendPhoneOtp`, `verifyPhoneOtp`, `submitVerification` |
| 25 | `/vibe-check` | `vibe-check/page.tsx` | 4-step picker: Mood → Energy → Topics → Intent. Animated wave background, vibe-compatible matches list, history. | `saveVibeCheck`, `getVibeHistory`, `getVibeMatches` |
| 26 | `/videos` | `videos/page.tsx` | TikTok-like 9:16 video grid (2 → 3 → 4 cols), per-card like/comment/bookmark/share, quick comment composer, filter chips. | `getVideos`, `reactToVideo`, `commentOnVideo`, `viewVideo`, `getVideoComments` |

### 3.2 Spot-check: `/discover`

For a sense of how a typical route is wired, walk through `/discover`. It is
the most-trafficked surface in the app and a good template.

#### 3.2.1 What Karan sees

Karan opens Discover at lunchtime. A sticky bar at the top shows a Filters
button (with an active-count badge), a Refresh icon, six quick-filter
shortcuts (For You / New / Active / Verified / Serious / AI Picks), Undo,
and Saved-for-later. Just below: "3 of 10" + a thumbnail strip of the next
profiles in the deck + an AI score pill that previews the current
candidate's match score. The main column is a tall `ProfileCard` with
photos, age, city, interests, a "Why am I seeing this?" trigger (new in
v3.6), and big-button actions at the bottom: Pass / Move / Like / Super
Like / See Later. On a desktop monitor a sidebar appears on the right with
the AI score breakdown (top contributing ingredients) and a Move composer
prefilled with three openers.

After Karan passes three profiles in a row, a bottom-sheet pops up asking
"What's not clicking?" with chips (Not my type / Too far / Different
intent / Distance / Just exploring). It dismisses in 4 seconds whether or
not he picks one. When he reaches the end of the batch a calm "All caught
up" terminal screen appears with a "Refresh" CTA and an option to revisit
the Saved-for-later pile.

#### 3.2.2 What the code does

`discover/page.tsx` (~660 lines) is the canonical example of the Miamo
client-state pattern:

- `usePersistentState('discover:filters', defaultFilters)` and
  `usePersistentState('discover:quickFilter', 'foryou')` mirror the active
  filter state into localStorage so it survives reload (and SPA nav).
- Heavy local state for the rolling top-10 batch (`profiles`, `cursor`,
  `currentIndex`, `exhausted`, `refreshing`).
- `aiData` is a `Record<id, AiScoreData>` populated lazily as the user
  reaches each card. `getAiScore(targetId)` is fetched on idle.
- `actionHistory` keeps the last 5 swipes so Undo can re-insert a profile
  at the current index.
- `batchId`, `batchActed`, `batchDeferred`, `batchExhaustedFired` instrument
  per-batch analytics: when the user reaches the end, one
  `trackDiscoverBatchExhausted({batchId, shown, acted, deferred})` event
  fires (guarded by `batchExhaustedFired` so it doesn't double-fire on
  re-renders).
- Pass feedback is gated by a `passCount % 3 === 0` check so the bottom
  sheet only intervenes every third pass.
- Cross-tab adapters: `window.dispatchEvent('mio:feedrefresh')` and
  `'mio:filterchange'` let other surfaces (e.g. the SSE notification
  layer) react to Discover state changes.

The page renders three columns inside the layout-supplied scroll
container: the sticky control bar, the `ProfileCard`, and (lg+) the
`AiSidePanel`. Every action button calls a single dispatch helper that:
(a) appends to `actionHistory`, (b) calls the API, (c) increments
`currentIndex`, (d) fires a `track('discover.swipe', ...)` event.

---

## 4. Zustand stores

`services/web/src/stores/index.ts` defines three stores. Two are persisted
to localStorage via Zustand's `persist` middleware; the third is in-memory
only.

### 4.1 `useAuthStore`

#### 4.1.1 What Priya sees

Priya signs in once and stays signed in for weeks. Closing the tab and
re-opening it the next day, she lands directly on Discover — no login form
between her and the app. If her session expires server-side, she's bounced
to /login with no warning.

#### 4.1.2 What the code does

```ts
interface AuthState {
  user: any | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user, token, refreshToken?) => void;
  setTokens: (token, refreshToken?) => void;
  updateUser: (data: Partial<any>) => void;
  clearAuth: () => void;
}
```

Persisted to localStorage under `"miamo-auth"`. The `partialize`
configuration is deliberately narrow:

```ts
partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated })
```

Tokens are **never** persisted to JS-readable storage. The access token
lives in memory only (XSS hardening). The refresh token lives in an
`httpOnly` cookie (`miamo_rt`) set server-side and sent automatically by
`fetch(..., { credentials: 'include' })`. Legacy localStorage keys
(`miamo_token`, `miamo_refresh_token`) are explicitly removed on every
`setAuth`, `setTokens`, and `clearAuth` to migrate users off the old
storage scheme.

The `(main)/layout.tsx` waits for `useAuthStore.persist.onFinishHydration`
before reading `isAuthenticated` to avoid a flash of "Loading…" → "Login"
on every page load for an authenticated user.

### 4.2 `useThemeStore`

#### 4.2.1 What Riya sees

Riya opens Settings → Appearance and picks a light/dark/system option. The
choice sticks across reloads and across tabs.

#### 4.2.2 What the code does

```ts
interface ThemeState {
  theme: 'dark' | 'light' | 'system';
  setTheme: (t) => void;
}
```

Persisted to `"miamo-theme"`. Default is `light`. The store does not
imperatively flip CSS variables — instead, the active theme is read by
`<Providers>` and surfaced through CSS custom properties on the document
root, so the app uses the platform-native dark-mode plumbing.

### 4.3 `useDiscoveryStore`

```ts
interface DiscoveryState {
  currentIndex: number;
  filters: { ageRange: [number, number]; distance: number; seriousOnly: boolean; verifiedOnly: boolean };
  setIndex / nextProfile / setFilters
}
```

Not persisted, not currently used by the live `/discover` page. The doc
comment says it's "reserved for future swipe-card UI". The live Discover
page manages its own state via `usePersistentState` because the rolling
top-10 batch needed more fields than this store exposes.

---

## 5. Custom hooks

All custom hooks live in `services/web/src/hooks/*.ts`. Conceptually they
split into three groups: **tracking** (analytics), **persistence** (state
mirroring), and **infrastructure** (SSE, scroll, performance helpers).

### 5.1 Tracking hooks — `useTrackActivity.ts`

The tracking module exports a constellation of hooks. Every event is
mirrored through `@/lib/track.track(...)` (the v3.1 batched pipeline) and,
when relevant, through `api.trackActivity(...)` (the legacy activity API
that powers user-level signals like engagement scoring).

#### 5.1.1 `useTrackPageView(routeName: string)`

Fires `track('page_view', { route: routeName })` once on mount. Every
page calls this. Cheap, dedupe-by-route-on-mount semantics.

#### 5.1.2 `useTrackDwell(routeName: string)`

Times how long the user actually spent on the page (visibility-aware) and
fires `track('dwell', { route, durationMs })` on unmount or
`visibilitychange → hidden`. Used heavily by the Creativity / Reels view
to compute per-item dwell budgets.

#### 5.1.3 `useTrackEngagementDepth(routeName: string)`

Composite: combines scroll depth, click count, and time-on-page into a
single "engagement depth" score that's flushed once per session per route.
Discover and Feed use it to feed the engagement-velocity signal in the
algorithms.

#### 5.1.4 `useTrackPolarity()`

Detects positive vs negative engagement bursts within a session. Surfaces
`{ polarity: 'positive' | 'negative' | 'neutral' }` so a route can adapt
(e.g. Discover surfaces the PassFeedbackModal only when polarity is
trending negative).

#### 5.1.5 `useTrackMoveAccepted({ targetId, slot, tone, hookCategory? })`

Hook used by the MoveV2Picker (v3.6.0) and the v1 Move composer. Calls
`track('move.suggestion_accepted', { tid, slot, tone, hook })` and bridges
to the bandit so the server-side learning loop converges. Returns
`{ trackAccept(payload) }`.

#### 5.1.6 `useTrackMoveComposed({ targetId, source })`

Fires when a user finishes typing and sends a Move (manual or from a
suggestion). Carries `source: 'manual' | 'suggestion_v1' | 'suggestion_v2'`
and `length` and `hasEmoji` flags. Used to compute the open-rate uplift
of suggestions vs manual.

### 5.2 Persistence hooks

#### 5.2.1 `usePersistentState<T>(key, default)` — `usePersistentState.ts`

SSR-safe `useState` replacement that mirrors a value to localStorage. The
initial render always returns `defaultValue` (so SSR + first client render
match and React doesn't whine about hydration mismatches); a `useEffect`
on mount reads the persisted value and replaces it.

Used by ~22 of the 26 routes. The naming convention is `'<page>:<key>'`
— e.g. `'discover:filters'`, `'matches:activeTab'`, `'creativity:sort'`.
The full key inventory (from the knowledge-base): `discover:filters|quickFilter`,
`matches:activeTab|filter|search`, `messages:activeChat|search|tab`,
`beats:activeView|chatFilter`, `creativity:activeCat|sort|search`,
`feed:activeFilter`, `videos:filter`, `vibe:step|mood|energy|topics|intent|done`,
`compat:sectionIdx|questionIdx|myAnswers|partnerAnswers`,
`datePlanner:step|vibe|venue|time|budget|activities|notes`, `dateIdeas:cat`,
`dtm:section|filters|bioDataStep|matchTab|currentIndex`,
`dtmQuestions:currentIndex|answerDraft`, `search:query|type`,
`settings:activeSection`, `showcase:category`, `access:tab`, `onboarding:openKey`.

##### What Arjun sees
Arjun is partway through the Vibe Check (he's on step 3 of 4, picking topics).
A notification pulls him out to /matches. When he comes back the picker is
exactly where he left it — step 3, topics he'd already selected still
highlighted.

##### What the code does
The hook subscribes to `storage` events so changes from another tab also
propagate. Writes are debounced 250 ms to avoid spamming localStorage on
fast-typing inputs.

#### 5.2.2 `useCachedResource(key, fetcher, opts)` — `useCachedResource.ts`

Stale-while-revalidate localStorage cache for async resources. Currently
used by Creativity (`creativity:myStats`, plus a feed cache that the
showcase composer invalidates by string-prefix sweep on publish).

The cache is namespaced per user (`miamo:cache:v1:<userId>:<key>`) so
logging out and logging in as a different user starts fresh.

Options:

- `freshFor` — within this window, the cached value is returned without a
  network call.
- `maxAge` — after this window, the cache is discarded entirely; otherwise
  it's returned stale-then-revalidated.

##### What Priya sees
Priya navigates from Creativity → Profile → Creativity in 15 seconds. The
mini-stats card (Views / Moves / Matches) shows instantly because the
cached values are still fresh; a refetch runs in the background and
silently updates the numbers when it returns.

#### 5.2.3 `useScrollRestore(id, getContainer)` — `useScrollRestore.ts`

Remembers a container's scroll position across SPA navigations, backed by
sessionStorage (so it survives within a tab but resets on tab close). The
hook walks up the DOM with `getContainer` to find the actual scrolling
ancestor (the `(main)/layout.tsx` scroll container is a few elements above
the page root).

Currently wired in Creativity; the rest of the app relies on the layout's
`AnimatePresence` page transition without explicit memory.

##### What Karan sees
Karan scrolls 800 px down the Creativity reels, taps into a profile via the
"View author" link, then taps Back. He lands on Creativity at the exact
scroll position he left, not at the top.

### 5.3 Infrastructure hooks

#### 5.3.1 `useSSE(eventName, handler, enabled)` — `useSSE.ts`

Subscribes a handler to a single SSE event on the singleton `EventSource`
connection that `useSSEConnection` manages. The hook is event-scoped, not
connection-scoped; many components can subscribe to the same connection.

`useSSEConnection(isAuthenticated)` opens the actual `EventSource`. It
reconnects with exponential backoff + jitter capped at 30 s, with the
attempt counter reset on `onopen`. The full event taxonomy carried by
this connection: `new-message`, `message-sent`, `new-notification`,
`beat-update`, `chat-update`, `beat-viewed`, `beat-saved`, `beat-unsaved`,
`beat-screenshot`, `beat-downloaded`.

#### 5.3.2 `useSpotlight()` — defined near Creativity / lib

Custom hook used by `/creativity` for the Spotlight economy. Returns
`{ balance, refresh, setBalance, matchCount, nextMilestone }`. Backed by
the Spotlight ledger service.

#### 5.3.3 `usePerformance.ts`

A grab-bag of small helpers used across pages:

- `useDebounce(value, ms)` — classic debounced value.
- `useDebouncedCallback(fn, ms)` — debounced function ref.
- `useReadingTime(elementRef)` — visibility-tracked dwell timer that only
  counts ms while the element is on-screen (used by /dtm for answer dwell).
- `useThrottledCallback(fn, ms)` — leading-edge throttle.

---

## 6. v3.6.0 NEW components

This release introduces six user-visible additions: three brand-new
components, two enhanced experiences, and a Settings sub-section.

### 6.1 `VoiceFingerprint` — `messages/components/VoiceFingerprint.tsx`

#### 6.1.1 What Priya sees

After Priya has sent 50+ messages on Miamo, a small badge appears in the
Messages header: "Your voice fingerprint is ready." Tapping it slides up
a bottom sheet from the bottom edge titled "Your voice fingerprint" with
a soft animated microphone and a Sparkles flourish. Below the headline:
five small stat tiles arranged in two rows.

- **Archetype.** One of four: writing hand wordsmith, microphone
  voice-first, camera visual, or lightning fast replier. Big icon,
  label below.
- **Median message length.** "27 words" with a copper underline.
- **Emoji rate.** "Every ~5 messages 🎉".
- **Top emoji.** A single large glyph (e.g. 😂).
- **lowercase-i habit.** A small bar showing the % of times she types `i`
  vs `I` ("you're a lowercase-i person, 71%").

A bottom CTA "Share to Instagram Story" pre-renders a portrait-aspect
visual she can post. Closing the sheet returns her to her chat list.

#### 6.1.2 What the code does

Module path: `services/web/src/app/(main)/messages/components/VoiceFingerprint.tsx`.

The component is a `Portal`-rendered bottom sheet (Framer Motion drag-
to-dismiss with a 60 px threshold). On open it calls:

```ts
api.getVoiceFingerprint()  // GET /api/v1/users/me/voice-fingerprint
```

The endpoint is feature-gated server-side by `FEATURE_VOICE_FINGERPRINT_ENABLED`.
When disabled, the endpoint returns 404; the component renders a soft
"keep messaging — your voice is forming" stub so the surface degrades
gracefully without explicit client-side flag-gating.

The shape returned by the server:

```ts
{
  archetype: 'wordsmith' | 'voice_first' | 'visual' | 'fast_replier';
  medianWords: number;
  emojiRate: number;       // 0..1
  topEmoji: string | null;
  lowercaseIRate: number;  // 0..1
  sampleSize: number;      // count of messages analyzed
  recomputedAt: string;    // ISO timestamp
}
```

Two telemetry events fire through `@/lib/track`:

- `voice_fingerprint.shown` on first open (deduped per session).
- `voice_fingerprint.shared` when the user taps "Share to Instagram Story".

The archetype enum values **mirror** `UserMoveProfile.archetype` in
`services/shared/prisma/schema.prisma` — comments in the file flag the
invariant so future schema changes must update both sides.

The "Share to Instagram Story" button uses the Web Share API
(`navigator.share({ files })`) when available with a generated 1080×1920
PNG, falling back to a `download` anchor when not.

### 6.2 `MoveV2Picker` — `messages/components/MoveV2Picker.tsx`

#### 6.2.1 What Arjun sees

Arjun has just matched with Riya. He opens the chat and sees the
compose box at the bottom. To the right of the text input there's a small
sparkle icon labeled "Suggest". Tapping it slides up a bottom sheet
with five chips:

> "saw the bansuri reel — what got you started?" (music hook)
> "right now your story says coffee + monsoon. game on." (fire hook)
> "we both saved that ghibli sketchbook on Sunday — yours?" (handshake hook)
> "if you had to teach me one phrase in your mother tongue..." (chat hook)
> "honest take: cricket or football for the weekend?" (question hook)

Each chip has a small icon (music note / fire / handshake / chat / question)
that hints at *why* this opener was suggested — a hook category. Tapping
any chip pre-fills the message input with the text; Arjun can edit before
sending. A "Refresh" link in the corner generates 5 new openers.

#### 6.2.2 What the code does

Module path: `services/web/src/app/(main)/messages/components/MoveV2Picker.tsx`.

Two endpoint paths:

- If the picker was opened from a Creativity item (`itemId` passed in
  props): `GET /api/v1/creativity/items/:id/move-suggestions-v2`. This is
  the v2 composer that ingests the sender's voice fingerprint, the
  receiver's resonance profile, and the creativity item context.
- Otherwise: `GET /api/v1/discover/move-suggestions/:targetId`. The v1
  composer — used when the picker is opened from a chat with no
  creativity context.

The v2 endpoint 404s when `FEATURE_MOVE_V2_ENABLED=0` and the picker
**silently falls back to v1**, so the client doesn't need to flag-gate.

Each chip carries metadata not shown to the user:

```ts
type Suggestion = {
  text: string;
  tone: string;
  slotIndex: number;       // 0..4 — which of the 5 ranked slots
  hookCategory: string;    // music | fire | handshake | chat | question | ...
  hookText?: string;       // optional human-readable hook annotation
  rightNowMatched?: boolean; // did the receiver's right-now context match?
};
```

On chip tap, the picker:
1. Pre-fills the compose input via the `onPick(text)` callback.
2. Calls `useTrackMoveAccepted` with `{ targetId, slot, tone, hookCategory }`.
3. Fires `track('move.suggestion_accepted_v2', { tid, slot, hook, rightNow })`.
4. Closes the sheet.

The bandit on the server uses (slot, hook, tone) as the action vector and
match-or-reply rate as the reward, so every accepted suggestion feeds the
ranking that produced it.

The hook category to chip icon mapping is authored in
`services/shared/src/algo/v8/moveV2/hookLibrary.ts`; the picker's
`HOOK_BADGE` map mirrors that enum. Comments flag the invariant.

### 6.3 `FamilyBrief` — `dtm/components/FamilyBrief.tsx`

#### 6.3.1 What Priya sees (DTM mode)

Priya is on the DTM (Date-to-Marry) workspace. Her parents have asked for
her "bio data" — a one-page summary they can share on the matrimonial
network. She taps "Family Brief" in the DTM sidebar. A bottom sheet
slides up titled "One-tap bio data for your family". Three format chips:

- **Image** — "for WhatsApp" (default; tile is pre-highlighted)
- **PDF** — "printable"
- **Text** — "paste anywhere"

After she picks one and taps "Generate", a 1.5-second progress shimmer
appears and a preview thumbnail materializes. Two action buttons appear:
"Share to WhatsApp" (opens `wa.me/?text=<url>`) and "Copy link" (drops a
copy of the share token URL on her clipboard with a brief "Copied!" toast).
The note "Link expires in 7 days" sits at the bottom.

#### 6.3.2 What the code does

Module path: `services/web/src/app/(main)/dtm/components/FamilyBrief.tsx`.

Renders via `Portal` so it stacks above the DTM workspace sidebar. State:
selected `format` (`'image' | 'pdf' | 'text'`, defaulting to `'image'`),
`generating`, `result?: { token, url, expiresAt, note? }`, `copied`.

On generate:

```ts
const { data } = await api.generateFamilyBrief({ format });
// POST /api/v1/dtm/family-brief
```

The server returns:

```ts
{
  token: string;
  url: string;        // full https URL with token
  expiresAt: string;  // ISO timestamp (7 days from now by default)
  note?: string;      // optional human-readable note
}
```

Server emits `family_brief.generated` on successful POST. The client
mirrors this with `family_brief.shared` (via `useTrackActivity`) when the
user *actually* shares or copies (not on generate — generation is not the
intent signal we care about).

"Share to WhatsApp" builds `https://wa.me/?text=<encoded url>` and opens
it via `window.open` so iOS / Android resolve to the WhatsApp app.
"Copy link" uses `navigator.clipboard.writeText(url)` with a fallback
text-area for older browsers. Both flows fire the `family_brief.shared`
event with `via: 'whatsapp' | 'clipboard'`.

ESC, overlay click, and the X button all dismiss the sheet (standard
Miamo bottom-sheet pattern, mirroring the Discover PassFeedbackModal and
the Creativity MoveModal).

### 6.4 `WhyCard` — `discover/components/WhyCard.tsx`

#### 6.4.1 What Karan sees

Karan is on a Discover card and notices a small "Why am I seeing this?"
button below the photo strip. Tapping it pops up a calm explainer card
floating just above the action buttons:

> **Why am I seeing this?**
> **Shared interests** — three stars
> **Vibe overlap** — two stars
> **Mutual signals** — one star
>
> [helpful] [not useful]

Three lines, each with an emoji ingredient label and a 1-to-3 star
contribution rating. Below: a two-thumb feedback row so he can tell
Miamo the explainer was unhelpful (which routes into the negative-signal
loop).

#### 6.4.2 What the code does

Module path: `services/web/src/app/(main)/discover/components/WhyCard.tsx`.

Fetches:

```ts
GET /api/v1/discover/:targetId/why
// via api.getDiscoverWhy(targetId)
```

When `FEATURE_DISCOVER_WHY_ENABLED=0` the endpoint 404s and the API
helper resolves to `null`; the trigger button is hidden in that case so
no empty popover ever renders.

Server returns a list of contributing ingredients with a `contribution`
percentage. The card renders the top 3. The star math (matches server-
side rationale, but the component will derive locally if the server omits
the `stars` field):

```
contribution >= 30% of top-3 total -> three stars
contribution 15-30%                 -> two stars
contribution < 15%                  -> one star
```

Ingredient names map to emoji icons covering both the v6/v8 ranking-system
names already in use server-side (`recencyFreshness`, `intentFitRightNow`,
`earnedVisibility`, `fairnessFloor`, `relevance`) *and* the 11 v3.6.0
ingredient names spec'd for the new ranker (`interests`, `vibe`,
`behaviour`, `reciprocal`, `attention`, `hesitation`, ...). Unknown keys
fall back to a sparkle icon.

Telemetry:

- `discover_why.shown` on open (deduped per target per session).
- `discover_why.feedback` with `{ tid, helpful: boolean }` on the thumb
  buttons. "Not useful" also calls `api.trackActivity('why_unhelpful',
  'profile', targetId)` so the negative-signal engine reweights.

### 6.5 `WeeklyTop10` — `discover/components/WeeklyTop10.tsx`

#### 6.5.1 What Riya sees

Riya checks Discover on Sunday evening. A new section above the main card
deck shows "**Week 26 · 2026**" with a calendar icon, an explainer line
("Your top 10 candidates this week — based on signals across all of
Miamo"), and a horizontal stack of 10 portrait cards. Each card shows:

- A rank ribbon (1, 2, 3, ...).
- A photo.
- The user's display name and age.
- A star icon on the top-right hinting at "weekly highlight".

Tapping any card navigates her to that user's profile view
(`/profile?id=...`). If she taps "See all", she's taken to a full grid
view.

#### 6.5.2 What the code does

Module path: `services/web/src/app/(main)/discover/components/WeeklyTop10.tsx`.

```ts
GET /api/v1/weekly-top
// via api.getWeeklyTop()
```

Server is flag-gated by `FEATURE_WEEKLY_TOP_ENABLED`. When off, the API
returns 404, the helper resolves to `null`, and the component renders
nothing (parent decides whether to hide the surface entirely).

When the flag is on but the user has no rows yet (e.g. it's Monday and
the weekly batch hasn't run for them), the response carries an empty
`data: []` and the component renders a soft "your Top 10 will be ready
soon" stub.

Shape:

```ts
type WeeklyTopRow = {
  rank: number;
  targetHash: string;
  user: {
    id: string;
    displayName: string;
    photo: string | null;
    age: number | null;
    city: string | null;
  } | null;  // null if the row hasn't dereferenced yet
};

type WeeklyTopPayload = {
  data: WeeklyTopRow[];
  weekIso: string;           // "2026W26"
  generatedAt: string | null;
};
```

The `weekIso` is parsed by `formatWeekIso()` ("2026W26" -> "Week 26 · 2026").
The component memoizes the parsed week label so the parse cost only fires
when the ISO string changes.

Tap navigation goes through `useRouter().push('/profile?id=<userId>')`.
Each card-tap fires `track('weekly_top.opened', { rank, week })`.

### 6.6 Settings "Personalization & Privacy" section

#### 6.6.1 What Arjun sees

Arjun opens Settings → Privacy & Visibility. Below the existing controls
(profile visibility, online status, last-seen, read receipts) a new
section header reads "**Personalization & Privacy** · v3.6.0". Five
toggles live underneath:

- **Voice fingerprint** — "Let Miamo analyze your messaging style to
  improve openers. Stored locally on our servers; never shared."
- **Move suggestions v2** — "Show smart 5-chip openers based on your
  voice + your match's profile."
- **Why am I seeing this** — "Show the 'Why' card on Discover candidates."
- **Weekly Top 10** — "Show your weekly top-10 highlights on Discover."
- **Family Brief** (DTM only) — "Enable the parent-shareable bio data
  generator in DTM."

Each toggle is a `Segmented<boolean>` pair (On / Off) with a soft
explainer paragraph beneath. A "Saved" pulse banner flashes when any
toggle changes.

#### 6.6.2 What the code does

Lives inside `services/web/src/app/(main)/settings/page.tsx` under the
existing 12-section left rail (Privacy & Visibility section). The toggles
mirror server-side feature flags via:

```ts
api.updatePrivacy({
  voiceFingerprintEnabled: boolean;
  moveV2Enabled: boolean;
  discoverWhyEnabled: boolean;
  weeklyTopEnabled: boolean;
  familyBriefEnabled: boolean;
})
```

When a toggle flips, the change is **optimistic**: the local toggle state
updates immediately, the API call runs in the background, and on failure
we roll back and show a small error toast. Each toggle is also mirrored
to the `local` prefs object persisted under
`localStorage["miamo-local-prefs-v1"]` so the UI can stay in sync across
tabs.

The five flags also short-circuit the trigger buttons in the live
surfaces: e.g. when `voiceFingerprintEnabled` is `false`, the Messages
header doesn't show the "Your voice fingerprint is ready" badge even if
the server still reports `sampleSize >= 50`. This is a defense-in-depth
move so a user who turned off a feature still sees that decision honored
even if the server takes a few minutes to propagate.

---

## 7. Design system primitives

The design system lives at `services/web/src/components/ui/`. Each
primitive is a small, composable component with the Miamo brand baked
into its default props. None of them carry business logic.

### 7.1 The primitives (alphabetical)

| File | Component(s) | What it is |
|---|---|---|
| `button.tsx` | `Button`, `IconButton` | Brand-styled buttons with size (`sm | md | lg`), variant (`primary | secondary | ghost | danger`), and loading state |
| `error-boundary.tsx` | `ErrorBoundary` | Class-based React error boundary with brand-aligned fallback card and "Try again" CTA |
| `index.tsx` | `Avatar`, `ScoreRing`, `CompatibilityRing`, `Badge`, `Pill`, `Divider`, `Segmented<T>`, `Field`, `Select`, `Textarea`, `StepIndicator`, `Toast`, ... | Shared exports — most small primitives live in this barrel file |
| `input.tsx` | `Input`, `SearchInput`, `OtpDigit` | Input primitives with focus-ring + leading/trailing icon support |
| `miamo-logo.tsx` | `MiamoCompactIcon`, `MiamoWordmark`, `AnimatedMiamoLogo` | The brand logo in three forms — compact icon for mobile header, full wordmark for sidebar brand block, animated logo for loading state |
| `modal.tsx` | `Modal`, `BottomSheet`, `ConfirmDialog` | Modal primitives. `Modal` is a centered overlay; `BottomSheet` is a slide-from-bottom (used by all v3.6.0 bottom sheets); `ConfirmDialog` is a tight Yes/No card |
| `portal.tsx` | `Portal` | React portal that mounts children to `document.body` (used by every modal/bottom-sheet/tooltip to escape stacking-context traps) |
| `skeleton.tsx` | `Skeleton`, `SkeletonText`, `SkeletonAvatar`, `SkeletonCard` | Loading skeletons with a soft shimmer animation |
| `toast.tsx` | `ToastProvider`, `useToast`, `Toast` | The toast system. `useToast()` returns `{ toast(message, opts?) }`. Toasts auto-dismiss after 3s by default. |

Brand colours are defined as Tailwind theme tokens in `tailwind.config.ts`:
the primary copper (`#C97856`, `text-rose`/`bg-rose-main`) and the soft
rose (`#FCE4DC`, `bg-rose-soft`) appear throughout. Brand font is loaded
via `next/font/google` in the root layout.

### 7.2 The non-primitive but reusable components

These live one directory up at `services/web/src/components/`:

- `AuthOptions.tsx` — sign-in-with-google/apple/email card.
- `CityAutocomplete.tsx` — city picker backed by `searchCities` + browser
  geolocation. Used by `/onboarding`, `/profile`, `/serious-mode`.
- `ConsentBanner.tsx` — GDPR/cookie consent banner mounted in `<Providers>`.
- `FieldIcon.tsx` — small per-field icon (avatar, photo, MapPin, etc.)
  used in the Onboarding bucket cards.
- `IconChipMulti.tsx` — multi-select chip group.
- `IconOptionGrid.tsx` — single-select icon grid used for Mood/Energy/Vibe
  pickers in Onboarding and Vibe Check.
- `MediaPicker.tsx` — file picker with compression (`compressImage`,
  `compressVideo` from `media-utils`) and a preview lightbox.
- `NumberStepper.tsx` — +/- stepper for height, age, count fields.
- `OtpInput.tsx` — six-digit OTP input with auto-advance and paste support.
- `PhoneInput.tsx` — phone-number input with country-code picker.
- `providers.tsx` — root provider that mounts `ToastProvider`,
  `ConsentBanner`, and the global `ErrorBoundary`.
- `deferred/` — components for the deferred-pile UI (Discover Saved-for-
  later, DTM See-later).
- `legal/` — legal modal content (Terms, Privacy, Community Guidelines).

---

## 8. Build, dev, and tooling

### 8.1 Dev

```bash
cd services/web
npm install
npm run dev   # next dev — port 3100
```

The dev server proxies API calls through `lib/api.ts` to the API gateway
(typically `http://localhost:3000` per the monorepo's `scripts/start.sh`).
The `(main)/layout.tsx` will redirect to `/login` if the gateway is
unreachable (because `getMe()` fails with 401-equivalent). To skip that
during local dev, you can start with a known-good session by signing in
once and keeping the localStorage `miamo-auth` key around.

### 8.2 Build + start

```bash
cd services/web
npm run build
npm run start   # next start — port 3100
```

Build pipeline: TypeScript type-check → Next.js compile → Tailwind purge.
The build emits a standalone `.next/` directory served by `next start`.
For deployment to Vercel/Netlify, the same build artefacts are picked up
by the platform's adapter.

### 8.3 Linting + typing

The web app participates in the monorepo's `typecheck.mjs` orchestration.
From the repo root:

```bash
node scripts/typecheck.mjs services/web
npm run -w services/web lint
```

Vitest is used for unit tests where applicable; component tests live
alongside their components as `<Component>.test.tsx`. See `tests/` at
the repo root for cross-service tests.

### 8.4 Environment variables

The frontend reads a small set of `NEXT_PUBLIC_*` env vars at build /
runtime:

- `NEXT_PUBLIC_API_URL` — gateway base URL (defaults to `http://localhost:3000`).
- `NEXT_PUBLIC_SITE_URL` — canonical site URL (used by `robots.ts` and
  `sitemap.ts`).
- `NEXT_PUBLIC_TRACKING_ENABLED` — `'1'` to enable the v3.1 tracking
  pipeline (off by default; consent banner must also be accepted).

---

## 9. Cross-cutting conventions

### 9.1 Auth flow

Access token in-memory only via `useAuthStore.token`; refresh token in
`httpOnly miamo_rt` cookie (sent via `credentials: 'include'`). Legacy
`miamo_token` / `miamo_refresh_token` in localStorage are migrated once
and removed (the store imperatively `localStorage.removeItem`s them on
every auth mutation).

When the API returns 401, the `lib/api.ts` client coalesces concurrent
401s through a singleton `tryRefresh()` promise so a burst of parallel
requests only triggers a single refresh. When the API returns 403 with
`code: 'ONBOARDING_INCOMPLETE'`, the client triggers a hard navigation
to `/onboarding`.

### 9.2 Tracking pipeline

Every legacy `useTrackActivity` event is bridged through
`track('legacy.<action>', ...)` to the v3.1 tracking pipeline. The
pipeline is a no-op until `NEXT_PUBLIC_TRACKING_ENABLED=1` and consent
has been granted. A per-tab session id (`s_<ts>_<rand>`) is stamped on
every event. Events are batched in groups of 8 or after 3 s of idle,
flushed on `beforeunload` + `visibilitychange → hidden`.

### 9.3 Persistent state convention

`usePersistentState('<page>:<key>', default)` is the canonical pattern.
Two exceptions live outside this scheme:

- `localStorage["miamo-nav-more-open"]` — layout's "More" section state.
- `localStorage["miamo-local-prefs-v1"]` — Settings page's local prefs
  bag (font size, motion, chat bubble style, ~25 other prefs).

Plus the two persisted Zustand stores (`miamo-auth`, `miamo-theme`).

### 9.4 Caching convention

`useCachedResource('<key>', fetcher, { freshFor?, maxAge? })` for stale-
while-revalidate with per-user namespacing
(`miamo:cache:v1:<userId>:<key>`). Cache invalidation by string-prefix
sweep is used by the Creativity composer to flush the feed cache after
publishing.

### 9.5 Scroll restore

`useScrollRestore(id, getContainer)` is currently wired in Creativity.
Other surfaces rely on the layout's `AnimatePresence` page transition
without explicit scroll memory.

### 9.6 Error boundaries

Three layers:

1. **Root segment.** `services/web/src/app/error.tsx` — catches anything
   that escapes the per-page boundaries.
2. **Layout.** `(main)/layout.tsx` wraps `{children}` in
   `<ErrorBoundary>` from `@/components/ui/error-boundary`.
3. **Page-level.** Most pages additionally wrap heavy subtrees in their
   own `<ErrorBoundary>`. Beats and Messages each ship bespoke
   class-based boundaries with custom fallback UIs (the Messages one
   shows a "Tap to refresh" link, the Beats one shows the stats cards
   without the chat view).

### 9.7 SSE event taxonomy

Singleton `EventSource` carries: `new-message`, `message-sent`,
`new-notification`, `beat-update`, `chat-update`, `beat-viewed`,
`beat-saved`, `beat-unsaved`, `beat-screenshot`, `beat-downloaded`.
Reconnect with exp-backoff + jitter capped at 30 s; attempt counter
resets on `onopen`. Layout subscribes to `new-message`, `new-notification`;
the Beats and Messages pages subscribe to the beat-* and chat-* events
respectively.

### 9.8 Page transitions

`AnimatePresence mode="wait"` in the layout with `opacity + y + filter:
blur` per page. `/messages`, `/beats`, `/videos` opt out (they own their
full-height scroll containers). `/serious-mode` uses a plain
`overflow-y-auto` wrapper.

### 9.9 Safe area

Mobile bottom nav uses `env(safe-area-inset-bottom)` for iOS notch and
Android gesture-pill clearance.

### 9.10 Feature flag pattern

The v3.6.0 components all follow the same gating pattern:

1. The endpoint is feature-gated **server-side** by an env flag
   (`FEATURE_VOICE_FINGERPRINT_ENABLED`, `FEATURE_MOVE_V2_ENABLED`,
   `FEATURE_DISCOVER_WHY_ENABLED`, `FEATURE_WEEKLY_TOP_ENABLED`,
   `FEATURE_FAMILY_BRIEF_ENABLED`).
2. When disabled, the endpoint returns 404.
3. The `lib/api.ts` helper for that endpoint catches the 404 and resolves
   to `null` (not an error).
4. The component sees `null`, returns `null` from its render (or shows a
   soft stub), and the trigger button is hidden.
5. The Settings → Personalization & Privacy section also exposes a
   user-level toggle so an authenticated user can disable an enabled
   feature for themselves.

This means **the client never needs to flag-gate explicitly**. New
features can be turned on globally by flipping a single server env var,
and turned off per-user via Settings.

---

## 10. File-system map (the quick-glance)

```
services/web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── (main)/
│   │   │   ├── layout.tsx                ← the shell
│   │   │   ├── loading.tsx
│   │   │   ├── access/page.tsx
│   │   │   ├── ai-match/page.tsx
│   │   │   ├── beats/page.tsx
│   │   │   ├── compatibility/page.tsx
│   │   │   ├── creativity/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   │       ├── EarnDrawer.tsx
│   │   │   │       ├── MoveModal.tsx
│   │   │   │       ├── ReelsView.tsx
│   │   │   │       ├── ShowcaseComposer.tsx
│   │   │   │       ├── SpotlightUI.tsx
│   │   │   │       └── TalentCard.tsx
│   │   │   ├── date-ideas/page.tsx
│   │   │   ├── date-planner/page.tsx
│   │   │   ├── discover/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   └── components/
│   │   │   │       ├── AiSidePanel.tsx
│   │   │   │       ├── DiscoverFilterModal.tsx
│   │   │   │       ├── FilterPanel.tsx
│   │   │   │       ├── ProfileCard.tsx
│   │   │   │       ├── ShortcutBar.tsx
│   │   │   │       ├── WeeklyTop10.tsx   ← v3.6.0
│   │   │   │       ├── WhyCard.tsx        ← v3.6.0
│   │   │   │       └── constants.ts
│   │   │   ├── dtm/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   │       └── FamilyBrief.tsx   ← v3.6.0
│   │   │   ├── feed/page.tsx
│   │   │   ├── love-language/page.tsx
│   │   │   ├── matches/page.tsx
│   │   │   ├── messages/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   └── components/
│   │   │   │       ├── ChatListItem.tsx
│   │   │   │       ├── ChatView.tsx
│   │   │   │       ├── MessageBubble.tsx
│   │   │   │       ├── MessagesFeedbackModal.tsx
│   │   │   │       ├── MoveV2Picker.tsx       ← v3.6.0
│   │   │   │       ├── VoiceFingerprint.tsx   ← v3.6.0
│   │   │   │       └── constants.ts
│   │   │   ├── notifications/page.tsx
│   │   │   ├── onboarding/page.tsx
│   │   │   ├── premium/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   ├── safety/page.tsx
│   │   │   ├── search/page.tsx
│   │   │   ├── serious-mode/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── showcase/page.tsx
│   │   │   ├── stories/page.tsx
│   │   │   ├── verify/page.tsx
│   │   │   ├── vibe-check/page.tsx
│   │   │   └── videos/page.tsx
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   ├── manifest.ts
│   │   └── layout.tsx                    ← root layout (fonts, global CSS, Providers)
│   ├── components/
│   │   ├── ui/                           ← design system primitives
│   │   │   ├── button.tsx
│   │   │   ├── error-boundary.tsx
│   │   │   ├── index.tsx
│   │   │   ├── input.tsx
│   │   │   ├── miamo-logo.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── portal.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── toast.tsx
│   │   ├── deferred/                     ← deferred-pile UI
│   │   ├── legal/                        ← legal modal content
│   │   ├── providers.tsx
│   │   ├── AuthOptions.tsx
│   │   ├── CityAutocomplete.tsx
│   │   ├── ConsentBanner.tsx
│   │   ├── FieldIcon.tsx
│   │   ├── IconChipMulti.tsx
│   │   ├── IconOptionGrid.tsx
│   │   ├── MediaPicker.tsx
│   │   ├── NumberStepper.tsx
│   │   ├── OtpInput.tsx
│   │   └── PhoneInput.tsx
│   ├── hooks/
│   │   ├── useCachedResource.ts
│   │   ├── usePerformance.ts             ← useDebounce + small helpers
│   │   ├── usePersistentState.ts
│   │   ├── useSSE.ts
│   │   ├── useScrollRestore.ts
│   │   └── useTrackActivity.ts           ← the tracking suite
│   ├── stores/
│   │   └── index.ts                      ← useAuthStore + useThemeStore + useDiscoveryStore
│   └── lib/
│       ├── api.ts                        ← typed API client
│       ├── constants.ts                  ← NAV_MAIN, NAV_SECONDARY, profile options
│       ├── logError.ts
│       ├── media-utils.ts                ← compressImage, compressVideo
│       ├── profileOptions.ts
│       ├── types.ts
│       ├── utils.ts                      ← cn(), etc.
│       └── track/                        ← v3.1 batched event pipeline
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 11. Worked example: tracing a Move v2 suggestion end-to-end

To make the layering concrete, let's trace what happens when Arjun taps
the Suggest button next to his compose box in his chat with Riya, then
taps a chip, then sends the message.

### 11.1 What Arjun sees

1. He opens his chat with Riya. The chat is loaded by `ChatView` which is
   rendered inside `messages/page.tsx`.
2. He taps the Suggest button. A bottom sheet rises from the bottom of
   the screen with 5 chips and small icons indicating hook category.
3. He taps the second chip: "right now your story says coffee + monsoon.
   game on." The sheet fades out and the text appears in his compose
   input. Cursor at the end.
4. He edits the punctuation, hits Send. The message appears in his
   message thread instantly with a "sending..." indicator that resolves
   to a delivered tick within ~200 ms.

### 11.2 What the code does

Layer by layer:

**Layer 1 — Trigger.** `MoveV2Picker` is mounted inside `ChatView` next to
the compose input. Tapping the Suggest button flips `pickerOpen` state and
triggers the `useEffect` that fetches suggestions.

**Layer 2 — API.** The picker calls one of:

- `api.getMoveSuggestionsV2(itemId)` if a creativity item is in scope.
- `api.getMoveSuggestions(targetId)` otherwise (v1 fallback).

`lib/api.ts` wraps `fetch(...)` with auth, error coalescing, and 401
refresh. The 404 case (feature flag off) is caught and resolves to
`{ data: null }`.

**Layer 3 — Render.** With suggestions in state, the picker renders 5
`motion.button` chips. Each chip's `onClick` calls `onPick(text)` from
the parent.

**Layer 4 — Compose input pre-fill.** `ChatView` receives `onPick(text)`
and dispatches it to its `useReducer` compose state. The compose input
re-renders with the new value. Focus is moved to the input with cursor
at the end (`input.setSelectionRange(text.length, text.length)`).

**Layer 5 — Tracking.** The picker calls `useTrackMoveAccepted` with
`{ targetId, slot: 1, tone, hookCategory }`. This:
- Calls `api.trackActivity('move_accepted', 'profile', targetId,
  { slot, tone, hookCategory })`.
- Calls `track('move.suggestion_accepted_v2', { tid: targetId, slot, hook,
  rightNow })` which buffers into the v3.1 batched pipeline.

**Layer 6 — Send.** Arjun's tap on Send calls `api.sendMessage({ chatId,
text, sourceMoveSlot: 1 })`. The `sourceMoveSlot` field flows server-side
so the bandit can compute reward (was the message actually sent? did Riya
reply?). Optimistic UI shows the message in the thread immediately; the
real message id is reconciled when the API call resolves.

**Layer 7 — Layout SSE.** When Riya's app receives the message, her
gateway publishes a `new-message` SSE event. The `useSSE('new-message',
...)` subscription in `(main)/layout.tsx` calls `refreshUnread()` and
optionally shows a top-right toast if she's not on `/messages`. The same
event is also caught by her `messages/page.tsx` which calls `loadChats()`
to refresh her chat list ordering.

Every layer is hot-swappable: the picker can switch between v1 and v2
endpoints without UI changes; the tracking events can be toggled by
consent; the SSE event taxonomy is plain JSON with no schema lock. This
loose coupling is the explicit design goal of the Miamo frontend — every
v3.6.0 feature ships behind a flag, every flag has a Settings toggle,
every endpoint has a 404 fallback, and every component degrades into a
soft stub rather than throwing.

---

## 12. Glossary

- **(main)** — Next.js route group that contains every authenticated
  route. URL stays clean (`/discover`, not `/main/discover`).
- **bottom sheet** — modal that slides up from the bottom of the screen.
  The canonical Miamo modal pattern for primary actions. Implemented in
  `components/ui/modal.tsx`.
- **bucket card** — the expandable card on `/onboarding` that represents
  one cluster of profile fields (identity, city, photos, etc.).
- **completion gate** — the layout-level effect that bounces users to
  `/onboarding` when `getCompletion().score < threshold`, with exempt
  paths for time-sensitive surfaces.
- **DTM** — Date to Marry. The matrimonial mode of Miamo, accessible at
  `/serious-mode` with a dedicated workspace.
- **fingerprint** — the statistical voice profile (median message length,
  emoji rate, top emoji, lowercase-i habit, archetype) computed from a
  user's sent-message history. Surfaced by `VoiceFingerprint` in v3.6.0.
- **hook category** — a small enum (music, fire, handshake, chat,
  question) that labels *why* a Move v2 suggestion was generated. Used
  for ranking transparency.
- **layout shell** — the sidebar + header + mobile-nav chrome rendered
  by `(main)/layout.tsx`. Shared across all 26 authenticated routes.
- **MoveV2** — the v3.6.0 5-chip composer helper. Server-side, the
  ranker uses sender voice fingerprint × receiver resonance × hook
  strength to rank 5 openers.
- **NAV_MAIN / NAV_SECONDARY** — two arrays defined in
  `lib/constants.ts` that drive the sidebar nav. `NAV_MAIN` is always
  visible, `NAV_SECONDARY` lives under the collapsible "More" header.
- **page-view** — the `track('page_view', { route })` event fired by
  every route on mount via `useTrackPageView`.
- **persist hydration** — Zustand's async restore from localStorage on
  page load. The layout waits for hydration before rendering chrome.
- **PortalRender** — pattern of rendering a component to `document.body`
  via React portals so it escapes any parent stacking context. Used by
  every modal / bottom sheet / tooltip.
- **right-now context** — the optional `rightNowMatched` flag on Move v2
  suggestions, set when the suggestion ingested the receiver's
  current-status signal (e.g. recent story, recent profile edit).
- **route group** — the Next.js App Router feature `(folder)` that
  groups routes without affecting the URL. We use two: `(auth)` and
  `(main)`.
- **scroll restore** — the `useScrollRestore` pattern that remembers a
  container's scroll position across SPA navigations.
- **Spotlight ledger** — the v3.5 Creativity economy backing-store that
  tracks user balance, milestone progress, and bonus payouts. Surfaced
  in the Creativity hero via `useSpotlight()`.
- **SSE** — Server-Sent Events. A singleton `EventSource` connection
  managed by `useSSEConnection` carries 10 event types.
- **stale-while-revalidate** — the caching pattern used by
  `useCachedResource`: return cached value immediately, refetch in the
  background, swap when ready.
- **track** — the v3.1 batched event pipeline (`lib/track/`). Batches in
  groups of 8 or 3-second windows, flushes on page hide.
- **usePersistentState** — the canonical `useState` replacement that
  mirrors to localStorage with a `'<page>:<key>'` naming convention.
- **WhyCard** — the v3.6.0 Discover popover that shows the top-3
  contributing ingredients behind a candidate's ranking, as a 1-to-3
  star rating per ingredient.

---

## 13. Common pitfalls (and how to avoid them)

### 13.1 Don't call hooks above the auth gate

`(main)/layout.tsx` returns the "Loading…" spinner when `!hydrated ||
!isAuthenticated`. Pages mounted under it can assume `isAuthenticated ===
true` and a populated `user`. But: components imported by the layout
itself (e.g. `useSSE`) must tolerate the brief window where the user
hasn't hydrated yet. The convention is to pass the `enabled` flag
explicitly: `useSSE('new-message', handler, isAuthenticated)`.

### 13.2 Don't store tokens in localStorage

The auth store's `partialize` deliberately omits `token` and
`refreshToken`. Don't add them back. The access token must live in
memory only; the refresh token must live in the `httpOnly miamo_rt`
cookie. The legacy localStorage keys `miamo_token` /
`miamo_refresh_token` are explicitly removed on every auth mutation.

### 13.3 Don't bypass the (main) layout's onboarding gate

The 6 exempt paths are deliberate. Adding a new route that should be
accessible to incomplete profiles must either: (a) be added to the
exempt list in `(main)/layout.tsx`, or (b) live outside `(main)/`
entirely. Don't add a per-page short-circuit; that creates inconsistent
behavior across routes.

### 13.4 Don't forget `'use client'`

Every page under `(main)/` is a client component. Even pages that look
like they could be SSR-only (e.g. `/premium`'s static plan cards) need
`'use client'` because they call `useTrackPageView` and other client-
only hooks. The first line of every page file should be
`'use client';`.

### 13.5 Persistent state keys must be unique

`usePersistentState` keys live in a single global localStorage namespace.
A duplicate key across two routes will silently share state. The
convention `'<page>:<key>'` is what keeps the namespace flat. When
adding a new key, grep for it across `services/web/src/` first.

### 13.6 Cached resources are per-user

`useCachedResource` namespaces by `userId`. But: until
`useAuthStore.persist.onFinishHydration` fires, `userId` is `null`.
The hook gracefully handles this by deferring its read until hydration
completes. Just don't pass a hardcoded `userId` to bypass this — it
breaks the per-user isolation.

### 13.7 SSE is singleton

There is exactly one `EventSource` per tab. `useSSEConnection` is
called once in the layout. `useSSE` subscribes to a single event on
that connection. Don't try to open a second `EventSource` from a
component — the gateway's per-user concurrent-connection limit will
kick you out.

### 13.8 Feature flags degrade soft

When a feature is off server-side, the endpoint returns 404 and the
API helper returns `null`. The component should render `null` (or a
soft stub). It should **not** throw, log a warning, or show an error.
If you find yourself adding a `try/catch` around an `api.foo()` call
to handle the off-case, that's a smell — fix the helper to return
`null` on 404 instead.

### 13.9 Mobile nav has 4 + 1 slots

The mobile bottom nav shows the first 4 entries of `NAV_MAIN` plus a
"More" link. Adding a new primary nav item means displacing one of the
existing four. Don't try to fit 5 — the safe-area-aware layout starts
breaking visually past 4 items on small viewports.

### 13.10 Page transitions can fight scroll containers

`AnimatePresence mode="wait"` works beautifully for pages that fit
inside the layout's scroll container. It breaks for pages that own
their own full-height scroll (Messages, Beats, Videos). That's why
those three are explicitly opted out in `(main)/layout.tsx`. When
adding a new full-height surface, add it to the opt-out list.

---

## 14. Migrations from v3.5 to v3.6.0

For anyone upgrading a fork or carrying local patches, here is the
diff at a high level:

### 14.1 New files

```
services/web/src/app/(main)/messages/components/VoiceFingerprint.tsx
services/web/src/app/(main)/messages/components/MoveV2Picker.tsx
services/web/src/app/(main)/dtm/components/FamilyBrief.tsx
services/web/src/app/(main)/discover/components/WhyCard.tsx
services/web/src/app/(main)/discover/components/WeeklyTop10.tsx
```

### 14.2 Modified files

```
services/web/src/app/(main)/layout.tsx          (no API change, minor render polish)
services/web/src/app/(main)/discover/page.tsx   (WhyCard trigger + WeeklyTop10 mount)
services/web/src/app/(main)/messages/components/ChatView.tsx  (MoveV2Picker mount + VoiceFingerprint trigger)
services/web/src/app/(main)/dtm/page.tsx        (FamilyBrief mount in DTM sidebar)
services/web/src/app/(main)/settings/page.tsx   (Personalization & Privacy section)
services/web/src/lib/api.ts                     (5 new endpoints: voice-fingerprint, move-suggestions-v2, discover-why, weekly-top, family-brief)
services/web/src/hooks/useTrackActivity.ts      (new hooks: useTrackMoveAccepted, useTrackMoveComposed)
```

### 14.3 New endpoints (consumed)

```
GET  /api/v1/users/me/voice-fingerprint
GET  /api/v1/creativity/items/:id/move-suggestions-v2
GET  /api/v1/discover/:targetId/why
GET  /api/v1/weekly-top
POST /api/v1/dtm/family-brief
```

All five are flag-gated server-side and return 404 when their flag is
off. `api.ts` catches the 404 and resolves to `null`.

### 14.4 New telemetry events

```
voice_fingerprint.shown
voice_fingerprint.shared
move.suggestion_accepted_v2
discover_why.shown
discover_why.feedback
weekly_top.opened
family_brief.shared        (mirrors server-side family_brief.generated)
```

All flow through the existing v3.1 batched pipeline. No new pipeline
infrastructure was added.

### 14.5 No breaking changes

v3.6.0 is purely additive on the frontend. No existing components were
removed, no existing routes changed shape, no existing API endpoints
were modified. A v3.5 client running against a v3.6.0 server will
continue to work exactly as before (it just won't see the new
surfaces).

---

## 15. Reference: the auth + main route trees

For a complete view, here are both groups of routes:

### 15.1 `(auth)` routes (public, no auth required)

| Path | File | Purpose |
|---|---|---|
| `/login` | `(auth)/login/page.tsx` | Sign in (email + password, OTP, OAuth) |
| `/register` | `(auth)/register/page.tsx` | Create account |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | Request password reset |
| `/reset-password` | `(auth)/reset-password/page.tsx` | Reset with token from email |

### 15.2 `(main)` routes (auth-gated, all 26)

Listed in §3 above. Restated here for index purposes:

`/access`, `/ai-match`, `/beats`, `/compatibility`, `/creativity`,
`/date-ideas`, `/date-planner`, `/discover`, `/dtm`, `/feed`,
`/love-language`, `/matches`, `/messages`, `/notifications`,
`/onboarding`, `/premium`, `/profile`, `/safety`, `/search`,
`/serious-mode`, `/settings`, `/showcase`, `/stories`, `/verify`,
`/vibe-check`, `/videos`.

---

## 16. Last words

The Miamo frontend is opinionated:

- **One layout, 26 routes.** Every authenticated surface shares the same
  shell. Adding a new surface means a new file in `(main)/`, not a new
  layout.
- **Client-state-heavy.** Every page is `'use client'`. Persistent state
  lives in `usePersistentState`. Real-time state lives in `useSSE`.
- **Feature flags are server-side.** The client never gates a feature
  by flag; it just handles `null` from the API gracefully.
- **Brand stays consistent.** Colours, fonts, spacing, animation curves
  come from the design system primitives — no per-page CSS overrides.
- **Telemetry is opt-in.** Every event flows through `lib/track`, which
  no-ops until consent + env flag both say yes.

When you next add a v3.7.0 feature, follow the same playbook:

1. Component lives in `<route>/components/<Name>.tsx`.
2. Endpoint is feature-gated server-side; helper returns `null` on 404.
3. Trigger button is hidden when the helper returns `null`.
4. Settings → Personalization & Privacy gets a new toggle.
5. Two new telemetry events: `<feature>.shown` and `<feature>.<action>`.
6. Update this document.

That repeatable pattern is why v3.6.0 added 5 new surfaces with zero
breaking changes. Keep it intact.

— end —
