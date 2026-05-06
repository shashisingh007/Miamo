#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Miamo — Shared Configuration Loader
# ═══════════════════════════════════════════════════════════════════
# Source this file in any script: source scripts/_config.sh <env>
# ALL values come from: configuration/<env>/values.yaml
# ═══════════════════════════════════════════════════════════════════

_ENV="${1:-}"
_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")"; pwd)"
_ROOT="$(cd "$_SCRIPT_DIR/.." && pwd)"
_CONFIG="$_ROOT/configuration/$_ENV/values.yaml"

# Colors
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; NC='\033[0m'

# Validate
if [[ -z "$_ENV" ]] || [[ ! -f "$_CONFIG" ]]; then
  echo -e "${R}✗ Usage: bash scripts/<command>.sh <env>${NC}"
  echo -e "  Available environments:"
  for d in "$_ROOT"/configuration/*/values.yaml; do
    [[ -f "$d" ]] && echo -e "    ${G}•${NC} $(basename $(dirname $d))"
  done
  exit 1
fi

# ─── YAML Parser ─────────────────────────────────────────────────
# Reads all values from configuration/<env>/values.yaml
val() {
  if [[ -z "${2:-}" ]]; then
    grep "^${1}:" "$_CONFIG" | head -1 | sed 's/^[^:]*: *"\{0,1\}\([^"]*\)"\{0,1\}$/\1/'
  else
    sed -n "/^${1}:/,/^[a-z]/p" "$_CONFIG" | grep "^  ${2}:" | head -1 | sed 's/^[^:]*: *"\{0,1\}\([^"]*\)"\{0,1\}$/\1/'
  fi
}

# ─── Load ALL values into variables ──────────────────────────────
ENV="$_ENV"
CONFIG="$_CONFIG"
ROOT="$_ROOT"

CLUSTER_HOST=$(val "cluster_host")
NAMESPACE=$(val "namespace")
SERVICE_PORT=$(val "service_port")

AUTH_PORT=$(val "container_ports" "auth")
USERS_PORT=$(val "container_ports" "users")
SOCIAL_PORT=$(val "container_ports" "social")
MESSAGING_PORT=$(val "container_ports" "messaging")
CONTENT_PORT=$(val "container_ports" "content")
NOTIFICATIONS_PORT=$(val "container_ports" "notifications")
GATEWAY_PORT=$(val "container_ports" "gateway")
WEB_PORT=$(val "container_ports" "web")

GATEWAY_NODEPORT=$(val "node_ports" "gateway")
WEB_NODEPORT=$(val "node_ports" "web")

IMAGE_REGISTRY=$(val "images" "registry")
IMAGE_TAG=$(val "images" "tag")
PULL_POLICY=$(val "images" "pull_policy")

DB_HOST=$(val "database" "host")
DB_PORT=$(val "database" "port")
DB_NAME=$(val "database" "name")
DB_USER=$(val "database" "user")
DB_PASS=$(val "database" "password")

REDIS_HOST=$(val "redis" "host")
REDIS_PORT=$(val "redis" "port")

JWT_SECRET=$(val "secrets" "jwt_secret")
INTERNAL_KEY=$(val "secrets" "internal_service_key")

REQ_MEM=$(val "resources" "requests_memory")
REQ_CPU=$(val "resources" "requests_cpu")
LIM_MEM=$(val "resources" "limits_memory")
LIM_CPU=$(val "resources" "limits_cpu")

REPLICAS=$(val "replicas")
NODE_ENV=$(val "node_env")

# Derived
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"
IMAGE_PREFIX=""
[[ -n "$IMAGE_REGISTRY" ]] && IMAGE_PREFIX="${IMAGE_REGISTRY}/"
true  # ensure exit 0 when sourced
