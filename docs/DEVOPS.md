# DevOps

Three deployment modes, one source of truth.

## 1. Local (bare-metal)

```bash
npm run setup           # installs node 20, docker, kubectl, minikube
npm start               # starts Postgres+Redis in docker, services in background, web in foreground
npm run logs            # tail logs
npm stop                # stop all
```

`npm start` is a wrapper around `bash scripts/start-services.sh local start` ([scripts/start-services.sh](scripts/start-services.sh)).

## 2. Docker-compose

```bash
npm run docker:up       # docker compose up -d --build
npm run docker:status   # docker compose ps
npm run docker:down     # docker compose down (keeps volumes)
```

Topology in [docker-compose.yml](docker-compose.yml):

| Service | Image / Build | Ports | Depends on |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `5432` | — |
| `redis` | `redis:7-alpine` | `6379` | — |
| `migrate` | `docker/migrate.Dockerfile` | — | postgres (healthy) |
| `auth` | `docker/auth.Dockerfile` | `3201` | postgres (healthy), migrate (completed) |
| `users` | `docker/users.Dockerfile` | `3202` | postgres, migrate |
| `social` | `docker/social.Dockerfile` | `3203` | postgres, migrate |
| `messaging` | `docker/messaging.Dockerfile` | `3204` | postgres, migrate |
| `content` | `docker/content.Dockerfile` | `3205` | postgres, migrate |
| `notifications` | `docker/notifications.Dockerfile` | `3206` | postgres, migrate |
| `gateway` | `docker/gateway.Dockerfile` | `3200` | all microservices |
| `web` | `docker/web.Dockerfile` | `3100` | gateway |

The fail-fast secret pattern (`${POSTGRES_PASSWORD:?required}`) means compose refuses to start without the required env vars.

## 3. Kubernetes

```bash
npm run k8s:dev         # applies k8s/templates/*.yaml with configuration/dev/values.yaml
npm run k8s:staging
npm run k8s:prod
```

Templates use `__PLACEHOLDER__` tokens that the deploy script substitutes from the chosen `values.yaml`.

### Manifest inventory ([k8s/templates/](k8s/templates/))

| File | Kind |
|---|---|
| `namespace.yaml` | Namespace + labels |
| `configmap.yaml` | non-sensitive env (NODE_ENV, FRONTEND_URL, service ports) |
| `gateway.yaml` | Deployment + NodePort Service |
| `web.yaml` | Deployment + NodePort Service |
| `service.yaml` | generic ClusterIP Deployment template |
| `postgres.yaml` | StatefulSet + headless Service + 10 Gi PVC |
| `redis.yaml` | StatefulSet + headless Service + 2 Gi PVC |
| `migrate-job.yaml` | one-shot Job (backoffLimit=3) with init-container netcat probe |
| `hpa.yaml` | HPA v2 (CPU 70 %, Mem 80 %, scale up +2/60s, down −1/120s) |
| `pdb.yaml` | minAvailable=1 |
| `network-policy.yaml` | default-deny + gateway/web ingress-from-world |

### Per-env values

[configuration/dev/values.yaml](configuration/dev/values.yaml), staging, prod. Differences:

| Key | dev | staging | prod |
|---|---|---|---|
| `namespace` | miamo | miamo-staging | miamo-prod |
| `replicas` | 1 | 2 | 3 |
| `imageTag` | (local) | `staging` | `latest` |
| `imagePullPolicy` | IfNotPresent | Always | Always |
| `resources.request.memory` | 32Mi | 64Mi | 128Mi |
| `resources.limit.memory` | 128Mi | 256Mi | 512Mi |
| `gateway.nodePort` | (clusterIP) | 30081 | 30082 |
| `web.nodePort` | (clusterIP) | 30444 | 30445 |

## 4. Migrations

Owned by [services/shared/prisma/](services/shared/prisma/) (one schema, many writers).

```bash
# locally
npm run db:migrate     # cd services/shared && prisma migrate dev
npm run db:seed        # tsx services/shared/prisma/seed.ts
npm run db:reset       # drop, remigrate, reseed
npm run db:studio      # Prisma web GUI

# in containers
docker compose run --rm migrate
# applies migrate-and-seed.sh which:
#   1. prisma migrate deploy
#   2. if SELECT COUNT(*) FROM "User" = 0, runs prisma/seed.ts
```

