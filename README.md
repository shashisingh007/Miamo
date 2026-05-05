<p align="center">
  <img src="https://via.placeholder.com/120x120/8B5CF6/FFFFFF?text=M" alt="Miamo" width="120" />
</p>

<h1 align="center">Miamo</h1>
<p align="center"><strong>Where connections become something real.</strong></p>
<p align="center">Premium dating + social + creativity platform — microservices architecture</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20-green" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue" />
  <img src="https://img.shields.io/badge/Express-4.21-lightgrey" />
  <img src="https://img.shields.io/badge/Next.js-14-black" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue" />
  <img src="https://img.shields.io/badge/Redis-7-red" />
  <img src="https://img.shields.io/badge/Docker-✓-2496ED" />
  <img src="https://img.shields.io/badge/Kubernetes-✓-326CE5" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Running Locally](#running-locally)
- [Running with Docker](#running-with-docker)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Where to See It](#where-to-see-it)
- [Project Structure](#project-structure)
- [Microservices](#microservices)
- [API Routing — How It Works](#api-routing--how-it-works)
- [Authentication Flow](#authentication-flow)
- [Database](#database)
- [Features](#features)
- [Testing](#testing)
- [Scripts Reference](#scripts-reference)
- [Environment Variables](#environment-variables)
- [Hosting Guide](#hosting-guide)
- [Test Users](#test-users)

---

## Overview

Miamo is an **Instagram-scale dating + social + creativity platform** built with a **microservices architecture**. Every feature runs as an independent service, communicating through an API Gateway. The web frontend is a Next.js 14 app that talks exclusively to the Gateway.

**Why microservices?**

- Each service can **scale independently** (messaging scales 4x, auth scales 3x in production)
- A crash in Content service doesn't take down Messaging
- Teams can **deploy services independently**
- **Mobile apps** (Android/iOS) use the exact same API — just call the Gateway

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│   Web (Next.js)  │  Android App  │  iOS App  │  API Client  │
└────────┬─────────┴───────┬───────┴─────┬─────┴──────┬───────┘
         │                 │             │            │
         ▼                 ▼             ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY (:3200)                         │
│   • JWT Validation    • Rate Limiting   • CORS               │
│   • Request Routing   • Auth Injection  • Health Aggregation │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬────────────────┘
   │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼
┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────────┐
│ Auth ││Users ││Social││Msg   ││Contnt││Notif │ │          │
│:3201 ││:3202 ││:3203 ││:3204 ││:3205 ││:3206 │ │  Redis   │
│      ││      ││      ││      ││      ││      │ │  :6379   │
└──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘ └──────────┘
   │       │       │       │       │       │
   ▼       ▼       ▼       ▼       ▼       ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL 16 (:5432)                       │
│              Shared database — Prisma ORM                    │
└─────────────────────────────────────────────────────────────┘
```

### How a Request Flows

1. **Client** sends `GET http://localhost:3200/api/v1/feed` with `Authorization: Bearer <token>`
2. **Gateway** extracts & verifies the JWT → gets `userId`
3. **Gateway** injects `x-user-id` + `x-internal-key` headers
4. **Gateway** proxies the request to **Content Service** at `:3205`
5. **Content Service** reads `x-user-id` from headers (trusts the internal key)
6. **Content Service** queries PostgreSQL via Prisma, returns JSON
7. **Response** flows back through Gateway to client

### Service-to-Service Communication

Services don't call each other directly. The Gateway handles all routing. For internal operations (e.g., creating a notification when someone matches), services call the **internal API**:

```
POST http://notifications:3206/internal/notifications
Header: x-internal-key: <shared-key>
Body:   { userId, type, title, body }
```

---

## Quick Start

### One command — everything runs:

```bash
npm start
```

Opens: **http://localhost:3100** (Web) + **http://localhost:3200** (API)

### Custom web port:

```bash
bash scripts/run-local.sh --web-port 4000
# → Web at http://localhost:4000
```

### With Docker:

```bash
npm run docker:up
```

---

## Running Locally

### Prerequisites

| Tool | Version | Required |
|------|---------|----------|
| Node.js | 20+ | Yes |
| PostgreSQL | 16+ | Yes (or Docker) |
| Redis | 7+ | Yes (or Docker) |

### Step-by-step

```bash
# 1. Clone & enter
git clone <repo-url> && cd Miamo

# 2. Start everything (installs deps + migrates + seeds + starts all services + web)
npm start

# 3. Open browser
open http://localhost:3100
```

**What `npm start` does automatically (7 steps):**

| Step | Action |
|------|--------|
| 1 | Checks Node.js, PostgreSQL, Redis — auto-starts DB via Docker if not found |
| 2 | Syncs Prisma schema to all 6 microservices |
| 3 | Runs `npm install` in root + all 7 services + web |
| 4 | Runs `prisma generate` + `prisma migrate deploy` |
| 5 | Seeds database with 20 test users |
| 6 | Starts all 8 processes (7 services + web) |
| 7 | Health-checks every service, shows summary |

**Flags:**

| Flag | Description |
|------|-------------|
| `--web-port <port>` | Custom web port (default: 3100) |
| `--gateway-port <port>` | Custom gateway port (default: 3200) |
| `--skip-seed` | Skip database seeding |
| `--skip-install` | Skip npm install (faster restart) |
| `--db-url <url>` | Custom database URL |

**Fast restart** (after first run):

```bash
npm run start:skip
```

**Stop:** `Ctrl+C`  
**Logs:** `.logs/<service>.log`

---

## Running with Docker

```bash
# Build & start everything
npm run docker:up

# Background mode
docker-compose up -d --build

# View logs
npm run docker:logs

# Check status
npm run docker:ps

# Stop
npm run docker:down

# Full reset (wipes database)
npm run docker:reset
```

Docker Compose starts: PostgreSQL → Redis → Migrate → Seed → Auth → Users → Social → Messaging → Content → Notifications → Gateway → Web

Each service has a **multi-stage Dockerfile** (deps → build → runner) for minimal images.

---

## Kubernetes Deployment

Three environments with [Kustomize](https://kustomize.io/) overlays:

```bash
npm run k8s:dev       # 1 replica each, development settings
npm run k8s:staging   # 2 replicas each, staging secrets
npm run k8s:prod      # 3-4 replicas, HPA autoscaling, production resources
```

### Production Scaling

| Service | Base Replicas | HPA Max | Notes |
|---------|---------------|---------|-------|
| Gateway | 3 | 20 | Entry point, high CPU |
| Auth | 3 | 15 | bcrypt is CPU-intensive |
| Users | 3 | 10 | Standard CRUD |
| Social | 3 | 10 | Discovery queries |
| Messaging | 4 | 25 | Highest traffic service |
| Content | 3 | 10 | Feed + stories |
| Notifications | 2 | 10 | Lower traffic |
| Web | 3 | 10 | SSR frontend |

Full deploy script:

```bash
npm run deploy   # Syncs Prisma → Builds Docker images → Starts → Health checks
```

---

## Where to See It

| What | URL | Description |
|------|-----|-------------|
| **🌐 Web App** | **http://localhost:3100** | Full Miamo web application |
| **🔌 API Gateway** | **http://localhost:3200** | All API requests go here |
| Gateway Health | http://localhost:3200/health | All services health status |
| Auth Service | http://localhost:3201/health | Auth health |
| Users Service | http://localhost:3202/health | Users health |
| Social Service | http://localhost:3203/health | Social health |
| Messaging Service | http://localhost:3204/health | Messaging health |
| Content Service | http://localhost:3205/health | Content health |
| Notifications | http://localhost:3206/health | Notifications health |
| PostgreSQL | localhost:5432 | DB (user: miamo, db: miamo_dev) |
| Redis | localhost:6379 | Cache |
| Prisma Studio | `npm run db:studio` | Visual database browser |

---

## Project Structure

```
Miamo/
├── README.md                     ← You are here
├── package.json                  ← Root scripts (start, test, deploy, docker)
├── docker-compose.yml            ← Full microservices orchestration
├── vitest.config.ts              ← Test config
│
├── services/                     ← 🔷 MICROSERVICES
│   ├── gateway/                  ← API Gateway (:3200) — see services/gateway/README.md
│   ├── auth/                     ← Auth Service (:3201) — see services/auth/README.md
│   ├── users/                    ← Users Service (:3202) — see services/users/README.md
│   ├── social/                   ← Social Service (:3203) — see services/social/README.md
│   ├── messaging/                ← Messaging Service (:3204) — see services/messaging/README.md
│   ├── content/                  ← Content Service (:3205) — see services/content/README.md
│   ├── notifications/            ← Notifications Service (:3206) — see services/notifications/README.md
│   └── shared/                   ← Shared Prisma schema
│
├── web/                          ← 🌐 FRONTEND (Next.js 14, Tailwind, Radix UI)
│   └── src/app/(main)/           ← Authenticated pages
│
├── api/                          ← Legacy monolith (reference + seed data)
├── k8s/                          ← ☸️ Kubernetes (base + dev + staging + prod)
├── docker/                       ← 🐳 Docker configs (postgres, redis)
├── tests/                        ← 🧪 Test suites (unit, integration, e2e)
└── scripts/                      ← 🔧 Automation (run-local, deploy, sync-prisma)
```

---

## Microservices

| Service | Port | Docs | Description | Routes |
|---------|------|------|-------------|--------|
| **Gateway** | 3200 | [README](services/gateway/README.md) | API routing, JWT validation, rate limiting | — |
| **Auth** | 3201 | [README](services/auth/README.md) | Registration, login, JWT tokens, refresh | 5 |
| **Users** | 3202 | [README](services/users/README.md) | Profiles, settings, privacy, search, GDPR export | 14 |
| **Social** | 3203 | [README](services/social/README.md) | Discover, matches, AI compatibility, safety | 17 |
| **Messaging** | 3204 | [README](services/messaging/README.md) | Chats, messages, reactions, beats/streaks | 19 |
| **Content** | 3205 | [README](services/content/README.md) | Feed, stories, videos, creativity showcase | 27 |
| **Notifications** | 3206 | [README](services/notifications/README.md) | Push notifications, unread counts | 5 |
| | | | **Total** | **87 routes** |

---

## API Routing — How It Works

All client requests go to the **Gateway** at `http://localhost:3200`. The Gateway validates auth and proxies to the right service.

### Route Map

| URL Prefix | → Target Service | Auth |
|------------|------------------|------|
| `/api/v1/auth/*` | Auth (:3201) | Public |
| `/api/v1/users/*` | Users (:3202) | Required |
| `/api/v1/profiles/*` | Users (:3202) | Required |
| `/api/v1/settings/*` | Users (:3202) | Required |
| `/api/v1/search/*` | Users (:3202) | Required |
| `/api/v1/discover/*` | Social (:3203) | Required |
| `/api/v1/matches/*` | Social (:3203) | Required |
| `/api/v1/ai-match/*` | Social (:3203) | Required |
| `/api/v1/safety/*` | Social (:3203) | Required |
| `/api/v1/messages/*` | Messaging (:3204) | Required |
| `/api/v1/beats/*` | Messaging (:3204) | Required |
| `/api/v1/feed/*` | Content (:3205) | Required |
| `/api/v1/stories/*` | Content (:3205) | Required |
| `/api/v1/videos/*` | Content (:3205) | Required |
| `/api/v1/creativity/*` | Content (:3205) | Required |
| `/api/v1/notifications/*` | Notifications (:3206) | Required |

### Gateway Middleware Stack

1. **Helmet** — Security headers
2. **CORS** — Allows `http://localhost:3100`
3. **Rate Limiter** — 5000 req / 15 min globally, 50 req / 15 min for auth
4. **JWT Extractor** — Reads `Authorization: Bearer <token>`, verifies, injects `x-user-id`
5. **Auth Guard** — Protected routes return 401 if no valid token
6. **Proxy** — `http-proxy-middleware` forwards to upstream service

---

## Authentication Flow

```
Client                    Gateway (:3200)              Auth (:3201)
  │                         │                              │
  │  POST /api/v1/auth/login│                              │
  │  { email, password }    │                              │
  │────────────────────────►│   Proxy (public route)       │
  │                         │─────────────────────────────►│
  │                         │                              │ bcrypt verify
  │                         │                              │ Generate JWTs
  │                         │  { accessToken, user }       │
  │                         │◄─────────────────────────────│
  │  { accessToken, user }  │                              │
  │◄────────────────────────│                              │
  │                         │                              │
  │  GET /api/v1/feed       │                              │
  │  Auth: Bearer <token>   │                              │
  │────────────────────────►│                              │
  │                         │  JWT verify → userId         │
  │                         │  Add x-user-id header        │
  │                         │  Proxy to Content :3205 ─────┼───► Content Service
  │                         │◄─────────────────────────────┼──── { data: [...] }
  │  { data: [...posts] }   │                              │
  │◄────────────────────────│                              │
```

**Token details:**

| Token | Expiry | Purpose |
|-------|--------|---------|
| Access Token | 7 days | API requests (`Authorization: Bearer <token>`) |
| Refresh Token | 30 days | Get new access token via `POST /api/v1/auth/refresh` |

---

## Database

**PostgreSQL 16** with **Prisma ORM**. Single shared schema across all services.

### Key Models (35 tables)

| Model | Used By | Description |
|-------|---------|-------------|
| User | Auth, Users | Core user record |
| Profile | Users, Social | Bio, age, city, preferences |
| ProfilePhoto | Users | Up to 6 photos |
| ProfilePrompt | Users | Hinge-style conversation starters |
| ProfileInterest | Users | Tags/interests |
| Settings | Users | Theme, notifications, language |
| PrivacySettings | Users | Visibility controls |
| Match | Social | Accepted connections |
| MatchRequest | Social | Pending requests |
| Like | Social | Likes/passes on profiles |
| Chat | Messaging | Conversation threads |
| Message | Messaging | Individual messages |
| Beat / BeatEvent | Messaging | Streak tracking |
| FeedPost | Content | Feed posts |
| Story / StoryView | Content | 24h ephemeral content |
| Video | Content | Short-form videos |
| CreativityItem | Content | Creative showcase pieces |
| Notification | Notifications | All notification types |
| Report / Block | Social, Users | Safety features |

### Database Commands

```bash
npm run db:migrate       # Apply migrations
npm run db:seed          # Seed 20 test users
npm run db:reset         # Reset + re-seed
npm run db:studio        # Visual database browser (opens in browser)
npm run db:generate      # Regenerate Prisma client
npm run prisma:sync      # Copy schema to all services
```

---

## Features

### 💜 Dating & Matching
- **Thoughtful Discovery** — Browse profiles with intent filters (serious, casual, friendship)
- **Comment-first matching** — Send a thoughtful comment instead of just swiping
- **Like / Pass** — Quick actions on discover cards
- **AI Compatibility Score** — Algorithm scores matches 0-100 with reasons
- **Match Requests** — Accept/reject incoming requests
- **Unmatch** — Soft-deactivate any match

### 💬 Messaging
- **Real-time Chats** — Per-match conversations
- **Message Reactions** — Emoji reactions on messages
- **Edit / Delete** — Edit sent messages, delete for self or all
- **Pin / Mute / Archive** — Chat organization
- **Daily Beats (Streaks)** — Snapchat-style streaks with matched users

### 📱 Content & Social
- **Feed** — Post thoughts, photos, moods (filter by type)
- **Stories** — 24h ephemeral content with view tracking
- **Videos** — Short-form video sharing with reactions + comments
- **Creativity Showcase** — Art, music, writing, photography, dance, comedy, fashion, cooking

### 👤 Profile
- **Profile Score** — 0-100 completeness (bio, photos, prompts, interests, verification)
- **Up to 6 Photos** — Ordered photo gallery
- **Hinge-style Prompts** — Conversation starters
- **Interest Tags** — Discoverable interests
- **Serious Mode** — Toggle for serious relationship seekers

### 🛡 Safety
- **Report Users** — Categorized reporting
- **Block / Unblock** — Block removes all connections
- **Safety Tips** — In-app safety guidance
- **Privacy Controls** — Toggle search visibility, online status, read receipts

### ⚙️ Settings
- **Themes** — Dark, lavender, midnight, sunset, ocean
- **Notifications** — Granular on/off for matches, messages, likes, comments
- **GDPR Export** — Download all your data
- **Account Deactivation** — Temporary deactivation + reactivation

---

## Testing

```bash
npm test                  # All tests (unit + integration)
npm run test:unit         # Unit tests only (per-service)
npm run test:integration  # Cross-service integration tests
npm run test:e2e          # Full user journey (requires running services)
npm run test:watch        # Watch mode
```

### Test Files

| Type | File | Tests |
|------|------|-------|
| Unit | `tests/unit/auth.test.ts` | Register, login, logout, refresh, /me |
| Unit | `tests/unit/users.test.ts` | Profiles, settings, search |
| Unit | `tests/unit/social.test.ts` | Discover, matches, AI-match, safety |
| Unit | `tests/unit/messaging.test.ts` | Chats, messages, beats |
| Unit | `tests/unit/content.test.ts` | Feed, stories, creativity, videos |
| Unit | `tests/unit/notifications.test.ts` | Notifications, internal endpoint |
| Unit | `tests/unit/gateway.test.ts` | Auth guard, CORS, 404 |
| Integration | `tests/integration/auth-users.test.ts` | Register → update profile → verify |
| Integration | `tests/integration/services.test.ts` | Cross-service content, messaging, notifications |
| E2E | `tests/e2e/user-journey.test.ts` | Full 17-step user journey via Gateway |

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm start` | **Start all services + web locally** |
| `npm run start:skip` | Fast restart (skip install + seed) |
| `npm run dev:services` | Dev mode with hot-reload for all services |
| `npm test` | Run unit + integration tests |
| `npm run test:e2e` | Run E2E tests (services must be running) |
| `npm run docker:up` | Build + start with Docker Compose |
| `npm run docker:down` | Stop Docker services |
| `npm run docker:reset` | Wipe DB + restart everything |
| `npm run docker:logs` | Tail all Docker logs |
| `npm run deploy` | Full Docker deploy with health checks |
| `npm run k8s:dev` | Deploy to Kubernetes (development) |
| `npm run k8s:staging` | Deploy to Kubernetes (staging) |
| `npm run k8s:prod` | Deploy to Kubernetes (production) |
| `npm run prisma:sync` | Sync Prisma schema to all services |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Seed test data (20 users) |
| `npm run db:studio` | Open visual database browser |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://miamo:miamo_dev_pass@localhost:5432/miamo_dev` | PostgreSQL |
| `REDIS_URL` | `redis://localhost:6379` | Redis |
| `JWT_SECRET` | `miamo-dev-jwt-secret-...` | JWT signing secret |
| `JWT_REFRESH_SECRET` | `miamo-dev-refresh-secret-...` | Refresh token secret |
| `INTERNAL_SERVICE_KEY` | `miamo-internal-dev-key` | Service-to-service auth |
| `FRONTEND_URL` | `http://localhost:3100` | CORS origin |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3200` | Web → Gateway URL |
| `PORT` | varies per service | Service port |

---

## Hosting Guide

### Option 1: Docker Compose (VPS / Single Server)

```bash
git clone <repo> && cd Miamo
npm run deploy
# → http://<server-ip>:3100
```

### Option 2: Kubernetes (AWS EKS / GCP GKE / Azure AKS)

```bash
# Build & push images
for svc in gateway auth users social messaging content notifications; do
  docker build -t your-registry/miamo-$svc services/$svc/
  docker push your-registry/miamo-$svc
done

# Deploy
kubectl apply -k k8s/prod
```

### Option 3: Cloud PaaS

Each service can deploy independently to Railway, Render, AWS ECS, Google Cloud Run, or Fly.io.

### Production Checklist

- [ ] Change all JWT secrets to random 256-bit values
- [ ] Change `INTERNAL_SERVICE_KEY` to a secure random string
- [ ] Use managed PostgreSQL (AWS RDS, Cloud SQL)
- [ ] Use managed Redis (ElastiCache, Memorystore)
- [ ] Configure HTTPS/TLS
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Set up CI/CD pipeline
- [ ] Enable HPA autoscaling

---

## Test Users

After seeding, 20 users are available (password for all: **`Miamo@12345`**):

| # | Email | Name | City |
|---|-------|------|------|
| 1 | miamo1@miamo.test | Aria Chen | San Francisco |
| 2 | miamo2@miamo.test | Marcus Rivera | New York |
| 3 | miamo3@miamo.test | Sofia Andersen | Copenhagen |
| 4 | miamo4@miamo.test | Kai Yamamoto | Tokyo |
| 5 | miamo5@miamo.test | Zara Okafor | Lagos |
| 6-20 | miamo6-20@miamo.test | ... | Various cities |

---

<p align="center">Built with 💜 by the Miamo team — © 2026</p>
