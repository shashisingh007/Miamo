# Miamo — Terraform infrastructure

**Total AWS cost during first 12 months: near zero. After: ~$22/month.**

Production-grade IaC for the Miamo dating app. One `t3.small` EC2 in Mumbai
(`ap-south-1`) fronted by Cloudflare, one S3 bucket for uploads. Postgres +
Redis run as Docker containers on the EC2 (same as local dev) — no managed
RDS, no managed ElastiCache. Everything else (secrets, DNS) sits in the free
tier or under a couple of dollars a month.

The stack is **pre-launch sized** — optimised for maximum AWS free-tier
utilisation over 12 months while keeping every knob ready to flip to
production sizing without a rewrite. Scale-up runbook is at the bottom.

---

## Prerequisites

- Terraform `~> 1.6` (tested on `1.13.2`).
- AWS credentials for account `802320707926`, IAM user `Shashi`.
  Export as env vars (do NOT commit):
  ```bash
  export AWS_ACCESS_KEY_ID=...
  export AWS_SECRET_ACCESS_KEY=...
  export AWS_DEFAULT_REGION=ap-south-1
  ```
- Cloudflare API token with `Zone:Edit` on the `miamo.in` zone:
  ```bash
  export CLOUDFLARE_API_TOKEN=cfat_...
  ```
- Backend already provisioned (do NOT touch):
  - S3 bucket `miamo-terraform-backend` (versioned, AES256, block-public)
  - DynamoDB table `miamo-terraform-locks`
  - Both in `ap-south-1`.

---

## Commands

```bash
cd terraform

# First-time init (pulls providers, wires the S3 backend).
terraform init

# Preview.
terraform plan -var-file=environments/prod/terraform.tfvars -out=prod.tfplan

# Apply the plan file (deterministic — never applies drift).
terraform apply prod.tfplan

# Nuke everything. WARNING: this destroys the Postgres/Redis data volume too
# (aws_ebs_volume.docker_data). Snapshot first if you care about the data.
terraform destroy -var-file=environments/prod/terraform.tfvars

# Format check (CI-friendly).
terraform fmt -check -recursive

# Static validation.
terraform validate
```

---

## Architecture

```
                          +--------------------------+
                          |  Cloudflare (miamo.in)   |
                          |  TLS + WAF + DDoS + CDN  |
                          +------------+-------------+
                                       |  HTTP (Flexible)
                                       v
+------------------------ VPC 10.20.0.0/16 (ap-south-1) ---------------------+
|                                                                            |
|  +-- public 10.20.1.0/24 (1a) --------+  +-- public 10.20.2.0/24 (1b) --+  |
|  |                                    |  |                              |  |
|  |  EC2 t3.small --> Docker stack     |  |  (spare AZ, no resources)    |  |
|  |  |- gateway :3200 (nginx :80)      |  |                              |  |
|  |  |- auth, users, social, messaging |  |                              |  |
|  |  |- content, notifications         |  |                              |  |
|  |  |- ingest, tracking-worker        |  |                              |  |
|  |  |- web (Next.js)                  |  |                              |  |
|  |  |- postgres (docker)              |  |                              |  |
|  |  `- redis    (docker)              |  |                              |  |
|  |  + Elastic IP                      |  |                              |  |
|  |  + EBS gp3 20 GB data volume       |  |                              |  |
|  |    attached at /dev/sdf,           |  |                              |  |
|  |    mounted /var/lib/docker         |  |                              |  |
|  +------------------------------------+  +------------------------------+  |
|                                                                            |
|  IGW --+--> public RT (0.0.0.0/0)                                          |
|        `--> (no NAT gateway; no private subnets)                           |
|                                                                            |
|  Gateway VPC endpoints (free): S3, DynamoDB                                |
+----------------------------------------------------------------------------+

     +----------------------+        +----------------------+
     |  S3 miamo-prod-      |        |  SSM Parameter Store |
     |  uploads-<acct>      |        |  /miamo/prod/*  (x5) |
     |  (SSE-AES256,        |        |  SecureString        |
     |   versioned,         |        |  (KMS aws/ssm)       |
     |   lifecycle -> IT)   |        +----------------------+
     +----------------------+
              ^                                 ^
              | IAM object-RW                   | IAM ssm:GetParameter
              +---------- EC2 instance profile -+
```

