# Miamo Launch Day — T-24h / T-1h / T-30min / T+0 / T+72h Playbook

**Type:** Phase H deliverable per `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` §10.
**Audience:** the founder + a single on-call engineer running launch day.
**Purpose:** every checkbox is a hard-block. Do not launch on a red gate.

This is the fifty-year-veteran's launch protocol. Nothing here is aspirational — every item corresponds to a shipped feature, a scripted verification, or a documented external-account step. When it says "run this," you run exactly that.

---

## §1 — Prerequisites (before you even open this checklist)

The founder confirms the following external accounts are live:
- [ ] **AWS account** with an IAM user `miamo-deploy` (permissions per `docs/architecture/launch-status.md §Phase E`)
- [ ] **AWS resources**: VPC, EC2 `t3.xlarge`, RDS Postgres `db.t4g.small` Multi-AZ, ElastiCache `cache.t4g.small`, ALB + ACM cert, S3 bucket for user photos, Route 53 hosted zone
- [ ] **Google Cloud** OAuth client (web + iOS)
- [ ] **Apple Developer** account + Sign in with Apple key (`.p8`)
- [ ] **Resend** account for transactional email (`RESEND_API_KEY`)
- [ ] **MSG91** for India SMS OTP (`MSG91_AUTH_KEY`) — or Twilio fallback
- [ ] **Razorpay** live-mode account with `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- [ ] **Sentry** project with production DSN
- [ ] **AWS Rekognition** access (same IAM user)
- [ ] **Legal counsel** signed off on `docs/legal/terms-of-service.md`, `docs/legal/privacy-policy.md`, `docs/legal/dpia.md`
- [ ] **IP counsel** signed off on `docs/legal/patent-clearance.md`

If any of the above is unchecked, **do not proceed**. The prompt's §11 non-negotiables are gated on these.

---

## §2 — T-24h (the day before)

Time zone: Asia/Kolkata. Set aside 4 hours.

### §2.1 — Test-suite green in CI

```bash
cd /path/to/Miamo
git checkout main
git pull
npm test                          # 1041 tests, ~5s
npm run test:full                 # full suite, ~15s
npm run typecheck                 # 11/11 clean
cd services/web && npm run build  # 41 routes, no errors
```

- [ ] npm test → 1041 passing (or higher; regressions block launch)
- [ ] npm run test:full → all passing
- [ ] npm run typecheck → 11/11 clean
- [ ] npm run build → clean

### §2.2 — Security audit clean

```bash
npm audit --omit=dev              # 0 high/critical
( cd services/shared && npm audit --omit=dev )
( cd services/web && npm audit --omit=dev )
```

- [ ] 0 high/critical vulnerabilities across all packages
- [ ] Any moderate advisory documented in a security-log doc + accepted-risk ticket

### §2.3 — Playwright E2E green

```bash
# One-time: npx playwright install chromium webkit firefox
npx playwright test --project=chromium --project=webkit --project=firefox
npx playwright test --project=mobile-chrome --project=mobile-safari
```

- [ ] All 22 spec tests pass on all 5 browser projects
- [ ] HTML report saved at `playwright-report/index.html`

### §2.4 — Load-test dry run on sandbox

Point k6 at a sandbox EC2 (not production):

```bash
brew install k6                        # one-time
export LOAD_TARGET=https://sandbox.miamo.app
export LOAD_TOKEN=<a real bearer token>
bash scripts/load/run.sh discover
```

- [ ] discover.js: p95 < 250ms at 100 RPS sustained 5 min, error rate < 1%
- [ ] messages.js: p95 < 300ms at 30 RPS
- [ ] ingest.js: p95 < 50ms at 200 RPS, error rate < 0.1%
- [ ] discover-realistic.js: full 5-minute user-journey run, no errors

### §2.5 — Chaos verification on sandbox

```bash
bash scripts/chaos/kill-postgres.sh
bash scripts/chaos/kill-redis.sh
bash scripts/chaos/partition-network.sh
bash scripts/chaos/oom-tracking-worker.sh
```

- [ ] Postgres kill: services recover to `/healthz 200` within 30s
- [ ] Redis kill: services stay up (idempotency + rate-limit fail-open per audit)
- [ ] Network partition: services return 503 not 500
- [ ] tracking-worker OOM: docker restart-loop caps at 3 attempts

### §2.6 — DR drill (quarterly, do it once more before launch)

Per `docs/architecture/dr-runbook.md`:
- [ ] Postgres PITR restore in the sandbox — full round-trip in <30 min
- [ ] Rollback script tested: `bash scripts/rollback.sh v1 --dry-run` produces valid plan
- [ ] Backup script tested: `bash scripts/backup-postgres.sh --dry-run` produces valid pg_dump command

### §2.7 — Legal + compliance

- [ ] Terms of Service on `https://miamo.app/legal/terms` — final counsel-reviewed version
- [ ] Privacy Policy on `https://miamo.app/legal/privacy` — final counsel-reviewed version
- [ ] DPIA filed with the appropriate Indian supervisory authority (if triggered by DPDP Section 24)
- [ ] Cookie/tracking consent banner tested in EU IP (VPN) — categories: strictly-necessary / analytics / personalization / marketing
- [ ] Age gate on signup rejects <18

