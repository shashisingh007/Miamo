# =============================================================================
# backend.tf — remote state configuration
# -----------------------------------------------------------------------------
# The S3 bucket and DynamoDB lock table are pre-provisioned (out of band, so
# Terraform doesn't try to manage its own backend). Do NOT re-declare them as
# resources here.
#
#   Bucket : miamo-terraform-backend  (versioned, AES256, block-public)
#   Lock   : miamo-terraform-locks    (PAY_PER_REQUEST, HASH key = LockID)
#   Region : ap-south-1
# =============================================================================

terraform {
  backend "s3" {
    bucket         = "miamo-terraform-backend"
    key            = "prod/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "miamo-terraform-locks"
    encrypt        = true
  }
}
