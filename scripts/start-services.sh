#!/bin/bash
# ═══════════════════════════════════════════════════════
# Miamo — Unified Deployment Script
# ═══════════════════════════════════════════════════════
#
# LOCAL (bare-metal):
#   bash scripts/start-services.sh local start
#   bash scripts/start-services.sh local stop
#   bash scripts/start-services.sh local restart
#   bash scripts/start-services.sh local status
#   bash scripts/start-services.sh local logs <service>
#   bash scripts/start-services.sh local test
#
# DOCKER COMPOSE (containerised local):
#   bash scripts/start-services.sh docker up
#   bash scripts/start-services.sh docker down
#   bash scripts/start-services.sh docker restart
#   bash scripts/start-services.sh docker status
#   bash scripts/start-services.sh docker logs <service>
#   bash scripts/start-services.sh docker build
#   bash scripts/start-services.sh docker clean
#
# KUBERNETES:
#   bash scripts/start-services.sh k8s deploy   <env>          # env = dev|staging|prod
#   bash scripts/start-services.sh k8s destroy  <env>
#   bash scripts/start-services.sh k8s status   <env>
#   bash scripts/start-services.sh k8s logs     <env> <svc>
#   bash scripts/start-services.sh k8s restart  <env> <svc>
#   bash scripts/start-services.sh k8s scale    <env> <svc> <replicas>
#   bash scripts/start-services.sh k8s migrate  <env>
#   bash scripts/start-services.sh k8s rollback <env> <svc>
#
set -euo pipefail

MIAMO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$MIAMO_DIR"

# ─── Colours ──────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
BLUE='\033[0;34m'; PURPLE='\033[0;35m'; CYAN='\033[0;36m'; NC='\033[0m'

# ─── Constants ────────────────────────────────────────
SERVICES="gateway:3200 auth:3201 users:3202 social:3203 messaging:3204 content:3205 notifications:3206"
LOG_DIR="/tmp/miamo-logs"
PID_DIR="/tmp/miamo-pids"
K8S_TEMPLATES="$MIAMO_DIR/k8s/templates"
K8S_OUTPUT="/tmp/miamo-k8s-rendered"

# ═══════════════════════════════════════════════════════
#  LOCAL — bare-metal dev (tsx watch)
# ═══════════════════════════════════════════════════════
local_env() {
  export DATABASE_URL='postgresql://miamo:miamo@localhost:5432/miamo?schema=public'
  export JWT_SECRET='miamo-dev-jwt-secret-change-in-production-2026'
  export INTERNAL_SERVICE_KEY='miamo-internal-dev-key'
  export ENCRYPTION_KEY='miamo-dev-encrypt-key-32-bytes!!'
  export NODE_ENV='development'
  export FRONTEND_URL='http://localhost:3100'
  export GATEWAY_URL='http://localhost:3200'
  export AUTH_SERVICE_URL='http://localhost:3201'
  export USER_SERVICE_URL='http://localhost:3202'
  export SOCIAL_SERVICE_URL='http://localhost:3203'
  export MESSAGING_SERVICE_URL='http://localhost:3204'
  export CONTENT_SERVICE_URL='http://localhost:3205'
  export NOTIFICATION_SERVICE_URL='http://localhost:3206'
}

local_stop() {
  echo -e "${YELLOW}Stopping all Miamo services...${NC}"
  for entry in $SERVICES; do
    svc=$(echo "$entry" | cut -d: -f1)
    port=$(echo "$entry" | cut -d: -f2)
    if [ -f "$PID_DIR/$svc.pid" ]; then
      pid=$(cat "$PID_DIR/$svc.pid")
      kill "$pid" 2>/dev/null && echo -e "  ${RED}✗${NC} $svc stopped" || true
      rm -f "$PID_DIR/$svc.pid"
    fi
    lsof -ti:"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
  done
  echo -e "${GREEN}All services stopped.${NC}"
}

local_status() {
  echo -e "\n${BLUE}══ Miamo Service Status (local) ════════${NC}"
  for entry in $SERVICES; do
    svc=$(echo "$entry" | cut -d: -f1)
    port=$(echo "$entry" | cut -d: -f2)
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:$port/health" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
      echo -e "  ${GREEN}✓${NC} $(printf '%-15s' "$svc") :$port  ${GREEN}OK${NC}"
    else
      echo -e "  ${RED}✗${NC} $(printf '%-15s' "$svc") :$port  ${RED}DOWN${NC} ($code)"
    fi
  done
  echo ""
}

