# Miamo

A modern dating platform running on Kubernetes. Microservice architecture with per-service Dockerfiles.

## Architecture

```
Browser → Web (:3100) → Gateway (:3200) → Microservices → PostgreSQL + Redis
```

| Service | Port | Responsibility |
|---------|------|----------------|
| **web** | 3100 | Next.js frontend (SSR, standalone) |
| **gateway** | 3200 | API proxy, JWT validation, rate limiting |
| **auth** | 3201 | Login, register, tokens |
| **users** | 3202 | Profiles, settings, search |
| **social** | 3203 | Discover, matches, AI matching |
| **messaging** | 3204 | Chats, real-time messages |
| **content** | 3205 | Feed, stories, videos, creativity |
| **notifications** | 3206 | Push notifications, alerts |
| **postgres** | 5432 | Primary database (PostgreSQL 16) |
| **redis** | 6379 | Cache, sessions, rate limiting |

## Project Structure

```
Miamo/
├── services/               ← All application code
│   ├── auth/               ← Authentication service
│   ├── users/              ← User management
│   ├── social/             ← Social features (discover, match)
│   ├── messaging/          ← Chat & messages
│   ├── content/            ← Feed, stories, videos, creativity
│   ├── notifications/      ← Notification service
│   ├── gateway/            ← API gateway (entry point)
│   ├── web/                ← Next.js frontend
│   └── shared/             ← Shared database schema
│       └── prisma/
│           ├── schema.prisma
│           ├── migrations/
│           └── seed.ts
├── docker/                 ← One Dockerfile per service
│   ├── auth.Dockerfile
│   ├── users.Dockerfile
│   ├── social.Dockerfile
│   ├── messaging.Dockerfile
│   ├── content.Dockerfile
│   ├── notifications.Dockerfile
│   ├── gateway.Dockerfile
│   ├── web.Dockerfile
│   ├── migrate.Dockerfile
│   └── migrate-and-seed.sh
├── k8s/                    ← Kubernetes manifests
│   ├── namespace.yaml
│   ├── config.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   ├── auth.yaml
│   ├── users.yaml
│   ├── social.yaml
│   ├── messaging.yaml
│   ├── content.yaml
│   ├── notifications.yaml
│   ├── gateway.yaml
│   ├── web.yaml
│   └── migrate-job.yaml
├── scripts/                ← Developer scripts
│   ├── dev.sh              ← Build + deploy to k8s
│   ├── stop.sh             ← Scale down pods
│   ├── restart.sh          ← Rolling restart
│   ├── test.sh             ← Run test suite (26 checks)
│   ├── logs.sh             ← Tail pod logs
│   └── cleanup.sh          ← Delete namespace
└── .gitignore
```

## Quick Start

**Prerequisites:** Docker, minikube, kubectl

```bash
# Deploy everything to Kubernetes (builds images, runs migrations, starts pods)
bash scripts/dev.sh

# Run tests (26 checks: pod health, service connectivity, e2e auth)
bash scripts/test.sh

# Access services
kubectl port-forward svc/gateway 3200:3200 -n miamo &
kubectl port-forward svc/web 3100:3100 -n miamo &

# Open in browser
open http://localhost:3100
```

## Scripts

| Script | What it does |
|--------|--------------|
| `scripts/dev.sh` | Start minikube → build images → deploy pods → port-forward |
| `scripts/stop.sh` | Scale all deployments to 0 |
| `scripts/restart.sh [service]` | Rolling restart (one service or all) |
| `scripts/test.sh` | 26-point test suite |
| `scripts/logs.sh <service>` | Stream logs for a service |
| `scripts/cleanup.sh` | Delete miamo namespace (add `--full` to stop minikube) |

## Test Users

20 seed users, same data every run:

- **Email:** `miamo1@miamo.test` ... `miamo20@miamo.test`
- **Password:** same as username (`miamo1` / `miamo1`)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 (Alpine) |
| Language | TypeScript |
| Backend | Express.js + Prisma ORM |
| Frontend | Next.js 14 + Tailwind CSS |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Containers | Docker (per-service Dockerfiles) |
| Orchestration | Kubernetes (minikube local) |
| Auth | JWT + refresh tokens |
