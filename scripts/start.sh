#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Miamo — Unified Start / Stop Script
# ═══════════════════════════════════════════════════════════════════
# Usage:
#   bash scripts/start.sh local   — Fast local dev (next dev, mock data, hot reload)
#   bash scripts/start.sh dev     — Full K8s deployment (minikube + Docker)
#   bash scripts/start.sh stop    — Stop everything (local server + K8s)
#
# Works on: macOS, Linux, Windows (Git Bash / WSL)
# Clone → run → app is live. Zero config.
# ═══════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")"; pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# Colors (safe on all terminals; harmless on Windows)
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; NC='\033[0m'

MODE="${1:-}"

# ─── Usage ───────────────────────────────────────────────────────
if [[ -z "$MODE" ]]; then
  echo ""
  echo -e "${B}═══ Miamo Start Script ═══${NC}"
  echo ""
  echo -e "  ${G}bash scripts/start.sh local${NC}   Fast local dev (no Docker/K8s needed)"
  echo -e "  ${G}bash scripts/start.sh dev${NC}     Full K8s deployment (minikube + Docker)"
  echo -e "  ${G}bash scripts/start.sh stop${NC}    Stop everything"
  echo ""
  echo "  Windows (PowerShell):  bash scripts/start.sh local"
  echo "  Windows (cmd.exe):     bash scripts\\start.sh local"
  echo ""
  exit 0
fi

# ═════════════════════════════════════════════════════════════════
#  PLATFORM DETECTION
# ═════════════════════════════════════════════════════════════════
detect_platform() {
  case "$(uname -s 2>/dev/null || echo Windows)" in
    Darwin*)  PLATFORM="mac" ;;
    Linux*)   PLATFORM="linux" ;;
    MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ;;
    *)        PLATFORM="linux" ;;
  esac
}
detect_platform

# Kill process on a port — cross-platform
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
#  STOP MODE — stops local dev + K8s
# ═════════════════════════════════════════════════════════════════
if [[ "$MODE" == "stop" ]]; then
  echo ""
  echo -e "${B}═══ MIAMO STOP ═══${NC}"
  echo ""

  # 1. Stop local dev servers
  echo -e "${Y}[1/3]${NC} Stopping local dev servers..."
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "next-router-worker" 2>/dev/null || true
  kill_port 3100
  kill_port 3101
  echo -e "  ${G}✓${NC} Local dev servers stopped"

  # 2. Stop port-forwards
  echo -e "${Y}[2/3]${NC} Stopping port-forwards..."
  pkill -f "kubectl.*port-forward" 2>/dev/null || true
  if [[ -f /tmp/miamo-pf.pid ]]; then
    kill "$(cat /tmp/miamo-pf.pid)" 2>/dev/null || true
    rm -f /tmp/miamo-pf.pid
  fi
  echo -e "  ${G}✓${NC} Port-forwards stopped"

  # 3. Scale down K8s (if minikube is running)
  echo -e "${Y}[3/3]${NC} Stopping K8s services..."
  if command -v kubectl &>/dev/null && kubectl get ns miamo &>/dev/null 2>&1; then
    kubectl scale deployment --all --replicas=0 -n miamo 2>/dev/null || true
    echo -e "  ${G}✓${NC} K8s deployments scaled to 0"
  else
    echo -e "  ${G}✓${NC} No K8s cluster running — nothing to do"
  fi

  echo ""
  echo -e "${G}All stopped.${NC} Run ${Y}bash scripts/start.sh local${NC} or ${Y}bash scripts/start.sh dev${NC} to restart."
  echo ""
  exit 0
fi

