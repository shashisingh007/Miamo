# DevOps — How code becomes an app Priya uses

**TL;DR (Meera-level):** A developer pushes code → GitHub Actions runs tests + builds a Docker container → the container is deployed to Kubernetes (an automated building manager) → Priya's phone automatically starts using the new version. If anything looks wrong, Kubernetes rolls back to the last known-good version in about thirty seconds. Nobody has to wake up at 3 AM.

**TL;DR (Arjun-level):** Miamo is a monorepo of eleven Node 20 LTS services (`gateway`, `auth`, `users`, `social`, `messaging`, `content`, `notifications`, `ingest`, `tracking-worker`, plus a Next.js `web` and a `shared` package) backed by Postgres 16 and Redis 7. Local dev runs bare-metal via `scripts/start.sh local dev` or via `docker compose up`. Production runs on Kubernetes using rendered manifests from `k8s/templates/`. CI on GitHub Actions runs unit tests (vitest) and per-service `tsc --noEmit`. Migrations are forward-only Prisma SQL files applied via a one-shot migrate job. There are 17 loops (13 v6/v6.5/v6.6/v7 + 4 v3.6.0: intentInference, exposureScheduler, stableMatchTop10, fairnessAudit) in the tracking-worker, all gated behind feature flags (see `docs/ARCHITECTURE.md:115`). The big foot-gun is that `services/shared/node_modules` is the single source for `@prisma/client` — every service resolves Prisma through it.

---

## How to read this document

Pick the lane that matches your role. Each section is written twice: first in plain language so a PM or designer can follow, then with the engineering specifics underneath.

- **Meera (non-technical, exec / investor / founder-curious):** Read "The story of one deploy" and the "Three stages" overview. Stop there.
- **Priya (PM, designer, QA, user-facing):** Read sections 1 ("Repo layout"), 2 ("Local development"), 11 ("Deployment runbook overview"), and 12 ("Local QA scripts").
- **Ravi (frontend engineer, infra-curious):** Read sections 1–5 and 8 ("Observability"). You will rarely need sections 6, 7, or 9.
- **Arjun (backend engineer, on-call):** Read everything. Sections 7 (worker loops), 9 (cold storage), and 11 (deployment runbook) matter when you are paged.
- **Devika (SRE, infra owner):** This is your home page. Cross-reference it with `RUNBOOK.md`, `SECURITY.md`, and `the canonical docs (TRACKING.md, ALGORITHMS.md, DATA_MODEL.md)` §8 (the tracking pipeline cheat-sheet).

If you are reading this on a phone or in a hurry, jump to section 11. It has the survival commands.

---

## The story of one deploy

It's 2 PM on a Monday. A developer named Ravi has just fixed a bug in the chat service. He pushes the code to GitHub and goes to make a cup of chai. Here's what happens automatically while the kettle boils:

```
2:00 pm  Ravi pushes code to main
2:01 pm  GitHub Actions starts: lint + typecheck + unit tests (vitest)
2:05 pm  Tests pass. GitHub Actions builds a Docker container
2:07 pm  Container pushed to the private registry
2:08 pm  Staging cluster auto-pulls the new container
2:12 pm  Playwright smoke tests run: login → discover → chat → send
2:15 pm  Ravi (or the on-call engineer) clicks "Approve prod deploy"
2:16 pm  Production deploys 5 % canary
2:20 pm  Canary is healthy, scales to 100 %
2:25 pm  All users on the new chat code. Ravi sips chai. Nobody noticed.
```

If anything breaks between 2:16 and 2:20, the cluster auto-rolls back to the previous version in roughly thirty seconds. Priya (the user) never sees a broken screen. The kettle is louder than the deploy.

The reason a sentence like "5 % canary" is meaningful here, and not just buzzword bingo, is that Kubernetes natively supports per-pod traffic shaping, health checks, and rolling updates. We have not bolted on a custom traffic manager. The pieces are all stock and you can read every line in `k8s/templates/`.

---

## The three stages: laptop → compose → kubernetes

Miamo runs in three different shapes depending on whether you are coding, testing locally, or shipping.

| Stage | Command | What runs | When you use it |
|-------|---------|-----------|------------------|
| **Your laptop** | `cd services/<svc> && npm run dev` | One service, `tsx watch`, auto-reload | Writing code, hot-iterating |
| **Bare-metal local** | `miamo start` | All 7 backend services (no Docker overhead) | Full-stack manual QA, e2e tests |
| **Docker Compose** | `miamo docker up` | Postgres + Redis + all services in containers | Reproducing CI failures, container debugging |
| **Kubernetes (k8s)** | `miamo k8s <env>` | Postgres + Redis + services + HPA + PDB | Dev / staging / prod environments |

**Plain English:** there are three settings on the dial. The leftmost is "I am writing code right now and I want changes to appear on screen in 600 ms." The middle is "I want to see the whole system running on my laptop." The rightmost is "I am shipping this to real users."

**Engineering:** all three modes are scripted in `scripts/start.sh` behind a single unified verb set (`start / stop / restart / status / logs / test`). The 2-arg shorthand `<mode> <env>` is sugar for `<mode> start <env>` (e.g. `k8s prod` ≡ `k8s start prod`). Manifest rendering is done by `sed` substitution inside the script's k8s `start` action, which renders into `/tmp/miamo-k8s-rendered/<env>/`, applies them, and runs the migrate job — all in one shot. There is no Helm chart yet, and no separate `render` / `migrate` / `rollback` verbs: rollback is `kubectl rollout undo` directly. This is intentionally simple. When the team or topology grows we will graduate to Helm or Kustomize, but right now `sed` is auditable in a hundred lines and Helm is not.

---

## 1. Repo layout (single-page summary)

```
Miamo/
├── services/
│   ├── shared/                  # Prisma schema, shared TS helpers, vitest tests live here
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Single canonical schema for ALL services
│   │   │   ├── migrations/      # Forward-only SQL files
│   │   │   └── seed.ts          # Demo users + relationships
│   │   ├── src/
│   │   │   ├── service.ts       # createPrisma, applyBaseMiddleware, installHealthRoutes
│   │   │   ├── validate.ts      # Zod middleware
│   │   │   ├── schemas.ts       # All request-body Zod schemas
│   │   │   ├── errorHandler.ts  # 4xx/5xx → JSON envelope
│   │   │   ├── metrics.ts       # Prometheus middleware + counters
│   │   │   ├── audit.ts         # Audit-log helper
│   │   │   └── ...              # 40+ shared modules
│   │   ├── algorithms.ts        # 17 ranked algos + V7 modules
│   │   ├── negative-signal-engine.ts
│   │   └── activity-analyzer.ts
│   ├── gateway/      # :3200  Edge router + auth fan-out
│   ├── auth/         # :3201  Sign-up, login, OAuth, OTP, JWT refresh
│   ├── users/        # :3202  Profile, settings, voice fingerprint
│   ├── social/       # :3203  Discover, swipe, match, why-explainer
│   ├── messaging/    # :3204  Chats, reactions, beats, anti-ghost
│   ├── content/      # :3205  Spotlight, family-brief, AI Move, creativity
│   ├── notifications/# :3206  Push, in-app, dispatch
│   ├── ingest/       # :3260  Tracking ingest (writes to Redis Stream)
│   ├── tracking-worker/ # :3261 17 loops (13 v6/v6.5/v6.6/v7 + 4 v3.6.0: intentInference, exposureScheduler, stableMatchTop10, fairnessAudit), Redis Stream consumer
│   └── web/          # :3100  Next.js 14 app, Server + Client components
├── docker/                      # One Dockerfile per service (multi-stage)
├── docker-compose.yml           # Local full-stack
├── k8s/templates/               # 14 manifest templates (sed-rendered)
├── configuration/
│   ├── dev/values.yaml
│   ├── staging/values.yaml
│   └── prod/values.yaml
├── scripts/
│   ├── start.sh        # The one-stop deploy script
│   ├── qa-runs/                 # Python phase-* QA scripts
│   └── test-all.py              # Local test runner shim
├── tests/                       # Vitest top-level (concurrency, ledger)
├── docs/
│   ├── DEVOPS.md                # ← you are here
│   ├── RUNBOOK.md
│   ├── SECURITY.md
│   ├── ARCHITECTURE.md
│   ├── CHANGELOG.md

├── .env.example                 # Source of truth for env-var names
├── .nvmrc                       # 20 (Node 20 LTS)
└── package.json                 # Root: workspaces + dev tooling
```

**Plain English:** every service has its own folder under `services/`. The "brain" of the system — the schema, the algorithms, the validators — lives in `services/shared/` and every other service depends on it. The infrastructure config (Docker, Kubernetes) lives at the top level. The runnable scripts live in `scripts/`. The docs live in `docs/`. There are no hidden files.

**Engineering:** the monorepo is npm-workspaces-based but each service has its own `package.json` and its own `node_modules`. The single exception is `@prisma/client`, which is resolved through `services/shared/node_modules` because the schema is generated there. This is the foot-gun documented in section 5.

---

## 2. Local development

### Prerequisites

**Plain English:** install Node, install Docker, clone the repo, copy the example env file, run two commands. You are coding in five minutes.

**Engineering:** the toolchain is intentionally narrow.

| Tool | Version | Why |
|------|---------|-----|
| Node | 22 LTS (see `.nvmrc`) | Fastest stable ESM + native fetch |
| npm | 10+ | Workspaces support |
| Docker | 24+ | For Postgres + Redis containers |
| Colima | latest | Mac alternative to Docker Desktop |
| Python | 3.11+ | For `scripts/qa-runs/phase-*.py` and `scripts/test-all.py` |
| psql | 16 | For applying production migration SQL by hand |

On macOS, install Colima with `brew install colima docker docker-compose` and run `colima start --cpu 4 --memory 8 --disk 60`. On Linux, the regular `docker` and `docker-compose-plugin` packages are fine. Windows is supported only through WSL2 + Docker Desktop; native Windows is not tested.

`nvm use` at the repo root will pick up the right Node version from `.nvmrc`. If you skip this step you will get either silent type errors or a runtime crash on `URLPattern` (Node 20 lacks it).

### 5-minute quickstart

**Plain English:** copy the example env, start the database, start the services, open the browser to localhost:3100.

**Engineering:**

```bash
# 1. Clone and enter
git clone git@github.com:miamo/miamo.git
cd miamo

# 2. Pick the right Node
nvm use            # or: nvm install 22 && nvm use 22

# 3. Install root + shared deps
npm install
cd services/shared && npm install && npx prisma generate && cd ../..

# 4. Configure env
cp .env.example .env
# Edit .env: POSTGRES_PASSWORD=miamo (or anything), JWT_SECRET=$(openssl rand -hex 64), etc.

# 5. Boot the infra
docker compose up -d postgres redis
# Wait ~5 s for postgres healthcheck

# 6. Apply migrations (first run only)
cd services/shared && npx prisma migrate deploy && cd ../..

# 7. Start every backend service
miamo start
# This runs `tsx watch services/<svc>/src/server.ts` for all 7 services
# Logs land in /tmp/miamo-logs/<svc>.log
# PIDs are tracked in /tmp/miamo-pids/<svc>.pid

# 8. Start the web frontend (separate terminal)
cd services/web && npm install && npm run dev
# http://localhost:3100

# 9. Stop everything
miamo stop
docker compose down
```

After step 7, you should see seven green check-marks. If any are red, run `miamo logs <svc>` to see what went wrong. The most common failure is `ECONNREFUSED 127.0.0.1:5432` which means step 5 (Postgres) is not up yet, or step 4 (env file) is missing a value.

### The bootstrap trap (READ THIS BEFORE YOU LOSE AN HOUR)

**Plain English:** the local-mode launcher does not read your `.env` file. It only knows the seven or eight base variables it sets by hand. If you flip on a feature flag in `.env` and start the stack expecting v8 endpoints, you will get 404s. The fix is one line.

**Engineering:** `local_env()` in `scripts/start.sh` hardcodes only the bare minimum:

```bash
local_env() {
  export DATABASE_URL='postgresql://miamo:miamo@localhost:5432/miamo?schema=public'
  export JWT_SECRET='miamo-dev-jwt-secret-change-in-production-2026'
  export INTERNAL_SERVICE_KEY='miamo-internal-dev-key'
  export ENCRYPTION_KEY='miamo-dev-encrypt-key-32-bytes!!'
  export NODE_ENV='development'
  # ... only service URLs after this
}
```

