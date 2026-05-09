#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Miamo — Single Entry Point
# ═══════════════════════════════════════════════════════════════════
#
#  bash scripts/start.sh local                Local dev (Next.js, mock data)
#  bash scripts/start.sh dev                  Full K8s deploy (minikube)
#  bash scripts/start.sh stop                 Stop everything
#  bash scripts/start.sh restart [service]    Rolling restart
#  bash scripts/start.sh logs <service>       Stream pod logs
#  bash scripts/start.sh test                 Run K8s test suite
#  bash scripts/start.sh cleanup [--full]     Delete namespace
#  bash scripts/start.sh status               Show pod status
#
#  Works on: macOS, Linux, Windows (Git Bash / WSL)
#  Clone → run → app is live. Zero config.
# ═══════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")"; pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# ─── Colors ──────────────────────────────────────────────────────
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; C='\033[0;36m'; NC='\033[0m'

MODE="${1:-}"
shift 2>/dev/null || true   # remaining args in $@

# ═════════════════════════════════════════════════════════════════
#  CONFIG LOADER (inlined from _config.sh)
# ═════════════════════════════════════════════════════════════════
load_config() {
  local env="${1:-dev}"
  local cfg="$ROOT/configuration/$env/values.yaml"
  if [[ ! -f "$cfg" ]]; then
    echo -e "${R}✗ Config not found: $cfg${NC}"
    exit 1
  fi

  _val() {
    if [[ -z "${2:-}" ]]; then
      grep "^${1}:" "$cfg" | head -1 | sed 's/^[^:]*: *"\{0,1\}\([^"]*\)"\{0,1\}$/\1/'
    else
      sed -n "/^${1}:/,/^[a-z]/p" "$cfg" | grep "^  ${2}:" | head -1 | sed 's/^[^:]*: *"\{0,1\}\([^"]*\)"\{0,1\}$/\1/'
    fi
  }

  ENV="$env"
  CLUSTER_HOST=$(_val "cluster_host")
  NAMESPACE=$(_val "namespace")
  SERVICE_PORT=$(_val "service_port")

  AUTH_PORT=$(_val "container_ports" "auth")
  USERS_PORT=$(_val "container_ports" "users")
  SOCIAL_PORT=$(_val "container_ports" "social")
  MESSAGING_PORT=$(_val "container_ports" "messaging")
  CONTENT_PORT=$(_val "container_ports" "content")
  NOTIFICATIONS_PORT=$(_val "container_ports" "notifications")
  GATEWAY_PORT=$(_val "container_ports" "gateway")
  WEB_PORT=$(_val "container_ports" "web")

  GATEWAY_NODEPORT=$(_val "node_ports" "gateway")
  WEB_NODEPORT=$(_val "node_ports" "web")

  LOCAL_WEB_PORT=$(_val "local_ports" "web")
  LOCAL_GATEWAY_PORT=$(_val "local_ports" "gateway")

  IMAGE_REGISTRY=$(_val "images" "registry")
  IMAGE_TAG=$(_val "images" "tag")
  PULL_POLICY=$(_val "images" "pull_policy")

  DB_HOST=$(_val "database" "host")
  DB_PORT=$(_val "database" "port")
  DB_NAME=$(_val "database" "name")
  DB_USER=$(_val "database" "user")
  DB_PASS=$(_val "database" "password")

  REDIS_HOST=$(_val "redis" "host")
  REDIS_PORT=$(_val "redis" "port")

  JWT_SECRET=$(_val "secrets" "jwt_secret")
  INTERNAL_KEY=$(_val "secrets" "internal_service_key")

  REQ_MEM=$(_val "resources" "requests_memory")
  REQ_CPU=$(_val "resources" "requests_cpu")
  LIM_MEM=$(_val "resources" "limits_memory")
  LIM_CPU=$(_val "resources" "limits_cpu")

  REPLICAS=$(_val "replicas")
  NODE_ENV=$(_val "node_env")

  DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
  REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"
  IMAGE_PREFIX=""
  [[ -n "$IMAGE_REGISTRY" ]] && IMAGE_PREFIX="${IMAGE_REGISTRY}/"
}

