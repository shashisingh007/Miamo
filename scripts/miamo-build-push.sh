#!/usr/bin/env bash
# ─── Miamo image build+push (Mac → GHCR) ─────────────────────────────────
# Builds all 11 Miamo service images locally on your Mac, tags them with
# the release tag AND the git SHA, and pushes to GitHub Container Registry.
#
# Prereqs (one-time):
#   1. Create a GitHub PAT with scopes:  read:packages, write:packages, repo
#      https://github.com/settings/tokens/new?scopes=write:packages,read:packages,repo
#   2. Export it in your shell (or add to ~/.zshrc):
#        export GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxxxxxx
#
# Usage:
#   ./scripts/miamo-build-push.sh                # tag=v1 (matches compose default)
#   ./scripts/miamo-build-push.sh v1.2.3         # custom tag
#   ./scripts/miamo-build-push.sh v1 web         # build + push only ONE service
#
# After push, ssh into EC2 (or via SSM) and run:
#   cd /opt/miamo/app && docker compose pull && docker compose up -d
# — or use scripts/miamo-deploy-ghcr.sh which does that via SSM automatically.
set -euo pipefail

TAG="${1:-v1}"
ONLY_SERVICE="${2:-}"

REPO_OWNER="shashisingh007"     # GHCR namespace = your github username
IMAGE_PREFIX="ghcr.io/${REPO_OWNER}/miamo"

# ── Sanity checks ────────────────────────────────────────────────────────
if [[ -z "${GITHUB_PAT:-}" ]]; then
  echo "❌ GITHUB_PAT env var not set."
  echo "   Create a PAT: https://github.com/settings/tokens/new?scopes=write:packages,read:packages,repo"
  echo "   Then: export GITHUB_PAT=ghp_..."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker not found. Install Docker Desktop for Mac."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker Desktop not running. Open Docker Desktop first."
  exit 1
fi

cd "$(dirname "$0")/.."   # repo root

GIT_SHA=$(git rev-parse --short HEAD)
if ! git diff-index --quiet HEAD --; then
  GIT_SHA="${GIT_SHA}-dirty"
fi

echo "═══════════════════════════════════════════════════════"
echo "  Miamo image build+push"
echo "═══════════════════════════════════════════════════════"
echo "  Tag:     ${TAG}  (+ ${GIT_SHA})"
echo "  Prefix:  ${IMAGE_PREFIX}"
[[ -n "${ONLY_SERVICE}" ]] && echo "  Filter:  only ${ONLY_SERVICE}"
echo ""

# ── Login ───────────────────────────────────────────────────────────────
echo "── docker login ghcr.io ──"
echo "$GITHUB_PAT" | docker login ghcr.io -u "$REPO_OWNER" --password-stdin
echo ""

# ── Services + their Dockerfiles ────────────────────────────────────────
declare -a SERVICES=(
  "migrate:docker/migrate.Dockerfile"
  "gateway:docker/gateway.Dockerfile"
  "auth:docker/auth.Dockerfile"
  "users:docker/users.Dockerfile"
  "social:docker/social.Dockerfile"
  "messaging:docker/messaging.Dockerfile"
  "content:docker/content.Dockerfile"
  "notifications:docker/notifications.Dockerfile"
  "ingest:docker/ingest.Dockerfile"
  "tracking-worker:docker/tracking-worker.Dockerfile"
  "web:docker/web.Dockerfile"
)

# ── Build each ──────────────────────────────────────────────────────────
FAILED=()
for entry in "${SERVICES[@]}"; do
  svc="${entry%%:*}"
  dfile="${entry#*:}"

  # Filter mode: skip if user asked for only one service
  if [[ -n "${ONLY_SERVICE}" && "${svc}" != "${ONLY_SERVICE}" ]]; then
    continue
  fi

  IMG="${IMAGE_PREFIX}-${svc}"
  echo "═══ [${svc}] build ═══"
  # linux/amd64 platform tag: your EC2 is x86_64 (t3.small/micro).
  # If you're on Apple Silicon, the default would be arm64 → EC2 can't run it.
  if ! docker buildx build \
      --platform linux/amd64 \
      -f "$dfile" \
      -t "${IMG}:${TAG}" \
      -t "${IMG}:${GIT_SHA}" \
      --push \
      . ; then
    echo "❌ ${svc} FAILED"
    FAILED+=("${svc}")
    continue
  fi
  echo "✅ pushed ${IMG}:${TAG} + ${IMG}:${GIT_SHA}"
  echo ""
done

# ── Summary ─────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "  ${#FAILED[@]} SERVICE(S) FAILED:"
  printf '    - %s\n' "${FAILED[@]}"
  exit 1
fi
echo "  All images built and pushed ✅"
echo ""
echo "  Next: deploy them onto EC2:"
echo "    ./scripts/miamo-deploy-ghcr.sh ${TAG}"
echo ""
