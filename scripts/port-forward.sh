#!/bin/bash
# Persistent port-forward script for Miamo
# Automatically reconnects if pods restart or connection drops
# Usage: bash scripts/port-forward.sh <env>
# Stop:  kill $(cat /tmp/miamo-pf.pid) or Ctrl+C

source "$(dirname "$0")/_config.sh" "${1:-}"
trap 'echo "Stopping port-forwards..."; kill $(jobs -p) 2>/dev/null; rm -f /tmp/miamo-pf.pid; exit 0' INT TERM

echo $$ > /tmp/miamo-pf.pid
echo "═══ Miamo Port-Forward (persistent) ═══"
echo "  Web:     http://localhost:${LOCAL_WEB_PORT}"
echo "  Gateway: http://localhost:${LOCAL_GATEWAY_PORT}"
echo "  PID:     $$"
echo "  Stop:    kill $$ or Ctrl+C"
echo "═══════════════════════════════════════"

forward_service() {
  local label=$1
  local local_port=$2
  local pod_port=$3
  local svc_name=$4

  while true; do
    # Find the running pod
    POD=$(kubectl get pods -n "$NAMESPACE" --no-headers -o custom-columns=":metadata.name" 2>/dev/null | grep "^${svc_name}-" | head -1)
    if [ -z "$POD" ]; then
      echo "[$(date +%H:%M:%S)] $label: waiting for pod..."
      sleep 5
      continue
    fi

    # Check pod is Running
    STATUS=$(kubectl get pod "$POD" -n "$NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null)
    if [ "$STATUS" != "Running" ]; then
      echo "[$(date +%H:%M:%S)] $label: pod $POD is $STATUS, waiting..."
      sleep 5
      continue
    fi

    echo "[$(date +%H:%M:%S)] $label: forwarding $POD → localhost:$local_port"
    kubectl port-forward "pod/$POD" "$local_port:$pod_port" -n "$NAMESPACE" 2>/dev/null
    echo "[$(date +%H:%M:%S)] $label: connection lost, reconnecting in 3s..."
    sleep 3
  done
}

# Run both forwards in background
forward_service "WEB" ${LOCAL_WEB_PORT} ${WEB_PORT} "web" &
forward_service "GW " ${LOCAL_GATEWAY_PORT} ${GATEWAY_PORT} "gateway" &

# Wait for all background jobs
wait
