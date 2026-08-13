#!/usr/bin/env bash
# ─── Miamo deploy (GHCR pull → restart on EC2) ──────────────────────────
# Runs from your Mac. Uses SSM to have the EC2 instance:
#   1. Login to GHCR with the stored PAT
#   2. `docker compose pull` (fetch new images, ~30s if changed)
#   3. `docker compose up -d` (recreate only changed containers)
#   4. Smoke-test the site
#
# Prereqs (one-time, per host):
#   - AWS creds in .env (already set up)
#   - PAT stored in SSM as /miamo-prod/GHCR_PULL_TOKEN (see setup-ghcr-auth.sh)
#   - Instance profile has ssm:GetParameter permission on that path
#
# Usage:
#   ./scripts/miamo-deploy-ghcr.sh                 # tag=v1
#   ./scripts/miamo-deploy-ghcr.sh v1.2.3
set -euo pipefail

TAG="${1:-v1}"
INSTANCE_ID="${MIAMO_INSTANCE_ID:-i-0f62dd7a5a0c5af05}"
REGION="${AWS_DEFAULT_REGION:-ap-south-1}"

# Load AWS creds from .env if not already exported
if [[ -z "${AWS_ACCESS_KEY_ID:-}" ]] && [[ -f "$(dirname "$0")/../.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$(dirname "$0")/../.env"
  set +a
fi
unset AWS_PROFILE 2>/dev/null || true

echo "═══ deploying tag=${TAG} to ${INSTANCE_ID} (${REGION}) ═══"

# ── Send the deploy command via SSM ─────────────────────────────────────
CMD_JSON=$(cat <<EOF
{
  "InstanceIds": ["${INSTANCE_ID}"],
  "DocumentName": "AWS-RunShellScript",
  "TimeoutSeconds": 1200,
  "Parameters": {
    "commands": [
      "set -e",
      "cd /opt/miamo/app",
      "echo '── login to GHCR ──'",
      "GHCR_TOKEN=\$(aws ssm get-parameter --region ${REGION} --name /miamo-prod/GHCR_PULL_TOKEN --with-decryption --query Parameter.Value --output text)",
      "echo \$GHCR_TOKEN | sudo docker login ghcr.io -u shashisingh007 --password-stdin",
      "unset GHCR_TOKEN",
      "echo",
      "echo '── pull new images (tag=${TAG}) ──'",
      "sudo MIAMO_IMAGE_TAG=${TAG} docker compose pull 2>&1 | tail -30",
      "echo",
      "echo '── recreate containers ──'",
      "sudo MIAMO_IMAGE_TAG=${TAG} docker compose up -d 2>&1 | tail -20",
      "echo",
      "sleep 20",
      "echo '── container status ──'",
      "sudo docker ps --format 'table {{.Names}}\\t{{.Status}}'",
      "echo",
      "echo '── prune old images (frees disk) ──'",
      "sudo docker image prune -f 2>&1 | tail -2",
      "echo",
      "echo '── smoke ──'",
      "curl -sI --max-time 5 -H 'Host: miamo.in' http://localhost/ | head -3",
      "echo",
      "curl -sI --max-time 5 -H 'Host: api.miamo.in' http://localhost/healthz | head -3"
    ],
    "executionTimeout": ["1200"]
  }
}
EOF
)
CMD_JSON_FILE=$(mktemp)
echo "$CMD_JSON" > "$CMD_JSON_FILE"

CMD_ID=$(aws ssm send-command --cli-input-json "file://${CMD_JSON_FILE}" --region "$REGION" --query 'Command.CommandId' --output text)
rm -f "$CMD_JSON_FILE"
echo "  ssm command id: $CMD_ID"

# ── Poll ────────────────────────────────────────────────────────────────
echo "  polling…"
for i in $(seq 1 30); do
  STATUS=$(aws ssm get-command-invocation \
    --command-id "$CMD_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Status' --output text 2>/dev/null || echo "Pending")
  echo "    ${i}/30: $STATUS"
  case "$STATUS" in
    Success|Failed|Cancelled|TimedOut) break ;;
  esac
  sleep 15
done

echo ""
echo "═══ deploy output ═══"
aws ssm get-command-invocation \
  --command-id "$CMD_ID" \
  --instance-id "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'StandardOutputContent' --output text | tail -60

if [[ "$STATUS" != "Success" ]]; then
  echo ""
  echo "═══ STDERR ═══"
  aws ssm get-command-invocation \
    --command-id "$CMD_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'StandardErrorContent' --output text | tail -40
  exit 1
fi

echo ""
echo "✅ deploy complete"
