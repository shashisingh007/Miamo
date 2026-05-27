# DevOps — from your laptop to a million users

Priya doesn't care that her swipe travels through Kubernetes pods,
NetworkPolicies, and a Horizontal Pod Autoscaler. She cares that the
app opens, stays open, and her like reaches Arjun in milliseconds —
on Tuesday at 9pm when half of India is also swiping.

This document walks you through the three rungs of the ladder: local
laptop → docker compose → Kubernetes — and the safety nets that keep
the lights on at scale.

---

## 1. The three stages, one command each

```mermaid
flowchart LR
    L[Your laptop<br/>npm run dev] --> D[docker compose up<br/>full stack on Docker]
    D --> K[helm upgrade<br/>k8s production]
```

| Stage      | Command                       | What runs                          | When you use it                |
|------------|-------------------------------|------------------------------------|--------------------------------|
| Local      | `cd services/X && npm run dev`| One service, hot-reload            | Iterating on one service       |
| Compose    | `docker compose up`           | Postgres + Redis + all 10 services | Full smoke test before pushing |
| Kubernetes | `kubectl apply -k k8s/`       | Production-equivalent setup        | Staging + production           |

---

## 2. Local development

```bash
# Postgres + Redis only
docker compose up -d postgres redis

# the service you're working on
cd services/social
npm install
DATABASE_URL=postgresql://miamo:miamo@localhost:5432/miamo \
REDIS_URL=redis://localhost:6379 \
npm run dev
```

Source files are watched; restart on save in ~600ms.

---

## 3. Docker Compose (the full stack)

[docker-compose.yml](docker-compose.yml) defines every service with
strict env-var requirements using the `${VAR:?required}` fail-fast
syntax. If you forget to set `JWT_SECRET`, compose refuses to start —
better than silently booting with a default secret.

```yaml
# excerpt
services:
  auth:
    image: miamo/auth
    environment:
      JWT_SECRET: ${JWT_SECRET:?required}
      DATABASE_URL: ${DATABASE_URL:?required}
    depends_on:
      postgres:
        condition: service_healthy
```

Start order is controlled by `depends_on.condition: service_healthy`,
so `social` won't try to connect to Postgres until Postgres reports
healthy.

```bash
cp .env.example .env       # then fill in real values
docker compose up
# web on http://localhost:3100
# demo login: demo@miamo.app / demo1234
```

---

## 4. Kubernetes (production)

Manifests live in [k8s/templates/](k8s/templates/). The shape:

```
k8s/templates/
├── namespace.yaml          ← one namespace per env
├── configmap.yaml          ← non-secret config (DB host, log level)
├── service.yaml            ← internal ClusterIP for every microservice
├── gateway.yaml            ← Deployment + Ingress for the front door
├── web.yaml                ← Deployment for Next.js standalone
├── postgres.yaml           ← StatefulSet
├── redis.yaml              ← StatefulSet
├── migrate-job.yaml        ← runs `prisma migrate deploy` once per release
├── hpa.yaml                ← autoscalers per deployment
├── pdb.yaml                ← pod disruption budgets
└── network-policy.yaml     ← default-deny + explicit allow rules
```

---

## 5. The three safety nets — in plain English

### 5.1 HPA — the elastic

**HPA** (Horizontal Pod Autoscaler) watches CPU and memory and adds or
removes pods automatically. Settings:

- target CPU: 70%
- target memory: 80%
- min replicas: 2
- max replicas: 20

**Real worked example.** It's 9pm Tuesday. CPU on `social` climbs:

```
21:00  3 pods at 55% CPU →   no action (below 70%)
21:05  3 pods at 78% CPU →   scale up: desired = ceil(3 · 78/70) = 4 pods
21:10  4 pods at 81% CPU →   scale up: desired = ceil(4 · 81/70) = 5 pods
21:30  5 pods at 60% CPU →   stable
23:30  5 pods at 25% CPU →   scale down (after 5-min cool-down) to 2 pods
```

### 5.2 PDB — minimum-pods-up promise