# ═════════════════════════════════════════════════════════════════
#  LOCAL MODE — Fast dev (Next.js dev server, mock data, hot reload)
# ═════════════════════════════════════════════════════════════════
if [[ "$MODE" == "local" ]]; then
  echo ""
  echo -e "${B}═══ MIAMO LOCAL DEV ═══${NC}"
  echo ""

  # Check Node.js
  if ! command -v node &>/dev/null; then
    echo -e "  ${R}✗ Node.js not found.${NC}"
    echo "    macOS:   brew install node"
    echo "    Windows: winget install OpenJS.NodeJS"
    echo "    Linux:   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
    exit 1
  fi
  NODE_V=$(node -v)
  echo -e "  ${G}✓${NC} Node.js ${NODE_V}"

  # Check npm
  if ! command -v npm &>/dev/null; then
    echo -e "  ${R}✗ npm not found. Install Node.js (npm comes bundled).${NC}"
    exit 1
  fi

  # Install web dependencies if needed
  echo -e "${Y}[1/3]${NC} Checking dependencies..."
  if [[ ! -d "services/web/node_modules" ]]; then
    echo "  Installing web dependencies..."
    (cd services/web && npm install)
  else
    echo "  services/web/node_modules exists"
  fi
  echo -e "  ${G}✓${NC} Dependencies ready"

  # Clean up old processes on port 3100
  echo -e "${Y}[2/3]${NC} Cleaning up old processes..."
  pkill -f "next dev" 2>/dev/null || true
  pkill -f "next-router-worker" 2>/dev/null || true
  kill_port 3100
  sleep 1
  echo -e "  ${G}✓${NC} Clean"

  # Start Next.js dev server
  echo -e "${Y}[3/3]${NC} Starting Next.js dev server on port 3100..."
  cd services/web
  npx next dev -p 3100 &
  DEV_PID=$!
  cd "$ROOT"

  # Wait for it to be ready (up to 60s)
  echo -n "  Waiting for server"
  SERVER_READY=0
  for i in $(seq 1 30); do
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
  echo -e "${B}  MIAMO LOCAL DEV IS RUNNING                   ${NC}"
  echo -e "${B}═══════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${G}➜${NC} Web App:  ${G}http://localhost:3100${NC}"
  echo ""
  echo -e "  Mode:     Local dev (mock data, hot reload)"
  echo -e "  PID:      ${DEV_PID}"
  echo ""
  echo -e "  ${Y}All pages show mock data — no backend needed.${NC}"
  echo -e "  ${Y}File changes auto-reload instantly.${NC}"
  echo ""
  echo -e "  Stop:     ${G}bash scripts/start.sh stop${NC}"
  echo -e "  Logs:     Check this terminal for Next.js output"
  echo -e "${B}═══════════════════════════════════════════════${NC}"
  echo ""

  # Keep running in foreground so user sees logs
  wait $DEV_PID
  exit 0
fi

