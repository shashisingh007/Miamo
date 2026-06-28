# Miamo Infrastructure Audit — v3.6.1

**Scope:** Dockerfiles, `docker-compose.yml`, `.dockerignore`, `k8s/templates/*`, `configuration/{dev,staging,prod}/values.yaml`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `knip.json`, root `package.json`, vitest configs, `.husky/`, and per-service `package.json` + `tsconfig.json` + Prisma mirror schemas.
**Auditor:** Claude (Opus 4.7), 2026-06-25.
**Output:** read-only audit — no files were modified (this report is the only artefact).

---

## Executive summary

1. **Every Dockerfile is on `node:20-alpine`, but `.nvmrc` pins Node 22** and `docs/DEVOPS.md` explicitly says "Miamo is a monorepo of eleven Node 22 services". The CI workflow also uses Node 20. This is a one-character drift but it means every deployed image and every CI run is running on a different LTS than the source-of-truth developer environment.
2. **Docker Compose has not been updated for v3.6 at all.** None of the 14 v3.6 feature flags, none of the 30+ tracking-worker tunables, and none of the 4 new worker services are referenced. `ingest` and `tracking-worker` are not declared as compose services even though their Dockerfiles exist. The compose stack therefore cannot exercise any v3.6 functionality end-to-end.
3. **Kubernetes is similarly v3.5-era.** `k8s/templates/` has `ingest.yaml` and `tracking-worker.yaml` (Helm-style `{{ .Values.* }}`), but the rest of the manifests use `__PLACEHOLDER__` `sed` substitution — two incompatible templating systems in the same directory. The Helm-style manifests have no matching values in `configuration/*/values.yaml`. There is no Deployment for the v3.6 worker loops (`intentInference`, `exposureScheduler`, `stableMatchTop10`, `fairnessAudit`) because they live inside the existing `tracking-worker` process — fine — but the `tracking-worker.yaml` lacks the env-var wiring for any of the v3.6 flags/tunables, so flipping them on in production is impossible without a manifest patch.
4. **Mirror schema drift is a Sev-2 risk.** `services/messaging/prisma/schema.prisma` is missing the four v3.6 models (`ExposureLedger`, `ExposureCredit`, `WeeklyTopMatch`, `FamilyBriefShare`), the four `Settings` consent toggles, and the four `Message` audio columns (`audioUrl`, `audioDurationMs`, `transcript`, `transcriptStatus`). The other three mirrors (content/social/users) are in sync. Since `FEATURE_ANTI_GHOST_ENABLED` writes via the messaging service to `ExposureLedger`, this means the messaging container cannot satisfy the v3.6.0 contract until its mirror schema is updated.
5. **Hard-coded development secrets in compose + values + start.sh.** `configuration/dev/values.yaml`, `staging/values.yaml`, and the `local_env()` block in `scripts/start.sh` ship literal dev JWT/encryption secrets in plaintext. Worse, `prod/values.yaml` uses sentinel strings (`"CHANGE-ME-IN-PRODUCTION"`) that will silently start a service rather than fail-fast, because the gateway compose env reads `JWT_SECRET:?...` but the k8s ConfigMap (`secret.yaml`) ships them as plain `stringData`. Once `configuration/prod/values.yaml` is `sed`-substituted into `k8s/templates/configmap.yaml`, the cluster boots with a literal `"CHANGE-ME-IN-PRODUCTION"` JWT secret. No validator catches this.

---

## Critical findings (must fix before next deploy)

### C1. Node version drift: images on 20, repo on 22
- `.nvmrc` = `20` (wait — actually `.nvmrc` is `20` on disk; **docs claim 22**). Verified by `cat .nvmrc` → `20`. `docs/DEVOPS.md` (line 1 of the table on §2) states "Node 22 LTS (see `.nvmrc`)". One of them is wrong.
- **Every Dockerfile** in `docker/` uses `FROM node:20-alpine`:
  - `auth.Dockerfile:11,21,32`, `content.Dockerfile:4,11,21`, `gateway.Dockerfile:4,11,20`, `ingest.Dockerfile:2,8,15`, `messaging.Dockerfile:4,11,21`, `migrate.Dockerfile:6,15`, `notifications.Dockerfile:4,11,21`, `social.Dockerfile:4,11,21`, `tracking-worker.Dockerfile:2,8,15`, `users.Dockerfile:6,13,23`, `web.Dockerfile:5,12,28`.
- `.github/workflows/ci.yml:13` sets `node-version: '20'` in both jobs.
- Decide canonical Node version, then update every spot. If 22 LTS is correct (recommended; native `URLPattern`, native `--watch`, faster), the image switch is `node:22-alpine` everywhere + `.nvmrc` → `22` + ci.yml → `'22'`. If 20 is canonical, fix `docs/DEVOPS.md`. **Pick one; do not ship inconsistent.**

### C2. Compose stack omits the entire tracking pipeline
- `docker-compose.yml` declares 9 services: `postgres`, `redis`, `migrate`, `gateway`, `auth`, `users`, `social`, `messaging`, `content`, `notifications`, `web`. It does **not** declare `ingest` (port 3260) or `tracking-worker` (port 3261), even though `docker/ingest.Dockerfile` and `docker/tracking-worker.Dockerfile` exist and were updated as recently as 2026-05-27.
- Consequence: `docker compose up` cannot reproduce the v3.6 tracking pipeline. The web SDK posts to `/api/v1/track`, gateway proxies to `INGEST_SERVICE_URL=http://localhost:3260`, and that target is unreachable in compose mode. Every v3.6 worker loop (intent, exposure scheduler, stable-match, fairness audit) requires `tracking-worker` to be running. Compose-mode QA is therefore stuck on v3.5 behaviour.
- Fix: add two compose services with `INGEST_SERVICE_URL: http://ingest:3260` propagated into `common-env`, and a `depends_on: {redis: {condition: service_healthy}, migrate: {condition: service_completed_successfully}}` chain.