### §2.8 — Secrets one final rotation

Per `docs/architecture/dr-runbook.md §secret-rotation`:
- [ ] Rotate `JWT_SECRET` (24h grace period, both old + new accepted for 24h)
- [ ] Rotate `INTERNAL_SERVICE_KEY`
- [ ] Confirm `ENCRYPTION_KEY` unchanged (never rotate — see runbook)
- [ ] Confirm `TRACKING_HASH_SECRET` unchanged (never rotate — see runbook)
- [ ] All secrets stored in AWS Secrets Manager (not env files) for prod

### §2.9 — DNS TTL lowered for quick rollback

```bash
# Route 53: set A record TTL to 300s (5min) for 24h before launch
aws route53 change-resource-record-sets ...
```

- [ ] DNS TTL = 300s on miamo.app
- [ ] Old TTL noted for post-launch restore

### §2.10 — Alarms armed

Per `docs/architecture/alarms.md`:
- [ ] All 12 baseline CloudWatch alarms armed
- [ ] Alarm routing verified: PagerDuty / Slack / founder's mobile all receive test alert

### §2.11 — Support surfaces ready

- [ ] `support@miamo.app` email inbox monitored
- [ ] Community Discord/Slack channel ready
- [ ] First-100-user invite list (if invite-only launch) drafted
- [ ] App Store / Play Store listings drafted (screenshots + copy) even if not shipping native

---

## §3 — T-1h (final gate)

### §3.1 — Live-stack smoke against production URL

```bash
export LOAD_TARGET=https://api.miamo.app
python3 scripts/qa-runs/phase-15-smoke.py
```

- [ ] 60-second smoke completes cleanly
- [ ] All 26 (main) routes return 200/302
- [ ] All 4 gateway endpoints responsive
- [ ] 4 seeded-users can log in

### §3.2 — Load test hot ramp on production

```bash
bash scripts/load/run.sh discover
```

- [ ] Sustained 100 RPS for 5 min, p95 < 250ms, 0 5xx

### §3.3 — Manual smoke of the 12 §11 non-negotiables

Per `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §11`:

- [ ] Zero broken clicks on `/discover`, `/matches`, `/messages`, `/dtm`, `/creativity`, `/settings`, `/onboarding`
- [ ] All 4 auth methods work (email+pw, OTP, Google, Apple) — sign up + sign in + log out
- [ ] Match flow shows 5 Move v2 suggestions
- [ ] Filter + geo works: browser location prompt → distance slider works
- [ ] Payment works: buy 10 Spotlight minutes via Razorpay live mode → balance updates
- [ ] Moderation stops top-5 obvious bad content on upload (test with obviously bad image + text)
- [ ] Reports + blocks work bidirectionally
- [ ] Age gate enforced (<18 rejected)
- [ ] RTBF works: delete-account actually deletes across all 14 tables
- [ ] Rollback works: one command reverts the deploy

Every checkbox red → **do not launch. Fix. Return to T-24h.**

### §3.4 — Founder + on-call alert setup

- [ ] Founder phone: Sentry, Slack, uptimerobot notifications enabled
- [ ] On-call engineer: PagerDuty rotation confirmed
- [ ] Kill-switch documented: which env var flips the app to read-only mode

---

## §4 — T-30min (final config)

