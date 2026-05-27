# Runbook

On-call companion. "Service X is wrong → check Y first."

## 1. Health endpoints

| Service | URL | What it tells you |
|---|---|---|
| gateway | `:3200/health` | Full report — gateway + every downstream `/healthz` |
| gateway | `:3200/readyz` | Aggregate ready (4xx if any downstream not ready) |
| auth / users / social / messaging / content / notifications | `:32xx/healthz` | Liveness |
| auth / users / ... | `:32xx/readyz` | Readiness (Prisma connected) |
| ingest | `:3260/v1/track/healthz` | Liveness + kill flag |
| ingest | `:3260/metrics` | Prometheus text |
| tracking-worker | `:3261/healthz` | `{ok, kill, v4Workers, algos: <count>}` |
| tracking-worker | `:3261/v4/status` | Live algo inventory + flags |

## 2. Common incidents

### A. "Discover is slow"

1. `curl :3200/health` — is `social` healthy?
2. `kubectl logs -n miamo deploy/social --tail=200 | grep -i 'slow\|prisma\|timeout'`.
3. Check Postgres slow log (`log_min_duration_statement = 500`).
4. If v4 path is hot: `curl :3261/v4/status | jq '.flags'`. To disable: `kubectl set env deploy/social ALGO_V4_RANK_ENABLED_DISCOVER=0`.
5. Check Redis (`redis-cli info clients`) — rate-limit store overloaded?
6. Last resort: scale social `kubectl scale deploy/social --replicas=6`.

### B. "Chats are not arriving in realtime"

1. SSE is fan-out from `notifications` / `messaging` → gateway → browser.
2. `kubectl logs deploy/gateway --tail=200 | grep SSE` — heartbeats every 25 s expected.
3. Check `/internal/push-event` POSTs from messaging/notifications: `kubectl logs deploy/messaging | grep push-event`.
4. Browsers behind proxies with short idle timeouts may need reconnect — the SDK does this automatically.
5. Hard reset: `kubectl rollout restart deploy/gateway` (drains 30 s grace).

### C. "Tracking-worker lag spike"

1. `redis-cli XPENDING events:raw tw-rollup` — pending count.
2. If > 100k pending: tracking-worker is behind. `kubectl logs deploy/tracking-worker --tail=200`.
3. If a single bad event is poisoning the consumer: `redis-cli XACK events:raw tw-rollup <id>` to skip.
4. Scale safely: tracking-worker is single-replica by design (avoid double aggregation). To scale, ensure consumer-group sharding is enabled in [services/tracking-worker/src/rollup.ts](services/tracking-worker/src/rollup.ts) and bump replicas.
5. Emergency stop ingest while you catch up: `kubectl set env deploy/ingest TRACKING_KILL=1`.

### D. "Login is failing across the board"

1. `kubectl logs deploy/auth --tail=200 | grep -i 'jwt\|bcrypt\|prisma'`.
2. JWT_SECRET rotated incorrectly? — auth still signs new tokens but gateway can't verify. Roll the gateway env back.
3. Postgres `max_connections` exhausted? `psql -c 'SELECT count(*) FROM pg_stat_activity;'` — bump connection pool or scale Postgres.
4. Rate limit too aggressive after a password leak? Inspect Redis: `redis-cli --scan --pattern 'rl:auth:*' | wc -l`.

### E. "Messages won't decrypt"

1. `ENCRYPTION_KEY` or `ENCRYPTION_SALT` rotated? If so → DATA LOSS for historical messages. Roll back immediately.
2. Otherwise: `kubectl logs deploy/messaging --tail=200 | grep -i 'authtag\|decrypt'`.
3. AuthTag failures = ciphertext tampered or wrong key. The handler logs `enc:` failures and falls back to a sanitised placeholder; raw payload preserved.

### F. "Feature flag rollout"

```bash
# Enable v4 discover on staging
kubectl set env -n miamo-staging deploy/social ALGO_V4_RANK_ENABLED_DISCOVER=1
kubectl rollout status deploy/social
# Watch
kubectl logs -n miamo-staging deploy/social --tail=100 -f | grep v4
# Disable instantly
kubectl set env -n miamo-staging deploy/social ALGO_V4_RANK_ENABLED_DISCOVER=0
```

### G. "Rollback"

```bash
kubectl rollout undo deploy/<service>
kubectl rollout history deploy/<service>
```

PDB ensures at least 1 pod stays up. Rolling strategy: `maxUnavailable: 0, maxSurge: 1`.

## 3. Useful one-liners

```bash
# Row counts per table
bash scripts/db-check.sh

# Full API smoke (Bearer token required)
TOKEN=$(curl -s -X POST :3200/api/v1/auth/login \
  -d '{"email":"miamo1@miamo.test","password":"miamo1"}' \
  -H 'content-type: application/json' | jq -r .accessToken)
bash scripts/api-test.sh "$TOKEN"

# Algo smoke (no HTTP — direct invocation)
npx tsx scripts/algo-smoke.ts --limit=5

# Watch the Redis stream
redis-cli XLEN events:raw
redis-cli XPENDING events:raw tw-rollup

# Tail prod logs for a service
kubectl logs -n miamo-prod -l app=social --tail=200 -f

# Force a single feature snapshot recompute (dev)
psql $DATABASE_URL -c "DELETE FROM \"FeatureSnapshot\" WHERE \"uidHash\" = '<hash>';"
# Worker will recreate on next 15-min tick

# GDPR purge a single user's analytics (worker)
cd services/tracking-worker && npm run forget -- --uid <userId>
```

## 4. Dashboards you wish you had

If you set up Grafana with the Prometheus scrape (`/metrics` on ingest + `prom-client` HTTP middleware everywhere else):

- **Latency** — p50/p95/p99 per route per service
- **Error rate** — non-2xx count
- **Stream lag** — `XLEN events:raw - XPENDING events:raw tw-rollup`
- **Algo throughput** — registered count from `/v4/status` polled hourly
- **Redis hit rate** — `redis-cli info stats | grep keyspace_hit_rate`
- **Postgres connections** — `pg_stat_activity` count

## 5. Escalation

- **Data corruption**: stop writes (set `TRACKING_KILL=1` on ingest, scale offending service to 0), take a pg_dump, file an incident.
- **Secret leaked**: rotate `JWT_SECRET` and `INTERNAL_SERVICE_KEY` immediately. **Do not** rotate `ENCRYPTION_KEY`, `ENCRYPTION_SALT`, or `TRACKING_HASH_SECRET` — coordinate a re-encryption / re-keying job.
- **Compromised account**: `POST /api/v1/auth/sessions/:id/revoke` for every session, force password reset, mark profile deactivated.

## 6. What changed & why it's good

- **Before:** Incidents required reading code to know which service owned what; no kill switches; no live algo inventory.
- **After:** One runbook page tells you the first command for the seven most common incidents; `/v4/status` enumerates the rankers in real-time; `TRACKING_KILL=1` shuts the pipeline cleanly.
- **Why it matters:** Mean time to recovery drops because the on-call doesn't need to guess. Bad rollouts are reverted with one `kubectl set env`.
