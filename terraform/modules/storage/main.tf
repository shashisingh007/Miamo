# =============================================================================
# storage/main.tf — S3 uploads bucket
# -----------------------------------------------------------------------------
# One bucket for user-uploaded media (photos, voice notes, later videos).
# Private today; will be fronted by CloudFront at launch. Standard tier +
# Intelligent-Tiering transition after 30 days to keep costs flat.
#
# Rules baked in:
#   - Versioning enabled (so a deleted profile photo is recoverable)
#   - AES-256 SSE at rest
#   - Block all public access
#   - Lifecycle: transition to Intelligent-Tiering @ 30d; abort multipart @ 1d
# =============================================================================

resource "aws_s3_bucket" "uploads" {
  bucket = "${var.name_prefix}-uploads-${var.bucket_suffix}"

  tags = {
    Name    = "${var.name_prefix}-uploads"
    Purpose = "user-uploads"
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }

  rule {
    id     = "transition-to-intelligent-tiering"
    status = "Enabled"

    filter {}

    transition {
      days          = 30
      storage_class = "INTELLIGENT_TIERING"
    }
  }

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# CORS so the web app can PUT directly from the browser via a presigned URL.
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = ["https://miamo.in", "https://www.miamo.in"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