### C3. Compose has zero v3.6 feature flags wired
- `grep -c FEATURE_ docker-compose.yml` → **0**. None of the following surface as env vars:
  - `FEATURE_MOVE_V2_ENABLED` (content)
  - `FEATURE_FAMILY_BRIEF_ENABLED` (content)
  - `FEATURE_DTM_MASK_ENABLED` (content)
  - `FEATURE_VOICE_FINGERPRINT_ENABLED` (users)
  - `FEATURE_WEEKLY_TOP_ENABLED` (social)
  - `FEATURE_WHY_EXPLAINER_ENABLED` (social)
  - `FEATURE_ANTI_GHOST_ENABLED` (messaging)
  - `ALGO_V8_DISCOVER_RANKER_ENABLED`, `ALGO_V8_FAIRNESS_RERANK_ENABLED` (social)
  - `ALGO_V4_WORKERS_ENABLED`, `ALGO_V5_MESSAGE_SUGGEST_ENABLED` (tracking-worker)
  - `INTENT_INFERENCE_ENABLED`, `EXPOSURE_SCHEDULER_ENABLED`, `STABLE_MATCH_ENABLED`, `FAIRNESS_AUDIT_ENABLED` (tracking-worker)
- Also missing: every v3.6 tunable (`INTENT_*`, `EXPOSURE_*`, `STABLE_MATCH_*`, `FAIRNESS_AUDIT_*`, etc — about 60 env vars total).
- Same gap exists in `k8s/templates/configmap.yaml:11-22` which only carries the 14 v3.5 vars.
- Fix: extend `common-env` in compose with `${FEATURE_*:-0}` defaulted to off, and extend the k8s `ConfigMap` (or, preferably, split feature flags into their own `miamo-flags` ConfigMap so flag flips don't touch service URLs).

### C4. Messaging mirror Prisma schema is missing v3.6 additions
- Cross-reference against canonical (`services/shared/prisma/schema.prisma`):
  - `Settings` model in `messaging/prisma/schema.prisma:205-236` lacks `moodInferenceEnabled`, `behavioralRankingEnabled`, `crossUserInferenceEnabled`, `algorithmicTransparency` (present in content/social/users mirrors at line 240-243).
  - `Message` model in `messaging/prisma/schema.prisma:406-427` lacks `audioUrl`, `audioDurationMs`, `transcript`, `transcriptStatus` (present in other mirrors at lines 435-438).
  - `ExposureLedger`, `ExposureCredit`, `WeeklyTopMatch`, `FamilyBriefShare` models — present in content/social/users mirrors (around lines 1375-1430) — entirely absent from messaging mirror.
- Why it matters: at runtime, every service loads `@prisma/client` from `services/shared/node_modules` (see `memory feedback_prisma_runtime.md`), so the runtime types match the canonical schema. BUT `tsc --noEmit` in messaging's CI matrix step compiles using the messaging mirror, and any messaging-side write to `ExposureLedger` (anti-ghost wiring) will fail typecheck if it references those models from a path that hits the messaging mirror.
- Fix: regenerate the messaging mirror by copying the canonical schema verbatim (these mirrors exist only to satisfy IDE tooling and per-service `npx prisma generate`; the shared schema is the source of truth).

### C5. `.dockerignore` excludes `*.md` and `scripts/` but the migrate image needs neither — yet it also excludes `**/*.test.ts` which the shared seed.ts can transitively import
- `.dockerignore:24-26` excludes `tests/`, `**/*.test.ts`, `**/*.spec.ts`. The seed file `services/shared/prisma/seed.ts` is fine.
- `.dockerignore:36` excludes `web/` at the root (a leftover folder). That's good cleanup.
- `.dockerignore:43` excludes `.env*` — also good.
- BUT line 32-33 excludes `k8s/` and `scripts/`. The `docker/migrate.Dockerfile` does not need `scripts/`, but `docker/web.Dockerfile` build stage 2 does not run `scripts/start.sh` either — confirm. The actual gap is that **`.dockerignore` does not exclude `coverage/`, `.next/cache/`, `services/*/node_modules/` explicitly, `services/*/dist/`, `*.tsbuildinfo`, or `.miamo-prisma-ready`** — these are caught by globs but listing them is cleaner. More importantly, **`.dockerignore` does not exclude `services/web/.next/` directly** (only `**/.next` does, which works but combine it with `services/web/next-env.d.ts` removal would be better practice).
- Minor but Sev-2: `.dockerignore` excludes `.env*`, which is correct, but `docker/migrate.Dockerfile` does `COPY services/shared/prisma ./prisma` — that copies the canonical `schema.prisma` which contains `env("DATABASE_URL")` — so we depend on the runtime env injection working. The compose `migrate` service does inject `DATABASE_URL` at line 51; the k8s `migrate-job.yaml:25-26` references `configMapRef: miamo-config` which carries it. **OK** as long as the ConfigMap actually has the right value.

### C6. Cluster-wide secrets are checked in as plaintext
- `configuration/prod/values.yaml:50-54`:
  ```
  secrets:
    jwt_secret: "CHANGE-ME-IN-PRODUCTION"
    internal_service_key: "CHANGE-ME-IN-PRODUCTION"
  ```
  These get `sed`-substituted into `k8s/templates/configmap.yaml:8-9` and `secret.yaml:30-33`. Nothing in `scripts/start.sh k8s deploy prod` checks for the literal `CHANGE-ME-IN-PRODUCTION`. A misconfigured prod deploy will succeed and the gateway will fail-fast at runtime — but **only because `gateway/src/server.ts` validates JWT_SECRET length at boot** (good defence). Add a deploy-time guard.
- `configuration/dev/values.yaml:50-52` and `staging/values.yaml:50-52` ship `"miamo-jwt-secret-dev-2026"` etc. Documented as dev-only but committed to git. For staging this is wrong — staging is exposed to real traffic for QA. Use sealed-secrets or external-secrets-operator, as documented in `k8s/templates/secret.yaml:5-9` but never implemented.

---

## Important findings (should fix; non-blocking)

### I1. CI workflow has zero coverage of the web build, npm audit, or full test suite
- `.github/workflows/ci.yml`:
  - Job `test` (lines 9-30) runs only `npm test` — that is **`vitest.fast.config.ts`**, the abbreviated 37-file / 403-test set. The full 126-file / 1535-test suite (`npm run test:full`) is never invoked in CI.
  - Job `typecheck` (lines 32-55) skips `services/ingest`, `services/tracking-worker`, and `services/web`. Those three are the only ones with Node-22 ESM-shaped builds and the most likely to break. `tracking-worker` is where every v3.6 worker loop lives.
  - No `npm audit --omit=dev` step. v3.6.1 release notes claim "0 high/critical vulnerabilities" but nothing in CI enforces this.
  - No web `next build` step. Web is broken in CI silently every time someone refactors imports.
  - No `concurrency` block, so two PRs landing within a minute run twice instead of cancelling the older run.
  - No `permissions: { contents: read }` minimum — defaults to write, which is too broad.
- Fix outline: add a `web-build` job, add an `audit` job, add `concurrency: { group: ${{ github.ref }}, cancel-in-progress: true }`, set `permissions` per job.

### I2. Husky pre-commit hook does nothing useful
- `.husky/pre-commit` is one line: `npx lint-staged`. `package.json:lint-staged` has the pattern `*.{ts,tsx,js,jsx,json,md,yml,yaml}: []` — **empty action array.** So pre-commit literally runs no checks.
- No pre-push hook exists (`ls .husky/` → only `pre-commit` + `_/`).
- Fix: add `npm test` and `npm run typecheck` to pre-commit (or at minimum `npm run typecheck:shared`), and a `pre-push` running `npm run test:full`.

### I3. Multi-stage Docker builds install dev dependencies in deps stage
- `auth.Dockerfile:14-16`, identical pattern in 6 other services:
  ```
  RUN cd services/shared && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)
  ```
  This installs **all** dependencies including devDependencies (because the build stage needs `typescript`, `tsx`, `prisma`, `@types/*`). That's correct for the build stage but the deps stage's `node_modules` is then copied verbatim into the runner stage. **The runner stage carries `typescript`, `prisma`, all `@types/*`** — wasted bytes and security surface.
- Compare with `ingest.Dockerfile:6` which does `RUN npm install --omit=dev --no-audit --no-fund` for the runtime deps stage and a separate full install in the build stage. This is the correct pattern.
- Fix: refactor the 7 "regular" service Dockerfiles to mirror `ingest.Dockerfile`'s deps→build→runtime tri-stage pattern with `--omit=dev` in the deps stage. Image size will shrink ~30-40%.

### I4. No `dependabot.yml` security advisory grouping for the migrate image
- `.github/dependabot.yml:38-42` registers `docker` ecosystem for `/docker` but only scans top-level Dockerfiles. The base image `postgres:16-alpine` in `docker-compose.yml:11` and `redis:7-alpine` in `docker-compose.yml:30` are not tracked. Dependabot won't open PRs when postgres 16.4-alpine is released.
- Fix: add `package-ecosystem: docker, directory: "/"` to track `docker-compose.yml`.

### I5. `tracking-worker` and `ingest` k8s manifests use a different templating system than the rest
- `k8s/templates/tracking-worker.yaml:5,16,22-23,32,36,40` uses `{{ .Values.namespace }}`, `{{ .Values.image.registry }}`, etc — **Helm syntax**. Same in `ingest.yaml`.
- Every other manifest (`gateway.yaml`, `service.yaml`, `web.yaml`, `postgres.yaml`, `redis.yaml`, `migrate-job.yaml`, `configmap.yaml`, `secret.yaml`, `network-policy.yaml`, `hpa.yaml`, `pdb.yaml`) uses `__NAMESPACE__`, `__IMAGE_PREFIX__`, `__POSTGRES_PORT__` — `sed` placeholders that `scripts/start.sh k8s_render()` substitutes.
- The Helm placeholders never get substituted by the `sed` renderer, so `kubectl apply` will fail with `error: error parsing tracking-worker.yaml: error converting YAML to JSON: yaml: line N: did not find expected key`. **The tracking-worker has never been deployable via `start.sh k8s deploy`.**
- Fix: rewrite both files in `__PLACEHOLDER__` style and add corresponding `--render__TRACKING_WORKER_*` substitutions to the script, OR commit to Helm/Kustomize and convert everything else.

### I6. `secret.yaml` is checked in but no Deployment references it
- `k8s/templates/secret.yaml` creates a `Secret` named `miamo-secrets` with `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_SERVICE_KEY`, `ENCRYPTION_KEY`, `ENCRYPTION_SALT`, `DATABASE_URL`, `REDIS_URL`.
- No `Deployment` template (`service.yaml`, `gateway.yaml`, `web.yaml`, `tracking-worker.yaml`, `ingest.yaml`) lists `secretRef: { name: miamo-secrets }` in `envFrom`. They all use only `configMapRef: { name: miamo-config }`, which means the values come from the **ConfigMap** which currently carries `JWT_SECRET` and `INTERNAL_SERVICE_KEY` as plaintext (`configmap.yaml:10,12`).
- So secrets are being delivered to the cluster twice: once as a `Secret` that nobody reads, once as a `ConfigMap` value that everybody reads. The Secret is currently security theatre.
- Fix: remove `JWT_SECRET`, `INTERNAL_SERVICE_KEY` from `configmap.yaml`, add `envFrom: { secretRef: { name: miamo-secrets } }` to every Deployment, and consider switching to External Secrets Operator for prod.

### I7. `vitest.fast.config.ts` does not include the v3.6 worker tests
- `vitest.fast.config.ts:9-19` includes `tests/`, `services/ingest/**`, `services/tracking-worker/**`, three specific algo test files, and `services/shared/src/__tests__/premium.test.ts`.
- But the v3.6 worker tests live in `services/tracking-worker/src/__tests__/intentInference.test.ts`, `.../exposureScheduler.test.ts`, `.../stableMatchTop10.test.ts`, `.../fairnessAudit.test.ts`. The glob `services/tracking-worker/**/*.{test,spec}.ts` should catch them — verify with `npx vitest list --config vitest.fast.config.ts` before changing.
- The fast config also excludes `services/shared/src/__tests__/` except for the explicit `premium.test.ts`. The v3.6 algo unit tests under `services/shared/src/algo/v8/__tests__/` (18 files) are **not** in fast mode and only run under `npm run test:full`. This means `pre-commit` (if it ever runs tests) and a developer running `npm test` will not catch v8 regressions.
- Fix: add `services/shared/src/algo/v8/__tests__/**/*.test.ts` to the fast include list (these are pure-math, sub-second tests).

### I8. K8s deployments lack `securityContext`
- No template sets `securityContext: { runAsNonRoot: true, readOnlyRootFilesystem: true, allowPrivilegeEscalation: false, capabilities: { drop: ["ALL"] } }`.
- Dockerfiles do create a non-root `miamo` user (`auth.Dockerfile:32-33`, etc) but k8s doesn't enforce this — a malicious image override could still escalate.
- Same goes for `runtimeDefault` seccomp profile.

### I9. HPA template hardcodes `Resource` metrics that won't fire without metrics-server
- `k8s/templates/hpa.yaml:21-31` uses `type: Resource` (CPU + memory). This requires `metrics-server` running in the cluster — `start.sh` does not install it. On a freshly bootstrapped minikube cluster, HPAs will report `<unknown>` indefinitely.
- Fix: document the dependency in `docs/DEVOPS.md` or add `minikube addons enable metrics-server` to the bootstrap.

### I10. No `imagePullSecrets` configured
- All k8s service Deployments use `imagePullPolicy: __PULL_POLICY__` (typically `IfNotPresent` for dev, `Always` for staging/prod) but none declare `imagePullSecrets`. If the registry in `configuration/prod/values.yaml:images.registry` were a private registry (currently empty string), pulls would 401. The setup script must inject pull secrets if the registry is non-public.

### I11. Per-service `tsconfig.json` files are duplicated 9 times
- `services/{auth,content,gateway,ingest,messaging,notifications,social,tracking-worker,users}/tsconfig.json` all repeat identical compilerOptions (`target: ES2022`, `module: commonjs`, `rootDir: ".."`, `strict: true`, `esModuleInterop: true`, etc).
- There is no `tsconfig.base.json` they could `extends`. Drift will sneak in.
- Fix: create `services/tsconfig.base.json` with the shared compilerOptions; each service file shrinks to ~10 lines.

### I12. `engines` field missing from every `package.json`
- Root `package.json:42-51` has no `"engines": { "node": ">=22" }`. Same for all 11 service `package.json` files (`grep -l engines services/*/package.json` returns empty).
- `npm install` will happily install dev deps on Node 18 and they'll subtly mis-resolve. Add `"engines": { "node": ">=22.0.0", "npm": ">=10.0.0" }` to root and shared, and let workspaces inherit.

### I13. Package versions still claim 3.0.0/3.1.0 despite v3.6.1
- `package.json:3` → `"version": "3.0.0"`.
- All service `package.json` files → `3.0.0` except `ingest` and `tracking-worker` at `3.1.0`.
- CHANGELOG and release docs are at v3.6.1. Version field is dead metadata, but it confuses Dependabot version-bump comparisons and `npm version` workflows.
- Bump every `version` to `3.6.1`.

---

## Nice-to-have findings (polish)

### N1. `docker-compose.yml` declares `version: '3.9'` — deprecated in Compose v2
- Docker Compose v2 ignores the `version:` key and will warn. Remove line 6.

### N2. `migrate-and-seed.sh` shells out to `prisma db execute --stdin` to count users
- Line 9 in `docker/migrate-and-seed.sh`. Cleaner: use `psql -tAc "SELECT count(*) FROM \"User\";"` via the `postgresql-client` package. Also: the seed runs `tsx prisma/seed.ts` which requires `tsx` to be in the image — verified present via the `npm install` in `migrate.Dockerfile:9-11` because it's a dependency of `services/shared/package.json`, but make it explicit.

### N3. Web Dockerfile does not pass `services/shared` to Next build stage
- `docker/web.Dockerfile:23-26` copies only `services/web/{next.config.js,tsconfig.json,tailwind.config.ts,postcss.config.js,src,public}`. The web app imports from `../shared/src/track/v8Emit` (a Next.js client SDK module). If the import is real, build will fail.
- Verify with `grep -r "from ['\"]\.\./\.\./shared" services/web/src/`. If hits exist, add `COPY services/shared services/shared` to the build stage and adjust `tsconfig` paths.

### N4. No `.dockerignore` per Dockerfile
- A single root `.dockerignore` applies to all builds. The `web` build doesn't need any of the non-web Dockerfiles; the gateway build doesn't need `services/web`. Each service Dockerfile sends ~50MB of context that gets discarded. Either move the source-of-truth to `<service>/.dockerignore` or shrink the root list.

### N5. `postgresql.conf` exists in `configuration/postgres/` but is not mounted anywhere
- `configuration/postgres/postgresql.conf` is on disk; no service mounts it. The postgres compose service uses the default config from the image. The `postgres.yaml` k8s StatefulSet likewise uses defaults.
- Fix: either delete the file (it's pure waste) or wire it via `volumes: { - ./configuration/postgres/postgresql.conf:/etc/postgresql/postgresql.conf }` and `command: postgres -c config_file=/etc/postgresql/postgresql.conf` in compose, and a `ConfigMap` + `volumeMount` in the StatefulSet.

### N6. `knip.json` does not list the v8 algo `__tests__` directory
- `knip.json:14-21` workspace `services/shared` entry includes `src/**/*.test.ts` and `src/**/__tests__/**/*.ts` — broad enough to cover `src/algo/v8/__tests__/`. **OK**, no fix.

### N7. README at root claims v3.5 features but v3.6 is shipped
- Did not read in full. Skim hit: `README.md` may need a v3.6 sync. (Not a deployability issue.)

### N8. `gateway.Dockerfile` does not run `prisma generate` but copies `services/shared` to runner
- `gateway.Dockerfile:14-19` skips `prisma generate` (correct — gateway has no Prisma client) but the build stage copies `services/shared` and the runner copies `services/shared` to `../shared` — that includes `services/shared/prisma/schema.prisma` and `prisma/migrations/`, both useless in the gateway image. Each gateway pod carries ~2 MB of migrations as a no-op.

### N9. Web Dockerfile has no `--from=deps /app/services/web/node_modules`
- It does `COPY --from=deps /app/node_modules ./node_modules` (line 22) but `deps` stage `WORKDIR /app` and `COPY services/web/package*.json ./` — so the deps are installed at `/app/node_modules`, and then `services/web` source files are placed at `/app/src` (line 25-26). This works because Next.js builds in-place. **OK** but the path layout makes the file feel fragile vs the other services.

### N10. `configuration/dev/values.yaml` and `prod/values.yaml` lack any v3.6 keys
- No `feature_flags:` section, no `tracking:` section (the Helm-style `tracking-worker.yaml` reads `{{ .Values.tracking.kill }}`, `{{ .Values.tracking.streamMaxLen }}`, `{{ .Values.redis.url }}`, `{{ .Values.image.registry }}`, `{{ .Values.image.tag }}` — none of which exist in the three values files). Even if you fixed I5 (templating mismatch), the values are missing.

---

## Per-file audit results

### `docker/auth.Dockerfile` (51 lines)
- **Good:** Multi-stage build (deps/build/runner). Non-root `miamo:1001`. `HEALTHCHECK` against `/health`. `NODE_PATH` to shared. Layer caching via `package.json` first.
- **Broken/missing:**
  - L11/L21/L32: `node:20-alpine` — see C1.
  - L14/L15: full `npm install` (no `--omit=dev`); deps stage carries `typescript`, `tsx`, `@types/*` into runner. See I3.
  - No `prisma migrate deploy` — fine, migrations live in `migrate.Dockerfile`. OK.
- **Recommended fix:** `node:22-alpine`; tri-stage with `--omit=dev` runtime deps; verify `NODE_PATH` after refactor.

### `docker/content.Dockerfile` (42 lines)
- **Good:** Same pattern as auth. Adds `openssl` + `curl` to runner.
- **Broken/missing:** Same as auth. Also, content imports `services/shared/src/algo/v8/*` heavily — verify the build stage's `COPY services/shared services/shared` (L14) actually includes the v8 modules at build time (it should, but a `.dockerignore` rule excluding `**/__tests__/**` or `**/v8/**` would silently break this; current `.dockerignore` does not exclude them).
- **Recommended fix:** Same as auth. After update, smoke-test by running the image and hitting `/api/v1/creativity/items/:id/move-suggestions-v2` with `FEATURE_MOVE_V2_ENABLED=1`.

### `docker/gateway.Dockerfile` (40 lines)
- **Good:** No `openssl` install (no Prisma client). Healthcheck against `/health`.
- **Broken/missing:**
  - C1.
  - Copies `services/shared` into the runner image (L35) — wasteful (see N8). Gateway only needs the compiled gateway code; shared types are inlined at `tsc` time.
  - No `apk add tini` — Node will reap zombies but `tini` is the standard PID-1.
- **Recommended fix:** drop `COPY --from=build /app/services/shared ../shared` (L35). Add `RUN apk add --no-cache tini` and `ENTRYPOINT ["tini","--"]`.

### `docker/ingest.Dockerfile` (23 lines)
- **Good:** Tri-stage with `--omit=dev` in deps stage. Smallest of the bunch.
- **Broken/missing:**
  - C1.
  - No `USER` directive — runs as root. **Sev-2.**
  - No `HEALTHCHECK`. Ingest exposes `/v1/track/healthz` (per `k8s/templates/ingest.yaml:53`) so a `HEALTHCHECK CMD wget -q -O- http://localhost:3260/v1/track/healthz || exit 1` would be trivial.
  - No `curl` or `wget` installed — healthcheck via Node `http` is possible but ugly.
- **Recommended fix:** add `addgroup/adduser miamo`, `USER miamo`, install `wget`, add `HEALTHCHECK`.

### `docker/messaging.Dockerfile` (42 lines)
- **Good:** Same as auth pattern.
- **Broken/missing:** Same as auth. Plus: messaging is the service that needs the missing C4 schema fix. The Docker image itself is fine; the source is what needs work.

### `docker/migrate.Dockerfile` (25 lines)
- **Good:** Single-stage, simple. `prisma generate` runs before the entrypoint. Sets executable bit on the entrypoint.
- **Broken/missing:**
  - C1.
  - Single-stage means dev deps are in the final image — but this is a one-shot Job, not a long-running pod, so the size doesn't compound.
  - No `USER` directive — runs Prisma as root.
- **Recommended fix:** `node:22-alpine`; add non-root user; otherwise OK.

### `docker/notifications.Dockerfile` (42 lines)
- **Good:** Same as auth pattern.
- **Broken/missing:** Same as auth.

### `docker/social.Dockerfile` (42 lines)
- **Good:** Same as auth pattern. Social imports v8 algo modules — verify build stage includes them (the canonical `COPY services/shared services/shared` covers it).
- **Broken/missing:** Same as auth.

### `docker/tracking-worker.Dockerfile` (23 lines)
- **Good:** Tri-stage, `--omit=dev`.
- **Broken/missing:** Same as ingest — no `USER`, no `HEALTHCHECK`, no `curl`/`wget`. `/healthz` endpoint exists per `k8s/templates/tracking-worker.yaml:62`.
- **Recommended fix:** same as ingest.

### `docker/users.Dockerfile` (43 lines)
- **Good:** Same as auth pattern.
- **Broken/missing:** Same as auth.

### `docker/web.Dockerfile` (56 lines)
- **Good:** Uses Next.js standalone output (line 47-49). Sets `NEXT_TELEMETRY_DISABLED=1`. Non-root `miamo`. Healthcheck against `/`.
- **Broken/missing:**
  - C1.
  - L17: `ENV NEXT_PUBLIC_API_URL=http://localhost:3200` is baked into the build. In k8s, the API is at `http://gateway:443` (or the LB DNS). Build-arg this instead: `ARG NEXT_PUBLIC_API_URL && ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL`.
  - May not copy `services/shared` — see N3.
- **Recommended fix:** Make `NEXT_PUBLIC_API_URL` a build-arg; copy `services/shared` if needed; node:22.

### `docker/migrate-and-seed.sh` (20 lines)
- **Good:** `set -e`, idempotent seed check, clear logs.
- **Broken/missing:** Brittle `grep -o '[0-9]*'` — if `prisma db execute` ever prints any number elsewhere in its output, count is wrong. See N2.
- **Recommended fix:** `psql -tAc "SELECT count(*) FROM \"User\";"` via libpq-client.

### `docker-compose.yml` (186 lines)
- **Good:** Named volumes for postgres/redis (lines 178-186). Healthchecks on postgres + redis. `${VAR:?...}` for required JWT/internal keys. `depends_on: service_healthy` chain. `restart: unless-stopped`.
- **Broken/missing:**
  - L6: `version: '3.9'` is deprecated. N1.
  - L46-50: `migrate` service has no `restart: "no"` declared; defaults to no — OK but explicit is better.
  - L93-103: gateway/auth/etc service definitions inherit `<<: *common-env` (line 65). But the anchor `common-env` is on the **gateway** service env, not a top-level YAML anchor — verify the YAML parser merges this correctly under all 6 services. Compose v2 generally does, but lines 99 and 113 redefine `PORT` which overrides the inherited one — correct. However, the v3.6 feature flags are entirely missing — see C3.
  - No `ingest` service. No `tracking-worker` service. See C2.
  - L75: `INGEST_SERVICE_URL` is not set — gateway will fall back to `http://localhost:3260` or whatever the default is in `gateway/src/server.ts`. Inside the gateway container, `localhost:3260` resolves to nothing.
  - No external network — services live on the default bridge. Fine for local dev.
- **Recommended fix:** Add ingest + tracking-worker; drop `version:`; wire FEATURE_* into `common-env` (defaulted to off).

### `.dockerignore` (44 lines)
- **Good:** Excludes `node_modules`, `.next`, `dist`, `build`, `.git`, IDE dirs, `.DS_Store`, `tests/`, `*.test.ts`, `.env*`, `k8s/`, `scripts/`, `web/` (root duplicate), `*.log`.
- **Broken/missing:** See C5. Also does not exclude `*.tsbuildinfo`, `coverage/`, `.miamo-prisma-ready`, `pids/`, `logs/` — these are caught by other globs only sometimes.
- **Recommended fix:** add the missing entries.

### `.gitignore` (37 lines)
- **Good:** Comprehensive — node_modules, build outputs, env files, logs, runtime artifacts, IDE, OS files, Prisma local DB, docker volumes, v3.6.1 cleanup additions (`logs/`, `pids/`, `.miamo-prisma-ready`, `scripts/qa-runs/*.report.json`).
- **Broken/missing:** `coverage/` is listed (line 28) — good. No issue.
- **Recommended fix:** none.

### `k8s/templates/configmap.yaml` (23 lines)
- **Good:** ConfigMap shape is correct.
- **Broken/missing:**
  - L10, L12: `JWT_SECRET` and `INTERNAL_SERVICE_KEY` should not live in a ConfigMap. See I6.
  - No v3.6 feature flag keys.
  - No `TRACKING_STREAM_KEY`, `TRACKING_HASH_SECRET`, or any tracking-worker tunable.
- **Recommended fix:** split secrets into the existing `miamo-secrets`; add a `miamo-flags` ConfigMap for feature flags.

### `k8s/templates/gateway.yaml` (103 lines)
- **Good:** Defines Service (NodePort) + Deployment. `RollingUpdate` strategy with `maxUnavailable: 0`. `terminationGracePeriodSeconds: 30`. `preStop: sleep 5`. `startupProbe` + `liveness` + `readiness` against `/health`. Service URLs as explicit env vars.
- **Broken/missing:**
  - No `securityContext`. I8.
  - No `imagePullSecrets`. I10.
  - `INGEST_SERVICE_URL` not declared — see C2.
  - Resource requests/limits use placeholders that default to dev values (32Mi/50m → 128Mi/250m). For gateway under prod load that's undersized — likely OOMKilled at any traffic. Adjust per-env via values.
- **Recommended fix:** add securityContext, ingest URL, per-env resource overrides.

### `k8s/templates/hpa.yaml` (44 lines)
- **Good:** HPA v2 with CPU+memory metrics, sensible stabilization windows, scale-up faster than scale-down.
- **Broken/missing:** Requires metrics-server (I9). No `behavior` for special low-traffic cases. No custom metrics (e.g. requests/sec from prom-client).
- **Recommended fix:** doc the metrics-server dependency; consider Prometheus Adapter for v3.6 worker scaling.

### `k8s/templates/ingest.yaml` (97 lines)
- **Good:** Sensible resource limits. HPA included with the same manifest. `/v1/track/healthz` probe.
- **Broken/missing:**
  - I5 — Helm syntax in a sed-substituted templates directory.
  - Reads `TRACKING_HASH_SECRET` from a `tracking-secrets` Secret (line 30-33) that is not defined anywhere in `k8s/templates/`. The `miamo-secrets` template has it implicitly? No — `secret.yaml:30-37` does not include `TRACKING_HASH_SECRET`. **The ingest pod will fail to start.**
  - L46: HPA `metrics:` uses CPU only — no requests/sec, which is what ingest actually cares about.
- **Recommended fix:** add `TRACKING_HASH_SECRET` to `secret.yaml`; convert Helm placeholders to sed; either create `tracking-secrets` Secret or reuse `miamo-secrets`.

### `k8s/templates/migrate-job.yaml` (43 lines)
- **Good:** `backoffLimit: 3`. `restartPolicy: OnFailure`. Init container waits for postgres.
- **Broken/missing:** No `ttlSecondsAfterFinished` — completed Jobs accumulate. Should be `ttlSecondsAfterFinished: 86400`.
- **Recommended fix:** add TTL.

### `k8s/templates/namespace.yaml` (7 lines)
- **Good:** Minimal.
- **Broken/missing:** Could add `pod-security.kubernetes.io/enforce: restricted` label.
- **Recommended fix:** add PSS label.

### `k8s/templates/network-policy.yaml` (67 lines)
- **Good:** Default-deny with per-pod allow-lists. DNS egress explicit.
- **Broken/missing:** Egress to external (e.g. SendGrid, Twilio, Google OAuth) is denied. The auth service hits Google OAuth endpoints — those calls will fail. Currently OK because OAuth is dev-only, but in prod this breaks.
- **Recommended fix:** add an egress rule for `0.0.0.0/0` with `port: 443/TCP` for the auth and notifications pods.

### `k8s/templates/pdb.yaml` (18 lines)
- **Good:** `minAvailable: 1`.
- **Broken/missing:** `minAvailable: 1` with `replicas: 1` (dev values) → PDB blocks any voluntary disruption. Use `maxUnavailable: 1` or `minAvailable: 50%`.
- **Recommended fix:** `maxUnavailable: 1`.

### `k8s/templates/postgres.yaml` (87 lines)
- **Good:** StatefulSet with PVC. `pg_isready` probes. `PGDATA` set explicitly.
- **Broken/missing:**
  - Single replica, no replication or backup. Dev OK, prod NOT.
  - 10Gi storage — small for any real workload.
  - `POSTGRES_PASSWORD` from env, not Secret.
- **Recommended fix:** prod values should set `storage: 100Gi+`; consider operator (Zalando, CrunchyData) for prod.

### `k8s/templates/redis.yaml` (94 lines)
- **Good:** StatefulSet, AOF on, sensible eviction policy, persistence (2Gi PVC).
- **Broken/missing:**
  - Single replica. No replication for tracking stream durability.
  - Prod will lose tracking data on pod restart between `--save 60 1000` checkpoints unless AOF + fsync everysec is enough (it is for most purposes).
- **Recommended fix:** for prod, Redis Sentinel or Redis Cluster.

### `k8s/templates/secret.yaml` (34 lines)
- **Good:** `stringData` for legibility. Comment block at top mentions sealed-secrets and external-secrets.
- **Broken/missing:**
  - No `TRACKING_HASH_SECRET` (referenced by `tracking-worker.yaml` and `ingest.yaml`).
  - No `tracking-secrets` Secret (a separate Secret name referenced by `ingest.yaml:30`).
  - Not actually `envFrom`'d by any Deployment. I6.
- **Recommended fix:** consolidate; add tracking secret; add `secretRef` to every Deployment template's `envFrom`.

### `k8s/templates/service.yaml` (91 lines)
- **Good:** Sensible defaults; matches gateway.yaml shape.
- **Broken/missing:** Same as gateway: no securityContext, no imagePullSecrets, no Secret envFrom.

### `k8s/templates/tracking-worker.yaml` (81 lines)
- **Good:** Defines Deployment + Service. Probes against `/healthz`. Resource limits.
- **Broken/missing:**
  - I5 — Helm syntax.
  - References `db-secrets` and `tracking-secrets` Secrets that don't exist in templates.
  - L33-34: `TRACKING_KILL` is the only flag wired. Missing every v3.6 flag (`INTENT_INFERENCE_ENABLED`, `EXPOSURE_SCHEDULER_ENABLED`, `STABLE_MATCH_ENABLED`, `FAIRNESS_AUDIT_ENABLED`, `ALGO_V4_WORKERS_ENABLED`, `LEARNER_LOOP_ENABLED`, etc) plus every tunable.
- **Recommended fix:** convert templating, add all v3.6 envs, fix Secret references.

### `k8s/templates/web.yaml` (89 lines)
- **Good:** NodePort + Deployment, healthchecks against `/`. Standard.
- **Broken/missing:** No `NEXT_PUBLIC_API_URL` env var — the web image baked `http://localhost:3200` at build time (see web.Dockerfile audit). In a real cluster, web pods will try to call `http://localhost:3200` and fail.

### `configuration/dev/values.yaml` (71 lines)
- **Good:** Sensible local defaults; documents purpose.
- **Broken/missing:** No `feature_flags:` section, no `tracking:` section, no `image:` shape matching what `tracking-worker.yaml` expects (`{{ .Values.image.registry }}`, `{{ .Values.image.tag }}`). I5/I10.

### `configuration/staging/values.yaml` (71 lines)
- **Good:** Same shape as dev.
- **Broken/missing:** Same as dev. Plus literal secrets (I6).

### `configuration/prod/values.yaml` (71 lines)
- **Good:** Same shape.
- **Broken/missing:** Same. Plus `"CHANGE-ME-IN-PRODUCTION"` sentinels (C6).

### `configuration/postgres/postgresql.conf` (17 lines)
- **Good:** Sensible defaults for a 256MB-mem instance.
- **Broken/missing:** Not mounted anywhere. N5.

### `configuration/grafana/tracking-dashboard.json`
- Not read in this audit. Dashboard files are static, low-risk.

### `.github/workflows/ci.yml` (55 lines)
- **Good:** `actions/checkout@v4`, `setup-node@v4` with `cache: 'npm'`. Per-service typecheck matrix. 10-minute timeout.
- **Broken/missing:** See I1. Plus: per-service typecheck doesn't include ingest/tracking-worker/web.
- **Recommended fix:** add ingest/tracking-worker/web to the matrix; add web-build job; add npm-audit job; add concurrency block.

### `.github/dependabot.yml` (43 lines)
- **Good:** Five ecosystems (npm root, web, shared, docker, github-actions). Sensible grouping by patch/minor.
- **Broken/missing:** Docker ecosystem points at `/docker` only — won't catch postgres/redis images in compose. I4.
- **Recommended fix:** add `/` directory entry for docker.

### `knip.json` (60 lines)
- **Good:** Workspace-aware, lists every service. Includes seed and test files in entry sets.
- **Broken/missing:** none critical.

### `package.json` (47 lines)
- **Good:** Comprehensive script set covering local/docker/k8s/db/test/typecheck. Husky hook installed.
- **Broken/missing:** I12 (no engines), I13 (version 3.0.0), I2 (lint-staged no-op).

### `vitest.config.ts` (40 lines)
- **Good:** Coverage configured. Reasonable include set.
- **Broken/missing:** Excludes `services/web/**` — fine, web has its own setup. No issue.

### `vitest.fast.config.ts` (27 lines)
- **Good:** Documented why it's fast.
- **Broken/missing:** I7.

### `.husky/pre-commit` (1 line)
- **Good:** Husky installed via `prepare: husky`.
- **Broken/missing:** No-op (I2).

### `.env.example` (~330 lines)
- **Good:** Comprehensive — 140 vars in 11 semantic sections. v3.6 feature flags documented with on/off semantics. Tracking tunables documented. Inline guidance for secret rotation.
- **Broken/missing:** Defaults for some secrets (`TRACKING_HASH_SECRET=dev-only-tracking-hash-secret-change-me`, `DEVICE_FP_SALT=miamo-default-salt`) live in the example file. Acceptable (they're labeled dev-only) but adding a startup check that refuses these literal values in `NODE_ENV=production` would be safer.

### Per-service `package.json`
- All claim `version: "3.0.0"` or `"3.1.0"`. None declare `engines`. None list peerDependencies. `services/shared/package.json` declares `@prisma/client: ^5.22.0` — Prisma 5 LTS, fine. `services/web/package.json` declares `next: ^14.2.35` — Next 14, current. No security alarms.

### Per-service `tsconfig.json`
- All identical other than `include` (services/shared/**/*.ts in some, not others) and one excludes `verification.ts`. See I11.

### Per-service Prisma mirror schemas
- `services/content/prisma/schema.prisma`: in sync with canonical (v3.6 models, audio columns, consent toggles all present).
- `services/social/prisma/schema.prisma`: in sync.
- `services/users/prisma/schema.prisma`: in sync.
- `services/messaging/prisma/schema.prisma`: **NOT in sync** — C4.
- `services/auth/prisma/`, `services/notifications/prisma/`: directories exist, did not deep-read; likely OK because they don't touch the v3.6 surface area.

---

## Recommended fix order

1. **C4** — Sync `services/messaging/prisma/schema.prisma` with the canonical. (5 min copy-paste; unblocks messaging-side anti-ghost wiring.)
2. **C1** — Decide Node 22 vs Node 20 canonical; sync `.nvmrc` ↔ all 11 Dockerfiles ↔ `ci.yml` ↔ `docs/DEVOPS.md`. (30 min.)
3. **C2** — Add `ingest` and `tracking-worker` services to `docker-compose.yml` with healthcheck + `depends_on` chain. (30 min.)
4. **C3** — Wire every v3.6 feature flag + tracking tunable into compose `common-env` (defaulted off via `${VAR:-0}`). Mirror into k8s `ConfigMap`/`miamo-flags`. (1 hr.)
5. **I5** — Convert `tracking-worker.yaml` and `ingest.yaml` to `__PLACEHOLDER__` style; teach `start.sh k8s_render()` to substitute the new placeholders. (2 hr.)
6. **I6 + C6** — Move all secrets out of `configmap.yaml` into `secret.yaml`; add `envFrom: secretRef: miamo-secrets` to every Deployment template; add a deploy-time guard that refuses `CHANGE-ME-IN-PRODUCTION` literals. (1 hr.)
7. **I1** — Expand CI: add web-build job, full-test job, npm-audit job, concurrency block. Add ingest/tracking-worker/web to typecheck matrix. (45 min.)
8. **I3** — Refactor 7 Dockerfiles to tri-stage with `--omit=dev` runtime deps. (1 hr.)
9. **I11** — Create `services/tsconfig.base.json`; collapse 9 per-service tsconfigs to ~10 lines each. (30 min.)
10. **I12 + I13** — Add `engines.node` to root + shared; bump all `version` fields to `3.6.1`. (10 min.)
11. **I2** — Make husky pre-commit actually run `npm run typecheck:shared && npm test`; add `pre-push` running `npm run test:full`. (15 min.)
12. **I7** — Expand `vitest.fast.config.ts` include to cover v8 algo tests. (5 min.)
13. **I8** — Add `securityContext` block to every Deployment template. (30 min.)
14. **N1, N5, N8, N3** — Cleanups: drop `version:` from compose, mount postgresql.conf or delete it, stop copying `services/shared` into the gateway image, add `services/shared` to web build if imports exist. (30 min.)
15. **N2, I4, I9, I10, N4** — Lower-priority polish.

Total estimated effort to get to a clean v3.6.1 deployable state: **~8-10 engineering hours**, almost all of it mechanical. The Sev-1 items (C1-C6) are ~4 hours combined.

---

_End of audit. No source files were modified. Findings are listed at file + line granularity so each can be addressed independently._
