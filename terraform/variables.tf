# =============================================================================
# variables.tf — root-level inputs
# -----------------------------------------------------------------------------
# All knobs live here. Concrete values are supplied by
# environments/<env>/terraform.tfvars — never hardcode in .tf.
# =============================================================================

# ---------- Global -----------------------------------------------------------

variable "aws_region" {
  description = "AWS region (Mumbai for low RTT to India users)."
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name (prod, staging, dev). Used in name prefix and tags."
  type        = string
}

variable "project_name" {
  description = "Short project slug used in resource names."
  type        = string
  default     = "miamo"
}

# ---------- Networking -------------------------------------------------------

variable "vpc_cidr" {
  description = "IPv4 CIDR for the VPC."
  type        = string
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDRs (one per AZ). EC2 lives here (no NAT gateway, no private subnets — Postgres/Redis run in Docker on the EC2)."
  type        = list(string)
}

variable "availability_zones" {
  description = "AZs to spread subnets across. Length must match public_subnet_cidrs."
  type        = list(string)
}

# ---------- Compute (EC2) ----------------------------------------------------

variable "ec2_instance_type" {
  description = "EC2 instance size. t3.small = 2 vCPU / 2 GB, enough for 7 Node services at idle."
  type        = string
}

variable "ec2_root_volume_gb" {
  description = "Root EBS volume size (OS + Docker images + logs). Postgres data lives on a separate data volume."
  type        = number
}

variable "ec2_data_volume_gb" {
  description = "EBS gp3 data volume attached at /dev/sdf, mounted at /var/lib/docker so Postgres/Redis persistence survives EC2 replacement (survives everything short of terraform destroy)."
  type        = number
  default     = 20
}

variable "key_pair_name" {
  description = "EC2 key pair name. Empty string disables SSH — admin via SSM Session Manager only."
  type        = string
  default     = ""
}

# ---------- DNS --------------------------------------------------------------

variable "domain_name" {
  description = "Apex domain."
  type        = string
}

variable "cloudflare_zone_name" {
  description = "Cloudflare zone name (usually == domain_name)."
  type        = string
}

# ---------- App bootstrap ----------------------------------------------------

variable "app_repo_url" {
  description = "HTTPS git URL cloned by cloud-init on EC2."
  type        = string
}

variable "app_repo_branch" {
  description = "Branch to check out on first boot."
  type        = string
  default     = "main"
}

# ---------- Alerting ---------------------------------------------------------
# Removed: billing_alarm_threshold_usd + alarm_email. Billing metrics require
# us-east-1 which we intentionally do not use. Use AWS Budgets in the console
# (Billing → Budgets → Create budget) — free, and supports email alerts too.
