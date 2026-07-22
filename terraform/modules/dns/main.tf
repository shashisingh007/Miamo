# =============================================================================
# dns/main.tf — Cloudflare records for miamo.in
# -----------------------------------------------------------------------------
# Three records point at the EC2 Elastic IP:
#   miamo.in         A  proxied
#   www.miamo.in     CNAME miamo.in proxied
#   api.miamo.in     A  proxied
#
# All records are proxied (orange cloud) so Cloudflare terminates TLS, adds
# WAF + DDoS + caching, and hides the origin IP from the internet.
# =============================================================================

data "cloudflare_zone" "this" {
  name = var.zone_name
}

resource "cloudflare_record" "apex" {
  zone_id = data.cloudflare_zone.this.id
  name    = "@"
  content = var.origin_ip
  type    = "A"
  ttl     = 1 # 1 == automatic when proxied
  proxied = true
  comment = "Miamo apex — points at EC2 EIP"
}

resource "cloudflare_record" "www" {
  zone_id = data.cloudflare_zone.this.id
  name    = "www"
  content = var.zone_name
  type    = "CNAME"
  ttl     = 1
  proxied = true
  comment = "www -> apex"
}

resource "cloudflare_record" "api" {
  zone_id = data.cloudflare_zone.this.id
  name    = "api"
  content = var.origin_ip
  type    = "A"
  ttl     = 1
  proxied = true
  comment = "Miamo gateway origin"
}
