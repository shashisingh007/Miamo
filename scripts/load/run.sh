#!/bin/bash
# k6 load-test wrapper.
#
# What this does:
#   Validates that `k6` is on PATH, sanity-checks required env vars for
#   the chosen script, and dispatches to `k6 run` with sensible defaults.
#
# Usage:
#   bash scripts/load/run.sh <script-name>
#
# Where <script-name> is one of:
#   discover              — 100 RPS ramp/hold, 6 min total
#   matches               — 50 RPS for 3 min
#   messages              — 30 RPS for 3 min (needs LOAD_CHAT_ID)
#   ingest                — 200 RPS for 5 min (points at :3260)
#   discover-realistic    — 20 sessions/sec for 5 min
#
# Env vars:
#   LOAD_TARGET     — base URL (default http://localhost:3200 for gateway,
#                     http://localhost:3260 for ingest)
#   LOAD_TOKEN      — bearer token for auth'd endpoints
#   LOAD_CHAT_ID    — chat UUID for the messages test
#   LOAD_PERSONAS   — comma-separated seed usernames for realistic sessions

set -euo pipefail

SCRIPT_NAME="${1:-}"

if [[ -z "$SCRIPT_NAME" ]]; then
  echo "usage: bash scripts/load/run.sh <script-name>" >&2
  echo "  scripts: discover matches messages ingest discover-realistic" >&2
  exit 2
fi

# ── pre-flight: k6 binary ──────────────────────────
if ! command -v k6 >/dev/null 2>&1; then
  echo "error: k6 is not on PATH" >&2
  echo "install: brew install k6   # macOS" >&2
  echo "         apt install k6    # Debian/Ubuntu (after adding grafana APT)" >&2
  echo "see: https://k6.io/docs/get-started/installation/" >&2
  exit 3
fi

# ── resolve script path ────────────────────────────
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="$HERE/${SCRIPT_NAME}.js"

if [[ ! -f "$SCRIPT_PATH" ]]; then
  echo "error: no such script: $SCRIPT_PATH" >&2
  ls "$HERE"/*.js | sed 's|.*/||;s|\.js$||' | while read -r f; do echo "  - $f" >&2; done
  exit 2
fi

# ── env-var contract per script ────────────────────
case "$SCRIPT_NAME" in
  ingest)
    export LOAD_TARGET="${LOAD_TARGET:-http://localhost:3260}"
    ;;
  messages)
    export LOAD_TARGET="${LOAD_TARGET:-http://localhost:3200}"
    if [[ -z "${LOAD_TOKEN:-}" ]]; then
      echo "error: LOAD_TOKEN required for messages test" >&2
      exit 2
    fi
    if [[ -z "${LOAD_CHAT_ID:-}" ]]; then
      echo "error: LOAD_CHAT_ID required for messages test" >&2
      exit 2
    fi
    ;;
  discover|matches)
    export LOAD_TARGET="${LOAD_TARGET:-http://localhost:3200}"
    if [[ -z "${LOAD_TOKEN:-}" ]]; then
      echo "warn: LOAD_TOKEN unset — requests will hit /login redirects" >&2
    fi
    ;;
  discover-realistic)
    export LOAD_TARGET="${LOAD_TARGET:-http://localhost:3200}"
    ;;
esac

echo "→ k6 run $SCRIPT_PATH (target: $LOAD_TARGET)"
exec k6 run "$SCRIPT_PATH"
