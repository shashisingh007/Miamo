# web — the actual website Priya sees (port 3100)

**TL;DR:** the Next.js 14 web app. Renders pages, fetches from the gateway, ships tracking events. Everything Priya touches lives here.

---

## How to read this

- **Meera**: Sections 1–2.
- **Priya / PM**: Sections 1–4.
- **Engineer**: All.

---

## 1. A scene

9:02pm. Priya types `miamo.in` on her iPhone. CDN serves the Next.js app shell (~120 KB gzipped). Within 250 ms the first page paints, the tracking SDK boots, the first `page.view` event fires. She taps "Discover". Server-side rendering means the first card stack is rendered on the server and streamed to her — no spinner, no flash.

---

## 2. What this service is

A Next.js 14 application using the App Router, React server components by default, client components where interactivity is needed. Talks to **one URL only** — the gateway. Ships the tracking SDK in `src/track/`.

---

## 3. The page map

| Route                | What Priya sees / does                                       |
|----------------------|--------------------------------------------------------------|
| `/`                  | Landing — value prop + sign in                                |
| `/login`             | Phone + OTP sign-in                                           |
| `/onboarding`        | Vibe check + DTM topics                                       |
| `/discover`          | The swipe stack                                               |
| `/aipicks`           | Today's curated picks                                         |
| `/aimatch`           | The one daily AI Match                                        |
| `/profile/[id]`      | Public profile view                                           |
| `/profile/edit`      | Edit my own profile                                           |
| `/chat`              | Threads list                                                  |
| `/chat/[id]`         | One conversation                                              |
| `/feed`              | Posts from people I follow / match with                       |
| `/post/[id]`         | Single post + comments                                        |
| `/beats`             | Music-match game                                              |
| `/dtm`               | Deep-Compat topics                                            |
| `/vibe`              | Vibe check                                                    |
| `/search`            | Search profiles                                                |
| `/notifications`     | My notifications                                              |
| `/settings`          | Preferences, consent, devices                                  |

---

## 4. Worked example — a page load

```
1. Priya  types miamo.in
2. CDN    serves the Next.js shell (cached)
3. Phone  Next.js boots, calls gateway:3200/v1/users/me  via SSR
4. Server renders /discover with the first 10 candidates inline
5. Phone  paints first card in ~250ms LCP
6. Track  src/track/ boots → page.view event fired
7. Priya  taps Like → optimistic UI → POST /v1/social/swipe
```

---

## 5. Code layout

```
services/web/
├── next.config.js
├── tailwind.config.ts
├── public/                # static assets
└── src/
    ├── app/               # App Router routes
    │   ├── (auth)/
    │   ├── (main)/
    │   │   ├── discover/page.tsx
    │   │   ├── chat/[id]/page.tsx
    │   │   ├── profile/[id]/page.tsx
    │   │   └── ...
    │   └── layout.tsx
    ├── components/        # reusable UI
    ├── lib/               # fetch helpers, auth helpers
    ├── hooks/             # React hooks
    └── track/             # the tracking SDK (see TRACKING.md)
```

---

## 6. The tracking SDK in 6 bullets

The SDK in `src/track/` does six things on Priya's behalf:

1. **Batches** up to 50 events or 32 KB.
2. **Flushes** every 2.5 s, or on `visibilitychange` / `pagehide`.
3. **Throttles** `cursor.sample` to 5/s only while moving.
4. **Coalesces** `dwell` — only emits after a card is in viewport ≥800ms.
5. **Detects rage** — ≥3 clicks within 800ms on the same element fires one `click.rage`.
6. **Falls back** to `navigator.sendBeacon` on tab close so the last batch survives.

A blocked or offline `ingest` does not stall the UI — the SDK stashes the batch in `localStorage` and retries next visit.

---

## 7. State management

We do not use Redux. We use:

- **URL** — page state ("/chat/abc123"), the source of truth for what page.
- **Server** — data on the page (fetched fresh, revalidated by Next.js).
- **React hooks (`useState`, `useReducer`)** — temporary UI state (typed text, modals).

Three places, no sync logic. Fewer bugs.

---

## 8. Performance budget

| Metric                | Target          | Tracked by                       |
|-----------------------|-----------------|----------------------------------|
| LCP (Largest Contentful Paint) | < 2.5 s | `perf.web_vitals` event           |
| INP (Interaction to Next Paint) | < 200 ms | `perf.web_vitals`                 |
| CLS (Cumulative Layout Shift) | < 0.1 | `perf.web_vitals`                 |
| First load JS         | < 130 KB gzipped | bundle analyzer                  |

---

## 9. Configuration

| Env var                    | What it does                                  |
|----------------------------|-----------------------------------------------|
| `NEXT_PUBLIC_API_URL`      | Gateway URL                                    |
| `NEXT_PUBLIC_TRACK_URL`    | Ingest URL                                     |
| `NEXT_PUBLIC_RELEASE`      | Release id, stamped onto events                |
| `SESSION_COOKIE_SECRET`    | Encrypts the session cookie                    |

---

## 10. Run locally / test

```bash
cd services/web
pnpm install
pnpm dev          # 3100

open http://localhost:3100
# Demo login: demo@miamo.in / demo1234
```

---

## 11. What changed and why it's better

- **Before:** a client-only React SPA. Blank screen until JS booted, ~2.5 s to first card on 4G.
- **After:** Next.js 14 server components stream the first card from the server. ~250 ms LCP on 4G.
- **Why Priya feels it:** she taps the icon and sees a face. No spinner.

---

## 12. If something breaks

| Symptom                              | First check                                  | Fix                              |
|--------------------------------------|----------------------------------------------|----------------------------------|
| Blank page then content appears      | SSR fetch failed silently                    | check gateway URL + logs         |
| Login loops back to /login            | Cookie not set                                | CORS + `sameSite`                |
| Chat messages do not stream in       | SSE connection dropped                        | restart gateway pod              |
| `perf.web_vitals` always reports null | Browser does not support web-vitals          | acceptable on old Safari         |
