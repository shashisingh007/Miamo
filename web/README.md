# Miamo Web App (Frontend)

**Port:** 3100  
**Tech:** Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI  
**State:** Zustand + TanStack Query

---

## What It Does

The web app is the **user-facing frontend** for Miamo. It communicates exclusively with the API Gateway at port 3200.

## Pages & Routes

### Auth Pages (`/login`, `/register`)

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Email + password sign in |
| `/register` | Register | Create account with profile basics |

### Main Pages (Authenticated)

| Route | Page | Description |
|-------|------|-------------|
| `/feed` | Feed | Social timeline with posts, reactions, comments |
| `/discover` | Discover | Browse profiles, swipe/like/pass |
| `/matches` | Matches | View matches, pending requests |
| `/messages` | Messages | Chat with matches |
| `/ai-match` | AI Match | AI-powered compatibility suggestions |
| `/profile` | Profile | View/edit own profile, see profile score |
| `/search` | Search | Find users by name or interests |
| `/stories` | Stories | View/create ephemeral stories |
| `/videos` | Videos | Short-form video feed |
| `/beats` | Beats | Streak management with matches |
| `/creativity` | Creativity | Creative content hub |
| `/notifications` | Notifications | View all notifications |
| `/settings` | Settings | Account, privacy, notification preferences |
| `/safety` | Safety | Report/block, safety tips |
| `/premium` | Premium | Premium subscription features |
| `/serious-mode` | Serious Mode | Focused dating mode |

## Tech Stack

| Library | Purpose |
|---------|---------|
| **Next.js 14** | React framework with App Router |
| **Tailwind CSS** | Utility-first styling |
| **Radix UI** | Accessible UI primitives (via shadcn/ui pattern) |
| **Zustand** | Lightweight global state management |
| **TanStack Query** | Server state, caching, background refetching |
| **Lucide React** | Icon library |

## Project Structure

```
web/src/
├── app/                      ← Next.js App Router
│   ├── layout.tsx            ← Root layout (providers, fonts)
│   ├── page.tsx              ← Landing page (redirects)
│   ├── globals.css           ← Tailwind + global styles
│   ├── (auth)/               ← Auth layout group
│   │   ├── layout.tsx        ← Centered card layout
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (main)/               ← Authenticated layout group
│       ├── layout.tsx        ← Sidebar + header + nav
│       ├── feed/page.tsx
│       ├── discover/page.tsx
│       ├── matches/page.tsx
│       ├── messages/page.tsx
│       └── ... (all other pages)
├── components/
│   ├── providers.tsx         ← TanStack Query + Zustand providers
│   └── ui/                   ← Reusable UI components
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── empty-state.tsx
│       ├── filter-chip.tsx
│       ├── input.tsx
│       ├── miamo-logo.tsx
│       ├── score-ring.tsx    ← Profile completeness ring
│       └── skeleton.tsx      ← Loading skeleton
├── hooks/
│   └── useApi.ts             ← TanStack Query hooks for API calls
├── lib/
│   ├── api.ts                ← Axios/fetch wrapper for Gateway
│   ├── constants.ts          ← App constants
│   ├── mock-data.ts          ← Mock data for development
│   └── utils.ts              ← Utility functions (cn, formatDate, etc.)
└── stores/
    └── index.ts              ← Zustand store (auth, UI state)
```

## Layout System

### Auth Layout (`(auth)/layout.tsx`)
- Centered card on gradient background
- Miamo logo at top
- Used by login & register pages

### Main Layout (`(main)/layout.tsx`)
- **Sidebar** — Navigation links with icons + unread badges
- **Header** — Search bar, notifications bell, user avatar
- **Content area** — Page content with responsive padding
- Mobile: Bottom tab navigation

## API Communication

All API calls go through the Gateway:

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

export const api = {
  get: (path: string) => fetch(`${API_BASE}${path}`, { headers: authHeaders() }),
  post: (path: string, body: any) => fetch(`${API_BASE}${path}`, { method: 'POST', body: JSON.stringify(body), headers: authHeaders() }),
  // ...
};
```

## State Management

### Zustand Store (`stores/index.ts`)
```typescript
// Auth state
user: User | null
token: string | null
login(token, user): void
logout(): void

// UI state
sidebarOpen: boolean
theme: 'light' | 'dark'
```

### TanStack Query (`hooks/useApi.ts`)
```typescript
// Example hooks
useProfile()        → GET /api/v1/profiles/me
useFeed()           → GET /api/v1/feed
useMatches()        → GET /api/v1/matches
useNotifications()  → GET /api/v1/notifications
useMessages(chatId) → GET /api/v1/messages/:chatId
```

## Run Locally

```bash
cd web
npm install
npm run dev
# → http://localhost:3100
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3200` | Gateway URL |
| `PORT` | `3100` | Web app port |

## Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start

# Docker
docker build -t miamo-web .
docker run -p 3100:3100 miamo-web
```