Latest migrations (see [services/shared/prisma/migrations/](services/shared/prisma/migrations/)):

- `20260601_v3_2_onboarding_showcase_access`
- `20260602_v3_2_partner_prefs`
- `20260603_v3_1_tracking_phase1`

Verify post-migration: `bash scripts/db-check.sh` or `python3 scripts/verify-db.py`.

## 5. Postgres tuning

[configuration/postgres/postgresql.conf](configuration/postgres/postgresql.conf):

- `max_connections = 100`
- `shared_buffers = 128MB`, `effective_cache_size = 256MB`
- `work_mem = 4MB`, `maintenance_work_mem = 64MB`
- `random_page_cost = 1.1`, `effective_io_concurrency = 200` (SSD)
- `log_min_duration_statement = 500` (log slow queries)
- timezone UTC

[configuration/postgres/init.sh](configuration/postgres/init.sh) installs `uuid-ossp` and `pgcrypto`, forces UTC.

## 6. Redis tuning

[configuration/redis/redis.conf](configuration/redis/redis.conf):

- `maxmemory 64mb` (256 mb in compose), `allkeys-lru`
- RDB snapshots: 900s/1key, 300s/10keys, 60s/10kkeys
- AOF on (compose); RDB-only (k8s default)
- `tcp-keepalive 300`, `protected-mode no` (cluster-internal only)

## 7. Workloads in production

- **gateway** ×3, HPA up to 10 — public ingress
- **auth / users / social / messaging / content / notifications** ×3 each — ClusterIP
- **ingest** ×2, HPA 2–10 (`tier: edge`) — public ingress for tracking
- **tracking-worker** ×1 (`tier: worker`) — single replica to avoid double-aggregation; auto-shards by Redis Stream partition if scaled
- **postgres** StatefulSet ×1, 10 Gi PVC (managed Postgres in real prod)
- **redis** StatefulSet ×1, 2 Gi PVC (managed Redis in real prod)

Probes everywhere: startup 5 s × 12 (60 s), liveness 30 s × 3, readiness 10 s × 3. Termination grace 30 s for clean SSE drain.

## 8. CI / release

- Tests: `npm test` runs vitest across `services/{shared,ingest,tracking-worker}` and `tests/` (29 files, 225 cases).
- Type-check: each service has `npx tsc --noEmit` (no separate workspace runner; CI invokes them sequentially).
- Tag conventions: semver-ish (`v4`, `v3.1-tracking`). Branches: `main` is production; topic branches gate on green CI.
- Build args: `NEXT_PUBLIC_API_URL` baked into the web image at build time.

## 9. Scripts cheat sheet

| Script | Use |
|---|---|
| `scripts/setup.sh` | Install prereqs (Node, Docker, kubectl, minikube) |
| `scripts/start.sh` | Top-level dispatcher: local / dev / stop / logs / test |
| `scripts/start-services.sh` | Unified start for local / docker / k8s |
| `scripts/api-test.sh <TOKEN>` | Curl-based smoke of public API |
| `scripts/db-check.sh` | Row counts per table |
| `scripts/verify-db.py` | API-side verification of UserActivity, Matches, Beats, Chats |
| `scripts/test-all.py` | Python HTTP test suite |
| `scripts/test-comprehensive.py` | Phase 9 full validation |
| `scripts/test-demo-users.py` | Login + key endpoints for `miamo1..10` |
| `scripts/algo-smoke.ts` | Standalone algo runner against live signals |
| `scripts/codemod-color-harmonize.mjs` | One-shot palette migration |

## 10. What changed & why it's good

- **Before:** Three different `docker-compose` files, K8s manifests pasted per environment, secrets in plaintext in git.
- **After:** One compose file with `${VAR:?required}` fail-fast; one templated K8s manifest set driven by per-env `values.yaml`; secrets handled out-of-band (Sealed Secrets / External Secrets recommended).
- **Why it matters:** Deploys are one command per environment; secret rotation never touches the manifests; new services follow a single template.