# ═════════════════════════════════════════════════════════════════
#  PLATFORM HELPERS
# ═════════════════════════════════════════════════════════════════
case "$(uname -s 2>/dev/null || echo Windows)" in
  Darwin*)  PLATFORM="mac" ;;
  Linux*)   PLATFORM="linux" ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ;;
  *)        PLATFORM="linux" ;;
esac

kill_port() {
  local port=$1
  if [[ "$PLATFORM" == "windows" ]]; then
    netstat -ano 2>/dev/null | grep ":${port} " | awk '{print $5}' | sort -u | while read pid; do
      [[ -n "$pid" && "$pid" != "0" ]] && taskkill //F //PID "$pid" 2>/dev/null || true
    done
  else
    lsof -ti:"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
  fi
}

# ═════════════════════════════════════════════════════════════════
#  PORT-FORWARD HELPER (inlined from port-forward.sh)
# ═════════════════════════════════════════════════════════════════
_start_port_forward() {
  # Run persistent port-forwards in the background
  echo $$ > /tmp/miamo-pf.pid

  _forward() {
    local label=$1 local_port=$2 pod_port=$3 svc_name=$4
    while true; do
      POD=$(kubectl get pods -n "$NAMESPACE" --no-headers -o custom-columns=":metadata.name" 2>/dev/null | grep "^${svc_name}-" | head -1)
      if [[ -z "$POD" ]]; then sleep 5; continue; fi
      STATUS=$(kubectl get pod "$POD" -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null)
      if [[ "$STATUS" != "Running" ]]; then sleep 5; continue; fi
      kubectl port-forward "pod/$POD" "$local_port:$pod_port" -n "$NAMESPACE" 2>/dev/null
      sleep 3
    done
  }

  _forward "WEB" "${LOCAL_WEB_PORT}" "${WEB_PORT}" "web" &
  _forward "GW"  "${LOCAL_GATEWAY_PORT}" "${GATEWAY_PORT}" "gateway" &
  wait
}

# ═════════════════════════════════════════════════════════════════
#  TEMPLATE RENDERER
# ═════════════════════════════════════════════════════════════════
render() {
  local tpl="$1" out="$2"
  sed \
    -e "s|__NAMESPACE__|${NAMESPACE}|g" \
    -e "s|__ENV__|${ENV}|g" \
    -e "s|__SERVICE_PORT__|${SERVICE_PORT}|g" \
    -e "s|__CLUSTER_HOST__|${CLUSTER_HOST}|g" \
    -e "s|__AUTH_PORT__|${AUTH_PORT}|g" \
    -e "s|__USERS_PORT__|${USERS_PORT}|g" \
    -e "s|__SOCIAL_PORT__|${SOCIAL_PORT}|g" \
    -e "s|__MESSAGING_PORT__|${MESSAGING_PORT}|g" \
    -e "s|__CONTENT_PORT__|${CONTENT_PORT}|g" \
    -e "s|__NOTIFICATIONS_PORT__|${NOTIFICATIONS_PORT}|g" \
    -e "s|__GATEWAY_PORT__|${GATEWAY_PORT}|g" \
    -e "s|__WEB_PORT__|${WEB_PORT}|g" \
    -e "s|__LOCAL_WEB_PORT__|${LOCAL_WEB_PORT}|g" \
    -e "s|__LOCAL_GATEWAY_PORT__|${LOCAL_GATEWAY_PORT}|g" \
    -e "s|__GATEWAY_NODEPORT__|${GATEWAY_NODEPORT}|g" \
    -e "s|__WEB_NODEPORT__|${WEB_NODEPORT}|g" \
    -e "s|__IMAGE_PREFIX__|${IMAGE_PREFIX}|g" \
    -e "s|__IMAGE_TAG__|${IMAGE_TAG}|g" \
    -e "s|__PULL_POLICY__|${PULL_POLICY}|g" \
    -e "s|__DB_HOST__|${DB_HOST}|g" \
    -e "s|__DB_PORT__|${DB_PORT}|g" \
    -e "s|__DB_NAME__|${DB_NAME}|g" \
    -e "s|__DB_USER__|${DB_USER}|g" \
    -e "s|__DB_PASS__|${DB_PASS}|g" \
    -e "s|__POSTGRES_PORT__|${DB_PORT}|g" \
    -e "s|__REDIS_HOST__|${REDIS_HOST}|g" \
    -e "s|__REDIS_PORT__|${REDIS_PORT}|g" \
    -e "s|__DATABASE_URL__|${DATABASE_URL}|g" \
    -e "s|__REDIS_URL__|${REDIS_URL}|g" \
    -e "s|__JWT_SECRET__|${JWT_SECRET}|g" \
    -e "s|__INTERNAL_KEY__|${INTERNAL_KEY}|g" \
    -e "s|__NODE_ENV__|${NODE_ENV}|g" \
    -e "s|__REPLICAS__|${REPLICAS}|g" \
    -e "s|__REQ_MEM__|${REQ_MEM}|g" \
    -e "s|__REQ_CPU__|${REQ_CPU}|g" \
    -e "s|__LIM_MEM__|${LIM_MEM}|g" \
    -e "s|__LIM_CPU__|${LIM_CPU}|g" \
    "$tpl" > "$out"
}

