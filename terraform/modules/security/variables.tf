# =============================================================================
# security/variables.tf
# -----------------------------------------------------------------------------
# Inputs:
#   name_prefix : string
#   vpc_id      : string
#   vpc_cidr    : string (kept for future ALB/alb_sg ingress scoping)
#
# Outputs:
#   ec2_sg_id
#
# Removed pre-launch: rds_sg, redis_sg, alb_sg. Redis + Postgres run in
# Docker on the EC2 (docker bridge only, no AWS SG needed). Re-add rds_sg
# / redis_sg when migrating to managed RDS/ElastiCache; re-add alb_sg
# when introducing the ALB.
# =============================================================================

variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "vpc_cidr" {
  type = string
}
