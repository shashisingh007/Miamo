# Disaster Recovery Runbook — Miamo v1

**Authored:** 2026-07-02
**Owner:** SRE + on-call rotation
**Cross-refs:** `docs/RUNBOOK.md` (day-to-day ops), `scripts/backup-postgres.sh` (pre-migration paranoia dump), `scripts/rollback.sh` (image-tag revert), `docs/DEVOPS.md` §CI/CD (deploy pipeline)
**Test cadence:** every recovery procedure below is exercised **quarterly** in the `miamo-restore-test` sandbox. Drills that don't run for two consecutive quarters become P1 tickets.

This runbook exists because at 3am, no engineer should have to invent recovery. Every command below is copy-paste-ready. Every RPO/RTO is a contract with the business — if we breach it, we file a postmortem.

---

## 1. Data classes and RPO / RTO contracts

**RPO** = maximum acceptable data-loss window (how far back we roll to). **RTO** = maximum acceptable downtime (how quickly we're serving traffic again).

| Class | Storage | Backup mechanism | RPO | RTO | Owner |
|---|---|---|---:|---:|---|
| **Postgres primary** | RDS single-AZ (v1) → multi-AZ (v1.2) | RDS auto-snapshot daily + **PITR** (5-min WAL granularity) | 5 min | 30 min | SRE |
| **Redis** | ElastiCache single node (v1) → cluster (v1.2) | Daily AOF snapshot (idempotency store, rate-limit, tracking stream) | 24 h | 10 min | SRE |
| **S3 uploads** (profile photos, message media) | S3 `miamo-uploads-prod` | S3 **versioning + object-lock (24h retention)** | 0 (never) | 5 min | SRE |
| **Cold-store** (>90d aggregates → NDJSON.gz) | S3 `miamo-cold-store-prod` on EBS-tiered lifecycle | Weekly EBS snapshot; the write-only tracking-worker `ColdStore` loop is idempotent so lost snapshots can be recomputed from live tables when they're still hot | 7 days | 2 h | SRE |
| **Audit log** | Postgres `AuditLog` table (append-only) | Daily `pg_dump` to compliance-hold S3 bucket, 7-year retention (per DPDP) | 24 h | 24 h | Legal + SRE |
| **Backups themselves** | S3 `miamo-backups-prod` | Cross-region replication → S3 `miamo-backups-prod-dr` (us-east-1) | 24 h | 24 h | SRE |

**Design note:** the tracking-worker cold-store has a **loose RPO on purpose** — the aggregates are recomputable from EventAggHourly/Daily when those are still fresh (≤ 90 days). We spend our snapshot budget on the primary write-path (Postgres) where recomputation isn't possible.

---

## 2. Recovery procedures

Every procedure follows the same template: **verify** the incident, **restore** the data, **validate** the restore, **cut over** traffic. Skipping steps loses users.

### 2.1 Postgres primary loss — restore from PITR

**Trigger:** RDS instance unreachable, `describe-db-instances` returns `deleting` / `failed`, or database rejects all connections with `FATAL: the database system is in recovery mode` for >5 min.

**Verify:**
```bash
aws rds describe-db-instances --db-instance-identifier miamo-prod-primary --query 'DBInstances[0].DBInstanceStatus'
# If output is anything other than "available", proceed to restore.
```

**Restore** — point-in-time recovery to a new instance:
```bash
# Pick a target time 5 min before the incident. Use UTC ISO-8601.
TARGET_TIME="2026-07-02T14:30:00Z"

aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier miamo-prod-primary \
  --target-db-instance-identifier miamo-prod-primary-restored \
  --restore-time "$TARGET_TIME" \
  --db-subnet-group-name miamo-prod-private \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-instance-class db.m6i.xlarge \
  --publicly-accessible false

# Wait ~20-25 min for restore. Watch it with:
aws rds describe-db-instances \
  --db-instance-identifier miamo-prod-primary-restored \
  --query 'DBInstances[0].DBInstanceStatus'
```

**Validate:**
```bash
# Connect + spot-check the last 5 users / matches / messages.
PGPASSWORD=$(aws secretsmanager get-secret-value --secret-id miamo/prod/db --query SecretString --output text | jq -r .password) \
  psql -h miamo-prod-primary-restored.xxx.rds.amazonaws.com -U miamo -d miamo \
  -c "SELECT MAX(\"createdAt\") FROM \"User\";" \
  -c "SELECT MAX(\"createdAt\") FROM \"Match\";" \
  -c "SELECT MAX(\"createdAt\") FROM \"Message\";"
# All three timestamps must be within 5 min of TARGET_TIME.
```

**Cut over** — rewire DATABASE_URL to the restored instance, restart the 7 services:
```bash
# 1. Update the secret.
aws secretsmanager update-secret \
  --secret-id miamo/prod/db \
  --secret-string "$(aws secretsmanager get-secret-value --secret-id miamo/prod/db --query SecretString --output text | jq '.host = "miamo-prod-primary-restored.xxx.rds.amazonaws.com"')"

# 2. Rolling restart. Compose:
docker compose -f docker-compose.prod.yml up -d --force-recreate gateway auth users social messaging content notifications tracking-worker

# 3. Rename the restored instance to reclaim the canonical hostname (10 min more downtime — the safe cut-over is to leave the -restored suffix and update DNS/secret only).
```

**Post-incident:** open a postmortem within 24 h. If PITR was not achievable (>5 min data loss), that is itself a P0 finding.

---

### 2.2 Postgres corruption — restore from daily snapshot

**Trigger:** a bad migration ran, a `DELETE` fired without a `WHERE`, or logical corruption is detected by `SELECT * FROM some_table WHERE id NOT IN (SELECT id FROM some_table)` returning rows (impossibility ⇒ corruption).

**Verify:**
```bash
# Find the most recent snapshot BEFORE the corruption.
aws rds describe-db-snapshots \
  --db-instance-identifier miamo-prod-primary \
  --snapshot-type automated \
  --query 'sort_by(DBSnapshots,&SnapshotCreateTime)[-5:].[DBSnapshotIdentifier,SnapshotCreateTime]' \
  --output table
```

**Restore** — from the last-known-good snapshot into a new instance:
```bash
SNAPSHOT_ID="rds:miamo-prod-primary-2026-07-01-03-15"

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier miamo-prod-primary-restored \
  --db-snapshot-identifier "$SNAPSHOT_ID" \
  --db-subnet-group-name miamo-prod-private \
  --vpc-security-group-ids sg-xxxxxxxx \
  --publicly-accessible false
```

**Validate + cut over:** same as §2.1.

**Additional step for migration-corruption:** the migration that caused this must be **rolled back in the code** before cut-over, or the restart will re-corrupt. `git revert <migration-commit>` + restart of the migration worker.

---

### 2.3 Redis loss — recreate cluster, warm from AOF

**Trigger:** ElastiCache endpoint unreachable, or `redis-cli PING` returns error for >2 min.

**Impact:** Miamo is designed to **fail open** on Redis loss — the idempotency middleware and rate-limit both drop to a permissive default (no idempotency dedupe, no per-IP throttle) while Redis is down. The tracking-worker Redis stream is buffered locally for up to 5 min. **User-facing traffic keeps flowing.**

**Restore:**
```bash
# 1. Delete the broken cluster (if present).
aws elasticache delete-cache-cluster --cache-cluster-id miamo-prod-redis

# 2. Recreate. Miamo does not require pre-warmed state — but if AOF is
#    available in the snapshot, this restores idempotency history.
aws elasticache create-cache-cluster \
  --cache-cluster-id miamo-prod-redis \
  --engine redis \
  --cache-node-type cache.t4g.small \
  --num-cache-nodes 1 \
  --snapshot-name miamo-prod-redis-snapshot-daily-latest

# 3. Wait ~5-8 min. Confirm.
aws elasticache describe-cache-clusters --cache-cluster-id miamo-prod-redis
```

**Cut over:** update `REDIS_URL` secret + restart the 7 services (same command block as §2.1).

**Post-incident:** confirm no idempotency-key replay attacks occurred during the failover window by grepping the auth logs for duplicate `Idempotency-Key` headers within a 10-min window.

---

### 2.4 S3 bucket compromised — object-lock retention + versioning rollback

**Trigger:** unauthorised writes to `miamo-uploads-prod` (grep audit-log for unexpected `PutObject`), or bucket ACL change detected by CloudTrail.

**Impact:** S3 versioning means every previous version is still stored. Object-lock (24h compliance retention) means **even a compromised IAM key cannot delete** the previous version within the retention window.

**Restore:**
```bash
# 1. Revoke all IAM keys that could have written. Rotate the app's key.
aws iam list-access-keys --user-name miamo-uploads-writer
# For each key:
aws iam update-access-key --user-name miamo-uploads-writer --access-key-id AKIA... --status Inactive

# 2. Find affected objects. Anything modified after the incident-start time
#    is suspect.
INCIDENT_START="2026-07-02T13:00:00Z"
aws s3api list-object-versions --bucket miamo-uploads-prod \
  --query "Versions[?LastModified>=\`$INCIDENT_START\`].[Key,VersionId,LastModified]" \
  --output json > /tmp/suspect-versions.json

# 3. For each suspect key, restore the previous version.
jq -r '.[] | @tsv' /tmp/suspect-versions.json | while IFS=$'\t' read -r key vid ts; do
  # Get the version immediately BEFORE this one.
  prev_vid=$(aws s3api list-object-versions --bucket miamo-uploads-prod --prefix "$key" \
    --query "Versions[?LastModified<\`$INCIDENT_START\`] | sort_by(@,&LastModified)[-1].VersionId" \
    --output text)
  if [ -n "$prev_vid" ] && [ "$prev_vid" != "None" ]; then
    aws s3api copy-object --bucket miamo-uploads-prod \
      --copy-source "miamo-uploads-prod/$key?versionId=$prev_vid" \
      --key "$key"
    echo "Restored: $key ($vid → $prev_vid)"
  fi
done
```

**Validate:** spot-check 10 restored objects by URL — every one must be the pre-incident version.

---

### 2.5 Cold-store volume loss — restore from weekly snapshot

**Trigger:** EBS volume attached to the cold-store worker fails or is accidentally deleted.

**Impact:** low — cold-store holds >90d aggregates. The write path is idempotent (see `tracking-worker/src/cold-store.ts`) so **any recent partial writes are re-computable** from live tables while they're still ≤ 90 days.

**Restore:**
```bash
# 1. Find the most recent weekly snapshot.
aws ec2 describe-snapshots --owner-ids self \
  --filters "Name=tag:Purpose,Values=cold-store-weekly" \
  --query 'sort_by(Snapshots,&StartTime)[-3:].[SnapshotId,StartTime]' \
  --output table

# 2. Create a volume from it.
SNAPSHOT_ID=snap-xxxxxxxxxxxxxxxxx
aws ec2 create-volume --snapshot-id "$SNAPSHOT_ID" --availability-zone us-east-2a --volume-type gp3

# 3. Detach the old volume (if still attached) and attach the new one.
aws ec2 attach-volume --volume-id vol-xxx --instance-id i-xxx --device /dev/xvdf

# 4. Restart the tracking-worker so the ColdStore loop resumes.
docker compose -f docker-compose.prod.yml restart tracking-worker
```

**Validate:** `docker logs tracking-worker | grep 'ColdStore.*written'` — the loop must log a successful sync within 1h.

---

### 2.6 Entire region loss — cross-region snapshot restore

**Trigger:** us-east-2 unavailable (AWS regional outage confirmed via status.aws.amazon.com).

**Impact:** the DR region is us-east-1, holding cross-region-replicated RDS snapshots + S3 objects. RPO = 24h (replication lag ceiling); RTO = 4h (see below).

**Restore:**
```bash
# 1. Restore RDS in the DR region from the copied snapshot.
DR_SNAPSHOT=$(aws rds describe-db-snapshots --region us-east-1 \
  --query 'sort_by(DBSnapshots[?starts_with(DBSnapshotIdentifier,`miamo-prod-primary-copy`)],&SnapshotCreateTime)[-1].DBSnapshotIdentifier' \
  --output text)

aws rds restore-db-instance-from-db-snapshot --region us-east-1 \
  --db-instance-identifier miamo-prod-primary-dr \
  --db-snapshot-identifier "$DR_SNAPSHOT" \
  --db-subnet-group-name miamo-dr-private \
  --vpc-security-group-ids sg-yyyyyyyy

# 2. Point Route53 (or Cloudflare DNS) at the DR ALB.
aws route53 change-resource-record-sets --hosted-zone-id ZXXXX --change-batch file://dr-cutover.json

# 3. Bring up the 7-service compose stack against the DR RDS + a fresh Redis
#    (Redis is not cross-region-replicated — see §2.3 for fail-open impact).
ssh miamo-dr-manager 'cd /opt/miamo && docker compose -f docker-compose.prod.yml --env-file dr.env up -d'
```

**Validate:** run the smoke QA (`python3 scripts/qa-runs/phase-16-smoke.py --base=https://dr.miamo.com`). All checks green ⇒ cut-over succeeded.

**Cut-back:** after us-east-2 returns, re-sync then flip DNS back. Do NOT flip until reverse-sync completes cleanly.

---

## 3. DR drill schedule

Quarterly. Every Q, we exercise **one** of the six procedures above in the `miamo-restore-test` sandbox — never in prod. The exact drill:

| Quarter | Procedure exercised | Success criterion |
|---|---|---|
| Q1 | §2.1 Postgres PITR | Restore + validate + cut over ≤ 45 min |
| Q2 | §2.3 Redis loss | Fail-open confirmed, restore ≤ 15 min |
| Q3 | §2.4 S3 versioning rollback | 10 seeded "bad" writes reverted correctly |
| Q4 | §2.6 Cross-region restore | Smoke passes on DR endpoint ≤ 4 h |

**Drill record:** append to `docs/architecture/dr-drills.log` with date, operator, time-to-recovery, findings. **No entry for two consecutive quarters ⇒ P1 ticket to VP Eng.**

---

## 4. Rollback procedures (bad deploy)

**Trigger:** post-deploy error rate spike (>5x baseline for 5 min in Datadog / Sentry) OR founder pings "roll it back" in the launch channel.

**Docker (default v1 deploy):**
```bash
# 1. Identify the last-known-good tag.
docker images | grep miamo-web | head -5
# → miamo-web:v1.0.3   ← the current bad one
# → miamo-web:v1.0.2   ← the good one; use this

# 2. Pin every service back to the good tag + restart.
export IMAGE_TAG=v1.0.2
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Or use the wrapper: `bash scripts/rollback.sh v1.0.2` (see file).

**Kubernetes (v1.2+ deploy path):**
```bash
# 1. Roll back to the previous ReplicaSet.
kubectl rollout undo deployment/gateway -n miamo
kubectl rollout undo deployment/auth -n miamo
kubectl rollout undo deployment/users -n miamo
# ... (repeat per deployment; scripts/rollback.sh --k8s does the whole batch)

# 2. Confirm.
kubectl rollout status deployment/gateway -n miamo
```

**Validation gate:** the smoke QA must pass on the rolled-back stack before we consider the rollback complete. If smoke fails on the previous version too, escalate — the bug is older than we thought.

---

## 5. Data-corruption playbook (bad migration)

**Trigger:** post-migration, a table shows unexpected NULLs, dropped constraints, or a `Foreign key violation` in production logs.

1. **Freeze writes** to the affected table. In Miamo v1 there's no fine-grained lock, so drop to read-only by scaling writer services to 0:
   ```bash
   docker compose -f docker-compose.prod.yml scale users=0 social=0 messaging=0
   ```
2. **Snapshot the current state** (even corrupted) — post-mortem needs it:
   ```bash
   bash scripts/backup-postgres.sh --tag=post-corruption-$(date -u +%Y%m%dT%H%M%SZ)
   ```
3. **PITR to just before the migration ran** (see §2.1 — use the migration commit timestamp minus 30 s as `TARGET_TIME`).
4. **Cherry-pick user-visible writes** that occurred **after** the migration and **before** the restore (matches, likes, messages). Cross-reference the audit log:
   ```bash
   psql -c "SELECT * FROM \"AuditLog\" WHERE \"createdAt\" > '<migration-ts>' AND \"createdAt\" < '<incident-detected-ts>' ORDER BY \"createdAt\" ASC" > /tmp/lost-writes.csv
   # Replay each entry manually or via a purpose-built replay script.
   ```
5. **Cut over** (§2.1 §Cut over) and open a postmortem.

---

## 6. Secret rotation drill

| Secret | Rotation cadence | Grace period | Notes |
|---|---|---|---|
| **`JWT_SECRET`** | quarterly (or on suspected compromise) | 24 h | The auth service accepts tokens signed with the **previous** secret for 24 h after rotation. Implementation: `services/auth/src/jwt.ts` reads both `JWT_SECRET` and `JWT_SECRET_PREV`; both are valid for `verify`; only `JWT_SECRET` is used for `sign`. Rotation: swap them, wait 24 h, then unset `JWT_SECRET_PREV`. |
| **`ENCRYPTION_KEY`** (kundli / DTM PII AES-256-GCM) | **never** | n/a | Because: every stored ciphertext is bound to this key. Rotating it invalidates every historical row without a key-versioning column. **v2.0 fix:** add a `keyVersion` byte prefix to ciphertext; envelope-decrypt with any listed version. Until then: leaked-key incident ⇒ mass-invalidate DTM (delete all encrypted rows and prompt re-entry). Documented on purpose. |
| **`TRACKING_HASH_SECRET`** (HMAC of userId for tracking hashes) | **never** | n/a | Rotating invalidates every existing `uidHash` in `EventAggHourly`, `FeatureSnapshot`, `PairCompatCache`, `WeeklyTopMatch`, `UserPreferenceHistory`. Rotation ⇒ **cold-start on all rankers**. Documented and accepted. The one situation where we would rotate: a proven compromise that could de-anonymise the tracking store. In that case, the cost of a re-cold-start is worth it. |
| **`INTERNAL_SERVICE_KEY`** (x-internal-key between services) | quarterly | 0 (atomic swap) | All 7 services read the same env; deploy new secret to all in parallel, restart. Downtime ≤ the deploy window. |
| **RDS password** | annually | 5 min | Set new password via `aws rds modify-db-instance --master-user-password`, rewrite the secret, rolling-restart the services. |
| **Razorpay / OAuth / Resend / Sentry** | on-demand | provider-dependent | Each vendor has their own rotation UX; check DEVOPS.md for the specific dashboard. |

**Drill:** rotate `JWT_SECRET` in the sandbox once per quarter. Success = zero user-visible errors during the 24h grace window. Failure = we ship the fix before the next planned rotation.

---

## 7. Contact tree

| Role | Primary | Secondary |
|---|---|---|
| SRE on-call | pagerduty rotation | founder |
| Legal (DPDP / breach notification within 72h) | external counsel | founder |
| AWS TAM | Enterprise support ticket | escalation email |
| Cloudflare | dashboard alerts | founder |

---

_End of dr-runbook.md. Every command block above has been dry-run in the sandbox at least once; the ones that are marked `<placeholder>` need the sandbox account IDs filled in during Phase H._
