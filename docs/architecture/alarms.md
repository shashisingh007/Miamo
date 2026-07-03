# Miamo — Baseline Alarm Spec

**Phase:** C.3 (production launch observability)
**Date:** 2026-06-28
**Status:** spec only — no AWS resources provisioned (no credentials in
this environment). Use this doc to seed CloudWatch alarms once
infrastructure is online.

This document enumerates the 12 baseline alarms agreed in
`PRODUCTION_LAUNCH_PROMPT.md` Phase C.3, derived from the launch-audit
§3 DevOps + Data sections. Each row is meant to translate 1:1 into a
CloudWatch alarm (or Alertmanager rule when Prometheus is the source).

## Severity glossary

| Sev | Meaning | Response |
|-----|---------|----------|
| Sev1 | Customer-impacting outage | Page on-call immediately |
| Sev2 | Degraded service or data loss risk | Page on-call within 15min |
| Sev3 | Quality / drift signal, not customer-facing | Slack + ticket within 1 business day |

## Notification channels

- **Page**: PagerDuty → on-call rotation
- **Slack**: `#miamo-ops` channel via SNS → Lambda → Slack webhook
- **Ticket**: GitHub issue auto-created via SNS → Lambda → GitHub Issues API

## Source legend

- **prom**: scraped from `/metrics` on the per-service port (Prometheus or CloudWatch agent)
- **rds**: RDS Performance Insights CloudWatch namespace
- **elasticache**: ElastiCache CloudWatch namespace
- **ec2**: CloudWatch agent host metrics
- **sentry**: Sentry → SNS webhook → CloudWatch event rule

---

## Required alarms (10)

### 1. Gateway 5xx rate > 1% over 5min — **Sev2**

| Field | Value |
|---|---|
| Metric source | `prom` |
| Metric formula | `sum(rate(miamo_http_errors_total{service="gateway",status=~"5.."}[5m])) / sum(rate(miamo_http_requests_total{service="gateway"}[5m]))` |
| Threshold | `> 0.01` (1%) |
| Evaluation window | 5 minutes |
| Datapoints to alarm | 1/1 |
| Severity | Sev2 |
| Notification | Page + Slack |
| Rationale | First public-facing signal of a real outage. Customer-perceived. |

### 2. Gateway p95 latency > 500ms over 5min — **Sev3**

| Field | Value |
|---|---|
| Metric source | `prom` |
| Metric formula | `histogram_quantile(0.95, sum by (le) (rate(miamo_http_request_duration_seconds_bucket{service="gateway"}[5m])))` |
| Threshold | `> 0.5` (seconds) |
| Evaluation window | 5 minutes |
| Datapoints to alarm | 2/2 (15min sustained → reduces noise) |
| Severity | Sev3 |
| Notification | Slack |
| Rationale | Latency drift typically precedes a 5xx spike; warn early. |

### 3. Tracking-worker rollup lag > 5min — **Sev2**

| Field | Value |
|---|---|
| Metric source | `prom` |
| Metric formula | `increase(miamo_v8_intent_inference_runs_total[5m])` |
| Threshold | `== 0` (no ticks in 5min while worker should be running) |
| Evaluation window | 5 minutes |
| Datapoints to alarm | 1/1 |
| Severity | Sev2 |
| Notification | Page + Slack |
| Rationale | The intent-inference loop ticks every 30s when `INTENT_INFERENCE_ENABLED=1`. Zero ticks in a 5min window means the worker process or DB connection is wedged. This is the heartbeat proxy mandated by the launch-audit §3 worker SPOF section. |

### 4. Postgres CPU > 80% sustained 10min — **Sev2**

| Field | Value |
|---|---|
| Metric source | `rds` |
| Metric formula | `AWS/RDS::CPUUtilization{DBInstanceIdentifier=miamo-prod}` |
| Threshold | `> 80` |
| Evaluation window | 1 minute |
| Datapoints to alarm | 10/10 |
| Severity | Sev2 |
| Notification | Page + Slack |
| Rationale | Sustained high CPU on a `db.t4g.small` indicates a missing index, a runaway query, or a load spike. PgBouncer would help; for v1 we alarm and investigate. |

### 5. Postgres storage > 80% / > 90% — **Sev3 / Sev1**

| Field | Value |
|---|---|
| Metric source | `rds` |
| Metric formula | `AWS/RDS::FreeStorageSpace{DBInstanceIdentifier=miamo-prod}` (inverted as % used) |
| Thresholds | `> 80%` → Sev3 warn; `> 90%` → Sev1 page |
| Evaluation window | 5 minutes |
| Datapoints to alarm | 1/1 |
| Severity | Sev3 warn / Sev1 page |
| Notification | Slack for Sev3; Page + Slack for Sev1 |
| Rationale | RDS at 100% storage stops accepting writes. 90% is a hard page; 80% is a "schedule a maintenance window" warn. |

### 6. Redis memory > 75% — **Sev3**

| Field | Value |
|---|---|
| Metric source | `elasticache` |
| Metric formula | `AWS/ElastiCache::BytesUsedForCache / AWS/ElastiCache::FreeableMemory + BytesUsedForCache` |
| Threshold | `> 0.75` |
| Evaluation window | 5 minutes |
| Datapoints to alarm | 1/1 |
| Severity | Sev3 |
| Notification | Slack |
| Rationale | Redis at 100% memory either evicts (rate-limit + idempotency caches degrade gracefully) or refuses writes (tracking stream drops events). Either way it's a quality signal, not a customer-facing outage. |

