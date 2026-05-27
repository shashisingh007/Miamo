# Runbook — The 3am on-call playbook

**TL;DR:** When something breaks: look at the symptom, check the first thing, find the cause, fix it, prevent it next time.

---

## How to read this

- **On-call engineer**: This is your playbook. Symptom table → first check → cause → fix.
- **Product manager**: Read "Severity levels" to understand how we classify incidents.
- **Everyone**: The "Prevent next time" items are lessons learned—add them to your process.

---

## Severity levels

| Level | Impact | Examples |
|-------|--------|----------|
| **Sev-1** | 50,000+ users can't use the app | App returns 502 everywhere, database down, gateway crashes |
| **Sev-2** | Feature degraded but app still works | Chat is slow, Discover shows wrong order, notifications delayed by 1 hour |
| **Sev-3** | Minor issue, no urgent fix | Typo on profile page, one user can't log in, image upload slow |

**Sev-1 = wake up everyone. Sev-2 = page the on-call. Sev-3 = ticket, fix in sprint.**

---

## The incidents: symptom → fix

### **Incident 1: App returns 502 everywhere**

**Symptom**: Every request returns "502 Bad Gateway". PagerDuty alert: "Gateway healthy check failed."

**First check**:
```bash
kubectl get pods -l app=gateway -n miamo
kubectl logs -l app=gateway -n miamo --tail=100
```

**What to look for in logs:**
- `Error: Cannot connect to Postgres` → Database is down or unreachable
- `Error: JWT_SECRET not set` → Missing environment variable
- `OOM: Out of memory` → Container out of RAM

**Likely causes:**
1. All gateway pods crashed (all show `CrashLoopBackOff` or `Error`)
2. An env var is missing or wrong (JWT_SECRET, DATABASE_URL, etc.)
3. Database is down or unreachable
4. A bad deploy (code change broke startup)

**Fix**:
```bash
# If it's a recent deploy, rollback immediately
kubectl rollout undo deployment/gateway -n miamo

# Wait for new pods to be healthy
kubectl rollout status deployment/gateway -n miamo

# Check the rollback worked
curl http://gateway:3200/health
# Should return 200 OK
```

**Prevent next time**:
- Staging smoke test before prod deploy (required)
- Env vars declared with `${VAR:?required}` in compose—missing vars fail at compose-up, not in production
- Required health checks on gateway (startup and ongoing)

---

### **Incident 2: Users see "No more profiles" immediately**

**Symptom**: After login, users see "No more profiles" or "Loading..." forever on Discover.

**First check**:
```bash
# Check if social service is running
kubectl get pods -l app=social -n miamo

# Check logs
kubectl logs -l app=social -n miamo --tail=200 | grep -i error

# Check if Postgres is reachable
kubectl get pods -l app=postgres -n miamo
```

**Likely causes:**
1. Social service can't connect to Postgres
2. Postgres is down or out of memory
3. Candidate query is returning 0 results (no profiles in DB)
4. Query is hanging or timing out

**Fix**:
```bash
# Restart the social pods to see if it's a transient connection issue
kubectl rollout restart deployment/social -n miamo

# If that doesn't work, check Postgres health
kubectl logs -l app=postgres -n miamo --tail=50

# If Postgres is up, check the candidate count
kubectl exec -it <postgres-pod> -- psql $DATABASE_URL -c "SELECT count(*) FROM \"User\" WHERE \"onboarded\" = true;"

# If it returns 0, check if the seed script ran
# If it returns a number, the query is hanging—see RUNBOOK incident on Postgres CPU
```

**Prevent next time**:
- Add a `/health/deep` endpoint on social that runs a minimal candidate query (latency alert if > 2 seconds)
- Add a Postgres connection pool alarm (if connections > 80% of max)

---

### **Incident 3: Tracking events not influencing recommendations**

