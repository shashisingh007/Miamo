# =============================================================================
# parameters/main.tf — 5 SSM SecureString parameters + strong random values
# -----------------------------------------------------------------------------
# Parameters:
#   /miamo/prod/JWT_SECRET
#   /miamo/prod/INTERNAL_SERVICE_KEY
#   /miamo/prod/ENCRYPTION_KEY
#   /miamo/prod/TRACKING_HASH_SECRET
#   /miamo/prod/POSTGRES_PASSWORD
#
# EC2 reads each with:
#   aws ssm get-parameter --with-decryption --name /miamo/prod/JWT_SECRET \
#     --query 'Parameter.Value' --output text
#
# SecureString uses the default aws/ssm KMS key (no extra cost). If you want
# rotation-per-key, swap in a customer-managed key later.
# =============================================================================

locals {
  parameter_leaves = {
    jwt           = "JWT_SECRET"
    internal      = "INTERNAL_SERVICE_KEY"
    encryption    = "ENCRYPTION_KEY"
    tracking_hash = "TRACKING_HASH_SECRET"
    postgres      = "POSTGRES_PASSWORD"
  }
}

resource "random_password" "value" {
  for_each = local.parameter_leaves

  length = 64
  # Exclude quote-y and dollar-sign chars so the value drops cleanly into
  # shell-quoted .env lines without escape hell.
  special          = true
  override_special = "!#%&*+-./:<=>?@^_"
}

resource "aws_ssm_parameter" "this" {
  for_each = local.parameter_leaves

  name        = "/${var.name_prefix}/${each.value}"
  description = "Miamo ${each.value} (managed by terraform)."
  type        = "SecureString"
  tier        = "Standard"
  value       = random_password.value[each.key].result

  tags = {
    Name          = "${var.name_prefix}-${lower(replace(each.value, "_", "-"))}"
    ParameterType = each.key
  }

  lifecycle {
    # Values may be rotated out-of-band (`ALTER ROLE`, key rotations, etc.).
    # Terraform seeds them on first apply, then leaves them alone. If you
    # want a hard rotation via terraform, taint the corresponding
    # random_password.value["<key>"] and re-apply.
    ignore_changes = [value]
  }
}
