# Master Upgrade Prompt — Total Activity Tracking + Algorithm Uplift

> Paste this verbatim to a senior coding agent (Claude / GPT / Copilot Agent) with
> full repo access. It is one prompt, not a conversation. The agent must complete
> the whole brief, in order, with no shortcuts.

---

## 0. Role and posture

You are acting as the **lead full-stack engineer + solutions architect** for Miamo
(a premium dating app: Next.js 14 web, 11 Node/TypeScript microservices, Postgres
16, Redis 7, Kubernetes). You have the authority to refactor anything, delete
anything that has no callers, and rewrite any algorithm — provided you do not
regress any user-visible behaviour or any contract documented in
[docs/ARCHITECTURE.md](../ARCHITECTURE.md), [docs/TRACKING.md](../TRACKING.md),
[docs/ALGORITHMS.md](../ALGORITHMS.md), or the per-service READMEs.

You are not a code reviewer. You are the engineer who ships the change.

---

## 1. Phase 1 — Read the entire repository before writing one line of code

Do **all** of the following before any edit:

1. List every top-level folder and every service. Build a mental map of the 11
   services (web, gateway, auth, users, social, messaging, content,
   notifications, ingest, tracking-worker, shared) and their ports.
2. Read every `README.md`, every file under `docs/`, every `package.json`, every
   `tsconfig.json`, every `Dockerfile`, every k8s template, every config file in
   `configuration/`, and every `prisma/schema.prisma`.
3. Open every file under `services/shared/src/algo/` (all 17 algorithms + their
   tests + the registry + `SignalReader` + the math helpers in `lib/`).
4. Open every file under `services/shared/src/track/` and
   `services/tracking-worker/src/` and `services/ingest/src/`.
5. Open every file under `services/web/src/` — every page, every component,
   every hook, the tracking SDK, the SSE client.
6. Open `services/shared/prisma/schema.prisma` in full. Note every model that
   touches tracking, signals, snapshots, caches, compatibility, or feedback.
7. Run `git log --oneline -50` to understand recent history and which work is in
   flight.
8. Produce a written **inventory note** in `docs/PROMPTS/INVENTORY.md` listing:
   - every tracking event currently emitted (file + event name + payload shape),
   - every Postgres table the tracking pipeline writes,
   - every signal the algorithms currently read (via `SignalReader`),
   - every algorithm with its current weights and feature flag,
   - every UI surface that calls `track()` and which events it emits,
   - **gaps** — what is _not_ tracked today that should be.

Do not skip this phase. If you cannot find something, search with `rg`. If still
not found, write "NOT FOUND" in the inventory — never guess.

---

## 2. Phase 2 — Design the total-activity tracking spec

Goal: capture **every meaningful user activity**, including silence, hesitation,
and indecision. If a human watching Priya use the app would notice it, the
system must record it.

### 2.1 Required event families (extend, do not replace)

For each family below, write a short spec in `docs/TRACKING_V4_SPEC.md` with:
event name(s), trigger, payload schema (Zod), sampling rate, privacy class,
and which algorithm(s) will consume it.

1. **Session lifecycle** — start, end, foreground, background, network change,
   battery state if available, app version, device class, viewport size,
   reduced-motion preference, dark/light mode.
2. **Navigation** — page view, route change, back/forward, deep link entry,
   tab switch, share-target entry.
3. **Visibility & attention** — page visibility change, tab blur/focus, window
   resize, fullscreen toggle, PiP, idle (no input for ≥5s), away (no input
   for ≥30s), return-from-away.
4. **Card / profile impressions** — impression start, impression visible-50%,
   visible-100%, dwell samples at 250ms / 750ms / 2s / 5s / 10s, photo index
   changes within a card, bio expand, bio collapse, "see more photos",
   "report"/"block" hover (even without click).
5. **Swipe + decision telemetry** — swipe start, swipe direction velocity and
   distance, swipe abort (started then released), swipe commit (left / right /
   super), undo, hesitation time (impression-to-decision latency), regret
   (undo within 3s), repeat-pass (same profile shown twice and passed again).
6. **Cursor + pointer (web)** — cursor enter/leave per card, hover dwell,
   move-velocity histogram (binned, not raw stream), idle-cursor (no move ≥3s
   while page visible), pointer-press without click, long-press, right-click,
   double-click, drag attempts.
7. **Scroll** — scroll depth %, max depth reached, scroll velocity bands, time
   spent at each band, scroll-to-bottom, scroll-back-up, rubber-band.
8. **Form & input** — focus, blur, first-keystroke latency, typing speed (chars
   per minute, binned), backspace ratio, paste, autofill, abandonment (focus
   then leave without submit), submit, validation error shown.
