# =============================================================================
# parameters/variables.tf
# -----------------------------------------------------------------------------
# Same interface as the removed `secrets` module, but backed by SSM Parameter
# Store (Standard tier) instead of Secrets Manager. Rationale: SM charges
# $0.40/secret/month; SSM SecureString parameters are free. Both are
# KMS-encrypted and IAM-gated.
#
# Inputs:
#   name_prefix : string — used as parameter path prefix (/miamo/prod/...)
#
# Outputs:
#   parameter_arns : map(string)   { jwt = "arn:...", postgres = "arn:...", ... }
#   parameter_names: map(string)   { jwt = "/miamo/prod/JWT_SECRET", ... }
#   postgres_password : string (sensitive) — passed straight to RDS
# =============================================================================

variable "name_prefix" {
  type = string
}
