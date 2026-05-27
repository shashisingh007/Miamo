# web

The Next.js 14 App Router frontend on port `3100`. Full architecture is in [docs/FRONTEND.md](../../docs/FRONTEND.md); this README is the per-service reference.

## 1. Purpose

The Miamo browser app. Renders every user surface (Discover, Matches, Messages, Beats, Feed, Stories, Creativity, AI Match, Compatibility, Love Language, Vibe Check, Search, DTM Serious Mode, Profile, Settings, etc.), instruments them with the tracking SDK, and subscribes to gateway SSE for realtime updates.

## 2. Mental model

- App Router with two route groups: `(auth)` for unauthenticated pages and `(main)` for the authenticated dashboard.
- One `ApiClient` ([src/lib/api.ts](src/lib/api.ts)) wrapping every backend endpoint. Reads JWT from `localStorage`; auto-redirects on 401/403.
- One tracking hook ([src/hooks/useTrackActivity.ts](src/hooks/useTrackActivity.ts)) that batches events (8 / 3 s) and flushes via `sendBeacon` on tab close.
- TanStack Query for server state. No Redux / Zustand.
- Tailwind + Radix UI for styling; Inter (sans) + Cormorant Garamond (display). Rose-copper palette by default; marigold for DTM via `<body data-mode="dtm">`.

## 3. Public surface

The web app is a browser bundle, not an API. It consumes the gateway at `NEXT_PUBLIC_API_URL` (default `http://localhost:3200`).

| Route group | Route | Source |
|---|---|---|
| `(auth)` | `/login`, `/register` | [src/app/(auth)/](src/app/(auth)/) |
| `(main)` | `/discover`, `/matches`, `/messages`, `/beats`, `/stories`, `/feed`, `/creativity`, `/videos`, `/ai-match`, `/compatibility`, `/love-language`, `/vibe-check`, `/search`, `/date-ideas`, `/date-planner`, `/serious-mode`, `/access`, `/profile`, `/settings`, `/notifications`, `/safety`, `/premium`, `/onboarding` | [src/app/(main)/](src/app/(main)/) |
| public | `/`, `/terms`, `/privacy`, `/cookies`, `/community-guidelines`, `/coming-soon` | [src/app/](src/app/) |

Full page list in [docs/FRONTEND.md](../../docs/FRONTEND.md#1-layout).

## 4. Data model

None. The browser talks to the gateway only.

## 5. Dependencies

| Talks to | Why | How |
|---|---|---|
| gateway `:3200` | every backend call | HTTP via `lib/api.ts` |
| gateway `:3200/api/v1/events/stream` | SSE realtime (messages, matches, notifications) | `useSSE` |

External: TanStack Query, Radix UI, Tailwind, lucide-react (tree-shaken).

## 6. Configuration

| Env | Default | Purpose |
|---|---|---|
| `PORT` | `3100` | Dev + prod listen port |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3200` | Baked into the bundle at build time; client-side API base |

## 7. Worked example — adding a "weekly digest" page

1. Create [src/app/(main)/weekly-digest/page.tsx](src/app/(main)/weekly-digest/page.tsx) with `"use client"`.
2. Add a method to [src/lib/api.ts](src/lib/api.ts):
   ```ts
   getWeeklyDigest = () => this.get<WeeklyDigest>("/api/v1/digest/weekly");
   ```
3. Add a nav entry to `src/app/(main)/layout.tsx`.
4. Fetch with TanStack Query:
   ```ts
   const { data } = useQuery({ queryKey: ["digest"], queryFn: () => api.getWeeklyDigest() });
   ```
5. Add instrumentation:
   ```ts
   useTrackPageView("/weekly-digest");
   ```

## 8. Local dev

```bash
cd services/web
npm install            # first time
npm run dev            # next dev -p 3100
open http://localhost:3100
```

Production build:
```bash
npm run build && npm start
```

The Docker image is built via [docker/web.Dockerfile](../../docker/web.Dockerfile) using `output: 'standalone'` for a slim runtime.

## 9. Tests

No frontend tests in this repo (the workspace vitest config explicitly excludes `services/web/**`). Lint with `npm run lint`. Manual smoke via opening pages on `localhost:3100`.

## 10. Failure modes & operational notes

- **`NEXT_PUBLIC_API_URL` mismatch** at build time → the bundle hard-codes the value. Rebuild for a new gateway URL.
- **Hydration warnings** typically come from theme/SSR mismatches; check `usePersistedState` consumers.
- **SSE not connecting** → EventSource passes JWT via query param; ensure gateway rate-limit isn't blocking the stream rate (10/h per user).
- **Image domains** are allowlisted in `next.config.js`. New external hosts must be added.

## 11. What changed & why it's good

- **Before:** Pages did ad-hoc tracking and duplicated fetch logic; design tokens were scattered across components.
- **After:** One `ApiClient`, one `useTrackActivity` hook, one Tailwind token sheet; the DTM mode is a single body attribute that swaps three CSS variables.
- **Why it matters:** Adding a page is a recipe (see §7). Visual changes ship from one config. Tracking is consistent across surfaces.
