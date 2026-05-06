#!/bin/bash
# ═══ Miamo — Restart Services (Kubernetes) ═══
set -e
cd "$(dirname "$0")/.."

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; NC='\033[0m'
echo -e "\n${B}═══ MIAMO K8S RESTART ═══${NC}\n"

SERVICE=${1:-all}

if [[ "$SERVICE" == "all" ]]; then
  echo -e "${Y}Restarting all deployments...${NC}"
  kubectl rollout restart deployment -n miamo
  sleep 5
  kubectl get pods -n miamo --no-headers | awk '{printf "  %-40s %s\n", $1, $3}'
else
  echo -e "${Y}Restarting $SERVICE...${NC}"
  kubectl rollout restart deployment/$SERVICE -n miamo
  sleep 5
  kubectl get pods -n miamo -l service=$SERVICE
fi

# Restart port-forwards
echo -e "\n${Y}Re-establishing port-forwards...${NC}"
pkill -f "port-forward.*-n miamo" 2>/dev/null || true
sleep 1
kubectl port-forward svc/gateway 3200:3200 -n miamo &>/dev/null &
kubectl port-forward svc/web 3100:3100 -n miamo &>/dev/null &
sleep 2

echo -e "\n${G}✓ Restarted.${NC} Web: http://localhost:3100 | API: http://localhost:3200\n"
