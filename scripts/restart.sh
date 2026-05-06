#!/bin/bash
# ═══ Miamo — Restart Services ═══
# Usage: bash scripts/restart.sh <env> [service]
set -e
source "$(dirname "$0")/_config.sh" "${1:-}"
SERVICE="${2:-all}"

echo -e "\n${B}═══ MIAMO K8S RESTART [${ENV}] ═══${NC}\n"

if [[ "$SERVICE" == "all" ]]; then
  echo -e "${Y}Restarting all deployments...${NC}"
  kubectl rollout restart deployment -n ${NAMESPACE}
else
  echo -e "${Y}Restarting ${SERVICE}...${NC}"
  kubectl rollout restart deployment/${SERVICE} -n ${NAMESPACE}
fi

sleep 5
kubectl get pods -n ${NAMESPACE} --no-headers | awk '{printf "  %-40s %s\n", $1, $3}'

# Re-establish port-forwards
echo -e "\n${Y}Re-establishing port-forwards...${NC}"
pkill -f "port-forward.*-n ${NAMESPACE}" 2>/dev/null || true
sleep 1
kubectl port-forward svc/gateway ${SERVICE_PORT}:${SERVICE_PORT} -n ${NAMESPACE} &>/dev/null &
kubectl port-forward svc/web ${SERVICE_PORT}:${SERVICE_PORT} -n ${NAMESPACE} &>/dev/null &
sleep 2

echo -e "\n${G}✓ Restart complete.${NC}\n"