9. **Chat / messaging** — open thread, scroll history, typing-started,
   typing-stopped, typing-duration, message-drafted-then-deleted, message sent,
   reaction added/removed, voice/photo attachment, read receipt, time-to-reply,
   conversation pause (>15min gap), conversation resume.
10. **Media** — photo view, photo zoom, photo swipe, video play/pause/seek,
    audio play, mute, fullscreen.
11. **Social actions** — like, super-like, pass, match, unmatch, block, report,
    boost, gift, save profile, share profile.
12. **Discovery & search** — filter open, filter change (per filter), filter
    apply, filter reset, search query (hash only, not raw text), search result
    click, no-results-shown.
13. **Notifications** — notification received (server-side), shown (client),
    opened, dismissed, snoozed, settings changed.
14. **Onboarding & profile editing** — step entered, step completed, step
    skipped, step time-to-complete, photo added/removed/reordered, prompt
    answered, voice-prompt recorded.
15. **Performance & errors** — web-vitals (LCP, INP, CLS, TTFB, FCP), long-task
    >200ms, JS error, network error, slow API call >1s, sse-disconnect,
    sse-reconnect, retry-storm.
16. **Idle / passive signals** — heartbeat every 30s while visible, idle ping,
    "still here" ping after 2 / 5 / 10 minutes of inactivity on the same
    screen, app-foreground-without-action (opened but did nothing).
17. **Intent micro-signals** — hover over CTA, hover over price/subscription,
    settle on a profile (return to it within a session), bookmark/save,
    screenshot detection (mobile), copy-to-clipboard.

### 2.2 Non-negotiable constraints

- **Privacy class per event**: `essential`, `quality`, `personalisation`,
  `research`. Consent gating must be enforced server-side, not just hidden in
  the UI. Default: only `essential` + `quality` without explicit opt-in.
- **Raw text never leaves the device.** Search queries, message text, bio text
  → hashed or feature-extracted client-side. Cursor coordinate streams →
  histogrammed client-side, only bins leave.
- **User id is HMAC-fingerprinted server-side** (existing pattern, do not
  break) using `TRACKING_HASH_SECRET`. Never log raw user ids in event store.
- **Batch size**: keep `MAX_EVENTS_PER_BATCH=50`, `MAX_ENVELOPE_BYTES=32KB`.
  Use sampling for high-frequency events (cursor, scroll velocity, heartbeats).
- **Backwards compatibility**: every existing event name continues to work.
  Schema `v=1` stays valid. New fields are additive. New events get `v=2`
  envelope if and only if shape genuinely differs.
- **Performance budget**: ingest p50 ≤ 5ms, p99 ≤ 25ms. Worker end-to-end
  latency (event → algorithm-visible signal) ≤ 15 minutes; ≤ 60 seconds for
  the "hot path" signals (impressionsLast48h, lastSeenAt, activeNow).

### 2.3 Implementation work in this phase

- Extend the web tracking SDK in `services/web/src/lib/track*.ts` with the new
  events. Add a small `useActivityTracker()` hook for visibility/idle/cursor.
- Extend `services/shared/src/track/schema.ts` (or equivalent) with the new
  Zod schemas. Add discriminated unions per family.
- Extend `services/ingest/src/` validation + stream write. No new dependencies.
- Extend `services/tracking-worker/src/` consumers: new aggregators for dwell
  histograms, hesitation latency, cursor-idle, return-rate, regret-rate.
- Add Prisma migrations under `services/shared/prisma/migrations/` for any new
  ledger tables. Never edit an existing migration — only add new ones. Name
  the migration with today's date prefix.
- Wire k8s configmap + values.yaml (`dev`, `staging`, `prod`) for any new env
  vars. Keep defaults safe (sampling on, new families gated behind feature
  flags so they can be ramped per environment).

---

## 3. Phase 3 — Upgrade every algorithm to consume the new signals

Open `services/shared/src/algo/` and go algorithm-by-algorithm. For each of the
17 (`forYou`, `aiPicks`, `new`, `active`, `verified`, `serious`, `cf`, `dtm`,
`moves`, `messageSuggest`, `beats`, `notifyTiming`, `searchAugment`,
`feedAugment`, `postImpressionRerank`, `aiMatch`, plus the `registry`):

1. List the new signals from §2 that are relevant.
2. Update its `SignalReader` calls to read the new signals.
3. Add new weighted terms or new re-rank passes. Keep score in `[0, 100]`.
   Keep the `explain` object lossless — every new term must appear in
   `explain` so audits remain reproducible.
