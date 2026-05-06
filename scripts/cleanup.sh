#!/bin/bash
# ═══ Miamo — Full Cleanup (Kubernetes) ═══
# Removes namespace, pods, PVCs, and optionally minikube
set -e
cd "$(dirname "$0")/.."

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; NC='\033[0m'
echo -e "\n${R}═══ MIAMO K8S CLEANUP ═══${NC}\n"

# Kill port-forwards
pkill -f "port-forward.*-n miamo" 2>/dev/null || true

# Delete namespace (removes everything)
echo -e "${Y}[1/2]${NC} Deleting miamo namespace (all resources)..."
kubectl delete namespace miamo --ignore-not-found --timeout=60s
echo -e "  ${G}✓${NC} Namespace deleted"

if [[ "$1" == "--full" ]]; then
  echo -e "${Y}[2/2]${NC} Stopping minikube cluster..."
  minikube stop
  echo -e "  ${G}✓${NC} Minikube stopped"
  echo ""
  echo -e "  To completely remove minikube: ${Y}minikube delete${NC}"
else
  echo -e "\n${G}✓ Cleaned.${NC} Minikube still running."
  echo -e "  To also stop minikube: ${Y}scripts/cleanup.sh --full${NC}"
  echo -e "  To nuke minikube entirely: ${Y}minikube delete${NC}"
fi
echo ""
