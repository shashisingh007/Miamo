# Frontend (services/web)

Next.js 14 App Router on port `3100`. Production builds use `output: 'standalone'` for slim Docker images.

## 1. Layout

```
services/web/src/
├── app/
│   ├── layout.tsx                  # root: fonts, Providers, ConsentBanner
│   ├── page.tsx                    # landing
│   ├── (auth)/                     # route group: unauthenticated
│   │   ├── layout.tsx              # rose-bloom bg, no sidebar
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/                     # route group: authenticated
│   │   ├── layout.tsx              # sidebar + header + SSE
│   │   ├── discover/page.tsx
│   │   ├── matches/page.tsx
│   │   ├── messages/page.tsx
│   │   ├── beats/ stories/ feed/ creativity/ videos/
│   │   ├── ai-match/ compatibility/ love-language/ vibe-check/
│   │   ├── search/ date-ideas/ date-planner/
│   │   ├── serious-mode/ access/         # DTM surfaces
│   │   ├── profile/ settings/ notifications/ safety/ premium/
│   │   └── onboarding/
│   ├── terms/ privacy/ cookies/ community-guidelines/ coming-soon/
├── components/
│   ├── providers.tsx               # QueryClient, Toast, Track, Consent
│   ├── ConsentBanner.tsx
│   ├── ui/                         # Radix primitives + Miamo wrappers
│   └── legal/
├── hooks/
│   ├── useTrackActivity.ts         # core tracking SDK (see §6)
│   ├── useSSE.ts                   # gateway SSE stream
│   ├── usePerformance.ts
│   └── usePersistedState.ts
├── lib/
│   ├── api.ts                      # ApiClient (see §5)
│   └── track/                      # v3.1 tracking SDK internals
└── app/globals.css                 # design tokens (see §9)
```

## 2. Route groups

- `(auth)` — `/login`, `/register`. Minimal layout. Redirects to `/discover` if a JWT exists.
- `(main)` — everything authenticated. Layout injects the sidebar, header, SSE subscription, and the onboarding gate. Redirects to `/login` on 401 from `api.ts`, or to `/onboarding` on a gateway `403 ONBOARDING_INCOMPLETE`.

## 3. Server vs client components

Rule of thumb in this repo:

- **Server**: legal pages, landing, login/register shells. Anything purely static or that fetches once on the server.
- **Client** (`"use client"`): every page under `(main)`. They use TanStack Query, hooks, gestures (swipe), audio (beats), and SSE.

When in doubt, look for `"use client"` at the top of the file.

## 4. Providers tree

Defined in [services/web/src/components/providers.tsx](services/web/src/components/providers.tsx):

```
<QueryClientProvider client={qc}>      # staleTime=30s, retry=2, no refetchOnWindowFocus
  <ToastProvider>                       # custom toast mount
    <TrackProvider>                     # v3.1 SDK init + auto-collector
      <ConsentBanner />                 # gates tracking until decided
      {children}
    </TrackProvider>
  </ToastProvider>
</QueryClientProvider>
```

## 5. API client (`lib/api.ts`)