- [ ] `.env` on production has `NODE_ENV=production`
- [ ] Flip feature flags for launch:
  - `FEATURE_MOVE_V2_ENABLED=1`
  - `ALGO_V8_DISCOVER_RANKER_ENABLED=1`
  - `FEATURE_TRUST_SCORE_ENABLED=1`
  - `FEATURE_WEEKLY_TOP_COUNTDOWN_ENABLED=1`
  - `FEATURE_FAMILY_BRIEF_SHARES_ENABLED=1`
  - `FEATURE_TEXT_MODERATION_ENABLED=1`
  - **Keep OFF for launch (ramp week 2+):** `ALGO_V9_TEMPORAL_LEARNING_ENABLED`, `ALGO_V9_REPEAT_OFFENDER_ENABLED`, `ALGO_V9_CONVERSATION_STARTER_ENABLED`, `ALGO_V9_PROFILE_HEALTH_ENABLED`, `ALGO_V9_MATCH_QUALITY_PREDICTOR_ENABLED`, `ALGO_V9_COMPATIBILITY_EXPLAINER_ENABLED`, `FEATURE_ACTIVATION_EMAILS_ENABLED`, `FEATURE_DISCOVER_SEED_ENABLED`, `FEATURE_PROGRESSIVE_DISCLOSURE_ENABLED`
- [ ] Restart all services to pick up new env: `bash scripts/start.sh docker prod` (or the k8s equivalent)
- [ ] Verify: `curl https://api.miamo.app/healthz` returns 200
- [ ] Verify: 13 containers healthy per `docker compose ps`
- [ ] Tag the release: `git tag v1-launch && git push origin v1-launch`

---

## §5 — T-5min (the moment)

- [ ] Change DNS: `miamo.app` CNAME → production ALB
- [ ] Open `docs/architecture/launch-day-monitor.md` (or the equivalent metrics dashboard)
- [ ] Optional: post launch announcement (or soft-launch — no announcement)

---

## §6 — T+0 → T+4h (first four hours)

Every 15 minutes:
- [ ] sign-ups/hr — sanity-check the number
- [ ] first-message rate — should be > 0
- [ ] gateway 5xx rate — must stay < 1%
- [ ] p95 gateway latency — must stay < 500ms

Every 30 minutes:
- [ ] Check Sentry for new error classes
- [ ] Any Sev-1 → immediate on-call notification

Every hour:
- [ ] Skim the reports queue — any content needing admin review?
- [ ] Check moderation false-positive rate — should be < 5%

At T+2h:
- [ ] Send a personal "how's it going?" message to the first 10 sign-ups. Personal touch matters for v1 launches.

---

## §7 — T+72h (post-launch stabilization)

Daily for 3 days:
- [ ] Standup with founder — what surprised us?
- [ ] Bug review — any new P0? Sev? Ramp any flag up?
- [ ] Fairness Gini per gender — should stay under 0.4 per the audit target
- [ ] Move v2 accept rate — should hit ≥ 40% per the v3.6 KPI
- [ ] If v9 is being ramped, watch drift-detector fire rate — should not be triggering on real users unless their behaviour actually diverges

At T+72h:
- [ ] Post-launch retrospective — what worked, what didn't, what to change for v1.1
- [ ] If all metrics healthy, remove any invite-only gate (if launched invite-only)
- [ ] Ramp v9 flags to 0.1 rollout per `docs/architecture/v9-temporal-learning.md`

---

## §8 — If launch tanks

If a Sev-1 breaks in the first hour:

1. **Roll back immediately**:
   ```bash
   bash scripts/rollback.sh v1-launch --to-tag=v0-lkg
   ```
2. Change DNS back to old target (TTL is 300s, so ~5min propagation).
3. Post an incident status page.
4. Founder writes a post-mortem within 24h.
5. Do not re-launch until the root cause is fixed AND every gate in this checklist is re-verified.

---

## §9 — What "launched" means

Launched = all of:
- [ ] `docs/architecture/launch-day-checklist.md` all boxes checked ✓
- [ ] 72 hours post-DNS-cutover with no Sev-1
- [ ] Zero P0/P1 issues escalated
- [ ] Fairness Gini < 0.4 per gender
- [ ] Move v2 accept rate ≥ 40%
- [ ] D1 retention measured

Anything else is "in the wild" but not "launched."

---

_End of launch-day checklist. See `docs/architecture/launch-status.md` for what shipped, `docs/architecture/dr-runbook.md` for recovery procedures, `FULL_AUDIT_AND_LEARNING_V2_PROMPT.md` §10-11 for the full non-negotiables spec._
