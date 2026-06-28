# Runbook — The 3am on-call playbook (v3.6)

**TL;DR:** Something is broken. Find the symptom in the table below. Run the first-check command. Read the likely causes (ranked). Run the fix. Add the prevention to your sprint board.

This runbook is **pair-written**: every section has a non-technical explanation first (read this if you woke up confused, or you're the PM who got paged), then a technical drill-down (read this if you're the on-call engineer with a terminal open).

---

## How to read this

- **On-call engineer**: This is your playbook. Symptom → first check → likely causes → fix command → prevent-next-time.
- **Product manager / non-engineer**: Skim "Severity levels" + the "What user sees" + "What dashboard shows" paragraphs. Skip the bash blocks unless you're curious.
- **Reliability / new hire**: Start with §1 (Severity), then read every incident in order. Each one is a self-contained story.
- **3am you**: Ctrl-F the error message. If it's not here, the postmortem template at the bottom is what you'll be writing tomorrow.

### A note on style

We use four names throughout to make "what the user sees" concrete:

- **Priya** — power user, premium, swipes daily, very vocal in support tickets.
- **Arjun** — new user, just installed today, low patience for friction.
- **Karan** — paid user on Family-Brief flow (matrimonial / DTM).
- **Riya** — casual creator, posts to Creativity reels, cares about earnings + spotlight credits.

Whenever you see "Priya sees a 502", that's not a specific person — it's our shorthand for "a real human is staring at a broken screen right now."

---

## Severity levels

We classify by **user impact**, not by what part of the stack is on fire. A dead worker is Sev-3 if no user notices for 6 hours; a single Postgres replica is Sev-1 if it's the primary.

| Level | Impact | Who wakes up | Time-to-respond | Examples |
|-------|--------|--------------|-----------------|----------|
| **Sev-1** | App unusable for ≥10% of MAU, OR data integrity at risk, OR security breach | Page everyone (on-call + lead + product) | 5 min | 502s everywhere, Postgres primary down, JWT_SECRET rotated by accident, mass logout, encrypted messages unreadable |
| **Sev-2** | Major feature degraded but app still works | Page service owner + on-call | 15 min | Discover returning empty, Chat send 500, tracking-worker dead (no learning), Move v2 falling back to v1 >5%, push notifications delayed >1h |
| **Sev-3** | Minor feature broken, or background pipeline silently failing | Ticket, fix in current sprint | Next business day | WeeklyTopMatch table empty, fairness audit not running, ExposureScheduler writing 0 credits, single user can't log in |
| **Sev-4** | Cosmetic, or affects <100 users | Backlog, fix when convenient | Next sprint | Typo on profile, image upload slow, one user's avatar broken |

**Sev-1 ≠ "really bad."** It means **users are actively impacted right now**. A broken nightly job that nobody sees until Monday is Sev-3 even if the data loss looks scary.

**Sev-2 is the most common.** Almost every incident in this runbook is Sev-2 unless explicitly upgraded.

### Severity-upgrade triggers

Any of these auto-upgrade a Sev-2 to Sev-1:

- The failure is on the **happy path** (login, Discover load, send-first-message)
- The failure **silently corrupts** data (silent-204 ingest, missing migration)
- The failure **breaks decryption** of historical content (encryption key rotation)
- The failure **leaks PII** (logs, error responses, public endpoints)
- The failure persists for **>15 minutes** on a feature flag that's ON in production

If you're not sure, page the lead and let them downgrade. False positives are cheap; missed Sev-1s are expensive.

---

## Quick-reference: where things live

```
/services
  /gateway              :3200    Edge API, CSP, rate limit, SSE fan-out
  /auth                 :3201    JWT issue/refresh, OAuth, OTP
  /users                :3202    Profile, photos, settings, verification
  /social               :3203    Discover, Match, Like, AI Match
  /messaging            :3204    Chat, Beat, AES-256-GCM
  /content              :3205    Feed, Story, Video, Creativity, Spotlight
  /notifications        :3206    FCM/APNS, in-app
  /ingest               :3260    Tracking edge — returns 204 always
  /tracking-worker      :3261    Consumes Redis Stream, writes to Postgres
  /shared               (lib)    Prisma schema (canonical), 53 algos, middleware
  /web                  :3100    Next.js 14

/services/shared/prisma/schema.prisma     ← CANONICAL Prisma schema (67 models)
/services/shared/node_modules             ← Every service loads @prisma/client from here
/services/shared/src/algo                 ← 53 algo modules
/services/tracking-worker/src             ← 13 worker loops

/scripts/start.sh                ← Local/Docker/k8s entry
/scripts/qa-runs/phase-*.py               ← QA gauntlet (14 phases)
/.env.example                             ← Source of truth for env vars
```

**Critical gotchas — read these even if nothing else** (paraphrased from docs/TRACKING.md / docs/ALGORITHMS.md §10):

1. **Prisma runtime drift** — every service loads `@prisma/client` from `services/shared/node_modules`. After any change to `services/shared/prisma/schema.prisma`, run `cd services/shared && npx prisma generate` AND restart every Node service. Per-service mirror schemas (`services/{content,social,users}/prisma/schema.prisma`) are stale; the shared schema is runtime truth.
2. **UserActivity.metadata is JSON-stored-as-string** — not a Postgres JSON column. Use `parseMeta()` (`try { JSON.parse } catch { return {} }`) before reading nested keys.
3. **Tracking is lossy at the edge by design** — `ingest` (`:3260`) returns `204` even on Redis outage, kill switch, DNT header, or parse failure. Do NOT add error responses; it would let scrapers fingerprint the surface. The price is: silent data loss is possible. Always cross-check Redis stream length against ingest req-count.
4. **Bootstrap trap in `scripts/start.sh`** — the `local_env()` function (lines 52–66) `export`s hardcoded values that **override your `.env` file** for `local dev` (a.k.a. `local start dev`). If you set `FEATURE_ANTI_GHOST_ENABLED=1` in `.env` but boot via `local dev`, it'll be unset because `local_env` doesn't re-export it. See Incident 2 for the fix.
5. **Tracking userIds are HMAC-SHA256 hashed to 22 base64url chars** before persistence. Algorithms can compare hashes but cannot reverse-identify the user. Rotating `TRACKING_HASH_SECRET` breaks future joins and is the RTBF (Right To Be Forgotten) mechanism.

---

## How to use this runbook during an incident

1. **Identify the symptom.** Don't start with the cause. The dashboard or the user report tells you what's broken; the runbook tells you where to look.
2. **Run the first-check command.** It's deliberately fast (<30 sec) and read-only. It tells you which branch of the diagnosis tree you're on.
3. **Read likely causes in order.** They're ranked by frequency in our last 12 months of incidents. Most of the time it's #1.
4. **Apply the fix.** Copy-paste the command. Tweak only the placeholders in `<angle-brackets>`.
5. **Verify the fix.** Every section has a verification command. Run it before you go back to sleep.
6. **Write the postmortem.** Use the template at the bottom. Add a new "Prevent next time" bullet if you learned something new.

---

# The incidents

There are 20+ incidents below, grouped loosely by where they manifest. Numbering is stable — don't renumber if you add a new one; append.

| # | Symptom (one line) | Severity | Likely sub-system |
|---|--------------------|----------|--------------------|
| 1 | `/discover` returning 502 | Sev-1 | Gateway → Social |
| 2 | QA phase-14 reports anti-ghost flag OFF when set in `.env` | Sev-3 (bug) | Local bootstrap |
| 3 | Tracking-worker queueing up — Redis MAXLEN exceeded | Sev-2 | Tracking pipeline |
| 4 | Move v2 fallback rate >5% | Sev-2 | Content → Move |
| 5 | Family Brief token PII leak suspicion | Sev-1 | Content → Family Brief |
| 6 | Fairness Gini >0.45 (audit alert) | Sev-3 | Workers → fairnessAudit |
| 7 | Local services start but typecheck fails | Sev-3 | Dev env / Prisma |
| 8 | Postgres at 100% CPU | Sev-1 | Postgres |
| 9 | Redis memory at 95% | Sev-2 | Redis |
| 10 | Single user login fails repeatedly | Sev-3 | Auth → Otp |
| 11 | Tests pass locally, fail in CI | Sev-3 | CI |
| 12 | New env var added in code but not in `.env.example` | Sev-3 (process) | Repo hygiene |
| 13 | Move v2 returns 0 suggestions consistently | Sev-2 | Content → senderVoice |
| 14 | Chat send returns 500 — AES key rotation | Sev-1 | Messaging |
| 15 | SSE connection drops every 30s | Sev-2 | Gateway / LB |
| 16 | Migration applied but Prisma queries fail | Sev-2 | Prisma runtime |
| 17 | ExposureScheduler writing 0 credits | Sev-3 | Workers → premium signal |
| 18 | WeeklyTopMatch table empty after Sunday | Sev-3 | Workers → stableMatchTop10 |
| 19 | fairnessAudit not running — no AuditLog rows | Sev-3 | Workers → fairnessAudit |
| 20 | Build fails in CI on `cd services/web && npm run build` | Sev-2 | Next.js / Build |
| 21 | Mass logout (all users forced re-login) | Sev-1 | Auth → JWT_SECRET |
| 22 | Push notifications delayed >1h | Sev-2 | Notifications |

---

## Incident 1 — `/discover` returning 502

**Severity: Sev-1.** Discover is the happy path; if it's 502'ing, our DAU number is going to zero in real-time.

### What user sees

Priya opens the app. She taps Discover. The screen flashes the skeleton loader for half a second, then shows our generic "Something went wrong. Please try again." banner. She pulls to refresh. Same banner. She closes the app, reopens it. Same banner. After three retries, she goes to Hinge.

Arjun, who just signed up an hour ago, sees the same banner on his very first Discover load. He's not coming back tomorrow.

Karan and Riya report it in our support channel within 90 seconds of each other. The pattern is: 100% of users, 100% of requests, instant. Not flaky — total.

### What dashboard shows

