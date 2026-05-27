# Frontend — What Priya sees and how it works

**TL;DR:** Priya opens the app in her browser, sees a Next.js 14 website that renders on the server (so it loads in ~600ms), talks to one gateway URL for data, and the website silently tracks her taps in the background.

---

## How to read this

- **Meera (non-tech)**: Read sections "A day in Priya's eyes" and "The 9 screens Priya uses" only.
- **Priya (user/PM)**: Read sections 1-5 to understand what pages exist and how the app loads.
- **Arjun (engineer)**: Read everything, especially sections 6-8 on state, performance, and testing.

---

## A day in Priya's eyes

It's 9pm. Priya opens her phone and taps the Miamo icon. Here's what happens in the next 3 seconds:

1. **The app loads** (less than 1 second). The server pre-draws the first screen and ships it to her phone, so Priya doesn't stare at a blank spinner.
2. **The first cards appear** (~600ms on 4G). She sees a stack of 10 profiles to swipe through, ready to tap immediately.
3. **She taps "Like"** on Arjun. That tap goes to one front door (the gateway), which talks to the right team behind the scenes to record it, check if Arjun liked her back, and send his phone a ping. She sees "It's a match!" on her screen.
4. **She opens chat with Arjun**. The app downloads their message history and opens a live connection so new messages arrive the moment he types.
5. **She closes the app**. That tap is recorded (so the algorithm knows she's using the app), and if there were any unsaved events in memory, they ship to us before the app closes.

Everything Priya does — swiping, liking, chatting, viewing stories — is written to our servers via the gateway. The app itself is just a mirror that shows her the latest data.

---

## The tech stack (one line each)

| What | It is |
|------|-------|
| **Language** | TypeScript in a Next.js 14 app (the same framework Netflix uses for their UI) |
| **The files** | Live in `services/web/src/app/` and are organized by route (pages) |
| **Styling** | Tailwind CSS — pre-made utility classes like `bg-blue-500` that stack together |
| **Data on the page** | Comes from the server or React hooks; no Redux mess to sync |
| **Talking to the backend** | Only talks to the gateway (port 3200), never sneaks calls to internal services |

---

## The 9 screens Priya sees

| Screen | What Priya does | What we show her |
|--------|-----------------|------------------|
| **Login** | Types email + password | Either logs her in or says "wrong password" |
| **Signup** | Enters new account details | Creates her and emails a verification link |
| **Onboarding** | Answers 12 questions (age, location, looking for) | Stores her preferences so the algorithm can work |
| **Discover** | Swipes right (Like) or left (Pass) on profiles | Shows 10 profiles at a time, pre-loads the next 10 when she's almost done |
| **Matches** | Taps a match to start chatting | Shows everyone who swiped right on her, newest first |
| **Chat** | Types a message to Arjun | Shows their history + live new messages as he types |
| **Feed** | Scrolls through photos her matches posted | Endless stream, with photos ranked by the algorithm |
| **Stories** | Views 24h photos her matches posted | Each view is recorded so we know what interests her |
| **Notifications** | Taps the bell | Shows new matches, messages, and profile visits |

---

## How a page actually loads (the journey)

When Priya opens the app or navigates to a new page:

```
1. Priya's browser → Next.js server (our own machine)
   ("What should I show for /discover?")

2. Next.js server → gateway (localhost:3200)
   ("Give me 10 discover profiles")

3. Gateway → social service (internal team)
   ("Which 10 profiles match this user?")

4. Social service → Postgres (permanent filing cabinet)
   ("Rank these profiles by algorithm")

5. Social → gateway → Next.js → Priya's browser
   (HTML + data, all rendered, ready to tap)

6. Priya's browser → Redis (shared whiteboard)
   (Cache: "do we have this user's profile already?")

7. Priya sees the page in ~600ms over 4G
```

**Why this is fast:** The server renders the page *before* sending it to Priya. If we made her browser do all the work (like Instagram used to), the first card wouldn't show until 2.5 seconds—she'd just stare at a blank screen.

---

## The file layout (what lives where)

```
services/web/src/
├── app/
│   ├── (auth)/                 ← login, signup, password reset
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (main)/                 ← all the screens after login
│   │   ├── discover/page.tsx   ← swipe stack
│   │   ├── matches/page.tsx    ← your matches list
│   │   ├── chat/[chatId]/page.tsx  ← one conversation
│   │   ├── feed/page.tsx       ← scrolling photos
│   │   ├── stories/page.tsx    ← 24h stories
│   │   ├── ai-picks/page.tsx   ← daily pick
│   │   ├── notifications/page.tsx  ← bell
│   │   └── profile/page.tsx    ← your own profile
│   ├── components/             ← reusable buttons, cards, modals
│   ├── lib/                    ← helpers (API calls, formatting)
│   ├── hooks/                  ← React hooks (state helpers)
│   └── track/                  ← tracking SDK (records taps)
├── public/                     ← images, fonts that ship with the app
└── styles/                     ← global CSS
```

---

## State: where does the data live?

Here's the deal: Priya's data lives in 3 places, and we keep them in sync.

| Where | What lives there | Example |
|-------|------------------|---------|
| **URL** | The "address" of the page | `/chat/abc123` — the ID is in the URL, not in memory |
| **Server** | The source of truth — always up-to-date | "What's the latest message in this chat?" (fetched fresh on load) |
| **React hooks** | Temporary client-side state | "What text is Priya typing right now?" (lives in memory while she's typing) |

We *don't* use Redux. Why? Because Redux is a sledgehammer for syncing data between the browser and server—and we already sync everything with the server. So we just:
- Put the ID in the URL (`/chat/123`)
- Fetch fresh data on page load
- Keep temporary UI state (like "text in the input box") in React hooks
- When she submits, send it to the server and refetch

This means fewer bugs, fewer "why is the page out of sync" moments.

---

## Performance: why the app feels fast

Priya sees the first card in ~600ms on 4G instead of 2.5 seconds. Here's how:

| Trick | What it does |
|-------|--------------|
| **Server-render first page** | Next.js renders `/discover` *on the server*, ships HTML+data to her phone, so she sees content immediately |
| **Pre-fetch the next 10** | Discover loads 10 profiles, but behind the scenes we're already downloading profiles 11-20 so if she swipes fast, they're ready |
| **Smart image compression** | `next/image` resizes photos to fit her phone screen, so they download in KB instead of MB |
| **Code-split by page** | JavaScript for `/chat` only downloads when she clicks Chat, not when the app starts |
| **Cache everything repeatable** | If she visits the same profile twice, we show it from cache (a sticky note on the fridge) instead of asking the server again |

The app ships a Docker container with `output: 'standalone'`, which means the container only includes code that actually runs—no bloat.

---

## The tracking SDK (what gets recorded)

Every tap Priya makes is recorded silently in the background. The SDK:
- **Batches events** (up to 50 events or 32KB of data, whichever comes first)
- **Flushes every 2.5 seconds** (or when she closes the tab, using sendBeacon so it completes even if she's slow to load the next page)
- **Throttles cursor tracking** (we don't record *every* pixel she moves—that's noise)
- **Detects rage clicks** (5+ clicks on the same button in 1 second = something's broken)

See [TRACKING.md](TRACKING.md) for the full catalog of 50+ events we record.

---

## Running it locally

```bash
# Start the web service
cd services/web
npm install
NEXT_PUBLIC_API_URL=http://localhost:3200 npm run dev

# Open http://localhost:3100 in your browser
# You'll see live code reloads when you edit files
```

---

## Testing

The web app has a Playwright smoke test: **Login → Discover → Swipe → Chat → Match**. It runs in 30 seconds in CI and catches the most common breakages.

Unit tests cover components with complex logic (forms, filters, modals), but we don't unit-test simple display components.

---

## What changed and why it's better

| Then | Now | Why |
|------|-----|-----|
| React SPA (all rendering in browser) | Next.js server-render + App Router | Priya sees the first card in 600ms instead of 2.5s |
| Redux for state | URL + server + React hooks | Fewer sync bugs, simpler code |
| All images full-size | next/image compression | 3× faster load, 4G friendly |
| One-request-at-a-time | Pre-fetch next batch | Taps feel instant, no "Loading..." spinners |

**Why Priya feels it:** The app opens immediately. No spinners. No lag between taps. It works on her 4G connection at 9pm when the tower is slow.

---

## If something breaks

| Symptom | What to check |
|---------|---------------|
| Blank page, then content appears | The server-side cache missed. Check: `kubectl logs -l app=web --tail=100` |
| Login works, then redirects back to login | Cookie isn't set. Check: `NEXT_PUBLIC_API_URL` in `.env`, and ask: is the gateway CORS allowing localhost? |
| Chat is open, but new messages don't appear | SSE connection died. Check: gateway logs `kubectl logs -l app=gateway --tail=100` |
| Images load very slowly | CDN cache miss. Check: `next.config.js` images config, or restart CDN |
| app is broken locally but works in staging | Node version mismatch. Check: `node --version` == the CI `package.json` engines.node |