It does **not** source `.env`. Any `ALGO_V8_*`, `FEATURE_*`, or worker-loop env you set in `.env` will be invisible to the running services. The symptom is silent and infuriating:

- The services start clean. Health checks return 200.
- The new endpoints you wrote (e.g. `GET /v8/discover`) return 404 instead of 200.
- The worker loops you expect to fire silently stay disabled.
- Nothing in the logs tells you why.

**The fix:** before invoking `local_start`, source `.env` into the current shell:

```bash
set -a; source .env; set +a
miamo start
```

`set -a` exports every assignment automatically, `source .env` reads the file in the current shell, `set +a` restores normal behaviour. The exports survive into the subprocess. This is what every contributor learns the hard way once. Now you have learned it for free.

A more permanent fix would be to add `if [ -f .env ]; then set -a; . .env; set +a; fi` to `local_env()`. We have deliberately not done this yet because it would make the script silently consume whatever is on disk, which is the wrong default for a tool that also drives staging and prod renders.

### Working on one service at a time

If you are iterating on a single backend service (say `messaging`), you do not need all eleven running.

```bash
# Start infra
docker compose up -d postgres redis

# In a separate terminal
cd services/messaging
npm install                # first time only
DATABASE_URL=postgresql://miamo:miamo@localhost:5432/miamo \
JWT_SECRET=dev \
INTERNAL_SERVICE_KEY=dev \
NODE_ENV=development \
PORT=3204 \
npm run dev
```

Hot reload is roughly 600 ms via `tsx watch`. If you also need the gateway in front (recommended, because the web app calls the gateway), start gateway too on :3200.

If you need a fully integrated experience, fall back to the full `local dev` path. The cost is RAM, roughly 1.6 GB at idle, which is fine on a 16 GB laptop.

### Working on the web app

```bash
cd services/web
npm install
npm run dev          # Next.js on :3100, fast-refresh on
```

The web app expects `NEXT_PUBLIC_API_URL=http://localhost:3200`. The dev server proxies nothing — every API call goes directly to the gateway. CORS is permissive in dev because `CORS_BYPASS=true` is set; never set this in staging or prod.

---

## 3. Production topology

**Plain English:** production runs three identical sets of services — dev, staging, and prod — in three Kubernetes namespaces. Each has its own database, its own secrets, its own DNS. A bug in dev cannot reach prod. Promotion is by re-deploy, not by data migration.

**Engineering:** all environments are described by the same set of `k8s/templates/`. The substitutions are env-specific and come from the `k8s_env_config()` function in `scripts/start.sh`. Per-env values that overflow what `sed` can comfortably do are pinned in `configuration/{dev,staging,prod}/values.yaml`.

### Namespaces

| Namespace | Cluster | DNS suffix | Replicas (per svc) | DB host |
|-----------|---------|------------|--------------------|---------|
| `miamo-dev` | shared k8s | `dev.miamo.in` | 1 | `postgres.miamo-dev.svc.cluster.local` |
| `miamo-staging` | shared k8s | `staging.miamo.in` | 2 | `postgres.miamo-staging.svc.cluster.local` |
| `miamo-prod` | dedicated k8s | `miamo.in` | 3 (min) → 10 (max) | `postgres.miamo-prod.svc.cluster.local` |

Namespace isolation is enforced by `NetworkPolicy` (default-deny + allow-list) and by separate `Secret` and `ConfigMap` objects per namespace. There are no cross-namespace references.

### The 14 manifest templates

Each lives in `k8s/templates/` and is rendered by `sed` substitution. One-sentence summary for each:

1. **`namespace.yaml`** — Creates the `miamo-<env>` namespace and labels it so `NetworkPolicy` selectors match. Sole job: define the boundary inside which every other manifest lives.
2. **`configmap.yaml`** — Non-secret config: service URLs (`AUTH_SERVICE_URL`, `USER_SERVICE_URL`, …), log level, `FRONTEND_URL`, `NODE_ENV`, all `FEATURE_*` flags. Mounted as env vars on every Deployment.
3. **`secret.yaml`** — Encrypted-at-rest secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_SERVICE_KEY`, `ENCRYPTION_KEY`, `ENCRYPTION_SALT`, `TRACKING_HASH_SECRET`, `POSTGRES_PASSWORD`. Substituted from CI-injected variables (never committed).
4. **`postgres.yaml`** — Postgres 16 StatefulSet + PVC (50 Gi dev, 500 Gi prod) + headless Service. Persists across pod restarts. Backups are managed out-of-band by the cluster operator.
5. **`redis.yaml`** — Redis 7 StatefulSet with AOF persistence and `allkeys-lru` 256 MB cap (dev) / 2 GB cap (prod). Headless Service for in-cluster DNS.
6. **`migrate-job.yaml`** — One-shot `kind: Job` that runs `npx prisma migrate deploy` against the namespace's Postgres. Re-created on every deploy. Idempotent because Prisma migrations are forward-only and tracked in `_prisma_migrations`.
7. **`service.yaml`** — Templated per microservice (`auth`, `users`, `social`, `messaging`, `content`, `notifications`). Deployment + ClusterIP Service. Image is `${IMAGE_PREFIX}miamo-${svc}:${IMAGE_TAG}`. Readiness probe hits `GET /readyz`, liveness probe hits `GET /healthz`.
8. **`gateway.yaml`** — Deployment + NodePort Service (`30200`) for the API edge. The only service exposed externally besides `web`. Reads service URLs from the ConfigMap.
9. **`ingest.yaml`** — Deployment + Service for the tracking ingest endpoint (`:3260`). Writes raw events to Redis Stream `events:raw`. Stateless and horizontally scalable.
10. **`tracking-worker.yaml`** — Single-replica Deployment for the worker that consumes `events:raw`. **Must stay single-replica** because most loops are not shardable and would double-count if run twice.
11. **`web.yaml`** — Next.js Deployment + NodePort Service (`30100`). Reads `NEXT_PUBLIC_API_URL` pointing at the gateway.
12. **`hpa.yaml`** — Horizontal Pod Autoscaler for each scalable Deployment. Targets 70 % CPU utilisation. Min/max replicas vary by env (dev 1–2, staging 2–5, prod 3–10).
13. **`pdb.yaml`** — Pod Disruption Budget per Deployment. `minAvailable: 1` so node drains never take everything down at once.
14. **`network-policy.yaml`** — Default-deny ingress and egress per pod, then explicit allow rules: gateway can call services, services can call Postgres/Redis, only `gateway` and `web` are reachable from outside. Lateral movement is blocked at L4.

You will rarely edit these by hand. The script handles the per-env substitution. When you do edit them, search for the `__PLACEHOLDER__` strings and keep them intact.

### `configuration/{dev,staging,prod}/values.yaml`

Each `values.yaml` carries env-specific values that are awkward to express in shell variables. Examples: ingress hostnames, TLS cert references, CDN URLs, third-party provider keys (SendGrid, Twilio account SIDs), per-env feature flags. These are merged into the rendered manifests as a final pass.

A typical `values.yaml` looks like:

```yaml
hostnames:
  api: api.miamo.in
  web: app.miamo.in
ingress:
  className: nginx
  tls:
    - hosts: [api.miamo.in, app.miamo.in]
      secretName: miamo-prod-tls
features:
  ALGO_V8_DISCOVER_RANKER_ENABLED: "1"
  FEATURE_FAMILY_BRIEF_ENABLED: "1"
  STABLE_MATCH_ENABLED: "1"
providers:
  sendgrid: {fromAddress: noreply@miamo.in, region: us-east-1}
  twilio:   {region: in-south-1}
```

The dev and staging values mostly mirror prod with the flags flipped off and the hostnames swapped to `dev.miamo.in` / `staging.miamo.in`.

---

## 4. CI/CD

**Plain English:** every push and every pull-request triggers GitHub Actions. It runs two jobs: a unit-test job and a typecheck job. If either fails, the PR is blocked. There is no separate lint job today because we rely on the typecheck to surface most lint-class issues.

**Engineering:** the workflow lives at `.github/workflows/ci.yml`. It is short — fifty-five lines — and intentionally so. Anything more complex belongs in a separate workflow.

### `ci.yml` — what runs on every push/PR

```yaml
name: CI
on:
  push:
    branches: [main, 'v*']
  pull_request:
    branches: [main]
```

#### Job 1 — `test` (Tests & Type-check)

- Runs on `ubuntu-latest`, 10-minute timeout.
- Sets up Node 20 with npm cache. (Note: the repo's `.nvmrc` says 22; CI is pinned to 20 until the next refresh. We are tracking this as known drift; the tests pass under both.)
- `npm ci` at the repo root to install root dev tooling.
- `cd services/shared && npm install --no-audit --no-fund` to materialise the shared package and generate the Prisma client.
- `npm test -- --reporter=verbose` to run the vitest suite (225+ tests at last count).

The `--no-audit --no-fund` flags shave roughly 8 seconds off the install. The job is the critical-path gate — if it goes red, the PR cannot merge.

#### Job 2 — `typecheck` (TypeScript check, matrix per service)

- Same runner and timeout.
- `strategy.fail-fast: false` so we see every failure, not just the first.
- Matrix over the seven main services: `auth`, `users`, `social`, `messaging`, `content`, `notifications`, `gateway`. (Ingest, tracking-worker, and web are intentionally not in the matrix yet; their typecheck has been moved into the test job for those services.)
- Each matrix shard installs shared deps, then the per-service deps, then runs `npx tsc --noEmit`.

This pattern catches the most common bug: someone updates the schema in `services/shared/prisma/schema.prisma`, regenerates the Prisma client, but one of the seven downstream services has a type that depends on the old shape. Without the matrix, you would see the bug only when that service is built.

### What is **not** in CI yet

- **End-to-end Playwright tests.** They live in `tests/e2e/` (forthcoming) and run nightly against a dedicated `miamo-ci` namespace. The gating is manual: a deploy to prod requires a green nightly within 24 h.
- **Docker image build/push.** Today this happens out-of-band on a tagged release. A future workflow will wire `docker build && docker push` on every push to `main`.
- **Migration linting.** We do not yet run `squawk` or similar against the SQL in `services/shared/prisma/migrations/`. Reviewers do this by hand.
- **Security scanning.** Trivy and `npm audit` are run weekly via a cron-style workflow (`security.yml`) but not on every PR. Findings go to the SECURITY label.

### Dependabot

`.github/dependabot.yml` (if present) is configured for weekly npm bumps grouped by ecosystem: one PR for production deps, one for dev deps, one for type packages. Major-version bumps are flagged for manual review. GitHub Actions are bumped monthly. Docker base images (`node:22-alpine`, `postgres:16-alpine`, `redis:7-alpine`) are bumped on a quarterly cadence to stay on the latest patch.

### Branch protection

- `main` requires both CI jobs to be green.
- `main` requires one approving review.
- Force-pushes are disabled.
- The release branch pattern `v*` (e.g., `v3.5.0`) is hot-fix only and requires a code-owner approval.

---

## 5. Database

### Postgres 16

**Plain English:** there is one database per environment. Local dev runs it in Docker (`miamo-postgres` container). Production runs it as a `StatefulSet` inside the Kubernetes namespace with a persistent volume claim. Data survives container restarts, pod restarts, and rolling deploys.

**Engineering:** Postgres 16 alpine image. Container exposes 5432 internally; in dev the host port is mapped 1:1. Healthcheck is `pg_isready -U miamo` with a 5-second interval. The named volume `miamo_postgres_data` persists data across `docker compose down/up` cycles; only `docker compose down -v` wipes it. In production, the volume is a 50 Gi PVC (dev) / 500 Gi PVC (prod), backed by the cloud provider's block storage.

Connection pool sizing is per-service, driven by `createPrisma(connectionLimit, poolTimeout)` in `services/shared/src/service.ts`. Defaults: `connection_limit=10`, `pool_timeout=20`. The gateway uses a higher pool (25) because it fans out. The tracking-worker uses a lower pool (5) because it batches its writes.

### Prisma migration flow

There are two modes: dev (where new migrations are generated) and prod (where migrations are only applied).

**Dev mode — generate + apply:**

```bash
cd services/shared
# After editing schema.prisma:
npx prisma migrate dev --name <descriptive_name>
# Prisma:
#   1. Diffs schema.prisma against the database
#   2. Creates services/shared/prisma/migrations/<timestamp>_<name>/migration.sql
#   3. Applies the SQL to your local database
#   4. Regenerates @prisma/client into services/shared/node_modules/.prisma/client
```

**Prod mode — apply only:**

```bash
# Inside the migrate Job pod (or via kubectl exec):
cd /app/services/shared
npx prisma migrate deploy
# Applies any pending migrations in services/shared/prisma/migrations/
# Idempotent: skips migrations already in _prisma_migrations
```

For ad-hoc prod operations (rare, but sometimes needed for a one-off backfill), connect with `psql` directly:

```bash
kubectl -n miamo-prod exec -it deploy/postgres-client -- \
  psql "$DATABASE_URL" -f /scripts/oneoff/2026-06-25-backfill-spotlight.sql
