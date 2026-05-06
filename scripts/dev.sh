#!/bin/bash
# ═══ Miamo — Start All Services (Kubernetes) ═══
# Builds images in minikube, deploys pods. Run from project root.
set -e
cd "$(dirname "$0")/.."

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; NC='\033[0m'
echo -e "\n${B}═══ MIAMO K8S START ═══${NC}\n"

# Pre-flight
command -v kubectl &>/dev/null || { echo -e "${R}✗ kubectl not installed${NC}"; exit 1; }
command -v minikube &>/dev/null || { echo -e "${R}✗ minikube not installed${NC}"; exit 1; }
command -v docker &>/dev/null || { echo -e "${R}✗ Docker not installed${NC}"; exit 1; }

# Start minikube if not running
if ! minikube status 2>/dev/null | grep -q "Running"; then
  echo -e "${Y}[0/5]${NC} Starting minikube cluster..."
  minikube start --driver=docker --cpus=2 --memory=3072
  echo -e "  ${G}✓${NC} Minikube running"
fi

# Point Docker to minikube
eval $(minikube docker-env)

# Build images
echo -e "${Y}[1/5]${NC} Building images in minikube..."
SERVICES=(auth users social messaging content notifications gateway migrate web)
for svc in "${SERVICES[@]}"; do
  echo -n "  Building $svc..."
  docker build -f docker/$svc.Dockerfile -t miamo-$svc:latest . &>/dev/null
  echo -e " ${G}✓${NC}"
done
echo -e "  ${G}✓${NC} All images built"

# Apply k8s manifests
echo -e "${Y}[2/5]${NC} Applying Kubernetes manifests..."
kubectl apply -f k8s/namespace.yaml 2>/dev/null
kubectl apply -f k8s/config.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
echo -e "  ${G}✓${NC} Infrastructure deployed"

# Wait for databases
echo -e "${Y}[3/5]${NC} Waiting for databases..."
kubectl wait --for=condition=ready pod -l service=postgres -n miamo --timeout=120s
kubectl wait --for=condition=ready pod -l service=redis -n miamo --timeout=60s
echo -e "  ${G}✓${NC} Postgres & Redis ready"

# Run migrations
echo -e "${Y}[4/5]${NC} Running migrations & seed..."
kubectl delete job miamo-migrate -n miamo 2>/dev/null || true
kubectl apply -f k8s/migrate-job.yaml
kubectl wait --for=condition=complete job/miamo-migrate -n miamo --timeout=120s
echo -e "  ${G}✓${NC} Database seeded"

# Deploy services
echo -e "${Y}[5/5]${NC} Deploying services..."
kubectl apply -f k8s/auth.yaml -f k8s/users.yaml -f k8s/social.yaml \
  -f k8s/messaging.yaml -f k8s/content.yaml -f k8s/notifications.yaml \
  -f k8s/gateway.yaml -f k8s/web.yaml
echo -e "  Waiting for pods..."
sleep 10
kubectl wait --for=condition=ready pod -l service=gateway -n miamo --timeout=60s
kubectl wait --for=condition=ready pod -l service=web -n miamo --timeout=60s
echo -e "  ${G}✓${NC} All services deployed"

# Start port-forwarding in background
echo -e "\n${Y}Starting port-forwards...${NC}"
pkill -f "port-forward.*-n miamo" 2>/dev/null || true
sleep 1
kubectl port-forward svc/gateway 3200:3200 -n miamo &>/dev/null &
kubectl port-forward svc/web 3100:3100 -n miamo &>/dev/null &
sleep 2

# Status
echo -e "\n${B}═══ MIAMO RUNNING ON KUBERNETES ═══${NC}"
echo ""
kubectl get pods -n miamo --no-headers | awk '{printf "  %-40s %s\n", $1, $3}'
echo -e "\n${B}═══════════════════════════════════════${NC}"
echo -e "  Web:  ${G}http://localhost:3100${NC}"
echo -e "  API:  ${G}http://localhost:3200${NC}"
echo -e "${B}═══════════════════════════════════════${NC}\n"