local_start() {
  local_env
  mkdir -p "$LOG_DIR" "$PID_DIR"

  echo -e "\n${PURPLE}╔══════════════════════════════════════╗${NC}"
  echo -e "${PURPLE}║   Miamo — Local Dev Environment      ║${NC}"
  echo -e "${PURPLE}╚══════════════════════════════════════╝${NC}\n"

  # Kill existing
  for entry in $SERVICES; do
    port=$(echo "$entry" | cut -d: -f2)
    lsof -ti:"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
  done
  sleep 1

  for entry in $SERVICES; do
    svc=$(echo "$entry" | cut -d: -f1)
    port=$(echo "$entry" | cut -d: -f2)
    PORT=$port npx --yes tsx watch "services/$svc/src/server.ts" > "$LOG_DIR/$svc.log" 2>&1 &
    echo $! > "$PID_DIR/$svc.pid"
    echo -e "  ${GREEN}▶${NC} Started $svc on :$port (PID $!)"
  done

  echo -e "\n${YELLOW}Waiting 10s for bootup...${NC}"
  sleep 10
  local_status
  echo -e "  ${GREEN}Frontend:${NC} http://localhost:3100"
  echo -e "  ${GREEN}API:${NC}      http://localhost:3200\n"
}

local_test() {
  echo -e "${BLUE}Running test suite...${NC}"
  python3 "$MIAMO_DIR/scripts/test-all.py"
}

local_cmd() {
  case "${1:-start}" in
    start)   local_start ;;
    stop)    local_stop ;;
    restart) local_stop; sleep 2; local_start ;;
    status)  local_status ;;
    test)    local_test ;;
    logs)    tail -150 "$LOG_DIR/${2:-gateway}.log" ;;
    *)       echo "Usage: $0 local {start|stop|restart|status|logs <svc>|test}" ;;
  esac
}

# ═══════════════════════════════════════════════════════
#  DOCKER — docker compose
# ═══════════════════════════════════════════════════════
docker_cmd() {
  case "${1:-up}" in
    up)
      echo -e "${PURPLE}╔══════════════════════════════════════╗${NC}"
      echo -e "${PURPLE}║   Miamo — Docker Compose             ║${NC}"
      echo -e "${PURPLE}╚══════════════════════════════════════╝${NC}"
      docker compose up -d --build
      echo -e "\n${YELLOW}Waiting for health checks...${NC}"
      sleep 15
      docker compose ps
      echo -e "\n  ${GREEN}Frontend:${NC} http://localhost:3100"
      echo -e "  ${GREEN}API:${NC}      http://localhost:3200\n"
      ;;
    down)
      echo -e "${YELLOW}Stopping Docker containers...${NC}"
      docker compose down
      echo -e "${GREEN}All containers stopped.${NC}"
      ;;
    restart)
      docker compose restart "${2:-}"
      ;;
    status)
      docker compose ps
      ;;
    logs)
      docker compose logs -f --tail=100 "${2:-gateway}"
      ;;
    build)
      echo -e "${BLUE}Building all Docker images...${NC}"
      docker compose build --parallel
      echo -e "${GREEN}Build complete.${NC}"
      ;;
    clean)
      echo -e "${RED}Removing containers, volumes, and images...${NC}"
      docker compose down -v --rmi local
      echo -e "${GREEN}Cleaned up.${NC}"
      ;;
    *)
      echo "Usage: $0 docker {up|down|restart [svc]|status|logs [svc]|build|clean}"
      ;;
  esac
}

# ═══════════════════════════════════════════════════════
#  KUBERNETES — template-based deploy
# ═══════════════════════════════════════════════════════