---

## Cost estimate — two columns

Prices are the ap-south-1 (Mumbai) list rate. `-` = zero. All values are
worst-case: they assume the free-tier hour cap is fully consumed and the
instance runs 24/7.

| Line item | Free-tier (first 12 months) | Post free-tier |
|---|---:|---:|
| EC2 `t3.small`, 720 h/mo | ~$19.00 (not free — needs 2 GB) | ~$19.00 |
| EBS gp3 root, 20 GB | **$0** (free 30 GB total) | ~$1.60 |
| EBS gp3 data, 20 GB (Postgres/Redis) | ~$0.80 (10 GB over the free 30 GB cap) | ~$1.60 |
| Elastic IP (attached, 1) | **$0** (free while attached) | ~$0 (attached) |
| S3 uploads bucket (<5 GB) | **$0** (free 5 GB) | ~$0.15 |
| S3 requests (dev traffic) | **$0** (free tier) | ~$0.05 |
| Data transfer out (Cloudflare cached) | **$0** (free 100 GB/mo) | ~$1.00 |
| VPC + subnets + IGW + route tables | **$0** | $0 |
| VPC gateway endpoints (S3, DynamoDB) | **$0** | $0 |
| SSM Parameter Store, 5 SecureString | **$0** | $0 |
| Security Groups, IAM, KMS default aws/ssm | **$0** | $0 |
| Cloudflare DNS + proxy + TLS | **$0** (Free plan) | $0 |
| **TOTAL / month** | **~$19.80** | **~$23.40** |

**Savings vs. managed RDS:** dropped ~$15.76/mo post-free-tier
(db.t3.micro $13 + RDS gp3+backup $2.76). Added ~$1.60/mo EBS data volume.
Net **~$14/mo cheaper** post-free-tier. In the free-tier window RDS was $0,
so savings there are close to $0 too — the win is architectural (identical
stack in dev and prod) more than cost-based.

---

## Trade-offs (portfolio review section)

**Postgres + Redis in Docker on the EC2, not RDS/ElastiCache.** Cheaper,
and — more importantly — dev and prod run byte-identical stacks (same
`docker-compose.yml`). Trade-offs: (1) no managed backups; must snapshot the
EBS data volume manually / via Lambda later. (2) Vertical scaling only; when
we need read replicas or Multi-AZ we migrate onto RDS. (3) The instance now
carries stateful workload — replacing it means `aws_volume_attachment`
detach-reattach cycles (Terraform handles this, but expect ~2 min of
downtime).

**Persistence lives on a dedicated 20 GB gp3 volume.** Attached at
`/dev/sdf`, mounted at `/var/lib/docker` by the cloud-init script before
`dockerd` starts. Survives instance replacement. Does NOT survive
`terraform destroy` — snapshot first.

**No ALB.** Cloudflare -> EC2 EIP directly. Saves ~$16/mo. Trade-off: no
path-based routing, no target-group health-checks, no autoscaling anchor,
no per-service TLS termination inside AWS. Cloudflare gives us TLS + WAF +
DDoS + caching for free. Bring the ALB back when we need autoscaling.

**No ACM.** ACM certificates only pair with an ALB / CloudFront in this
setup; without an ALB there's nothing to attach one to. Cloudflare uses
"Flexible" SSL: browser -> Cloudflare is HTTPS, Cloudflare -> origin is HTTP.
Not end-to-end-encrypted; acceptable for pre-launch, must upgrade to "Full
(strict)" mode with a real cert on the origin before real users hit it.

**No NAT gateway. No private subnets.** EC2 lives in a public subnet with
a security group lock. Nothing else needs private-subnet placement anymore
(Postgres lives on the EC2, not in an RDS subnet group). Saves ~$32/mo.
Trade-off: if any component ever needs to live truly private (secondary
EC2, Lambda), we'll pay the NAT tax then.

**Secrets Manager -> SSM Parameter Store (SecureString).** Secrets Manager
charges $0.40/secret/month. SSM SecureString is free for Standard tier and
uses the same KMS envelope encryption + IAM gating. Same security posture,
zero cost.

