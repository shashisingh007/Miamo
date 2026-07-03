# k6 load-test scaffold

Phase G.6 deliverable. Five load-test scripts covering the hottest
endpoints identified in the launch audit (see
`FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` §G.6).

## Install k6

k6 is a Go binary — not npm-installable.

    brew install k6                # macOS
    sudo apt install k6            # Debian/Ubuntu (after adding the Grafana APT repo)
    winget install k6              # Windows

Verify: `k6 version` should print `k6 v0.4x.x`.

## Scripts

| Script | Target | Load | p95 target |
|---|---|---:|---:|
| `discover.js`             | `GET /api/v1/discover`                  | 100 RPS (5 min hold) | 250 ms |
| `matches.js`              | `GET /api/v1/matches`                   | 50 RPS  (3 min)      | 200 ms |
| `messages.js`             | `POST /api/v1/messages/chats/:id/messages` | 30 RPS (3 min)   | 300 ms |
| `ingest.js`               | `POST /v1/track` (ingest tier)          | 200 RPS (5 min)      | 50 ms  |
| `discover-realistic.js`   | Session (login → discover x5 → like x2 → matches → msg) | 20 sess/s (5 min) | per step |

## Run

    LOAD_TOKEN='<bearer>' bash scripts/load/run.sh discover
    LOAD_TARGET=http://localhost:3200 LOAD_TOKEN=... bash scripts/load/run.sh matches
    LOAD_TOKEN=... LOAD_CHAT_ID='<chat-uuid>' bash scripts/load/run.sh messages
    bash scripts/load/run.sh ingest
    bash scripts/load/run.sh discover-realistic

## Env vars

| Var | Default | Notes |
|---|---|---|
| `LOAD_TARGET`   | `http://localhost:3200` (gateway) / `:3260` (ingest) | Base URL |
| `LOAD_TOKEN`    | (unset) | Bearer token for auth'd endpoints |
| `LOAD_CHAT_ID`  | (unset) | Required for `messages.js` — pick any real chat |
| `LOAD_PERSONAS` | `miamo10,miamo15,miamo20,miamo25` | Comma-separated pool for realistic sessions |

## Get a bearer token

Local dev:

    curl -sS http://localhost:3200/api/v1/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"email":"miamo10@miamo.test","password":"miamo10"}' \
    | jq -r '.data.accessToken'

## Interpret output

k6 writes a summary at the end of each run:

    ✓ status is 200
    ✓ body has data

    checks................: 100.00% ✓ 30000     ✗ 0
    http_req_duration.....: avg=85ms   min=12ms  med=68ms  max=420ms
                            p(90)=180ms p(95)=225ms
    http_reqs.............: 30000    99.9/s
    errors................: 0.00%   ✓ 0         ✗ 30000

The `thresholds` block at the top of each script encodes the pass/fail
criterion. A red `✗` next to any threshold fails the run with exit
code 99 — CI-friendly.

## What to watch during a run

- **CPU on the target service** — is it saturating a single core?
- **DB connection pool utilization** — the gateway pool defaults to 20;
  matches/messages test can starve it.
- **Redis `INFO stats`** — `instantaneous_ops_per_sec` should track the
  offered RPS on tests that write.
- **Log volume** — 200 RPS on ingest for 5 min = 60 K log lines. Confirm
  Loki/promtail is keeping up.

## When to run

- **Before a launch:** all five, in order. Fix any red threshold before shipping.
- **After a schema migration:** at least `discover` + `messages`.
- **After a dependency bump on Prisma/Express/Redis client:** all five.

## Adding a new load test

- Copy `discover.js` as a template.
- Set `options.scenarios` to the target RPS + duration.
- Set `options.thresholds` — every load test MUST have at least one
  latency threshold and one error-rate threshold. A load test with no
  thresholds is a stress test, and stress tests belong in `scripts/chaos/`.
- Register it in `run.sh` under the `case "$SCRIPT_NAME"` block if it
  needs any per-script env vars.
