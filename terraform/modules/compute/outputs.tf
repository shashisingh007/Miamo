output "instance_id" {
  value = aws_instance.app.id
}

output "public_ip" {
  description = "Elastic IP — Cloudflare A records point here."
  value       = aws_eip.app.public_ip
}

output "iam_role_name" {
  value = aws_iam_role.ec2.name
}

output "iam_role_arn" {
  value = aws_iam_role.ec2.arn
}

output "data_volume_id" {
  description = "EBS volume holding /var/lib/docker (Postgres + Redis data). Snapshot for backups."
  value       = aws_ebs_volume.docker_data.id
}
