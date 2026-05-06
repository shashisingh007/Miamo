#!/bin/bash
# ═══ Miamo — View Logs (Kubernetes) ═══
cd "$(dirname "$0")/.."

B='\033[1;34m'; NC='\033[0m'

SERVICE=${1:-""}
TAIL=${2:-50}

if [[ -z "$SERVICE" ]]; then
  echo -e "${B}═══ MIAMO K8S LOGS ═══${NC}"
  echo ""
  echo "Usage: scripts/logs.sh <service> [lines]"
  echo ""
  echo "Services: auth, users, social, messaging, content, notifications, gateway, web, postgres, redis"
  echo ""
  echo "Examples:"
  echo "  scripts/logs.sh gateway        # Last 50 lines of gateway"
  echo "  scripts/logs.sh auth 100       # Last 100 lines of auth"
  echo "  scripts/logs.sh all            # All pods (follow)"
  echo ""
  exit 0
fi

if [[ "$SERVICE" == "all" ]]; then
  echo -e "${B}═══ All pod logs (follow) ═══${NC}"
  kubectl logs -f -l app=miamo -n miamo --all-containers --prefix --tail=$TAIL
elif [[ "$SERVICE" == "migrate" ]]; then
  kubectl logs job/miamo-migrate -n miamo
else
  kubectl logs -f -l service=$SERVICE -n miamo --tail=$TAIL
fi