```

Every prod SQL must be wrapped in a transaction and tested in dev + staging first. There is no rollback for committed SQL.

### Migration philosophy: forward-only

We never delete columns in the same release that stops writing to them. The rule is "expand, migrate, contract":

1. **Release N (expand):** add the new nullable column. Backfill in a background job overnight.
2. **Release N+1 (migrate):** update code paths to read from the new column. Keep the old column populated.
3. **Release N+2 (contract):** stop writing the old column. Mark it deprecated.
4. **Release N+3 (drop):** delete the old column.

This way, if Release N+1 has a bug, we can roll back to Release N without losing data and without a schema-rollback step. The cost is more deploys; the benefit is that a 3 AM rollback is a one-liner.

### The "shared node_modules" gotcha

**Plain English:** all eleven services use the same Prisma client. The client lives inside `services/shared/node_modules`. If you change the schema and forget to regenerate, every other service will throw type errors or runtime errors and you will think something is broken when in fact only the client is stale.

**Engineering:** because the Prisma schema is a single canonical file (`services/shared/prisma/schema.prisma`), and because `@prisma/client` is generated alongside that schema, the generated client lives at `services/shared/node_modules/.prisma/client` and is re-exported through `services/shared/node_modules/@prisma/client`. Every other service resolves `@prisma/client` through a symlink or relative path back to `services/shared/node_modules`.

The implications:

1. After any change to `schema.prisma`, run `cd services/shared && npx prisma generate`. This regenerates the client in place.
2. After regenerating, restart every running service. `tsx watch` does not pick up changes in `node_modules`.
3. If you see `Unknown field 'foo' on type 'User'` at runtime in (say) the social service, the symptom is almost always a stale client. Step 1 above fixes it.
4. CI catches this because the typecheck matrix runs `npm install` per service from scratch, which re-resolves the shared dep and forces regeneration.

A future refactor will lift `@prisma/client` out of `services/shared/node_modules` and into a top-level `node_modules` resolved via npm workspaces. We have deliberately deferred this until the schema stabilises in v3.6.

---

## 6. Redis 7

**Plain English:** Redis is the shared memory of the system — a fast in-memory database used for things that have to be quick but don't have to survive a server restart. We use it for three things: counting rate limits, remembering recent idempotency keys, and as the conveyor belt that carries tracking events from the front door to the worker that aggregates them.

**Engineering:** Redis 7 alpine image. AOF persistence enabled (`--appendonly yes`). Memory cap is 256 MB (dev) / 2 GB (staging) / 4 GB (prod) with `allkeys-lru` eviction. The named volume `miamo_redis_data` persists the AOF file across container restarts.

### The three uses

1. **Rate-limit counters.** Implemented in `services/shared/src/service.ts` (`applyBaseMiddleware`). Each route bucket is a Redis `INCR` against a key like `rl:auth:login:<ip>:<minute-bucket>`. Window is 15 minutes; cap is 2,000 requests per window by default, configurable per service. If Redis is unreachable, the limiter fails open with a warn log.
2. **Idempotency keys.** When a client sends an `Idempotency-Key` header on a write (POST `/messages`, POST `/swipe`, etc.), the server stores the request hash and response in Redis with a 24-hour TTL. A retry within that window returns the cached response without re-executing. Implemented in `services/shared/src/idempotency.ts`.
3. **Tracking stream `events:raw`.** A single Redis Stream that buffers every tracking event from `ingest` (`:3260`) until `tracking-worker` (`:3261`) consumes it. Trimmed via `MAXLEN ~ 10_000_000` so it cannot grow without bound. The consumer group is named `rollup`; XREADGROUP blocks for `TRACKING_READ_BLOCK_MS` (default 2 s) and reads up to `TRACKING_READ_COUNT` (default 500) events per batch.

### What Redis is **not** used for

- **No durable storage.** If you lose Redis you lose recent rate-limit state and any in-flight tracking events. Postgres is the source of truth.
- **No pub/sub for real-time messaging.** Real-time WebSocket fan-out goes via gateway → in-memory routing per pod. (A future iteration will use Redis pub/sub for cross-pod fan-out.)
- **No session store.** Sessions are stateless JWTs; refresh tokens live in Postgres.

If Redis is down for more than a few seconds, ingest 204s every event (the kill switch is `TRACKING_KILL=1`, which can also be flipped manually), and the rate limiter falls open. The user-facing flows degrade gracefully.

---

## 7. The 17 worker loops

**Plain English:** alongside the always-on services, we run a single "worker" service that does periodic chores: enriching match data, computing compatibility scores, archiving old events, and so on. Each chore is called a "loop." They run on timers, not in response to user requests. If you turn one off (or it crashes), no user-visible feature stops working immediately — only the background data quality degrades.

**Engineering:** the worker service is `services/tracking-worker/`. It is a single-replica Deployment because most loops are not shardable (running two replicas would double-count counters). Every loop is gated behind an env flag — turn them on selectively.

The full schedule cheat-sheet (mirrors `the canonical docs (TRACKING.md, ALGORITHMS.md, DATA_MODEL.md)` §8, expanded with the v3.6 additions):

| # | Loop | File | Schedule | Lookback | Batch / cap | Gate flag | Inputs | Outputs |
|---|------|------|----------|----------|-------------|-----------|--------|---------|
| 1 | **Rollup** | `rollup.ts` | continuous + 5 s flush | – | 500 read / 64 targets / 256 percentile / 2048 distinct | always on | `events:raw` (Redis Stream) | `EventAggHourly`, `EventAggDaily` |
| 2 | **Feature aggregator** | `feature.ts` | 5 min | 14 d hourly, 30 d daily | 200 users | always on | `EventAggHourly`, `EventAggDaily` | `FeatureSnapshot` |
| 3 | **Compatibility scoring** | `compat.ts` | 15 min | 24 h active, 14 d prior | 200 / 50 / top-20 | always on | `FeatureSnapshot`, `UserPair` | `PairCompatCache` |
| 4 | **Embedding refresh** | `embed.ts` | 30 min | 30 d | 200 | always on | profile + behaviour features | `UserEmbedding` |
| 5 | **Enrichment (DTM / peak / cadence)** | `enrich.ts` | 30 min | 7 d / 14 d / 90 d | – | `ALGO_V4_WORKERS_ENABLED` | `DtmMessage` (read-only) | `UserEnrichment` |
| 6 | **Daily-match generator** | `dailyMatch.ts` | 12 h + 60 s warmup | 7 d users, 14 d prior | 200 / 50, min score 70 | `ALGO_V4_WORKERS_ENABLED` | `PairCompatCache`, `FeatureSnapshot` | `DailyMatch` |
| 7 | **Safety rollup** | `safetyRollup.ts` | 5 min | 2 d | 64 targets | `SAFETY_ROLLUP_ENABLED` | `ReportEvent`, `SafetyEvent` | `SafetyAgg` |
| 8 | **First-move outcome attribution** | `firstMoveOutcome.ts` | 30 min | 25 h / 49 h | – | `FIRST_MOVE_OUTCOME_ENABLED` | `MessageEvent`, `MatchEvent` | `FirstMoveOutcome` |
| 9 | **Session summary** | `sessionSummary.ts` | 10 min | 26 h | 60 min gap, 30 s min duration | `SESSION_SUMMARY_ENABLED` | raw stream | `SessionSummary` |
| 10 | **Focus affinity (hourly)** | `focusAffinity.ts` | 5 min | 3 h | 256 keys | `FOCUS_AFFINITY_ENABLED` | `FeatureSnapshot` | `FocusAffinityHourly` |
| 11 | **Learner loop (online weights)** | `learnerLoop.ts` | 10 min | 1 d | 500 users, 200 samples/event | `LEARNER_LOOP_ENABLED` | `EventAggHourly`, click outcomes | `UserWeightProfile` |
| 12 | **Defer-pile pruner** | `deferPrune.ts` | 6 h | 30 d age | – | `DEFER_PRUNE_ENABLED` | `DeferredItem` | (deletes) |
| 13 | **Cold-store archive** | `cold-store.ts` | 24 h + startup | 90 d retention | 5,000 rows/page | always on | `EventAggDaily` (>90 d) | NDJSON.gz on disk |
| 14 | **Intent-Right-Now inference** | `intentRightNow.ts` | 30 s tick / 5 min batch | 30 min activity / 1 h recent | 200 users | `INTENT_INFERENCE_ENABLED` | recent events, presence | `IntentSnapshot` |
| 15 | **Exposure scheduler** | `exposureScheduler.ts` | 5 min | 24 h | 200 | `EXPOSURE_SCHEDULER_ENABLED` | `IntentSnapshot`, `DailyMatch` | `ExposureQueue` |
| 16 | **Stable-match Top-10 (Gale–Shapley)** | `stableMatch.ts` | 10 min | 7 d active, 30 d pass | propose 50 / out 10, min 6 d interval | `STABLE_MATCH_ENABLED` | `PairCompatCache`, swipe history | `StableTop10` |
| 17 | **Fairness audit** | `fairnessAudit.ts` | 10 min + 02:00 UTC daily | 7 d | event=`card.impression.50`, gini-alert 0.45 | `FAIRNESS_AUDIT_ENABLED` | impressions per user | `FairnessAuditReport` |

A note on numbers: earlier drafts of this doc showed 13 loops (the original v6/v6.5/v6.6/v7 tracking-worker set — rollup, feature, compat, embedding, enrich, dailyMatch, safetyRollup, firstMoveOutcome, sessionSummary, focusAffinity, learnerLoop, deferPrune, coldStore). v3.6.0 introduced four additional loops (intentInference, exposureScheduler, stableMatchTop10, fairnessAudit) — they ship in the same worker but each has its own gate flag and they default off so an accidental rollout cannot affect production behaviour. Canonical count is **17 loops** (see `docs/ARCHITECTURE.md:115`).

### Cross-cutting facts (do not skip)

- **Postgres tables touched by worker:** `EventAggHourly`, `EventAggDaily`, `FeatureSnapshot`, `PairCompatCache`, `ConsentEvent`, `SafetyAgg`, `FirstMoveOutcome`, `SessionSummary`, `FocusAffinityHourly`, `UserWeightProfile`, `DeferredItem`, plus read-only `DtmMessage`. User/match models are **never** mutated by the worker.
- **Hash secret rotation** = re-identification break for historical aggregates. New aggregates use the new secret; old aggregates become un-joinable.
- **No external services** for enrichment: embeddings are hashed locally, DTM topics are substring-matched, archives are local NDJSON.gz.
- **Concurrency:** ingest is stateless + horizontally scalable. Rollup is shardable via the `rollup` consumer group. **All other loops are NOT shardable** — running two replicas double-counts. Always run a single worker replica in prod.
- **Lossy edges:** ingest drops on Redis outage (200 OK from the client's perspective, but the event is gone). XACK timing on worker crash can produce duplicates — counters are additive, so the risk is over-count, not data corruption.

---

## 8. Observability

**Plain English:** every service exposes a `/metrics` endpoint that a tool called Prometheus scrapes every 30 seconds. That data is graphed in Grafana. When a graph crosses a threshold (latency > 500 ms, error rate > 1 %, queue depth > 100 k), an alert fires and the on-call engineer gets a page.

**Engineering:** the metrics layer is implemented in `services/shared/src/metrics.ts` and mounted by `applyBaseMiddleware` in every service via `metricsMiddleware(serviceName)`. The middleware is registered **before** the rate limiter so `/metrics` scrapes never trip the limiter and timing covers the full request lifecycle.

### Default Prometheus counters and histograms

| Metric | Type | Labels | Source |
|--------|------|--------|--------|
| `miamo_http_requests_total` | counter | `service`, `method`, `route`, `status` | per-request |
| `miamo_http_request_duration_seconds` | histogram | `service`, `method`, `route` | per-request |
| `miamo_http_errors_total` | counter | `service`, `method`, `route`, `status_class` (4xx/5xx) | per-request |
| `miamo_db_query_duration_seconds` | histogram | `service`, `model`, `op` | Prisma `$on('query')` hook |
| `miamo_redis_ops_total` | counter | `service`, `op`, `result` | Redis client wrapper |
| `miamo_tracking_events_ingested_total` | counter | `kind` | ingest service |
| `miamo_tracking_stream_lag` | gauge | – | scraped from Redis `XLEN` |
| `miamo_worker_loop_duration_seconds` | histogram | `loop` | each worker loop |
| `miamo_worker_loop_errors_total` | counter | `loop` | each worker loop |
| `miamo_idempotency_hits_total` | counter | `service`, `result` (hit/miss) | idempotency middleware |
| `miamo_jwt_verify_errors_total` | counter | `service`, `reason` | auth middleware |

Route labels are derived by `normaliseRoute()` in `services/shared/src/metrics.ts`. ID-shaped segments (numeric, UUID, hex≥16, slug≥24) are replaced with `:id`. Depth is capped at 6, after which the tail collapses to `…`. This keeps the label cardinality bounded.

### `/metrics` endpoint

Every service exposes `GET /metrics` in Prometheus text format. Scrape config (`prometheus.yml`):

```yaml
scrape_configs:
  - job_name: miamo
    kubernetes_sd_configs:
      - role: pod
        namespaces: {names: [miamo-prod]}
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: 'true'
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: '(.+)'
        replacement: '${1}'
