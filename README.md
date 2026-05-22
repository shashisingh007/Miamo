# Miamo

A premium romantic dating platform with glass-morphism UI, AI-powered matching algorithms, and real-time messaging. Built with microservice architecture on Kubernetes.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [CLI Commands](#cli-commands)
- [API Reference](#api-reference)
- [Data Structures & Algorithms](#data-structures--algorithms)
- [Security Model](#security-model)
- [Testing](#testing)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [License](#license)

---

## Features

| Feature | Description |
|---------|-------------|
| **AI Match Engine** | Multi-signal ensemble scoring — collaborative filtering, behavioral affinity, compatibility, engagement patterns, temporal correlation, vibe matching |
| **Smart Discover** | 6 distinct ranking algorithms (ForYou, New, Active, Verified, Serious, AI Picks) using MinHeap top-K selection |
| **Real-time Chat** | SSE-powered messaging with AES-256-GCM encryption, typing indicators, read receipts, disappearing messages |
| **Beats** | Daily engagement streaks between matches — state machine (active → weak → lost → archived) |
| **Creativity Studio** | User-generated content (art, music, writing, photography) with collaborative-filtering feed ranking |
| **Stories** | 7-day ephemeral content with reactions, comments, and viewer insights |
| **Date to Marry (DTM)** | Serious-intent matrimonial mode with Ashtakoota Kundli compatibility, numerology, bio-data templates |
| **Vibe Check** | Mood-based matching — mood, energy, topics, and intent scoring |
| **Safety Center** | Reporting, blocking, content moderation, privacy controls, GDPR data export |
| **Activity Intelligence** | Behavioral tracking across 15+ action types feeds recommendation algorithms |
| **Miamo Moves** | Interest signals with personalized messages — auto-match on mutual moves |

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────▶│   Next.js    │────▶│   Gateway    │
│              │◀────│  (SSR/SSG)   │◀────│ (Proxy+Auth) │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
         ┌───────────────────────────────────────┼───────────────────────────────────────┐
         │                    │                  │                 │                     │
   ┌─────▼─────┐  ┌──────────▼──┐  ┌────────────▼──┐  ┌──────────▼────┐  ┌─────────────▼──┐
   │   Auth    │  │    Users    │  │    Social     │  │  Messaging   │  │    Content     │
   │  (:3201)  │  │   (:3202)  │  │   (:3203)    │  │   (:3204)    │  │   (:3205)      │
   └─────┬─────┘  └─────┬──────┘  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘
         │               │               │                  │                  │
         │               │          ┌────▼────┐             │                  │
         │               │          │Notif.   │             │                  │
         │               │          │(:3206)  │             │                  │
         │               │          └────┬────┘             │                  │
         └───────────────┴───────┬───────┴──────────────────┴──────────────────┘
                                 │
                           ┌─────▼─────┐     ┌─────────┐
                           │ PostgreSQL│     │  Redis   │
                           │  (:5432)  │     │ (:6379)  │
                           └───────────┘     └──────────┘
```

| Service | Port | Responsibility |
|---------|------|----------------|
| **web** | 3100 | Next.js 14 frontend — 24 pages, SSR, standalone build |
| **gateway** | 3200 | API proxy, JWT validation, rate limiting, SSE hub, CORS, security headers |
| **auth** | 3201 | Registration, login, JWT access + refresh tokens, sessions, password management |
| **users** | 3202 | Profiles, settings, privacy, search (Levenshtein + prefix), bookmarks, GDPR export |
| **social** | 3203 | Discover (6 algorithms), AI matching, matches, vibe-check, safety, activity tracking |
| **messaging** | 3204 | Chats, AES-256-GCM encrypted messages, beats/streaks, SSE push, AI suggestions |
| **content** | 3205 | Feed, stories, videos, creativity, matrimonial (DTM), Kundli compatibility |
| **notifications** | 3206 | Notification CRUD, bulk mark-read, SSE push delivery |
| **postgres** | 5432 | PostgreSQL 16 — 45 Prisma models |
| **redis** | 6379 | Cache, sessions, rate limiting |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 20 (Alpine) | Server runtime |
| **Language** | TypeScript (strict mode) | Full-stack type safety |
| **Backend** | Express.js + Prisma 5.22 ORM | REST API + database access |
| **Frontend** | Next.js 14 + React 18 | SSR/SSG app framework |
| **Styling** | Tailwind CSS + Framer Motion | Utility CSS + animations |
| **Forms** | React Hook Form + Zod | Validation-driven forms |
| **State** | Zustand (client) + TanStack Query (server) | Persistent + server state |
| **Icons** | Lucide React | 1000+ icons |
| **UI Primitives** | Radix UI | Accessible dialog, dropdown, tabs, tooltip, etc. |
| **Database** | PostgreSQL 16 | 45 models, composite indexes |
| **Cache** | Redis 7 + custom in-memory (LRU, MinHeap, Trie, BloomFilter) | Multi-layer caching |
| **Auth** | JWT (HS256) + bcrypt (12 rounds) + refresh tokens | Stateless auth |
| **Encryption** | AES-256-GCM | Message encryption at rest |
| **Real-time** | Server-Sent Events (SSE) | Push notifications, chat events |
| **Containers** | Docker (multi-stage builds) | Per-service images |
| **Orchestration** | Kubernetes (minikube / prod) | HPA, PDB, NetworkPolicy |
| **Testing** | Vitest (unit) + Python e2e suite (19 tests) | Full test coverage |

---

## Project Structure

```
Miamo/
├── configuration/               # Environment configs (dev/staging/prod)
│   ├── dev/values.yaml
│   ├── staging/values.yaml
│   └── prod/values.yaml
├── docker/                      # Per-service Dockerfiles
│   ├── auth.Dockerfile
│   ├── gateway.Dockerfile
│   ├── web.Dockerfile
│   ├── migrate.Dockerfile
│   └── ...
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # System design & algorithms
│   ├── FRONTEND_AUDIT.md        # Frontend audit report
│   └── PHASE7_AUDIT.md          # Code quality audit
├── k8s/                         # Kubernetes manifests
│   └── templates/
├── scripts/
│   ├── start.sh                 # Local dev launcher
│   ├── start-services.sh        # Unified CLI (local/docker/k8s)
│   ├── setup.sh                 # Prerequisites installer
│   └── test-all.py              # Full test suite (19 tests)
├── services/
│   ├── auth/                    # Authentication service
│   │   └── src/server.ts        # 285 lines — register, login, JWT, sessions
│   ├── users/                   # User profiles & settings
│   │   └── src/server.ts        # 370 lines — CRUD, search, bookmarks, GDPR
│   ├── social/                  # Discover, matching, AI
│   │   └── src/server.ts        # 1500+ lines — 6 discover algorithms, AI match
│   ├── messaging/               # Chat & real-time
│   │   └── src/server.ts        # 700+ lines — encrypted chat, beats, suggestions
│   ├── content/                 # Feed, stories, creativity, beats
│   │   └── src/server.ts        # 1600+ lines — feed, stories, videos, DTM, Kundli
│   ├── notifications/           # Alerts & push
│   │   └── src/server.ts        # 120 lines — notifications, mark-read, SSE
│   ├── gateway/                 # API proxy & rate limiter
│   │   └── src/server.ts        # 340 lines — JWT, proxy, SSE hub, rate limits
│   ├── web/                     # Next.js frontend
│   │   └── src/
│   │       ├── app/             # 24 pages (App Router)
│   │       ├── components/ui/   # 15+ reusable components
│   │       ├── hooks/           # SSE, activity tracking, performance hooks
│   │       ├── lib/             # API client, types, constants, utils
│   │       └── stores/          # Zustand stores (auth, theme, discovery)
│   └── shared/                  # Shared utilities
│       ├── cache.ts             # LRU Cache, MinHeap, Trie, BloomFilter
│       ├── algorithms.ts        # 999 lines — all scoring algorithms
│       └── src/
│           ├── logger.ts        # Production-safe logger
│           ├── sanitize.ts      # XSS prevention (sanitize, escapeHtml)
│           └── audit.ts         # Shared auditLog + trackActivity
└── package.json                 # Root workspace scripts
```

---

## Quick Start

### Prerequisites

- Node.js 18+ (or run `bash scripts/setup.sh` to install everything)
- PostgreSQL 16 (via Docker or local install)

### Local Development (Recommended)

```bash
git clone https://github.com/shashisingh007/Miamo.git
cd Miamo
bash scripts/start.sh local
```

Opens http://localhost:3100 with hot reload. No Docker/K8s needed.

### Docker Compose

```bash
bash scripts/start-services.sh docker up
```

### Kubernetes (minikube)

```bash
bash scripts/start-services.sh k8s --env dev
```

### Test Users

20 seed users available in all environments:

| Email | Password |
|-------|----------|
| `miamo1@miamo.test` | `miamo1` |
| `miamo2@miamo.test` | `miamo2` |
| ... through ... | ... |
| `miamo20@miamo.test` | `miamo20` |

---

## CLI Commands

### Root package.json Scripts

| Command | Description |
|---------|------------|
| `npm start` | Start all services locally |
| `npm test` | Run full test suite |
| `npm run docker:up` | Docker Compose up (build + start) |
| `npm run docker:down` | Docker Compose down |
| `npm run k8s:dev` | Deploy to dev Kubernetes |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed database with 20 test users |
| `npm run db:studio` | Open Prisma Studio GUI |

### start-services.sh CLI

```bash
bash scripts/start-services.sh <command> [options]
```

| Command | Description |
|---------|-------------|
| `local start` | Start all services as Node.js processes |
| `local stop` | Stop all services |
| `local restart` | Restart all services |
| `local status` | Show running service status |
| `local logs <service>` | Stream logs for a specific service |
| `docker up` | Build and start all containers |
| `docker down` | Stop and remove containers |
| `docker status` | Show container status |
| `k8s --env dev` | Deploy to dev Kubernetes cluster |
| `k8s --env staging` | Deploy to staging |
| `k8s --env prod` | Deploy to production |

### start.sh Quick Commands

| Command | Description |
|---------|-------------|
| `bash scripts/start.sh local` | Start local dev (hot reload) |
| `bash scripts/start.sh stop` | Stop all |
| `bash scripts/start.sh docker` | Docker mode |
| `bash scripts/start.sh k8s` | Kubernetes mode |

---

## API Reference

All endpoints routed through the Gateway at `http://localhost:3200/api/v1/`.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register (email, password, displayName) → tokens |
| POST | `/auth/login` | No | Login → user data + tokens |
| POST | `/auth/logout` | Yes | Logout + revoke sessions |
| POST | `/auth/refresh` | No | Refresh access token |
| GET | `/auth/me` | Yes | Current user + profile + settings |
| PUT | `/auth/password` | Yes | Change password |
| GET | `/auth/sessions` | Yes | List active sessions |
| POST | `/auth/sessions/:id/revoke` | Yes | Revoke specific session |

### User Profiles

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | Yes | List active users (max 50) |
| GET | `/users/:id` | Yes | Get user profile |
| GET | `/profiles/me` | Yes | Own profile + photos + prompts + interests |
| PUT | `/profiles/me` | Yes | Update profile (20+ fields) |
| PUT | `/profiles/me/prompts` | Yes | Replace profile prompts |
| PUT | `/profiles/me/interests` | Yes | Replace interests |
| GET | `/search` | Yes | Search users (name, city, ID) with ranked results |
| GET | `/bookmarks` | Yes | List bookmarks |
| POST | `/bookmarks` | Yes | Create bookmark |
| DELETE | `/bookmarks/:id` | Yes | Delete bookmark |

### Settings & Privacy

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/settings` | Yes | Get settings + privacy |
| PUT | `/settings` | Yes | Update settings (theme, notifications) |
| PUT | `/settings/privacy` | Yes | Update privacy (searchability, visibility) |
| POST | `/settings/deactivate` | Yes | Deactivate account |
| POST | `/settings/reactivate` | Yes | Reactivate |
| GET | `/settings/export` | Yes | GDPR data export |
| GET | `/settings/blocks` | Yes | List blocked users |

### Discover & Matching

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/discover` | Yes | Ranked profiles (17+ filter params, 6 algorithms) |
| POST | `/discover/like` | Yes | Like a profile |
| POST | `/discover/comment` | Yes | Send thoughtful comment |
| POST | `/discover/pass` | Yes | Pass on profile |
| POST | `/discover/move` | Yes | Send Miamo Move (interest + message) |
| GET | `/discover/moves/received` | Yes | Pending received moves |
| POST | `/discover/moves/:id/accept` | Yes | Accept move |
| POST | `/discover/moves/:id/reject` | Yes | Reject move |
| GET | `/discover/filters` | Yes | Get saved filters |
| PUT | `/discover/filters` | Yes | Save filters |

### Matches

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/matches` | Yes | List matches (filter: new/active/favorites/serious) |
| POST | `/matches/:id/favorite` | Yes | Toggle favorite |
| POST | `/matches/:id/pin` | Yes | Toggle pinned |
| POST | `/matches/:id/report` | Yes | Report match |
| DELETE | `/matches/:id` | Yes | Unmatch |
| GET | `/matches/requests` | Yes | Incoming match requests |
| GET | `/matches/requests/sent` | Yes | Sent requests |
| POST | `/matches/requests/:id/accept` | Yes | Accept request |
| POST | `/matches/requests/:id/reject` | Yes | Reject request |
| GET | `/matches/incoming` | Yes | Incoming likes/moves |
| POST | `/matches/incoming/:userId/match-back` | Yes | Accept incoming like |
| POST | `/matches/incoming/:userId/match-move` | Yes | Accept + send message |
| POST | `/matches/incoming/:userId/hold` | Yes | Put on hold |
| POST | `/matches/incoming/:userId/resume` | Yes | Resume from hold |
| POST | `/matches/incoming/:userId/hide` | Yes | Dismiss |
| GET | `/matches/incoming/:userId/suggestions` | Yes | AI-suggested openers |

### AI Match

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/ai-match/suggestions` | Yes | AI-powered suggestions (top 20 with reasons, icebreakers) |
| GET | `/ai-match/score/:targetId` | Yes | Detailed compatibility breakdown |

### Messaging

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/messages/chats` | Yes | List active chats |
| GET | `/messages/chats/archived` | Yes | Archived chats |
| GET | `/messages/chats/:id/messages` | Yes | Chat messages (paginated, decrypted) |
| POST | `/messages/chats/:id/messages` | Yes | Send message (encrypted) |
| PUT | `/messages/messages/:id` | Yes | Edit message |
| POST | `/messages/messages/:id/delete-for-me` | Yes | Delete for self |
| POST | `/messages/messages/:id/delete-for-all` | Yes | Delete for all (2h window) |
| POST | `/messages/messages/:id/react` | Yes | React with emoji |
| POST | `/messages/chats/:id/pin` | Yes | Pin/unpin chat |
| POST | `/messages/chats/:id/mute` | Yes | Mute/unmute |
| POST | `/messages/chats/:id/archive` | Yes | Archive chat |
| POST | `/messages/chats/:id/unarchive` | Yes | Unarchive |
| POST | `/messages/chats/:id/theme` | Yes | Set chat theme |
| DELETE | `/messages/chats/:id/clear` | Yes | Clear messages |
| GET | `/messages/chats/:id/search` | Yes | Search messages (in-memory decryption) |
| POST | `/messages/chats/:id/suggestions` | Yes | AI chat suggestions |
| POST | `/messages/check-content` | Yes | Harsh-word detection |
| GET | `/messages/backgrounds` | Yes | Chat background presets |

### Beats (Streaks)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/beats` | Yes | List beats with state filter |
| POST | `/beats/start` | Yes | Start beat with match |
| POST | `/beats/:id/complete` | Yes | Complete daily beat |
| POST | `/beats/:id/miss` | Yes | Mark as weak |
| POST | `/beats/:id/expire` | Yes | Expire (lost) |
| POST | `/beats/:id/restore` | Yes | Restore to active |
| POST | `/beats/:id/archive` | Yes | Archive beat |

### Feed, Stories, Videos

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/feed` | Yes | Get feed posts (cursor-paginated) |
| POST | `/feed` | Yes | Create post |
| PUT | `/feed/:id` | Yes | Edit post |
| DELETE | `/feed/:id` | Yes | Delete post |
| POST | `/feed/:id/react` | Yes | React to post |
| POST | `/feed/:id/comments` | Yes | Comment on post |
| GET | `/feed/:id/comments` | Yes | Get post comments |
| GET | `/stories` | Yes | Get stories (grouped by author, 7-day expiry) |
| GET | `/stories/mine` | Yes | Own stories with insights |
| POST | `/stories` | Yes | Create story |
| POST | `/stories/:id/view` | Yes | Mark viewed |
| POST | `/stories/:id/like` | Yes | Toggle like |
| GET | `/stories/:id/comments` | Yes | Story comments (threaded) |
| POST | `/stories/:id/comments` | Yes | Add comment |
| DELETE | `/stories/:id` | Yes | Delete story |
| POST | `/stories/:id/post-to-feed` | Yes | Convert to feed post |
| GET | `/videos` | Yes | List videos (category filter) |
| POST | `/videos` | Yes | Upload video |
| POST | `/videos/:id/react` | Yes | React to video |
| POST | `/videos/:id/view` | Yes | Record view |

### Creativity

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/creativity/categories` | Yes | List categories with counts |
| GET | `/creativity/feed` | Yes | AI-personalized creativity feed |
| GET | `/creativity/items` | Yes | List items (filter, sort) |
| POST | `/creativity/items` | Yes | Create item |
| POST | `/creativity/items/:id/react` | Yes | React → recalculates trend score |
| POST | `/creativity/items/:id/comments` | Yes | Comment → recalculates trend |
| POST | `/creativity/items/:id/view` | Yes | Record view → recalculates trend |
| POST | `/creativity/items/:id/move` | Yes | Send Miamo Move to creator |
| POST | `/creativity/items/:id/share` | Yes | Share item |
| GET | `/creativity/trends` | Yes | Trending items |

### Matrimonial (Date to Marry)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/matrimonial/profile` | Yes | Own matrimonial profile (auto-creates) |
| PUT | `/matrimonial/profile` | Yes | Update profile (40+ fields) |
| GET | `/matrimonial/browse` | Yes | Browse with filters (religion, caste, city, etc.) |
| GET | `/matrimonial/browse/advanced` | Yes | Advanced filters (height, weight, numerology) |
| POST | `/matrimonial/access/request` | Yes | Request contact access |
| GET | `/matrimonial/access/incoming` | Yes | Pending access requests |
| POST | `/matrimonial/access/:id/:action` | Yes | Grant/deny/revoke access |
| GET | `/matrimonial/compatibility/:userId` | Yes | Ashtakoota Kundli compatibility (8-koot scoring) |
| GET | `/matrimonial/numerology` | Yes | Pythagorean + Vedic numerology analysis |
| GET | `/matrimonial/numerology/compatibility/:userId` | Yes | Numerology compatibility |
| GET | `/matrimonial/templates` | Yes | 32 bio-data template designs |
| POST | `/matrimonial/chat/send` | Yes | Send DTM message |
| GET | `/matrimonial/chat/:userId` | Yes | Get DTM conversation |
| GET | `/matrimonial/chat` | Yes | List DTM conversations |

### Vibe Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/vibe-check` | Yes | Create vibe (mood, energy, topics, intent) |
| GET | `/vibe-check` | Yes | Vibe history |
| GET | `/vibe-check/latest` | Yes | Current active vibe |
| GET | `/vibe-check/matches` | Yes | Vibe-compatible users |

### Safety

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/safety/report` | Yes | Report user |
| POST | `/safety/block` | Yes | Block user |
| POST | `/safety/unblock` | Yes | Unblock user |
| GET | `/safety/reports` | Yes | Own reports |
| GET | `/safety/tips` | Yes | Safety tips |

### Activity & Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/activity/track` | Yes | Track user activity |
| GET | `/activity/analysis` | Yes | Full behavioral analysis |
| GET | `/notifications` | Yes | List notifications |
| GET | `/notifications/count` | Yes | Unread count |
| POST | `/notifications/mark-read` | Yes | Bulk mark-read |
| POST | `/notifications/:id/read` | Yes | Mark single as read |

### Real-time (SSE)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/events/stream` | Yes | SSE stream — receives `new-message`, `new-notification`, `beat-update`, `chat-update` events |

**Total: ~145 API endpoints** across 7 services.

---

## Data Structures & Algorithms

All custom implementations live in `services/shared/cache.ts` and `services/shared/algorithms.ts`.

### Data Structure Implementations

| Structure | Implementation | Use Case | Time Complexity |
|-----------|---------------|----------|-----------------|
| **LRU Cache** | Doubly-linked list + HashMap | Profile/discover/feed caching with TTL | $O(1)$ get, $O(1)$ put, $O(1)$ eviction |
| **Min Heap** | Array-based binary heap | Top-K profile selection in Discover | $O(\log n)$ insert, $O(\log n)$ extract-min |
| **Trie** | Character-node prefix tree | Autocomplete search suggestions | $O(m)$ insert/lookup ($m$ = key length) |
| **Bloom Filter** | Bit array + $k$ hash functions | Fast "already seen" profile checks | $O(k)$ lookup, ~1% false positive rate |

### Cache Instances

| Cache | Max Size | TTL | Purpose |
|-------|----------|-----|---------|
| `profileCache` | 500 | 10 min | User profiles |
| `discoverCache` | 200 | 30 sec | Discover results |
| `feedCache` | 200 | 30 sec | Feed results |
| `aiMatchCache` | 100 | 5 min | AI suggestions |
| `activityCache` | 300 | 15 min | Behavior summaries |
| `suggestionCache` | 200 | 2 min | Chat suggestions |

### Discover Ranking Algorithms

The Discover page has 6 tabs, each using a distinct scoring algorithm:

| Tab | Algorithm | Key Signals |
|-----|-----------|-------------|
| **For You** | Cosine similarity on learned preference vectors | City/intent/age preferences, dwell-time boost, interest overlap, vibe compatibility, behavioral penalties |
| **New** | Exponential recency decay: $45 \cdot e^{-0.15d}$ | Join date freshness, profile completeness, photo quality proxy |
| **Active** | Responsiveness weighting | Online status, response rate, avg response time, content creation frequency |
| **Verified** | Inverse-frequency interest weighting: $10 - \log_2(\text{popularity})$ | Interest rarity, profile depth, lifestyle alignment, age Gaussian ($\sigma=5$) |
| **Serious** | Multi-dimensional compatibility | Values (20), lifestyle (20), family goals (15), age Gaussian ($\sigma=3$), location, substance alignment |
| **AI Picks** | Weighted ensemble (6 sub-models) | Collaborative (20%), behavioral (20%), compatibility (25%), engagement (15%), temporal (10%), vibe (10%) |

All algorithms: filter candidates → compute scores → insert into MinHeap → extract top-20.

### AI Match Scoring Formula

$$\text{Score} = 0.25 \cdot \text{InterestOverlap} + 0.15 \cdot \text{LifestyleMatch} + 0.10 \cdot \text{ZodiacCompat} + 0.15 \cdot \text{CommunicationStyle}$$
$$+ 0.10 \cdot \text{DistanceDecay} + 0.10 \cdot \text{ActivityRecency} + 0.05 \cdot \text{MutualConnections} + 0.10 \cdot \text{BehavioralAffinity}$$

**Behavioral Affinity**: Analyzes `UserActivity` records to identify patterns — profiles matching traits of previously liked users receive boosted scores.

### Creativity Feed Ranking

$$\text{Score} = \text{EngagementVelocity} + \text{QualityRatio} + \text{CategoryAffinity} + \text{InterestMatch} + \text{RecencyDecay} \cdot e^{-0.035h}$$

Comments weighted 3× higher than reactions for quality signal. Diversity enforcement prevents feed homogenization.

### DTM (Matrimonial) Compatibility

| Dimension | Weight | Signals |
|-----------|--------|---------|
| Religion & Values | 25% | Religion match, caste, manglik |
| Family | 20% | Family type, status, values |
| Education & Career | 15% | Education level, income |
| Location | 10% | City match, region proximity |
| Age | 10% | Gaussian proximity scoring |
| Lifestyle | 10% | Diet, smoking, drinking alignment |
| Partner Preferences | 10% | Listed preferences match |

Gotra conflict applies a hard penalty. Ashtakoota scoring uses 8-koot system (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi) out of 36 points.

### Search Ranking

Multi-signal scoring using Levenshtein distance, token matching, prefix boost, and fuzzy similarity:

$$\text{SearchScore} = w_1 \cdot \text{ExactMatch} + w_2 \cdot \text{PrefixMatch} + w_3 \cdot \text{FuzzySimilarity} + w_4 \cdot \text{TokenOverlap}$$

---

## Security Model

### Authentication
- bcrypt password hashing (12 salt rounds)
- JWT access tokens (HS256, 7-day expiry)
- Refresh token rotation (30-day expiry)
- Session tracking with device/browser/OS/IP/location
- Rate-limited login (30 attempts / 15 min per IP)

### Data Protection
- AES-256-GCM message encryption at rest (per-message random IV)
- In-memory decryption for search (plaintext never persisted)
- Helmet.js security headers (CSP, HSTS, X-XSS-Protection, noSniff)
- CORS whitelist with credentials
- Header sanitization (strips `x-forwarded-host`, `x-original-url`)
- Request ID injection for tracing
- Input sanitization (XSS prevention via `sanitize()` on all user text)

### Privacy Controls
- Granular visibility (online status, read receipts, last active, typing indicators)
- Disappearing messages (24h auto-delete)
- Block/report system with audit trail
- GDPR data export endpoint
- Account deactivation/deletion
- Searchability toggles (name, city, Miamo ID)

### Rate Limiting
- Global: 5000 req / 15 min per user/IP
- Auth routes: 30 req / 15 min per IP
- Per-service: 1000–2000 req / 15 min
- **Distributed store**: gateway uses Redis-backed counters (`rate-limit-redis`) when `REDIS_URL` is set, so limits are shared across replicas. Falls back to per-process in-memory counters if Redis is unavailable (acceptable for single-process dev; **set `REDIS_URL` in any multi-replica deployment** or the limit is trivially bypassable).

### Production Secrets
Sensitive env vars (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_SERVICE_KEY`, `ENCRYPTION_KEY`, `ENCRYPTION_SALT`, `DATABASE_URL`, `REDIS_URL`) should live in a Kubernetes `Secret`, not the `ConfigMap`. See [k8s/templates/secret.yaml](k8s/templates/secret.yaml) for the template and recommended sources (External Secrets Operator → AWS/GCP Secret Manager / Vault, or Sealed Secrets). Backend services call `requireSecret()` at boot and **crash fast** if any required secret is missing in `NODE_ENV=production`.

### Connection Pooling
All database services configure Prisma connection limits:
- Auth/Users/Messaging: `connection_limit=10, pool_timeout=20`
- Social/Content: `connection_limit=15, pool_timeout=20`
- Notifications: `connection_limit=5, pool_timeout=20`

---

## Testing

### Full Test Suite

```bash
python3 scripts/test-all.py
```

19 automated tests covering all features:

| # | Test | Coverage |
|---|------|----------|
| 1 | Auth | Login, register, token validation |
| 2 | Profile | Get profile, update profile fields |
| 3 | Discover | Fetch profiles, filter params |
| 4 | AI Match | Compatibility scoring, suggestions |
| 5 | Matches | Mutual likes, accept/reject |
| 6 | Messages | Send, search encrypted, delete |
| 7 | Feed | Posts, likes, comments |
| 8 | Beats | Today's beat, completion, streaks |
| 9 | Creativity | Content creation, reactions |
| 10 | Stories | Create, view, reactions |
| 11 | Videos | Upload, list, views |
| 12 | Notifications | List, mark-read, count |
| 13 | Settings | Privacy, preferences |
| 14 | Safety | Report, block, unblock |
| 15 | Search | Name, city, interests |
| 16 | Activity | Behavioral logging |
| 17 | Bookmarks | Create, list, delete |
| 18 | Vibe Check | Create, match |
| 19 | Matrimonial | Browse, compatibility |

### Running Tests

```bash
# Full e2e suite
python3 scripts/test-all.py

# Unit tests (Vitest)
cd services/shared && npx vitest

# API smoke tests
bash scripts/api-test.sh

# Frontend type-check
cd services/web && npx tsc --noEmit
```

---

## Configuration

Environment settings in `configuration/<env>/values.yaml`:

```yaml
cluster_host: "127.0.0.1"
namespace: "miamo"
service_port: 443

container_ports:
  auth: 3201
  gateway: 3200
  web: 3100

database:
  password: "miamo"

secrets:
  jwt_secret: "miamo-dev-jwt-secret-change-in-production-2026"
```

### Environment Variables

See [.env.example](.env.example) for the full list. All secrets are required in
`NODE_ENV=production` — startup fails fast if any are unset. In `development`
and `test` they fall back to well-known dev defaults and the logger emits a
one-time warning per missing secret.

| Variable | Required in prod | Description |
|----------|------------------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | Access-token signing secret (HS256) |
| `JWT_REFRESH_SECRET` | yes | Refresh-token signing secret |
| `INTERNAL_SERVICE_KEY` | yes | Inter-service auth key (gateway ↔ services, SSE push) |
| `ENCRYPTION_KEY` | yes | Source key for AES-256-GCM message encryption (scrypt-derived) |
| `ENCRYPTION_SALT` | yes | Deterministic scrypt salt (rotating breaks existing ciphertexts) |
| `ALLOWED_ORIGINS` | no | Comma-separated CORS origins (defaults to `FRONTEND_URL`) |
| `LOG_LEVEL` | no | `debug` (dev) / `error` (prod) — logger verbosity |
| `NODE_ENV` | no | `development` \| `test` \| `production` |

Generate strong secrets with `openssl rand -hex 32`.

---

## Deployment

### Local Development
All services run as Node.js processes. PostgreSQL via Docker or local install.

### Docker Compose
`docker-compose.yml` orchestrates all services + Postgres + Redis:
```bash
bash scripts/start-services.sh docker up     # Build & start
bash scripts/start-services.sh docker down   # Stop & remove
```

### Kubernetes
Templates in `k8s/templates/` with YAML → `sed` placeholder rendering:
- **HPA**: 2–10 replicas per service (CPU target 70%)
- **PDB**: min 1 available during rollouts
- **NetworkPolicy**: Service-to-service isolation
- **Secrets**: JWT keys, DB credentials
- **ConfigMap**: From `configuration/<env>/values.yaml`

### CI/CD Flow
1. Build Docker images per service (multi-stage)
2. Run migration job (`prisma migrate deploy`)
3. Deploy services with rolling updates
4. Health check verification (`/health` + `/ready`)
5. Port forwarding for local access

---

## License

Private — All rights reserved.
