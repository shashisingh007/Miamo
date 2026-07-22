# =============================================================================
# compute/main.tf — EC2 (single instance) + Elastic IP + EBS data volume +
#                   IAM instance profile
# -----------------------------------------------------------------------------
# Pre-launch topology: one t3.small in a public subnet with an Elastic IP.
# Cloudflare A records point at that EIP. There is intentionally no launch
# template / ASG — one instance, one EIP, direct.
#
# Postgres + Redis run as Docker containers on this instance. To keep their
# data durable across instance replacement, a dedicated 20 GB gp3 EBS volume
# is attached at /dev/sdf and mounted at /var/lib/docker before Docker starts.
# The volume is NOT deleted with the instance — but it IS deleted by
# `terraform destroy` (no lifecycle prevent_destroy on it; add one manually
# if you want harder protection). Snapshot it with:
#   aws ec2 create-snapshot --region ap-south-1 --volume-id <id>
#
# The IAM instance profile grants:
#   - ssm:*  via AmazonSSMManagedInstanceCore (admin without SSH)
#   - ssm:GetParameter[s] scoped to /miamo/prod/* (fetch app secrets)
#   - kms:Decrypt on the default aws/ssm key (implicit via SSM path)
#   - s3:{Get,Put,Delete}Object scoped to the uploads bucket
# =============================================================================

# ---------- AMI lookup: latest AL2023 x86_64 --------------------------------

data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

# ---------- IAM role + instance profile -------------------------------------

data "aws_iam_policy_document" "assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "${var.name_prefix}-ec2-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json

  tags = {
    Name = "${var.name_prefix}-ec2-role"
  }
}

# SSM Session Manager
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# SSM Parameter Store — read the 5 Miamo params. KMS decrypt on the default
# aws/ssm alias is granted automatically to callers of ssm:GetParameter that
# also have kms:Decrypt on that key; we grant kms:Decrypt via a wildcard on
# the default SSM key (the only key SecureString params use here).
data "aws_iam_policy_document" "params_read" {
  statement {
    sid       = "ReadMiamoParams"
    effect    = "Allow"
    actions   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
    resources = ["arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.name_prefix}/*"]
  }

  statement {
    sid       = "DecryptSSMKey"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["arn:aws:kms:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:alias/aws/ssm"]
  }
}

resource "aws_iam_policy" "params_read" {
  name        = "${var.name_prefix}-ssm-params-read"
  description = "Read /${var.name_prefix}/* SSM parameters (SecureString)."
  policy      = data.aws_iam_policy_document.params_read.json
}

resource "aws_iam_role_policy_attachment" "params_read" {
  role       = aws_iam_role.ec2.name
  policy_arn = aws_iam_policy.params_read.arn
}

# S3 uploads bucket — object-level RW only, no bucket-admin.
data "aws_iam_policy_document" "s3_uploads_rw" {
  statement {
    effect    = "Allow"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [var.uploads_bucket_arn]
  }

  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:AbortMultipartUpload"]
    resources = ["${var.uploads_bucket_arn}/*"]
  }
}

resource "aws_iam_policy" "s3_uploads_rw" {
  name        = "${var.name_prefix}-s3-uploads-rw"
  description = "Object-level RW on the uploads bucket."
  policy      = data.aws_iam_policy_document.s3_uploads_rw.json
}

resource "aws_iam_role_policy_attachment" "s3_uploads_rw" {
  role       = aws_iam_role.ec2.name
  policy_arn = aws_iam_policy.s3_uploads_rw.arn
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2.name

  tags = {
    Name = "${var.name_prefix}-ec2-profile"
  }
}

# ---------- User data --------------------------------------------------------

locals {
  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    app_repo_url          = var.app_repo_url
    app_repo_branch       = var.app_repo_branch
    domain_name           = "miamo.in"
    uploads_bucket_name   = var.uploads_bucket_name
    jwt_param_name        = "/${var.name_prefix}/JWT_SECRET"
    internal_param_name   = "/${var.name_prefix}/INTERNAL_SERVICE_KEY"
    encryption_param_name = "/${var.name_prefix}/ENCRYPTION_KEY"
    tracking_param_name   = "/${var.name_prefix}/TRACKING_HASH_SECRET"
    postgres_param_name   = "/${var.name_prefix}/POSTGRES_PASSWORD"
  })
}

# ---------- EC2 instance -----------------------------------------------------

resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.al2023.value
  instance_type          = var.instance_type
  key_name               = var.key_pair_name == "" ? null : var.key_pair_name
  subnet_id              = var.public_subnet_id
  availability_zone      = var.availability_zone
  vpc_security_group_ids = [var.ec2_sg_id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  metadata_options {
    http_tokens                 = "required" # IMDSv2 only
    http_put_response_hop_limit = 2
    http_endpoint               = "enabled"
  }

  root_block_device {
    volume_size           = var.root_volume_gb
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  user_data = local.user_data

  tags = {
    Name = "${var.name_prefix}-app"
  }

  lifecycle {
    # user_data changes shouldn't force a re-create in day-to-day ops;
    # roll the instance manually when userdata needs to change.
    ignore_changes = [ami, user_data]
  }
}

# ---------- EBS data volume for /var/lib/docker -----------------------------
# Postgres + Redis persistence lives here. Detach + reattach across instance
# replacements to keep data. `terraform destroy` DOES delete this — snapshot
# first if you care.

resource "aws_ebs_volume" "docker_data" {
  availability_zone = var.availability_zone
  size              = var.data_volume_gb
  type              = "gp3"
  encrypted         = true

  tags = {
    Name = "${var.name_prefix}-docker-data"
  }
}

resource "aws_volume_attachment" "docker_data" {
  device_name  = "/dev/sdf"
  volume_id    = aws_ebs_volume.docker_data.id
  instance_id  = aws_instance.app.id
  force_detach = true
}

# ---------- Elastic IP ------------------------------------------------------

resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"

  tags = {
    Name = "${var.name_prefix}-eip"
  }
}