```

Each Deployment annotates `prometheus.io/scrape: "true"` and `prometheus.io/port: "320X"`.

### Dashboards (Grafana)

There are five canonical dashboards:

1. **Gateway latency & error rate** — p50 / p95 / p99 by route, 5xx rate.
2. **Per-service health** — request rate, latency, error rate, CPU, memory, restart count.
3. **Postgres** — query latency, connection pool saturation, slow query log, lock waits.
4. **Redis** — ops/sec, memory usage, evicted keys, stream depth (`events:raw`).
5. **Tracking pipeline** — events ingested, worker loop durations, last successful run per loop, Gini coefficient (from fairness audit).

### Alert thresholds

| Symptom | Threshold | Severity |
|---------|-----------|----------|
| Gateway 5xx rate | > 1 % over 5 min | page |
| `events:raw` stream depth | > 100,000 | page (worker is down or stuck) |
| Postgres connection pool | > 95 % | page (query hang or pool leak) |
| Worker loop last-run | > 2× expected interval | page |
| Web LCP (p75) | > 3 s for 10 min | warn |
| Any service restart count | > 3 in 10 min | page |
| Disk on Postgres PVC | > 85 % | warn |
| Disk on cold-store volume | > 90 % | page (archive backlog) |

Pages route to PagerDuty → on-call engineer. Warnings route to a Slack channel only.

### Logs

All services log via `pino` in structured JSON. Each log line carries `requestId`, `service`, `level`, `time`, and `msg`. Logs are shipped to the cluster's log aggregator (Loki in dev/staging, ELK in prod). Retention is 30 days.

Sensitive fields (`password`, `token`, `email`, `phone`) are redacted by a `pino` serializer before they leave the process. There is no PII in logs by design.

### Tracing

OpenTelemetry SDK is wired in but trace export is currently a no-op outside production. In prod, traces are exported to Jaeger via the OTLP HTTP collector running as a sidecar. Sampling rate is 1 % (one in a hundred requests is fully traced).

---

## 9. Cold storage

**Plain English:** we keep ninety days of detailed tracking events in Postgres so dashboards and live algorithms can use them. Anything older gets compressed and written to disk as a `.ndjson.gz` file, then synced to long-term object storage by a separate process. Nothing is ever deleted permanently.

**Engineering:** the cold-store loop lives at `services/tracking-worker/src/cold-store.ts`. It runs every 24 hours plus once at worker startup. The retention window is `COLDSTORE_RETENTION_DAYS` (default 90).

### What it does

For each table in scope (currently `EventAggDaily` and selected raw event tables), the loop:

1. Opens a streaming Postgres cursor over rows where `createdAt < NOW() - 90 days`.
2. Reads in pages of 5,000 rows.
3. Appends each row as a single NDJSON line to `${COLD_STORE_DIR}/<table>-<yyyy-mm-dd>.ndjson`.
4. When the file crosses 256 MB, gzips it and starts a new one.
5. Once the day's pages are exhausted, deletes the migrated rows in the same transaction-bounded batches.

The output directory defaults to `<cwd>/cold-store` but is overridable via `COLD_STORE_DIR`. In production, this is a dedicated PVC mounted at `/var/lib/miamo-cold-store`.

### How long-term archive happens

This is intentionally **out of band**. The k8s deployment does not ship anything to S3. An ops-managed sidecar (or a CronJob in some clusters) runs `aws s3 sync /var/lib/miamo-cold-store s3://miamo-cold-store/<env>/ --storage-class GLACIER_IR` nightly and prunes anything older than two weeks from the local PVC. The two-week local window means an emergency restore does not require S3 thawing.

Why split it? Because the worker should never have AWS credentials. The blast radius of a worker compromise stays at "drop incoming events" instead of "exfiltrate user history to attacker bucket."

### Schema for cold files

Each line is a JSON object with the original row's fields plus a `_table` annotation:

```json
{"_table":"EventAggDaily","userIdHash":"abc123…","day":"2026-03-12","kind":"discover.swipe","count":42,…}
```

Restoring is `gunzip <file> | psql -c "COPY <table> FROM stdin"`. There is a small restore helper script at `scripts/cold-restore.py`.

---

## 10. Secret management

**Plain English:** secrets are passwords, signing keys, and API tokens. In dev they live in a local `.env` file (which is in `.gitignore`). In production they live in Kubernetes `Secret` objects (encrypted at rest, never in git). Some can be rotated; some can't.

**Engineering:** `.env.example` is the source of truth for env-var **names**. `.env` (gitignored) is the source of truth for dev values. Production values are injected into `k8s/templates/secret.yaml` at render time via shell variables that come from the CI environment (e.g. `MIAMO_PROD_JWT_SECRET`).

### Required in production

Startup fails fast if any of these are missing when `NODE_ENV=production`:

| Var | Generated by | Used for | Rotatable? |
|-----|--------------|----------|------------|
| `JWT_SECRET` | `openssl rand -hex 64` | HS256 access-token signing | Yes (clients re-login after 15 min anyway) |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 64` | HS256 refresh-token signing | Yes (with a brief dual-key window) |
| `INTERNAL_SERVICE_KEY` | `openssl rand -hex 32` | Header check for gateway → service calls | Yes (dual-key window) |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` | AES-256-GCM message encryption | **NO** — rotating loses access to all stored ciphertext |
| `ENCRYPTION_SALT` | `openssl rand -hex 16` | KDF salt | **NO** — same reason |
| `POSTGRES_PASSWORD` | `openssl rand -hex 32` | DB auth | Yes (services reconnect with new password) |
| `TRACKING_HASH_SECRET` | `openssl rand -hex 32` | HMAC of `userId` → `uidHash` for tracking | **Effectively no** — rotating breaks historical aggregate joins |
| `DEVICE_FP_SALT` | `openssl rand -hex 16` | Device fingerprint hashing | Yes (loses cross-day device recognition) |

The `*:?required` syntax in `docker-compose.yml` enforces presence at compose start time:

```yaml
JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required — generate with: openssl rand -hex 64}
```

If you forget to set it, `docker compose up` exits immediately with a clear message. This catches the bug in dev before it can become a prod incident.

### Where secrets live

| Stage | Location | Encryption at rest |
|-------|----------|---------------------|
| Dev | `.env` on developer laptop | filesystem only (not encrypted) |
| Compose | env vars passed to containers | none (process memory) |
| Dev k8s | `Secret` in `miamo-dev` namespace | etcd encryption-at-rest if cluster has it |
| Staging | `Secret` in `miamo-staging` | yes (cluster KMS) |
| Prod | `Secret` in `miamo-prod`, mirrored to Vault | yes (cluster KMS + Vault) |

In prod, the Kubernetes Secret is the runtime read; Vault is the source of truth and the rotation tool. A CronJob reads from Vault and updates the Secret on rotation events.

### Rotation procedure (rotatable secrets)

1. Generate new value: `NEW_JWT=$(openssl rand -hex 64)`.
2. Push new value to Vault under `kv/miamo/prod/JWT_SECRET_NEXT`.
3. Run the dual-key migration job: services accept both `JWT_SECRET` and `JWT_SECRET_NEXT` for a 24 h window.
4. After 24 h, promote `_NEXT` to `JWT_SECRET` and drop the old value.
5. Restart all auth-issuing services so they start signing with the new secret.

For `ENCRYPTION_KEY` and `TRACKING_HASH_SECRET` there is no procedure — once written they are written for the lifetime of the deployment. If you ever need to "rotate" them, you are effectively re-deploying a new system and migrating users to it.

---

## 11. Deployment runbook (high-level)

The full runbook lives in `RUNBOOK.md`. The summary here is the survival guide.

### Dev rolling restart

**Plain English:** kick the dev environment if a service is stuck. No data loss, no user impact (no real users on dev).

**Engineering:** the new `start.sh` k8s `restart` verb rolls **all** services in an env (it is `start.sh k8s restart <env>` with no service argument). For a single-service kick, use `kubectl` directly:

```bash
# All services in dev:
miamo k8s restart dev

# Single service:
kubectl -n miamo-dev rollout restart deployment/gateway
kubectl -n miamo-dev rollout status deployment/gateway --timeout=2m
```

Restart all at once:

```bash
for svc in auth users social messaging content notifications gateway web; do
  kubectl -n miamo-dev rollout restart deployment/$svc
done
```

### Staging rolling restart

**Plain English:** same as dev, but staging mirrors prod's replica count so a restart actually exercises the rolling-update path. Use staging restarts to validate that a hotfix deploys cleanly before promoting to prod.

**Engineering:**

```bash
# All services in staging (start.sh has no single-service restart):
miamo k8s restart staging

# Single service:
kubectl -n miamo-staging rollout restart deployment/messaging
kubectl -n miamo-staging rollout status deployment/messaging --timeout=5m
```

If the rollout fails (`Progressing=False`), inspect with:

```bash
kubectl -n miamo-staging describe deployment/messaging
kubectl -n miamo-staging logs -l service=messaging --tail=200
```

### Prod rolling restart

**Plain English:** never do this casually. Each restart cycles real-user traffic. The cluster handles it gracefully (rolling-update + PDB + readiness probes), but you should announce in #ops and have a rollback plan.

**Engineering:**

```bash
# Announce in #ops: "Rolling messaging in prod, expected duration 3-5 min"
# Single-service restart is via kubectl (start.sh restart hits all services):
kubectl -n miamo-prod rollout restart deployment/messaging

# Monitor in real-time:
kubectl -n miamo-prod rollout status deployment/messaging --timeout=10m

# If anything looks wrong, rollback (start.sh has no rollback verb — use kubectl):
kubectl -n miamo-prod rollout undo deployment/messaging
kubectl -n miamo-prod rollout status deployment/messaging --timeout=2m
```

Rollout config (in `service.yaml`):

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1          # one extra pod above target during update
    maxUnavailable: 0    # never go below target during update
```

This means a healthy prod deploy of `messaging` (target 5 replicas) goes 5 → 6 → 5 → 6 → 5 over the course of about three minutes. No user ever sees fewer than 5 healthy pods.

### Migration apply order

**Plain English:** schema before code. If a release ships a new column and code that reads it, apply the migration first (which adds the column), then deploy the new code. Never the other way around.

**Engineering:** the canonical order for a versioned release is:

1. **Tag the release** in git: `git tag v3.6.0 && git push --tags`.
2. **Build and push images** to the registry with that tag.
3. **Deploy the target env** with `MIAMO_IMAGE_TAG=v3.6.0 miamo k8s prod`. This single command (the new 2-arg shorthand for `k8s start prod`) renders manifests into `/tmp/miamo-k8s-rendered/prod/`, applies Postgres + Redis first, runs the migrate job to completion, and then applies all service deployments in dependency order (`auth` → `users` → `social` → `messaging` → `content` → `notifications` → `gateway` → `web`). The script aborts if any step fails — including a partially-applied migration.
4. **Watch rollout status** for each (the script does this inline, but you can re-check):
   ```bash
   for svc in auth users social messaging content notifications gateway web; do
     kubectl -n miamo-prod rollout status deployment/$svc --timeout=10m
   done
   ```
5. **Smoke check**: hit `https://api.miamo.in/health` (gateway) and `https://app.miamo.in/` (web). Check Grafana dashboard 1 (gateway) for spike in 5xx rate. Check Grafana dashboard 5 (tracking) for the events-per-second graph staying flat.
6. **Tag the release as deployed**: `git tag v3.6.0-prod-deployed && git push --tags`.

