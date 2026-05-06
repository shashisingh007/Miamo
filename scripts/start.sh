#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Miamo — Start All Services (Kubernetes)
# ═══════════════════════════════════════════════════════════════════
# Usage: bash scripts/start.sh <env>
# ALL config from: configuration/<env>/values.yaml — ZERO hardcoded values.
# ═══════════════════════════════════════════════════════════════════
set -e
source "$(dirname "$0")/_config.sh" "${1:-}"
cd "$ROOT"

echo -e "\n${B}═══ MIAMO K8S START [${ENV}] ═══${NC}\n"
echo -e "  Config: ${Y}configuration/${ENV}/values.yaml${NC}\n"

# ─── Pre-flight ──────────────────────────────────────────────────
command -v kubectl &>/dev/null || { echo -e "${R}✗ kubectl not installed${NC}"; exit 1; }
command -v minikube &>/dev/null || { echo -e "${R}✗ minikube not installed${NC}"; exit 1; }
command -v docker &>/dev/null || { echo -e "${R}✗ Docker not installed${NC}"; exit 1; }

# Start minikube if not running
if ! minikube status 2>/dev/null | grep -q "Running"; then
  echo -e "${Y}[0/6]${NC} Starting minikube cluster..."
  minikube start --driver=docker --cpus=2 --memory=3072
  echo -e "  ${G}✓${NC} Minikube running"
fi

# Point Docker to minikube
eval $(minikube docker-env)

# ─── 1. Build images ─────────────────────────────────────────────
echo -e "${Y}[1/6]${NC} Building images (tag: ${IMAGE_TAG})..."
SERVICES_BUILD=(auth users social messaging content notifications gateway migrate web)
for svc in "${SERVICES_BUILD[@]}"; do
  IMG="${IMAGE_PREFIX}miamo-${svc}:${IMAGE_TAG}"
  echo -n "  Building ${svc}..."
  docker build -f docker/${svc}.Dockerfile -t "$IMG" . &>/dev/null
  echo -e " ${G}✓${NC}"
done
echo -e "  ${G}✓${NC} All images built"

# ─── 2. Generate manifests from templates + configuration ─────────
echo -e "${Y}[2/6]${NC} Generating manifests from templates..."
GENERATED="/tmp/miamo-k8s-${ENV}"
rm -rf "$GENERATED" && mkdir -p "$GENERATED"

# Template renderer — replaces ALL __PLACEHOLDERS__ with config values
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

# Generate infra
render k8s/templates/namespace.yaml "$GENERATED/namespace.yaml"
render k8s/templates/configmap.yaml "$GENERATED/configmap.yaml"
render k8s/templates/postgres.yaml "$GENERATED/postgres.yaml"
render k8s/templates/redis.yaml "$GENERATED/redis.yaml"
render k8s/templates/migrate-job.yaml "$GENERATED/migrate-job.yaml"
render k8s/templates/gateway.yaml "$GENERATED/gateway.yaml"
render k8s/templates/web.yaml "$GENERATED/web.yaml"

# Generate microservice manifests from single template
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

echo -e "  ${G}✓${NC} All manifests generated"

# ─── 3. Apply namespace + infra ───────────────────────────────────
echo -e "${Y}[3/6]${NC} Applying namespace & infrastructure..."
kubectl apply -f "$GENERATED/namespace.yaml" 2>/dev/null
kubectl apply -f "$GENERATED/configmap.yaml"
kubectl apply -f "$GENERATED/postgres.yaml"
kubectl apply -f "$GENERATED/redis.yaml"
echo -e "  ${G}✓${NC} Infrastructure deployed"

# ─── 4. Wait for databases ────────────────────────────────────────
echo -e "${Y}[4/6]${NC} Waiting for databases..."
kubectl wait --for=condition=ready pod -l service=postgres -n ${NAMESPACE} --timeout=120s
kubectl wait --for=condition=ready pod -l service=redis -n ${NAMESPACE} --timeout=60s
echo -e "  ${G}✓${NC} Postgres & Redis ready"

# ─── 5. Run migrations ────────────────────────────────────────────
echo -e "${Y}[5/6]${NC} Running migrations & seed..."
kubectl delete job miamo-migrate -n ${NAMESPACE} 2>/dev/null || true
kubectl apply -f "$GENERATED/migrate-job.yaml"
kubectl wait --for=condition=complete job/miamo-migrate -n ${NAMESPACE} --timeout=120s
echo -e "  ${G}✓${NC} Database migrated & seeded"

# ─── 6. Deploy services ───────────────────────────────────────────
echo -e "${Y}[6/6]${NC} Deploying services (replicas: ${REPLICAS})..."
kubectl apply \
  -f "$GENERATED/auth.yaml" \
  -f "$GENERATED/users.yaml" \
  -f "$GENERATED/social.yaml" \
  -f "$GENERATED/messaging.yaml" \
  -f "$GENERATED/content.yaml" \
  -f "$GENERATED/notifications.yaml" \
  -f "$GENERATED/gateway.yaml" \
  -f "$GENERATED/web.yaml"

echo -e "  Waiting for pods..."
sleep 10
kubectl wait --for=condition=ready pod -l service=gateway -n ${NAMESPACE} --timeout=90s
kubectl wait --for=condition=ready pod -l service=web -n ${NAMESPACE} --timeout=90s
echo -e "  ${G}✓${NC} All services deployed"

# ─── Port-forward (maps config port to k8s service) ───────────────
echo -e "\n${Y}Starting port-forwards...${NC}"
pkill -f "port-forward.*-n ${NAMESPACE}" 2>/dev/null || true
sleep 1
kubectl port-forward svc/gateway ${SERVICE_PORT}:${SERVICE_PORT} -n ${NAMESPACE} &>/dev/null &
kubectl port-forward svc/web ${SERVICE_PORT}:${SERVICE_PORT} -n ${NAMESPACE} &>/dev/null &
sleep 2

# ─── Status ───────────────────────────────────────────────────────
echo -e "\n${B}═══ MIAMO RUNNING ON KUBERNETES [${ENV}] ═══${NC}"
echo ""
kubectl get pods -n ${NAMESPACE} --no-headers | awk '{printf "  %-40s %s\n", $1, $3}'
echo -e "\n${B}═══════════════════════════════════════════════${NC}"
echo -e "  Host:    ${G}${CLUSTER_HOST}${NC}"
echo -e "  Web:     ${G}https://${CLUSTER_HOST}:${SERVICE_PORT}${NC}  (NodePort: ${WEB_NODEPORT})"
echo -e "  API:     ${G}https://${CLUSTER_HOST}:${SERVICE_PORT}${NC}  (NodePort: ${GATEWAY_NODEPORT})"
echo -e "  Config:  ${Y}configuration/${ENV}/values.yaml${NC}"
echo -e "${B}═══════════════════════════════════════════════${NC}\n"
