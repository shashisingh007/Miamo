# Runbook — what to do when something breaks at 2am

It's 2am. PagerDuty is buzzing. Priya is one of 50,000 users who can't
open the app. This document is what you read first.

For each incident: **Symptom** → **First check** → **Likely cause** →
**Fix** → **Prevent next time**.

---

## 1. "App is down" — gateway returning 502 everywhere

**Symptom.** Every request returns 502. PagerDuty alert from external
synthetic check.

**First check.**
```bash
kubectl get pods -l app=gateway
kubectl logs -l app=gateway --tail=100
```

**Likely cause.** All gateway pods crash-looping. Usually a bad config
push (missing env var) or upstream DB unreachable.

**Fix.**
```bash
# rollback latest deploy
kubectl rollout undo deployment/gateway
# wait
kubectl rollout status deployment/gateway
```

**Prevent.** Staging smoke test before prod deploy. Required env vars
declared with `${VAR:?required}` in compose so missing vars fail at
build, not at 2am.

---

## 2. Login works but Discover is empty

**Symptom.** Users see "No more profiles" immediately after logging in.

**First check.**
```bash
kubectl logs -l app=social --tail=200 | grep -i error
psql $DATABASE_URL -c 'SELECT count(*) FROM "User";'
```

**Likely cause.** Either `social` can't reach Postgres, or the
candidate query returns 0 (data issue, e.g. wrong env pointing at
empty DB).

**Fix.** Restart pod, confirm correct `DATABASE_URL`. If 0 candidates,
check seed scripts.

**Prevent.** Add a `/healthz/deep` endpoint that runs a minimal
candidate query.

---

## 3. Tracking events not influencing algorithms

**Symptom.** Users complain Discover hasn't adapted to their swipes
for hours.

**First check.**
```bash
redis-cli XLEN events:raw                         # should be < 50k
redis-cli XINFO GROUPS events:raw                 # check lag
kubectl logs -l app=tracking-worker --tail=200
```

**Likely cause.** `tracking-worker` crashed or its consumer group is
stuck.

**Fix.**
```bash
kubectl rollout restart deployment/tracking-worker
# if a single consumer is stuck:
redis-cli XGROUP DELCONSUMER events:raw tw-rollup <consumer-name>
```

**Prevent.** Alert on `XLEN > 100k` and on consumer lag > 60s.

---

## 4. Chats decrypting to garbage

**Symptom.** Users see "[unable to decrypt]" on existing messages.

**First check.** `ENCRYPTION_KEY` and `ENCRYPTION_SALT` env vars on
`messaging` pods — were they rotated?

**Likely cause.** Someone rotated the encryption secrets. **This is
unrecoverable for existing messages.**

**Fix.** **Immediately** restore the old `ENCRYPTION_KEY` and
`ENCRYPTION_SALT` from the secret backup. If no backup exists, the
ciphertext is permanently unreadable.

**Prevent.** Tag these two secrets in your secret manager as
"never rotate". Add a pre-deploy hook that diffs secret values and
blocks if these change.

---

## 5. Mass logout / "please sign in again"

**Symptom.** All users forced to re-login at the same time.

**First check.** `JWT_SECRET` value on `auth` and `gateway` pods.

**Likely cause.** `JWT_SECRET` was rotated or unset.

**Fix.** Restore the previous `JWT_SECRET`. Users with refresh tokens
will silently reauth on next request; users with only access tokens
re-login.

**Prevent.** JWT secret rotations are intentional and announced —
never accidental. Add a startup check that warns if `JWT_SECRET` is
shorter than 32 bytes.

---

## 6. Push notifications delayed by hours

**Symptom.** Match notifications arrive an hour after the match.

**First check.**
```bash
kubectl get jobs -l app=notifications
kubectl logs -l app=notifications --tail=200 | grep -i error
```

**Likely cause.** Notifications worker behind on its queue, or the
upstream push provider (FCM/APNS) is failing.

**Fix.** Scale up the notifications deployment temporarily:
```bash
kubectl scale deployment/notifications --replicas=5
```

**Prevent.** Alert on `nextNotifyAt` queue lag > 5 min.

---

## 7. Postgres CPU pinned at 100%

**Symptom.** Every API call slow; Postgres CPU red in Grafana.

**First check.**
```sql
SELECT pid, query, state, query_start
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start ASC
LIMIT 20;
```

**Likely cause.** A query without an index, or `n+1` query loop
introduced in the last release.

**Fix.** Kill the offending query (`SELECT pg_cancel_backend(pid)`),
then deploy a fix or roll back the release that introduced it.

**Prevent.** EXPLAIN ANALYZE every new query in PR review. Set
`statement_timeout = '5s'` so a bad query can't pin CPU forever.

---

## 8. Redis memory at 95%

**Symptom.** `RedisOOM` alert; cache writes failing.

**First check.**
```bash
redis-cli INFO memory | grep used_memory_human
redis-cli --bigkeys
```

**Likely cause.** `events:raw` stream uncapped (worker dead — see #3)
or a runaway cache key without TTL.

**Fix.**
```bash
# trim the stream
redis-cli XTRIM events:raw MAXLEN 100000
```

**Prevent.** Set `MAXLEN ~100000` on every XADD. Audit all SETs for TTL.

---

## 9. One user complains they can't log in

**Symptom.** Single-user ticket: "I can't log in."

**First check.** Check the user's row:
```sql
SELECT id, email, "emailVerified", "deletedAt"
FROM "User" WHERE email = 'priya@example.com';
SELECT count(*) FROM "Session" WHERE "userId" = '<id>';
```

**Likely cause.** Email unverified, account soft-deleted, or all
sessions revoked.

**Fix.** Triage per the cause. Document outcome on the ticket.

**Prevent.** Improve login error messages to be more specific (without
leaking whether email exists).

---

## 10. CI pipeline failing on every PR

**Symptom.** Green PRs suddenly going red in CI; tests pass locally.

**First check.** Is it shared/algo tests, or service tests? Did Node
version change?

**Likely cause.** A flaky test, a dependency drift, or CI's Postgres
image rebuilt with a new default.

**Fix.** Pin the image tag; rerun. If a single test is flaky, mark it
with `it.skip` and open a ticket — don't blanket-disable suites.

**Prevent.** Pin every container image to a SHA. Track flakiness — any
test failing >1% of the time gets fixed or removed.

---

## Quick reference

```bash
# pods
kubectl get pods -n miamo

# logs (last 100 lines, one service)
kubectl logs -l app=<service> --tail=100 -n miamo

# rollback
kubectl rollout undo deployment/<service> -n miamo

# scale temporarily
kubectl scale deployment/<service> --replicas=5 -n miamo

# Redis stream health
redis-cli XLEN events:raw
redis-cli XINFO GROUPS events:raw

# Postgres top queries
psql $DATABASE_URL -c "SELECT pid,query,state,query_start FROM pg_stat_activity WHERE state='active' ORDER BY query_start;"
```

---

## After every incident

Within 24h: write a 1-page postmortem with:
1. **Timeline** (UTC).
2. **What happened** in plain English.
3. **What stopped it.**
4. **What we'll do so it doesn't repeat.**

Add the prevention item to this Runbook so the next on-call doesn't
relearn the lesson.
