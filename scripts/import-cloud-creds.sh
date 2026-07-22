#!/usr/bin/env bash
# Miamo — one-shot importer for cloud provider credentials.
#
# Reads the 8 credential env vars from YOUR shell (which you already exported)
# and appends them to .env at the repo root — WITHOUT ever printing them.
#
# Run this from the terminal window where you already ran your `export` lines:
#     bash scripts/import-cloud-creds.sh
#
# Safe to re-run: existing entries are updated in-place, not duplicated.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"

REQUIRED_VARS=(
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  AWS_DEFAULT_REGION
  AWS_ACCOUNT_ID
  CLOUDFLARE_API_TOKEN
  CLOUDFLARE_ACCOUNT_ID
  GODADDY_PAT
  MIAMO_DOMAIN
)

# ── 1. Verify every var is set in this shell ───────────────────────────
missing=()
for v in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!v:-}" ]; then
    missing+=("$v")
  fi
done
if [ ${#missing[@]} -gt 0 ]; then
  echo "✗ These env vars are not set in this shell:" >&2
  for v in "${missing[@]}"; do echo "    $v" >&2; done
  echo "" >&2
  echo "Re-run your \`export …\` lines in THIS terminal, then re-run this script." >&2
  exit 1
fi

# ── 2. Ensure .env exists and is gitignored ────────────────────────────
touch "$ENV_FILE"
if ! grep -qFx ".env" "$ROOT/.gitignore" 2>/dev/null; then
  echo ".env" >> "$ROOT/.gitignore"
fi

# ── 3. Upsert each var into .env (replace if present, append if not) ───
for v in "${REQUIRED_VARS[@]}"; do
  val="${!v}"
  if grep -q "^${v}=" "$ENV_FILE"; then
    # Update existing line. Use | as delimiter so slashes/URLs are fine.
    # Escape backslash + | in the value.
    esc=$(printf '%s' "$val" | sed 's/[\\|]/\\&/g')
    # sed -i differs between mac and linux; try both syntaxes.
    if sed --version >/dev/null 2>&1; then
      sed -i "s|^${v}=.*|${v}=${esc}|" "$ENV_FILE"
    else
      sed -i '' "s|^${v}=.*|${v}=${esc}|" "$ENV_FILE"
    fi
    echo "  ✓ updated ${v}  (${#val} chars)"
  else
    printf '%s=%s\n' "$v" "$val" >> "$ENV_FILE"
    echo "  ✓ added   ${v}  (${#val} chars)"
  fi
done

echo ""
echo "✓ Credentials written to $ENV_FILE"
echo "  (No values were printed; .env is git-ignored.)"
