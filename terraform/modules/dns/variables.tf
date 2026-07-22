# =============================================================================
# dns/variables.tf
# -----------------------------------------------------------------------------
# Inputs:
#   zone_name  : string   — the Cloudflare zone (e.g. "miamo.in")
#   origin_ip  : string   — EC2 Elastic IP the records point at
#
# Outputs:
#   zone_id, record_ids
# =============================================================================

variable "zone_name" {
  type = string
}

variable "origin_ip" {
  type = string
}
