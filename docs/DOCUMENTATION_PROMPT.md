# Miamo — Master Documentation Prompt

> **How to use this file**: Paste this entire prompt into Copilot Chat (Agent mode) at the workspace root, or feed it to any LLM with file-system tools. The agent will delete the existing docs, regenerate the full set, and place per-service docs inside each service folder plus one root-level master doc.

---

## ROLE

You are a senior staff engineer + technical writer pair. Your job is to produce **operator-grade documentation** for the Miamo platform — a Next.js 14 + Express microservices dating app with a deterministic ML-lite v4 algorithm system and an end-to-end tracking pipeline.

Optimize every page for a reader who is **smart but new to the codebase** (a new hire, a future you 6 months from now, or a non-engineer founder). Prefer **plain English + one worked example** over jargon. Where a design choice exists, explain the trade-off in one sentence ("we picked X because Y; the cost is Z").

---

## NON-NEGOTIABLE GROUND RULES

1. **Read first, write second.** Before writing any doc, read the actual source files. Never document what "should" be there — only what *is* there. If a file says one thing and an old doc says another, the source wins.
2. **No hallucinations.** Every code reference must link to a real file path with line numbers. Every env var, table name, endpoint, and flag must be grep-verifiable. If you are unsure, open the file.
3. **No marketing copy.** No "blazingly fast", no "robust", no "seamless". State the mechanism, then state the measurable property.
4. **Examples beat paragraphs.** Every concept gets a tiny worked example (3–15 lines of code, a sample payload, or a real request/response).
5. **"What changes & why it's good" section is mandatory** at the bottom of every doc. Three bullets: *Before*, *After*, *Why it matters*.
6. **No emoji. No filler.** Tables, fenced code blocks, mermaid diagrams only where they earn their space.
7. **Use the file-link format**: `[path/file.ts](path/file.ts#L42-L58)` — never bare backticks for file names.

---

## STEP 0 — RESET

Delete every existing documentation file *except* this prompt and `CHANGELOG.md`:

```
rm docs/ARCHITECTURE.md docs/SHOWCASE.md docs/DESIGN_PROMPT.md \
   docs/ACCESS_CONTROL.md docs/TRACKING.md docs/SERVICES.md \
   docs/ALGORITHMS_V4_PROMPT.md
rm services/*/README.md
```

Keep root `README.md` but rewrite it from scratch (Step 2).

---

## STEP 1 — DISCOVERY PASS (do this before writing a single doc)

Run these searches and record findings in a scratch note. Do not skip.

| Topic | Command / Action |
|---|---|
| Service ports | `grep -RIn "PORT\|listen(" services/*/src/server.ts` |
| Routes per service | `grep -RInE "app\.(get\|post\|put\|delete\|patch)\(" services/*/src` |
| Prisma models | read every `services/*/prisma/schema.prisma` |
| Env vars actually read | `grep -RIn "process\.env\." services/*/src` |
| Feature flags | read `services/shared/src/algo/flags.ts` |
| Algorithms registered | read `services/shared/src/algo/registry.ts` and every `services/shared/src/algo/*.ts` |
| Tracking events emitted | `grep -RIn "track(\|trackEvent(\|emit(" services/web/src` |
| Tracking ingestion | read `services/ingest/src/**` and `services/tracking-worker/src/**` |
| Docker topology | read `docker-compose.yml` and every `docker/*.Dockerfile` |
| K8s topology | read every `k8s/templates/*.yaml` |
| Frontend pages | `find services/web/src/app -name 'page.tsx'` |
| Frontend API client | read `services/web/src/lib/api.ts` |

Write the scratch findings to `docs/_discovery.md` (this file is allowed to be terse and is deleted at the end of Step 9).

---

## STEP 2 — DELIVERABLES

Produce **exactly these files**. Nothing more, nothing less.

### A. Root level

1. **`README.md`** — 5-minute orientation. Sections:
   - What is Miamo (2 sentences)
   - The 10-second mental model (one mermaid diagram: browser → gateway → services → postgres/redis)
   - Quickstart (`docker compose up`, then `npm run dev`, then open `localhost:3100`)
   - Where to read next (link table to every doc produced below)
   - Repo layout (annotated tree, 1 line per top-level folder)

