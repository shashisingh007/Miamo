output "parameter_arns" {
  description = "Logical key -> SSM Parameter ARN (for IAM policy scoping)."
  value       = { for k, v in aws_ssm_parameter.this : k => v.arn }
}

output "parameter_names" {
  description = "Logical key -> SSM Parameter Name (for CLI lookup in cloud-init)."
  value       = { for k, v in aws_ssm_parameter.this : k => v.name }
}

output "postgres_password" {
  description = "Generated Postgres password — passed straight to RDS."
  value       = random_password.value["postgres"].result
  sensitive   = true
}
