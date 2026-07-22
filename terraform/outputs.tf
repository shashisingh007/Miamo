# =============================================================================
# outputs.tf — the "how do I reach my stuff" cheatsheet
# -----------------------------------------------------------------------------
# `terraform output` after apply prints these. Sensitive values (secret ARNs)
# are marked so they don't leak in CI logs.
#
# Postgres/Redis run inside Docker on the EC2 — no external endpoints, they
# are reachable only from other containers on the docker network via
# `postgres:5432` / `redis:6379`.
# =============================================================================

output "vpc_id" {
  value = module.network.vpc_id
}

output "public_subnet_ids" {
  value = module.network.public_subnet_ids
}

output "ec2_instance_id" {
  value = module.compute.instance_id
}

output "ec2_public_ip" {
  description = "Point Cloudflare A records here (already done via dns module)."
  value       = module.compute.public_ip
}

output "docker_data_volume_id" {
  description = "EBS volume ID holding /var/lib/docker (Postgres + Redis data). Snapshot this for backups."
  value       = module.compute.data_volume_id
}

output "uploads_bucket" {
  value = module.storage.uploads_bucket_name
}

output "parameter_arns" {
  description = "SSM Parameter Store ARNs (for reference; EC2 fetches via CLI)."
  value       = module.parameters.parameter_arns
  sensitive   = true
}

output "cloudflare_zone_id" {
  value = module.dns.zone_id
}

output "ssm_start_session_cmd" {
  description = "One-liner to open an admin shell without SSH."
  value       = "aws ssm start-session --region ${var.aws_region} --target ${module.compute.instance_id}"
}
