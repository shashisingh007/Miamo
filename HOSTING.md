# Hosting Miamo — the plain-English guide

**One paragraph:** Your dating app runs on a single small computer in AWS's Mumbai data center. A free service called Cloudflare stands in front and shows the world your website at `miamo.in`. Everything is set up in code (Terraform) so anyone can copy it, and nothing costs money for the first 12 months.

---

## What's actually running

Picture a single computer (the size of a small phone in server terms), sitting in a rack in Mumbai. That's your **EC2 t3.small** — 2 GB of memory, 2 CPU cores. Inside it, 12 tiny programs run at the same time using Docker:

- **7 backend services** — the brains: auth, users, matching, messaging, content, notifications, gateway (the front door)
- **1 web app** — the Next.js website users see
- **2 workers** — background jobs (tracking, analytics)
- **Postgres database** — where all data lives (users, matches, messages) — **runs as a Docker container on this same EC2**
- **Redis cache** — fast temporary memory for logins and rate-limiting — **runs as a Docker container on this same EC2**

Sitting next to that computer, but *outside* it:

- **S3 bucket** — where photos users upload go (uploads only; not the code)

Sitting in front of all this, on the internet:

- **Cloudflare** — hands out `miamo.in`, provides free HTTPS, blocks bots and hackers
- **GoDaddy** — where you registered `miamo.in` (nothing else)

**No managed RDS. No managed ElastiCache.** Postgres + Redis are Docker containers on the EC2 — same as local dev — so a fresh dev laptop and prod run identical stacks.

---

## How data survives

Postgres data lives in a **separate 20 GB EBS volume** attached to the EC2 at `/dev/sdf` and mounted at `/var/lib/docker`. Everything docker persists — Postgres tables, Redis snapshots, uploaded images cached in-app — sits on that dedicated volume.

- **Survives**: EC2 reboots, Docker restarts, `docker compose down && up`, `terraform apply` that only touches the instance (the volume detaches + reattaches to the replacement).
- **Does NOT survive**: `terraform destroy` (the volume is deleted with the stack).

### Backups — for now, manual

There is no automated backup yet. When you're ready to launch and start caring about data loss:

```bash
# Grab the volume ID (once):
aws ec2 describe-volumes --region ap-south-1 \
  --filters Name=tag:Name,Values=miamo-prod-docker-data \
  --query 'Volumes[0].VolumeId' --output text
# Take a snapshot:
aws ec2 create-snapshot --region ap-south-1 --volume-id vol-xxxxxxxxxxxxxxxxx \
  --description "miamo prod data $(date -u +%Y%m%d)"
```

**Deferred scale-up item**: a nightly Lambda + EventBridge rule that creates snapshots and prunes ones older than 7 days. Trivial to add once the app is live; not worth the wiring cost at 0 users.

---

## Where every piece lives

```
User visits miamo.in
        v
Cloudflare (global CDN, free)
   HTTPS, blocks attacks, caches
        v
Elastic IP (fixed public address)
        v
EC2 t3.small in Mumbai (ap-south-1)
   |- 7 backend Node services (ports 3200-3206)
   |- Next.js web (port 3100)
   |- Ingest + tracking-worker
   |- Postgres  (Docker; data on /dev/sdf -> /var/lib/docker)
   `- Redis     (Docker; data on /dev/sdf -> /var/lib/docker)
        v (uploads only)
    S3 bucket (Mumbai)  - user photo uploads, encrypted
```

---

## What it costs

### First 12 months (AWS "free tier")

| Piece | Free amount | Your usage | Cost/month |
|---|---|---|---|
| EC2 t3.small (2 GB) | not free (needs 2 GB) | 1 instance x 24x7 | **$19** |
| EBS root 20 GB (gp3) | free up to 30 GB | 20 GB | $0 |
| EBS data 20 GB (gp3) | free up to 30 GB total | 20 GB (40 GB EBS total, 10 GB over free tier) | ~$0.80 |
| Elastic IP (attached) | free while attached | 1 IP | $0 |
| S3 uploads | 5 GB free | pre-launch: <100 MB | $0 |
| VPC, subnets, gateways | always free | | $0 |
| SSM Parameter Store | always free | 5 secrets | $0 |
| Cloudflare | free tier is generous | | $0 |
| **Total** | | | **~$20/mo** |

**Your $200 credit lasts:** ~10 months.

### After month 13 — free tier expires

| Piece | Cost/month |
|---|---|
| EC2 t3.small | $19 |
| EBS root 20 GB | $1.60 |
| EBS data 20 GB | $1.60 |
| S3 (assumes ~1 GB user photos) | $0.15 |
| Everything else | $0 |
| **Total** | **~$22/mo** |

**Net savings vs. managed RDS:** ~**$14/mo post-free-tier** — dropped ($13/mo db.t3.micro + $2.76/mo RDS storage), added ($1.60/mo EBS data volume). During the free tier the savings are $0 (RDS was free anyway).

Rupees: **~₹1,850/month** at post-free-tier rates.

---

## What if something breaks — troubleshooting

### The site is down (`miamo.in` shows an error)

1. Check the EC2 is running: AWS Console -> EC2 -> Instances -> is the state "running"?
2. If yes, restart the containers: `ssh` into it via SSM Session Manager (no SSH key needed — click "Connect" in AWS Console), then `docker compose restart`
3. If EC2 itself is stopped: click Start. Costs a couple cents in downtime.

### Slow / laggy loads

- Cloudflare should be caching most things. Check `curl -I https://miamo.in` — you should see `cf-cache-status: HIT`.
- Log in to EC2, run `docker stats` — if one container is using >80% CPU or >500 MB RAM, that's the culprit.
- If Postgres is slow: `docker exec -it miamo-postgres psql -U miamo -c 'SELECT * FROM pg_stat_activity;'`

