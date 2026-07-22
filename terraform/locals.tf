# =============================================================================
# locals.tf — computed values shared across the root module
# -----------------------------------------------------------------------------
# name_prefix is the human-readable stem of every resource name
# (e.g. "miamo-prod-alb"). common_tags is an escape hatch for the rare
# resource that doesn't respect provider default_tags.
# =============================================================================

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = "miamo_vpc"
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = "shashi"
    CostCenter  = "miamo-launch"
  }
}