2. **`MIAMO.md`** (root, NEW) — **The single document that explains everything**. This is the file someone reads on a plane to understand the entire system. Sections:
   1. Product in one page (what user sees on each surface: Discover, AI Match, Beats, Messages, Creativity, Serious Mode, Love Language, Compatibility)
   2. System architecture (mermaid: web ↔ gateway ↔ {auth, users, social, messaging, content, notifications, ingest, tracking-worker} ↔ {postgres, redis})
   3. Request lifecycle (worked example: "user swipes right on Discover" — trace the call from `ProfileCard.tsx` → `api.ts` → gateway → social → DB → tracking event → ingest → worker → feature snapshot)
   4. The v4 algorithm system in plain English (17 algos, 8 surfaces, flag-gated, deterministic — with the one-paragraph "how ranking works" pitch and a tiny worked numeric example)
   5. The tracking system in plain English (browser → `/v1/events` → Redis stream → tracking-worker → `EventAggDaily` + `FeatureSnapshot` → SignalReader → algorithms)
   6. DevOps lifecycle (local → docker-compose → k8s; configmaps; secrets; migrations)
   7. Security & privacy posture (HMAC uidHash, consent gating, PII boundaries)
   8. Glossary (every acronym used anywhere in the repo)
   9. **What changed & why it's good** (Before/After/Why)

### B. Per-service docs (one file each, inside the service folder)

For each of these services, create `services/<name>/README.md`:

`auth`, `gateway`, `users`, `social`, `messaging`, `content`, `notifications`, `ingest`, `tracking-worker`, `shared`, `web`

Every per-service doc uses **this exact template**:

```markdown
# <service-name>

## 1. Purpose
One paragraph. What problem this service exists to solve.

## 2. Mental model
3–6 sentences + one mermaid diagram if the service has >1 collaborator.

## 3. Public surface
| Method | Path | Auth | Purpose | Source |
|---|---|---|---|---|
| GET | /api/v1/... | bearer | ... | [server.ts](src/server.ts#L42) |

## 4. Data model
Every Prisma model owned by this service, with a one-line purpose and link.
Mark cross-service references explicitly.

## 5. Dependencies
| Talks to | Why | How (HTTP / DB / Redis / event) |
|---|---|---|

## 6. Configuration
Every env var actually read by this service. Default, required?, what it controls.

## 7. Worked example
A concrete end-to-end scenario with real curl/payloads showing a request
and what happens internally (DB writes, events emitted, side-effects).

## 8. Local dev
How to run only this service, how to seed test data, how to verify it's alive.

## 9. Tests
What's covered, how to run, where the tests live.

## 10. Failure modes & operational notes
The 3–5 things that have broken or could break, with the signal you'd see
and the first thing to check.

## 11. What changed & why it's good
- **Before:** ...
- **After:** ...
- **Why it matters:** ...
```

### C. Cross-cutting deep dives (under `docs/`)

1. **`docs/ARCHITECTURE.md`** — the system, deeper than `MIAMO.md`. Boundary diagrams, sync vs async paths, data ownership matrix, why microservices over monolith here, where the seams are.
2. **`docs/FRONTEND.md`** — Next.js 14 App Router layout, route groups `(auth)` / `(main)`, server vs client components rule of thumb, design tokens (`globals.css` + Tailwind config), the shared component library, providers tree, the API client (`lib/api.ts`) contract, the tracking hook (`useTrackActivity.ts`), and one worked "add a new page" recipe.
3. **`docs/ALGORITHMS.md`** — the v4 algorithm system in full. Replaces and supersedes the old prompt-style doc. Must include:
   - The 17 algorithms (table: name, surface, inputs, output shape, weights, source file, flag env var)
   - The `SignalReader` interface and why it exists (architectural rule: no algo imports Prisma)
   - The registry pattern and how a surface dispatches
   - Determinism: hashed features, L2 norm, Float32 LE buffers, HMAC `uidHash` via `TRACKING_HASH_SECRET`
   - Per-surface flags table (`ALGO_V4_RANK_ENABLED_<SURFACE>`, `ALGO_V4_WORKERS_ENABLED`)
   - One worked example: a Discover request, candidate pool of 3 users, walk through every score component for one candidate down to the final ranked list
   - The `EnrichmentWorker` and `DailyMatchWorker` (what they read, what they write, on what cadence)
   - The `/v4/status` ops endpoint
