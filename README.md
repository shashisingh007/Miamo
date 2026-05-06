# Miamo

A modern dating platform built as containerized microservices. Rose-gold themed, Instagram-inspired architecture.

## Architecture

```
Browser → Web (:3100) → Gateway (:3200) → Microservices → PostgreSQL + Redis
```

| Service | Port | Responsibility |
|---------|------|----------------|
| **web** | 3100 | Next.js frontend (SSR, standalone) |
| **gateway** | 3200 | API proxy, JWT validation, rate limiting |
| **auth** | 3201 | Login, register, tokens, sessions |
| **users** | 3202 | Profiles, settings, premium features |
| **social** | 3203 | Discover, matches, AI matching, safety |
| **messaging** | 3204 | Chats, real-time messages |
| **content** | 3205 | Feed, stories, videos, creativity |
| **notifications** | 3206 | Push notifications, alerts |
| **postgres** | 5432 | Primary database (PostgreSQL 16) |
| **redis** | 6379 | Cache, sessions, rate limiting |

## Project Structure

```
Miamo/
├── services/                    ← All application services
│   ├── auth/                    ← Authentication service
│   ├── users/                   ← User management service
│   ├── social/                  ← Social features service
│   ├── messaging/               ← Messaging service
│   ├── content/                 ← Content service
│   ├── notifications/           ← Notification service
│   ├── gateway/                 ← API gateway (public entry point)
│   ├── web/                     ← Next.js frontend
│   └── shared/                  ← Shared Prisma schema, migrations, seed
│       └── prisma/
│           ├── schema.prisma    ← Database schema (single source of truth)
│           ├── migrations/      ← All DB migrations
│           └── seed.ts          ← Deterministic test data
├── docker/                      ← One Dockerfile per service
│   ├── auth.Dockerfile
│   ├── users.Dockerfile
│   ├── social.Dockerfile
│   ├── messaging.Dockerfile
│   ├── content.Dockerfile
│   ├── notifications.Dockerfile
│   ├── gateway.Dockerfile
│   ├── web.Dockerfile
│   ├── migrate.Dockerfile       ← DB migration init container
│   ├── migrate-and-seed.sh      ← Migration entrypoint script
│   └── config/                  ← Infrastructure configs
│       ├── postgres/
│       └── redis/
├── k8s/                         ← Kubernetes manifests (flat, one per resource)
│   ├── namespace.yaml
│   ├── config.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   ├── auth.yaml ... web.yaml
│   ├── gateway.yaml
│   ├── ingress.yaml
│   └── migrate-job.yaml
├── scripts/                     ← Developer scripts
│   ├── dev.sh                   ← Start all services
│   ├── stop.sh                  ← Stop all services
│   ├── restart.sh               ← Restart (--build to rebuild)
│   ├── test.sh                  ← Run test suite
│   ├── logs.sh                  ← Stream logs
│   └── cleanup.sh               ← Docker prune
├── tests/                       ← Test files
│   ├── e2e/
│   ├── integration/
│   └── unit/
├── docker-compose.yml           ← Local development orchestration
├── .dockerignore                ← Build context exclusions
└── package.json                 ← Root workspace config
```

## Quick Start

```bash
# Start everything (builds images + starts containers)
bash scripts/dev.sh

# Run tests (must pass before deploy)
bash scripts/test.sh

# Stop
bash scripts/stop.sh

# Stop + wipe database
bash scripts/stop.sh --clean
```

## Docker Strategy

**Why one Dockerfile per service?**
- Each service is independently trackable and deployable
- Clear ownership: `docker/auth.Dockerfile` → builds `services/auth/`
- Different build strategies per service type (gateway has no Prisma, web uses Next.js standalone)
- Easy to see what changed in a PR

**Build pattern (microservices):**
```
Stage 1: deps     → Install npm packages (cached layer)
Stage 2: prisma   → Generate Prisma client
Stage 3: build    → Compile TypeScript (tsc --removeComments)
Stage 4: runner   → Minimal production image (Alpine + compiled JS only)
```

**Image sizes:**
- Microservices: ~360MB (includes Prisma engine)
- Gateway: ~260MB (no Prisma)
- Web: ~240MB (Next.js standalone)
- All run as non-root user `miamo:1001`

## Kubernetes Deployment

```bash
# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/config.yaml
kubectl apply -f k8s/postgres.yaml -f k8s/redis.yaml
kubectl apply -f k8s/migrate-job.yaml
kubectl apply -f k8s/auth.yaml -f k8s/users.yaml -f k8s/social.yaml \
              -f k8s/messaging.yaml -f k8s/content.yaml -f k8s/notifications.yaml
kubectl apply -f k8s/gateway.yaml -f k8s/web.yaml
kubectl apply -f k8s/ingress.yaml
```

Each service runs as a **Deployment with 2 replicas**, with:
- Liveness probes (`/health`)
- Readiness probes (`/ready`)
- Resource limits (256Mi memory, 500m CPU)
- ConfigMap-based environment

## Testing

```bash
# Run full test suite (health + API + performance)
bash scripts/test.sh
```

Tests verify:
1. All containers healthy
2. API endpoints respond correctly
3. Auth flow works (login → token → authenticated requests)
4. Response times < 500ms

## Test Users

20 deterministic users (same data every seed run):
- **Email:** `miamo1@miamo.test` to `miamo20@miamo.test`
- **Password:** same as username (e.g., `miamo1` / `miamo1`)

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `scripts/dev.sh` | Build + start all containers |
| `scripts/stop.sh` | Stop containers (add `--clean` to wipe DB) |
| `scripts/restart.sh` | Restart (add `--build` to rebuild images) |
| `scripts/test.sh` | Run full test suite |
| `scripts/logs.sh` | Tail all logs (or `logs.sh gateway` for one) |
| `scripts/cleanup.sh` | Remove images/cache (add `--all` for full prune) |

## Tech Stack

- **Runtime:** Node.js 20 (Alpine)
- **Language:** TypeScript (strict)
- **Backend:** Express.js + Prisma ORM
- **Frontend:** Next.js 14 + Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Containers:** Docker + Docker Compose
- **Orchestration:** Kubernetes
- **Auth:** JWT + refresh tokens
