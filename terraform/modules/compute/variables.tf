# =============================================================================
# compute/variables.tf
# -----------------------------------------------------------------------------
# Inputs:
#   name_prefix         : string
#   instance_type       : string (t3.small pre-launch)
#   root_volume_gb      : number  — OS + docker images
#   data_volume_gb      : number  — /var/lib/docker on its own gp3 volume
#                                    (Postgres + Redis persistence)
#   key_pair_name       : string ("" disables SSH)
#   public_subnet_id    : string (single AZ — one instance)
#   availability_zone   : string — AZ of the data volume; MUST match the
#                                   AZ the instance ends up in
#   ec2_sg_id           : string
#   parameter_arns      : map(string)  from parameters module (SSM ARNs)
#   uploads_bucket_arn  : string       from storage module
#   uploads_bucket_name : string
#   app_repo_url        : string
#   app_repo_branch     : string
#
# Outputs:
#   instance_id, public_ip (Elastic IP), iam_role_name, data_volume_id
# =============================================================================

variable "name_prefix" {
  type = string
}

variable "instance_type" {
  type = string
}

variable "root_volume_gb" {
  type = number
}

variable "data_volume_gb" {
  type    = number
  default = 20
}

variable "key_pair_name" {
  type = string
}

variable "public_subnet_id" {
  type = string
}

variable "availability_zone" {
  type = string
}

variable "ec2_sg_id" {
  type = string
}

variable "parameter_arns" {
  type = map(string)
}

variable "uploads_bucket_arn" {
  type = string
}

variable "uploads_bucket_name" {
  type = string
}

variable "app_repo_url" {
  type = string
}

variable "app_repo_branch" {
  type = string
}