# ═════════════════════════════════════════════════════════════════
#  USAGE
# ═════════════════════════════════════════════════════════════════
if [[ -z "$MODE" ]]; then
  echo ""
  echo -e "${B}═══ Miamo ═══${NC}"
  echo ""
  echo -e "  ${G}bash scripts/start.sh local${NC}              Local dev (Next.js, mock data, hot reload)"
  echo -e "  ${G}bash scripts/start.sh dev${NC}                Full K8s deploy (minikube + Docker)"
  echo -e "  ${G}bash scripts/start.sh stop${NC}               Stop everything"
  echo -e "  ${G}bash scripts/start.sh restart${NC} [service]  Rolling restart (one or all)"
  echo -e "  ${G}bash scripts/start.sh logs${NC} <service>     Stream pod logs"
  echo -e "  ${G}bash scripts/start.sh test${NC}               Run K8s test suite"
  echo -e "  ${G}bash scripts/start.sh cleanup${NC} [--full]   Delete namespace (--full stops minikube)"
  echo -e "  ${G}bash scripts/start.sh status${NC}             Show pod status"
  echo ""
  echo -e "  Windows:  ${C}powershell -File scripts/start.ps1 local${NC}"
  echo ""
  exit 0
fi

# ═════════════════════════════════════════════════════════════════
#  STOP — kills local dev + K8s
# ═════════════════════════════════════════════════════════════════
if [[ "$MODE" == "stop" ]]; then
  echo ""
  echo -e "${B}═══ MIAMO STOP ═══${NC}"
  echo ""

  echo -e "${Y}[1/3]${NC} Stopping local dev servers..."
  # Kill by saved PID first
  if [[ -f /tmp/miamo-local.pid ]]; then
    LOCAL_PID=$(cat /tmp/miamo-local.pid)
    kill "$LOCAL_PID" 2>/dev/null || true
    # Also kill child processes (next-router-worker etc.)
    pkill -P "$LOCAL_PID" 2>/dev/null || true
    rm -f /tmp/miamo-local.pid
  fi
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "next-router-worker" 2>/dev/null || true
  kill_port 3100; kill_port 3101
  echo -e "  ${G}✓${NC} Local dev servers stopped"

  echo -e "${Y}[2/3]${NC} Stopping port-forwards..."
  pkill -f "kubectl.*port-forward" 2>/dev/null || true
  [[ -f /tmp/miamo-pf.pid ]] && { kill "$(cat /tmp/miamo-pf.pid)" 2>/dev/null || true; rm -f /tmp/miamo-pf.pid; }
  echo -e "  ${G}✓${NC} Port-forwards stopped"

  echo -e "${Y}[3/3]${NC} Stopping K8s services..."
  if command -v kubectl &>/dev/null && kubectl get ns miamo &>/dev/null 2>&1; then
    kubectl scale deployment --all --replicas=0 -n miamo 2>/dev/null || true
    echo -e "  ${G}✓${NC} K8s deployments scaled to 0"
  else
    echo -e "  ${G}✓${NC} No K8s cluster running"
  fi

  echo ""
  echo -e "${G}All stopped.${NC}"
  echo ""
  exit 0
