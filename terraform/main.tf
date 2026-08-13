# =============================================================================
# main.tf — module composition (root)
# -----------------------------------------------------------------------------
# Wiring order (Terraform infers this from the reference graph; listed here
# for humans):
#   network -> security -> parameters -> storage -> compute -> dns
#
# Postgres + Redis run as Docker containers on the EC2 (same pattern as local
# dev). No managed RDS / ElastiCache in this stack — the compute module
# provisions a dedicated EBS data volume for Postgres persistence.
# =============================================================================

data "aws_caller_identity" "current" {}

module "network" {
  source = "./modules/network"

  name_prefix         = local.name_prefix
  vpc_cidr            = var.vpc_cidr
  public_subnet_cidrs = var.public_subnet_cidrs
  availability_zones  = var.availability_zones
}

module "security" {
  source = "./modules/security"

  name_prefix = local.name_prefix
  vpc_id      = module.network.vpc_id
  vpc_cidr    = module.network.vpc_cidr
}

module "parameters" {
  source = "./modules/parameters"

  name_prefix = local.name_prefix
}

module "storage" {
  source = "./modules/storage"

  name_prefix   = local.name_prefix
  bucket_suffix = data.aws_caller_identity.current.account_id
}

module "compute" {
  source = "./modules/compute"

  name_prefix         = local.name_prefix
  instance_type       = var.ec2_instance_type
  root_volume_gb      = var.ec2_root_volume_gb
  data_volume_gb      = var.ec2_data_volume_gb
  key_pair_name       = var.key_pair_name
  public_subnet_id    = module.network.public_subnet_ids[0]
  availability_zone   = var.availability_zones[0]
  ec2_sg_id           = module.security.ec2_sg_id
  parameter_arns      = module.parameters.parameter_arns
  uploads_bucket_arn  = module.storage.uploads_bucket_arn
  uploads_bucket_name = module.storage.uploads_bucket_name
  app_repo_url        = var.app_repo_url
  app_repo_branch     = var.app_repo_branch
}

module "dns" {
  source = "./modules/dns"

  zone_name = var.cloudflare_zone_name
  origin_ip = module.compute.public_ip
}

# Monitoring module removed — billing alarm requires us-east-1 provider
# (AWS/Billing metric only exists there). Founder chose strictly ap-south-1;
# use AWS Budgets in the console + monthly manual review for cost oversight.