**No launch template / ASG.** Single instance, direct `aws_instance`.
Rolling instances is a manual `terraform taint aws_instance.app && apply`
today. When we scale we introduce an ASG (and, at that point, RDS — the
data volume can't be attached to two instances).

**Region: ap-south-1 (Mumbai).** Lowest RTT for the target user base. If
we go global, add a CloudFront distribution in front of everything — the
origin stays where it is.

---

## Scale-up runbook (0 -> real users)

When Priya starts inviting friends and load appears, flip these knobs in
order. Each is one edit to `environments/prod/terraform.tfvars` + a
`terraform apply` (except where a new module needs wiring in `main.tf`).

1. **Bigger EC2.** `ec2_instance_type = "t3.medium"` as swap starts
   appearing. Instance replacement is destructive for the OS disk; the
   docker data volume detaches + reattaches automatically.
2. **Bigger data volume.** `ec2_data_volume_gb = 40` (or 100). Volume grows
   online; `sudo resize2fs /dev/nvme1n1` inside the instance after apply.
3. **Postgres backup automation.** Add a Lambda + EventBridge rule that
   snapshots the data volume nightly and prunes >7-day-old snapshots.
4. **Migrate Postgres to RDS.** Add back the `database` module (git blame
   this commit for the reference), wire up a Multi-AZ RDS, then `pg_dump`
   from the docker Postgres + `pg_restore` into RDS. Swap `DATABASE_URL`
   in SSM to point at the RDS endpoint. Same for Redis -> ElastiCache when
   needed. This is the trigger to bring back private subnets.
5. **Introduce ALB.** Un-comment/enable an `alb` module and wire in an
   `aws_lb`, target group, and listener rules. Add back an
   `aws_security_group.alb`. Then in `security` swap EC2 SG ingress from
   Cloudflare CIDRs on `80` to `security_groups = [alb_sg.id]` on `3200`.
   Add a Cloudflare DNS record pointing at the ALB DNS name.
6. **ACM certificate.** In us-east-1 for CloudFront, in ap-south-1 for the
   ALB. Attach to the ALB HTTPS:443 listener. Switch Cloudflare SSL mode
   to "Full (strict)".
7. **Autoscaling group.** Convert `aws_instance.app` into an
   `aws_launch_template` + `aws_autoscaling_group` behind the ALB. Add a
   scale-out policy on CPU > 70%. (Requires step 4 done first — you can't
   ASG a stateful docker Postgres.)
8. **CloudFront + WAF.** For the API, keep Cloudflare. For the S3 uploads
   bucket, front with CloudFront + signed URLs so we can drop bucket
   public access entirely.
9. **Observability.** Add a `cloudwatch` module with dashboards + custom
   alarms per service (5xx rate, p95 latency, RDS CPU/connections, EBS
   burst balance).
10. **Secrets rotation.** Attach `aws_secretsmanager_secret_rotation` (or
    switch to a rotating password service) once we move real user data
    into RDS.

---

## Repo layout

```
terraform/
├── backend.tf                  # S3 remote state (existing bucket)
├── versions.tf                 # tf 1.6, aws 5.60, cloudflare 4.30, random 3.6
├── providers.tf                # aws + cloudflare + random
├── main.tf                     # module composition
├── variables.tf                # every knob, typed + documented
├── outputs.tf                  # VPC id, EIP, S3 bucket, data-volume id, SSM cmd
├── locals.tf                   # name_prefix, common_tags
├── environments/
│   └── prod/
│       └── terraform.tfvars    # concrete prod values
└── modules/
    ├── network/       # VPC, 2 public subnets, IGW, RT, S3+DynamoDB gateway endpoints
    ├── security/      # 1 SG: ec2 (CF-only 80)
    ├── parameters/    # 5 SSM SecureString params + random_password
    ├── storage/       # S3 uploads bucket + versioning + SSE + lifecycle + CORS
    ├── compute/       # EC2 t3.small + IAM role + EIP + 20 GB EBS data volume + cloud-init
    └── dns/           # Cloudflare apex + www + api records (all proxied)
```

Each module has `versions.tf` + `variables.tf` + `main.tf` + `outputs.tf`
and a comment header documenting inputs + outputs. tfvars is the ONLY
place concrete environment values live.