fi

# ═════════════════════════════════════════════════════════════════
#  LOCAL — fast Next.js dev (mock data, hot reload)
# ═════════════════════════════════════════════════════════════════
if [[ "$MODE" == "local" ]]; then
  echo ""
  echo -e "${B}═══ MIAMO LOCAL DEV ═══${NC}"
  echo ""

  if ! command -v node &>/dev/null; then
    echo -e "  ${R}✗ Node.js not found.${NC}"
    echo "    macOS:   brew install node"
    echo "    Windows: winget install OpenJS.NodeJS"
    echo "    Linux:   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    exit 1
  fi
  echo -e "  ${G}✓${NC} Node.js $(node -v)"

  echo -e "${Y}[1/3]${NC} Checking dependencies..."
  if [[ ! -d "services/web/node_modules" ]]; then
    echo "  Installing web dependencies..."
    (cd services/web && npm install)
  fi
  echo -e "  ${G}✓${NC} Dependencies ready"

  echo -e "${Y}[2/3]${NC} Cleaning up old processes..."
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "next-router-worker" 2>/dev/null || true
  kill_port 3100
  sleep 1
  echo -e "  ${G}✓${NC} Clean"

  # Create logs directory
  mkdir -p "$ROOT/logs"
  LOG_FILE="$ROOT/logs/local.log"

  echo -e "${Y}[3/3]${NC} Starting Next.js dev server on port 3100 (background)..."
  cd services/web
  nohup npx next dev -p 3100 > "$LOG_FILE" 2>&1 &
  DEV_PID=$!
  echo $DEV_PID > /tmp/miamo-local.pid
  disown $DEV_PID 2>/dev/null
  cd "$ROOT"

  # Wait for server to start (up to 90s for first compile)
  echo -n "  Waiting for server"
  SERVER_READY=0
  for i in $(seq 1 45); do
    if curl -s -o /dev/null http://localhost:3100 2>/dev/null; then
      SERVER_READY=1
      echo -e " ${G}✓${NC}"
      break
    fi
    echo -n "."
    sleep 2
  done
  if [[ $SERVER_READY -eq 0 ]]; then
    echo -e " ${Y}(still compiling — check browser in a moment)${NC}"
  fi

  echo ""
  echo -e "${B}═══════════════════════════════════════════════${NC}"
  echo -e "${B}  MIAMO LOCAL DEV IS RUNNING (background)       ${NC}"
  echo -e "${B}═══════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${G}➜${NC} Web App:  ${G}http://localhost:3100${NC}"
  echo ""
  echo -e "  PID:    ${DEV_PID} (survives terminal close)"
  echo -e "  Logs:   ${G}tail -f logs/local.log${NC}"
  echo ""
  echo -e "  Mock data on all pages — no backend needed."
  echo -e "  File changes auto-reload instantly."
  echo ""
  echo -e "  Stop:   ${G}bash scripts/start.sh stop${NC}"
  echo -e "  Status: ${G}bash scripts/start.sh status${NC}"
  echo -e "${B}═══════════════════════════════════════════════${NC}"
  echo ""
  exit 0
fi

