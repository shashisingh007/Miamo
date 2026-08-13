output "zone_id" {
  value = data.cloudflare_zone.this.id
}

output "record_ids" {
  value = {
    apex = cloudflare_record.apex.id
    www  = cloudflare_record.www.id
    api  = cloudflare_record.api.id
  }
}
