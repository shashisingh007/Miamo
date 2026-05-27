# DevOps — How code becomes an app Priya uses

**TL;DR:** A developer pushes code → GitHub Actions runs tests + builds a Docker container → the container is deployed to Kubernetes (an automated building manager) → Priya's phone automatically starts using the new version.

---

## How to read this

- **Meera (non-tech)**: Read "The three stages" section only.
- **Priya (user/PM)**: Read sections 1-5 (local → compose → kubernetes basics).
- **Arjun (engineer)**: Read everything.

---

## The story of one deploy

It's 2pm Monday. A developer named Ravi fixes a bug in the chat service, pushes code to GitHub, and runs a coffee break. Here's what happens automatically:

```
2:00 pm: Ravi pushes code
2:01 pm: GitHub Actions kicks off: lint (code style check) + typecheck + unit tests
2:05 pm: Tests pass! GitHub Actions builds a Docker container (a shipping container for software)
2:07 pm: Container pushed to our registry
2:08 pm: Staging environment auto-deploys the new container
2:12 pm: Automated tests (Playwright) run: login → chat → send message. Pass!
2:15 pm: Ravi manually approves: "Deploy to production"
2:16 pm: Production deploys 5% of traffic to the new container (canary deployment)
2:20 pm: New container serving 5% of real users, zero errors. Auto-scales to 100%.
2:25 pm: All users using the new chat service. Ravi's fix is live.
```

If anything breaks at 2:16 pm (error rate spikes), Kubernetes auto-rolls back to the previous version in 30 seconds. Priya never notices.

---

## The three stages: laptop → compose → kubernetes

| Stage | Command | What runs | When you use |
|-------|---------|-----------|--------------|
| **Your laptop** | `cd services/chat && npm run dev` | One service, auto-reloading | Writing code, testing locally |
| **Docker Compose** | `docker compose up` | Postgres + Redis + all 11 services | Full-stack smoke test before push |
| **Kubernetes (k8s)** | `helm upgrade miamo chart/` | Staging or Production | After PR merge, deployed by CI |

---

## Stage 1: Your laptop

When you're working on the messaging service:

```bash
# Start Postgres and Redis only (don't need all 11 services)
docker compose up -d postgres redis

# In another terminal, start the messaging service
cd services/messaging
npm install
DATABASE_URL=postgresql://miamo:miamo@localhost:5432/miamo \
REDIS_URL=redis://localhost:6379 \
npm run dev

# Files are watched; changes auto-reload in ~600ms
```

**Why not run all 11 services locally?** Your laptop would need 16GB RAM and 4 CPU cores. Instead, run one service + Postgres + Redis, and the service talks to the real services in staging.

---

## Stage 2: Docker Compose (your laptop, full stack)

Before pushing, do a full smoke test:

```bash
cp .env.example .env    # Fill in real env vars

docker compose up
# Postgres on :5432
# Redis on :6379
# All 11 services spin up...
# web on http://localhost:3100
# gateway on http://localhost:3200
# etc.

# Demo login: demo@miamo.app / demo1234
```

**The docker-compose.yml is strict.** If you forget to set `JWT_SECRET`, compose refuses to start:

```yaml
services:
  auth:
    environment:
      JWT_SECRET: ${JWT_SECRET:?required}  # FAIL if not set
```

This catches configuration mistakes before they become 3am production incidents.

**Startup order is guaranteed.** Services wait for Postgres to report "healthy" before connecting:

```yaml
depends_on:
  postgres:
    condition: service_healthy  # Don't start until Postgres is ready
```

---

## Stage 3: Kubernetes (production + staging)

Kubernetes is an "automated building manager"—it runs your software in containers and keeps things running.

**The 10 templates in `k8s/templates/`:**

| File | What it does |
|------|-------------|
| `namespace.yaml` | Isolates staging/prod (separate databases, secrets) |
| `configmap.yaml` | Non-secret config (API endpoints, log levels) |
| `secret.yaml` | Secrets (database password, JWT key) — stored encrypted |
| `gateway.yaml` | The front door deployment + load balancer |
| `web.yaml` | Next.js web app deployment |
| `<service>.yaml` | Deployment for auth, users, social, messaging, etc. |
| `postgres.yaml` | Database (StatefulSet — keeps data if pod restarts) |
| `redis.yaml` | Shared whiteboard (StatefulSet) |
| `migrate-job.yaml` | One-time job: runs `prisma migrate deploy` on release |
| `hpa.yaml` | Horizontal Pod Autoscaler: adds/removes pods based on CPU |
| `pdb.yaml` | Pod Disruption Budget: keeps 1+ pod alive during upgrades |
| `network-policy.yaml` | Firewall: default-deny, then allow gateway → services |