### 7. EC2 CPU > 75% sustained 10min — **Sev3**

| Field | Value |
|---|---|
| Metric source | `ec2` |
| Metric formula | `AWS/EC2::CPUUtilization{InstanceId=miamo-prod-1}` |
| Threshold | `> 75` |
| Evaluation window | 1 minute |
| Datapoints to alarm | 10/10 |
| Severity | Sev3 |
| Notification | Slack |
| Rationale | Single-node v1 topology. CPU sustained ≥75% means contention between the 11 service containers. Scale the box or split tracking-worker off. |

### 8. EC2 disk > 80% — **Sev3**

| Field | Value |
|---|---|
| Metric source | `ec2` (CloudWatch agent) |
| Metric formula | `disk_used_percent{path="/",InstanceId=miamo-prod-1}` |
| Threshold | `> 80` |
| Evaluation window | 5 minutes |
| Datapoints to alarm | 1/1 |
| Severity | Sev3 |
| Notification | Slack |
| Rationale | Container logs + cold-store archives consume EBS. At 100% disk the docker daemon stops, taking everything down. 80% is the schedule-rotation trigger. |

### 9. `/metrics` scrape failure — **Sev2**

| Field | Value |
|---|---|
| Metric source | Prometheus alertmanager (or CloudWatch synthetic check) |
| Metric formula | `up{job="miamo"} == 0` for any service |
| Threshold | absent for > 2 minutes |
| Evaluation window | 2 minutes |
| Datapoints to alarm | 1/1 |
| Severity | Sev2 |
| Notification | Page + Slack |
| Rationale | If `/metrics` stops responding from a service, alarms 1-3 + 12 stop firing. This is the watchdog-of-the-watchdog. |

### 10. Sentry new uncaught error — **Sev3**

| Field | Value |
|---|---|
| Metric source | `sentry` |
| Metric formula | Sentry `issue.firstSeen` event for an unclassified fingerprint |
| Threshold | new issue + occurrence count >= 5 within first hour |
| Evaluation window | 60 minutes after `firstSeen` |
| Datapoints to alarm | n/a (event-driven) |
| Severity | Sev3 (page if novel + impacts > 1% of sessions; otherwise Slack) |
| Notification | Slack; auto-escalate to Page if Sentry's `impact > 0.01` |
| Rationale | Known issues already have tickets and shouldn't re-page on-call; novel issues that hit > 1% of sessions need eyes within the business hour. |

---

## KPI alarms (2)

### 11. Fairness Gini per gender > 0.45 over 6h — **Sev3**

| Field | Value |
|---|---|
| Metric source | `prom` |
| Metric formula | `max(miamo_fairness_gini_per_gender) > 0.45` |
| Threshold | `> 0.45` for any gender bucket |
| Evaluation window | 6 hours (matches the daily fairnessAudit cadence — the gauge updates once per audit run) |
| Datapoints to alarm | 1/1 |
| Severity | Sev3 |
| Notification | Slack + auto-ticket |
| Rationale | The `fairnessAudit` worker writes one Gini sample per gender bucket per run. The 0.45 threshold matches `FAIRNESS_AUDIT_GINI_ALERT`. Sustained excursion above 0.45 indicates the rerank knob needs retuning. |

### 12. Move v2 fallback rate > 5% over 1hr — **Sev3**

| Field | Value |
|---|---|
| Metric source | `prom` |
| Metric formula | `sum(rate(miamo_move_v2_suggestions_emitted_total{source="v1"}[1h])) / sum(rate(miamo_move_v2_suggestions_emitted_total[1h]))` |
| Threshold | `> 0.05` (5%) |
| Evaluation window | 1 hour |
| Datapoints to alarm | 1/1 |
| Severity | Sev3 |
| Notification | Slack + auto-ticket |
| Rationale | After `FEATURE_MOVE_V2_ENABLED=1` rolls out, the v1 composer path should only fire when the feature flag is explicitly off (a rollback). Sustained v1 > 5% under flag-on indicates routing or env-flag drift. |

---

## Suggested CloudWatch composite alarms (post-launch)

- **Customer-perceived outage composite**: any of #1, #4 (Postgres CPU), #5 (storage 90%), or #9 (scrape failure on gateway) → Sev1 page.
- **Data-loss risk composite**: any of #3 (worker stalled), #5 (storage 90%), or #6 (Redis memory) → Sev2 page with auto-snapshot of RDS.

These are deferred until CloudWatch alarm provisioning is in place.

## Implementation order

1. Provision base metrics scrape (Prometheus on EC2 sidecar OR CloudWatch agent dual-emit).
2. Implement #1, #3, #9 first — these are the on-call ladder rungs that catch every other failure mode.
3. Implement #4, #5, #6 — infra capacity alarms.
4. Implement #10 (Sentry) once DSN is provisioned via Secrets Manager.
5. Implement #2, #7, #8 — quality-of-service signals.
6. Implement #11, #12 — KPI alarms (require ≥24h of post-launch telemetry to baseline; tune thresholds from observed distribution).

## Open items

- [ ] Provision PagerDuty rotation + SNS topics.
- [ ] Wire Sentry SNS webhook for alarm #10.
- [ ] Confirm CloudWatch agent config emits `disk_used_percent` for alarm #8.
- [ ] Decide Prometheus vs CloudWatch as the canonical metric store; this doc assumes a hybrid (CloudWatch for infra alarms, Prometheus for application metrics).
- [ ] After 30 days, re-baseline thresholds from observed P50/P95 distributions.