- Grafana `gateway_5xx_rate` panel: spike from ~0.1% baseline to ~80% in <60 seconds.
- `social_request_duration_p99` panel: either flat (gateway can't reach social) or spikes to timeout.
- PagerDuty alert title: **"Gateway 5xx rate > 5% for 2m"** — fires within 2 minutes of onset.
- Kubernetes `kubectl get pods -l app=social -n miamo` may show `CrashLoopBackOff` or pods that are `Running` but failing health.
- Sentry: a wave of `UpstreamConnectionError` or `EAI_AGAIN` events tagged `service=gateway, upstream=social`.

### First check

```bash
# Step 1 — are the gateway pods healthy?
kubectl get pods -l app=gateway -n miamo
# Step 2 — are the social pods healthy?
kubectl get pods -l app=social -n miamo
# Step 3 — gateway recent logs (last 200 lines)
kubectl logs -l app=gateway -n miamo --tail=200 | grep -iE "error|upstream|timeout|refused"
# Step 4 — social recent logs
kubectl logs -l app=social -n miamo --tail=200 | grep -iE "error|prisma|fatal"
```

If `social` pods are `CrashLoopBackOff` → cause #1 below.
If `social` pods are `Running` but gateway shows `EAI_AGAIN` / `ECONNREFUSED` → cause #2 (service-discovery / network).
If both look healthy → cause #3 (Postgres unreachable from social).

### Likely causes (ranked by frequency)

1. **Social service crashed on startup.** Most common after a deploy. Cause: missing env var, Prisma schema drift, or a TypeScript compile error that slipped past CI (rare but seen). Look for `process.exit(1)` lines, "Cannot find module," or `PrismaClientInitializationError` in the social pod logs.
2. **Network policy / service-mesh blocked gateway → social.** Usually after an Istio/Linkerd config change. Gateway logs show `ECONNREFUSED` despite social being `Running`. Try `kubectl exec` into a gateway pod and `curl http://social:3203/health` — should return 200.
3. **Postgres unreachable from social.** Connection pool exhausted, pgBouncer down, or VPC peering broken. Social pod logs will show `P1001: Can't reach database server`. Check Postgres pod + recent network events.
4. **Bad deploy — recent code change broke startup.** Usually identifiable from the git log in the last 30 min. Look for changes to `services/social/src/server.ts`, route handlers, or new Prisma calls that reference fields the runtime client doesn't have.
5. **OOM on social.** Pod was killed for exceeding memory limit. `kubectl describe pod <social-pod>` shows `Last State: Terminated, Reason: OOMKilled, Exit Code: 137`.

### Fix

```bash
# Default first move: roll back if there was a deploy in the last 60 minutes.
kubectl rollout undo deployment/social -n miamo
kubectl rollout status deployment/social -n miamo --timeout=120s

# Once social is healthy, confirm gateway recovers.
curl -s -o /dev/null -w "%{http_code}\n" http://gateway:3200/health
# Expected: 200

# If rollback didn't help — restart social (clears bad in-memory state):
kubectl rollout restart deployment/social -n miamo

# If still broken and pods are crashing on startup, get the exact error:
kubectl logs --previous -l app=social -n miamo --tail=100

# If it's an env var (P1001, missing JWT_SECRET, etc.), patch the deployment temporarily:
kubectl set env deployment/social -n miamo DATABASE_URL="<correct-url>"

# If Postgres is the issue, see Incident 8.
```

### Verify

```bash
# Synthetic check from outside the cluster (or your laptop):
curl -sX POST https://api.miamo.app/v1/discover \
  -H "Authorization: Bearer <staging-token>" \
  -H "Content-Type: application/json" -d '{}' \
  -w "\nHTTP %{http_code} in %{time_total}s\n"
# Expected: HTTP 200, payload with cards, <500ms
```

Run this 5 times in 60 seconds. All 5 must return 200.

### Prevent next time

- **Staging smoke test required before prod deploy.** A single `curl /discover` synthetic against staging that returns non-200 should block the prod promote.
- **Env vars declared with `${VAR:?required}` in compose / `${VAR}` with a startup assertion in code.** Missing vars must fail at boot, not at first request. See `services/shared/src/env.ts` for the pattern.
- **Health checks must be deep, not shallow.** `/health` returning 200 if the process is up isn't enough — add `/health/deep` that does a `SELECT 1` against Postgres and reports failure. Wire it to the k8s readinessProbe so a sick pod stops receiving traffic.
- **Canary deploys for social.** Roll out to 10% of pods first; auto-rollback if 5xx rate on the canary spikes.

---

## Incident 2 — Phase-14 QA reports anti-ghost flag OFF when flag is set in `.env`

**Severity: Sev-3 (bug in dev tooling), but Sev-2 if it masks a real flag-OFF in staging.**

This is the **bootstrap trap**. It bites every new dev once.

### What user sees

Nothing — this is a dev / QA problem, not a user-facing one. But the symptom is: the QA gauntlet (`scripts/qa-runs/phase-14-*.py`) reports `"FEATURE_ANTI_GHOST_ENABLED=0"` even though you swear you set it to `1`. You re-read your `.env` file. It says `FEATURE_ANTI_GHOST_ENABLED=1`. You're going insane.

### What dashboard shows

- `scripts/qa-runs/phase-14-*.report.json` includes `{"flags": {"FEATURE_ANTI_GHOST_ENABLED": "0", ...}}`.
- The messaging service `/admin/flags` endpoint (or whatever inspection endpoint you use) returns `anti_ghost: false`.
- `printenv FEATURE_ANTI_GHOST_ENABLED` inside the messaging pod returns empty.

### First check

```bash
# Step 1 — is the env var actually being exported in your shell?
echo "FEATURE_ANTI_GHOST_ENABLED=$FEATURE_ANTI_GHOST_ENABLED"

# Step 2 — what does the bootstrap script export?
grep -n "FEATURE_ANTI_GHOST" scripts/start.sh

# Step 3 — what does the running messaging process see?
ps auxe | grep -E "tsx watch.*messaging" | tr ' ' '\n' | grep FEATURE_ANTI
```

If step 1 is empty → your shell never sourced `.env`.
If step 2 returns no match → that's the bug. The bootstrap script never `export`s `FEATURE_ANTI_GHOST_ENABLED`.
If step 3 is empty → confirmed: the process is running without the flag.

### Likely causes (ranked)

1. **The bootstrap trap.** `scripts/start.sh`'s `local_env()` function (lines 52–66) only `export`s a small hand-curated list: `DATABASE_URL`, `JWT_SECRET`, `INTERNAL_SERVICE_KEY`, `ENCRYPTION_KEY`, `NODE_ENV`, `FRONTEND_URL`, and the service URLs. **It does NOT source `.env`.** So any feature flag you add to `.env` is invisible to local services. This is the most common cause of "flag set but doesn't behave like it's set." It's a *trap* because `.env` is the obvious place to put flags.
2. **`.env` file has the var, but you booted services from a different shell.** You set the var in shell A, then ran `local dev` in shell B (fresh terminal) without sourcing `.env`. Common when you flip back and forth between terminals.
3. **Typo in the var name.** `FEATURE_ANTIGHOST_ENABLED` vs `FEATURE_ANTI_GHOST_ENABLED`. Compare against `.env.example` byte-for-byte.
4. **Flag is correctly set but the code reads it differently.** E.g., `process.env.FEATURE_ANTI_GHOST_ENABLED === 'true'` vs `=== '1'`. Check the reading site — convention in this repo is **`'1' = on, anything else = off`** (see `.env.example` line 105).
5. **You're hitting a different environment than you think.** `kubectl exec` into staging while inspecting local. Verify which pod / process you're actually talking to.

### Fix

```bash
# Option A — fix the bootstrap trap by sourcing .env in local_env(). 
# Open scripts/start.sh, add at the top of local_env():
#
#   if [ -f "$MIAMO_DIR/.env" ]; then
#     set -a
#     source "$MIAMO_DIR/.env"
#     set +a
#   fi
#
# Then restart:
bash scripts/start.sh local restart dev

# Option B — export manually before starting (one-shot):
set -a
source .env
set +a
bash scripts/start.sh local dev

# Option C — pass the flag inline (debugging):
FEATURE_ANTI_GHOST_ENABLED=1 PORT=3204 npx tsx watch services/messaging/src/server.ts
```

### Verify

```bash
# Re-run the QA gauntlet
python3 scripts/qa-runs/phase-14-creativity-anti-ghost.py

# Or hit the inspection endpoint
curl -s http://localhost:3204/admin/flags | jq '.FEATURE_ANTI_GHOST_ENABLED'
# Expected: "1"
```

### Prevent next time

- **Fix `local_env()` to source `.env`** (Option A above). This is the right long-term fix. Until that's merged, this incident will keep happening.
- **Add a flag-self-check to the QA harness.** Phase-14 should boot, immediately query each service's `/admin/flags` (or similar), and print the resolved flag state at the top of the report. So when the report says "flag OFF," you immediately see *which* layer failed.
- **Document the trap.** This runbook entry IS the documentation, but also add a banner comment in `start.sh` above `local_env()` saying "HARDCODED — do not rely on `.env` here."
- **Add a CI check** that diffs `.env.example` against the list of `process.env.X` reads in the codebase. If a code path reads a var that's not in `.env.example`, fail the build. (See Incident 12.)

---

## Incident 3 — Tracking-worker queueing up — Redis MAXLEN exceeded

**Severity: Sev-2.** Tracking is lossy by design (see Critical Gotcha #3), but if the stream is overflowing we're losing data we'd otherwise have.

### What user sees

Nothing immediately. But over 24 hours, learning quality degrades: Discover's V8 ranker is trained on stale features, Move v2 has stale sender-voice cache, fairness audit operates on yesterday's data. Priya complains that Discover feels "weirdly random today." Riya notices her trending content doesn't surface.

### What dashboard shows

- `tracking_stream_length{key="events:raw"}` Grafana panel: trending up past the `TRACKING_STREAM_MAXLEN` (default 10M, see `.env.example` line 91).
- `tracking_worker_lag_seconds` panel: consumer lag growing linearly, >300 sec.
- `tracking_worker_loop_duration` panel: one or more loops missing their tick (gaps in the time series).
- PagerDuty: **"Tracking stream depth > 1M"** or **"Tracking worker consumer lag > 5m"**.

### First check

```bash
# Step 1 — current stream length vs cap
redis-cli XLEN events:raw
redis-cli CONFIG GET maxmemory
echo "Cap: $TRACKING_STREAM_MAXLEN (default 10000000)"

# Step 2 — consumer group lag (who's stuck)
redis-cli XINFO GROUPS events:raw
# Look for: pel (pending entries list) growing; idle (ms since last activity) > 60000

# Step 3 — worker pod state
kubectl get pods -l app=tracking-worker -n miamo
kubectl logs -l app=tracking-worker -n miamo --tail=200 | grep -iE "error|fatal|backoff|oom"

# Step 4 — is the worker actually XREADGROUPing?
redis-cli XINFO CONSUMERS events:raw rollup
# Look at: idle field per consumer
```

### Likely causes (ranked)

1. **Worker pod crashed / OOMKilled.** Pods show `CrashLoopBackOff` or restart count climbing. Most common after a memory spike from an upstream burst.
2. **One worker consumer took an XREADGROUP lock, then died without ACK.** The stream entries are stuck in the PEL (pending entries list) — the group thinks they're being processed but the consumer is gone. `XINFO CONSUMERS` shows a consumer with high `idle` (>60s) and >0 pending. Need to `XAUTOCLAIM` or delete the consumer.
3. **Downstream Postgres slowdown.** Worker is XREADGROUPing fine but its writes are slow (Postgres at high CPU, missing index, locking). Worker logs show batch writes taking >5 sec. See Incident 8.
4. **TRACKING_KILL accidentally set to 1.** Master kill switch (`.env.example` line 85). Worker loops short-circuit and nothing drains. Check `kubectl exec -- printenv TRACKING_KILL`.
5. **Inbound spike exceeds drain rate.** A scraper, a viral moment, or a botted login surge. Stream grows faster than the worker can XREADGROUP. Look at ingest req-rate.

### Fix

```bash
# Quick mitigation — restart worker (clears stuck consumers if cause #2)
kubectl rollout restart deployment/tracking-worker -n miamo

# If a specific consumer is stuck (cause #2), claim its pending entries:
redis-cli XAUTOCLAIM events:raw rollup tw-recover 60000 0 COUNT 10000
# Reads up to 10k entries idle >60s and reassigns them to a new consumer "tw-recover"

# Or nuke the stuck consumer (the worker will recreate one):
redis-cli XGROUP DELCONSUMER events:raw rollup <stuck-consumer-name>

# Trim the stream to make room (data loss — accept it; we're already past MAXLEN):
redis-cli XTRIM events:raw MAXLEN 100000
# Keeps newest 100k events, drops the rest

# If TRACKING_KILL is on accidentally, turn it off:
kubectl set env deployment/tracking-worker -n miamo TRACKING_KILL=0
kubectl set env deployment/ingest -n miamo TRACKING_KILL=0

# Verify drainage
redis-cli XLEN events:raw
# Should decrease every 10 sec
```

### Verify

```bash
# Monitor over 2 minutes — should shrink continuously
for i in 1 2 3 4 5 6; do
  echo -n "$(date +%T)  XLEN: "
  redis-cli XLEN events:raw
  sleep 20
done

# Check worker is actually consuming
redis-cli XINFO CONSUMERS events:raw rollup
# idle should be <2000ms for the active consumer
```

### Prevent next time

- **Alert on stream length > 1M** (currently we alert on 5M which is too late).
- **Alert on consumer lag > 60 sec** — catches stuck consumers before backlog grows.
- **`XAUTOCLAIM` loop in the worker itself** — every 60 sec, claim any entries idle >120 sec. Self-heals stuck consumers without ops intervention.
- **MAXLEN cap on the XADD side**, not just on a periodic trim. Ingest already does `XADD events:raw MAXLEN ~10000000 ...` — verify the `~` (approximate trim) is present. Without it, every write does a full trim and tanks throughput.
- **Worker pod memory limit + restart policy** — sized so OOM is recoverable. Currently 512Mi; investigate if bursts push past that.
- **Capacity headroom** — at peak, the worker should be drained to ≤30% of capacity. If we're consistently >70%, scale up before the next viral moment.

---

## Incident 4 — Move v2 fallback rate >5%

**Severity: Sev-2.** Move v2 is the conversational-first feature; high fallback rate means users see the v1 fallback ("Send a hi 👋") which is uninspired and lowers reply rate.

### What user sees

Priya opens a chat with a new match. She taps "Send a Move" expecting the personalized 3-suggestion picker (v2). Instead she gets the generic v1 button: "Send a 👋 hi." She closes the chat without sending. Her match cools off.

Across the population, Move-v2 fallback rate is the % of `move.suggest` calls that fell back to v1. Healthy: <2%. Yellow: 2-5%. Red: >5%.

### What dashboard shows

- `move_v2_fallback_rate` Grafana panel: trending past 5%.
- `move_v2_suggest_duration_p99` panel: may be elevated (timeouts cause fallback).
- `move_v2_cache_hit_rate` panel: dropped — sender-voice cache misses force the slow path which then times out.
- Content service logs: `move.v2.fallback reason=<timeout|empty|error|flag_off>`.

### First check

```bash
# Step 1 — what's the fallback reason distribution?
kubectl logs -l app=content -n miamo --tail=2000 | grep "move.v2.fallback" \
  | grep -oE "reason=\w+" | sort | uniq -c | sort -rn

# Step 2 — is the feature flag still on?
kubectl exec -- printenv FEATURE_MOVE_V2_ENABLED
# Expected: 1

# Step 3 — sender-voice cache health
redis-cli --scan --pattern "sender-voice:*" | wc -l
# Expected: thousands. <100 = cache cold.

# Step 4 — content service error rate
kubectl logs -l app=content -n miamo --tail=500 | grep -iE "error|prisma|timeout"
```

### Likely causes (ranked)

1. **Sender-voice cache is cold or empty.** See Incident 13 — the v2 pipeline needs cached sender-voice fingerprints; if cache is empty, every request runs the slow path, times out, falls back to v1.
2. **Content service slow / timing out.** v2 has a 1500ms deadline; if Postgres or the embedding service is slow, it falls back. Look for elevated P99 on `move.suggest`.
3. **Feature flag flipped OFF unexpectedly.** Someone set `FEATURE_MOVE_V2_ENABLED=0` (intentionally or via bad config push). All calls fall back with `reason=flag_off`.
4. **Recent deploy broke v2.** Look at last 24h commits to `services/content/src/` for changes touching `move`, `senderVoice`, `composer`.
5. **Embedding service down.** v2's prompt builder calls the embedding service for vibe-cosine; if that's slow or errors, fallback. (Embedding service is in-process for now — check shared algo module logs.)

### Fix

```bash
# If cache is cold (cause #1), trigger a warm-up:
kubectl exec deployment/content -n miamo -- node -e "require('./dist/move/warmCache').warmAll()"
# (Adjust path if compile output differs. Or trigger via internal admin endpoint.)

# If flag is OFF (cause #3), turn it on:
kubectl set env deployment/content -n miamo FEATURE_MOVE_V2_ENABLED=1
kubectl rollout restart deployment/content -n miamo

# If recent deploy is suspected (cause #4), rollback:
kubectl rollout undo deployment/content -n miamo

# If embedding service is slow (cause #5), check it directly:
kubectl logs -l app=content -n miamo --tail=500 | grep -i embed

# Temporarily lower the v2 deadline (rare — only if you'd rather show v1 than wait):
kubectl set env deployment/content -n miamo MOVE_V2_DEADLINE_MS=800
```

### Verify

```bash
# Fallback rate over the next 5 min
for i in 1 2 3 4 5; do
  total=$(kubectl logs --since=1m -l app=content -n miamo | grep -c "move.v2.suggest")
  fallback=$(kubectl logs --since=1m -l app=content -n miamo | grep -c "move.v2.fallback")
  if [ "$total" -gt 0 ]; then
    pct=$(echo "scale=2; $fallback * 100 / $total" | bc)
    echo "$(date +%T) fallback=$fallback/$total ($pct%)"
  fi
  sleep 60
done
# Target: <2%
```

### Prevent next time

- **Alert on fallback rate >2% sustained 5 min** (yellow), >5% sustained 2 min (page).
- **Warm sender-voice cache on deploy.** Add a startup hook that pre-populates the top 10k active users' fingerprints.
- **Reduce v2 deadline** if cache hit rate is high (<300ms p99) — failing fast is better than timing out at 1500ms.
- **Feature flag changes go through an approval workflow.** `kubectl set env` directly is too easy to fat-finger; force flag changes through a PR + ConfigMap reload.
- **End-to-end synthetic that exercises Move v2 every 5 min** in staging, matching against an alert.

---

## Incident 5 — Family Brief token PII leak suspicion

**Severity: Sev-1.** PII exposure is automatic Sev-1 regardless of confirmation status. Treat suspicion as confirmed until proven otherwise.

### What user sees

Karan, on the matrimonial/DTM flow, shares a Family Brief link with his uncle. The link is supposed to render a masked view (name initial only, no photos, no contact). Instead, the link renders the full profile — name, photos, phone number, address city. Karan's uncle screenshots and forwards to a WhatsApp group. Karan is furious. He files a complaint.

Severity: Sev-1 immediately. PII (name, phone) leaving the masked view is a privacy regression of the highest order.

### What dashboard shows

- A spike in `family_brief.share.unmasked.viewed` events (a counter we should be emitting from the family-brief share page).
- A spike in support tickets tagged `privacy / family-brief / leak`.
- Sentry: `FamilyBriefMaskMismatch` errors if we have an integrity check.
- `FEATURE_DTM_MASK_ENABLED` may be unexpectedly `0` (see `.env.example` line 116).

### First check

```bash
# Step 1 — is the mask flag on?
kubectl exec -- printenv FEATURE_DTM_MASK_ENABLED
kubectl exec -- printenv FEATURE_FAMILY_BRIEF_ENABLED

# Step 2 — fetch a family-brief share URL as an outsider (no auth)
curl -s "https://api.miamo.app/v1/family-brief/share/<token>" | jq '.profile | {name, phone, address}'
# Expected: name="K", phone=null, address=null
# Leak indicator: name="Karan Mehta", phone="+91...", address="Bangalore, KA"

# Step 3 — what's in the FamilyBriefShare table for this token?
psql $DATABASE_URL -c "SELECT id, maskingLevel, expiresAt, viewCount FROM \"FamilyBriefShare\" WHERE token = '<token>';"

# Step 4 — recent deploys touching family-brief
git log --since="48 hours ago" -- services/content/src/familyBrief*
```

### Likely causes (ranked)

1. **`FEATURE_DTM_MASK_ENABLED=0`** — mask flag is off. The unmask happens because no masking layer runs. Highest probability cause; least scary fix.
2. **`maskingLevel` field on the FamilyBriefShare row is wrong** (set to `none` or `full` instead of `masked`). Either a UI bug let the user pick the wrong level, or a backfill set it incorrectly.
3. **Recent code change bypassed the mask.** A refactor of the share endpoint that forgot to call `applyMask()` before returning the profile. Look at recent diffs to `services/content/src/familyBrief*`.
4. **Caching layer serving stale unmasked response.** If a CDN or in-process cache keyed on the share token returns the pre-mask payload from before the mask flag flipped on.
5. **The share is genuinely unmasked by intent and the user is mistaken.** Verify with Karan which link he sent; the unmasked variant is a legitimate product feature for late-stage shares.

### Fix

```bash
# IMMEDIATE — revoke the leaked share
psql $DATABASE_URL -c "UPDATE \"FamilyBriefShare\" SET \"revokedAt\" = NOW() WHERE token = '<token>';"

# If flag is off (cause #1), turn it on:
kubectl set env deployment/content -n miamo FEATURE_DTM_MASK_ENABLED=1
kubectl rollout restart deployment/content -n miamo

# If a code regression (cause #3), rollback content:
kubectl rollout undo deployment/content -n miamo

# Clear any CDN / Redis cache for the share path
redis-cli --scan --pattern "family-brief:share:*" | xargs -r redis-cli DEL
# CDN: purge `/v1/family-brief/share/*` via your CDN's API

# Notify the affected user (Karan): apology + reset their share + offer to delete the conversation
```

### Verify

```bash
# Re-fetch the same token (which is now revoked — should 404 / 410)
curl -i "https://api.miamo.app/v1/family-brief/share/<token>"
# Expected: HTTP 410 Gone, or 404

# Issue a new test share, verify it's masked
curl -X POST "https://api.miamo.app/v1/family-brief/share" \
  -H "Authorization: Bearer <karan-token>" \
  -d '{"maskingLevel": "masked"}' | jq '.token' \
  | xargs -I {} curl -s "https://api.miamo.app/v1/family-brief/share/{}" | jq '.profile.name'
# Expected: "K" (single initial)
```

### Prevent next time

- **PII smoke test in staging on every deploy.** Generate a masked share, fetch it, assert the response has no full name / phone / address. Fail the deploy if assertion fails.
- **Mask-application as a hard middleware** — not a route-handler call. So forgetting to call it doesn't silently skip masking; instead, returning an unmasked profile from a `/share/` route is impossible.
- **Audit log every Family Brief view** with the masking level applied. Then a SQL query can find "shares where viewed.maskingLevel != row.maskingLevel" and alert.
- **Public bug bounty / red-team this surface quarterly.** PII leaks are catastrophic and hard to predict without adversarial testing.
- **Mandatory privacy review on PRs that touch `familyBrief*`, `dtm*`, `matrimonial*`.** Add CODEOWNERS rule.

---

## Incident 6 — Fairness Gini >0.45 (audit alert)

**Severity: Sev-3 (background pipeline alert).** Not user-impacting today, but ignored long enough becomes a discrimination problem.

### What user sees

Nothing directly. But if Gini is sustained high, some demographic / geographic / interest groups will see fewer impressions than others — a quiet erosion of the platform's fairness promise.

(Background: Gini coefficient over the top-10% concentration of `card.impression.50` events. 0 = perfect equality, 1 = total monopoly. Healthy = <0.35. Alert threshold = 0.45, per `.env.example` line 173.)

### What dashboard shows

- `fairness_gini` Grafana panel: red zone, sustained >0.45 for >24h.
- `AuditLog` table: a row with `action='fairness.audit.alert'` and `details.gini > 0.45`.
- PagerDuty: **"Fairness Gini alert"** (Sev-3 routing — daytime page only).

### First check

```bash
# Step 1 — recent fairness-audit AuditLog rows
psql $DATABASE_URL -c "
SELECT \"createdAt\", details
FROM \"AuditLog\"
WHERE action LIKE 'fairness.audit%'
ORDER BY \"createdAt\" DESC LIMIT 10;"

# Step 2 — is the audit loop even running?
kubectl exec -- printenv FAIRNESS_AUDIT_ENABLED
# Expected: 1. If 0, see Incident 19.

# Step 3 — current Gini distribution by surface
psql $DATABASE_URL -c "
SELECT details->>'surface' AS surface,
       (details->>'gini')::float AS gini,
       \"createdAt\"
FROM \"AuditLog\"
WHERE action = 'fairness.audit.run'
  AND \"createdAt\" > NOW() - INTERVAL '7 days'
ORDER BY \"createdAt\" DESC LIMIT 20;"
```

### Likely causes (ranked)

1. **Discover ranker (V8) is over-concentrating on top users.** The fairness-rerank flag (`ALGO_V8_FAIRNESS_RERANK_ENABLED`) may be off, or its rerank window too narrow.
2. **A single high-popularity creator (Riya-class) is monopolizing the Spotlight queue.** Check `SpotlightLedger` for write skew toward one `creatorId`.
3. **Recent feature rollout (e.g., Weekly Top) concentrated traffic.** `FEATURE_WEEKLY_TOP_ENABLED=1` without fairness rerank can boost the same 10k users daily.
4. **Sample bias.** A traffic surge from a single demographic (e.g., a press hit in Mumbai) shifts the population the audit measures over.
5. **Bug in the audit calc** — the Gini estimator is sampling unfairly. Less likely but possible after a worker refactor.

### Fix

```bash
# Cause #1 — turn fairness rerank ON:
kubectl set env deployment/social -n miamo ALGO_V8_FAIRNESS_RERANK_ENABLED=1
kubectl rollout restart deployment/social -n miamo

# Cause #2 — cap a runaway creator manually (temporary):
psql $DATABASE_URL -c "
UPDATE \"SpotlightLedger\"
SET \"dailyCap\" = 100
WHERE \"creatorId\" = '<creator-id>';"

# Cause #3 — turn off Weekly Top temporarily:
kubectl set env deployment/social -n miamo FEATURE_WEEKLY_TOP_ENABLED=0
kubectl rollout restart deployment/social -n miamo

# Force an immediate audit re-run (don't wait 6h):
kubectl exec deployment/tracking-worker -n miamo -- \
  node -e "require('./dist/fairnessAudit').runOnce()"
```

### Verify

```bash
# Wait 1 hour for the next audit tick, then:
psql $DATABASE_URL -c "
SELECT (details->>'gini')::float AS gini, \"createdAt\"
FROM \"AuditLog\"
WHERE action = 'fairness.audit.run'
ORDER BY \"createdAt\" DESC LIMIT 1;"
# Target: gini < 0.4

# Or check the metrics endpoint
curl -s http://localhost:9090/metrics | grep fairness_gini
```

### Prevent next time

- **Pre-rollout fairness simulation** — every new ranker or boost must be run through a Gini simulator on shadow traffic before going live.
- **Weekly fairness report** — a digest emailed to product + reliability, so trends are noticed before they breach the alert threshold.
- **Per-cohort Gini** — measure Gini per (region × age band × intent), not just global. Catches cohort-specific concentration that the global metric averages out.
- **Auto-bound the rerank** — if Gini crosses 0.4 for >12 hours, the worker should automatically increase rerank strength rather than wait for human intervention.

---

## Incident 7 — Local services start but typecheck fails — likely Prisma client out of sync

**Severity: Sev-3 (dev-loop friction), but a Sev-2 trigger for production if the same mismatch ships.**

This is the **Prisma runtime drift** gotcha. Read it; you'll hit it within a week of onboarding.

### What user sees

Nothing — local dev problem. But: you start services, hit the routes manually, everything works. Then `npm run typecheck` fails with errors like:

```
services/social/src/server.ts:412:14 - error TS2322:
  Type '{ spotlightAward: ... }' is not assignable to type '...'.
  Object literal may only specify known properties, and 'spotlightAward' does not exist in type '...'.
```

You stare at the schema. The field IS defined. You re-read `services/shared/prisma/schema.prisma`. It's there. You check `services/social/prisma/schema.prisma`. It's NOT there. **That's the trap.**

### What dashboard shows

N/A — this is a local-only symptom. But if you ship without fixing it:

- Prisma queries at runtime throw `P2009 — Unknown arg 'spotlightAward'` or similar.
- The runtime client is stale; the type-checker has been (correctly) telling you that for hours.

### First check

```bash
# Step 1 — which schema has the field?
grep -n "spotlightAward" services/shared/prisma/schema.prisma
grep -n "spotlightAward" services/social/prisma/schema.prisma
grep -n "spotlightAward" services/content/prisma/schema.prisma
grep -n "spotlightAward" services/users/prisma/schema.prisma

# Step 2 — when was the prisma client last generated?
ls -la services/shared/node_modules/.prisma/client/index.d.ts
ls -la services/shared/node_modules/@prisma/client/index.d.ts

# Step 3 — does the generated client know about the field?
grep -n "spotlightAward" services/shared/node_modules/.prisma/client/index.d.ts | head -5
```

### Likely causes (ranked)

1. **Prisma client not regenerated after schema change.** You edited `services/shared/prisma/schema.prisma`, didn't run `prisma generate`. Most common.
2. **Schema mirror drift.** You edited `services/shared/prisma/schema.prisma` but a per-service mirror (`services/social/prisma/schema.prisma`) is stale. (Doesn't affect runtime — services load the shared client — but can confuse IDE / typecheck tooling configured to read the local schema.)
3. **You generated, but didn't restart services.** Long-running `tsx watch` processes have the old client in memory. New client on disk, old client in RAM.
4. **Node_modules is corrupted / partial install.** `node_modules/.prisma/client` is missing files. Rare; usually after an interrupted `npm install`.
5. **Migration applied to DB but not committed.** You ran `prisma migrate dev`; the migration file exists locally; the schema.prisma file matches. But the migration files folder has a newer state than the schema.prisma. Reverse drift.

### Fix

```bash
# Standard recovery — the four-step Prisma dance:
cd services/shared
npx prisma generate                                  # 1. regenerate client
cd ../..
bash scripts/start.sh local stop            # 2. stop all tsx-watch processes
bash scripts/start.sh local dev           # 3. restart
node scripts/typecheck.mjs                           # 4. verify typecheck passes

# If a per-service mirror schema is out of sync, sync it:
cp services/shared/prisma/schema.prisma services/social/prisma/schema.prisma
cp services/shared/prisma/schema.prisma services/content/prisma/schema.prisma
cp services/shared/prisma/schema.prisma services/users/prisma/schema.prisma

# If node_modules looks corrupted:
rm -rf services/shared/node_modules/.prisma services/shared/node_modules/@prisma/client
cd services/shared && npm install && npx prisma generate

# If migrations are out of sync with schema:
cd services/shared
npx prisma migrate dev   # this'll prompt you to create a migration for the diff
```

### Verify

```bash
node scripts/typecheck.mjs
# Expected: all 11 packages pass

# Sanity check the runtime
curl http://localhost:3203/health
# Expected: 200, no Prisma init errors in logs
```

### Prevent next time

- **Pre-commit hook** that runs `prisma generate` if `services/shared/prisma/schema.prisma` is staged.
- **CI step** that verifies per-service mirror schemas match the shared schema byte-for-byte. Fail the build on drift.
- **Document the four-step dance in CONTRIBUTING.md.** Every new dev should encounter it once, with documentation.
- **Single schema, no mirrors.** Long-term, eliminate the per-service mirror schemas; they're a known footgun. Tracked in v3.7 work.
- **Tsx-watch should re-import the prisma client on schema change.** Not currently possible cleanly; revisit.

---

## Incident 8 — Postgres at 100% CPU

**Severity: Sev-1.** Every API path goes through Postgres. CPU at 100% = everything is slow = everything is broken.

### What user sees

Priya opens the app. Discover loader spins for 8 seconds, then shows the cards. She swipes one. The swipe seems to lag. She opens chat. The chat list takes 6 seconds. She closes the app.

Arjun, mid-signup, sees the OTP page time out. He retries 3 times. He gives up.

Across the population, every latency-p99 panel is red. APIs that normally take 50ms take 5s. Some take 30s. Some return 504 (Bad Gateway timeout from gateway).

### What dashboard shows

- `postgres_cpu_percent` Grafana panel: pinned at 100%.
- `postgres_active_connections` panel: spiking toward max_connections.
- `postgres_long_running_queries` panel: queries running >10 sec.
- All service-level p99 latency panels: red.
- PagerDuty: **"Postgres CPU > 90% sustained 2m"** — Sev-1 page.

### First check

```bash
# Step 1 — find the slow queries
psql $DATABASE_URL -c "
SELECT pid, now() - query_start AS duration, state, left(query, 100) AS q
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC NULLS LAST
LIMIT 20;"

# Step 2 — connection count
psql $DATABASE_URL -c "
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;"

# Step 3 — locks
psql $DATABASE_URL -c "
SELECT pid, mode, relation::regclass, granted
FROM pg_locks
WHERE NOT granted
LIMIT 20;"

# Step 4 — quick health
psql $DATABASE_URL -c "SELECT version(), current_database(), pg_size_pretty(pg_database_size(current_database()));"
```

### Likely causes (ranked)

1. **An N+1 query loop.** Code fetches 1000 users, then for each user fetches their matches. 1001 queries instead of 1. Usually after a refactor that broke the eager-loading.
2. **A new query without an index.** A search route gets popular; the underlying query scans the entire User table.
3. **Idle-in-transaction connections.** A service forgot to commit/rollback. Connections held; pool exhausted; new requests block.
4. **Bad query plan after stats drift.** Postgres optimizer chose a bad plan because table stats are stale. `ANALYZE` helps.
5. **A recent deploy introduced a regression.** Always check git log.

### Fix

```bash
# Cancel a specific slow query (gentle)
psql $DATABASE_URL -c "SELECT pg_cancel_backend(<pid>);"

# Force-kill if cancel doesn't work in 5 sec
psql $DATABASE_URL -c "SELECT pg_terminate_backend(<pid>);"

# Kill all queries running > 30 sec (heavy-handed; use only if CPU still pinned):
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > INTERVAL '30 seconds';"

# Add a statement_timeout so a runaway query can't pin CPU again
psql $DATABASE_URL -c "ALTER SYSTEM SET statement_timeout = '5s';"
psql $DATABASE_URL -c "SELECT pg_reload_conf();"

# If idle-in-transaction (cause #3), kill them
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND now() - state_change > INTERVAL '5 minutes';"

# If a recent deploy is suspect, rollback the implicated service
kubectl rollout undo deployment/<service> -n miamo

# Long-term: add the missing index
# (EXPLAIN ANALYZE the slow query first to confirm)
psql $DATABASE_URL -c "EXPLAIN ANALYZE <the-slow-query>;"
```

### Verify

```bash
# CPU should drop within 30 sec
# (Check Grafana panel; or via psql:)
psql $DATABASE_URL -c "
SELECT count(*) AS active_queries
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > INTERVAL '5 seconds';"
# Expected: 0 or near-zero
```

### Prevent next time

- **`statement_timeout = '5s'` in postgresql.conf** as a baseline. Set higher only for known long jobs.
- **EXPLAIN ANALYZE in every PR that adds a new query** — paste the plan in the PR description. Reviewer checks for `Seq Scan` on tables >100k rows.
- **Slow-query log** — log every query >1 sec. Weekly review.
- **N+1 detection** — Prisma's `__internal.engine.activeProvider` lets us log query counts per request. Anything >20 queries per request is a code smell; investigate.
- **Connection pooling** via PgBouncer (already on it) with `pool_mode = transaction`. Limit per-service connection counts so one service can't starve the others.

---

## Incident 9 — Redis memory at 95%

**Severity: Sev-2.** Redis hosts the tracking stream, rate-limit keys, session cache, and various TTL'd caches. At 95%, the next `XADD` may fail; rate-limits may stop tracking; caches may evict before TTL.

### What user sees

Mostly nothing acute — but creeping degradation. Discover feels less personalized (rate-limit cache flushed). A few users get spurious "Too many requests" responses (rate-limit keys partially evicted). Tracking events may be silently dropped (see Critical Gotcha #3).

### What dashboard shows

- `redis_used_memory_bytes / redis_maxmemory_bytes` Grafana panel: >95%.
- `redis_evicted_keys_total` rate: increasing.
- PagerDuty: **"Redis memory > 90%"** at 90% (warn), **"Redis memory > 95%"** at 95% (page).

### First check

```bash
# Step 1 — current memory
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human|mem_fragmentation_ratio"

# Step 2 — biggest keys
redis-cli --bigkeys
# Output: top key by type with size

# Step 3 — is the stream bloated? (see Incident 3)
redis-cli XLEN events:raw

# Step 4 — count keys by pattern
for pattern in "sender-voice:*" "rate-limit:*" "session:*" "sse:*" "cache:*"; do
  cnt=$(redis-cli --scan --pattern "$pattern" | wc -l)
  echo "$pattern : $cnt keys"
done
```

### Likely causes (ranked)

1. **`events:raw` stream uncapped or growing.** See Incident 3. The stream is the most common runaway.
2. **A cache pattern without TTL.** Someone added `SET key value` without `EX 3600`. Keys accumulate forever.
3. **Rate-limit keys piling up.** Rare since they auto-expire, but if the TTL was set too long (e.g., 7 days) on a high-cardinality key.
4. **`sender-voice:*` cache without TTL.** Move v2 caches sender fingerprints; if TTL was forgotten, every user-ever ends up cached.
5. **Memory fragmentation.** `mem_fragmentation_ratio` > 1.5 means Redis is holding more pages than it needs. A graceful `MEMORY PURGE` or restart fixes it.

### Fix

```bash
# If stream is bloated (cause #1), trim it
redis-cli XTRIM events:raw MAXLEN 100000

# Find and delete the biggest unowned key
redis-cli --bigkeys | head -20
# Pick the offender and delete
redis-cli DEL <key>

# Find keys without TTL on a suspected pattern
redis-cli --scan --pattern "sender-voice:*" \
  | while read -r k; do
      ttl=$(redis-cli TTL "$k")
      [ "$ttl" = "-1" ] && echo "NO TTL: $k"
    done | head -50

# Mass-set TTL on a pattern (use cautiously — TTL=24h here)
redis-cli --scan --pattern "sender-voice:*" \
  | while read -r k; do
      redis-cli TTL "$k" | grep -q "^-1$" && redis-cli EXPIRE "$k" 86400
    done

# Fragmentation cleanup
redis-cli MEMORY PURGE

# Nuclear option (DANGER — wipes EVERYTHING)
# redis-cli FLUSHALL
# Don't do this in prod unless you've evacuated rate-limit / session / stream state
```

### Verify

```bash
redis-cli INFO memory | grep used_memory_human
# Target: <70%

# Stream and bigkey re-check
redis-cli XLEN events:raw
redis-cli --bigkeys | head -10
```

### Prevent next time

- **`MAXLEN ~100000` on every XADD** — already in code; verify the `~` (approximate) is there.
- **Audit all `SET` commands for TTL.** A grep over the codebase for `redis.set(` without an `EX`/`PX` option is a quick win.
- **Alert at 80%, page at 90%.** Currently page at 95% — too late.
- **Memory budget per key pattern** — define how many keys × max size for each pattern; monitor.
- **Eviction policy `allkeys-lru` rather than `noeviction`** — at least we degrade gracefully under pressure.

---

## Incident 10 — Single user login fails repeatedly — check Otp table for stale codes

**Severity: Sev-3 unless it's a power user or a celebrity.** One user can't log in is a support ticket; 10 users can't log in is an outage.

### What user sees

Arjun signs up. He enters his phone number, taps "Send OTP." He gets the SMS, enters the code. The app says "Invalid OTP." He requests another. Gets the new SMS. Enters it. "Invalid OTP." He gives up.

The pattern: every OTP he enters fails. Or: the first works, but on a re-login attempt 10 minutes later, every OTP fails.

### What dashboard shows

- A single user's `auth_otp_verify_fail_total{user_id=...}` metric climbing.
- Support ticket tagged `auth / otp / login`.
- No global anomaly — this is one user.

### First check

```bash
# Step 1 — find the user
psql $DATABASE_URL -c "
SELECT id, email, phone, \"emailVerified\", \"phoneVerified\", \"deletedAt\"
FROM \"User\"
WHERE phone = '<phone>' OR email = '<email>';"

# Step 2 — recent OTP rows for that user
psql $DATABASE_URL -c "
SELECT id, channel, codeHash, \"createdAt\", \"expiresAt\", \"consumedAt\", attempts
FROM \"Otp\"
WHERE \"userId\" = '<user-id>' OR phone = '<phone>'
ORDER BY \"createdAt\" DESC
LIMIT 10;"

# Step 3 — auth service logs for that user (last hour)
kubectl logs -l app=auth -n miamo --since=1h | grep "<phone-or-uid>"
```

### Likely causes (ranked)

1. **Stale unconsumed OTPs.** Multiple OTP rows exist with `consumedAt IS NULL`; the auth code matches against the latest, but the user is entering an older one (from a previous SMS that was delayed). Common when SMS provider has delays.
2. **OTP entered after expiry.** Default expiry is 10 min; user took longer.
3. **Attempts cap exceeded.** Otp table has an `attempts` counter; after 5 wrong entries the row is locked. User keeps trying; every entry fails regardless of correctness.
4. **Phone number normalization mismatch.** User signed up with `+91 98...`; OTP send normalized to `+9198...` (no space); verify lookup normalizes differently. Result: never finds the OTP.
5. **Rate limit on OTP send/verify.** User hit the limit; auth returns "Invalid OTP" generically rather than leaking the rate-limit reason.
6. **Bot / abuse pattern flagged the user.** AuditLog has a `user.flagged` row; auth path short-circuits.

### Fix

```bash
# Quick fix — manually issue a fresh OTP and tell the user the code (over a trusted channel):
psql $DATABASE_URL -c "
INSERT INTO \"Otp\" (id, \"userId\", phone, channel, \"codeHash\", \"expiresAt\", \"createdAt\")
VALUES (gen_random_uuid(),
        '<user-id>', '<phone>', 'sms',
        encode(digest('123456', 'sha256'), 'hex'),
        NOW() + INTERVAL '15 minutes',
        NOW());"
# Then tell the user "use 123456 in the next 15 minutes" via support channel.

# Better: clear stale OTPs and let the user request a fresh one
psql $DATABASE_URL -c "
UPDATE \"Otp\" SET \"consumedAt\" = NOW()
WHERE \"userId\" = '<user-id>' AND \"consumedAt\" IS NULL;"

# If attempts cap is the issue (cause #3), reset
psql $DATABASE_URL -c "UPDATE \"Otp\" SET attempts = 0 WHERE \"userId\" = '<user-id>';"

# If rate-limited (cause #5), clear the rate-limit key
redis-cli DEL "rate-limit:otp:send:<phone>"
redis-cli DEL "rate-limit:otp:verify:<phone>"

# Then have user request a new OTP via the normal flow.
```

### Verify

```bash
# Tail auth logs while user retries
kubectl logs -f -l app=auth -n miamo | grep "<phone>"
# Expected: a single "otp.verify.success" entry
```

### Prevent next time

- **Always issue at most ONE active OTP per user/channel.** When sending a new one, mark all prior unconsumed OTPs as consumed/expired in the same transaction.
- **Normalize phone numbers consistently** at both `send` and `verify` — single helper, used by both sides.
- **Distinguish "wrong code" from "rate limited" in the response code** (without leaking which is which to the user). On dashboards, distinguish 401-wrong-code from 429-rate-limited so we know which is happening.
- **Auto-expire OTPs in a database constraint** — a periodic worker that hard-deletes rows where `expiresAt < NOW() - INTERVAL '1 hour'`.
- **Self-service password / OTP reset** — let users escape the trap without a support ticket.

---

## Incident 11 — Tests pass locally, fail in CI

**Severity: Sev-3.** Doesn't block users, but blocks every developer.

### What user sees

Nothing — dev / CI symptom. But every PR turns red after merge to main, releases stall, devs frustrated, the team's velocity drops.

### What dashboard shows

- GitHub Actions: most PRs / main branch runs red.
- Test names that fail differ between runs (flaky pattern) or are stable (deterministic CI-only failure).
- CI duration may also balloon.

### First check

```bash
# Step 1 — rerun the failing job once. Is it flaky?
# (Use the GitHub UI "Re-run failed jobs" button.)

# Step 2 — diff CI env vs local env
# Find the .github/workflows/*.yml file for the failing job; read the env block.

# Step 3 — Node version
node --version           # local
# vs
grep "node-version" .github/workflows/*.yml

# Step 4 — Postgres image version
grep -E "postgres:" docker-compose.yml .github/workflows/*.yml
```

### Likely causes (ranked)

1. **Flaky test** — passes 95% of the time, fails 5%. Often async ordering, race condition, or a time-dependent assertion (`expect(...).toEqual(new Date())`).
2. **Node version mismatch.** Local on Node 20, CI on Node 22. New behavior (esp. fetch, AbortController, crypto) differs.
3. **CI's Postgres image updated and changed defaults.** Postgres 16 → 17 changed default `password_encryption`, or some other migration setting.
4. **Dependency drift.** A transitive dep updated; `package-lock.json` not committed (or committed but ignored by CI's `npm ci`).
5. **Hidden CI-only env var** that local doesn't have, OR vice versa (local has a var that masks the bug).
6. **Test ordering.** Local runs `--reporter=default`, CI runs with `--maxWorkers=1`; some tests rely on parallel ordering.

### Fix

```bash
# Reproduce CI locally with exact env
docker run --rm -it -v "$PWD:/app" -w /app node:20-alpine sh -c "
  apk add --no-cache python3 make g++ postgresql-client
  npm ci
  CI=true npm test
"

# Pin the Docker image to a SHA in CI workflow (not a floating tag)
# In .github/workflows/test.yml:
#   image: postgres:16-alpine@sha256:abcd1234...
# (Get the SHA via: docker inspect postgres:16-alpine --format='{{.Id}}')

# Pin Node version in package.json engines
# "engines": { "node": "20.x" }
# and use `actions/setup-node@v4` with `node-version-file: package.json`

# For flaky tests — quarantine, don't disable the suite
# Mark with it.skip and open ticket
# Don't tolerate a test that fails >1% of the time; fix or delete it
```

### Verify

```bash
# Rerun the same job 5 times — must pass all 5
# Use GitHub CLI:
gh workflow run test.yml --ref <branch>
# Or just push 5 empty commits in a sandbox branch
```

### Prevent next time

- **Pin every Docker image to a SHA**, not a tag (tags float).
- **Pin Node version** via `engines` in package.json + `setup-node` with `node-version-file`.
- **Use `npm ci`** in CI, never `npm install`. Forces lockfile fidelity.
- **Quarantine flaky tests immediately.** A test failing >1% of the time gets `.skip` with a linked issue. Never leave it in the suite to gaslight future devs.
- **Run CI on PRs against `main`** with a required-status-check. No merge if CI red.
- **Local-CI parity script** — `scripts/ci-local.sh` that runs the EXACT CI command set in a clean container. Makes "works on my machine" debuggable.

---

## Incident 12 — New env var added in code but not in `.env.example`

**Severity: Sev-3 (process bug).** A latent landmine — the next dev who clones the repo and runs locally hits a silent default that bites later.

This is the v3.6.1 sub-issue: code reads `process.env.NEW_FLAG` but `.env.example` has no entry, so devs don't know it exists, prod runs without it, defaults silently kick in.

### What user sees

Initially nothing. Then weeks later: a feature behaves differently in production vs staging because production didn't get the env var set. The bug looks like "feature broken in production" but the root cause is "env var never propagated through Helm/k8s/CI/CD because nobody documented it."

### What dashboard shows

- No direct signal. The downstream incident (broken feature in prod) is what fires.
- In code review, the diff has a `process.env.NEW_FLAG` but no corresponding line in `.env.example`.

### First check

```bash
# Step 1 — list every env var read by the code
grep -rEh "process\.env\.[A-Z_]+" services/ \
  | grep -oE "process\.env\.[A-Z_]+" \
  | sort -u > /tmp/code-envs.txt

# Step 2 — list every var documented in .env.example
grep -E "^[A-Z_]+=" .env.example | cut -d= -f1 | sort -u > /tmp/example-envs.txt

# Step 3 — what's read in code but missing in example?
comm -23 /tmp/code-envs.txt /tmp/example-envs.txt
```

### Likely causes (ranked)

1. **A new feature flag was added but PR author forgot to update `.env.example`.** Most common.
2. **A tunable knob (timeout, batch size) was added without docs.**
3. **A secret was added without docs and without a `${VAR:?required}` guard, so it silently defaults to empty.**
4. **A var was renamed in code but the rename wasn't propagated to `.env.example`.**

### Fix

```bash
# For each missing var, add it to .env.example with:
#   - section header (under the right group)
#   - a comment explaining default + behavior
#   - the safe default value

# Example: if process.env.MOVE_V2_DEADLINE_MS was added without docs,
# open .env.example and add under "Move v2" or "Feature tunables":
#
#   # Move v2 composer deadline (ms). Falls back to v1 if exceeded.
#   MOVE_V2_DEADLINE_MS=1500

# Then verify the file is sorted/grouped consistently and submit a PR.
```

### Verify

```bash
# Re-run the diff
comm -23 /tmp/code-envs.txt /tmp/example-envs.txt
# Expected: empty (or only legitimate runtime-only system vars like NODE_ENV, PATH)
```

### Prevent next time

- **CI check** — `scripts/check-env-coverage.sh` runs on every PR. It diffs `grep -r "process.env.X"` against `.env.example`. Any unlisted var fails the check. The author either adds it to `.env.example` or explains why (e.g., `NODE_ENV` is set by the runtime).
- **PR template checklist** — "Did you add new env vars? If yes, are they in `.env.example`?"
- **CODEOWNERS** on `.env.example` — reliability owns it; review forced when it changes.
- **Helm chart / k8s manifest CI** — verify every var read in code is also in the deployment manifest as a `valueFrom` or default.

---

## Incident 13 — Move v2 returns 0 suggestions consistently → empty sender voice cache

**Severity: Sev-2.** Similar to Incident 4 (high fallback rate) but the specific failure mode is "v2 ran, returned empty list, didn't fall back." Worse UX because the user sees no options at all.

### What user sees

Priya taps "Send a Move." The drawer opens. It shows a loader. The loader resolves to an empty state: "No suggestions available right now. Try again later." She stares. She closes the drawer. She doesn't send anything.

### What dashboard shows

- `move_v2_suggestions_returned_count{count="0"}` rate: spiking. Normally <1%; now 10%+.
- `move_v2_cache_hit_rate{cache="sender_voice"}` panel: dropped to near-zero.
- `move_v2_pipeline_duration_p99` panel: may be elevated (slow path always running).
- Content service logs: `move.v2.empty senderVoice=null`.

### First check

```bash
# Step 1 — sender-voice cache size
redis-cli --scan --pattern "sender-voice:*" | wc -l
# Healthy: 50k+. Cold: <1k.

# Step 2 — pick a known active user's cache key
redis-cli GET "sender-voice:<known-user-id>"
# Expected: a JSON blob. Empty/null = miss.

# Step 3 — was Redis just FLUSHALLed?
redis-cli INFO stats | grep -E "total_keys|expired_keys"
# Recent FLUSHALL evidenced by abrupt drop in total_keys.

# Step 4 — content service warming logs
kubectl logs -l app=content -n miamo --since=1h | grep -iE "senderVoice|cache.warm"
```

### Likely causes (ranked)

1. **Cache cold after Redis restart / FLUSHALL.** Most common. Someone debugged Redis, did a `FLUSHALL`, didn't warm the caches.
2. **Cache TTL too aggressive.** If TTL is 1h and the warmer runs every 6h, gap windows have empty cache.
3. **Cache key format changed** (e.g., from `sender-voice:<uid>` to `sender-voice:v2:<uid>`); old keys never read; new keys never written until warmer runs.
4. **Warmer job not running.** Look for the cache-warming worker / cron; if disabled or crashing, cache is never populated.
5. **The user genuinely has no sender voice signal yet** (new user, <10 messages sent). For new users, v2 should fall through to a cold-start path, not return empty.

### Fix

```bash
# Quick warm — for top-N active users
kubectl exec deployment/content -n miamo -- node -e "
const { warmSenderVoiceCache } = require('./dist/move/senderVoice');
warmSenderVoiceCache({ batchSize: 5000 }).then(n => console.log('warmed', n));
"

# Manually warm a single user (useful for tickets):
kubectl exec deployment/content -n miamo -- node -e "
const { computeSenderVoice, cacheSenderVoice } = require('./dist/move/senderVoice');
computeSenderVoice('<user-id>').then(v => cacheSenderVoice('<user-id>', v));
"

# If the warmer cron is broken, trigger it now and fix the schedule
kubectl get cronjob -n miamo | grep sender-voice
kubectl create job --from=cronjob/sender-voice-warmer -n miamo sender-voice-warm-now

# Bump TTL temporarily (give the warmer time to catch up):
kubectl set env deployment/content -n miamo SENDER_VOICE_CACHE_TTL_SEC=86400
```

### Verify

```bash
# Cache size returning
redis-cli --scan --pattern "sender-voice:*" | wc -l
# Trend: rising

# Empty rate dropping
kubectl logs --since=2m -l app=content -n miamo | grep -c "move.v2.empty"
# Trend: dropping
```

### Prevent next time

- **Cache warm on service start.** When the content service boots, schedule a 30-min background warm of the top-N active users. New deploys don't cold-start.
- **TTL >= 2× warmer interval.** If the warmer runs every 6h, TTL is 12h+. No gap windows.
- **Versioned cache keys** with a fallback chain. New key format reads new-then-old; old data isn't lost on rollout.
- **Cold-start path that doesn't return empty.** If sender voice is missing, return a generic-but-personalized fallback (e.g., from interests + match context), not `[]`.
- **Alert on `sender-voice:*` key count below threshold** (e.g., <10k = page).

---

## Incident 14 — Chat send returns 500 — AES key rotation broke decryption of historical chats

**Severity: Sev-1.** Encrypted messages unreadable = data loss visible to users. Also: anything touching encryption rotation is automatic Sev-1.

### What user sees

Priya opens an old chat with someone she matched 6 months ago. The chat list shows the conversation. She taps in. Every old message shows: `[unable to decrypt]`. She panics.

Worse: when she tries to send a new message, the new message sends, but the server returns 500 (because re-fetching the chat history fails on the same key mismatch). The app retries; the message goes through eventually; UX is broken.

### What dashboard shows

- Sentry: spike in `DecryptionError`, `InvalidAuthenticationTag`, or `WrongTag` errors tagged `service=messaging`.
- `messaging_5xx_rate` panel: spiked.
- A wave of support tickets containing "[unable to decrypt]" or "my old messages are gone."
- The deploy log shows a recent change to `ENCRYPTION_KEY` or `ENCRYPTION_SALT` in the secrets manifest.

### First check

```bash
# Step 1 — is the current ENCRYPTION_KEY the same as last week's?
kubectl get secret miamo-secrets -o jsonpath='{.data.ENCRYPTION_KEY}' | base64 -d > /tmp/current-key
# Compare with last week's backup (Vault, secret manager, sealed-secrets git history)
diff /tmp/current-key /path/to/last-week-key
# Any diff = rotation happened. That's almost certainly the cause.

# Step 2 — recent secret patches
kubectl describe secret miamo-secrets -n miamo | grep -iE "annotation|last-applied"

# Step 3 — messaging service logs
kubectl logs -l app=messaging -n miamo --tail=200 | grep -iE "decrypt|tag|cipher"

# Step 4 — sample a message decryption
kubectl exec deployment/messaging -n miamo -- node -e "
const { decrypt } = require('./dist/crypto');
const msg = '<base64-iv:tag:ciphertext from DB>';
try { console.log(decrypt(msg)); } catch(e) { console.error(e.message); }
"
```

### Likely causes (ranked)

1. **`ENCRYPTION_KEY` was rotated.** Accidentally (by a secret-manager sync), or intentionally without understanding the consequence. AES-GCM ciphertext encrypted with the old key is unreadable with the new key. **This is the dominant cause and is data loss unless the old key is restored.**
2. **`ENCRYPTION_SALT` rotated.** Same effect.
3. **Secret encoding mangled** — base64 padding stripped, or trailing newline added. Key length looks correct but bytes differ.
4. **Wrong key version selected.** If we ever support keyVersion in ciphertext metadata and the lookup is broken, we'd see the same symptom.
5. **A wave of corrupted ciphertexts in DB** (rare; would require a write-side bug). The key is fine; the ciphertext is.

### Fix

```bash
# **IMMEDIATELY** restore the old key from backup (this is the only fix that recovers data)
# Decode old key from your secret manager / Vault into base64
OLD_KEY_B64=$(echo -n '<old-key-utf8>' | base64)
kubectl patch secret miamo-secrets -n miamo \
  -p "{\"data\":{\"ENCRYPTION_KEY\":\"${OLD_KEY_B64}\"}}"

# Same for salt if it rotated
OLD_SALT_B64=$(echo -n '<old-salt>' | base64)
kubectl patch secret miamo-secrets -n miamo \
  -p "{\"data\":{\"ENCRYPTION_SALT\":\"${OLD_SALT_B64}\"}}"

# Restart messaging to pick up the secret
kubectl rollout restart deployment/messaging -n miamo
kubectl rollout status deployment/messaging -n miamo

# Verify old messages decrypt again
# (Pick a user, look at one of their old chats — messages should appear normally)
```

If you cannot recover the old key (it's gone), the only options are:
- Mark affected messages as unrecoverable (still leave the chat row, but the body is permanently `[unable to decrypt]`).
- Communicate transparently to affected users that historical messages are lost.

This is a **non-recoverable data event** if the old key is unrecoverable. Treat as a major incident with executive-level disclosure.

### Verify

```bash
# Decrypt sample succeeds
kubectl exec deployment/messaging -n miamo -- node -e "
const { decrypt } = require('./dist/crypto');
const samples = ['<msg-iv:tag:ct-from-3-months-ago>', '<msg-from-1-week-ago>'];
samples.forEach((m,i) => { try { decrypt(m); console.log(i,'ok'); } catch(e) { console.error(i,e.message); } });
"

# Messaging 5xx rate dropping
curl -s http://prometheus:9090/api/v1/query?query=messaging_5xx_rate | jq '.data.result[0].value[1]'
# Trend: dropping to baseline (~0.1%)
```

### Prevent next time

- **Tag `ENCRYPTION_KEY` and `ENCRYPTION_SALT` as "NEVER ROTATE"** in your secret manager. Add a comment in the secret description.
- **Pre-deploy diff guard** — if the diff between current and new secret values includes any change to these keys, reject the apply with a loud red error. Sample:
  ```bash
  if [ "$OLD_KEY" != "$NEW_KEY" ]; then
    echo "FATAL: ENCRYPTION_KEY changed. This will break decryption of all historical messages."
    echo "If this rotation is intentional, you must run a backfill re-encrypt FIRST."
    exit 1
  fi
  ```
- **Keep a sealed backup of the encryption key in a vault** outside the cluster. If it's lost in k8s, recover from cold storage.
- **Document in runbook (this section, this paragraph): rotating `ENCRYPTION_KEY` = data loss (non-recoverable).** Every on-call must know.
- **Future-proof with keyVersion in ciphertext.** Encrypt with `keyVersion=N`; store `N` in the ciphertext metadata; support reading by version. Then rotation becomes a non-event because old ciphertexts can still be read with old keys until backfill completes.

---

## Incident 15 — SSE connection drops every 30s

**Severity: Sev-2.** SSE is how the app gets push updates without polling. Drops → user perceives missed messages, lag, "did my message send?"

### What user sees

Priya is mid-conversation. She sends "hey." On her phone the message turns from gray (sending) to white (sent). Two seconds later, instead of seeing the read receipt or her match's typing indicator, the bubble flashes "reconnecting…" briefly. Conversation feels janky. Every ~30 seconds.

### What dashboard shows

- `sse_active_connections` Grafana panel: sawtooth pattern — drops to zero every 30s, rebuilds.
- `sse_reconnects_per_minute` panel: high, ~2× per user.
- LB / ingress logs: connections terminated with status 0 or 502 at the load-balancer layer.
- Gateway logs: `sse.client.disconnect` at consistent intervals.

### First check

```bash
# Step 1 — gateway SSE keep-alive logs
kubectl logs -l app=gateway -n miamo --tail=200 | grep -iE "sse|stream|keep-alive"

# Step 2 — LB idle timeout (assuming AWS ALB or nginx-ingress)
kubectl get ingress -n miamo -o yaml | grep -iE "timeout|idle"
# Or for ALB:
# aws elbv2 describe-load-balancer-attributes --load-balancer-arn <arn> | grep idle_timeout

# Step 3 — gateway keep-alive header
curl -i -N "https://api.miamo.app/v1/stream" -H "Authorization: Bearer <token>" \
  -H "Accept: text/event-stream" | head -20
# Look for: Connection: keep-alive
```

### Likely causes (ranked)

1. **LB / ingress idle timeout less than SSE keep-alive interval.** The LB closes any TCP connection idle for 30s. If our SSE sends a keepalive comment every 60s, the LB cuts us off at 30s. Most common cause.
2. **Gateway not sending keep-alive heartbeats.** If the gateway only writes when there's data, idle conversations get cut. Fix: send `: keepalive\n\n` every 15s.
3. **Client-side reconnect bug.** EventSource API auto-reconnects on close; if we have a setInterval forcibly closing every 30s in error, the UX is the same.
4. **Long-polling fallback was enabled** instead of streaming. The "30s" period is the long-poll timeout.
5. **Cloudflare / CDN buffering.** Some CDNs buffer SSE responses (kills the stream). If we put SSE behind a CDN proxy, it'll break unless configured for chunked streaming.

### Fix

```bash
# Cause #1 — increase LB idle timeout to > keep-alive interval (e.g., 120s):
# AWS ALB:
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn <arn> \
  --attributes Key=idle_timeout.timeout_seconds,Value=120

# nginx-ingress: annotation on the Ingress object
kubectl annotate ingress miamo-ingress -n miamo \
  nginx.ingress.kubernetes.io/proxy-read-timeout=120 \
  nginx.ingress.kubernetes.io/proxy-send-timeout=120 --overwrite

# Cause #2 — verify gateway sends heartbeat
# In services/gateway/src/server.ts (or sse handler), confirm:
#   setInterval(() => res.write(': keepalive\n\n'), 15_000)
# If missing, add it.

# Cause #5 — bypass CDN buffering
# Add response header from gateway:
#   X-Accel-Buffering: no
# This tells nginx-style proxies not to buffer.
```

### Verify

```bash
# Open an SSE connection and verify it stays open for 2+ minutes
timeout 130 curl -N "https://api.miamo.app/v1/stream" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: text/event-stream" \
  | tee /tmp/sse.log &
SSE_PID=$!
sleep 130
kill $SSE_PID 2>/dev/null
# Check: did we get keepalives every 15s?
grep -c "keepalive" /tmp/sse.log
# Expected: ~8 keepalives in 130s
```

### Prevent next time

- **LB idle timeout > 2× SSE keep-alive interval.** Pick numbers: LB 120s, keep-alive 30s. Leaves margin for jitter.
- **Heartbeat as comment, not data.** `: keepalive\n\n` doesn't fire an event in the client; data heartbeats can cause spurious UI updates.
- **`X-Accel-Buffering: no` header** in the SSE response. Disables proxy buffering on nginx-derived stacks.
- **Synthetic SSE check every 5 min** that opens a connection and asserts it stays open for 90s.
- **Don't put SSE behind a CDN.** Direct LB → app. CDN buffering will bite eventually.

---

## Incident 16 — Migration applied but Prisma queries fail

**Severity: Sev-2.** A close cousin of Incident 7, but at production scale: the schema is updated, queries crash with `Unknown arg` / `P2009` / `P2025`.

### What user sees

Priya opens Discover. Cards load. She likes one. The like fails with "Something went wrong." She retries. Same error. She opens a chat. Same error. The error is everywhere.

It started 2 minutes ago, right after the deploy notification.

### What dashboard shows

- All service `5xx_rate` panels spiking together starting at deploy time.
- Sentry: wave of `PrismaClientKnownRequestError: P2009` or `P2025` or "Unknown arg `<field>`" — all tagged with the same field/model.
- The deployment that triggered it is the most recent rollout.

### First check

```bash
# Step 1 — what's the error?
kubectl logs -l app=social -n miamo --tail=200 | grep -iE "prisma|P\d{4}"

# Step 2 — what migrations have run vs what's in the schema?
kubectl exec deployment/social -n miamo -- npx prisma migrate status
# Look for: "Database schema is up to date" vs "Drift detected"

# Step 3 — does the runtime client know about the field?
kubectl exec deployment/social -n miamo -- node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
console.log(Object.keys(p.user.fields || {}).slice(0,5));  // sanity
"

# Step 4 — git log on the schema
git log --oneline -10 -- services/shared/prisma/schema.prisma
```

### Likely causes (ranked)

1. **Migration applied to DB but the deployed image has an older Prisma client.** This is the inverse of Incident 7. The DB has the new column; the in-pod client doesn't know about it. Result: writes to the new field fail with `Unknown arg`.
2. **Migration NOT applied but new code expects it.** Reverse: code references the new field; DB doesn't have it; `P2009` / `P2025`.
3. **Migration applied partially** — one table got the new column, a related FK target didn't. Foreign-key violations on insert.
4. **Wrong DATABASE_URL in pod env.** Pod is talking to the wrong database (e.g., the dev DB) where the migration didn't run.

### Fix

```bash
# Cause #1 — redeploy the image (so generate runs again with the new schema)
# Make sure your CI runs `prisma generate` in the build step:
#   npx prisma generate
# Then:
kubectl rollout restart deployment/<service> -n miamo

# Cause #2 — apply the pending migration
kubectl exec deployment/social -n miamo -- npx prisma migrate deploy

# Cause #3 — manual SQL repair (after identifying the partial state)
kubectl exec -it <pg-pod> -- psql $DATABASE_URL
# Then run the rest of the migration SQL manually, then verify with:
\d "<table>"

# Cause #4 — verify DATABASE_URL points at the right DB
kubectl exec deployment/social -n miamo -- printenv DATABASE_URL
```

### Verify

```bash
# Cycle one request through every service that touches Prisma
for svc in social messaging content notifications users; do
  port=$(grep -A1 "$svc:" services/.../ports.txt | tail -1)
  code=$(curl -s -o /dev/null -w "%{http_code}" http://$svc:$port/health)
  echo "$svc: $code"
done

# Re-run the failing operation as a real user
curl -X POST .../v1/like -H "Authorization: Bearer ..." -d '{"target":"..."}'
# Expected: 200
```

### Prevent next time

- **Migrations run BEFORE pods deploy.** Use `Job` or `initContainer` that runs `prisma migrate deploy`; deployment pods only roll out after the job succeeds.
- **`prisma generate` in every CI build step.** Image and migrations must always be in sync.
- **Forward-only, additive migrations.** New columns NULLABLE or with DEFAULTs. Old code keeps working through the deploy. No DROP COLUMN in the same release as the code that stops using it.
- **Pre-deploy migration smoke test on staging.** Apply migration → run typecheck + integration test → only then promote.

---

## Incident 17 — ExposureScheduler writing 0 credits → premium signal not flowing

**Severity: Sev-3.** A worker loop is running but produces no output. No user impact today; the long-term consequence is a broken premium fairness mechanism.

### What user sees

Nothing immediately. Premium users (Priya) expect a small Discover boost as part of their plan; without ExposureScheduler writing credits, the boost never applies. Over weeks, churn from premium creeps up because "I'm not getting what I paid for."

### What dashboard shows

- `exposure_scheduler_credits_written_total` rate: flat zero.
- `exposure_scheduler_tick_total` rate: ticking on schedule.
- Worker logs: `exposureScheduler.tick credits=0 candidates=0`.
- No errors — the loop is healthy, just producing no output.

### First check

```bash
# Step 1 — is the loop enabled?
kubectl exec deployment/tracking-worker -n miamo -- printenv | grep EXPOSURE

# Step 2 — what does the latest tick log show?
kubectl logs -l app=tracking-worker -n miamo --tail=500 | grep -i exposureScheduler | tail -20

# Step 3 — are there premium-eligible users in the lookback window?
psql $DATABASE_URL -c "
SELECT count(*) FROM \"User\" u
JOIN \"Subscription\" s ON s.\"userId\" = u.id
WHERE s.\"status\" = 'active'
  AND s.\"tier\" IN ('premium','plus')
  AND u.\"lastActiveAt\" > NOW() - (INTERVAL '24 hours');"

# Step 4 — is the premium signal source producing data?
psql $DATABASE_URL -c "
SELECT count(*), max(\"createdAt\") FROM \"UserActivity\"
WHERE action = 'subscription.active.daily'
  AND \"createdAt\" > NOW() - INTERVAL '24 hours';"
```

### Likely causes (ranked)

1. **`EXPOSURE_SCHEDULER_ENABLED=0`.** Flag is off. Worker still ticks (because the loop scaffold runs unconditionally) but writes 0. Most common.
2. **Source query returns no rows.** Premium population query is filtering on something that drifted (e.g., `tier='premium'` but Subscription rows now use `'plus'`).
3. **Surface mismatch.** `EXPOSURE_SCHEDULER_SURFACE=discover` but the upstream is producing signals for `feed`. Worker reads from the wrong surface and finds nothing.
4. **Look-back window too short** (`EXPOSURE_SCHEDULER_LOOKBACK_HOURS=24`) and no signal in that window because of a holiday / outage day.
5. **Premium signal feed is broken upstream.** Subscription service stopped emitting `subscription.active.daily` events.

### Fix

```bash
# Cause #1 — turn it on
kubectl set env deployment/tracking-worker -n miamo EXPOSURE_SCHEDULER_ENABLED=1
kubectl rollout restart deployment/tracking-worker -n miamo

# Cause #2 — verify the query manually (read source first)
grep -A 30 "function fetchPremiumCohort" services/tracking-worker/src/exposureScheduler.ts

# Cause #3 — set the right surface
kubectl set env deployment/tracking-worker -n miamo EXPOSURE_SCHEDULER_SURFACE=discover

# Cause #4 — extend lookback window temporarily
kubectl set env deployment/tracking-worker -n miamo EXPOSURE_SCHEDULER_LOOKBACK_HOURS=72

# Cause #5 — investigate upstream subscription emitter
kubectl logs -l app=billing -n miamo --tail=500 | grep -i subscription
```

### Verify

```bash
# Wait one tick interval (default 5 min) then check
kubectl logs --since=10m -l app=tracking-worker -n miamo | grep exposureScheduler
# Expected: "credits=N" where N > 0

# Or check the destination table
psql $DATABASE_URL -c "
SELECT count(*), max(\"createdAt\")
FROM \"ExposureCredit\"
WHERE \"createdAt\" > NOW() - INTERVAL '10 minutes';"
```

### Prevent next time

- **Alert on `credits_written = 0 for 1h` while `enabled=1`.** Catches the silent-zero failure.
- **Worker self-check log** — every loop, log "candidates_found=N, credits_written=M". If N=0 for multiple ticks, that's the alert.
- **End-to-end test** — synthetic premium user → run the loop → assert a credit row was created.
- **Document the surface contract** — what events on what surfaces this loop expects, in code comments at the top of `exposureScheduler.ts`.

---

## Incident 18 — WeeklyTopMatch table empty after Sunday → check stableMatchTop10 worker schedule

**Severity: Sev-3.** Background pipeline. Most users don't see the Weekly Top feature directly; it powers a notification and a banner. Empty = banner missing for the week.

### What user sees

Priya logs in Monday morning. Last week she got a "Your Weekly Top 3 matches" push notification on Sunday evening. This week — nothing. She doesn't notice the absence consciously, but engagement dropped.

### What dashboard shows

- `stable_match_top10_runs_total` counter for the last 7 days: 0 or fewer than expected (default tick = every 10 min, but the heavy job runs once per week typically).
- `WeeklyTopMatch` table count: stuck at last week's number.
- Worker logs: no `stableMatchTop10.run.complete` lines in the last 7+ days.

### First check

```bash
# Step 1 — is the loop enabled?
kubectl exec deployment/tracking-worker -n miamo -- printenv | grep STABLE_MATCH

# Step 2 — recent worker logs
kubectl logs -l app=tracking-worker -n miamo --tail=2000 | grep -iE "stableMatch|weeklyTop"

# Step 3 — last successful run timestamp
psql $DATABASE_URL -c "
SELECT max(\"createdAt\") FROM \"WeeklyTopMatch\";"

# Step 4 — pod restart history (a crash during the heavy run is common)
kubectl get pods -l app=tracking-worker -n miamo -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].restartCount}{"\n"}{end}'
```

### Likely causes (ranked)

1. **`STABLE_MATCH_ENABLED=0`.** Loop flag off. (`.env.example` line 132.)
2. **Worker pod crashed during the heavy weekly run** (OOMKilled). Run takes 5–10 min; if memory is tight, OOM kills it before commit.
3. **The cohort selection is empty** (no users matched the activity windows: `STABLE_MATCH_ACTIVE_WINDOW_DAYS=7`, `MIN_INTERVAL_DAYS=6`). Holiday week, low engagement = no eligible cohort.
4. **Source data missing** — PairCompatCache has no rows for the eligible cohort. Compat loop hasn't run.
5. **Clock skew** — worker pod's UTC differs from the cron expectation; "Sunday" run window missed.

### Fix

```bash
# Cause #1 — enable it
kubectl set env deployment/tracking-worker -n miamo STABLE_MATCH_ENABLED=1
kubectl rollout restart deployment/tracking-worker -n miamo

# Cause #2 — raise memory limit and re-run
kubectl set resources deployment/tracking-worker -n miamo \
  --limits=memory=2Gi --requests=memory=1Gi

# Trigger a one-off run now
kubectl exec deployment/tracking-worker -n miamo -- \
  node -e "require('./dist/stableMatchTop10').runOnce({force:true})"

# Cause #4 — check PairCompatCache freshness
psql $DATABASE_URL -c "
SELECT count(*), max(\"computedAt\") FROM \"PairCompatCache\";"
# If max is stale, the compat loop needs investigation
```

### Verify

```bash
psql $DATABASE_URL -c "
SELECT count(*), max(\"createdAt\")
FROM \"WeeklyTopMatch\"
WHERE \"createdAt\" > NOW() - INTERVAL '24 hours';"
# Expected: count > 0
```

### Prevent next time

- **Alert if `WeeklyTopMatch` has no new rows by Monday 06:00 UTC.** Catches a missed Sunday run.
- **Pod memory headroom for the heavy weekly run.** Size to 2× steady-state.
- **Decouple the heavy run from the high-frequency tick.** A 600s tick that occasionally does heavy work is fragile; a dedicated weekly Job is more observable.
- **Snapshot the eligible-cohort size every tick.** If cohort=0, log loudly so we know it's not a worker failure.

---

## Incident 19 — fairnessAudit not running — AuditLog has no fairness rows

**Severity: Sev-3.** Silent failure of an oversight pipeline. Doesn't impact users; impacts our ability to know if we're being unfair.

### What user sees

Nothing. But: we promise (in our public Trust & Safety docs) that we audit fairness daily; if the audit isn't running, we're lying.

### What dashboard shows

- `AuditLog` table: no rows with `action LIKE 'fairness.audit%'` in the last 24h.
- `fairness_audit_runs_total` counter: flat.
- `FAIRNESS_AUDIT_ENABLED` flag may be off.
- Worker logs: no `fairnessAudit.tick` entries.

### First check

```bash
# Step 1 — recent AuditLog rows
psql $DATABASE_URL -c "
SELECT action, count(*), max(\"createdAt\")
FROM \"AuditLog\"
WHERE action LIKE 'fairness.audit%'
GROUP BY action;"

# Step 2 — flag state
kubectl exec deployment/tracking-worker -n miamo -- printenv | grep FAIRNESS

# Step 3 — worker logs
kubectl logs -l app=tracking-worker -n miamo --tail=2000 | grep -i fairnessAudit

# Step 4 — required env vars present
kubectl exec deployment/tracking-worker -n miamo -- printenv | grep -E "FAIRNESS_AUDIT_(SYSTEM_USER_ID|GINI_ALERT|EVENT)"
```

### Likely causes (ranked)

1. **`FAIRNESS_AUDIT_ENABLED=0`.** Default OFF (`.env.example` line 134). Easy to miss when promoting from staging to prod.
2. **`FAIRNESS_AUDIT_SYSTEM_USER_ID` is empty.** Audit emits events under a system user; if that var is empty, the loop short-circuits at log-write time. (Bug or feature: depends on the worker code.)
3. **Source event (`FAIRNESS_AUDIT_EVENT=card.impression.50`) is no longer emitted** because of a frontend rollback. Worker runs but finds no data.
4. **Worker crashed during audit run and never restarted the loop.** Less likely than 1–3.

### Fix

```bash
# Cause #1 — enable
kubectl set env deployment/tracking-worker -n miamo FAIRNESS_AUDIT_ENABLED=1

# Cause #2 — set system user
# First create a system user if needed (one-time)
psql $DATABASE_URL -c "
INSERT INTO \"User\" (id, email, role, \"createdAt\")
VALUES ('system-fairness-audit', 'system+fairness@miamo.internal', 'system', NOW())
ON CONFLICT DO NOTHING;"

kubectl set env deployment/tracking-worker -n miamo \
  FAIRNESS_AUDIT_SYSTEM_USER_ID=system-fairness-audit

kubectl rollout restart deployment/tracking-worker -n miamo

# Cause #3 — verify the event exists
psql $DATABASE_URL -c "
SELECT count(*) FROM \"UserActivity\"
WHERE action = 'card.impression.50'
  AND \"createdAt\" > NOW() - INTERVAL '24 hours';"
```

### Verify

```bash
# Wait one tick (default 10 min)
sleep 660
psql $DATABASE_URL -c "
SELECT action, \"createdAt\", details
FROM \"AuditLog\"
WHERE action LIKE 'fairness.audit%'
ORDER BY \"createdAt\" DESC LIMIT 5;"
# Expected: a fresh row
```

### Prevent next time

- **Boot-time required-vars assertion.** If `FAIRNESS_AUDIT_ENABLED=1` but `FAIRNESS_AUDIT_SYSTEM_USER_ID` is empty, fail fast with a loud error. Don't silently no-op.
- **Daily AuditLog freshness alert** — if no `fairness.audit.*` row in 24h, page (Sev-3 routing).
- **Promote-to-prod checklist** must include "verify fairness audit is enabled and writing rows."
- **Health endpoint per worker loop** — `/health/workers` returns the last-tick timestamp per loop. Anything stale = alert.

---

## Incident 20 — Build fails in CI on `cd services/web && npm run build` → Next.js config

**Severity: Sev-2.** Blocks every prod deploy. Sometimes also lands on `main` and breaks every PR's CI thereafter.

### What user sees

Nothing — devs feel this. But: if a hotfix is needed and the build is broken, time-to-fix is gated by time-to-fix-the-build.

### What dashboard shows

- GitHub Actions: the `Build web` step red with one of:
  - `Type error: ...` (Next.js compile)
  - `ReferenceError: ...` during prerender
  - `EACCES` or memory errors
  - `Error: Cannot find module 'X'`
- Vercel / hosted-build logs: same.

### First check

```bash
# Step 1 — full build output
cd services/web && npm run build 2>&1 | tail -80

# Step 2 — Next.js version
grep '"next"' services/web/package.json

# Step 3 — recent changes to web/
git log --oneline --since="48 hours" -- services/web/

# Step 4 — typecheck before build
cd services/web && npx tsc --noEmit 2>&1 | head -40
```

### Likely causes (ranked)

1. **Type error in a page or component.** A new code path uses a Prisma field that the client doesn't have (see Incident 7/16). Or a missing prop / wrong type.
2. **Server / client component boundary mistake.** `'use client'` missing on a component that uses browser-only APIs; or a server component imports a client-only library.
3. **Environment variable referenced at build time is missing.** `process.env.NEXT_PUBLIC_X` evaluated during static generation and is empty → prerender throws.
4. **Stale `.next/` cache** + a dependency change. `rm -rf .next` and rebuild fixes it.
5. **OOM on the build runner.** Next 14 build of our app peaks ~4GB; CI runners < 4GB will fail with cryptic errors.

### Fix

```bash
# Step 1 — clean and rebuild locally to reproduce
rm -rf services/web/.next services/web/node_modules
cd services/web && npm ci && npm run build

# Cause #1 — fix the type error (the build log points at the file + line)

# Cause #2 — verify 'use client' directives
grep -L "'use client'" $(grep -rl "useState\|useEffect" services/web/src/app/(main)/**/*.tsx)
# Files in the list that should be client components but aren't marked → add directive

# Cause #3 — ensure NEXT_PUBLIC_* vars are present at build time
# In CI workflow:
#   env:
#     NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}

# Cause #4 — clear cache in CI
# Add to .github/workflows/build.yml:
#   - run: rm -rf services/web/.next
#   - run: cd services/web && npm run build

# Cause #5 — raise runner memory
# Use `runs-on: ubuntu-latest-8gb` or self-hosted with more RAM
```

### Verify

```bash
cd services/web && npm run build
# Expected: success, output ends with "✓ Compiled successfully"

# Smoke run
cd services/web && npm start &
sleep 5
curl -s http://localhost:3100/ | head -1
# Expected: a non-empty HTML response
```

### Prevent next time

- **Typecheck step in CI BEFORE build.** Fails earlier, faster, clearer message than the bundler error.
- **CI build runs on the same Node version as prod.**
- **Snapshot peak memory of the build** and size CI runners with 50% headroom.
- **Lint rule for client/server boundary** — `next-server-only` imports flagged in client components.
- **Pin Next.js minor version.** Next 14.x has had subtle behavior changes between minors.

---

## Incident 21 — Mass logout (all users forced to re-login)

**Severity: Sev-1.** Every user evicted simultaneously.

### What user sees

Priya is mid-conversation. The app flashes the login screen. She enters her credentials. She gets back in. Mid-conversation again, same flash. Same login.

Arjun was logged in for 6 hours, just signed up. He's logged out. He tries to log in; OTP works; he's in for 30 seconds; logged out again.

The pattern: every user, every device, simultaneous.

### What dashboard shows

- `auth_login_attempts_per_min` panel: 10–100× baseline.
- `jwt_verify_fail_total` panel: spike — every authenticated request is rejected.
- Sentry: wave of `JsonWebTokenError: invalid signature`.

### First check

```bash
# Step 1 — JWT_SECRET diff vs last week
kubectl get secret miamo-secrets -n miamo -o jsonpath='{.data.JWT_SECRET}' | base64 -d > /tmp/current-jwt
# Compare with backup
diff /tmp/current-jwt /path/to/backup-jwt

# Step 2 — Auth + gateway env confirmation
for svc in auth gateway; do
  kubectl exec deployment/$svc -n miamo -- printenv | grep JWT_SECRET | head -1
done
# Both must be identical. Mismatch = mass-fail.
```

### Likely causes (ranked)

1. **`JWT_SECRET` rotated** accidentally or by a secret-manager sync.
2. **Auth and gateway have different `JWT_SECRET`** (rolling deploy mid-rotation). Tokens issued by one are rejected by the other.
3. **Clock skew across pods exceeds JWT `exp` window.** Tokens look expired immediately.

### Fix

```bash
# Cause #1 — restore the old secret
OLD_JWT_B64=$(echo -n '<old-secret>' | base64)
kubectl patch secret miamo-secrets -n miamo \
  -p "{\"data\":{\"JWT_SECRET\":\"${OLD_JWT_B64}\"}}"
kubectl rollout restart deployment/auth -n miamo
kubectl rollout restart deployment/gateway -n miamo

# Cause #2 — finish the rollout so both have the new value
kubectl rollout status deployment/auth -n miamo
kubectl rollout status deployment/gateway -n miamo

# Cause #3 — verify NTP on nodes
kubectl get nodes -o wide
# Then on a node: chronyc tracking (or `timedatectl status` on systemd)
```

### Verify

```bash
# Issue a fresh token, verify it
curl -X POST https://api.miamo.app/v1/auth/refresh \
  -H "Authorization: Bearer <existing-refresh-token>"
# Expected: 200 with new access token

# Auth login attempt rate dropping
# (Grafana check)
```

### Prevent next time

- **Treat `JWT_SECRET` like `ENCRYPTION_KEY` — never accidentally rotate.** Pre-deploy diff guard rejects changes unless explicitly approved.
- **Multi-key support** — accept tokens signed by previous-N keys; new logins sign with current. Rotation becomes graceful.
- **Auth + gateway pods deploy atomically.** A canary on auth alone breaks every request signed by it on the still-old gateway.
- **NTP / chrony required healthcheck.**
- **Startup check on auth + gateway** — both compute a hash of `JWT_SECRET` and log it (not the secret itself). If hashes differ between auth and gateway, page.

---

## Incident 22 — Push notifications delayed >1h

**Severity: Sev-2.** Notifications are how users come back. Delays = engagement losses.

### What user sees

Priya matches with someone at 9pm. She doesn't get the "It's a match!" notification until 10pm. By then she's already moved on with her evening. Same delay for messages: a 9pm "hey" arrives in her notification tray at 10pm.

### What dashboard shows

- `notifications_send_lag_p99` panel: rising above 60 sec, sustained.
- `Notification` table query: `count(*) WHERE sentAt IS NULL AND createdAt < NOW() - INTERVAL '5 min'` returning a large number.
- FCM / APNS provider dashboard: elevated latency or error rate.

### First check

```bash
# Step 1 — queue depth
psql $DATABASE_URL -c "
SELECT count(*), min(\"createdAt\"), max(\"createdAt\")
FROM \"Notification\"
WHERE \"sentAt\" IS NULL;"

# Step 2 — service pods healthy?
kubectl get pods -l app=notifications -n miamo
kubectl logs -l app=notifications -n miamo --tail=200 | grep -iE "error|fcm|apns"

# Step 3 — provider availability
# FCM: https://status.firebase.google.com/
# APNS: https://developer.apple.com/system-status/
```

### Likely causes (ranked)

1. **Notifications service crashed / OOM.** Queue grows; nothing drains.
2. **FCM or APNS slow or returning errors.** External provider issue. Notifications service retries; queue piles up.
3. **Queue backlog from an event burst.** A viral match flurry or a re-engagement campaign generated 10× normal volume.
4. **Bad token cleanup.** Many expired device tokens; each send takes longer with retries.
5. **Network egress issue** — pods can't reach FCM endpoints.

### Fix

```bash
# Cause #1 — restart + scale
kubectl rollout restart deployment/notifications -n miamo
kubectl scale deployment/notifications --replicas=5 -n miamo

# Cause #2 — if provider is down, throttle our own retries (don't hammer)
kubectl set env deployment/notifications -n miamo NOTIF_RETRY_DELAY_MS=5000

# Cause #3 — bulk-flush queue with higher concurrency
kubectl set env deployment/notifications -n miamo NOTIF_WORKER_CONCURRENCY=20

# Cause #4 — clean expired tokens periodically
psql $DATABASE_URL -c "
DELETE FROM \"PushDevice\"
WHERE \"lastSeenAt\" < NOW() - INTERVAL '90 days';"
```

### Verify

```bash
# Queue dropping
for i in 1 2 3; do
  psql $DATABASE_URL -tc "
    SELECT count(*) FROM \"Notification\" WHERE \"sentAt\" IS NULL;"
  sleep 60
done
# Trend: decreasing
```

### Prevent next time

- **Alert on `count(*) WHERE sentAt IS NULL AND createdAt < NOW() - INTERVAL '5 min' > 1000`.**
- **HPA on notifications service** based on queue depth.
- **Periodic expired-token cleanup** as a worker (weekly).
- **Provider status webhook → automatic backoff** so a flapping FCM doesn't drown our retry loop.
- **Synthetic notification every 5 min** end-to-end measured.

---

# Quick-reference command bestiary

Copy-paste these. They appear above in context but here they are without commentary.

```bash
# --- Pods ---------------------------------------------------------
kubectl get pods -n miamo
kubectl get pods -l app=social -n miamo
kubectl describe pod <pod-name> -n miamo

# --- Logs ---------------------------------------------------------
kubectl logs -l app=social -n miamo --tail=200
kubectl logs --previous -l app=social -n miamo --tail=100
kubectl logs -f <pod-name> -n miamo

# --- Restart / rollback / scale -----------------------------------
kubectl rollout restart deployment/social -n miamo
kubectl rollout undo deployment/social -n miamo
kubectl rollout status deployment/social -n miamo --timeout=120s
kubectl scale deployment/social --replicas=10 -n miamo
kubectl set env deployment/social -n miamo FEATURE_X=1

# --- Redis --------------------------------------------------------
redis-cli XLEN events:raw
redis-cli XINFO GROUPS events:raw
redis-cli XINFO CONSUMERS events:raw rollup
redis-cli XTRIM events:raw MAXLEN 100000
redis-cli XAUTOCLAIM events:raw rollup tw-recover 60000 0 COUNT 10000
redis-cli INFO memory
redis-cli --bigkeys
redis-cli MEMORY PURGE
redis-cli FLUSHALL                              # ⚠ DANGER: wipes everything

# --- Postgres -----------------------------------------------------
psql $DATABASE_URL -c "SELECT count(*) FROM \"User\";"
psql $DATABASE_URL -c "SELECT version();"
psql $DATABASE_URL -c "
SELECT pid, now()-query_start AS d, state, left(query,80) AS q
FROM pg_stat_activity WHERE state='active' ORDER BY d DESC LIMIT 10;"
psql $DATABASE_URL -c "SELECT pg_cancel_backend(<pid>);"
psql $DATABASE_URL -c "SELECT pg_terminate_backend(<pid>);"
psql $DATABASE_URL -c "ALTER SYSTEM SET statement_timeout = '5s'; SELECT pg_reload_conf();"

# --- Prisma -------------------------------------------------------
cd services/shared && npx prisma generate
cd services/shared && npx prisma migrate status
cd services/shared && npx prisma migrate deploy

# --- Secrets ------------------------------------------------------
kubectl get secret miamo-secrets -n miamo -o jsonpath='{.data.JWT_SECRET}' | base64 -d
kubectl patch secret miamo-secrets -n miamo -p '{"data":{"JWT_SECRET":"<b64>"}}'

# --- Local dev ----------------------------------------------------
bash scripts/start.sh local dev
bash scripts/start.sh local stop
bash scripts/start.sh local status
bash scripts/start.sh local logs <svc>
node scripts/typecheck.mjs
npx vitest run --config vitest.fast.config.ts
```

---

# Postmortem template

Within 24 hours of every Sev-1 or Sev-2 incident, fill this out and file it with the team. Sev-3s only if novel.

```markdown
# Postmortem — <one-line title>

## Metadata
- **Date:** YYYY-MM-DD
- **Severity:** Sev-1 / Sev-2 / Sev-3
- **Duration:** <minutes from detect to resolve>
- **Detected by:** <PagerDuty | user report | proactive check>
- **Author:** <name>
- **Reviewers:** <name> (lead), <name> (service owner)
- **Runbook ref:** Incident #N in docs/RUNBOOK.md

## TL;DR
Two sentences. What broke, what fixed it. Imagine the CEO reading on her phone.

## What happened (user-facing)
Plain English. "Between 14:32 and 14:47 UTC, ~12,000 users saw a 502 error when
opening Discover. After they retried, the request succeeded."

## Timeline (UTC)
- 14:32:00 — Alert fires: `gateway_5xx_rate > 5%`
- 14:33:14 — On-call (Priya) acknowledges; runs `kubectl get pods -l app=social`
- 14:34:50 — Identifies `CrashLoopBackOff` on social
- 14:35:30 — Identifies missing `DATABASE_URL` env var in latest deploy
- 14:36:10 — `kubectl rollout undo deployment/social`
- 14:38:02 — Social pods healthy
- 14:38:30 — Gateway 5xx rate back to baseline
- 14:47:00 — All-clear declared

## Root cause
Five whys. Stop when you hit something architectural, not "a human made a mistake."

1. Discover 502'd because social was down.
2. Social was down because pods CrashLoop'd on startup.
3. Pods crashed because they couldn't connect to Postgres.
4. They couldn't connect because `DATABASE_URL` was not in the new deployment env.
5. It wasn't in the env because the new feature branch added a new env var and
   forgot to add it to the Helm values for prod (see Incident 12).

Architectural root cause: We don't validate that every `process.env.X` in code
has a corresponding entry in the deployment manifest.

## What stopped it
Rollback to previous deployment via `kubectl rollout undo`. Total recovery
time from detect: 6m.

## Impact
- ~12,000 users saw at least one 502 between 14:32–14:38
- ~1,800 of those bounced (didn't retry; lost session)
- 14 support tickets filed
- No data loss; no PII exposure

## What went well
- Alert fired within 60 sec of onset.
- On-call acknowledged in 74 sec.
- Rollback was clean; no manual intervention needed.

## What went poorly
- The bad deploy passed CI. We have no env-var-coverage check.
- The deploy bypassed staging because of an "urgent fix" exemption.

## Action items
| # | Action | Owner | Due | Status |
|---|--------|-------|-----|--------|
| 1 | Add `scripts/check-env-coverage.sh` to CI | Karan | 2026-07-10 | in-progress |
| 2 | Remove "urgent fix" staging-bypass | Riya | 2026-07-01 | done |
| 3 | Add `services/social` deep healthcheck `/health/deep` | Arjun | 2026-07-15 | open |
| 4 | Update RUNBOOK.md Incident 1 with this learning | Priya | 2026-07-01 | done |

## Appendix
- Sentry link: https://sentry.io/...
- Grafana dashboard at time of incident: <link>
- PR that caused: <link>
- PR that fixed: <link>
```

**Rules for postmortems:**

1. **Blameless.** Name people for ownership ("Karan owns the CI fix"), never for blame ("Karan caused this"). Mistakes are systemic.
2. **Action items get assigned and tracked.** "We should add a check" without an owner and due date is fiction.
3. **Update this RUNBOOK** in the action items if you learned something new. The next on-call shouldn't have to relearn.
4. **Read it in the next reliability review.** Trends > individual incidents.

---

# Phone tree / who-to-page

(Replace names with your actual on-call rotation.)

**Sev-1** (app actively down / data loss / PII leak):
1. Page on-call primary (PagerDuty escalation policy `miamo-sev1`)
2. After 5 min if no ack, page secondary
3. After 10 min, page lead (Arpan) + product (Meera)
4. After 15 min, status page update + customer comm template (below)

**Sev-2** (feature degraded):
1. Page on-call primary (PagerDuty `miamo-sev2`)
2. Notify service owner via Slack `#oncall-active`

**Sev-3** (background pipeline / minor):
1. Open a Jira ticket tagged `incident sev-3`
2. Bring up in next standup
3. Owner targets fix within current sprint

---

# Customer communication (Sev-1 only)

For status page + email + in-app banner. Update every 15 min until resolved.

```
Subject: We're investigating a service disruption

We're aware that Miamo may be unavailable or slow right now. Our team is
investigating.

Current status: [investigating / identified root cause / implementing fix]
Expected impact: [X users affected | estimated duration: Y minutes]
Next update: in 15 minutes

We'll keep this page updated. Thank you for your patience.
— Miamo Reliability Team
```

**Do not** speculate about root cause in public until resolved. **Do not** name internal systems. Keep updates short — 2–3 sentences max.

After resolution, a single closing update:

```
This issue is now resolved. Service was restored at HH:MM UTC.

Affected users: <number / percent>
Cause (high level): <one sentence in plain English>

A full postmortem will be published within 5 business days.

Thank you for your patience. — Miamo Reliability Team
```

---

# Appendix A — Worker schedule cheat-sheet

(Distilled from docs/TRACKING.md / docs/ALGORITHMS.md §8. Verify against `.env.example` lines 139–245 for the live tunables. *Needs verification* — confirm production tick intervals against actual deployed values.)

| Worker loop | Default tick | Default lookback | Default batch | Env-var prefix |
|-------------|--------------|------------------|---------------|----------------|
| Intent inference | 30s | 30 min | 200 | `INTENT_INFERENCE_*` |
| Exposure scheduler | 5 min | 24h | 200 | `EXPOSURE_SCHEDULER_*` |
| Stable-match Top-10 | 10 min | 7d active | 200 | `STABLE_MATCH_*` |
| Fairness audit | 10 min | 7d | n/a | `FAIRNESS_AUDIT_*` |
| Compat scorer | 15 min | 200 active | 50 candidates | `COMPAT_*` |
| Enrichment (DTM, peak, cadence) | 30 min | 14d cadence / 7d peak / 90d DTM | n/a | `ENRICH_*` |
| Embedding refresh | 30 min | n/a | 200 | `EMBED_*` |
| Daily-match generator | 12h | 7d | 200 | `DAILY_MATCH_*` |
| Feature aggregator | 5 min | n/a | 200 | `FEATURE_*` |
| Learner loop | 10 min | 1d | 500 | `LEARNER_LOOP_*` |
| Safety rollup | 5 min | 2d | n/a | `SAFETY_ROLLUP_*` |
| First-move outcome | 30 min | 25h | n/a | `FIRST_MOVE_OUTCOME_*` |
| Session summary | 10 min | 26h | n/a | `SESSION_SUMMARY_*` |
| Focus affinity | 5 min | 3h | n/a | `FOCUS_AFFINITY_*` |
| Defer-pile pruner | 6h | n/a | n/a | `DEFER_PRUNE_*` |
| Cold-store archive | 24h | 90d | n/a | `COLD_STORE_*` |

Use the env-var prefix to find both the enable flag and the tunables for any loop.

---

# Appendix B — Feature flag inventory (production-relevant)

(From `.env.example` lines 103–137. All default OFF except where noted.)

| Flag | What it controls | Default | Owning service |
|------|------------------|---------|----------------|
| `ALGO_V8_DISCOVER_RANKER_ENABLED` | Replace V4 scorer with V8 | 0 | social |
| `ALGO_V8_FAIRNESS_RERANK_ENABLED` | Post-rank Gini-floor pass | 0 | social |
| `ALGO_V4_WORKERS_ENABLED` | v4 batch workers | 0 | tracking-worker |
| `ALGO_V5_MESSAGE_SUGGEST_ENABLED` | v5 message suggest | 0 | content |
| `FEATURE_ANTI_GHOST_ENABLED` | Anti-ghost ledger writes | 0 | messaging |
| `FEATURE_DTM_MASK_ENABLED` | DTM identity masking | 0 | content |
| `FEATURE_FAMILY_BRIEF_ENABLED` | Family-brief share | 0 | content |
| `FEATURE_MOVE_V2_ENABLED` | Move v2 composer | 0 | content |
| `FEATURE_VOICE_FINGERPRINT_ENABLED` | Voice fingerprint analytics | 0 | users |
| `FEATURE_WEEKLY_TOP_ENABLED` | Weekly Top match endpoint | 0 | social |
| `FEATURE_WHY_EXPLAINER_ENABLED` | Why-Explainer rationale | 0 | social |
| `INTENT_INFERENCE_ENABLED` | Intent-Right-Now loop | 0 | tracking-worker |
| `EXPOSURE_SCHEDULER_ENABLED` | Exposure scheduler loop | 0 | tracking-worker |
| `STABLE_MATCH_ENABLED` | Stable-match Top-10 | 0 | tracking-worker |
| `FAIRNESS_AUDIT_ENABLED` | Daily fairness audit | 0 | tracking-worker |
| `DISCOVER_PASS_HARDFILTER_ENABLED` | Discover hard-filter pass | **1** | social |
| `TRACKING_KILL` | Master tracking kill switch | 0 | ingest + tracking-worker |

**Convention:** `'1' = on`, anything else (`0`, empty, `false`, etc.) = off. Confirm against reading site if behaviour seems off (see Incident 2).

---

# Appendix C — Service ↔ port quick reference

| Service | Port | Critical incidents to know |
|---------|------|---------------------------|
| Web (Next.js) | 3100 | 20 (build) |
| Gateway | 3200 | 1, 15, 21 |
| Auth | 3201 | 10, 21 |
| Users | 3202 | 10 |
| Social | 3203 | 1, 6, 16, 18 |
| Messaging | 3204 | 2, 14 |
| Content | 3205 | 4, 5, 13 |
| Notifications | 3206 | 22 |
| Ingest | 3260 | 3 |
| Tracking-worker | 3261 | 3, 6, 17, 18, 19 |

---

# Appendix D — When you don't know what to do

1. **Don't panic.** Most "everything is broken" incidents are one service away from "one thing is broken."
2. **Page the lead** if you can't find the symptom in this runbook. False positives are cheap.
3. **Capture state before fixing.** `kubectl get all -n miamo > /tmp/state-$(date +%s).txt` — gives you a snapshot for the postmortem.
4. **Revert before re-engineering.** A clean rollback to last known good > a creative fix in the moment.
5. **Communicate.** A status update with "we're investigating" is better than silence. Internal Slack first, public status page second.
6. **Write the postmortem.** Tomorrow you'll forget the details. Tonight, write them down.

---

# Change log

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 3.0 | 2025-11 | reliability | Initial runbook — 10 incidents |
| 3.5 | 2026-04 | reliability | Creativity v3.5 incidents added |
| 3.6 | 2026-06-25 | reliability | Pair-write rewrite; 20+ incidents; appendices added |

(Update this row whenever you ship a runbook change. Bump minor for new incidents, patch for clarifications.)

---

*End of runbook. If you got here looking for an incident not listed, check the team postmortem archive and add a new section. Numbering is stable — append, don't renumber.*
