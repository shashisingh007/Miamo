#!/bin/bash
# ═══ Miamo — View Logs ═══
# Usage: bash scripts/logs.sh <env> [service] [lines]
source "$(dirname "$0")/_config.sh" "${1:-}" 2>/dev/null || {
  echo "Usage: bash scripts/logs.sh <env> <service> [lines]"
  echo "Environments: dev, staging, prod"
  exit 0
}
SERVICE="${2:-}"
TAIL="${3:-50}"

if [[ -z "$SERVICE" ]]; then
  echo -e "${B}═══ MIAMO K8S LOGS [${ENV}] ═══${NC}"
  echo ""
  echo "Usage: bash scripts/logs.sh ${ENV} <service> [lines]"
  echo ""
  echo "Services: auth, users, social, messaging, content, notifications, gateway, web, postgres, redis, all, migrate"
  echo ""
  exit 0
fi

if [[ "$SERVICE" == "all" ]]; then
  echo -e "${B}═══ All pod logs [${ENV}] (follow) ═══${NC}"
  kubectl logs -f -l app=miamo -n ${NAMESPACE} --all-containers --prefix --tail=$TAIL
elif [[ "$SERVICE" == "migrate" ]]; then
  kubectl logs job/miamo-migrate -n ${NAMESPACE}
else
  kubectl logs -f deployment/$SERVICE -n ${NAMESPACE} --tail=$TAIL
fi
