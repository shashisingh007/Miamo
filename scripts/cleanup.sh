#!/bin/bash
# ═══ Miamo — Full Cleanup ═══
# Usage: bash scripts/cleanup.sh <env> [--full]
set -e
source "$(dirname "$0")/_config.sh" "${1:-}"

echo -e "\n${R}═══ MIAMO K8S CLEANUP [${ENV}] ═══${NC}\n"

pkill -f "port-forward.*-n ${NAMESPACE}" 2>/dev/null || true

echo -e "${Y}[1/2]${NC} Deleting namespace ${NAMESPACE}..."
kubectl delete namespace ${NAMESPACE} --ignore-not-found --timeout=60s
echo -e "  ${G}✓${NC} Namespace deleted"

if [[ "${2:-}" == "--full" ]]; then
  echo -e "${Y}[2/2]${NC} Stopping minikube..."
  minikube stop
  echo -e "  ${G}✓${NC} Minikube stopped"
  echo -e "  To nuke completely: ${Y}minikube delete${NC}"
else
  echo -e "\n${G}✓ Cleaned.${NC} Minikube still running."
  echo -e "  Full cleanup: ${Y}bash scripts/cleanup.sh ${ENV} --full${NC}"
fi
echo ""
