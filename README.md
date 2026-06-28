# Miamo

**A serious-dating app for India that learns from how you actually use it — not just what's in your photos.**

Miamo watches what you do (how long you look at a profile, whether you read the bio, how fast you reply, what mood you're in *right now*), and turns those signals into better matches, better message suggestions, and a fairer feed for everyone. India-first. Privacy-first. Open-book — every algorithm is documented and explainable.

This README is the single entry point. **Read [`docs/README.md`](docs/README.md) for the canonical sequential walkthrough.** Everything else lives under `docs/`.

---

## Quick start

```bash
git clone https://github.com/shashisingh007/Miamo.git
cd Miamo
bash scripts/start.sh local
```

First run on a fresh machine installs prerequisites automatically; subsequent runs start the stack in ~15 seconds.

- **Web app:** http://localhost:3100
- **API gateway:** http://localhost:3200
- **Demo login:** `miamo10@miamo.test` / `miamo10`

If anything breaks, jump to [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

---

## The 15 documents — read in this order

Each doc is self-contained but builds on the ones before. A first-time reader can follow the path top-to-bottom and finish with a complete mental model of Miamo. A returning reader can jump directly to the one they need.

| # | Document | What it covers | Audience | ~Time |
|---|---|---|---|---|
| 0 | [docs/README.md](docs/README.md) | The reading map (you should open this first) | Everyone | 5 min |
| 1 | [docs/PRODUCT.md](docs/PRODUCT.md) | What Miamo is — Priya's full Tuesday narrated end-to-end | Everyone | 15 min |
| 2 | [docs/OWNER_GUIDE.md](docs/OWNER_GUIDE.md) | The "tell my parent" doc — 4 layers, 17 algorithms in plain English | Founder, PM, designer | 30 min |
| 3 | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 11 services, 17 worker loops, the request lifecycle | Engineer (any specialty) | 20 min |
| 4 | [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Every Prisma model (70+) grouped by domain | Backend engineer | 30 min |
| 5 | [docs/API.md](docs/API.md) | Every API endpoint, surface by surface | Frontend/backend engineer | 30 min |
| 6 | [docs/FRONTEND.md](docs/FRONTEND.md) | Next.js 14 layout, 26 routes, hooks, stores | Frontend engineer | 20 min |
| 7 | [docs/TRACKING.md](docs/TRACKING.md) | Phone → ingest → Redis → 17 workers → algorithms | Data/ML engineer | 25 min |
| 8 | [docs/ALGORITHMS.md](docs/ALGORITHMS.md) | Every ranking algorithm with formula + worked example | ML engineer, curious PM | 60 min |
| 9 | [docs/MIAMO_MOVE.md](docs/MIAMO_MOVE.md) | The Move v2 composer in full — "writes like you" | Algorithm reader, PM | 25 min |
| 10 | [docs/SECURITY.md](docs/SECURITY.md) | JWT, AES, HMAC, OWASP, DPDP, GDPR, RTBF | Security reviewer, compliance | 25 min |
| 11 | [docs/DEVOPS.md](docs/DEVOPS.md) | Local dev, k8s, CI, observability, the bootstrap trap | DevOps, SRE | 25 min |
| 12 | [docs/RUNBOOK.md](docs/RUNBOOK.md) | 22 incidents with copy-pasteable fixes | On-call engineer | Reference |
| 13 | [docs/FAQ.md](docs/FAQ.md) | 90+ questions covering product, privacy, technical, India | Everyone | Reference |
| 14 | [docs/GLOSSARY.md](docs/GLOSSARY.md) | Every term defined (product + technical) | Everyone | Reference |

**Reading paths by role:**

- **Non-technical reader (designer, PM, the founder's mom):** docs 0 → 1 → 2 → 13 → 14. About 1 hour.
- **Backend engineer:** docs 0 → 3 → 4 → 5 → 8 → 11. About 3 hours.
- **Frontend engineer:** docs 0 → 1 → 5 → 6 → 14. About 1.5 hours.
- **ML engineer:** docs 0 → 3 → 7 → 8 → 9. About 2.5 hours.
- **On-call:** docs 0 → 3 → 12 (then grep). 30 min upfront, reference forever.
- **Founder / owner:** docs 0 → 1 → 2 → 14. About 1 hour.

---

## Repository layout (the canonical structure)

```
Miamo/
├── README.md                 ← you are here
├── CHANGELOG.md              ← release history
├── .env.example              ← all environment variables documented (140+)
├── .gitignore  .gitattributes  .nvmrc  .dockerignore
├── .husky/                   ← git hooks
├── .github/                  ← CI workflows + dependabot
├── docker-compose.yml        ← Postgres + Redis for local dev
├── package.json              ← monorepo orchestration
├── knip.json                 ← dead-code rules
├── vitest.config.ts          ← full test suite
├── vitest.fast.config.ts     ← fast suite (CI)
│
├── assets/                   ← brand assets (logos, fonts)
├── configuration/            ← env-specific values (dev/staging/prod/grafana/postgres)
├── docker/                   ← Dockerfiles (one per service) + migrate-and-seed
├── docs/                     ← all human + agent documentation (see below)
├── k8s/                      ← Kubernetes manifests + Helm-style templates
├── scripts/                  ← operational scripts (start, stop, seed, test, qa-runs)
├── services/                 ← 11 microservices + shared library (see below)
└── tests/                    ← cross-service integration tests
```

**Inside `docs/`:**

```
docs/
├── README.md                 ← the reading guide (start here)
├── PRODUCT.md                ← Priya's narrative (the product story)
├── OWNER_GUIDE.md            ← single-sitting non-technical overview
├── ARCHITECTURE.md           ← 11 services + 17 worker loops + request flow
├── DATA_MODEL.md             ← every Prisma model
├── API.md                    ← every endpoint
├── FRONTEND.md               ← Next.js app
├── TRACKING.md               ← signals pipeline
├── ALGORITHMS.md             ← every ranking algorithm + worked examples
├── MIAMO_MOVE.md             ← Move v2 deep-dive
├── SECURITY.md               ← auth, encryption, privacy, compliance
├── DEVOPS.md                 ← local dev, k8s, CI, observability
├── RUNBOOK.md                ← incident playbook
├── FAQ.md                    ← 90+ questions
├── GLOSSARY.md               ← every term defined
│
├── architecture/             ← deeper design docs (v3.6 overhaul, market scan)
├── legal/                    ← patent clearance memo
├── releases/                 ← per-release notes (v3.6.0.md)
├── _internal/                ← agent handoff knowledge base, audit artifacts
└── _prompts/                 ← internal agent prompts (not user-facing)
```

**Inside `services/`:**

```
services/
├── shared/                   ← Prisma schema + algorithm library + middleware
│   ├── prisma/schema.prisma  ← canonical DB schema (70+ models)
│   ├── prisma/migrations/    ← forward-only migrations
│   └── src/
│       ├── algo/             ← 53 algorithm modules (V4 + V7 + V8)
│       │   └── v8/           ← the v3.6.0 generation (17 modules)
│       ├── track/            ← tracking event validators + helpers
│       └── *.ts              ← service.ts, validate.ts, schemas.ts, errorHandler.ts,
│                                 idempotency.ts, metrics.ts, audit.ts, completion.ts,
│                                 spotlight-ledger.ts, premium.ts, etc.
│
├── gateway/                  ← API gateway (rate-limit, JWT verify, proxy) :3200
├── auth/                     ← login, signup, OTP, JWT issuance :3201
├── users/                    ← profile, settings, voice fingerprint :3202
├── social/                   ← discover, matches, AI-match, weekly-top, why-explainer :3203
├── messaging/                ← chats, beats, anti-ghost economy :3204
├── content/                  ← feed, stories, videos, creativity, DTM, family-brief :3205
├── notifications/            ← push + in-app notifications + SSE :3206
├── ingest/                   ← tracking edge (always 204) :3260
├── tracking-worker/          ← 17 background jobs (rollup, intent, exposure, ...) :3261
└── web/                      ← Next.js 14 app :3100
```

If a file or directory doesn't fit this structure, it shouldn't be at the root. The cleanup pass enforces this — every root file other than the canonical configs is a regression.

---

## Common commands

```bash
# Tests
npm test                    # fast suite (~3s, 403 tests, gates CI)
npm run test:full           # full suite (~12s, 1535 tests)
npm run typecheck           # 11-package parallel tsc --noEmit

# Local stack
bash scripts/start.sh local dev    # boot 7 services
bash scripts/start.sh local stop     # tear down
bash scripts/start.sh local status   # health probe each

# QA scripts (require local stack + flags loaded from .env)
python3 scripts/qa-runs/phase-1-2-endpoint-sweep.py
python3 scripts/qa-runs/phase-14-overhaul.py
# (and 4 more — see scripts/qa-runs/SUMMARY.md)

# Database
cd services/shared && npx prisma migrate dev   # apply new migration
cd services/shared && npx prisma studio        # GUI
```

---

## What's running where (port map)

| Service | Port | Owns |
|---|---:|---|
| web | 3100 | Next.js app |
| gateway | 3200 | API gateway, rate-limit, JWT verify |
| auth | 3201 | Login, signup, OTP, JWT |
| users | 3202 | Profile, settings, voice fingerprint |
| social | 3203 | Discover, matches, AI-match, weekly-top |
| messaging | 3204 | Chats, beats, anti-ghost |
| content | 3205 | Feed, stories, videos, creativity, DTM, family-brief |
| notifications | 3206 | Push, in-app, SSE |
| ingest | 3260 | Tracking edge |
| tracking-worker | 3261 | 17 background jobs |
| Postgres | 5432 | (Docker container `miamo-postgres-local`) |
| Redis | 6379 | (Docker container `miamo-redis`) |

---

## Current state (v3.6.1)

- **11/11 typecheck clean** across all packages
- **37/37 fast test files / 403 tests passing**
- **126/126 full test files / 1,535 tests passing**
- **6/6 QA phase scripts green** with all v8 flags ON (Phase-14 multi-user: 12/12 phases)
- **Web build clean** (41 routes, ~88 KB shared JS)
- **0 high/critical security vulnerabilities** (`npm audit --omit=dev`)
- **17 v8 algorithms shipped**, 4 new worker jobs, 9 new API endpoints, 6 new web UI surfaces, 16 new tracking events, all gated by feature flags (default OFF)

See [docs/releases/v3.6.0.md](docs/releases/v3.6.0.md) for the full v3.6.0 release notes and [CHANGELOG.md](CHANGELOG.md) for the chronological history.

---

## Contributing

Every new feature ships its documentation in the same PR. If you add an algorithm, you add a section to [docs/ALGORITHMS.md](docs/ALGORITHMS.md). If you add an endpoint, you add a section to [docs/API.md](docs/API.md). If you add a Prisma model, you add a section to [docs/DATA_MODEL.md](docs/DATA_MODEL.md). The docs are the source of truth.

Run the full quality gate before opening a PR:

```bash
npm run typecheck && npm test && npm run test:full
cd services/web && npm run build && cd -
```

See [docs/DEVOPS.md](docs/DEVOPS.md) §"Pre-merge checklist" for the canonical list.

---

## License

Proprietary. Do not redistribute.