4. Add a feature flag for the new variant
   (e.g. `ALGO_V5_FORYOU_ENABLED=0` by default). Ship the new logic behind
   the flag with the old logic intact. Default `0`.
5. Add unit tests in the matching `*.spec.ts` covering:
   - the new signal contributing,
   - the new signal missing (default fallback),
   - extreme values (0, 1, very high impressions),
   - monotonicity (more compatibility ⇒ higher score),
   - explain object completeness.
6. Add at least one **golden Priya × Arjun** test per algorithm with hand-
   computed expected score in the test file — so future refactors cannot
   silently change ranking.

### 3.1 Specific upgrades that must land

- **`forYou`**: add `hesitationFit` (Priya's average decide-time vs the
  profile's typical reaction profile), `attentionFit` (dwell histogram cosine
  similarity), `regretPenalty` (down-weight people Priya recently undid),
  `repeatPassDamp` (hard penalty if shown twice and passed).
- **`aiPicks`**: ensemble must include the new `returnRate` signal (do people
  come back to this profile within a session?) — strong positive indicator.
- **`active`**: redefine "active" as a smooth decay over `lastActivityAt` not
  a binary 24h cutoff. Include passive activity (heartbeats), not just
  swipes.
- **`notifyTiming`**: use chronotype + idle-pattern + reply-latency
  distribution to pick the moment Priya is most likely to engage without
  feeling pestered. Add a per-user daily cap.
- **`messageSuggest`**: use chat-typing telemetry (drafted-then-deleted rate)
  to suggest openers Priya is statistically more likely to actually send.
- **`postImpressionRerank`**: use dwell + cursor-settle + bio-expand as
  strong positive signals; use rapid-pass + repeat-pass as negative; rerank
  the **next** batch, not the current one Priya is viewing.
- **`cf` (collaborative filter)**: feed it the new impression-quality signals
  (dwell-weighted likes), not raw likes.
- **`feedAugment`**: down-weight content from profiles Priya passed in the
  last 48h.
- **`dtm` (deal-breakers / must-haves)**: re-check that hard filters still
  filter before scoring runs, never after.
- **`registry`**: add a `version` field per algorithm so we can A/B two
  versions in parallel.

### 3.2 Goal alignment

The north-star metric is **mutual quality interaction** — a match that turns
into ≥10 messages exchanged across ≥2 days, both sides. Every algorithm
upgrade must move that metric, not vanity metrics (raw swipes, raw matches).
Document this in `docs/ALGORITHMS.md` under a new §"North-star metric".

---

## 4. Phase 4 — Documentation

Update, in this order, _after_ the code is green:

1. `docs/TRACKING.md` — append the new events to the catalogue. Keep the
   plain-English overview at the top intact. Add a "v4 additions" subsection
   per family.
2. `docs/ALGORITHMS.md` — for each upgraded algorithm, update the weights
   table, the worked Priya × Arjun example, and add the new signals to its
   "inputs" list.
3. `docs/ARCHITECTURE.md` — refresh the data-flow diagram if new tables or new
   worker jobs were added.
4. Per-service README — refresh `services/ingest/README.md`,
   `services/tracking-worker/README.md`, `services/shared/README.md`,
   `services/web/README.md` to reflect new events and new worker cadences.
5. `docs/RUNBOOK.md` — add troubleshooting entries for any new alert,
   any new metric, any new stream consumer group.
6. `docs/DOCUMENTATION_PROMPT.md` — bump the style guide to v3.1 only if you
   genuinely added new conventions. Otherwise leave it.
7. `README.md` and `MIAMO.md` — refresh the "What's new" section, but do not
   re-architect the openings.

**Documentation must obey the v3 style guide** already in
`docs/DOCUMENTATION_PROMPT.md`: stable analogies, three-reader paths
(Meera / Priya / Arjun-the-engineer), TL;DR, worked numeric examples,
debug tables, no forbidden words. Use only real numbers from the code.

---

## 5. Phase 5 — Test everything

Run, in this order, and fix every failure before moving on:

