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
├── scripts/                ← Single entry point
│   ├── start.sh           ← All commands: local, dev, stop, restart, logs, test, cleanup, status
│   └── start.ps1          ← Windows PowerShell equivalent (local + stop)
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

### Option A: Local Dev (Fastest — recommended for UI work)

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/shashisingh007/Miamo.git
cd Miamo
bash scripts/start.sh local
```

Opens http://localhost:3100 with mock data on all pages. No Docker/K8s needed.  
Hot reload — edit any file and see changes instantly.

### Option B: Full K8s Deploy (minikube)

**Prerequisites:** Docker, minikube, kubectl

```bash
bash scripts/start.sh dev
```

Builds all 9 Docker images, deploys to minikube, runs migrations, sets up port-forwarding.  
Web: http://localhost:3100 — API: http://localhost:3200

### Stop Everything

```bash
bash scripts/start.sh stop
```

### Windows

```powershell
# PowerShell — local dev
.\scripts\start.ps1 local

# PowerShell — stop
.\scripts\start.ps1 stop

# K8s deploy — use Git Bash or WSL
bash scripts/start.sh dev
```

## Commands

Everything runs through `scripts/start.sh`:

| Command | What it does |
|---------|--------------|
| `bash scripts/start.sh local` | Next.js dev server with mock data (fast, no Docker/K8s) |
| `bash scripts/start.sh dev` | Full K8s deploy (build → migrate → deploy → port-forward) |
| `bash scripts/start.sh stop` | Stop everything (local dev + K8s) |
| `bash scripts/start.sh restart [svc]` | Rolling restart (one service or all) |
| `bash scripts/start.sh logs <svc>` | Stream pod logs (auth, gateway, web, all, etc.) |
| `bash scripts/start.sh test` | Full test suite (pods, health, auth e2e) |
| `bash scripts/start.sh cleanup [--full]` | Delete namespace (--full also stops minikube) |
| `bash scripts/start.sh status` | Show local dev + K8s pod status |

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
1. `start.sh` has an inlined YAML parser that loads values into shell variables
2. Renders `k8s/templates/*.yaml` by replacing `__PLACEHOLDERS__`
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