# ═════════════════════════════════════════════════════════════════
#  DEV MODE — Full K8s deployment (minikube)
# ═════════════════════════════════════════════════════════════════
if [[ "$MODE" == "dev" ]]; then
  source "$SCRIPT_DIR/_config.sh" dev
  cd "$ROOT"

  echo ""
  echo -e "${B}═══ MIAMO K8S DEPLOY [dev] ═══${NC}"
  echo ""
  echo -e "  Config: ${Y}configuration/dev/values.yaml${NC}"
  echo ""

  # ── Step 0: Pre-flight ──
  echo -e "${Y}[0/8]${NC} Pre-flight checks..."
  MISSING=()
  command -v kubectl &>/dev/null  || MISSING+=("kubectl")
  command -v minikube &>/dev/null || MISSING+=("minikube")
  command -v docker &>/dev/null   || MISSING+=("docker")
  if [[ ${#MISSING[@]} -gt 0 ]]; then
    echo -e "  ${R}✗ Missing tools: ${MISSING[*]}${NC}"
    echo ""
    echo "  Install (macOS):    brew install ${MISSING[*]}"
    echo "  Install (Windows):  choco install ${MISSING[*]}"
    echo "  Install (Linux):    sudo apt install ${MISSING[*]}"
    exit 1
  fi
  echo -e "  ${G}✓${NC} kubectl, minikube, docker — all available"

  # ── Step 1: Minikube ──
  if ! minikube status 2>/dev/null | grep -q "Running"; then
    echo -e "${Y}[1/8]${NC} Starting minikube..."
    minikube start --driver=docker --cpus=2 --memory=3072
    echo -e "  ${G}✓${NC} Minikube running"
  else
    echo -e "${Y}[1/8]${NC} Minikube already running ${G}✓${NC}"
  fi
  eval $(minikube docker-env)

  # ── Step 2: Build Docker Images ──
  echo -e "${Y}[2/8]${NC} Building Docker images..."
  SERVICES_BUILD=(auth users social messaging content notifications gateway migrate web)
  BUILD_FAILED=0
  for svc in "${SERVICES_BUILD[@]}"; do
    IMG="${IMAGE_PREFIX}miamo-${svc}:${IMAGE_TAG}"
    echo -n "  Building ${svc}..."
    BUILD_LOG=$(docker build --no-cache -f docker/${svc}.Dockerfile -t "$IMG" . 2>&1) || {
      echo -e " ${R}✗ FAILED${NC}"
      echo "$BUILD_LOG" | tail -15
      BUILD_FAILED=1
      continue
    }
    echo -e " ${G}✓${NC}"
  done
  if [[ $BUILD_FAILED -eq 1 ]]; then
    echo -e "  ${R}✗ Some builds failed. Fix errors and re-run.${NC}"
    exit 1
  fi
  echo -e "  ${G}✓${NC} All ${#SERVICES_BUILD[@]} images built"

  # ── Step 3: Generate K8s Manifests ──
  echo -e "${Y}[3/8]${NC} Generating K8s manifests..."
  GENERATED="/tmp/miamo-k8s-${ENV}"
  rm -rf "$GENERATED" && mkdir -p "$GENERATED"

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

  render k8s/templates/namespace.yaml "$GENERATED/namespace.yaml"
  render k8s/templates/configmap.yaml "$GENERATED/configmap.yaml"
  render k8s/templates/postgres.yaml  "$GENERATED/postgres.yaml"
  render k8s/templates/redis.yaml     "$GENERATED/redis.yaml"
  render k8s/templates/migrate-job.yaml "$GENERATED/migrate-job.yaml"
  render k8s/templates/gateway.yaml   "$GENERATED/gateway.yaml"
  render k8s/templates/web.yaml       "$GENERATED/web.yaml"

  MICROSERVICES=("auth:${AUTH_PORT}" "users:${USERS_PORT}" "social:${SOCIAL_PORT}" "messaging:${MESSAGING_PORT}" "content:${CONTENT_PORT}" "notifications:${NOTIFICATIONS_PORT}")
  for entry in "${MICROSERVICES[@]}"; do
    SVC_NAME="${entry%%:*}"
    CONTAINER_PORT="${entry##*:}"
    sed \
      -e "s|__SVC_NAME__|${SVC_NAME}|g" \
      -e "s|__CONTAINER_PORT__|${CONTAINER_PORT}|g" \
      -e "s|__NAMESPACE__|${NAMESPACE}|g" \
      -e "s|__SERVICE_PORT__|${SERVICE_PORT}|g" \
      -e "s|__IMAGE_PREFIX__|${IMAGE_PREFIX}|g" \
      -e "s|__IMAGE_TAG__|${IMAGE_TAG}|g" \
      -e "s|__PULL_POLICY__|${PULL_POLICY}|g" \
      -e "s|__REPLICAS__|${REPLICAS}|g" \
      -e "s|__REQ_MEM__|${REQ_MEM}|g" \
      -e "s|__REQ_CPU__|${REQ_CPU}|g" \
      -e "s|__LIM_MEM__|${LIM_MEM}|g" \
      -e "s|__LIM_CPU__|${LIM_CPU}|g" \
      k8s/templates/service.yaml > "$GENERATED/${SVC_NAME}.yaml"
  done
  echo -e "  ${G}✓${NC} All manifests generated in ${GENERATED}/"

  # ── Step 4: Apply Infrastructure ──
  echo -e "${Y}[4/8]${NC} Applying namespace & infrastructure..."
  kubectl apply -f "$GENERATED/namespace.yaml" 2>/dev/null
  kubectl apply -f "$GENERATED/configmap.yaml"
  kubectl apply -f "$GENERATED/postgres.yaml"
  kubectl apply -f "$GENERATED/redis.yaml"
  echo -e "  ${G}✓${NC} Namespace, ConfigMap, Postgres, Redis deployed"

  # ── Step 5: Wait for Databases ──
  echo -e "${Y}[5/8]${NC} Waiting for databases..."
  kubectl wait --for=condition=ready pod -l service=postgres -n ${NAMESPACE} --timeout=120s
  kubectl wait --for=condition=ready pod -l service=redis    -n ${NAMESPACE} --timeout=60s
  echo -e "  ${G}✓${NC} Postgres & Redis ready"

  # ── Step 6: Migrations ──
  echo -e "${Y}[6/8]${NC} Running database migrations..."
  kubectl delete job miamo-migrate -n ${NAMESPACE} 2>/dev/null || true
  kubectl apply -f "$GENERATED/migrate-job.yaml"
  kubectl wait --for=condition=complete job/miamo-migrate -n ${NAMESPACE} --timeout=120s
  echo -e "  ${G}✓${NC} Database migrated & seeded"

  # ── Step 7: Deploy Services ──
  echo -e "${Y}[7/8]${NC} Deploying services..."
  kubectl apply \
    -f "$GENERATED/auth.yaml" \
    -f "$GENERATED/users.yaml" \
    -f "$GENERATED/social.yaml" \
    -f "$GENERATED/messaging.yaml" \
    -f "$GENERATED/content.yaml" \
    -f "$GENERATED/notifications.yaml" \
    -f "$GENERATED/gateway.yaml" \
    -f "$GENERATED/web.yaml"

  echo "  Waiting for pods to be ready..."
  for svc in auth users social messaging content notifications gateway web; do
    echo -n "    ${svc}..."
    if kubectl wait --for=condition=ready pod -l service=${svc} -n ${NAMESPACE} --timeout=120s &>/dev/null; then
      echo -e " ${G}✓${NC}"
    else
      echo -e " ${Y}⚠ slow (may still be starting)${NC}"
    fi
  done
  echo -e "  ${G}✓${NC} All services deployed"

  # ── Step 8: Port-Forward ──
  echo -e "${Y}[8/8]${NC} Starting port-forwards..."
  pkill -f "kubectl.*port-forward" 2>/dev/null || true
  sleep 1
  nohup bash scripts/port-forward.sh dev &>/dev/null &
  PF_PID=$!
  sleep 4

  # Verify web is reachable
  echo -n "  Verifying web..."
  WEB_OK=0
  for i in $(seq 1 10); do
    if curl -s -o /dev/null http://localhost:${LOCAL_WEB_PORT} 2>/dev/null; then
      WEB_OK=1; break
    fi
    sleep 2
  done
  [[ $WEB_OK -eq 1 ]] && echo -e " ${G}✓${NC}" || echo -e " ${Y}⚠ still starting — try browser in a moment${NC}"

  echo ""
  echo -e "${B}═══════════════════════════════════════════════${NC}"
  echo -e "${B}  MIAMO K8S IS RUNNING [dev]                    ${NC}"
  echo -e "${B}═══════════════════════════════════════════════${NC}"
  echo ""
  kubectl get pods -n ${NAMESPACE} --no-headers 2>/dev/null | awk '{printf "  %-40s %-10s %s\n", $1, $3, $5}'
  echo ""
  echo -e "  ${G}➜${NC} Web App:   ${G}http://localhost:${LOCAL_WEB_PORT}${NC}"
  echo -e "  ${G}➜${NC} API:       ${G}http://localhost:${LOCAL_GATEWAY_PORT}${NC}"
  echo -e "  Port-fwd:  PID ${PF_PID} (auto-reconnects)"
  echo ""
  echo -e "  Stop:      ${G}bash scripts/start.sh stop${NC}"
  echo -e "  Logs:      ${G}bash scripts/logs.sh dev <service>${NC}"
  echo -e "${B}═══════════════════════════════════════════════${NC}"
  echo ""
  exit 0
fi

# ─── Unknown Mode ────────────────────────────────────────────────
echo -e "${R}Unknown mode: ${MODE}${NC}"
echo ""
echo "Usage: bash scripts/start.sh [local|dev|stop]"
echo ""
exit 1