**Symptom**: Users complain the Discover feed isn't adapting to their likes. "I've swiped right 50 times but still see people I already passed."

**First check**:
```bash
# Check if tracking-worker is running
kubectl get pods -l app=tracking-worker -n miamo

# Check Redis stream size (should be < 50k, else backlog)
redis-cli XLEN events:raw

# Check consumer lag
redis-cli XINFO GROUPS events:raw

# Check tracking-worker logs
kubectl logs -l app=tracking-worker -n miamo --tail=200
```

**What to look for:**
- `XLEN events:raw` returns 100k+ → stream is growing, worker is stuck or dead
- Consumer lag > 60 seconds → worker is processing too slowly
- Logs show `Error: OutOfMemory` or `CrashLoopBackOff` → worker crashed

**Likely causes:**
1. Tracking-worker crashed or is stuck
2. Consumer group is stalled (a consumer took the lock and died)
3. Redis is full (see "Redis memory at 95%")
4. Algorithm worker is backlogged

**Fix**:
```bash
# Restart the tracking-worker
kubectl rollout restart deployment/tracking-worker -n miamo

# Wait 30 seconds, check if events:raw is shrinking
redis-cli XLEN events:raw
# Should start decreasing every 10 seconds

# If it's still growing, check if a consumer is stuck
redis-cli XINFO GROUPS events:raw
# Look for consumers with no activity for > 60 seconds

# If stuck, remove the stalled consumer
redis-cli XGROUP DELCONSUMER events:raw tw-rollup <consumer-name>

# Worker will create a new consumer and resume
```

**Prevent next time**:
- Alert if `XLEN events:raw > 100k` (stream growing)
- Alert if consumer lag > 60 seconds (worker is slow)
- Alert if 15-min rollup is not updating (algorithm worker is dead)

---

### **Incident 4: Messages showing "[unable to decrypt]"**

**Symptom**: Users open old chats and see "This message couldn't be decrypted." Priya panics.

**First check**:
```bash
# Check if ENCRYPTION_KEY and ENCRYPTION_SALT changed
kubectl get secret miamo-secrets -o jsonpath='{.data.ENCRYPTION_KEY}' | base64 -d
kubectl get secret miamo-secrets -o jsonpath='{.data.ENCRYPTION_SALT}' | base64 -d

# Compare with the backup (your secret manager, Vault, etc.)
```

**Likely causes:**
1. `ENCRYPTION_KEY` or `ENCRYPTION_SALT` was rotated (by accident)
2. Secret is corrupted or has wrong encoding
3. Messaging service upgraded but old messages weren't backfilled

**Fix**:
```bash
# **IMMEDIATELY** restore the old keys from backup
kubectl patch secret miamo-secrets -p '{"data":{"ENCRYPTION_KEY":"<old-key-base64>"}}'

# Wait for messaging pods to restart (or manually restart)
kubectl rollout restart deployment/messaging -n miamo

# Test: decrypt should work now
# Users' old messages will reappear
```

**Prevent next time**:
- **Tag these secrets "NEVER ROTATE" in your secret manager.**
- Add a pre-deploy hook that diffs secrets:
  ```bash
  # If ENCRYPTION_KEY changed, reject the deploy
  if [ "$OLD_KEY" != "$NEW_KEY" ]; then
    echo "ERROR: ENCRYPTION_KEY changed. This will break decryption."
    exit 1
  fi
  ```
- Document in runbook: rotating ENCRYPTION_KEY = data loss (non-recoverable)

---

### **Incident 5: Mass logout (all users forced to re-login)**

**Symptom**: Every user is kicked out at the same time. Millions see "Please log in again."

**First check**:
```bash
# Check if JWT_SECRET changed
kubectl get secret miamo-secrets -o jsonpath='{.data.JWT_SECRET}' | base64 -d
# Compare with recent secret change logs
```

