# Chaos test scripts

Phase G.7 deliverable. Four runnable chaos scripts that prove Miamo's
graceful-degradation contracts hold in practice.

## Prerequisites

- Docker + docker-compose installed and stack running:
  ```
  bash scripts/start.sh docker dev
  ```
- The four containers under test are present:
  ```
  docker ps --format '{{.Names}}' | grep miamo
  ```
- `curl` on PATH.

## Scripts

| Script | What it proves |
|---|---|
| `kill-postgres.sh`      | Postgres kill → services 5xx during outage, `/healthz` recovers within 30 s of restart. |
| `kill-redis.sh`         | Redis kill → services stay 200 (fail-open); no cascade to 5xx. |
| `partition-network.sh`  | Simulated network partition to postgres → 503 (not 500), auto-recovery on heal. |
| `oom-tracking-worker.sh`| SIGKILL the tracking-worker twice → docker restarts it; no crash loop. |

## Run

Each script is idempotent — it kills the target, waits, restarts, and
polls for recovery. Nothing to clean up if it passes.

    bash scripts/chaos/kill-redis.sh          # ~15 s
    bash scripts/chaos/kill-postgres.sh       # ~45 s
    bash scripts/chaos/partition-network.sh   # ~60 s
    bash scripts/chaos/oom-tracking-worker.sh # ~45 s

## Exit codes

| Code | Meaning |
|--:|---|
| 0 | Passed — degradation matched the contract. |
| 1 | Failed — recovery took too long, wrong status code, or a cascade happened. |
| 2 | Prereq failure — container not running, `docker network` missing, etc. |

## When to run

- **Before every major release** — the launch-critical chaos gate.
- **After changes to** `services/shared/src/service.ts`,
  `services/*/src/server.ts`, or the middleware layer — anything that
  touches Redis or Prisma init.
- **After a dependency bump** on `ioredis`, `@prisma/client`, or
  `express`.

## What good looks like

    → chaos: kill miamo-redis
    → baseline healthz:
      status: 200
    → killing miamo-redis
    → during outage — /healthz MUST still return 200 (fail-open):
      status: 200
    → during outage — a discover call must still respond (fail-open cache):
      status: 401
    → restarting miamo-redis
    PASS: services stayed responsive during redis outage

## What bad looks like

    → during outage — /healthz MUST still return 200 (fail-open):
      status: 503
    FAIL: /healthz returned 503 while redis was down — redis MUST NOT be a hard dep

If you see this, redis has become a hard dependency somewhere — a common
symptom is a new middleware that awaits `redis.get()` without a
try/catch. Check the diff since the last green run.

## Not covered here

- **In-flight write atomicity** during postgres kill — that's the sanity
  suite (`tests/sanity-invariants.test.ts`) which enforces schema-level
  invariants at every deploy.
- **Long-running network flakiness** (100 ms of packet loss for 10 min) —
  requires `tc netem` on the host, out of scope for docker-compose.

## Add a new chaos test

- Copy `kill-redis.sh` as a template — it's the simplest.
- Kill exactly one thing. Chaos tests that kill two dependencies at once
  are impossible to root-cause when they fail.
- Every script MUST print a `PASS:` or `FAIL:` line as its final output
  and exit with the corresponding code.
- Document the "what this proves" contract in a header comment. If you
  can't articulate the contract, the test doesn't belong here.