1. `pnpm -w typecheck` (or the repo's equivalent) — zero TypeScript errors.
2. `pnpm -w lint` — zero lint errors, zero warnings in changed files.
3. `pnpm -w test` — every service's unit tests must pass.
   The algorithm test count was 225; it must be **higher** after this work,
   never lower. New tests must run in well under 5 seconds total.
4. `services/shared/prisma/` — `prisma migrate diff` clean.
5. `docker compose up -d postgres redis` then run the smoke script in
   `scripts/api-test.sh`. All endpoints 200 / 401 as documented.
6. `scripts/test-comprehensive.py` if present — must pass.
7. Manual: log in via the web app at `http://localhost:3100/login` as
   `priya@miamo.test`. Open browser devtools → Network → confirm the new
   events fire with the right schema, batched, and that `ingest` returns
   204. Verify no PII leaves the browser (no raw bio text, no raw search
   text, no raw cursor stream).
8. Check Grafana / logs (or `docker logs tracking-worker`) — confirm new
   consumer groups are caught up, no DLQ growth, p99 within budget.
9. Run `kubectl --dry-run=server apply -f k8s/templates/` to validate the
   manifests still apply cleanly.

---

## 6. Phase 6 — Cleanup (with zero functionality loss)

Before commit, delete what is no longer needed. Use **callgraph evidence**,
not vibes:

1. Run `rg` and `ts-prune` (or equivalent) to find unused exports, dead
   files, dead npm scripts, dead env vars, dead k8s resources, dead Docker
   build stages.
2. For each candidate deletion, verify with `vscode_listCodeUsages` (or
   `rg -F`) that **no caller exists** — in any service, any test, any
   script, any doc, any k8s manifest, any CI workflow.
3. Remove:
   - dead algorithm variants that no flag, no test, no doc references,
   - obsolete migration helpers in `scripts/archive/` if they are truly
     superseded (confirm with the user before deleting database scripts),
   - duplicate Zod schemas,
   - duplicated math helpers,
   - dead k8s templates,
   - dead Dockerfile stages,
   - `console.log` debug statements left in production code,
   - commented-out blocks > 5 lines,
   - `TODO` / `TBD` / `XXX` markers that are stale (≥ 6 months old or
     pointing at shipped work).
4. **Never delete**:
   - a Prisma migration (only add new ones),
   - a public API route used by the web client,
   - a tracking event name (additive only — old names stay so historical
     events still validate),
   - anything in `assets/`,
   - anything you did not personally verify is unused.
5. After cleanup, re-run **all of phase 5** start to finish.

---

## 7. Commit, branch, push

- Work on a branch: `git checkout -b feat/total-tracking-v4`.
- Commit in logical chunks: one commit per phase, with detailed messages.
  Use Conventional Commits: `feat(tracking): ...`, `feat(algo): ...`,
  `refactor: ...`, `docs: ...`, `test: ...`, `chore(cleanup): ...`.
- Open a single PR titled
  **"feat: total activity tracking v4 + algorithm uplift v5"**.
- PR description must include:
  - the inventory diff (events added, signals added, algorithms upgraded),
  - the feature flag list (all default `0`, ramp plan included),
  - the migration list,
  - the test count before / after,
  - the privacy review (per-event privacy class, consent gating proof),
  - the rollback plan (flip flags to `0`, no migration rollback needed).
- Do **not** force-push. Do **not** `--no-verify`. Do **not** merge yourself.
- Push: `git push -u origin feat/total-tracking-v4`.

---

## 8. Definition of done

You may only declare this work complete when **all** of the following are true:

- [ ] Every file in the repo was read in phase 1; inventory note exists.
- [ ] Every event family in §2.1 has at least one event implemented end-to-end
      (SDK → ingest → stream → worker → ledger).
- [ ] Every one of the 17 algorithms reads at least one new signal and has at
      least one new test.
- [ ] All new logic is behind a feature flag defaulting to off.
- [ ] North-star metric is documented in `docs/ALGORITHMS.md`.
- [ ] Privacy classes documented per event; consent gating enforced server-side.
- [ ] Performance budgets in §2.2 measured (not assumed) and met.
- [ ] All tests green; test count strictly higher than before.
- [ ] Cleanup phase produced a non-empty diff with zero functionality loss.
- [ ] Docs updated to v3 style; no forbidden words; all numbers verified
      against the source.
- [ ] Branch pushed, PR opened, rollback plan stated.

If any box is unchecked, **do not declare done** — finish the remaining work.

---

## 9. Hard rules — never break these

1. Never log raw PII (message text, search text, bio text, raw user id,
   email, phone, exact coordinates).
2. Never edit an existing Prisma migration.
3. Never delete a public API surface without confirmation.
4. Never ship a new algorithm as the default — always behind a flag, off.
5. Never widen a Zod schema in a way that breaks the existing producer.
6. Never use `any` or `as unknown as` to silence types; fix the type instead.
7. Never `git push --force` to `main` or any shared branch.
8. Never bypass tests (`--no-verify`, `it.skip`, `xdescribe`).
9. Never invent numbers in docs; read from source or compute and show the
   computation.
10. Never assume — read the file.

---

End of prompt. Begin with phase 1.