**Likely causes:**
1. `JWT_SECRET` was rotated (accidentally or intentionally)
2. Auth pod is running with an old secret version
3. Load balancer is routing to two different secret versions

**Fix**:
```bash
# If JWT_SECRET was rotated accidentally, restore the old one immediately
kubectl patch secret miamo-secrets -p '{"data":{"JWT_SECRET":"<old-secret-base64>"}}'

# Restart auth and gateway pods to pick up the old secret
kubectl rollout restart deployment/auth -n miamo
kubectl rollout restart deployment/gateway -n miamo

# Users' existing sessions will work again
# Users with expired tokens will re-login (harmless)
```

**Prevent next time**:
- JWT secret rotations are **intentional and announced** (not accidental)
- Add a startup check on auth service:
  ```ts
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error("FATAL: JWT_SECRET too short or not set");
    process.exit(1);
  }
  ```
- Tag secret change in deploy notes: "JWT rotated" (so ops knows it's intentional)

---

### **Incident 6: Push notifications delayed by 1+ hour**

**Symptom**: "I matched with someone at 9pm but didn't get the notification until 10pm."

**First check**:
```bash
# Check if notifications service is running
kubectl get pods -l app=notifications -n miamo

# Check logs for errors
kubectl logs -l app=notifications -n miamo --tail=200 | grep -i error

# Check the queue
psql $DATABASE_URL -c "SELECT count(*), min(\"createdAt\"), max(\"createdAt\") FROM \"Notification\" WHERE \"sentAt\" IS NULL;"
```

**Likely causes:**
1. Notifications service crashed
2. Push provider (FCM / APNS) is down or rejecting requests
3. Queue is backlogged (notifications being created faster than sent)
4. Network issue sending to push provider

**Fix**:
```bash
# Restart notifications pods
kubectl rollout restart deployment/notifications -n miamo

# Check if it catches up in 5 minutes
# If queue keeps growing, scale up temporarily
kubectl scale deployment/notifications --replicas=5 -n miamo

# Monitor the queue
psql $DATABASE_URL -c "SELECT count(*) FROM \"Notification\" WHERE \"sentAt\" IS NULL;"
# Should be 0 within 30 minutes

# Check push provider status (FCM console, APNS dashboard)
```

**Prevent next time**:
- Alert if `Notification.sentAt IS NULL and createdAt < now() - 5min` (old unsent notifications)
- Alert if FCM / APNS response time > 500ms
- Add a `/health/deep` endpoint that sends a test notification

---

### **Incident 7: Postgres CPU pinned at 100%**

**Symptom**: All APIs are slow. Grafana shows Postgres CPU at 100%. Every request times out.

**First check**:
```bash
# SSH into Postgres pod
kubectl exec -it <postgres-pod> -- psql

# See what queries are running
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start ASC
LIMIT 20;

# Look for:
# - Queries running for > 10 seconds (slow)
# - Full table scans (query missing an index)
# - "idle in transaction" (connection not released)
```

**Likely causes:**
1. A query without an index (full table scan of 10M rows)
2. An N+1 query loop (code fetches 1000 users, then for each user fetches their matches—1001 queries instead of 1)
3. Query planning took too long (optimizer trying 10000 plans)
4. A recent deploy introduced a regression

**Fix**:
```bash
# Kill the slow query (don't force-kill, just ask it to stop)
SELECT pg_cancel_backend(<pid>);

# If it doesn't stop in 5 seconds, force-kill it
SELECT pg_terminate_backend(<pid>);

# Check if CPU drops
# If it does, investigate which query it was

# Add a statement_timeout so it doesn't happen again
ALTER SYSTEM SET statement_timeout = '5s';
SELECT pg_reload_conf();
```

**Prevent next time**:
- In PR review: run `EXPLAIN ANALYZE` on every new query. It shows if the query uses an index.
- Set `statement_timeout = '5s'` so a runaway query can't pin CPU for hours
- Add a slow-query log (log queries > 1 second) and review weekly

---

### **Incident 8: Redis memory at 95%**

**Symptom**: Redis is full. Services can't write cache or rate-limit keys. Calls fail.

**First check**:
```bash
# Check Redis memory
redis-cli INFO memory | grep used_memory_human
# e.g., used_memory_human: 9.5G

# See what's taking up space
redis-cli --bigkeys
# Output: largest keys by type

# Check the events:raw stream size
redis-cli XLEN events:raw
# If > 100k, the stream is growing (tracking-worker dead)
```

**Likely causes:**
1. `events:raw` stream is uncapped and growing (tracking-worker is dead—see incident 3)
2. A cache key without a TTL (forgotten `EXPIRE`)
3. Rate-limit keys are piling up (but they auto-expire, so shouldn't happen)

**Fix**:
```bash
# Trim the stream to a reasonable size
redis-cli XTRIM events:raw MAXLEN 100000
# This removes old events, keeping the newest 100k

# Check memory again
redis-cli INFO memory | grep used_memory_human

# If it's still high, find the big keys
redis-cli --bigkeys | head -20

# Delete a big key if it's not needed
redis-cli DEL <key-name>

# After fixing, restart tracking-worker (see incident 3)
```

**Prevent next time**:
- Always set `MAXLEN ~100000` on `XADD` (prevents unbounded growth)
- Audit all `SET` commands for a TTL (e.g., `SET key value EX 3600`)
- Alert if Redis memory > 80%

---

### **Incident 9: One user can't log in**

**Symptom**: Support ticket: "I can't log in. 'Email or password incorrect.'"

**First check**:
```bash
# Check if the user exists
psql $DATABASE_URL -c "SELECT id, email, \"emailVerified\", \"deletedAt\" FROM \"User\" WHERE email = 'priya@example.com';"

# Check if they have any sessions
psql $DATABASE_URL -c "SELECT id, \"expiresAt\", \"createdAt\" FROM \"Session\" WHERE \"userId\" = '<user-id>' ORDER BY \"createdAt\" DESC LIMIT 5;"
```

**What to look for:**
- User doesn't exist → email is wrong, or account was deleted
- `emailVerified = false` → they need to verify their email
- `deletedAt IS NOT NULL` → account is soft-deleted (we don't show it to them)
- Sessions exist but all expired → normal, they just need to re-login

**Likely causes:**
1. Email typo (they typed the wrong email)
2. Email not verified (they haven't clicked the link)
3. Account soft-deleted (they deleted it, can't reactivate without support)
4. Password changed recently (and they forgot the new one)

**Fix**:
```bash
# If email not verified, send a new verification link
UPDATE "User" SET "emailVerified" = false WHERE id = '<user-id>';
# Then trigger resend of verification email (manual email or API call)

# If account soft-deleted, restore it
UPDATE "User" SET "deletedAt" = NULL WHERE id = '<user-id>';

# If they forgot password, send reset link
# (users email trigger a "forgot password" link)

# Document on the support ticket what the issue was
```

**Prevent next time**:
- Improve login error messages (without leaking whether the email exists):
  - Instead of: "Email or password incorrect" (user can brute-force emails)
  - Use: "We couldn't find that email or password. Did you mean...?" (suggests email, then password)
- Add email verification reminder before they try to log in
- Add "Forgot password?" flow

---

### **Incident 10: CI pipeline failing on every PR**

**Symptom**: PRs that pass tests locally are failing in CI. Green at 3:59pm, red at 4:00pm.

**First check**:
```bash
# Check CI logs in GitHub Actions
# Look for:
# - "Node version mismatch"
# - "Postgres image new default"
# - "Flaky test"
# - "Dependency drift"

# Rerun the CI job to see if it's flaky
```

**Likely causes:**
1. A flaky test (sometimes passes, sometimes fails)
2. CI's Postgres image updated with new defaults
3. Node version changed
4. An npm package changed behavior

**Fix**:
```bash
# If it's a single flaky test, don't disable the suite:
it.skip("should upload large image", () => { ... });
// Open ticket: "Investigate flakyness on image upload test"

# If all tests fail, check CI logs for the error
# If it's a Postgres default, pin the image tag to a SHA:
# FROM postgres:16-alpine@sha256:abc123def456...

# If it's Node, check package.json engines:
// "engines": { "node": "20.x" }
// Make sure CI is using that version
```

**Prevent next time**:
- Pin every Docker image to a SHA, not a tag (tags can change)
- Pin Node version in package.json (and verify in CI)
- Track flaky tests—any test failing > 1% of the time gets fixed or removed, never ignored

---

## Quick reference (copy-paste ready)

```bash
# Pods
kubectl get pods -n miamo
kubectl get pods -l app=social -n miamo

# Logs
kubectl logs -l app=social -n miamo --tail=100
kubectl logs <pod-name> -n miamo --tail=200

# Restart a service
kubectl rollout restart deployment/social -n miamo

# Rollback to previous version
kubectl rollout undo deployment/social -n miamo

# Scale temporarily
kubectl scale deployment/social --replicas=10 -n miamo

# Check events (what Kubernetes is doing)
kubectl describe pod <pod-name> -n miamo
# Shows: CrashLoopBackOff, OOM, startup probe failed, etc.

# Redis
redis-cli XLEN events:raw
redis-cli XINFO GROUPS events:raw
redis-cli --bigkeys
redis-cli FLUSHALL  # ⚠️ DANGER: deletes all cache

# Postgres
psql $DATABASE_URL -c "SELECT ..."
psql $DATABASE_URL -c "SELECT count(*) FROM \"User\";"
```

---

## After every incident

Within 24 hours, write a 1-page postmortem:

1. **Timeline** (in UTC, what happened and when)
   - 14:32 UTC: Alert fires "Postgres CPU 100%"
   - 14:33 UTC: On-call checks logs, finds slow query
   - 14:35 UTC: Query killed, CPU drops to 30%
   - 14:38 UTC: Deploy fix (added index)

2. **What happened** (in plain English, 2-3 sentences)
   - The Discover page fetched all 10M users, filtered by distance, then for each user fetched their likes count. 1 query + 10M queries = 10M+ database calls.

3. **Root cause** (why did it happen)
   - Code review missed the N+1 query in the fetch loop. No EXPLAIN ANALYZE was run.

4. **What stopped it** (what action fixed it)
   - On-call killed the query, then deployed a fix: batch fetch all likes in one query.

5. **What we'll do so it doesn't repeat**
   - Add a CI check: any new SQL query must have EXPLAIN ANALYZE in the PR description.
   - Add alert: if any query runs > 5 seconds, alert on-call.

**Add prevention items to this Runbook** so the next on-call doesn't relearn the same lesson.

---

## Phone tree (who to wake)

**Sev-1** (app is down):
1. Page Arpan (lead on-call)
2. After 5 min, page Ravi (backend)
3. After 10 min, page Meera (product) so she knows

**Sev-2** (degraded):
1. Page the service owner (check GitHub CODEOWNERS)
2. Notify Arpan (lead on-call)

**Sev-3** (minor):
1. Create a Jira ticket
2. Discuss in standup tomorrow

---

## Customer communication template (Sev-1 only)

```
Subject: We're investigating a service disruption

We're aware that Miamo may be unavailable or slow right now. Our team is investigating.

Current status: [investigating / identified root cause / implementing fix]
Expected impact: [X users affected / estimated duration: Y minutes]
Next update: [in 15 minutes]

We'll post an update every 15 minutes until resolved.

Thank you for your patience.
— Miamo Reliability Team
```

(Update every 15 minutes, max 2-3 sentences per update. Don't speculate about root cause in public; wait until resolved.)
