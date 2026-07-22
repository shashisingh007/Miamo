# =============================================================================
# providers.tf — AWS (ap-south-1 only) + Cloudflare + random
# -----------------------------------------------------------------------------
# default_tags on the AWS provider is the single source of truth for tagging;
# every taggable AWS resource inherits these automatically. Do NOT re-tag
# resources module-by-module unless you need to override.
#
# Single-region stack: every resource in ap-south-1 (Mumbai). We intentionally
# do NOT define a us-east-1 alias — that means no CloudWatch billing alarm
# (AWS only publishes billing metrics in us-east-1). Rely on AWS Budgets
# and manual console review for cost oversight instead.
#
# Cloudflare auth comes from CLOUDFLARE_API_TOKEN in the environment (never
# put the token in tfvars).
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "miamo_vpc"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "shashi"
      CostCenter  = "miamo-launch"
    }
  }
}

provider "cloudflare" {
  # api_token is read from env: CLOUDFLARE_API_TOKEN
}

provider "random" {}
