# =============================================================================
# security/main.tf — 1 security group (least privilege)
# -----------------------------------------------------------------------------
# Pre-launch topology has no ALB and no managed RDS/ElastiCache — Postgres
# and Redis run as Docker containers on the EC2 and speak to the other
# containers over the internal docker bridge (never on any AWS interface),
# so no ingress rule is needed for 5432 / 6379.
#
#   ec2_sg : 80 from Cloudflare edge IPs only. No SSH (admin via SSM).
#
# When the ALB module lands, add an alb_sg and swap ec2_sg ingress to
# `security_groups = [alb_sg.id]` on port 3200.
# =============================================================================

# Cloudflare's published edge IP ranges. If they change we re-apply.
# Source: https://www.cloudflare.com/ips/
locals {
  cloudflare_ipv4_ranges = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ]
}

# ---------- EC2 SG -----------------------------------------------------------

resource "aws_security_group" "ec2" {
  name        = "${var.name_prefix}-ec2-sg"
  description = "EC2 ingress: 80 from Cloudflare only. No SSH."
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP from Cloudflare edge"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = local.cloudflare_ipv4_ranges
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.name_prefix}-ec2-sg"
  }
}
