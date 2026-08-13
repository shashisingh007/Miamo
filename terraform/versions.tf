# =============================================================================
# versions.tf — Terraform + provider version constraints
# -----------------------------------------------------------------------------
# Pinned to the versions the modules were authored against. Bump deliberately
# after reading each provider's CHANGELOG (breaking changes are common in the
# AWS provider between minor releases).
# =============================================================================

terraform {
  required_version = "~> 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }

    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.30"
    }

    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