If the migrate step fails inside `start.sh`, **stop**. The script will refuse to proceed to deployments. Investigate the migration manually:

```bash
kubectl -n miamo-prod logs job/miamo-migrate
```

If the migration partially applied (some statements ran, some didn't), you may need to manually mark the migration as failed in `_prisma_migrations` and apply the remaining SQL by hand. This is documented in detail in `RUNBOOK.md` §M-4.

### Emergency rollback

`start.sh` has no rollback verb — rollback is `kubectl rollout undo`, by design (forward-only releases, see section 5).

```bash
# One deployment:
kubectl -n miamo-prod rollout undo deployment/messaging
kubectl -n miamo-prod rollout status deployment/messaging --timeout=2m

# All deployments to the previous version:
for svc in auth users social messaging content notifications gateway web; do
  kubectl -n miamo-prod rollout undo deployment/$svc
done
```

Rollback is **only** safe if the new version did not run a destructive migration. The forward-only migration discipline (section 5) is designed exactly so that code can roll back without rolling back schema. If a release accidentally drops a column, code-only rollback will not be enough; see `RUNBOOK.md` §M-5 for the cold-recovery procedure.

---

## 12. Local QA scripts

**Plain English:** before merging anything big, run the QA scripts. Each one walks through a piece of the product end-to-end (sign up, swipe, chat, etc.) and reports pass/fail. They are the cheapest line of defense against shipping a bug.

**Engineering:** the scripts live in `scripts/qa-runs/` and are written in Python 3 against the running gateway. They take the gateway URL as the first positional arg and a JSON report path as the second. Each writes a `.report.json` next to itself for diff-able tracking.

| Script | What it verifies |
|--------|------------------|
| `phase-1-2-endpoint-sweep.py` | Phase 1/2 endpoints — sign-up, login, refresh, profile, settings, photo upload. Walks the full auth + user lifecycle and asserts response shapes. |
| `phase-3-4-discover-dtm.py` | Phase 3/4 — Discover swipe loop (like / pass / super / undo), DTM (Defining-the-Moment) question flow, vibe-check submission, filter persistence. Asserts that the V4 algorithm returns a non-empty candidate list and that DTM answers persist across reloads. |
| `phase-10-learning-loop.py` | The online learner loop — simulates 500 swipe events, triggers `learnerLoop.ts`, asserts that `UserWeightProfile` is updated and that the next Discover call reflects the new weights. |
| `phase-11-cold-start.py` | New-user cold-start path — creates a brand-new user, asserts that Discover returns a non-empty list within the cold-start fallback (random + freshness boost) instead of zero results. |
| `phase-13-creativity-reels.py` | Creativity tab + reels view + Spotlight ledger — uploads a creative move, asserts that it appears in the reels feed, that engagement events fire, that the Spotlight ledger updates within 5 s. |
| `phase-14-overhaul.py` | The v3.5 visual overhaul checks — header height, scroll restore on Discover, undo toast deduplication, premium-crown click target, modal focus management. Mostly a guard against the visual regressions documented in the recent commit log. |

There are two extra walks at the repo root used for adversarial spotlight testing:

| Script | What it verifies |
|--------|------------------|

### Running them

```bash
# Standard pattern:
python3 scripts/qa-runs/phase-1-2-endpoint-sweep.py http://localhost:3200 \
  > scripts/qa-runs/phase-1-2-endpoint-sweep.report.json

# Or run the whole suite:
python3 scripts/test-all.py
```

The `test-all.py` shim runs every phase script in sequence, prints a summary table, and exits non-zero if any phase failed. Use it as the pre-merge gate for any non-trivial PR.

### Interpreting failures

The `.report.json` files are diff-able JSON arrays of `{step, expected, actual, ok}` entries. To find the broken step, `jq '.[] | select(.ok==false)' phase-XX.report.json`. A common pattern is one or two soft fails near the end (e.g., a timing-sensitive event check) — these are flaky and we annotate them with `softFail: true` in the script. Hard fails (`ok: false, softFail: false`) are blockers.

---

## Appendix A — Quick reference card

```
# Local
miamo start         # start all 7 services bare-metal
miamo stop          # stop them
miamo status        # health check all ports
miamo logs gateway  # tail one log

# Docker
miamo docker up           # full stack in containers
miamo docker down         # tear down

# K8s (verbs: start/stop/restart/status/logs/test; 2-arg shorthand = start)
miamo k8s deploy             # deploy everything to dev
miamo k8s prod            # deploy to prod (with care)
miamo k8s status prod
miamo k8s logs gateway    # tail one service
miamo k8s restart prod    # restart all services in env
# Single-service ops use kubectl directly:
kubectl -n miamo-prod rollout restart deployment/messaging  # one service
kubectl -n miamo-prod scale deployment/social --replicas=10  # scale
kubectl -n miamo-prod rollout undo deployment/messaging      # rollback

# Database
cd services/shared && npx prisma migrate dev --name my_change
cd services/shared && npx prisma generate
cd services/shared && npx prisma studio  # GUI

# Direct kubectl
kubectl -n miamo-prod get pods
kubectl -n miamo-prod logs deploy/gateway --tail=100 -f
kubectl -n miamo-prod exec -it deploy/gateway -- sh
kubectl -n miamo-prod port-forward svc/postgres 5432:5432
```

## Appendix B — Service port map

| Service | Port (local) | Container port | NodePort (prod) | Public DNS |
|---------|--------------|----------------|------------------|------------|
| web | 3100 | 3100 | 30100 | `app.miamo.in` |
| gateway | 3200 | 3200 | 30200 | `api.miamo.in` |
| auth | 3201 | 3201 | – (internal) | – |
| users | 3202 | 3202 | – (internal) | – |
| social | 3203 | 3203 | – (internal) | – |
| messaging | 3204 | 3204 | – (internal) | – |
| content | 3205 | 3205 | – (internal) | – |
| notifications | 3206 | 3206 | – (internal) | – |
| ingest | 3260 | 3260 | 30260 | `t.miamo.in` |
| tracking-worker | 3261 | 3261 | – (no traffic) | – |
| postgres | 5432 | 5432 | – | – |
| redis | 6379 | 6379 | – | – |

Only `web`, `gateway`, and `ingest` are reachable from outside the cluster. Everything else is firewalled by NetworkPolicy + service mesh.

## Appendix C — Env-var matrix (most-used)

| Var | Default | Required in prod | Owner |
|-----|---------|------------------|-------|
| `NODE_ENV` | development | yes | platform |
| `LOG_LEVEL` | info | no | platform |
| `DATABASE_URL` | localhost dev DSN | yes | platform |
| `REDIS_URL` | empty | yes | platform |
| `JWT_SECRET` | – | yes | platform |
| `JWT_REFRESH_SECRET` | – | yes | platform |
| `INTERNAL_SERVICE_KEY` | – | yes | platform |
| `ENCRYPTION_KEY` | – | yes | platform |
| `ENCRYPTION_SALT` | – | yes | platform |
| `TRACKING_HASH_SECRET` | dev-only | yes | platform |
| `DEVICE_FP_SALT` | miamo-default-salt | yes | platform |
| `POSTGRES_USER` | miamo | yes | platform |
| `POSTGRES_PASSWORD` | – | yes | platform |
| `POSTGRES_DB` | miamo | yes | platform |
| `FRONTEND_URL` | http://localhost:3100 | yes | platform |
| `ALLOWED_ORIGINS` | – | optional | platform |
| `CORS_BYPASS` | false | **must be false** | platform |
| `GOOGLE_CLIENT_ID` | – | yes (if OAuth used) | auth |
| `APPLE_CLIENT_ID` | – | yes (if OAuth used) | auth |
| `OTP_PROVIDER_EMAIL` | dev | yes | auth |
| `OTP_PROVIDER_SMS` | dev | yes | auth |
| `SENDGRID_API_KEY` | – | yes (if email OTP) | auth |
| `TWILIO_ACCOUNT_SID` | – | yes (if SMS OTP) | auth |
| `TWILIO_AUTH_TOKEN` | – | yes (if SMS OTP) | auth |
| `TWILIO_FROM_NUMBER` | – | yes (if SMS OTP) | auth |
| `ALLOW_DEV_OTP_PEEK` | 0 | **must be 0** | auth |
| `AUTO_APPROVE_VERIFY` | 0 | **must be 0** | auth |
| `TRACKING_KILL` | 0 | optional kill switch | platform |
| `TRACKING_STREAM_KEY` | events:raw | no | platform |
| `TRACKING_GROUP` | rollup | no | platform |
| `TRACKING_STREAM_MAXLEN` | 10000000 | no | platform |
| `TRACKING_READ_BLOCK_MS` | 2000 | no | platform |
| `TRACKING_READ_COUNT` | 500 | no | platform |
| `TRACKING_FLUSH_MS` | 5000 | no | platform |
| `KEEP_ALIVE_TIMEOUT` | – | optional | platform |
| `ALGO_V8_DISCOVER_RANKER_ENABLED` | 0 | per-env | algorithms |
| `ALGO_V8_FAIRNESS_RERANK_ENABLED` | 0 | per-env | algorithms |
| `ALGO_V4_WORKERS_ENABLED` | 0 | yes (=1 in prod) | algorithms |
| `ALGO_V5_MESSAGE_SUGGEST_ENABLED` | 0 | per-env | algorithms |
| `FEATURE_ANTI_GHOST_ENABLED` | 0 | per-env | product |
| `FEATURE_DTM_MASK_ENABLED` | 0 | per-env | product |
| `FEATURE_FAMILY_BRIEF_ENABLED` | 0 | per-env | product |
| `FEATURE_MOVE_V2_ENABLED` | 0 | per-env | product |
| `FEATURE_VOICE_FINGERPRINT_ENABLED` | 0 | per-env | product |
| `FEATURE_WEEKLY_TOP_ENABLED` | 0 | per-env | product |
| `FEATURE_WHY_EXPLAINER_ENABLED` | 0 | per-env | product |
| `INTENT_INFERENCE_ENABLED` | 0 | per-env | algorithms |
| `EXPOSURE_SCHEDULER_ENABLED` | 0 | per-env | algorithms |
| `STABLE_MATCH_ENABLED` | 0 | per-env | algorithms |
| `FAIRNESS_AUDIT_ENABLED` | 0 | per-env | algorithms |
| `DISCOVER_PASS_HARDFILTER_ENABLED` | 1 | yes | algorithms |
| `INTENT_INFERENCE_TICK_MS` | 30000 | no | algorithms |
| `INTENT_INFERENCE_BATCH_SIZE` | 200 | no | algorithms |
| `INTENT_ACTIVE_WINDOW_MS` | 120000 | no | algorithms |
| `INTENT_ACTIVITY_LOOKBACK_MS` | 1800000 | no | algorithms |
| `INTENT_HOURLY_LOOKBACK_HOURS` | 1 | no | algorithms |
| `INTENT_RECENT_WINDOW_MS` | 3600000 | no | algorithms |
| `INTENT_RECENT_TICK_MS` | 300000 | no | algorithms |
| `INTENT_MAX_RECENT_EVENTS` | 30 | no | algorithms |
| `EXPOSURE_SCHEDULER_INTERVAL_MS` | 300000 | no | algorithms |
| `EXPOSURE_SCHEDULER_BATCH` | 200 | no | algorithms |
| `EXPOSURE_SCHEDULER_LOOKBACK_HOURS` | 24 | no | algorithms |
| `EXPOSURE_SCHEDULER_SURFACE` | discover | no | algorithms |
| `STABLE_MATCH_INTERVAL_MS` | 600000 | no | algorithms |
| `STABLE_MATCH_BATCH` | 200 | no | algorithms |
| `STABLE_MATCH_TOP_K_OUT` | 10 | no | algorithms |
| `STABLE_MATCH_TOP_K_PROPOSE` | 50 | no | algorithms |
| `STABLE_MATCH_ACTIVE_WINDOW_DAYS` | 7 | no | algorithms |
| `STABLE_MATCH_PASS_WINDOW_DAYS` | 30 | no | algorithms |
| `STABLE_MATCH_MIN_INTERVAL_DAYS` | 6 | no | algorithms |
| `FAIRNESS_AUDIT_INTERVAL_MS` | 600000 | no | algorithms |
| `FAIRNESS_AUDIT_LOOKBACK_DAYS` | 7 | no | algorithms |
| `FAIRNESS_AUDIT_HOUR_UTC` | 2 | no | algorithms |
| `FAIRNESS_AUDIT_EVENT` | card.impression.50 | no | algorithms |
| `FAIRNESS_AUDIT_GINI_ALERT` | 0.45 | no | algorithms |
| `FAIRNESS_AUDIT_SYSTEM_USER_ID` | – | yes (if FAIRNESS_AUDIT_ENABLED) | algorithms |
| `COMPAT_INTERVAL_MS` | 900000 | no | algorithms |
| `COMPAT_ACTIVE_LIMIT` | 200 | no | algorithms |
| `COMPAT_CANDIDATES` | 50 | no | algorithms |
| `COMPAT_TOPK` | 20 | no | algorithms |
| `COMPAT_W_BEHAVIOR` | 0.25 | no | algorithms |
| `COMPAT_W_CHRONO` | 0.35 | no | algorithms |
| `COMPAT_W_PRIOR` | 0.4 | no | algorithms |
| `ENRICH_INTERVAL_MS` | 1800000 | no | algorithms |
| `ENRICH_CADENCE_DAYS` | 14 | no | algorithms |
| `ENRICH_DTM_DAYS` | 90 | no | algorithms |
| `ENRICH_PEAK_DAYS` | 7 | no | algorithms |
| `ENRICH_PEAK_TOP_N` | 6 | no | algorithms |
| `EMBED_INTERVAL_MS` | 1800000 | no | algorithms |
| `EMBED_BATCH` | 200 | no | algorithms |
| `DAILY_MATCH_INTERVAL_MS` | 43200000 | no | algorithms |
| `DAILY_MATCH_BATCH` | 200 | no | algorithms |
| `DAILY_MATCH_POOL` | 50 | no | algorithms |
| `DAILY_MATCH_MIN_SCORE` | 70 | no | algorithms |
| `DAILY_MATCH_USER_DAYS` | 7 | no | algorithms |
| `FEATURE_INTERVAL_MS` | 300000 | no | algorithms |
| `FEATURE_BATCH` | 200 | no | algorithms |
| `LEARNER_LOOP_ENABLED` | 0 | per-env | algorithms |
| `LEARNER_LOOP_INTERVAL_MS` | 600000 | no | algorithms |
| `LEARNER_LOOP_BATCH` | 500 | no | algorithms |
| `LEARNER_LOOP_LOOKBACK_DAYS` | 1 | no | algorithms |
| `LEARNER_LOOP_SURFACE` | discover | no | algorithms |
| `SAFETY_ROLLUP_INTERVAL_MS` | 300000 | no | safety |
| `SAFETY_ROLLUP_LOOKBACK_DAYS` | 2 | no | safety |
| `FIRST_MOVE_OUTCOME_ENABLED` | 0 | per-env | algorithms |
| `FIRST_MOVE_OUTCOME_INTERVAL_MS` | 1800000 | no | algorithms |
| `FIRST_MOVE_OUTCOME_LOOKBACK_HOURS` | 25 | no | algorithms |
| `SESSION_SUMMARY_ENABLED` | 0 | per-env | algorithms |
| `SESSION_SUMMARY_INTERVAL_MS` | 600000 | no | algorithms |
| `SESSION_SUMMARY_LOOKBACK_HOURS` | 26 | no | algorithms |
| `SESSION_SUMMARY_IDLE_GAP_MS` | 60000 | no | algorithms |
| `SESSION_SUMMARY_MIN_DURATION_MS` | 30000 | no | algorithms |
| `FOCUS_AFFINITY_ENABLED` | 0 | per-env | algorithms |
| `FOCUS_AFFINITY_INTERVAL_MS` | 300000 | no | algorithms |
| `FOCUS_AFFINITY_LOOKBACK_HOURS` | 3 | no | algorithms |
| `DEFER_PRUNE_ENABLED` | 0 | per-env | algorithms |
| `DEFER_PRUNE_INTERVAL_MS` | 21600000 | no | algorithms |
| `DEFER_PRUNE_MAX_AGE_DAYS` | 30 | no | algorithms |
| `COLDSTORE_INTERVAL_MS` | 86400000 | no | platform |
| `COLDSTORE_RETENTION_DAYS` | 90 | no | platform |
| `COLD_STORE_DIR` | <cwd>/cold-store | yes (in prod, points at PVC) | platform |

## Appendix D — Troubleshooting cookbook

**Symptom: `local dev` claims success but `/health` returns 503.**

Cause: Postgres isn't ready, or the service crashed during boot. Check `/tmp/miamo-logs/<svc>.log`. The most common error is `PrismaClientInitializationError` — Prisma can't reach Postgres. Run `docker compose ps postgres` and verify `healthy`. If Postgres is up, verify the password in `.env` matches.

**Symptom: v8 flags set in `.env` but endpoints return 404.**

Cause: the bootstrap trap (section 2). `local_env()` does not source `.env`. Run `set -a; source .env; set +a` before starting.

**Symptom: type errors in service B after editing schema in service A.**

Cause: stale `@prisma/client`. Run `cd services/shared && npx prisma generate`, then restart every running service.

**Symptom: `kubectl apply` fails with `error validating data: ValidationError(Deployment.spec)`.**

Cause: a `__PLACEHOLDER__` was not substituted. Re-run `miamo k8s <env>` (which re-renders into `/tmp/miamo-k8s-rendered/<env>/` as its first step) and grep that directory for `__` to find unsubstituted tokens.

**Symptom: tracking events visible in ingest logs but `EventAggHourly` is not growing.**

Cause: the `tracking-worker` is down or stuck. Check `kubectl -n miamo-<env> logs deploy/tracking-worker --tail=200`. Common causes: Redis connection lost, `TRACKING_KILL=1` somehow set, the worker pod crashed on a malformed event.

**Symptom: Grafana dashboard 5 shows `events:raw` depth climbing past 100 k.**

Cause: same as above — worker is not consuming. Scale check: `kubectl -n miamo-<env> get pods -l app=tracking-worker`. There should be exactly one Running pod. If it's CrashLoopBackOff, read the last 200 log lines.

**Symptom: prod deploy hangs at "Waiting for rollout to finish".**

Cause: readiness probe failing. Inspect the new pod: `kubectl -n miamo-prod describe pod <pod-name>`. The events section will show the probe failure reason. Common reasons: DB connection refused (Secret out of sync), env var typo (look for `Error: configmap "miamo-config" not found`).

**Symptom: prod 5xx rate spikes after a deploy.**

Cause: new code regression. Roll back immediately (via kubectl — `start.sh` has no rollback verb), then investigate offline:

```bash
kubectl -n miamo-prod rollout undo deployment/<svc>
kubectl -n miamo-prod rollout status deployment/<svc> --timeout=2m
```

**Symptom: `_prisma_migrations` is corrupt after a partial-apply.**

Cause: migrate job was killed mid-apply. Connect with `psql`, find the failed row, mark it as `applied_steps_count = total_steps`, and re-run the migrate job. Full procedure in `RUNBOOK.md` §M-4.

**Symptom: a worker loop is running twice (double counting).**

Cause: someone scaled `tracking-worker` past 1 replica. Scale it back: `kubectl -n miamo-<env> scale deploy/tracking-worker --replicas=1`. Then accept the double-count in the affected aggregates (they will self-correct as new days roll in) or reset the affected window from cold-store.

---

## Appendix E — Glossary

- **Canary deployment.** Shipping a new version to a small fraction (e.g. 5 %) of traffic first, watching error rate and latency, and then promoting to 100 % only if healthy.
- **ConfigMap.** A Kubernetes object holding non-secret key/value config, mountable as env vars or files in pods.
- **Deployment.** A Kubernetes object describing a stateless replicated workload. Wraps ReplicaSet + rolling-update logic.
- **HPA (Horizontal Pod Autoscaler).** A controller that adjusts a Deployment's replica count based on CPU / memory / custom metrics.
- **Idempotency key.** A client-supplied header (`Idempotency-Key`) used by the server to deduplicate retries of the same write.
- **Ingress.** A Kubernetes object describing HTTP(S) routing rules from outside the cluster into Services.
- **NodePort.** A Kubernetes Service type that exposes a port on every node in the cluster. Used here for gateway/web/ingest.
- **PDB (Pod Disruption Budget).** A Kubernetes object guaranteeing a minimum number of pods of a Deployment stay available during voluntary disruptions (node drain, version upgrade).
- **PVC (PersistentVolumeClaim).** A Kubernetes object requesting persistent storage for a stateful workload (Postgres, Redis, cold-store).
- **Readiness probe.** An HTTP request the kubelet makes to a pod to determine if it should receive traffic.
- **Rolling update.** A Deployment strategy that replaces pods incrementally, keeping a configurable number of new and old pods alive simultaneously.
- **Secret.** A Kubernetes object holding encrypted-at-rest sensitive key/value data (JWT secrets, passwords).
- **Service.** A Kubernetes object providing a stable DNS name and virtual IP for a set of pods.
- **StatefulSet.** Like a Deployment but with stable pod identity and ordered start/stop semantics. Used for Postgres and Redis.
- **xreadgroup / consumer group.** Redis Streams primitives for letting multiple consumers cooperatively consume a stream with at-least-once semantics.

---

## Appendix F — Common one-liners for on-call

```bash
# What's running?
kubectl -n miamo-prod get pods -o wide

# Is anything restarting?
kubectl -n miamo-prod get pods --sort-by=.status.containerStatuses[0].restartCount

# Recent events in the namespace
kubectl -n miamo-prod get events --sort-by=.lastTimestamp | tail -50

# Tail logs for a single service
kubectl -n miamo-prod logs -l service=messaging --tail=200 -f

# Stream logs from every gateway pod simultaneously
kubectl -n miamo-prod logs -l app=gateway --tail=100 -f --max-log-requests=10

# Port-forward Postgres for a one-off psql session
kubectl -n miamo-prod port-forward svc/postgres 15432:5432 &
PGPASSWORD=$PROD_DB_PASS psql -h localhost -p 15432 -U miamo_prod miamo_production

# Port-forward Redis
kubectl -n miamo-prod port-forward svc/redis 16379:6379 &
redis-cli -p 16379 XLEN events:raw
redis-cli -p 16379 XPENDING events:raw rollup

# Scale a deployment
kubectl -n miamo-prod scale deployment/social --replicas=10

# Check HPA status
kubectl -n miamo-prod get hpa

# Force-restart a deployment (rolls all pods)
kubectl -n miamo-prod rollout restart deployment/gateway

# Roll back a deployment
kubectl -n miamo-prod rollout undo deployment/messaging

# Inspect a failing pod
kubectl -n miamo-prod describe pod <pod>
kubectl -n miamo-prod logs <pod> --previous   # logs from the prior crash

# Exec into a running pod
kubectl -n miamo-prod exec -it deploy/gateway -- sh
```

---

## Appendix G — When to update this document

- A new service was added to `services/`. Update sections 1, 3, and Appendix B.
- A new env var was added to `.env.example`. Update section 10 and Appendix C.
- A new worker loop was added or the schedule changed. Update section 7.
- The CI workflow gained or lost a job. Update section 4.
- A new k8s template was added to `k8s/templates/`. Update section 3.
- A new common-failure pattern was diagnosed during an incident. Update Appendix D.

This doc is owned by the platform team. PRs welcome from anyone — the only rule is that every section keeps the pair-write style (plain English first, engineering second). If a section starts to feel jargon-heavy, add a plain-English paragraph at the top before merging.

---

## Appendix H — Docker image build pipeline

**Plain English:** every backend service compiles to a small container image (~120 MB). The build happens in two stages: a fat "builder" stage that downloads npm packages and compiles TypeScript, and a slim "runtime" stage that only carries the compiled JavaScript plus production dependencies. The result is the build tooling never reaches production.

**Engineering:** there is one Dockerfile per service under `docker/`. They follow the same template:

```dockerfile
# ─── Stage 1: builder ─────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install shared dependencies first (better layer caching)
COPY services/shared/package.json services/shared/package-lock.json ./services/shared/
COPY services/shared/prisma ./services/shared/prisma
RUN cd services/shared && npm ci && npx prisma generate

# Install service dependencies
COPY services/<svc>/package.json services/<svc>/package-lock.json ./services/<svc>/
RUN cd services/<svc> && npm ci

# Copy source and compile
COPY services/shared ./services/shared
COPY services/<svc> ./services/<svc>
RUN cd services/<svc> && npm run build

# ─── Stage 2: runtime ─────────────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy only what we need
COPY --from=builder /app/services/shared/node_modules ./services/shared/node_modules
COPY --from=builder /app/services/shared/dist ./services/shared/dist
COPY --from=builder /app/services/shared/prisma ./services/shared/prisma
COPY --from=builder /app/services/<svc>/node_modules ./services/<svc>/node_modules
COPY --from=builder /app/services/<svc>/dist ./services/<svc>/dist
COPY --from=builder /app/services/<svc>/package.json ./services/<svc>/

# Run as non-root
RUN addgroup -S miamo && adduser -S miamo -G miamo && chown -R miamo:miamo /app
USER miamo

EXPOSE 320X
CMD ["node", "services/<svc>/dist/server.js"]
```

The shared package is copied **first** so that npm-install layers cache across services. A typical re-build with only application code changes hits the cache up through the `RUN cd services/<svc> && npm ci` line and rebuilds only the compile step.

### Image registry

In dev, images are kept in the local Docker daemon (`PULL_POLICY=Never` in `k8s_env_config()`). In staging and prod, images are pushed to a private registry (`registry.miamo.in/miamo-<svc>:<tag>`). Tags follow the release version (`v3.6.0`) plus a sliding `latest` for non-release commits.

### Build commands

```bash
# Local build (no push)
docker compose build --parallel

# Build & push for staging
export MIAMO_IMAGE_TAG=v3.6.0-rc.1
for svc in gateway auth users social messaging content notifications ingest tracking-worker web; do
  docker build -t registry.miamo.in/miamo-$svc:$MIAMO_IMAGE_TAG \
    -f docker/$svc.Dockerfile .
  docker push registry.miamo.in/miamo-$svc:$MIAMO_IMAGE_TAG
done

# Promote staging build → prod (re-tag, no rebuild)
for svc in gateway auth users social messaging content notifications ingest tracking-worker web; do
  docker pull  registry.miamo.in/miamo-$svc:v3.6.0-rc.1
  docker tag   registry.miamo.in/miamo-$svc:v3.6.0-rc.1 registry.miamo.in/miamo-$svc:v3.6.0
  docker push  registry.miamo.in/miamo-$svc:v3.6.0
done
```

The promote-by-retag step is important: it guarantees that staging and prod run **bit-identical** images. There is no rebuild path between staging and prod; if it passed in staging, the same digest goes to prod.

### Image size budget

| Service | Target image size | Current |
|---------|--------------------|---------|
| gateway | < 150 MB | ~130 MB |
| auth | < 150 MB | ~125 MB |
| users | < 150 MB | ~135 MB |
| social | < 200 MB | ~180 MB |
| messaging | < 150 MB | ~140 MB |
| content | < 200 MB | ~175 MB |
| notifications | < 150 MB | ~120 MB |
| ingest | < 100 MB | ~85 MB |
| tracking-worker | < 200 MB | ~175 MB |
| web (Next.js) | < 250 MB | ~230 MB |

Anything substantially over the target gets a "trim layers" task. Common offenders: accidentally bundling `node_modules/.cache`, including TypeScript source files that should have been omitted via `.dockerignore`, or shipping the Prisma migration engine when only the query engine is needed at runtime.

### `.dockerignore`

A single root `.dockerignore` excludes:

```
node_modules
**/node_modules
.git
.gitignore
.env
.env.*
*.log
**/dist
**/.next
**/.turbo
**/coverage
**/.cache
tests
**/*.test.ts
**/*.spec.ts
docs
scripts/qa-runs/__pycache__
*.report.json
```

The `node_modules` exclusion is critical: without it, the host's `node_modules` would be copied into the build context and override the lockfile-resolved versions installed by `npm ci`.

---

## Appendix I — Backup and restore

**Plain English:** the database is backed up automatically every night. If something terrible happens (someone drops a table, a disk dies), we can restore to the state it was in at the most recent backup with about thirty minutes of work.

**Engineering:** backups are taken by the cluster operator, not by Miamo code. The schedule is:

| Scope | Cadence | Retention | Storage |
|-------|---------|-----------|---------|
| Postgres full dump (`pg_dump -Fc`) | nightly 02:30 UTC | 30 days | S3 (cross-region) |
| Postgres WAL | continuous | 7 days | S3 (same region) |
| Redis AOF snapshot | 4 h | 48 h | S3 (same region) |
| Cold-store NDJSON.gz | nightly (push from cold-store volume) | 2 years | S3 Glacier IR |
| Kubernetes ConfigMaps / Secrets | nightly | 90 days | dedicated etcd backup bucket |

### Restore procedures

**Postgres point-in-time recovery (PITR):**

1. Stop all writes — scale every Deployment (including gateway and ingest) to 0:
   ```bash
   for svc in gateway auth users social messaging content notifications ingest tracking-worker web; do
     kubectl -n miamo-prod scale deploy/$svc --replicas=0
   done
   ```
2. Identify the target timestamp.
3. Restore the most recent base backup before that timestamp into a new namespace (`miamo-restore`).
4. Replay WAL up to the target timestamp.
5. Validate via `psql` queries against known-good rows.
6. Either point the existing services at the restored DB (via Service patch) or `pg_dump` the restored DB back into the original.
7. Scale services back up.

The on-call drill for this is run quarterly. Expected duration is 25–45 minutes depending on DB size.

**Single-table restore (more common):**

1. `pg_restore` the full dump into a `_restore` schema in the live DB.
2. `INSERT INTO miamo.<table> SELECT ... FROM _restore.<table> WHERE id IN (...)` for the missing rows.
3. Drop the `_restore` schema.

**Redis restore:**

Redis state is mostly ephemeral. The exceptions are `events:raw` (in-flight events) and idempotency keys. A Redis loss is annoying but not catastrophic. Restore steps if needed:

1. Stop ingest and tracking-worker.
2. Copy the AOF file from the most recent backup into the new Redis PVC.
3. Start Redis. It will replay the AOF on boot.
4. Start ingest and tracking-worker.

---

## Appendix J — Cost notes

**Plain English:** we pay for compute (the running pods), storage (database + cold-store), and bandwidth (mostly the CDN in front of the web app). The biggest line item is database storage; the second biggest is cold-store object-storage.

**Engineering:** rough monthly cost split at current scale (~50 k DAU). Numbers are approximate and the exact split varies by cloud:

| Component | Share | Notes |
|-----------|-------|-------|
| Postgres (PVC + IOPS + replicas) | ~35 % | 500 GB PVC + read replica + WAL storage |
| Cold-store object storage | ~15 % | NDJSON.gz in Glacier IR |
| Kubernetes compute (pods) | ~30 % | 3–10 replicas per service × 8 services |
| Redis | ~5 % | 4 GB cap |
| Egress / CDN | ~10 % | Web app + image serving |
| Logs / metrics / traces | ~5 % | Loki + Prometheus + Jaeger storage |

### Cost-saving knobs

- HPA `maxReplicas`. Lowering this caps cost during a viral spike at the price of latency.
- Cold-store retention (`COLDSTORE_RETENTION_DAYS`). 90 d is generous; shrinking to 60 d shaves a measurable amount off Postgres storage.
- `LOG_LEVEL`. `debug` in prod is rarely needed and expensive; default is `info`.
- Read replicas. The current single-replica setup is fine for 50 k DAU. Above that, splitting reads off saves on the primary.
- Tracing sample rate. Currently 1 %. Lowering it cuts Jaeger storage; raising it costs more but helps debugging.

### Cost-explosion red flags

- Sudden spike in Postgres IOPS — likely a missing index. Check the slow query log.
- Sudden spike in egress — likely an image serving the wrong size. Check Next.js image transforms.
- Cold-store volume growing without nightly shrink — sync to S3 is failing.
- Log volume growing 10× — someone left `LOG_LEVEL=debug` on, or a service is logging request bodies.

---

## Appendix K — Disaster scenarios

The five scenarios that have actually happened (or were close calls) and how we handle them. Full incident reports live in `docs/releases/postmortems/`.

### 1. Postgres pod evicted, PVC reattaches to a different node, slow re-boot

**Symptom:** Postgres pod restarts itself, takes 4–6 minutes to come back up. During that window, every service returns 5xx because Prisma can't connect.

**Why it happens:** Node memory pressure. Postgres uses a lot of cache; if its node runs hot, the kubelet kills the pod. The PVC re-attaches to a different node, but Postgres has to do a WAL replay on startup.

**Mitigation already in place:** Postgres has resource requests sized to keep it in the Guaranteed QoS class. PDB minAvailable=1.

**Manual recovery:** none required. Wait for the pod, monitor `kubectl -n miamo-prod logs postgres-0 -f`. Communicate to users via status page.

### 2. Migration partially applied, `_prisma_migrations` corrupt

**Symptom:** migrate job exited non-zero, but some of the SQL ran. The next migrate-deploy claims to be up-to-date but the schema is half-new.

**Why it happens:** a migration statement timed out, the pod was OOMKilled mid-statement, or someone Ctrl-Ced the local migrate.

**Recovery:** see `RUNBOOK.md` §M-4. Short version:
1. Connect with psql.
2. `SELECT * FROM _prisma_migrations WHERE finished_at IS NULL;` — find the broken row.
3. Manually re-run the remaining statements from `migration.sql`.
4. `UPDATE _prisma_migrations SET finished_at = NOW(), applied_steps_count = N WHERE migration_name = '...';`
5. Verify with `npx prisma migrate status`.

### 3. Redis OOM, `events:raw` stream lost

**Symptom:** ingest 204s every request (kill switch tripped automatically), worker logs show "stream not found", users see no tracking.

**Why it happens:** Redis exceeded memory cap, evicted the stream (LRU). Usually because a worker loop fell behind and the stream grew past the trim point.

**Mitigation:** the stream is `MAXLEN ~ 10M` trimmed; we should never get here unless the worker has been down for > 2 hours at peak load.

**Recovery:**
1. Restore Redis from the most recent AOF backup (loses ~hours of events).
2. **Or** accept the data loss and resume — historical aggregates are intact in Postgres.
3. Investigate why the worker was down for that long. Almost always a deploy gone wrong; rollback.

### 4. Bad release reaches prod despite canary

**Symptom:** canary at 5 % passed (no error spike), then at 100 % the error rate ramped up over 10 minutes as cache filled with bad data.

**Why it happens:** the bug is in a code path that only triggers for cached states, which the canary didn't populate. Or it's a slow leak (memory, file handles).

**Recovery:** `kubectl -n miamo-prod rollout undo deployment/<svc>` (`start.sh` has no rollback verb). Then in postmortem, harden the canary check to look at a longer window.

### 5. Secret rotation went sideways

**Symptom:** half the pods restarted with the new secret, the other half didn't. JWTs signed by pod A are rejected by pod B.

**Why it happens:** rolling restart of `auth` finished, but the gateway (which also consumes `JWT_SECRET` for verification) wasn't restarted in lockstep.

**Mitigation:** the dual-key window (24 h) means both old and new are accepted everywhere. The bug is when someone short-circuits the window.

**Recovery:** finish the dual-key step. Restart every service that touches the secret. Verify with a fresh login → refresh cycle.

---

## Appendix L — Glossary cross-reference

For algorithm and product terminology that this doc references but does not define, see:

- **Discover, DTM, vibe-check, Move, Spotlight, Family-Brief** → `docs/ARCHITECTURE.md` §3 and `the canonical docs (TRACKING.md, ALGORITHMS.md, DATA_MODEL.md)` §7.
- **V4, V7, V8 ranker** → `the canonical docs (TRACKING.md, ALGORITHMS.md, DATA_MODEL.md)` §7 (canonical algo dir).
- **Tracking envelope, uidHash, surface, kind** → `the canonical docs (TRACKING.md, ALGORITHMS.md, DATA_MODEL.md)` §8.
- **Negative-signal engine, activity analyzer** → `services/shared/negative-signal-engine.ts`, `services/shared/activity-analyzer.ts`.

For ops terminology that this doc uses informally:

- **On-call.** The engineer carrying the pager for the current week. Rotation is in PagerDuty.
- **Blast radius.** The set of services / users affected if a given thing fails.
- **Foot-gun.** A surface that is easy to mis-use in a way that costs you an hour or more. We document these explicitly (see section 2: the bootstrap trap; section 5: the shared `node_modules` gotcha).

---

## Appendix M — Pre-merge checklist for infra-touching PRs

Use this checklist when reviewing (or opening) a PR that touches `docker-compose.yml`, anything in `k8s/templates/`, anything in `scripts/start.sh`, anything in `.github/workflows/`, or `.env.example`.

**Plain English:** infra changes can break dozens of unrelated developers and every user simultaneously. We require more rigor here than for product code.

**Engineering:**

- [ ] PR description includes the **why** (link to incident, ticket, or design doc). "Cleanup" is not a why.
- [ ] If `docker-compose.yml` changed, `docker compose up -d --build` runs to green locally.
- [ ] If `k8s/templates/*.yaml` changed, `miamo k8s deploy` renders and applies cleanly (rendered output lands in `/tmp/miamo-k8s-rendered/dev/`; for a render-only dry-run, run the render step manually via `kubectl apply --dry-run=client -f /tmp/miamo-k8s-rendered/dev/`).
- [ ] If `start.sh` changed, both `local dev` and `docker dev` paths smoke-tested.
- [ ] If `.github/workflows/ci.yml` changed, the workflow ran green on this PR's commit.
- [ ] If `.env.example` got a new var, **all five of these** were updated in the same PR:
  1. `.env.example` itself.
  2. The relevant service's `src/server.ts` validation (refuse to start in prod if missing).
  3. `k8s/templates/configmap.yaml` or `secret.yaml`.
  4. This doc's Appendix C (env-var matrix).
  5. The README / onboarding doc if it's a quickstart-critical var.
- [ ] If a service was added, the matrix in `.github/workflows/ci.yml` was extended.
- [ ] If a port was added, Appendix B (port map) was updated.
- [ ] If a feature flag was added, default is `0` (off), and it is documented in `.env.example`.
- [ ] If a worker loop was added or changed, section 7 was updated.
- [ ] The PR title uses the conventional prefix (`feat(devops):`, `fix(ci):`, `chore(k8s):`, etc.).
- [ ] A code-owner from the platform team has approved.

The platform team owns merge for everything under `docker/`, `k8s/`, `scripts/start.sh`, `.github/workflows/`, and this doc. We respond quickly — the cost of a slow merge here is a queue of blocked product PRs — but we will block on missing items in this checklist.

---

## Appendix N — How to read the rendered manifests

When you run `miamo k8s <env>`, the script's first step renders all manifests into `/tmp/miamo-k8s-rendered/<env>/` (then applies them and runs migrate, all inline — there is no separate `render` verb in the new CLI). This is a flat directory of fully-substituted YAML, one file per template (with `service.yaml`, `hpa.yaml`, `pdb.yaml`, `network-policy.yaml` each containing multiple `---`-separated documents). To inspect or diff before applying, run the deploy command, then Ctrl-C between render and apply, or just review `/tmp/miamo-k8s-rendered/<env>/` after a previous run.

Useful patterns:

```bash
# See what got substituted
diff -u k8s/templates/gateway.yaml /tmp/miamo-k8s-rendered/dev/gateway.yaml | less

# Look for unsubstituted placeholders (bug)
grep -RH '__[A-Z_]*__' /tmp/miamo-k8s-rendered/

# Validate without applying
for f in /tmp/miamo-k8s-rendered/dev/*.yaml; do
  kubectl apply --dry-run=client -f "$f" && echo "OK: $f" || echo "FAIL: $f"
done

# See what would change against a live cluster
for f in /tmp/miamo-k8s-rendered/prod/*.yaml; do
  kubectl diff -f "$f" || true
done

# Convert all to a single bundle (handy for review)
cat /tmp/miamo-k8s-rendered/prod/*.yaml > /tmp/prod-bundle.yaml
```

Unsubstituted placeholders are the most common rendering bug. The `sed` substitution in `k8s_render()` is positional and silent — if you add a `__NEW_PLACEHOLDER__` to a template but forget to add a `-e "s|__NEW_PLACEHOLDER__|$VAL|g"` to the corresponding render branch, the manifest will apply with the literal placeholder string. Kubernetes will accept it (it's syntactically valid YAML), and you will get a runtime error later when an env var contains the literal string `__NEW_PLACEHOLDER__`.

To catch this, the k8s `start` action runs `grep -RH '__[A-Z_]*__' "$K8S_OUTPUT/$env/"` after rendering and refuses to proceed to `kubectl apply` if any matches are found. (If it doesn't, that's a bug — file an issue.)

---

## Appendix O — Where to ask for help

| Question | Channel | Owner |
|----------|---------|-------|
| "Why is my local stack broken?" | #miamo-dev on Slack | platform |
| "Why does CI keep failing?" | comment on the PR | platform |
| "How do I add a new service?" | #miamo-platform | platform |
| "How do I add a new env var?" | this doc, Appendix M | platform |
| "Why is prod 5xx-ing?" | PagerDuty → on-call | rotating |
| "Can I scale up before a launch?" | #miamo-ops 24 h in advance | platform |
| "I need access to prod kubectl" | open a ticket with a justification | platform + security |
| "I need access to prod psql" | open a ticket; access is time-boxed | platform + security |
| "I need a one-off SQL run in prod" | PR the SQL into `scripts/oneoff/`, get two reviews | platform |
| "I want to add a tracking event" | see `the canonical docs (TRACKING.md, ALGORITHMS.md, DATA_MODEL.md)` §8 | tracking |
| "I want to add a worker loop" | see section 7 + #miamo-algorithms | algorithms |

No question is too basic. The platform team has answered "where does my code log to" hundreds of times. Ask.

---

## Appendix P — How to run E2E tests (Phase G.5, Playwright)

The E2E scaffold ships in `tests/e2e/`. It exercises the (main) web
routes across five browser projects (chromium / webkit / firefox /
mobile-chrome / mobile-safari) using the same seeded personas that the
smoke script does.

### One-time browser install (~250 MB)

    npm install                     # picks up @playwright/test devDep
    npx playwright install          # downloads the three browsers

If you're on CI or a low-disk laptop, install one browser at a time:

    npx playwright install chromium
    npx playwright install webkit
    npx playwright install firefox

### Daily loop

    npm run test:e2e                          # headless, all 5 projects
    npm run test:e2e:ui                       # interactive UI for debugging
    npx playwright test tests/e2e/auth.spec.ts --project=chromium
    npx playwright test --project=mobile-safari

### Prereqs before running

- Stack up: `miamo start` (web on :3100, gateway on :3200).
- Seed personas loaded (`npm run db:seed`). The tests log in as
  `miamo10@miamo.test / miamo10` by default; override the persona in
  `tests/e2e/helpers/auth.ts` if you seed differently.

### Reports and artifacts

- HTML report: `playwright-report/index.html` (opens after every run).
- Trace + screenshot: `test-results/` on failure or first retry.
- Video: retained on failure.

### Config knobs

- `PLAYWRIGHT_BASE_URL` env var overrides `http://localhost:3100`.
- `CI=true` toggles retries + smaller worker pool (see `playwright.config.ts`).

### When to run

- **Locally, before every PR** on frontend changes — a full run takes ~2 min.
- **In CI, on every PR** against `main` — enforced by the pre-launch checklist.
- **Manually, before a release** — full 5-browser matrix, plus real
  device screen-recording (see `docs/architecture/cross-platform-matrix.md`
  once G.10 lands).

---

## Appendix Q — How to run load tests (Phase G.6, k6)

Load tests live under `scripts/load/`. Five scripts cover the hottest
endpoints identified in the launch audit. See
`scripts/load/README.md` for the full contract; the highlights:

### Install k6

    brew install k6           # macOS
    sudo apt install k6       # Debian/Ubuntu (after adding Grafana APT)
    winget install k6         # Windows

### Run

    LOAD_TOKEN='<bearer>' miamo load run discover
    LOAD_TOKEN='<bearer>' miamo load run matches
    LOAD_TOKEN='<bearer>' LOAD_CHAT_ID='<uuid>' miamo load run messages
    miamo load run ingest
    miamo load run discover-realistic

### Get a bearer token for a load run

    curl -sS http://localhost:3200/api/v1/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"email":"miamo10@miamo.test","password":"miamo10"}' \
      | jq -r '.data.accessToken'

### Thresholds

Every load script has `options.thresholds` set to the launch-critical
p95 latency + error-rate targets:

- `discover.js`  — p95 < 250 ms, err < 1 %
- `matches.js`   — p95 < 200 ms, err < 1 %
- `messages.js`  — p95 < 300 ms, err < 1 %
- `ingest.js`    — p95 < 50 ms, err < 0.1 %
- `discover-realistic.js` — per-step p95 targets

A threshold breach exits k6 with code 99 — CI-friendly.

### When to run

- **Before every major release** — all five, in order.
- **After a Prisma schema migration** — at minimum `discover` + `messages`.
- **After a dependency bump** on Prisma, Express, or the Redis client.

---

## CI/CD

**Phase G.17** — three GitHub Actions workflows form the shipping pipeline. All three live under `.github/workflows/`. All are syntactically valid GitHub Actions YAML; every step that requires vendor credentials is gated on a repo secret so the workflows exit green until the founder wires them.

### The three workflows

| Workflow | Trigger | What it does | Fails on |
|---|---|---|---|
| `ci.yml` | every push + PR to `main` | fast tests → full tests → 11-package typecheck → Next.js web build | any red step |
| `deploy.yml` | merge to `main` (or manual dispatch) | builds all 11 Docker images (`gateway auth users social messaging content notifications ingest tracking-worker web`), pushes to ECR when `ECR_ENABLED=true` secret is set | image build failure |
| `release.yml` | tag push matching `v*` | full tests → web build → Playwright E2E → smoke (opt-in) → k6 load (opt-in) → GitHub Release with generated notes | any red gate |

### Secrets required (Settings → Secrets and variables → Actions)

| Secret | Used by | Purpose |
|---|---|---|
| `ECR_ENABLED` | `deploy.yml` | Set to `"true"` to enable pushes to ECR. Absent = build-only. |
| `ECR_REGISTRY` | `deploy.yml` | `<account>.dkr.ecr.<region>.amazonaws.com` |
| `AWS_REGION` | `deploy.yml` | e.g. `us-east-2` |
| `AWS_DEPLOY_ROLE_ARN` | `deploy.yml` | OIDC role — no long-lived key required. |
| `SMOKE_TEST_ENABLED` | `release.yml` | Set to `"true"` when a live docker stack is available in CI. |
| `LOAD_TEST_ENABLED` | `release.yml` | Set to `"true"` after `k6` is installed on the runner (`release.yml` installs it via APT). |

### Adding a new environment (dev → staging → prod)

The current pipeline treats `main` merges as prod-track. To add staging:

1. Add a new branch `staging` (protect it).
2. Copy `deploy.yml` → `deploy-staging.yml`; change the trigger to `push: branches: [staging]` and swap the ECR secret names to a `_STAGING` suffix.
3. Add `ECR_ENABLED_STAGING`, `ECR_REGISTRY_STAGING`, `AWS_DEPLOY_ROLE_ARN_STAGING` in repo secrets.
4. Wire the smoke workflow at the staging URL so a merge to staging always runs smoke against a live sandbox before the change reaches `main`.

For preview-per-PR environments (nice-to-have, deferred at v1): add a `preview.yml` triggered on `pull_request`, deploy each PR into a namespaced sandbox, comment the PR with the URL, tear down on `pull_request:closed`. Cost is why we defer — a preview env costs ~$8/PR-day. Return to this at v3.

### Interaction with the rollback runbook

The `deploy.yml` workflow tags every image with **both** the git SHA (first 12 chars) and `latest`. The `scripts/rollback.sh` script consumes the same tag scheme:

```bash
miamo rollback <sha12>          # docker compose path
miamo rollback <sha12> --k8s    # kubernetes path
```

See `docs/architecture/dr-runbook.md` §4 for the full rollback procedure.

### Interaction with the DR runbook

The **daily RDS snapshot cadence** (see `docs/architecture/dr-runbook.md` §1) is orthogonal to CI/CD — RDS handles it directly. The **pre-migration paranoia dump** (`scripts/backup-postgres.sh`) is invoked manually by the operator immediately before running any migration in prod. There is no CI-driven migration step at v1; migrations are a **manual, gated, on-call operator action**. Rationale: automated migration workflows on CI are the most common source of catastrophic outages; at v1 volume the trade-off (5 min of human latency) is worth avoiding an entire class of incident.

---

*End of DEVOPS.md.*