# ═════════════════════════════════════════════════════════════════
#  DEV — full K8s deployment (minikube)
# ═════════════════════════════════════════════════════════════════
if [[ "$MODE" == "dev" ]]; then
  load_config dev
  cd "$ROOT"

  echo ""
  echo -e "${B}═══ MIAMO K8S DEPLOY [dev] ═══${NC}"
  echo ""

  # Pre-flight
  echo -e "${Y}[0/8]${NC} Pre-flight checks..."
  MISSING=()
  command -v kubectl &>/dev/null  || MISSING+=("kubectl")
  command -v minikube &>/dev/null || MISSING+=("minikube")
  command -v docker &>/dev/null   || MISSING+=("docker")
  if [[ ${#MISSING[@]} -gt 0 ]]; then
    echo -e "  ${R}✗ Missing: ${MISSING[*]}${NC}"
    echo "  macOS:   brew install ${MISSING[*]}"
    echo "  Windows: choco install ${MISSING[*]}"
    exit 1
  fi
  echo -e "  ${G}✓${NC} kubectl, minikube, docker"

  # 1. Minikube
  if ! minikube status 2>/dev/null | grep -q "Running"; then
    echo -e "${Y}[1/8]${NC} Starting minikube..."
    minikube start --driver=docker --cpus=2 --memory=3072
  else
    echo -e "${Y}[1/8]${NC} Minikube already running ${G}✓${NC}"
  fi
  eval $(minikube docker-env)

  # 2. Build images
  echo -e "${Y}[2/8]${NC} Building Docker images..."
  BUILD_LIST=(auth users social messaging content notifications gateway migrate web)
  BUILD_FAILED=0
  for svc in "${BUILD_LIST[@]}"; do
    IMG="${IMAGE_PREFIX}miamo-${svc}:${IMAGE_TAG}"
    echo -n "  ${svc}..."
    if docker build --no-cache -f docker/${svc}.Dockerfile -t "$IMG" . &>/dev/null; then
      echo -e " ${G}✓${NC}"
    else
      echo -e " ${R}✗${NC}"; BUILD_FAILED=1
    fi
  done
  [[ $BUILD_FAILED -eq 1 ]] && { echo -e "  ${R}Build failures — fix and re-run.${NC}"; exit 1; }

  # 3. Generate manifests
  echo -e "${Y}[3/8]${NC} Generating manifests..."
  GEN="/tmp/miamo-k8s-${ENV}"
  rm -rf "$GEN" && mkdir -p "$GEN"

  render k8s/templates/namespace.yaml "$GEN/namespace.yaml"
  render k8s/templates/configmap.yaml "$GEN/configmap.yaml"
  render k8s/templates/postgres.yaml  "$GEN/postgres.yaml"
  render k8s/templates/redis.yaml     "$GEN/redis.yaml"
  render k8s/templates/migrate-job.yaml "$GEN/migrate-job.yaml"
  render k8s/templates/gateway.yaml   "$GEN/gateway.yaml"
  render k8s/templates/web.yaml       "$GEN/web.yaml"

  for entry in "auth:${AUTH_PORT}" "users:${USERS_PORT}" "social:${SOCIAL_PORT}" "messaging:${MESSAGING_PORT}" "content:${CONTENT_PORT}" "notifications:${NOTIFICATIONS_PORT}"; do
    SVC="${entry%%:*}"; PORT="${entry##*:}"
    sed -e "s|__SVC_NAME__|${SVC}|g" -e "s|__CONTAINER_PORT__|${PORT}|g" \
        -e "s|__NAMESPACE__|${NAMESPACE}|g" -e "s|__SERVICE_PORT__|${SERVICE_PORT}|g" \
        -e "s|__IMAGE_PREFIX__|${IMAGE_PREFIX}|g" -e "s|__IMAGE_TAG__|${IMAGE_TAG}|g" \
        -e "s|__PULL_POLICY__|${PULL_POLICY}|g" -e "s|__REPLICAS__|${REPLICAS}|g" \
        -e "s|__REQ_MEM__|${REQ_MEM}|g" -e "s|__REQ_CPU__|${REQ_CPU}|g" \
        -e "s|__LIM_MEM__|${LIM_MEM}|g" -e "s|__LIM_CPU__|${LIM_CPU}|g" \
        k8s/templates/service.yaml > "$GEN/${SVC}.yaml"
  done
  echo -e "  ${G}✓${NC} Manifests generated"

  # 4. Apply infra
  echo -e "${Y}[4/8]${NC} Applying infrastructure..."
  kubectl apply -f "$GEN/namespace.yaml" 2>/dev/null
  kubectl apply -f "$GEN/configmap.yaml"
  kubectl apply -f "$GEN/postgres.yaml"
  kubectl apply -f "$GEN/redis.yaml"
  echo -e "  ${G}✓${NC} Infra deployed"

  # 5. Wait for DBs
  echo -e "${Y}[5/8]${NC} Waiting for databases..."
  kubectl wait --for=condition=ready pod -l service=postgres -n ${NAMESPACE} --timeout=120s
  kubectl wait --for=condition=ready pod -l service=redis    -n ${NAMESPACE} --timeout=60s
  echo -e "  ${G}✓${NC} Postgres & Redis ready"

  # 6. Migrate
  echo -e "${Y}[6/8]${NC} Running migrations..."
  kubectl delete job miamo-migrate -n ${NAMESPACE} 2>/dev/null || true
  kubectl apply -f "$GEN/migrate-job.yaml"
  kubectl wait --for=condition=complete job/miamo-migrate -n ${NAMESPACE} --timeout=120s
  echo -e "  ${G}✓${NC} Database migrated & seeded"

  # 7. Deploy services
  echo -e "${Y}[7/8]${NC} Deploying services..."
  kubectl apply \
    -f "$GEN/auth.yaml" -f "$GEN/users.yaml" -f "$GEN/social.yaml" \
    -f "$GEN/messaging.yaml" -f "$GEN/content.yaml" -f "$GEN/notifications.yaml" \
    -f "$GEN/gateway.yaml" -f "$GEN/web.yaml"

  for svc in auth users social messaging content notifications gateway web; do
    echo -n "    ${svc}..."
    kubectl wait --for=condition=ready pod -l service=${svc} -n ${NAMESPACE} --timeout=120s &>/dev/null \
      && echo -e " ${G}✓${NC}" || echo -e " ${Y}⚠ slow${NC}"
  done

  # 8. Port-forward
  echo -e "${Y}[8/8]${NC} Starting port-forwards..."
  pkill -f "kubectl.*port-forward" 2>/dev/null || true; sleep 1
  _start_port_forward &
  PF_PID=$!
  disown $PF_PID 2>/dev/null
  sleep 4

  echo -n "  Verifying..."
  for i in $(seq 1 10); do
    curl -s -o /dev/null http://localhost:${LOCAL_WEB_PORT} 2>/dev/null && { echo -e " ${G}✓${NC}"; break; }
    sleep 2
  done
  [[ $i -eq 10 ]] && echo -e " ${Y}⚠ starting...${NC}"

  echo ""
  echo -e "${B}═══════════════════════════════════════════════${NC}"
  echo -e "${B}  MIAMO K8S IS RUNNING [dev]                    ${NC}"
  echo -e "${B}═══════════════════════════════════════════════${NC}"
  echo ""
  kubectl get pods -n ${NAMESPACE} --no-headers 2>/dev/null | awk '{printf "  %-40s %-10s %s\n", $1, $3, $5}'
  echo ""
  echo -e "  ${G}➜${NC} Web:  ${G}http://localhost:${LOCAL_WEB_PORT}${NC}"
  echo -e "  ${G}➜${NC} API:  ${G}http://localhost:${LOCAL_GATEWAY_PORT}${NC}"
  echo ""
  echo -e "  Stop:    ${G}bash scripts/start.sh stop${NC}"
  echo -e "  Logs:    ${G}bash scripts/start.sh logs <service>${NC}"
  echo -e "  Status:  ${G}bash scripts/start.sh status${NC}"
  echo -e "${B}═══════════════════════════════════════════════${NC}"
  echo ""
  exit 0
fi

# ═════════════════════════════════════════════════════════════════
#  RESTART — rolling restart
# ═════════════════════════════════════════════════════════════════
if [[ "$MODE" == "restart" ]]; then
  load_config dev
  SERVICE="${1:-all}"

  echo ""
  echo -e "${B}═══ MIAMO RESTART ═══${NC}"
  echo ""

  if [[ "$SERVICE" == "all" ]]; then
    echo -e "${Y}Restarting all deployments...${NC}"
    kubectl rollout restart deployment -n ${NAMESPACE}
  else
    echo -e "${Y}Restarting ${SERVICE}...${NC}"
    kubectl rollout restart deployment/${SERVICE} -n ${NAMESPACE}
  fi

  sleep 5
  kubectl get pods -n ${NAMESPACE} --no-headers | awk '{printf "  %-40s %s\n", $1, $3}'

  echo -e "\n${Y}Re-establishing port-forwards...${NC}"
  pkill -f "kubectl.*port-forward" 2>/dev/null || true; sleep 1
  _start_port_forward &
  disown $! 2>/dev/null
  sleep 3

  echo -e "\n${G}✓ Restart complete.${NC}\n"
  exit 0
fi

# ═════════════════════════════════════════════════════════════════
#  LOGS — stream pod logs
# ═════════════════════════════════════════════════════════════════
if [[ "$MODE" == "logs" ]]; then
  load_config dev
  SERVICE="${1:-}"
  TAIL="${2:-50}"

  if [[ -z "$SERVICE" ]]; then
    echo ""
    echo -e "${B}Usage:${NC} bash scripts/start.sh logs <service> [lines]"
    echo ""
    echo "  Services: auth, users, social, messaging, content, notifications, gateway, web, postgres, redis, all, migrate"
    echo ""
    exit 0
  fi

  if [[ "$SERVICE" == "all" ]]; then
    kubectl logs -f -l app=miamo -n ${NAMESPACE} --all-containers --prefix --tail=$TAIL
  elif [[ "$SERVICE" == "migrate" ]]; then
    kubectl logs job/miamo-migrate -n ${NAMESPACE}
  else
    kubectl logs -f deployment/$SERVICE -n ${NAMESPACE} --tail=$TAIL
  fi
  exit 0
fi

# ═════════════════════════════════════════════════════════════════
#  TEST — K8s test suite
# ═════════════════════════════════════════════════════════════════
if [[ "$MODE" == "test" ]]; then
  load_config dev
  PASS=0; FAIL=0
  pass() { echo -e "  ${G}✓${NC} $1"; PASS=$((PASS + 1)); }
  fail() { echo -e "  ${R}✗${NC} $1"; FAIL=$((FAIL + 1)); }

  echo ""
  echo -e "${B}═══ MIAMO TEST SUITE ═══${NC}"
  echo ""

  # 1. Pod health
  echo -e "${Y}[1/4] Pod Status${NC}"
  for svc in auth users social messaging content notifications gateway web postgres redis; do
    STATUS=$(kubectl get pods -n ${NAMESPACE} -l service=$svc --no-headers 2>/dev/null | awk '{print $3}' | head -1)
    [[ "$STATUS" == "Running" ]] && pass "$svc running" || fail "$svc NOT running ($STATUS)"
  done
  MIGRATE_STATUS=$(kubectl get pods -n ${NAMESPACE} -l service=migrate --no-headers 2>/dev/null | awk '{print $3}' | head -1)
  [[ "$MIGRATE_STATUS" == "Completed" ]] && pass "migrate completed" || fail "migrate ($MIGRATE_STATUS)"

  # 2. Internal health
  echo -e "\n${Y}[2/4] Internal Health (port ${SERVICE_PORT})${NC}"
  for svc in auth users social messaging content notifications gateway; do
    RESP=$(kubectl exec -n ${NAMESPACE} deployment/gateway -- wget -qO- "http://${svc}:${SERVICE_PORT}/health" 2>/dev/null || echo "UNREACHABLE")
    echo "$RESP" | grep -q '"ok"' && pass "${svc} health ok" || fail "${svc} unreachable"
  done

  # 3. Gateway discovery
  echo -e "\n${Y}[3/4] Gateway Service Discovery${NC}"
  GW_HEALTH=$(kubectl exec -n ${NAMESPACE} deployment/gateway -- wget -qO- http://127.0.0.1:${GATEWAY_PORT}/health 2>/dev/null || echo "{}")
  for svc in auth users social messaging content notifications; do
    echo "$GW_HEALTH" | grep -q "\"$svc\":\"ok\"" && pass "gateway → $svc" || fail "gateway → $svc"
  done

  # 4. E2E auth
  echo -e "\n${Y}[4/4] E2E Auth Test${NC}"
  LOGIN_RESP=$(kubectl exec -n ${NAMESPACE} deployment/gateway -- wget -qO- \
    --post-data='{"email":"miamo1@miamo.test","password":"miamo1"}' \
    --header='Content-Type: application/json' \
    http://127.0.0.1:${GATEWAY_PORT}/api/v1/auth/login 2>/dev/null || echo "FAILED")
  if echo "$LOGIN_RESP" | grep -q "accessToken"; then
    pass "Login → token received"
    USERNAME=$(echo "$LOGIN_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['user']['displayName'])" 2>/dev/null || echo "?")
    pass "User: $USERNAME"
  else
    fail "Login failed"
  fi

  echo ""
  TOTAL=$((PASS + FAIL))
  echo -e "${B}  Results: ${G}${PASS} passed${NC}, ${R}${FAIL} failed${NC} / ${TOTAL} total${NC}"
  echo ""
  [[ $FAIL -gt 0 ]] && exit 1 || exit 0
fi

# ═════════════════════════════════════════════════════════════════
#  CLEANUP — delete namespace, optionally stop minikube
# ═════════════════════════════════════════════════════════════════
if [[ "$MODE" == "cleanup" ]]; then
  load_config dev
  echo ""
  echo -e "${R}═══ MIAMO CLEANUP ═══${NC}"
  echo ""

  pkill -f "kubectl.*port-forward" 2>/dev/null || true
  pkill -f "next dev" 2>/dev/null || true
  kill_port 3100

  echo -e "${Y}[1/2]${NC} Deleting namespace ${NAMESPACE}..."
  kubectl delete namespace ${NAMESPACE} --ignore-not-found --timeout=60s
  echo -e "  ${G}✓${NC} Namespace deleted"

  if [[ "${1:-}" == "--full" ]]; then
    echo -e "${Y}[2/2]${NC} Stopping minikube..."
    minikube stop
    echo -e "  ${G}✓${NC} Minikube stopped"
    echo -e "  To nuke completely: ${Y}minikube delete${NC}"
  else
    echo -e "\n${G}✓ Cleaned.${NC} Minikube still running."
    echo -e "  Full cleanup: ${Y}bash scripts/start.sh cleanup --full${NC}"
  fi
  echo ""
  exit 0
fi

# ═════════════════════════════════════════════════════════════════
#  STATUS — quick pod overview
# ═════════════════════════════════════════════════════════════════
if [[ "$MODE" == "status" ]]; then
  echo ""
  echo -e "${B}═══ MIAMO STATUS ═══${NC}"
  echo ""

  # Local dev
  if [[ -f /tmp/miamo-local.pid ]] && kill -0 "$(cat /tmp/miamo-local.pid)" 2>/dev/null; then
    LOCAL_PID=$(cat /tmp/miamo-local.pid)
    echo -e "  Local dev: ${G}running${NC} (port 3100, PID ${LOCAL_PID})"
    if [[ -f "$ROOT/logs/local.log" ]]; then
      echo -e "  Logs:      ${C}tail -f logs/local.log${NC}"
      echo ""
      echo -e "  ${Y}Last 5 log lines:${NC}"
      tail -5 "$ROOT/logs/local.log" 2>/dev/null | sed 's/^/    /'
    fi
  elif pgrep -f "next dev" &>/dev/null; then
    echo -e "  Local dev: ${G}running${NC} (port 3100)"
  else
    echo -e "  Local dev: ${Y}stopped${NC}"
  fi

  # K8s
  if command -v kubectl &>/dev/null && kubectl get ns miamo &>/dev/null 2>&1; then
    echo ""
    kubectl get pods -n miamo --no-headers 2>/dev/null | awk '{printf "  %-40s %-10s %-12s %s\n", $1, $3, $4, $5}'
    echo ""
    # Port-forwards
    if pgrep -f "kubectl.*port-forward" &>/dev/null; then
      echo -e "  Port-forwards: ${G}active${NC}"
    else
      echo -e "  Port-forwards: ${Y}inactive${NC}"
    fi
  else
    echo -e "  K8s:       ${Y}no cluster${NC}"
  fi
  echo ""
  exit 0
fi

# ─── Unknown ─────────────────────────────────────────────────────
echo -e "${R}Unknown command: ${MODE}${NC}"
echo "Run ${Y}bash scripts/start.sh${NC} to see all commands."
exit 1