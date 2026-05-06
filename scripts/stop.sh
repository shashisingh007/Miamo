#!/bin/bash
# ═══ Miamo — Stop All Services (Kubernetes) ═══
set -e
cd "$(dirname "$0")/.."

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1;34m'; NC='\033[0m'
echo -e "\n${B}═══ MIAMO K8S STOP ═══${NC}\n"

# Kill port-forwards
echo -e "${Y}[1/2]${NC} Stopping port-forwards..."
pkill -f "port-forward.*-n miamo" 2>/dev/null || true
echo -e "  ${G}✓${NC} Port-forwards stopped"

# Scale down deployments
echo -e "${Y}[2/2]${NC} Scaling down deployments..."
kubectl scale deployment --all --replicas=0 -n miamo 2>/dev/null || true
echo -e "  ${G}✓${NC} All deployments scaled to 0"

echo -e "\n${G}Stopped.${NC} Data and PVCs remain. Use ${Y}scripts/cleanup.sh${NC} to fully remove.\n"