A single `ApiClient` class, base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:3200`).

- Reads JWT from `localStorage`. Auto-clears on `401`. Redirects to `/onboarding` on `403 ONBOARDING_INCOMPLETE`.
- ~120 typed methods grouped by domain: auth, profiles, discover, matches, messages, beats, feed, stories, videos, creativity, search, ai, vibe, notifications, settings, safety, matrimonial, bookmarks, activity, sessions.

**Example: send a message**

```ts
import { api } from "@/lib/api";
await api.sendMessage(chatId, "hey 👋", "text", replyToId);
```

…hits `POST /api/v1/messages/chats/:chatId/messages` with the bearer token attached. The full method list lives in the file itself — it is the single source of truth for the backend contract.

## 6. Tracking hook (`useTrackActivity`)

[services/web/src/hooks/useTrackActivity.ts](services/web/src/hooks/useTrackActivity.ts) — the only way the frontend emits events.

```ts
const track = useTrackActivity();
track("discover.swipe", "profile", candidateId, { direction: "right" });
```

Internals:

- In-memory queue. `BATCH_SIZE = 8`, `FLUSH_INTERVAL = 3s`.
- Flushes on (a) queue full, (b) timer, (c) `beforeunload`, (d) `visibilitychange='hidden'` (via `navigator.sendBeacon`).
- Per-tab `sessionId` in `sessionStorage`.
- POSTs `[{action, targetType, targetId?, metadata?, durationMs?}, …]` to `/api/v1/activity/track` (forwarded to ingest by the gateway).
- Silently fails — tracking never affects UX.

Helpers built on top:

| Helper | Purpose |
|---|---|
| `useTrackPageView(page)` | `page_view` on mount, `page_dwell` on unmount (if dwell > 2s). |
| `useTrackDwell(page)` | Just the dwell side. |
| `useTrackScrollDepth(page)` | Reports max scroll % on unmount. |
| `trackClick(elementId, meta?)` | One-shot fire. |
| `trackFilterChange`, `trackSettingsChange`, `trackContentEngage`, `useTrackPhotoViews`, `trackStoryView`, `trackNotificationClick`, `trackMatchAction`, `trackBeatAction`, `trackMessageAction`, `trackSearchQuery` | Domain-specific shapes. |

Full event taxonomy in [docs/TRACKING.md](docs/TRACKING.md#event-taxonomy).

## 7. SSE realtime (`useSSE`)

Subscribes to `GET /api/v1/events/stream` (passes JWT via query param because EventSource has no header hook). 25s heartbeat. Auto-reconnect on disconnect. Dispatches per-message handlers for `message.new`, `notification.new`, `match.new`, etc.

## 8. State management

- **Server state**: TanStack Query (`@tanstack/react-query`). Per-page `useQuery`/`useMutation`.
- **Local state**: `useState` + `usePersistedState` for things that survive reload (last selected filter, draft message).
- **No Redux, no Zustand.** All cross-page state is in the URL or in the server.

## 9. Design tokens

Defined in [tailwind.config.ts](services/web/tailwind.config.ts) and [globals.css](services/web/src/app/globals.css).

| Token | Value | Used for |
|---|---|---|
| `rose-main` | `#C97856` | Primary CTA, focus rings |
| `rose-gold` | `#D4896A` | Gradient stop |
| `rose-light` | `#E8A87C` | Hover wash |
| `rose-soft` | `#F5EDE8` | Chips, soft backgrounds |
| `bg` | `#FAF8F5` | Page background (light) |
| `surface` | `#FFFFFF` | Card |
| `border-default` | `#E8E4DF` | Hairlines |
| `text-primary` | `#111111` | Body |
| `text-secondary` | `#5F5A55` | Subdued |

DTM mode is opted in by `<body data-mode="dtm">`, which swaps:
- accent → `#B58A4E` (marigold)
- hairline → `#E3CFA8`
- bg → `#FBF7EE`

Fonts: **Inter** (sans, default), **Cormorant Garamond** (display, brand serif).

Animations are spring-timed via `cubic-bezier(0.16, 1, 0.3, 1)` (`--spring`). Custom keyframes: `fade-in-up`, `glow-pulse`, `shimmer`, `heart-float`, `copper-shimmer`.

## 10. `next.config.js`

- `output: 'standalone'` — Docker-optimised
- `images.remotePatterns`: `images.unsplash.com`, `i.pravatar.cc`, `api.dicebear.com`
- `images.formats`: `['avif', 'webp']`
- Security headers: HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=() microphone=() geolocation=()`
- `modularizeImports` for `lucide-react` (tree-shake icons individually)

## 11. Adding a new page (worked recipe)

1. Create `services/web/src/app/(main)/<feature>/page.tsx` with `"use client"`.
2. Add an entry to the sidebar nav in `app/(main)/layout.tsx`.
3. Add the endpoint to `lib/api.ts` as a typed method.
4. Wrap calls in `useQuery({ queryKey: ['<feature>'], queryFn: () => api.get<Feature>() })`.
5. Add a `useTrackPageView('/<feature>')` call so the surface shows up in analytics.
6. If the page renders a list, add `trackContentEngage` on actions.

## 12. What changed & why it's good

- **Before:** Two parallel tracking SDKs (v3.0 attribute-based + ad-hoc fetches) emitting overlapping events; no batching; tracking calls in the critical render path.
- **After:** One `useTrackActivity` hook with batched, beacon-safe flushes; per-page dwell + scroll depth helpers; consent gating wired through `Providers`. The v3.1 SDK is bridged for transitional dual-write.
- **Why it matters:** Page load is no longer slowed by tracking. Events arrive in coherent sessions, so the v4 algorithms see clean signal. New surfaces get full instrumentation with one hook call.
