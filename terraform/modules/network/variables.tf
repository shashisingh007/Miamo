# =============================================================================
# network/variables.tf
# -----------------------------------------------------------------------------
# Inputs:
#   name_prefix         : string  — resource name stem
#   vpc_cidr            : string
#   public_subnet_cidrs : list(string) — one per AZ (EC2 + future ALB)
#   availability_zones  : list(string)
#
# Outputs (see outputs.tf):
#   vpc_id, vpc_cidr, public_subnet_ids, public_route_table_id
# =============================================================================

variable "name_prefix" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "public_subnet_cidrs" {
  type = list(string)
}

variable "availability_zones" {
  type = list(string)

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "Need at least 2 AZs so we can add an ALB later without re-cidr'ing."
  }
}
