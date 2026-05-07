# Miamo 💕

A premium romantic dating platform with 3D glass UI, floating heart animations, and AI-powered matching. Runs on Kubernetes with microservice architecture.

## UI Design

- **Theme:** Soft pink romantic palette (`#FDF2F5` background)
- **Buttons:** 3D glass mirror effect with hover lift
- **Animations:** Floating hearts, heartbeat pulse, shimmer-glass effects
- **Logo:** Custom SVG with overlapping gradient hearts
- **Layout:** Frosted glass sidebar & header with `backdrop-blur-xl`

## Architecture

```
Browser → Web (:443) → Gateway (:443) → Microservices (:443) → PostgreSQL + Redis
```

| Service | K8s Port | Container Port | Responsibility |
|---------|----------|----------------|----------------|
| **web** | 443 | 3100 | Next.js frontend (SSR, standalone) |
| **gateway** | 443 | 3200 | API proxy, JWT validation, rate limiting |
| **auth** | 443 | 3201 | Login, register, tokens |
| **users** | 443 | 3202 | Profiles, settings, search |
| **social** | 443 | 3203 | Discover, matches, AI matching |
| **messaging** | 443 | 3204 | Chats, real-time messages |
| **content** | 443 | 3205 | Feed, stories, videos, creativity |
| **notifications** | 443 | 3206 | Push notifications, alerts |
| **postgres** | 5432 | 5432 | Primary database (PostgreSQL 16) |
| **redis** | 6379 | 6379 | Cache, sessions, rate limiting |

## Project Structure

```
Miamo/
├── configuration/          ← Environment configs (IP, ports, secrets)
│   ├── dev/
│   │   └── values.yaml    ← Development config
│   ├── staging/
│   │   └── values.yaml    ← Staging config
│   ├── prod/
│   │   └── values.yaml    ← Production config
│   ├── postgres/
│   │   ├── postgresql.conf
│   │   └── init.sh
│   └── redis/
│       └── redis.conf
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
├── k8s/                    ← Kubernetes manifest templates
│   └── templates/
│       ├── namespace.yaml
│       ├── configmap.yaml  ← Generated from configuration
│       ├── postgres.yaml
│       ├── redis.yaml
│       ├── service.yaml    ← Reusable microservice template
│       ├── gateway.yaml
│       ├── web.yaml
│       └── migrate-job.yaml
├── scripts/                ← All scripts take <env> argument
│   ├── _config.sh         ← Shared config loader (sourced by all)
│   ├── start.sh           ← Build + render templates + deploy
│   ├── stop.sh            ← Scale down pods
│   ├── restart.sh         ← Rolling restart
│   ├── test.sh            ← Run test suite
│   ├── logs.sh            ← Tail pod logs
│   └── cleanup.sh         ← Delete namespace
├── services/               ← All application code
│   ├── auth/
│   ├── users/
│   ├── social/
│   ├── messaging/
│   ├── content/
│   ├── notifications/
│   ├── gateway/
│   ├── web/                ← Next.js frontend
│   └── shared/             ← Shared Prisma schema + seed
└── .gitignore
```

## Quick Start

**Prerequisites:** Docker, minikube, kubectl

```bash
# Deploy everything (builds images, generates ConfigMap, runs migrations, starts pods)
bash scripts/start.sh dev

# Run tests
bash scripts/test.sh dev

# Access services (port-forward set up automatically by start.sh)
open http://127.0.0.1:443
```

## Scripts

All scripts accept an environment argument: `dev`, `staging`, `prod`

| Script | Usage | What it does |
|--------|-------|--------------|
| `start.sh` | `bash scripts/start.sh dev` | Build images → generate ConfigMap → deploy pods |
| `stop.sh` | `bash scripts/stop.sh dev` | Scale all deployments to 0 |
| `restart.sh` | `bash scripts/restart.sh dev [service]` | Rolling restart (one service or all) |
| `test.sh` | `bash scripts/test.sh dev` | Full test suite (pods, health, e2e) |
| `logs.sh` | `bash scripts/logs.sh dev gateway` | Stream logs for a service |
| `cleanup.sh` | `bash scripts/cleanup.sh dev [--full]` | Delete namespace (--full stops minikube) |

## Configuration

**Single source of truth** — all environment settings in `configuration/<env>/values.yaml`.  
Change IP, ports, secrets, replicas in ONE place → propagates to all k8s manifests automatically.

```yaml
# configuration/dev/values.yaml
cluster_host: "127.0.0.1"    # ← Change to your IP
namespace: "miamo"
service_port: 443             # ← All services exposed on 443

container_ports:              # Internal container ports
  auth: 3201
  gateway: 3200
  web: 3100

database:
  password: "miamo"           # ← Change per environment

secrets:
  jwt_secret: "..."           # ← Change per environment
```

**How it works:**
1. `scripts/_config.sh` parses the YAML into shell variables
2. `start.sh` renders `k8s/templates/*.yaml` by replacing `__PLACEHOLDERS__`
3. Generated manifests applied to cluster — no manual editing needed

## Test Users

20 seed users (consistent across environments):

- **Email:** `miamo1@miamo.test` ... `miamo20@miamo.test`
- **Password:** same as username (`miamo1` / `miamo1`)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 (Alpine) |
| Language | TypeScript |
| Backend | Express.js + Prisma ORM |
| Frontend | Next.js 14 + Tailwind CSS + Framer Motion |
| UI | 3D Glass / Romantic Pink Theme |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Containers | Docker (per-service Dockerfiles) |
| Orchestration | Kubernetes (minikube local, k8s pods) |
| Configuration | YAML per environment |
| Auth | JWT + refresh tokens |
