#!/usr/bin/env bash
# ─── One-time: store GHCR PAT in SSM so EC2 can pull private images ─────
# Runs from your Mac. Reads GITHUB_PAT env var, writes it to SSM as a
# SecureString parameter. EC2's instance profile already has ssm:GetParameter
# permission on /miamo-prod/* so no IAM change needed.
set -euo pipefail

if [[ -z "${GITHUB_PAT:-}" ]]; then
  echo "❌ export GITHUB_PAT=ghp_... first"
  exit 1
fi

REGION="${AWS_DEFAULT_REGION:-ap-south-1}"

# Load AWS creds from .env if not already exported
if [[ -z "${AWS_ACCESS_KEY_ID:-}" ]] && [[ -f "$(dirname "$0")/../.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$(dirname "$0")/../.env"
  set +a
fi
unset AWS_PROFILE 2>/dev/null || true

echo "── writing PAT to SSM ──"
# SSM forbids --overwrite + --tags in the same call. Put the value first,
# then attach tags via AddTagsToResource (idempotent).
aws ssm put-parameter \
  --region "$REGION" \
  --name /miamo-prod/GHCR_PULL_TOKEN \
  --value "$GITHUB_PAT" \
  --type SecureString \
  --overwrite \
  > /dev/null

aws ssm add-tags-to-resource \
  --region "$REGION" \
  --resource-type Parameter \
  --resource-id /miamo-prod/GHCR_PULL_TOKEN \
  --tags 'Key=Project,Value=miamo_vpc' 'Key=Purpose,Value=GHCR container pull auth' \
  > /dev/null 2>&1 || true

echo "✓ stored as /miamo-prod/GHCR_PULL_TOKEN"
echo ""
echo "verify from EC2:"
echo "  aws ssm get-parameter --region $REGION --name /miamo-prod/GHCR_PULL_TOKEN --with-decryption --query Parameter.Value"