---

## The 8 Docker containers (shipping containers for software)

Each service gets its own Dockerfile. They're all multi-stage (build code, then ship only the runtime):

```dockerfile
# Typical Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
CMD ["node", "dist/index.js"]
```

**What multi-stage does:**
- **Stage 1** (builder): Download npm packages, compile TypeScript → `.js` files
- **Stage 2** (final): Copy only the `.js` files + runtime. Leave behind the 500MB of build tools.
- **Result:** Final image is 120MB instead of 600MB

---

## Auto-scaling: when to add pods

The **HPA** (Horizontal Pod Autoscaler) watches CPU and memory. When they spike, it adds more pods automatically.

**Real scenario (Tuesday 9pm, everyone's swiping):**

```
Social service CPU usage over time:

21:00  3 pods at 55% CPU    → no action
21:05  3 pods at 78% CPU    → "We're busy!" Add 1 pod
21:10  4 pods at 81% CPU    → "Still busy!" Add 1 pod
21:30  5 pods at 60% CPU    → stable
23:30  5 pods at 25% CPU    → "It's quiet." Remove 3 pods (after 5-min cooldown)

HPA formula: desired = current * (actual_cpu / target_cpu)
           = 3 * (78% / 70%) = 3.34 → round up to 4
```

Settings:
- **Target CPU**: 70% (if it goes above, scale up)
- **Min replicas**: 2 (always at least 2 pods)
- **Max replicas**: 20 (never more than 20)

---

## Rolling updates: how to upgrade without downtime

When Ravi's code deploys, Kubernetes does this:

```
1. Start 1 new pod (new code)
2. Wait 10s for health checks to pass
3. Remove 1 old pod (old code)
4. Repeat until all pods are new
```

The load balancer keeps routing requests to healthy pods. If the new pod crashes, Kubernetes stops and keeps the old ones running.

**Canary deployment (production only):**
1. Deploy new code to 5% of traffic
2. Wait 5 min (monitor error rate)
3. If error rate > 1%, auto-rollback
4. If healthy, scale to 100%

**Rollback (if something breaks):**
```bash
# One command, back to the previous version
kubectl rollout undo deployment/messaging

# 30 seconds later, all traffic back on the old code
```

---

## Reliability: three safety nets

### Safety Net 1: HPA (Auto-scale when busy)

**In plain English:** "If users are spiking, add more servers."

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: social-hpa
spec:
  scaleTargetRef:
    name: social
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        averageUtilization: 70
```

On Tuesday 9pm when half of India is swiping, CPU jumps to 85%. HPA sees it and spins up from 3 pods to 8 pods. Priya's swipes never slow down.

### Safety Net 2: PDB (Pod Disruption Budget)

**In plain English:** "Never take down too many servers at once."

When Kubernetes needs to upgrade the operating system on a server, it drains all pods and moves them to other servers. The PDB says: "OK, but keep at least 1 pod of each service running at all times."

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: social-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: social
```

If the `social` node is being drained for OS patches, Kubernetes waits until a new `social` pod is healthy elsewhere before evicting the old one. Priya's swipes never pause.

### Safety Net 3: NetworkPolicy (Firewall)

**In plain English:** "Pod A can talk to Pod B. Pod C cannot. Default: deny everything."

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-gateway-to-services
spec:
  podSelector:
    matchLabels:
      app: social
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: gateway
```

If a pod is compromised (a hacker gets in), they can't call other services unless explicitly allowed. Lateral movement is blocked at layer 4.

---

## Migrations: updating the database

When the Discover algorithm gets a new column, we need to update the database schema:

```bash
# In dev
cd services/shared
npx prisma migrate dev --name add_compatibility_score

# Prisma creates:
# services/shared/prisma/migrations/20250527082345_add_compatibility_score/migration.sql

# In production (automatic, run by k8s migrate-job)
npx prisma migrate deploy
```

**Why forward-only?** We never delete columns in one release. If a schema change is big:
1. **Release 1**: Add nullable column
2. **Release 1 (night)**: Backfill data overnight
3. **Release 2**: Update code to use the new column
4. **Release 3**: Delete the old column

This way, if Release 2 has a bug, we can roll it back without losing data.

---

## Configuration: three environments

Each environment (dev / staging / prod) has its own secrets and config:

```
configuration/
├── dev/
│   └── values.yaml           # database: localhost:5432
├── staging/
│   └── values.yaml           # database: staging-postgres:5432
└── prod/
    └── values.yaml           # database: prod-postgres.internal:5432 (private)
```

The `values.yaml` is rendered into Kubernetes manifests at deploy time. Same code, different config.

---

## Observability: what we can see

For every service, we collect:

1. **Latency**: p50, p95, p99 milliseconds per route (Prometheus histograms)
2. **Traffic**: requests/second per route
3. **Errors**: 5xx rate per route (anything that goes wrong)
4. **Saturation**: CPU %, memory % vs. HPA target

**Alert examples:**
- If `events:raw` stream (the "sticky notes" of tracking events) grows past 100k, alert (means tracking-worker is dead)
- If Postgres connection pool is 95% full, alert (means query is hanging)
- If web LCP (time to first paint) > 3s, alert (means CDN or database is slow)

**Dashboards:**
- Grafana: latency, traffic, errors, CPU, memory
- Prometheus: raw metrics
- OpenTelemetry: request traces (why was this request slow?)

---

## Secrets management: what goes where

Every secret lives in a **Kubernetes Secret object**, encrypted at rest:

```bash
# Create a secret
kubectl create secret generic miamo-secrets \
  --from-literal=JWT_SECRET=xyz789 \
  --from-literal=ENCRYPTION_KEY=abc123

# Secret is stored encrypted in etcd (Kubernetes' database)

# Services access via env var
env:
  - name: JWT_SECRET
    valueFrom:
      secretKeyRef:
        name: miamo-secrets
        key: JWT_SECRET
```

**Secrets that can rotate:**
- `JWT_SECRET` (clients re-login after 15 min anyway)
- `INTERNAL_SERVICE_KEY` (brief window where both old+new work)
- `DATABASE_PASSWORD` (services reconnect with new password)

**Secrets that MUST NEVER rotate:**
- `ENCRYPTION_KEY` + `ENCRYPTION_SALT` (makes all messages unreadable)
- `TRACKING_HASH_SECRET` (makes all historical tracking events un-joinable)

---

## CI/CD: the assembly line

```
Ravi pushes code:

├─ Lint (eslint) — code style check
├─ Typecheck (tsc) — catch type errors
├─ Unit tests (vitest) — 225+ tests
├─ Build (tsc + webpack) — compile TypeScript
├─ Build Docker image
├─ Push to registry
├─ Deploy to staging
├─ Smoke test (Playwright): login → discover → chat
├─ Manual approval (Ravi clicks "Deploy to Prod")
├─ Deploy to production (canary: 5% traffic)
├─ Monitor (error rate, latency)
└─ Auto-scale to 100% (if healthy) or auto-rollback (if errors)
```

Total time: ~8 minutes from git push to live in production.

---

## What changed and why it's better

| Then | Now | Why |
|------|-----|-----|
| One big VM, manual deploys | Kubernetes with HPA, PDB, NetworkPolicy | Zero-downtime deploys, auto-scale, safe upgrades |
| Long-lived processes | Stateless containers | Easy to scale, no "session affinity" headaches |
| Secrets in `.env` file on disk | Kubernetes Secrets (encrypted) | Secrets not checked into git, encrypted at rest |
| No database migrations | Prisma migrate (forward-only) | Rollbacks work, schema is versioned |
| Manual rollback | `kubectl rollout undo` (30 seconds) | One command, not a war room at 3am |
| All errors go to stdout | Pino structured logging | Logsearch for errors, not grep |

**Why Priya feels it:**
- The app never goes down when we deploy (zero downtime)
- Her swipes don't slow down when millions of people join (auto-scale)
- If we ship a bug, it's reverted in 30 seconds before she notices

---

## If something breaks

See [RUNBOOK.md](RUNBOOK.md) for the full incident playbook (e.g., "Postgres CPU at 100%", "Redis memory full", etc.).

Common checks:

```bash
# See all pods and their status
kubectl get pods -n miamo

# See logs from a service
kubectl logs -l app=social --tail=100 -n miamo

# Rollback to the previous version
kubectl rollout undo deployment/social -n miamo

# Scale a service temporarily
kubectl scale deployment/social --replicas=10 -n miamo
```
