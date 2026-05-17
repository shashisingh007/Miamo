# Miamo Architecture

## Table of Contents

- [System Overview](#system-overview)
- [Service Architecture](#service-architecture)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [Algorithm Details](#algorithm-details)
- [Data Structure Implementations](#data-structure-implementations)
- [Security Model](#security-model)
- [Frontend Architecture](#frontend-architecture)
- [Real-time System](#real-time-system)
- [Deployment Architecture](#deployment-architecture)

---

## System Overview

Miamo is a microservice-based dating platform composed of 7 backend services, a Next.js frontend, and shared infrastructure (PostgreSQL, Redis). Communication flows through the API Gateway which handles JWT validation, rate limiting, and request proxying.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                     CLIENTS                                        │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│   │   Desktop    │  │   Mobile     │  │   Tablet     │  │   PWA        │           │
│   │   Browser    │  │   Browser    │  │   Browser    │  │              │           │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│          └─────────────────┴─────────────────┴─────────────────┘                   │
└──────────────────────────────────────┬──────────────────────────────────────────────┘
                                       │ HTTPS
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION LAYER                                       │
│   ┌──────────────────────────────────────────────────────────────────────────────┐   │
│   │                     Next.js 14 (SSR/SSG) — :3100                            │   │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐  ┌───────────────────┐  │   │
│   │  │ Zustand  │  │TanStack │  │  SSE    │  │ Router │  │ UI Components    │  │   │
│   │  │ Stores   │  │ Query   │  │ Client  │  │24 pages│  │ 15+ glass-morph  │  │   │
│   │  └─────────┘  └─────────┘  └─────────┘  └────────┘  └───────────────────┘  │   │
│   └──────────────────────────────────┬───────────────────────────────────────────┘   │
└──────────────────────────────────────┬──────────────────────────────────────────────┘
                                       │ HTTP /api/v1/*
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY — :3200                                    │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │  Helmet  │  │   CORS    │  │ Rate Limit│  │   JWT    │  │  http-proxy-mw   │   │
│  │  CSP     │  │ Whitelist │  │ 5000/15m  │  │ Extract  │  │  Route Dispatch  │   │
│  └──────────┘  └───────────┘  └───────────┘  └──────────┘  └────────┬──────────┘   │
│                                                                      │              │
│  ┌───────────────────────────────────────────────────────────────────┐│              │
│  │  SSE Hub: /api/v1/events/stream  ← Internal: /internal/push-event││              │
│  └───────────────────────────────────────────────────────────────────┘│              │
└──────────────────────────────────────┬───────────────────────────────┘──────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────────┐
         │              │              │              │                  │
   ┌─────▼─────┐  ┌─────▼─────┐  ┌────▼─────┐  ┌────▼──────┐  ┌───────▼─────┐
   │   Auth    │  │   Users   │  │  Social  │  │ Messaging │  │  Content    │
   │  :3201   │  │  :3202   │  │  :3203   │  │  :3204    │  │  :3205     │
   │          │  │          │  │          │  │           │  │            │
   │ Register │  │ Profiles │  │ Discover │  │ Chat      │  │ Feed       │
   │ Login    │  │ Settings │  │ AI Match │  │ Encrypt   │  │ Stories    │
   │ JWT/Ref  │  │ Search   │  │ Matches  │  │ Beats     │  │ Videos     │
   │ Sessions │  │ Privacy  │  │ Vibe     │  │ Suggest   │  │ Creativity │
   │          │  │ Bookmark │  │ Safety   │  │           │  │ DTM/Kundli │
   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬──────┘  └──────┬─────┘
        │              │             │              │                │
        │              │        ┌────▼────┐         │                │
        │              │        │ Notif.  │         │                │
        │              │        │ :3206   │         │                │
        │              │        └────┬────┘         │                │
        └──────────────┴─────────┬───┴──────────────┴────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              ┌─────▼──────┐          ┌───────▼───────┐
              │ PostgreSQL │          │    Redis      │
              │   :5432    │          │   :6379       │
              │            │          │               │
              │ 45 models  │          │ Sessions      │
              │ Composite  │          │ Rate limits   │
              │  indexes   │          │ Cache layer   │
              └────────────┘          └───────────────┘
```

### Service Communication Patterns

```
┌──────────────────────────────────────────────────────────────────────┐
│                     REQUEST FLOW (Synchronous)                      │
│                                                                      │
│  Client ──HTTP──▶ Gateway ──Proxy──▶ Service ──Prisma──▶ PostgreSQL  │
│  Client ◀─JSON───  Gateway ◀─JSON───  Service ◀─Result── PostgreSQL  │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                     EVENT FLOW (Real-time SSE)                       │
│                                                                      │
│  Service ──POST──▶ Gateway /internal/push-event                      │
│                           │                                          │
│                           ▼                                          │
│                    SSE Hub (in-memory Map<userId, Response[]>)        │
│                           │                                          │
│                           ▼ Server-Sent Event                        │
│                    Client EventSource ──▶ Event Handler              │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Service Architecture

### Gateway (port 3200)

**Middleware pipeline** (applied in order):

```
Request → Helmet → CORS → Compression → Cookie Parser → Morgan
        → Header Sanitization → Request ID → Global Rate Limit
        → JWT Extraction → Auth Rate Limit (auth routes)
        → Proxy Dispatch → Response
```

**Proxy routing** — 20 path prefixes mapped to 6 downstream services:

| Path Prefix | Service | Notes |
|-------------|---------|-------|
| `/api/v1/auth/*` | Auth (:3201) | Stricter rate limit (30/15min) |
| `/api/v1/users/*`, `/profiles/*`, `/search/*`, `/settings/*`, `/bookmarks/*` | Users (:3202) | |
| `/api/v1/discover/*`, `/matches/*`, `/ai-match/*`, `/safety/*`, `/vibe-check/*`, `/activity/*` | Social (:3203) | |
| `/api/v1/messages/*`, `/beats/*` | Messaging (:3204) | |
| `/api/v1/feed/*`, `/stories/*`, `/videos/*`, `/creativity/*`, `/matrimonial/*` | Content (:3205) | |
| `/api/v1/notifications/*` | Notifications (:3206) | |

**SSE Hub**: The gateway maintains an in-memory `Map<string, Response[]>` of active SSE connections. Services push events via the internal endpoint, and the gateway fans them out to the correct user connections. Supports multi-tab (array of responses per user).

### Auth Service (port 3201)

- **Registration flow**: Validate email uniqueness → bcrypt hash (12 rounds) → create User + Profile + Settings + PrivacySettings → generate Miamo ID → issue JWT + refresh token → create Session
- **Login flow**: Find user by email → bcrypt compare → issue tokens → create/update Session with device info (parsed from User-Agent)
- **Token lifecycle**: Access token (7d, HS256) + refresh token (30d) → refresh endpoint rotates tokens and updates session
- **Session tracking**: Records device, browser, OS, IP, approximate location per login

### Users Service (port 3202)

- **Profile update**: Accepts 20+ fields → sanitizes all text inputs → updates Profile → recalculates `profileScore` based on field completeness (photos, prompts, interests, bio, verified, etc.)
- **Search**: Multi-strategy scoring with `scoreSearch()` — Levenshtein distance, token matching, prefix boost, fuzzy similarity. Logs all queries in `SearchLog` table for analytics.
- **Privacy**: Granular toggles — `searchByName`, `searchByMiamoId`, `searchByCity`, `onlineStatus`, `lastActive`, `readReceipts`, `typingIndicator`, `disappearingMessages`, `profileVisibility`.

### Social Service (port 3203)

Largest backend service. Owns the core matching intelligence.

- **Discover**: 6 distinct algorithms selected by `filter` query param (see Algorithm Details)
- **AI Match**: Ensemble scoring with 11 sub-scores + "Why This Match" reason generation + icebreaker suggestions
- **Matches**: Bidirectional like tracking → auto-creates Match + Chat + Notification on mutual like
- **Miamo Moves**: Interest signals with custom message → creates Like + checks mutual → on mutual, fires match flow
- **Incoming management**: Hold/resume/hide states let users manage their incoming queue
- **Vibe Check**: Mood-energy-topic-intent matching with weighted scoring

### Messaging Service (port 3204)

- **Encryption**: AES-256-GCM with scrypt-derived key. Format: `enc:<iv>:<authTag>:<ciphertext>` (all hex). Per-message random 16-byte IV.
- **Search**: Fetches up to 500 encrypted messages → decrypts in-memory → text-filters → returns matches. Plaintext never touches the database.
- **Delete-for-all**: Only sender, within 2-hour window. Hard-deletes the record.
- **AI Suggestions**: Context-aware conversation starters — detects relationship stage, extracts sentiment, suggests based on mode (flirty/deep/fun/auto). Cached 2 minutes.
- **Beats/Streaks**: State machine with daily completion logic — count increments only when BOTH users send within a 24h window.

### Content Service (port 3205)

- **Feed**: Cursor-paginated posts with reactions, comments. Post types: thought, photo.
- **Stories**: 7-day expiry (configurable per story). Grouped by author for display. Viewer insights for story authors.
- **Creativity feed**: AI-personalized using collaborative filtering — category affinity, engagement velocity, interest match, diversity enforcement.
- **DTM (Matrimonial)**: Full matrimonial profile (40+ fields), Ashtakoota Kundli compatibility (8 koot, 36 points), Pythagorean + Vedic numerology, 32 bio-data templates, contact access management.

### Notifications Service (port 3206)

- Notification creation via internal endpoint (called by other services)
- SSE push to gateway for real-time delivery
- Read management (individual, bulk, mark-all)

---

## Data Flow

### Authentication Flow

```
┌────────┐     POST /auth/login      ┌─────────┐     bcrypt.compare     ┌──────────┐
│ Client │ ──────────────────────────▶│ Gateway │ ─────────────────────▶ │  Auth    │
│        │                            │         │                        │ Service  │
│        │     { user, tokens }       │         │     { JWT, refresh }   │          │
│        │ ◀──────────────────────────│         │ ◀───────────────────── │──▶ DB    │
└────────┘                            └─────────┘                        └──────────┘
    │
    │ Stores token in Zustand (persisted to localStorage)
    │ Opens SSE connection with token
    ▼
┌────────┐     GET /events/stream     ┌─────────┐
│ Client │ ──────────────────────────▶│ Gateway │ ──▶ SSE Hub (Map<userId, Response[]>)
│  SSE   │ ◀──── event: new-message   │         │
│  Conn  │ ◀──── event: notification  │         │
└────────┘                            └─────────┘
```

### Discover → Match → Chat Flow

```
┌────────┐  GET /discover    ┌─────────┐  Score profiles   ┌─────────┐
│ Client │ ────────────────▶ │ Gateway │ ────────────────▶ │  Social │
│        │◀── top-20 ranked  │         │◀── MinHeap top-K  │ Service │
└───┬────┘                   └─────────┘                   └────┬────┘
    │                                                           │
    │  POST /discover/like                                      │
    │ ──────────────────────────────────────────────────────────▶│
    │                                                           │
    │  If mutual like detected:                                 │
    │  ◀── SSE: "match" event                                   │
    │                                                           │
    │  1. Create Match record                                   │
    │  2. Create Chat with auto-generated first message         │
    │  3. Create Notification for both users                    │
    │  4. Push SSE events via Gateway hub                       │
    │                                                           │
    │  GET /messages/chats/:id/messages                         │
    │ ──────────────────────────────────────────────────────────▶│
    │  ◀── Decrypted messages                                   │
    │                                                           │
    │  POST /messages/chats/:id/messages                        │
    │ ──────────────────────────────────────────────────────────▶│
    │     1. Encrypt with AES-256-GCM                           │
    │     2. Store encrypted message                            │
    │     3. Push SSE: new-message to receiver                  │
    │  ◀── { sent message }                                     │
```

### Activity Tracking Data Flow

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         ACTIVITY INTELLIGENCE PIPELINE                        │
│                                                                                │
│  Frontend hooks:                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐             │
│  │ useTrackPageView │  │ useTrackDwell    │  │ trackClick       │             │
│  │ useTrackScroll   │  │ useTrackPhoto    │  │ trackContentEngage│             │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘             │
│           └─────────────────────┴─────────────────────┘                       │
│                                 │                                              │
│                    POST /activity/track                                        │
│                    (fire-and-forget, non-blocking)                             │
│                                 │                                              │
│                                 ▼                                              │
│                    ┌───────────────────────┐                                   │
│                    │   UserActivity Table  │                                   │
│                    │   ─────────────────   │                                   │
│                    │   action: like/pass/  │                                   │
│                    │     view/search/dwell │                                   │
│                    │   targetType: profile/│                                   │
│                    │     post/page/query   │                                   │
│                    │   durationMs: number  │                                   │
│                    │   metadata: JSON      │                                   │
│                    └───────────┬───────────┘                                   │
│                                │                                              │
│                    ┌───────────▼───────────┐                                   │
│                    │  UserActivityAnalyzer │                                   │
│                    │  ─────────────────── │                                   │
│                    │  • Engagement metrics │                                   │
│                    │  • Behavior clusters  │                                   │
│                    │  • Temporal patterns  │                                   │
│                    │  • Content taste      │                                   │
│                    │  • Response profile   │                                   │
│                    └───────────┬───────────┘                                   │
│                                │                                              │
│                    Feeds into AI Match + Discover algorithms                   │
│                    (preference learning, behavioral affinity)                  │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

45 Prisma models organized by domain. Shared schema at `services/shared/prisma/schema.prisma`.

### Entity Relationship Diagram

```
User ─┬── Profile ──── ProfilePhoto[] (position-ordered, max 6)
      │            ├── ProfilePrompt[] (question/answer, position-ordered)
      │            └── ProfileInterest[] (name tags)
      │
      ├── Settings ──── PrivacySettings
      │
      ├── Like[] ───────────────┐
      ├── MatchRequest[] ──────┤
      ├── MiamoMove[] ─────────┤── Mutual detection → Match + Chat
      ├── Match[] ─────────────┤
      ├── MatchFeedback[] ─────┘
      │
      ├── Chat[] ──── Message[] (AES-256-GCM encrypted)
      │
      ├── FeedPost[] ──── FeedComment[] + FeedReaction[]
      ├── Story[] ──── StoryView[] + StoryComment[] + StoryLike[]
      ├── Video[] ──── VideoComment[] + VideoReaction[]
      │
      ├── CreativityItem[] ──── CreativityReaction[] + CreativityComment[] + CreativityView[]
      ├── CreativityCategory[]
      ├── Trend[]
      │
      ├── Beat[] ──── BeatEvent[] (state machine: active→weak→lost→archived)
      │
      ├── MatrimonialProfile ──── BioDataAccessRequest[]
      ├── DtmMessage[]
      ├── VibeCheck[]
      │
      ├── Notification[]
      ├── Bookmark[]
      ├── UserActivity[] (behavioral intelligence)
      ├── Session[] (device, browser, OS, IP)
      ├── AuditLog[] (security audit trail)
      ├── SearchLog[] (query analytics)
      │
      ├── Block[]
      ├── Report[]
      └── DiscoverFilter
```

### Key Indexes

| Model | Index | Type | Purpose |
|-------|-------|------|---------|
| User | `email` | Unique | Login lookup |
| User | `username` | Unique | Profile URL |
| User | `miamoId` | Unique | Public ID |
| Profile | `[gender, city]` | Composite | Discover filter queries |
| Profile | `age` | Single | Age range filtering |
| Profile | `online` | Single | Active users filter |
| Like | `[fromUserId, toUserId, targetType, targetId]` | Unique | Prevent duplicate likes |
| Like | `[fromUserId, createdAt]` | Composite | User's like history |
| UserActivity | `[userId, action, targetType]` | Composite | Behavior analysis |
| UserActivity | `[userId, createdAt]` | Composite | Timeline queries |
| CreativityItem | `[trendScore DESC]` | Sorted | Trending feed |

---

## Algorithm Details

All algorithms implemented in `services/shared/algorithms.ts` (999 lines).

### Discover: ForYou Algorithm

**Approach**: Cosine similarity between user's learned preference vector and each candidate's feature vector.

**Complexity**: $O(n \cdot d \log k)$ where $n$ = candidates, $d$ = feature dimensions, $k$ = result size (20)

```
Input:  User preferences (learned from UserActivity), candidate profiles
Output: Top-20 ranked profiles

1. Build preference vector from user's behavioral history:
   - Liked city preferences (weighted by recency)
   - Preferred dating intent
   - Preferred age range (Gaussian fit)
   - Interest overlap frequency

2. For each candidate profile:
   a. Build feature vector (city, intent, age, interests, activity)
   b. Compute cosine similarity with preference vector
   c. Apply modifiers:
      - Dwell-time boost: profiles user spent >30s on get +15%
      - Vibe compatibility (if active): mood/energy/topic match
      - Behavioral penalty: profiles similar to passed ones get -20%
   d. Add random jitter (±5%) to prevent staleness

3. Insert (score, profile) into MinHeap
4. Extract top-20
5. Cache result in LRU (TTL: 30 seconds)
```

### Discover: New Users Algorithm

**Approach**: Exponential recency decay emphasizing fresh profiles.

**Complexity**: $O(n \log k)$

**Core formula**: $\text{Score} = 45 \cdot e^{-0.15d}$

where $d$ = days since registration.

Additional signals: profile completeness (photos, bio, prompts), photo count proxy for quality, early activity signal.

### Discover: Active Users Algorithm

**Approach**: Responsiveness-weighted ranking.

**Scoring components**:
- Online status (binary boost)
- Response rate (messages replied / messages received)
- Average response time (inverse, lower = better)
- Content creation frequency (posts + stories + creativity in last 7 days)
- Conversation initiation rate

### Discover: Verified Algorithm

**Approach**: Rare-interest inverse document frequency.

**Interest rarity score**: $\text{Rarity} = 10 - \log_2(\text{popularity})$

Additional: profile depth comparison (number of filled fields), lifestyle alignment count, age proximity Gaussian ($\sigma=5$).

### Discover: Serious Mode Algorithm

**Approach**: Multi-dimensional long-term compatibility scoring.

| Dimension | Max Points | Method |
|-----------|-----------|--------|
| Values & beliefs | 20 | Religion, zodiac, family values alignment |
| Lifestyle | 20 | Smoking, drinking, exercise, diet match |
| Family goals | 15 | Children intent, living arrangement |
| Age proximity | 15 | Gaussian: $e^{-\frac{(a_1 - a_2)^2}{2 \cdot 3^2}}$ ($\sigma=3$) |
| Location | 10 | Same city/region bonus |
| Substance alignment | 10 | Smoking/drinking/cannabis exact match |
| Intent match | 10 | Long-term / marriage alignment |

### Discover: AI Picks (Ensemble)

**Approach**: Weighted ensemble of 6 independent sub-models.

| Sub-model | Weight | Method |
|-----------|--------|--------|
| Collaborative filtering | 20% | Users-who-liked-X-also-liked-Y similarity |
| Behavioral sigmoid | 20% | Sigmoid-gated on positive action count: $\sigma(0.3 \cdot \text{likes} - 2)$ |
| Compatibility | 25% | Interest overlap + lifestyle + values composite |
| Engagement patterns | 15% | Conversation length, response speed, beat completion |
| Temporal correlation | 10% | Activity time overlap (both active same hours) |
| Vibe match | 10% | Current mood/energy/topic alignment |

**Feedback penalty**: Past passes/blocks/reports on a candidate reduce score by $-0.3$ per negative action.

### AI Match Score Breakdown

Detailed per-pair scoring with 11 sub-scores:

$$\text{TotalScore} = \sum_{i=1}^{11} w_i \cdot s_i$$

| Sub-score $s_i$ | Weight $w_i$ | Computation |
|-----------------|-------------|-------------|
| Interest overlap | 0.15 | Jaccard similarity on interest sets |
| Dating intent | 0.12 | Exact match bonus + partial overlap |
| Location | 0.10 | Same city = 1.0, same region = 0.6, else = 0.2 |
| Age compatibility | 0.08 | Gaussian: $e^{-\frac{\Delta^2}{50}}$ |
| Lifestyle | 0.10 | Smoking, drinking, exercise alignment count / max |
| Values | 0.10 | Religion, politics, family values overlap |
| Profile quality | 0.08 | Normalized field completeness (0–1) |
| Verification | 0.05 | Both verified = 1.0, one = 0.5, neither = 0.1 |
| Activity | 0.07 | Recency-weighted login frequency |
| Zodiac | 0.05 | Pre-computed 12×12 compatibility matrix (0.6–1.0) |
| Feedback penalty | 0.10 | Past negative interactions reduce score |

**Output includes**: total score, per-dimension breakdown, "Why This Match" text reasons, move recommendations, icebreakers, date ideas, concerns.

### Creativity Feed Scoring

$$\text{Score} = w_1 \cdot \text{EngVelocity} + w_2 \cdot \text{QualityRatio} + w_3 \cdot \text{CatAffinity} + w_4 \cdot \text{IntMatch} + w_5 \cdot \text{RecencyDecay} + w_6 \cdot \text{RelSignal} + w_7 \cdot \text{Diversity}$$

- **Engagement velocity**: Reactions per hour since creation
- **Quality ratio**: Comments × 3 weight (comments signal higher quality than reactions)
- **Category affinity**: User's historical engagement per category (view, react, comment counts)
- **Interest match**: Author's interests ∩ viewer's interests / viewer's total interests
- **Recency decay**: $e^{-0.035h}$ where $h$ = hours since creation
- **Relationship signal**: Matched/connected authors get a boost
- **Diversity**: Penalizes consecutive items from the same category

### DTM (Matrimonial) Scoring

Composite score from 7 dimensions (see README). Additionally:

**Ashtakoota (8-Koot) Kundli Matching** (max 36 points):

| Koot | Max Points | Tests |
|------|-----------|-------|
| Varna | 1 | Social compatibility |
| Vashya | 2 | Dominance/power dynamics |
| Tara | 3 | Birth star compatibility |
| Yoni | 4 | Physical/sexual compatibility |
| Graha Maitri | 5 | Mental compatibility (planetary lords) |
| Gana | 6 | Temperament (Dev/Manushya/Rakshas) |
| Bhakoot | 7 | Emotional compatibility (moon signs) |
| Nadi | 8 | Health/genetic compatibility |

Minimum 18/36 recommended for marriage compatibility.

### Search Ranking

Multi-strategy ranking using `scoreSearch()`:

```
For each candidate user:
  scoreNameSearch():   Levenshtein + exact prefix + token match on displayName
  scoreCitySearch():   Exact match bonus + prefix + fuzzy on city
  scoreIdSearch():     Exact match on miamoId/username

Final = max(nameScore, cityScore, idScore) + activityRecencyBoost
```

**Levenshtein complexity**: $O(m \cdot n)$ where $m, n$ = string lengths.

---

## Data Structure Implementations

All in `services/shared/cache.ts`.

### LRU Cache

```typescript
class LRUCache<T> {
  private capacity: number;     // Max entries (default 1000)
  private ttl: number;          // Time-to-live in ms
  private map: Map<string, Node<T>>;
  private head: Node<T>;        // Most recently used (sentinel)
  private tail: Node<T>;        // Least recently used (sentinel)
  private hits: number;
  private misses: number;
}
```

**Operations**:
- `get(key)` — $O(1)$ — HashMap lookup + move to head + TTL check
- `set(key, value)` — $O(1)$ — Insert at head, evict tail if over capacity
- `delete(key)` — $O(1)$ — HashMap delete + unlink node
- `stats()` — Hit/miss ratio for monitoring

**Eviction**: When `size > capacity`, removes tail node (least recently used). TTL-expired entries are lazily evicted on access.

### MinHeap

```typescript
class MinHeap<T> {
  private heap: { value: T; priority: number }[];
}
```

**Operations**:
- `insert(value, priority)` — $O(\log n)$ — Push to end, bubble up
- `extractMin()` — $O(\log n)$ — Remove root, heapify down
- `peek()` — $O(1)$ — Return root without removal
- `size` — $O(1)$

**Usage pattern** (top-K selection): Insert all candidates, then extract top-K. For Discover with $n$ candidates and $k=20$: $O(n \log k)$.

### Trie

```typescript
class TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  data?: any;
}

class Trie {
  insert(key: string, data?: any): void;          // O(m)
  search(prefix: string, limit?: number): any[];   // O(m + results)
}
```

**Memory optimization**: Lazy node creation — children maps are only instantiated when needed. Prefix sharing reduces memory for overlapping keys.

### BloomFilter

```typescript
class BloomFilter {
  private bits: Uint8Array;     // Bit array
  private numHashes: number;    // Hash function count (default 10)
  private size: number;         // Bit array size
}
```

**Operations**:
- `add(item)` — $O(k)$ — Set $k$ bit positions
- `has(item)` — $O(k)$ — Check $k$ bit positions (false positives possible)

**False positive rate**: With $k=10$ hash functions and bit array $10\times$ the item count, FPR ≈ 1%.

---

## Security Model

### Authentication Pipeline

```
┌───────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                            │
│                                                                   │
│  1. Client sends credentials (email + password)                   │
│  2. Auth service validates against bcrypt hash (12 rounds)        │
│  3. Issues JWT access token (HS256, 7-day expiry)                 │
│  4. Issues refresh token (30-day expiry)                          │
│  5. Creates Session record (device, browser, OS, IP, location)    │
│  6. Client stores tokens in Zustand (→ localStorage)              │
│                                                                   │
│  Subsequent requests:                                             │
│  7. Client sends Bearer token in Authorization header             │
│  8. Gateway extracts JWT, verifies signature                      │
│  9. Injects x-user-id + x-internal-key headers                   │
│  10. Downstream services trust x-user-id (internal network)       │
│                                                                   │
│  Token refresh:                                                   │
│  11. Client sends refresh token to /auth/refresh                  │
│  12. Auth service verifies, issues new access + refresh tokens    │
│  13. Updates session record                                       │
└───────────────────────────────────────────────────────────────────┘
```

### Encryption Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                 MESSAGE ENCRYPTION (AES-256-GCM)                    │
│                                                                     │
│  Key derivation:                                                    │
│    key = crypto.scryptSync(INTERNAL_SERVICE_KEY, salt, 32)          │
│    salt = 'miamo-e2e-salt-2026'                                     │
│                                                                     │
│  Encrypt (on send):                                                 │
│    iv = crypto.randomBytes(16)                                      │
│    cipher = createCipheriv('aes-256-gcm', key, iv)                  │
│    encrypted = cipher.update(plaintext) + cipher.final()            │
│    authTag = cipher.getAuthTag()                                    │
│    stored = "enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>"           │
│                                                                     │
│  Decrypt (on read):                                                 │
│    Parse iv, authTag, ciphertext from stored format                 │
│    decipher = createDecipheriv('aes-256-gcm', key, iv)              │
│    decipher.setAuthTag(authTag)                                     │
│    plaintext = decipher.update(encrypted) + decipher.final()        │
│                                                                     │
│  Search (in-memory):                                                │
│    Fetch up to 500 encrypted messages from DB                       │
│    Decrypt each in-memory                                           │
│    Text filter on decrypted content                                 │
│    Return matching messages (plaintext never persisted to disk)     │
└─────────────────────────────────────────────────────────────────────┘
```

### Security Headers (Helmet Configuration)

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline'` | Prevent XSS injection |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains; preload` | Force HTTPS |
| X-Content-Type-Options | `nosniff` | Prevent MIME sniffing |
| Referrer-Policy | `strict-origin-when-cross-origin` | Limit referrer exposure |
| X-XSS-Protection | `0` (disabled — CSP handles it) | Legacy XSS filter |

### Input Sanitization

All user-submitted text fields pass through `sanitize()` (from `services/shared/src/sanitize.ts`):
- Strips HTML/script tags
- Escapes HTML entities (`<`, `>`, `&`, `"`, `'`)
- Applied to: registration fields, profile updates, messages, comments, reports, search queries, stories, creativity content, DTM messages, notifications

---

## Frontend Architecture

### Component Hierarchy

```
<Providers>                          // TanStack QueryProvider + theme
  <AuthLayout>                       // Auth pages (login, register)
    Login / Register
  </AuthLayout>

  <MainLayout>                       // Authenticated shell
    ├── Sidebar (desktop lg+)        // 270px glass sidebar
    │   ├── AnimatedMiamoLogo        // Brand identity
    │   ├── NavMain (7 items)        // Primary navigation
    │   ├── NavSecondary (12 items)  // Feature navigation
    │   └── UserProfile footer       // Avatar, name, score ring
    │
    ├── Header                       // Page title, notifications, avatar
    │   ├── Page title (from route)
    │   ├── NotificationBell (count)
    │   └── Mobile avatar
    │
    └── Content area                 // Page components
        ├── AnimatePresence          // Page transitions
        └── ErrorBoundary            // Error recovery with retry
  </MainLayout>
</Providers>
```

### State Management

| Layer | Technology | Scope | Persistence |
|-------|-----------|-------|-------------|
| Auth state | Zustand `useAuthStore` | User, token, isAuthenticated | localStorage (`miamo-auth`) |
| Theme | Zustand `useThemeStore` | dark/light/system | localStorage (`miamo-theme`) |
| Discovery | Zustand `useDiscoveryStore` | currentIndex, filters | Memory only |
| Server data | TanStack Query | Profiles, messages, notifications | In-memory cache with stale-while-revalidate |
| Page UI | React useState | Forms, modals, tabs | Component lifecycle |

### Performance Optimizations

| Optimization | Implementation | Files affected |
|--------------|---------------|----------------|
| Search debouncing | `useDebounce(value, 300)` | Search page |
| Optimistic updates | UI updates immediately, rollback on API error | Feed likes, story likes, settings toggles |
| Component memoization | `useMemo` for array filter/sort, `useCallback` for child-passed handlers | Discover, matches, messages, beats, serious-mode |
| Lazy loading | `loading.tsx` skeletons for all heavy routes | 7 loading files |
| Image lazy load | `loading="lazy"` on all content images | 16 images across 9 files |
| Code splitting | Next.js App Router automatic per-page splitting | All 24 pages |

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `useDebounce` | Debounce a reactive value |
| `useDebouncedCallback` | Debounce a callback function |
| `useOptimistic` | Optimistic state with API persist + rollback |
| `useMemoCompare` | useMemo with custom equality comparison |
| `useSSE` | Subscribe to real-time SSE events |
| `useSSEConnection` | Manage SSE lifecycle tied to auth |
| `useTrackPageView` | Track page view + dwell time |
| `useTrackScrollDepth` | Track max scroll percentage |
| `useTrackDwell` | Report time spent on unmount |
| `useTrackPhotoViews` | Track photo carousel per-photo dwell |

---

## Real-time System

### SSE Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        SSE EVENT SYSTEM                            │
│                                                                    │
│  Gateway maintains:                                                │
│    sseClients: Map<string, Response[]>                             │
│    (userId → array of SSE response objects)                        │
│    Supports multi-tab: one user can have multiple connections      │
│                                                                    │
│  Connection lifecycle:                                             │
│    1. Client opens EventSource to /api/v1/events/stream            │
│    2. Gateway verifies JWT (header or query param)                 │
│    3. Adds Response to sseClients[userId]                          │
│    4. Sends keepalive comments every 30s                           │
│    5. On close: removes Response from array                        │
│                                                                    │
│  Event delivery:                                                   │
│    1. Service (e.g., Messaging) sends POST to                      │
│       http://gateway:3200/internal/push-event                      │
│       Body: { userId, event, data }                                │
│    2. Gateway looks up sseClients[userId]                          │
│    3. Writes `event: <name>\ndata: <json>\n\n` to all connections  │
│                                                                    │
│  Event types:                                                      │
│    • new-message     — New chat message received                   │
│    • new-notification — New notification                           │
│    • beat-update     — Beat streak status change                   │
│    • chat-update     — Chat metadata change (typing, read)         │
└────────────────────────────────────────────────────────────────────┘
```

### Frontend SSE Integration

```typescript
// Main layout establishes connection
useSSEConnection(isAuthenticated);

// Individual components subscribe to events
useSSE('new-message', (data) => {
  // Update chat list, show toast, play sound
});

useSSE('new-notification', (data) => {
  // Increment badge count, show toast
});
```

---

## Deployment Architecture

### Local Development

```bash
bash scripts/start.sh local
```

All 7 services + Next.js frontend run as Node.js processes. PostgreSQL required (Docker or local). Hot reload enabled for all services.

### Docker Compose

```yaml
# docker-compose.yml orchestrates:
services:
  postgres:    # PostgreSQL 16, port 5432
  redis:       # Redis 7, port 6379
  migrate:     # Prisma migrate + seed (runs once)
  auth:        # Node.js, port 3201
  users:       # Node.js, port 3202
  social:      # Node.js, port 3203
  messaging:   # Node.js, port 3204
  content:     # Node.js, port 3205
  notifications: # Node.js, port 3206
  gateway:     # Node.js, port 3200
  web:         # Next.js standalone, port 3100
```

### Kubernetes

```
┌───────────────────────────────────────────────────────────────────┐
│                     KUBERNETES CLUSTER                            │
│  Namespace: miamo                                                │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Deployments (per service)                                  │  │
│  │  • HPA: 2–10 replicas, CPU target 70%                      │  │
│  │  • PDB: minAvailable=1 during rollouts                     │  │
│  │  • Resource limits: CPU/memory per container                │  │
│  │  • Liveness: /health, Readiness: /ready                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Services (ClusterIP per deployment)                        │  │
│  │  Ingress (nginx → gateway → web)                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  StatefulSets                                               │  │
│  │  • PostgreSQL (PVC for data persistence)                    │  │
│  │  • Redis (ephemeral ok for cache)                           │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Jobs                                                       │  │
│  │  • migrate-job: prisma migrate deploy + seed (pre-deploy)   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  ConfigMaps & Secrets                                       │  │
│  │  • ConfigMap: from configuration/<env>/values.yaml          │  │
│  │  • Secrets: JWT keys, DB credentials, service keys          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  NetworkPolicy                                              │  │
│  │  • Services can only reach their own DB + gateway            │  │
│  │  • Gateway can reach all services                            │  │
│  │  • Web can only reach gateway                                │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Deployment Pipeline

```
1. Build Phase
   ├── Docker build per service (multi-stage: build → runtime)
   ├── Node.js Alpine base image
   └── Next.js standalone output mode

2. Migration Phase
   ├── Run migrate-job (prisma migrate deploy)
   ├── Run seed (20 test users)
   └── Verify schema state

3. Deploy Phase
   ├── Apply ConfigMap + Secrets from values.yaml
   ├── Apply Deployments (rolling update, maxSurge=1, maxUnavailable=0)
   ├── Apply Services + Ingress
   └── Apply HPA + PDB

4. Verify Phase
   ├── Wait for all pods Ready
   ├── Health check all services (/health)
   ├── Readiness check (/ready)
   └── Run smoke tests (scripts/test-all.py)
```
