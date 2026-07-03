#!/usr/bin/env bash
# ─── Miamo rollback runbook script ────────────────────────────────────
#
# Purpose: "one command to revert to a previous image tag" for either
# the docker-compose or the k8s deploy path. When we roll back, we roll
# back the whole set of 7 services together — a partial rollback is
# almost never what we want.
#
# Usage:
#   ./scripts/rollback.sh <tag>                # docker: rollback the compose stack to <tag>
#   ./scripts/rollback.sh <tag> --k8s          # kubernetes: rollout undo across the 7 deployments
#   ./scripts/rollback.sh --dry-run <tag>      # print the plan without executing
#
# Feature flag: none — script is opt-in per invocation.
#
# Cross-refs:
#   docs/architecture/dr-runbook.md §4 (Rollback procedures)
#   docs/DEVOPS.md §CI/CD (deploy pipeline)
#
# Exit codes:
#   0 — rollback complete
#   1 — bad arguments / missing tag
#   2 — docker compose / kubectl failed
#   3 — post-rollback smoke check failed

set -euo pipefail

MODE="docker"
DRY_RUN=0
TAG=""

for arg in "$@"; do
  case "$arg" in
    --k8s)     MODE="k8s" ;;
    --dry-run) DRY_RUN=1 ;;
    -*)        echo "unknown flag: $arg" >&2; exit 1 ;;
    *)         TAG="$arg" ;;
  esac
done

if [[ -z "$TAG" && "$MODE" != "k8s" ]]; then
  echo "Usage: $0 <tag> [--k8s] [--dry-run]"
  echo "  <tag>  target image tag to roll back to (e.g. v1.0.2)."
  echo "         In --k8s mode, tag is optional and 'kubectl rollout undo' is used."
  exit 1
fi

SERVICES=(gateway auth users social messaging content notifications tracking-worker ingest miamo-web)

echo "── Miamo rollback ──"
echo "  Mode:      $MODE"
echo "  Target:    ${TAG:-<previous ReplicaSet>}"
echo "  Services:  ${SERVICES[*]}"
echo "  Dry run:   $DRY_RUN"

if [[ "$DRY_RUN" -eq 1 ]]; then
  if [[ "$MODE" == "docker" ]]; then
    echo "  [PLAN] IMAGE_TAG=$TAG docker compose -f docker-compose.prod.yml pull"
    echo "  [PLAN] IMAGE_TAG=$TAG docker compose -f docker-compose.prod.yml up -d"
  else
    for svc in "${SERVICES[@]}"; do
      if [[ -n "$TAG" ]]; then
        echo "  [PLAN] kubectl set image deployment/$svc $svc=miamo/$svc:$TAG -n miamo"
      else
        echo "  [PLAN] kubectl rollout undo deployment/$svc -n miamo"
      fi
    done
  fi
  exit 0
fi

# ── Docker compose path ──────────────────────────────────────────────
if [[ "$MODE" == "docker" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "  docker not installed on this host." >&2
    exit 2
  fi
  echo "  Pulling images for tag=$TAG..."
  IMAGE_TAG="$TAG" docker compose -f docker-compose.prod.yml pull || { echo "  pull failed"; exit 2; }
  echo "  Restarting stack..."
  IMAGE_TAG="$TAG" docker compose -f docker-compose.prod.yml up -d || { echo "  up failed"; exit 2; }
fi

# ── Kubernetes path ──────────────────────────────────────────────────
if [[ "$MODE" == "k8s" ]]; then
  if ! command -v kubectl >/dev/null 2>&1; then
    echo "  kubectl not installed on this host." >&2
    exit 2
  fi
  for svc in "${SERVICES[@]}"; do
    if [[ -n "$TAG" ]]; then
      kubectl set image "deployment/$svc" "$svc=miamo/$svc:$TAG" -n miamo || { echo "  set image failed for $svc"; exit 2; }
    else
      kubectl rollout undo "deployment/$svc" -n miamo || { echo "  rollout undo failed for $svc"; exit 2; }
    fi
  done
  for svc in "${SERVICES[@]}"; do
    kubectl rollout status "deployment/$svc" -n miamo --timeout=120s || { echo "  status check failed for $svc"; exit 2; }
  done
fi

echo "  Rollback complete. Next steps:"
echo "    1) Run smoke QA:   python3 scripts/qa-runs/phase-16-smoke.py"
echo "    2) Watch error rate for 10 min before declaring stable."
echo "    3) File a rollback postmortem within 24 h."

exit 0