# Environment config per namespace
k8s_env_config() {
  local env="$1"
  case "$env" in
    dev)
      NS="miamo-dev"
      ENV_LABEL="dev"
      NODE_ENV="development"
      DB_USER="miamo"
      DB_PASS="miamo"
      DB_NAME="miamo"
      DB_PORT="5432"
      REDIS_PORT="6379"
      JWT_SECRET="miamo-dev-jwt-secret-change-in-production-2026"
      INTERNAL_KEY="miamo-internal-dev-key"
      CLUSTER_HOST="localhost"
      IMAGE_PREFIX=""
      IMAGE_TAG="latest"
      PULL_POLICY="Never"
      SVC_PORT="3000"
      GATEWAY_PORT="3200"
      WEB_PORT="3100"
      GATEWAY_NODEPORT="30200"
      WEB_NODEPORT="30100"
      REPLICAS="1"
      REQ_MEM="64Mi";  REQ_CPU="50m"
      LIM_MEM="256Mi"; LIM_CPU="500m"
      MIN_REPLICAS="1"; MAX_REPLICAS="2"
      ;;
    staging)
      NS="miamo-staging"
      ENV_LABEL="staging"
      NODE_ENV="staging"
      DB_USER="miamo_stg"
      DB_PASS="\${MIAMO_STG_DB_PASS}"
      DB_NAME="miamo_staging"
      DB_PORT="5432"
      REDIS_PORT="6379"
      JWT_SECRET="\${MIAMO_STG_JWT_SECRET}"
      INTERNAL_KEY="\${MIAMO_STG_INTERNAL_KEY}"
      CLUSTER_HOST="staging.miamo.app"
      IMAGE_PREFIX="registry.miamo.app/"
      IMAGE_TAG="${MIAMO_IMAGE_TAG:-latest}"
      PULL_POLICY="Always"
      SVC_PORT="3000"
      GATEWAY_PORT="3200"
      WEB_PORT="3100"
      GATEWAY_NODEPORT="30200"
      WEB_NODEPORT="30100"
      REPLICAS="2"
      REQ_MEM="128Mi";  REQ_CPU="100m"
      LIM_MEM="512Mi";  LIM_CPU="1000m"
      MIN_REPLICAS="2";  MAX_REPLICAS="5"
      ;;
    prod)
      NS="miamo-prod"
      ENV_LABEL="production"
      NODE_ENV="production"
      DB_USER="miamo_prod"
      DB_PASS="\${MIAMO_PROD_DB_PASS}"
      DB_NAME="miamo_production"
      DB_PORT="5432"
      REDIS_PORT="6379"
      JWT_SECRET="\${MIAMO_PROD_JWT_SECRET}"
      INTERNAL_KEY="\${MIAMO_PROD_INTERNAL_KEY}"
      CLUSTER_HOST="miamo.app"
      IMAGE_PREFIX="registry.miamo.app/"
      IMAGE_TAG="${MIAMO_IMAGE_TAG:-latest}"
      PULL_POLICY="Always"
      SVC_PORT="3000"
      GATEWAY_PORT="3200"
      WEB_PORT="3100"
      GATEWAY_NODEPORT="30200"
      WEB_NODEPORT="30100"
      REPLICAS="3"
      REQ_MEM="256Mi";  REQ_CPU="200m"
      LIM_MEM="1Gi";    LIM_CPU="2000m"
      MIN_REPLICAS="3";  MAX_REPLICAS="10"
      ;;
    *)
      echo -e "${RED}Unknown env: $env. Use: dev | staging | prod${NC}"
      exit 1
      ;;
  esac

  DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@postgres.${NS}.svc.cluster.local:${DB_PORT}/${DB_NAME}?schema=public"
  REDIS_URL="redis://redis.${NS}.svc.cluster.local:${REDIS_PORT}"
}