4. **`docs/TRACKING.md`** — the tracking system in full:
   - Event taxonomy (every event name actually emitted, grouped by surface)
   - Browser SDK (`useTrackActivity`, batching, retry, sendBeacon fallback)
   - Ingest service (`/v1/events`, consent gate, schema validation, Redis stream write)
   - Tracking-worker (stream consumer, aggregation into `EventAggDaily`, `FeatureSnapshot` materialization)
   - Privacy: `uidHash` derivation, what is never stored, consent surfaces
   - One worked example: a single `discover.card_view` event from click to feature snapshot
5. **`docs/DEVOPS.md`** — local + docker-compose + k8s lifecycle, env layering (`.env.example` → service env), migrations (`docker/migrate-and-seed.sh`, `scripts/db-check.sh`), helm-style values per env (`configuration/{dev,staging,prod}/values.yaml`), HPA, PDB, NetworkPolicy, secrets handling.
6. **`docs/SECURITY.md`** — JWT/session flow (auth service), HMAC tracking key, consent gating, OWASP Top 10 mapping, secrets management, the access-control matrix from the old `ACCESS_CONTROL.md` (re-verified against current code).
7. **`docs/RUNBOOK.md`** — on-call companion: "service X is down → check Y", "tracking-worker lag spike → look at Z", "feature flag rollout playbook", "rollback procedure".

---

## STEP 3 — STYLE RULES

- **Length budget**: per-service docs target **300–600 lines**. `MIAMO.md` target **500–900 lines**. Deep-dive docs target **400–800 lines**.
- **Diagrams**: prefer mermaid `flowchart LR` for request flows, `sequenceDiagram` for multi-hop calls, `erDiagram` for data relationships. Max one diagram per major section.
- **Code blocks**: TypeScript snippets must compile in isolation or be marked `// pseudo`. SQL snippets must be valid Postgres. Bash snippets must be macOS-zsh-safe (no bare `===`, no heredocs in commit examples).
- **Numbers**: every "fast / slow / big / small" claim needs a number or is deleted.
- **Tables over prose** for: env vars, endpoints, models, flags, ports, events.
- **No TODOs in shipped docs.** If something is genuinely unknown, write a one-line `> NOTE: behaviour undocumented — verify by reading <file>` and move on.

---

## STEP 4 — VERIFICATION CHECKLIST (run before declaring done)

For each generated doc, verify:

- [ ] Every file path link resolves (`test -f` each one).
- [ ] Every endpoint listed appears in source via grep.
- [ ] Every env var listed appears in `process.env.X` somewhere in that service.
- [ ] Every Prisma model listed appears in a `schema.prisma`.
- [ ] Every flag listed appears in `flags.ts` or `process.env`.
- [ ] Every mermaid diagram renders (no syntax errors).
- [ ] No file exceeds 900 lines.
- [ ] No emoji.
- [ ] No "TODO", "TBD", "coming soon".
- [ ] Every doc has the "What changed & why it's good" closing section.
- [ ] `docs/_discovery.md` has been deleted.

Run `git diff --stat` and report: files created, files deleted, total lines written.

---

## STEP 5 — OUTPUT FORMAT

When working, narrate progress as:

```
[1/19] services/auth/README.md       (read 4 files, wrote 412 lines)
[2/19] services/gateway/README.md    (read 3 files, wrote 287 lines)
...
[19/19] MIAMO.md                     (read 0 new files, wrote 743 lines)

Verification: 19 files written, 8 files deleted, 0 broken links, 0 missing env vars.
```

Do not summarize the *content* of each doc back to the user — they will read the files.

---

## WORKED EXAMPLE OF THE "WHAT CHANGED & WHY IT'S GOOD" SECTION

This is the level of clarity required at the bottom of every doc:

> ### What changed & why it's good
>
> - **Before:** The Discover ranker called `prisma.user.findMany()` inline inside the algorithm module, which made the algo impossible to unit-test without a live DB and impossible to swap data sources.
> - **After:** Every algorithm reads through the `SignalReader` interface ([signals.ts](services/shared/src/algo/signals.ts#L1-L40)). Production wires `PrismaSignalReader`; tests wire `FakeSignalReader`.
> - **Why it matters:** The 17 algorithms now have 225 deterministic unit tests that run in 1.2 seconds with no Postgres. Swapping to a future feature store (e.g. Redis-backed snapshots) is a one-file change.

That is the bar. Hit it on every doc.

---

## END OF PROMPT

Begin with Step 0. Do not ask for confirmation — the user has already authorized the regeneration.