A **PDB** (Pod Disruption Budget) tells Kubernetes "during *voluntary*
disruption (node drain, upgrade), don't let more than this many pods
go down at once". For Miamo: `minAvailable: 1` for every service.

If the node hosting Priya's `gateway` pod is being drained for OS
patches, k8s waits until a new `gateway` pod is healthy elsewhere
before evicting the old one. Priya's tab keeps working.

### 5.3 NetworkPolicy — default-deny firewall

A **NetworkPolicy** is a pod-to-pod firewall rule. Our default is
**deny everything**, then we explicitly allow:

- `gateway` may call all 7 backend services
- `social` may call `messaging` and `notifications`
- everyone may reach `postgres` and `redis`
- `ingest` is reachable from the internet, but cannot call anyone
- nothing else

If a compromised pod tries to call out, it can't. Lateral movement is
killed at L4.

---

## 6. Releases — how a change ships

```mermaid
flowchart LR
    PR[Pull request] --> CI[CI: tests + lint + build]
    CI --> Stage[Staging: helm upgrade]
    Stage --> Smoke[Playwright smoke<br/>login → swipe → chat]
    Smoke --> Canary[Prod canary: 5% traffic]
    Canary --> Full[Prod 100%]
```

A release is just a Docker image tag. The migrate-job runs once per
release using [docker/migrate-and-seed.sh](docker/migrate-and-seed.sh)
which calls `prisma migrate deploy` (forward-only).

If the canary fails its health check or error rate exceeds 1%, the
rollback is a single `kubectl rollout undo deployment/<svc>`.

---

## 7. Observability — the four signals

For every service we collect:

1. **Latency** — p50, p95, p99 per route (Prometheus histograms).
2. **Traffic** — req/s per route.
3. **Errors** — 5xx rate per route.
4. **Saturation** — CPU and memory headroom vs. HPA target.

Plus business signals from `tracking-worker`:
- `events:raw` stream length (alert > 100k)
- `tw-rollup` consumer group lag (alert > 60s)
- 15-min rollup row counts (alert if 0)

Dashboards in Grafana, alerts to PagerDuty.

---

## 8. Secrets

Every secret lives in a Kubernetes Secret object, mounted as env vars.
The `.env.example` at the repo root lists every variable. The two you
must never rotate once data exists:

- `TRACKING_HASH_SECRET` (rotating breaks all historical userHashes)
- `ENCRYPTION_KEY` + `ENCRYPTION_SALT` (rotating makes all chats
  unreadable)

JWT secrets *can* be rotated — clients holding old tokens just need to
log in again.

---

## 9. Database migrations

Prisma migrations live in [services/shared/prisma/migrations/](services/shared/prisma/migrations/).
The release flow:

```bash
# in dev
cd services/shared
npx prisma migrate dev --name add_foo_column

# in prod (run by k8s migrate-job)
npx prisma migrate deploy
```

Forward-only — no down migrations. Backwards-incompatible schema
changes ship in two phases: add nullable column (release 1), backfill,
flip code to use it (release 2), drop old column (release 3).

---

## 10. Local-to-prod parity

The same Docker image runs in compose and in k8s. The only differences
are:
- env-var values (secrets, hostnames)
- replica counts (1 each locally vs. 2–20 in prod)
- resource limits (none locally vs. requests+limits in prod)

If it works in `docker compose up`, it works in k8s. We catch most
deltas at staging, not at 3am.

---

## 11. What changed and why it's better

- **Before:** one VM running everything, manual deploys, downtime
  during releases, no autoscaling, secrets in `.env` on disk.
- **After:** stateless services on k8s with HPA, PDB and NetworkPolicy;
  forward-only Prisma migrations run by a one-shot Job; secrets in
  Kubernetes Secrets; canary releases with one-command rollback.
- **Why Priya feels it:** the app does not go down when we release.
  Traffic spikes during the IPL final don't slow her swipes. When we
  ship a regression, it's reverted before she notices.

---

## 12. If something breaks

See [RUNBOOK.md](RUNBOOK.md) for the full incident playbook.
