#!/usr/bin/env bash
# ─── Miamo pre-migration paranoia dump ─────────────────────────────────
#
# Purpose: take a full pg_dump of the Miamo production Postgres and
# upload it to the backup bucket with a timestamped filename. Run
# **before every production migration**.
#
# Not a replacement for RDS auto-snapshots (§dr-runbook.md §1) — this is
# the "belt AND suspenders" layer so a bad migration can be rolled back
# from a dump we personally ran, not just from RDS's automated schedule.
#
# Usage:
#   ./scripts/backup-postgres.sh                    # default: prod DATABASE_URL from env
#   ./scripts/backup-postgres.sh --tag=<label>      # add a label to the filename
#   ./scripts/backup-postgres.sh --dry-run          # print the plan without dumping
#   DATABASE_URL=... S3_BUCKET=... ./scripts/backup-postgres.sh
#
# Feature flag: none — this script is opt-in per invocation.
#
# Exit codes:
#   0 — dump + upload succeeded
#   1 — DATABASE_URL missing
#   2 — pg_dump failed
#   3 — S3 upload failed (dump kept on disk at /tmp/)

set -euo pipefail

TAG=""
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --tag=*)   TAG="${arg#*=}" ;;
    --dry-run) DRY_RUN=1 ;;
    *) echo "unknown argument: $arg" >&2; exit 1 ;;
  esac
done

: "${DATABASE_URL:?DATABASE_URL not set — refusing to proceed. Export it or source /etc/miamo/env}"
S3_BUCKET="${S3_BUCKET:-miamo-backups-prod}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
LABEL="${TAG:+-$TAG}"
FILENAME="miamo-pgdump-${TS}${LABEL}.sql.gz"
LOCAL_PATH="/tmp/${FILENAME}"
S3_KEY="pre-migration/${FILENAME}"

echo "── Miamo pre-migration paranoia dump ──"
echo "  Source DB:      ${DATABASE_URL%%\?*}"   # strip query string (usually contains ssl config, no secrets)
echo "  Dump filename:  ${FILENAME}"
echo "  Upload target:  s3://${S3_BUCKET}/${S3_KEY}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "  [DRY-RUN] plan generated; not dumping."
  exit 0
fi

# ── Dump ──────────────────────────────────────────────────────────────
echo "  Starting pg_dump..."
if ! pg_dump "$DATABASE_URL" --no-owner --no-acl --format=plain | gzip -9 > "$LOCAL_PATH"; then
  echo "  pg_dump FAILED. See stderr above." >&2
  exit 2
fi

DUMP_BYTES=$(stat -c %s "$LOCAL_PATH" 2>/dev/null || stat -f %z "$LOCAL_PATH")
echo "  pg_dump OK — ${DUMP_BYTES} bytes written to ${LOCAL_PATH}"

# Sanity check — a dump under 1 KB almost certainly failed silently.
if (( DUMP_BYTES < 1024 )); then
  echo "  Dump too small (${DUMP_BYTES} bytes). Refusing to upload — probable failure." >&2
  exit 2
fi

# ── Upload ────────────────────────────────────────────────────────────
if ! command -v aws >/dev/null 2>&1; then
  echo "  aws CLI not installed — dump kept at ${LOCAL_PATH}. Upload manually." >&2
  exit 3
fi

echo "  Uploading to s3://${S3_BUCKET}/${S3_KEY}..."
if ! aws s3 cp "$LOCAL_PATH" "s3://${S3_BUCKET}/${S3_KEY}" --sse AES256 --storage-class STANDARD_IA; then
  echo "  Upload FAILED. Dump kept at ${LOCAL_PATH} — upload manually." >&2
  exit 3
fi

echo "  Upload OK. Dump also kept at ${LOCAL_PATH} for local reference."
echo "  Restore command:"
echo "    aws s3 cp s3://${S3_BUCKET}/${S3_KEY} /tmp/${FILENAME}"
echo "    gunzip -c /tmp/${FILENAME} | psql \"\$DATABASE_URL_TARGET\""

exit 0
