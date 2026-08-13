# =============================================================================
# storage/variables.tf
# -----------------------------------------------------------------------------
# Inputs:
#   name_prefix  : string
#   bucket_suffix: string — appended to the bucket name for uniqueness.
#                  Buckets share a global namespace; passing the account id
#                  here keeps the name predictable.
#
# Outputs:
#   uploads_bucket_name, uploads_bucket_arn
# =============================================================================

variable "name_prefix" {
  type = string
}

variable "bucket_suffix" {
  type        = string
  description = "Suffix (typically AWS account id) to guarantee bucket-name uniqueness."
}
