output "vpc_id" {
  description = "VPC id."
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "VPC CIDR block."
  value       = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of public subnets (EC2 + future ALB)."
  value       = aws_subnet.public[*].id
}

output "public_route_table_id" {
  value = aws_route_table.public.id
}
