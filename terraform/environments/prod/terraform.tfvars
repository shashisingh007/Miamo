# =============================================================================
# prod tfvars — the ONLY place concrete values live for the production env
# -----------------------------------------------------------------------------
# Pre-launch sizing (zero users). Optimized for maximum AWS free-tier + $200
# credits over 6-12 months. Scale-up paths documented in ../../README.md.
# =============================================================================

aws_region   = "ap-south-1"
environment  = "prod"
project_name = "miamo"

# ---------- Networking -------------------------------------------------------
# No private subnets — Postgres + Redis run as Docker containers on the EC2.
# 2 public subnet CIDRs are kept so the VPC still spans 2 AZs (cheap; leaves
# room for a future ALB without re-cidr'ing).
vpc_cidr            = "10.20.0.0/16"
public_subnet_cidrs = ["10.20.1.0/24", "10.20.2.0/24"]
availability_zones  = ["ap-south-1a", "ap-south-1b"]

# ---------- Compute ----------------------------------------------------------
# t3.micro — Free Tier eligible (750h/mo of t2.micro or t3.micro, first
# 12 months). Only viable because images are prebuilt on Mac + pushed to
# GHCR (see scripts/miamo-build-push.sh); EC2 never runs `docker build`
# so the 1 GB RAM is enough for the 13 running containers + 2 GB swap.
# Post-Free-Tier (2027-07-20): reconsider t3.small at $16/mo if RAM tight.
ec2_instance_type  = "t3.micro"
ec2_root_volume_gb = 20 # OS + docker images; stays under 30 GB free-tier EBS ceiling
ec2_data_volume_gb = 40 # /var/lib/docker on its own gp3 volume — Postgres/Redis persistence
                        # +$0.91/mo per 10 GB above 20. Grew from 20→40 on 2026-07-22
                        # after the 13-container stack (5.5 GB baseline images +
                        # buildkit cache during --no-cache builds) filled the disk.
key_pair_name      = "" # admin via SSM Session Manager only

# ---------- DNS --------------------------------------------------------------
domain_name          = "miamo.in"
cloudflare_zone_name = "miamo.in"

# ---------- App bootstrap ----------------------------------------------------
app_repo_url    = "https://github.com/shashisingh007/Miamo.git"
app_repo_branch = "main"

# ---------- Alerting ---------------------------------------------------------
# CloudWatch billing alarm removed — required a us-east-1 provider we don't
# use. Set up AWS Budgets in the console (Billing → Budgets) for cost alerts.