k8s_render() {
  local env="$1"
  k8s_env_config "$env"
  mkdir -p "$K8S_OUTPUT/$env"

  echo -e "${BLUE}Rendering K8s manifests for ${CYAN}$env${BLUE}...${NC}"

  local SVC_LIST="auth users social messaging content notifications"
  local PORT_MAP="auth:3201 users:3202 social:3203 messaging:3204 content:3205 notifications:3206"

  for template in "$K8S_TEMPLATES"/*.yaml; do
    local fname=$(basename "$template")
    local out="$K8S_OUTPUT/$env/$fname"

    if [ "$fname" = "service.yaml" ]; then
      # Render per microservice
      > "$out"
      for svc in $SVC_LIST; do
        local cport=""
        for pm in $PORT_MAP; do
          if [ "$(echo "$pm" | cut -d: -f1)" = "$svc" ]; then
            cport=$(echo "$pm" | cut -d: -f2)
          fi
        done
        sed \
          -e "s|__SVC_NAME__|$svc|g" \
          -e "s|__NAMESPACE__|$NS|g" \
          -e "s|__SERVICE_PORT__|$SVC_PORT|g" \
          -e "s|__CONTAINER_PORT__|$cport|g" \
          -e "s|__IMAGE_PREFIX__|$IMAGE_PREFIX|g" \
          -e "s|__IMAGE_TAG__|$IMAGE_TAG|g" \
          -e "s|__PULL_POLICY__|$PULL_POLICY|g" \
          -e "s|__REPLICAS__|$REPLICAS|g" \
          -e "s|__REQ_MEM__|$REQ_MEM|g" \
          -e "s|__REQ_CPU__|$REQ_CPU|g" \
          -e "s|__LIM_MEM__|$LIM_MEM|g" \
          -e "s|__LIM_CPU__|$LIM_CPU|g" \
          "$template" >> "$out"
        echo "---" >> "$out"
      done
    elif [ "$fname" = "hpa.yaml" ]; then
      > "$out"
      for svc in $SVC_LIST gateway web; do
        sed \
          -e "s|__SVC_NAME__|$svc|g" \
          -e "s|__NAMESPACE__|$NS|g" \
          -e "s|__MIN_REPLICAS__|$MIN_REPLICAS|g" \
          -e "s|__MAX_REPLICAS__|$MAX_REPLICAS|g" \
          "$template" >> "$out"
        echo "---" >> "$out"
      done
    elif [ "$fname" = "pdb.yaml" ] || [ "$fname" = "network-policy.yaml" ]; then
      > "$out"
      for svc in $SVC_LIST gateway web; do
        sed \
          -e "s|__SVC_NAME__|$svc|g" \
          -e "s|__NAMESPACE__|$NS|g" \
          "$template" >> "$out"
        echo "---" >> "$out"
      done
    else
      # Single-instance templates
      sed \
        -e "s|__NAMESPACE__|$NS|g" \
        -e "s|__ENV__|$ENV_LABEL|g" \
        -e "s|__NODE_ENV__|$NODE_ENV|g" \
        -e "s|__DATABASE_URL__|$DATABASE_URL|g" \
        -e "s|__REDIS_URL__|$REDIS_URL|g" \
        -e "s|__JWT_SECRET__|$JWT_SECRET|g" \
        -e "s|__INTERNAL_KEY__|$INTERNAL_KEY|g" \
        -e "s|__CLUSTER_HOST__|$CLUSTER_HOST|g" \
        -e "s|__DB_USER__|$DB_USER|g" \
        -e "s|__DB_PASS__|$DB_PASS|g" \
        -e "s|__DB_NAME__|$DB_NAME|g" \
        -e "s|__POSTGRES_PORT__|$DB_PORT|g" \
        -e "s|__REDIS_PORT__|$REDIS_PORT|g" \
        -e "s|__IMAGE_PREFIX__|$IMAGE_PREFIX|g" \
        -e "s|__IMAGE_TAG__|$IMAGE_TAG|g" \
        -e "s|__PULL_POLICY__|$PULL_POLICY|g" \
        -e "s|__REPLICAS__|$REPLICAS|g" \
        -e "s|__REQ_MEM__|$REQ_MEM|g" \
        -e "s|__REQ_CPU__|$REQ_CPU|g" \
        -e "s|__LIM_MEM__|$LIM_MEM|g" \
        -e "s|__LIM_CPU__|$LIM_CPU|g" \
        -e "s|__SERVICE_PORT__|$SVC_PORT|g" \
        -e "s|__GATEWAY_PORT__|$GATEWAY_PORT|g" \
        -e "s|__WEB_PORT__|$WEB_PORT|g" \
        -e "s|__GATEWAY_NODEPORT__|$GATEWAY_NODEPORT|g" \
        -e "s|__WEB_NODEPORT__|$WEB_NODEPORT|g" \
        -e "s|__LOCAL_WEB_PORT__|$WEB_NODEPORT|g" \
        -e "s|__AUTH_PORT__|3201|g" \
        -e "s|__USERS_PORT__|3202|g" \
        -e "s|__SOCIAL_PORT__|3203|g" \
        -e "s|__MESSAGING_PORT__|3204|g" \
        -e "s|__CONTENT_PORT__|3205|g" \
        -e "s|__NOTIFICATIONS_PORT__|3206|g" \
        -e "s|__MIN_REPLICAS__|$MIN_REPLICAS|g" \
        -e "s|__MAX_REPLICAS__|$MAX_REPLICAS|g" \
        "$template" > "$out"
    fi
    echo -e "  ${GREEN}✓${NC} $fname"
  done

  echo -e "${GREEN}Manifests rendered to: $K8S_OUTPUT/$env/${NC}\n"
}

k8s_deploy() {
  local env="$1"
  k8s_render "$env"
  k8s_env_config "$env"

  echo -e "${PURPLE}╔══════════════════════════════════════╗${NC}"
  echo -e "${PURPLE}║   Miamo — K8s Deploy (${CYAN}$env${PURPLE})           ║${NC}"
  echo -e "${PURPLE}╚══════════════════════════════════════╝${NC}\n"

  # Apply in order: namespace → infra → config → migrate → services
  echo -e "${BLUE}1. Namespace${NC}"
  kubectl apply -f "$K8S_OUTPUT/$env/namespace.yaml"

  echo -e "${BLUE}2. Infrastructure (postgres + redis)${NC}"
  kubectl apply -f "$K8S_OUTPUT/$env/postgres.yaml"
  kubectl apply -f "$K8S_OUTPUT/$env/redis.yaml"

  echo -e "${BLUE}3. ConfigMap${NC}"
  kubectl apply -f "$K8S_OUTPUT/$env/configmap.yaml"

  echo -e "${BLUE}4. Network Policies${NC}"
  kubectl apply -f "$K8S_OUTPUT/$env/network-policy.yaml"

  echo -e "${YELLOW}Waiting for postgres to be ready...${NC}"
  kubectl -n "$NS" wait --for=condition=ready pod -l service=postgres --timeout=120s 2>/dev/null || true

  echo -e "${BLUE}5. Migration Job${NC}"
  kubectl delete job miamo-migrate -n "$NS" 2>/dev/null || true
  kubectl apply -f "$K8S_OUTPUT/$env/migrate-job.yaml"
  kubectl -n "$NS" wait --for=condition=complete job/miamo-migrate --timeout=120s 2>/dev/null || true

  echo -e "${BLUE}6. Microservices${NC}"
  kubectl apply -f "$K8S_OUTPUT/$env/service.yaml"

  echo -e "${BLUE}7. Gateway${NC}"
  kubectl apply -f "$K8S_OUTPUT/$env/gateway.yaml"

  echo -e "${BLUE}8. Web Frontend${NC}"
  kubectl apply -f "$K8S_OUTPUT/$env/web.yaml"

  echo -e "${BLUE}9. Autoscaling + PodDisruptionBudgets${NC}"
  kubectl apply -f "$K8S_OUTPUT/$env/hpa.yaml"
  kubectl apply -f "$K8S_OUTPUT/$env/pdb.yaml"

  echo -e "\n${GREEN}Deploy complete!${NC}"
  echo -e "${YELLOW}Checking rollout status...${NC}\n"
  for svc in auth users social messaging content notifications gateway web; do
    kubectl -n "$NS" rollout status deployment/"$svc" --timeout=120s 2>/dev/null \
      && echo -e "  ${GREEN}✓${NC} $svc" \
      || echo -e "  ${RED}✗${NC} $svc (still rolling out)"
  done
  echo ""
}

k8s_destroy() {
  local env="$1"
  k8s_env_config "$env"
  echo -e "${RED}Destroying Miamo K8s deployment ($env / $NS)...${NC}"
  kubectl delete namespace "$NS" --ignore-not-found
  echo -e "${GREEN}Namespace $NS deleted.${NC}"
}

k8s_status() {
  local env="$1"
  k8s_env_config "$env"
  echo -e "\n${BLUE}══ Miamo K8s Status (${CYAN}$env${BLUE}) ═══════════════${NC}\n"
  echo -e "${YELLOW}Pods:${NC}"
  kubectl -n "$NS" get pods -o wide 2>/dev/null || echo "  (no pods)"
  echo -e "\n${YELLOW}Services:${NC}"
  kubectl -n "$NS" get svc 2>/dev/null || echo "  (no services)"
  echo -e "\n${YELLOW}StatefulSets:${NC}"
  kubectl -n "$NS" get statefulsets 2>/dev/null || echo "  (none)"
  echo -e "\n${YELLOW}HPAs:${NC}"
  kubectl -n "$NS" get hpa 2>/dev/null || echo "  (none)"
  echo -e "\n${YELLOW}PVCs:${NC}"
  kubectl -n "$NS" get pvc 2>/dev/null || echo "  (none)"
  echo ""
}

k8s_logs() {
  local env="$1"
  local svc="${2:-gateway}"
  k8s_env_config "$env"
  echo -e "${BLUE}Logs for $svc ($env / $NS):${NC}"
  kubectl -n "$NS" logs -l service="$svc" --tail=150 -f
}

k8s_restart_svc() {
  local env="$1"
  local svc="${2:-gateway}"
  k8s_env_config "$env"
  echo -e "${YELLOW}Restarting $svc in $NS...${NC}"
  kubectl -n "$NS" rollout restart deployment/"$svc"
  kubectl -n "$NS" rollout status deployment/"$svc" --timeout=120s
  echo -e "${GREEN}$svc restarted.${NC}"
}

k8s_scale() {
  local env="$1"
  local svc="$2"
  local count="$3"
  k8s_env_config "$env"
  echo -e "${YELLOW}Scaling $svc → $count replicas in $NS...${NC}"
  kubectl -n "$NS" scale deployment/"$svc" --replicas="$count"
  echo -e "${GREEN}Scaled.${NC}"
}

k8s_migrate() {
  local env="$1"
  k8s_render "$env"
  k8s_env_config "$env"
  echo -e "${BLUE}Running migration in $NS...${NC}"
  kubectl delete job miamo-migrate -n "$NS" 2>/dev/null || true
  kubectl apply -f "$K8S_OUTPUT/$env/migrate-job.yaml"
  kubectl -n "$NS" wait --for=condition=complete job/miamo-migrate --timeout=120s
  echo -e "${GREEN}Migration complete.${NC}"
}

k8s_rollback() {
  local env="$1"
  local svc="${2:-gateway}"
  k8s_env_config "$env"
  echo -e "${YELLOW}Rolling back $svc in $NS...${NC}"
  kubectl -n "$NS" rollout undo deployment/"$svc"
  kubectl -n "$NS" rollout status deployment/"$svc" --timeout=120s
  echo -e "${GREEN}$svc rolled back.${NC}"
}

k8s_cmd() {
  local action="${1:-deploy}"
  local env="${2:-dev}"
  case "$action" in
    deploy)   k8s_deploy "$env" ;;
    destroy)  k8s_destroy "$env" ;;
    status)   k8s_status "$env" ;;
    logs)     k8s_logs "$env" "${3:-}" ;;
    restart)  k8s_restart_svc "$env" "${3:-}" ;;
    scale)    k8s_scale "$env" "${3:?svc required}" "${4:?replicas required}" ;;
    migrate)  k8s_migrate "$env" ;;
    rollback) k8s_rollback "$env" "${3:-}" ;;
    render)   k8s_render "$env" ;;
    *)        echo "Usage: $0 k8s {deploy|destroy|status|logs|restart|scale|migrate|rollback|render} <env> [svc] [replicas]" ;;
  esac
}

# ═══════════════════════════════════════════════════════
#  HELP
# ═══════════════════════════════════════════════════════
show_help() {
  echo -e "
${PURPLE}╔════════════════════════════════════════════════╗${NC}
${PURPLE}║   Miamo — Unified Deployment Script            ║${NC}
${PURPLE}╚════════════════════════════════════════════════╝${NC}

${CYAN}LOCAL (bare-metal tsx):${NC}
  $0 local start              Start all 7 services
  $0 local stop               Stop all services
  $0 local restart            Stop + start
  $0 local status             Health check all ports
  $0 local logs <svc>         Tail log (default: gateway)
  $0 local test               Run test-all.py

${CYAN}DOCKER (compose):${NC}
  $0 docker up                Build & start all containers
  $0 docker down              Stop containers
  $0 docker restart [svc]     Restart all or one service
  $0 docker status            Show container status
  $0 docker logs [svc]        Follow logs (default: gateway)
  $0 docker build             Build all images
  $0 docker clean             Remove containers + volumes + images

${CYAN}KUBERNETES:${NC}                         ${YELLOW}env = dev | staging | prod${NC}
  $0 k8s deploy  <env>        Full deploy (namespace → infra → services)
  $0 k8s destroy <env>        Delete entire namespace
  $0 k8s status  <env>        Pods, services, HPAs, PVCs
  $0 k8s logs    <env> [svc]  Stream pod logs
  $0 k8s restart <env> [svc]  Rolling restart
  $0 k8s scale   <env> <svc> <n>  Scale to n replicas
  $0 k8s migrate <env>        Run DB migration job
  $0 k8s rollback <env> [svc] Undo last deploy
  $0 k8s render  <env>        Render manifests only (no apply)
"
}

# ═══════════════════════════════════════════════════════
#  MAIN ROUTER
# ═══════════════════════════════════════════════════════
MODE="${1:-help}"
shift || true

case "$MODE" in
  local)   local_cmd "$@" ;;
  docker)  docker_cmd "$@" ;;
  k8s)     k8s_cmd "$@" ;;
  help|-h|--help) show_help ;;
  *)
    echo -e "${RED}Unknown mode: $MODE${NC}"
    show_help
    exit 1
    ;;
esac
