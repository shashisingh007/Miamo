#!/bin/bash
# ═══ Miamo — Stop Services ═══
# Usage: bash scripts/stop.sh <env>
set -e
source "$(dirname "$0")/_config.sh" "${1:-}"

echo -e "\n${B}═══ MIAMO K8S STOP [${ENV}] ═══${NC}\n"

echo -e "${Y}[1/2]${NC} Stopping port-forwards..."
pkill -f "port-forward.*-n ${NAMESPACE}" 2>/dev/null || true
echo -e "  ${G}✓${NC} Port-forwards stopped"

echo -e "${Y}[2/2]${NC} Scaling down deployments..."
kubectl scale deployment --all --replicas=0 -n ${NAMESPACE} 2>/dev/null || true
echo -e "  ${G}✓${NC} All deployments scaled to 0"

echo -e "\n${G}Stopped.${NC} Run ${Y}bash scripts/start.sh ${ENV}${NC} to resume.\n"