### Bill is higher than expected

- Set up AWS Budgets (2 minutes): AWS Console -> Billing -> Budgets -> Create -> $100 monthly -> email `shashi.singh@miamo.in`
- Common surprises: someone spawned an extra instance manually, S3 storage grew fast, data transfer OUT spiked
- Nuclear option: `cd terraform && terraform destroy -var-file=environments/prod/terraform.tfvars` — deletes everything, stops all charges. **This deletes the Postgres data volume too — snapshot first.**

### Ran out of disk

- Root EBS is 20 GB (OS + docker images). Data EBS is 20 GB (Postgres/Redis). Check both: `df -h`
- Clean docker images from root: `docker system prune -a` (does NOT delete named volumes / bind-mounted data)
- To grow root: in tfvars set `ec2_root_volume_gb = 40`, run `terraform apply`
- To grow data: in tfvars set `ec2_data_volume_gb = 40`, run `terraform apply` (volume expands online; SSH in and `sudo resize2fs /dev/nvme1n1` afterwards)

---

## How to deploy code changes

1. Push code to GitHub `main` branch
2. SSH into EC2 via SSM (AWS Console -> EC2 -> Connect -> Session Manager)
3. `cd /opt/miamo/app`
4. `git pull`
5. `docker compose up -d --build`
6. Site updated in 2 minutes with zero downtime (for services with health-checks)

For the first launch, this all happens automatically via cloud-init when EC2 boots for the first time.

---

## The scale-up path — when to upgrade

You'll know it's time to upgrade when:

| Signal | Action |
|---|---|
| EC2 RAM stays above 80% for hours | Bump `ec2_instance_type` from `t3.small` -> `t3.medium` (4 GB, $38/mo) |
| Postgres query latency > 100ms average | (a) bump instance size, or (b) migrate Postgres out of Docker onto managed RDS — export from the data volume, provision RDS, re-import |
| Handling >1000 concurrent users daily | Add an Application Load Balancer + 2nd EC2 (adds $30/mo but doubles reliability). Also the trigger to move Postgres to RDS so both EC2s can share it. |
| Handling >10,000 concurrent users daily | Migrate to Kubernetes (EKS) — 5-10x the operational complexity, but proper auto-scaling. Postgres definitely on RDS by this point. |

Each of these is a 1-line change in `terraform/environments/prod/terraform.tfvars` + `terraform apply` (except the RDS migration, which is 1 module re-add + a `pg_dump` / `pg_restore` cutover).

---

## The 3 accounts you need to know about

1. **AWS** — `802320707926` — where the actual servers live. You're user `Shashi`. Billing goes here.
2. **Cloudflare** — where DNS + SSL + firewall live. Free forever for this scale.
3. **GoDaddy** — where the domain `miamo.in` is registered. Renews annually (~₹1,000/year). Nameservers point at Cloudflare so GoDaddy is otherwise unused.

---

## The one manual step after Terraform runs

After `terraform apply` finishes:

- **GoDaddy nameservers** — change from `ns09.domaincontrol.com` / `ns10.domaincontrol.com` to `carrera.ns.cloudflare.com` / `dan.ns.cloudflare.com` (Cloudflare gave us these). This is done once at GoDaddy's control panel; takes 4 clicks. After that, DNS propagates globally in a few hours and your site goes live.

Everything else — VPC, EC2, EBS data volume, S3, secrets, Cloudflare records — Terraform does automatically.

---

## Files that describe all this

- `terraform/environments/prod/terraform.tfvars` — the "knobs" (instance sizes, region, etc.)
- `terraform/main.tf` — the "wiring" (how modules connect)
- `terraform/modules/*/` — the "parts" (network, compute, security, storage, dns, parameters)
- This file — the "instruction manual" (what you're reading)

---

_Total setup time from `terraform apply` to a live site at `https://miamo.in`: ~10 minutes (no RDS provisioning wait anymore — Postgres just docker-composes up in seconds)._
