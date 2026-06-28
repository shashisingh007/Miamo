#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#   Miamo — Unified Entry-Point (scripts/start.sh)  v1
# ═══════════════════════════════════════════════════════════════════════════════
#   ONE script. Three modes (local / docker / k8s). Three envs (dev/staging/prod).
#   Same verbs everywhere: start / stop / restart / status / logs / test.
#
#   USAGE:    bash scripts/start.sh <mode> <command> [env] [service]
#   QUICK:    bash scripts/start.sh local dev        (2-arg shorthand = start)
#             bash scripts/start.sh docker dev
#             bash scripts/start.sh k8s dev
#             bash scripts/start.sh                  (default: local start dev)
#   HELP:     bash scripts/start.sh help [local|docker|k8s]
#
#   Back-compat: `local start`, `docker up`, `docker down`, `k8s deploy`,
#                `k8s destroy` all still work (mapped to start/stop/etc).
# ═══════════════════════════════════════════════════════════════════════════════

# ─── CRLF self-fix (Windows checkout) — strip CRs and re-exec.
if head -1 "$0" 2>/dev/null | grep -q $'\r'; then
  _SELF="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")"; pwd)/$(basename "${BASH_SOURCE[0]:-$0}")"
  if command -v sed &>/dev/null; then
    sed -i.bak 's/\r$//' "$_SELF" 2>/dev/null || sed -i 's/\r$//' "$_SELF" 2>/dev/null
    rm -f "${_SELF}.bak" 2>/dev/null
    exec bash "$_SELF" "$@"
  fi
fi

# No `set -e` — prereq install paths must be resilient. We use `|| true` and
# explicit `die` calls instead. `set -u` catches typos in vars.
set -u
set -o pipefail

VERSION="v1"

# ─── Colours: G/Y/R/B/C/P + NC reset ──────────────────────────────────────────
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'
B='\033[1;34m'; C='\033[0;36m'; P='\033[0;35m'; NC='\033[0m'

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")"; pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
LOG_DIR="/tmp/miamo-logs"
PID_DIR="/tmp/miamo-pids"
K8S_TEMPLATES="$ROOT/k8s/templates"
K8S_OUTPUT="/tmp/miamo-k8s-rendered"
CONFIG_DIR="$ROOT/configuration"
mkdir -p "$LOG_DIR" "$PID_DIR"

# 7 app services in local mode (Postgres + Redis run in Docker).
SERVICES="gateway:3200 auth:3201 users:3202 social:3203 messaging:3204 content:3205 notifications:3206"
# Extended docker/k8s container list (adds web + ingest + tracking-worker + DBs).
DOCKER_CONTAINERS="miamo-gateway miamo-auth miamo-users miamo-social miamo-messaging miamo-content miamo-notifications miamo-ingest miamo-tracking-worker miamo-web miamo-postgres miamo-redis"

# ─── Logging helpers ──────────────────────────────────────────────────────────
say()  { echo -e "$@"; }
ok()   { echo -e "  ${G}✓${NC} $*"; }
note() { echo -e "  ${C}●${NC} $*"; }
warn() { echo -e "  ${Y}⚠${NC} $*"; }
fail() { echo -e "  ${R}✗${NC} $*"; }
step() { echo -e "  ${Y}▶${NC} $*"; }
hdr()  { echo -e "${B}━━━ $* ━━━${NC}"; }

die() {
  local cmd="${1:-?}" hint="${2:-?}"
  echo ""
  echo -e "${R}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${R}║   start.sh failed${NC}"
  echo -e "${R}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo -e "  ${Y}Failing command:${NC} $cmd"
  echo -e "  ${Y}Hint:${NC}            $hint"
  echo ""
  exit 1
}

# ─── OS detection → mac | linux-<distro> | windows-<flavour> | unknown
detect_os() {
  case "$(uname -s 2>/dev/null || echo unknown)" in
    Darwin*) echo "mac"; return ;;
    MINGW*)  echo "windows-gitbash"; return ;;
    MSYS*)   echo "windows-msys"; return ;;
    CYGWIN*) echo "windows-cygwin"; return ;;
    Linux*)  : ;;
    *) echo "unknown"; return ;;
  esac
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    case "${ID:-other}" in
      ubuntu)              echo "linux-ubuntu" ;;
      debian|raspbian)     echo "linux-debian" ;;
      fedora)              echo "linux-fedora" ;;
      rhel|centos|rocky|almalinux) echo "linux-rhel" ;;
      arch|manjaro|endeavouros)    echo "linux-arch" ;;
      alpine)              echo "linux-alpine" ;;
      *)                   echo "linux-other" ;;
    esac
  else
    echo "linux-other"
  fi
}

os_family() {
  case "$1" in mac) echo mac ;; linux-*) echo linux ;; windows-*) echo windows ;; *) echo unknown ;; esac
}

# Refresh $PATH so newly installed tools become visible across mac/linux/win.
refresh_path() {
  hash -r 2>/dev/null || true
  [[ -f /opt/homebrew/bin/brew ]] && eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null || true
  [[ -f /usr/local/bin/brew    ]] && eval "$(/usr/local/bin/brew shellenv)"    2>/dev/null || true
  [[ -d "$HOME/.local/bin" ]] && export PATH="$HOME/.local/bin:$PATH"
  if [[ "${OS_FAMILY:-}" == "windows" ]]; then
    [[ -d /c/ProgramData/chocolatey/bin ]] && export PATH="/c/ProgramData/chocolatey/bin:$PATH"
    [[ -d "/c/Program Files/nodejs" ]] && export PATH="/c/Program Files/nodejs:$PATH"
    [[ -d "/c/Program Files/Docker/Docker/resources/bin" ]] && export PATH="/c/Program Files/Docker/Docker/resources/bin:$PATH"
    [[ -n "${APPDATA:-}" && -d "$APPDATA/npm" ]] && export PATH="$APPDATA/npm:$PATH"
  fi
  export PATH="/usr/local/bin:/usr/bin:/bin:/snap/bin:$PATH"
  hash -r 2>/dev/null || true
}

# True iff we're on Git Bash / MSYS / Cygwin under Windows.
is_windows() { [[ "${OS_FAMILY:-}" == "windows" ]]; }

# Kill any process listening on TCP $1. Works on mac, linux, and Windows Git Bash.
# because: Windows Git Bash (MINGW64) doesn't ship `lsof`; fall back to netstat+taskkill.
clear_port() {
  local port="$1"
  if has lsof; then
    lsof -ti:"$port" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    return 0
  fi
  if is_windows; then
    # netstat -ano lists "TCP  0.0.0.0:PORT  ...  LISTENING  <pid>"
    local pid
    pid="$(netstat -ano 2>/dev/null | awk -v p=":${port}" '$2 ~ p"$" && $4=="LISTENING" {print $5; exit}')"
    if [[ -n "$pid" && "$pid" != "0" ]]; then
      taskkill //F //PID "$pid" >/dev/null 2>&1 || true
    fi
    return 0
  fi
  # Linux without lsof — try fuser.
  if has fuser; then
    fuser -k "${port}/tcp" 2>/dev/null || true
    return 0
  fi
  warn "no port-killing tool found (lsof/netstat/fuser) — port ${port} may still be in use"
}

# `has TOOL` — checks PATH then well-known install paths (mac/linux/win).
has() {
  command -v "$1" &>/dev/null && return 0
  case "$1" in
    brew)     [[ -x /opt/homebrew/bin/brew || -x /usr/local/bin/brew ]] && return 0 ;;
    node)
      [[ -x "/c/Program Files/nodejs/node.exe" || -x /usr/local/bin/node || -x /usr/bin/node || -x "$HOME/.local/bin/node" ]] && return 0
      if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
        # shellcheck disable=SC1090,SC1091
        . "${NVM_DIR:-$HOME/.nvm}/nvm.sh" 2>/dev/null
        command -v node &>/dev/null && return 0
      fi ;;
    npm)      [[ -x "/c/Program Files/nodejs/npm.cmd" || -x /usr/local/bin/npm || -x /usr/bin/npm || -x "$HOME/.local/bin/npm" ]] && return 0 ;;
    docker)   [[ -x "/c/Program Files/Docker/Docker/resources/bin/docker.exe" || -x /usr/local/bin/docker || -x /usr/bin/docker ]] && return 0 ;;
    kubectl)  [[ -x /usr/local/bin/kubectl || -x "$HOME/.local/bin/kubectl" ]] && return 0 ;;
    minikube) [[ -x /usr/local/bin/minikube || -x "$HOME/.local/bin/minikube" ]] && return 0 ;;
    python3|python) [[ -x /usr/local/bin/python3 || -x /usr/bin/python3 ]] && return 0 ;;
    psql)     [[ -x /usr/local/bin/psql || -x /usr/bin/psql || -x /opt/homebrew/bin/psql ]] && return 0 ;;
  esac
  return 1
}

# Print the installed version of a tool, or "?" if absent.
tool_version() {
  case "$1" in
    node)     node -v 2>/dev/null || echo "?" ;;
    npm)      npm -v 2>/dev/null || echo "?" ;;
    git)      git --version 2>/dev/null | awk '{print $3}' ;;
    docker)   docker --version 2>/dev/null | awk '{print $3}' | tr -d ',' ;;
    kubectl)  kubectl version --client --output=yaml 2>/dev/null | awk '/gitVersion/ {print $2; exit}' ;;
    minikube) minikube version 2>/dev/null | awk '/minikube version/ {print $3; exit}' ;;
    helm)     helm version --short 2>/dev/null ;;
    python3)  python3 --version 2>/dev/null | awk '{print $2}' ;;
    psql)     psql --version 2>/dev/null | awk '{print $3}' ;;
    brew)     brew --version 2>/dev/null | head -1 | awk '{print $2}' ;;
    *)        echo "?" ;;
  esac
}

# ─── ENV LOADING — the bootstrap trap (docs/RUNBOOK.md Incident 2) ───────────
# Source order: (1) root .env via `set -a; source .env; set +a` so v8 flags
# propagate; (2) configuration/<env>/values.yaml parsed with awk (no yq).

load_root_env() {
  if [[ ! -f "$ROOT/.env" ]]; then
    [[ -f "$ROOT/.env.example" ]] || die "load_root_env" "neither .env nor .env.example exists at $ROOT"
    warn ".env missing — copying .env.example → .env"
    cp "$ROOT/.env.example" "$ROOT/.env"
  fi
  note "Bootstrap: sourcing .env (set -a; source .env; set +a)"
  set -a; . "$ROOT/.env"; set +a    # shellcheck disable=SC1091
  ok ".env loaded ($(grep -c '=' "$ROOT/.env" 2>/dev/null || echo '?') variables)"

  # Show which v8 flags are ON — addresses RUNBOOK Incident 2 (the trap).
  local v8_on=""
  for f in ALGO_V8_DISCOVER_RANKER_ENABLED ALGO_V8_FAIRNESS_RERANK_ENABLED \
           FEATURE_WEEKLY_TOP_ENABLED FEATURE_WHY_EXPLAINER_ENABLED \
           FEATURE_MOVE_V2_ENABLED FEATURE_FAMILY_BRIEF_ENABLED \
           FEATURE_DTM_MASK_ENABLED FEATURE_ANTI_GHOST_ENABLED \
           FEATURE_VOICE_FINGERPRINT_ENABLED INTENT_INFERENCE_ENABLED \
           EXPOSURE_SCHEDULER_ENABLED STABLE_MATCH_ENABLED FAIRNESS_AUDIT_ENABLED; do
    [[ "${!f:-0}" == "1" ]] && v8_on="$v8_on $f"
  done
  [[ -n "$v8_on" ]] && note "v8 flags ON:$v8_on" || note "v8 flags: all OFF"
}

# Parse a simple top-level scalar OR a nested 1-level scalar from values.yaml.
# Usage: yaml_get <file> <dotted.key>            e.g. database.password
# This is intentionally tiny — we don't pull in yq just for ~10 scalars.
yaml_get() {
  local file="$1" key="$2"
  local parent="${key%%.*}"
  local child=""
  if [[ "$key" == *.* ]]; then child="${key#*.}"; fi

  if [[ -z "$child" ]]; then
    # top-level scalar: `key: value`
    awk -v k="$parent" '
      $0 ~ "^"k":" { sub("^"k": *", ""); gsub(/^"|"$/, ""); print; exit }
    ' "$file" 2>/dev/null
  else
    # nested 1-deep: `parent:\n  child: value`
    awk -v p="$parent" -v c="$child" '
      $0 ~ "^"p":" { in_block=1; next }
      in_block && $0 ~ "^[^ ]" { in_block=0 }
      in_block && $0 ~ "^ +"c":" { sub("^ +"c": *", ""); gsub(/^"|"$/, ""); print; exit }
    ' "$file" 2>/dev/null
  fi
}

load_env_config() {
  local env="$1" f="$CONFIG_DIR/$env/values.yaml"
  [[ -f "$f" ]] || die "load_env_config" "no $f — valid envs: dev | staging | prod"
  note "Loading env config: configuration/$env/values.yaml"
  # Exported so child processes (docker compose, tsx) see them.
  export MIAMO_ENV="$env"
  export MIAMO_NS="$(yaml_get "$f" namespace || echo "miamo-$env")"
  export MIAMO_CLUSTER_HOST="$(yaml_get "$f" cluster_host || echo localhost)"
  export MIAMO_NODE_ENV="$(yaml_get "$f" node_env || echo development)"
  export MIAMO_IMAGE_TAG="$(yaml_get "$f" images.tag || echo latest)"
  export MIAMO_PULL_POLICY="$(yaml_get "$f" images.pull_policy || echo IfNotPresent)"
  export MIAMO_REPLICAS="$(yaml_get "$f" replicas || echo 1)"
  ok "env=$env  ns=$MIAMO_NS  node_env=$MIAMO_NODE_ENV  tag=$MIAMO_IMAGE_TAG  replicas=$MIAMO_REPLICAS"
}

# ─── PREREQUISITES — per-mode lists + check + install ────────────────────────

required_for_mode() {
  case "$1" in
    local)  echo "node npm git docker python3" ;;
    docker) echo "docker git" ;;
    k8s)    echo "docker kubectl git" ;;
    *)      echo "" ;;
  esac
}
nice_to_have_for_mode() {
  case "$1" in local) echo psql ;; k8s) echo "minikube helm" ;; *) echo "" ;; esac
}

# Returns a space-separated list of missing required tools for a mode.
check_prereqs() {
  local mode="$1" missing=""
  for tool in $(required_for_mode "$mode"); do
    if ! has "$tool"; then missing="$missing $tool"; fi
  done
  echo "$missing" | xargs
}

# Install missing prereqs by delegating to scripts/setup.sh (which handles
# os-detection + per-distro logic).
install_prereqs() {
  echo ""; hdr "Installing prerequisites via scripts/setup.sh"; echo ""
  [[ -x "$SCRIPT_DIR/setup.sh" ]] || chmod +x "$SCRIPT_DIR/setup.sh" 2>/dev/null || true
  bash "$SCRIPT_DIR/setup.sh" "$1" || warn "setup.sh exited non-zero — best-effort, continuing"
  refresh_path
}

# Ensure required prereqs are present (auto-install missing). Die if still missing.
ensure_prereqs_for() {
  local mode="$1" missing
  missing=$(check_prereqs "$mode")
  if [[ -n "$missing" ]]; then
    warn "Missing required tools for '$mode' mode:$missing"
    install_prereqs "${OS_FAMILY:-unknown}"
    missing=$(check_prereqs "$mode")
    [[ -n "$missing" ]] && die "ensure_prereqs_for $mode" "still missing:$missing — install manually then re-run"
  fi
  local missing_opt=""
  for t in $(nice_to_have_for_mode "$mode"); do has "$t" || missing_opt="$missing_opt $t"; done
  [[ -n "$missing_opt" ]] && warn "Optional tools missing:$missing_opt (some scripts will skip)"
  echo -e "  ${C}Tool versions:${NC}"
  for t in $(required_for_mode "$mode"); do
    ok "$(printf '%-9s' "$t") $(tool_version "$t")"
  done
}

# `prereq <mode>` — diagnostic only, never installs. Used by users to check
# whether they can run a mode before committing to a full start.
report_prereqs() {
  local mode="$1"
  [[ "$mode" =~ ^(local|docker|k8s)$ ]] || { fail "Invalid mode: '$mode'. Valid: local | docker | k8s"; return 1; }
  echo ""; hdr "Prerequisite check — mode: $mode"; echo ""
  local all_ok=true
  echo -e "  ${C}Required:${NC}"
  for t in $(required_for_mode "$mode"); do
    if has "$t"; then ok "$(printf '%-9s' "$t") $(tool_version "$t")"
    else fail "$(printf '%-9s' "$t") NOT INSTALLED"; all_ok=false; fi
  done
  local opts; opts="$(nice_to_have_for_mode "$mode")"
  if [[ -n "$opts" ]]; then
    echo ""; echo -e "  ${C}Optional:${NC}"
    for t in $opts; do
      if has "$t"; then ok "$(printf '%-9s' "$t") $(tool_version "$t")"
      else warn "$(printf '%-9s' "$t") not installed (some QA scripts will skip)"; fi
    done
  fi
  echo ""
  if $all_ok; then ok "All required tools present — ready to start"; return 0
  else warn "Missing tools — run: bash scripts/start.sh setup"; return 1; fi
}

# ─── INFRASTRUCTURE — Docker daemon, Postgres readiness ─────────────────────

container_running() {
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$1"
}

wait_for_postgres() {
  local timeout="${1:-30}" elapsed=0
  while (( elapsed < timeout )); do
    if docker exec miamo-postgres pg_isready -U "${POSTGRES_USER:-miamo}" &>/dev/null \
        || docker exec miamo-postgres-local pg_isready -U "${POSTGRES_USER:-miamo}" &>/dev/null; then
      ok "Postgres is accepting connections"
      return 0
    fi
    sleep 1; (( elapsed += 1 ))
    [[ $((elapsed % 5)) -eq 0 ]] && step "still waiting for Postgres (${elapsed}s/${timeout}s)"
  done
  fail "Postgres did not become ready within ${timeout}s"
  return 1
}

# Boot Postgres + Redis (used by local-mode bootstrap).
# Local mode uses standalone containers (miamo-postgres-local / miamo-redis) with the legacy
# named volume miamo-pgdata-local, so the seeded data survives across start/stop cycles and
# stays separate from the compose-managed stack in docker mode.
ensure_infra() {
  has docker || die "docker" "Docker isn't installed. Run: bash scripts/start.sh setup"
  docker info &>/dev/null || die "docker info" "Docker daemon isn't running. mac: open Docker Desktop. linux: sudo systemctl start docker."

  local PG="miamo-postgres-local"
  local RD="miamo-redis"
  local PG_PW="${POSTGRES_PASSWORD:-miamo}"
  local PG_USER="${POSTGRES_USER:-miamo}"
  local PG_DB="${POSTGRES_DB:-miamo}"

  if container_running "$PG"; then
    note "Postgres already running ($PG)"
  elif docker ps -a --format '{{.Names}}' | grep -qx "$PG"; then
    step "Starting existing Postgres container ($PG)…"
    docker start "$PG" >/dev/null 2>&1 || die "docker start $PG" "check: docker logs $PG"
    ok "Postgres started"
  else
    step "Creating Postgres container ($PG)…"
    docker run -d --name "$PG" \
      -e "POSTGRES_USER=$PG_USER" \
      -e "POSTGRES_PASSWORD=$PG_PW" \
      -e "POSTGRES_DB=$PG_DB" \
      -p 5432:5432 \
      -v miamo-pgdata-local:/var/lib/postgresql/data \
      postgres:16-alpine >/dev/null 2>&1 \
      || die "docker run postgres" "port 5432 may be busy; check 'lsof -i :5432' and POSTGRES_PASSWORD in .env"
    ok "Postgres container created"
  fi

  if container_running "$RD"; then
    note "Redis already running ($RD)"
  elif docker ps -a --format '{{.Names}}' | grep -qx "$RD"; then
    step "Starting existing Redis container ($RD)…"
    docker start "$RD" >/dev/null 2>&1 || true
    ok "Redis started"
  else
    step "Creating Redis container ($RD)…"
    docker run -d --name "$RD" -p 6379:6379 redis:7-alpine \
      redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru \
      >/dev/null 2>&1 || warn "redis run failed (port 6379 busy?)"
    ok "Redis container created"
  fi

  wait_for_postgres 30 || die "wait_for_postgres" "docker logs $PG"
}

# Wait for gateway /healthz to return 200. Used by all 3 modes after start.
wait_for_gateway() {
  local timeout="${1:-30}" elapsed=0
  step "Polling http://localhost:3200/healthz (up to ${timeout}s)…"
  while (( elapsed < timeout )); do
    local code; code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "http://localhost:3200/healthz" 2>/dev/null || echo "000")
    if [[ "$code" == "200" ]]; then
      ok "Gateway healthy on :3200 (after ${elapsed}s)"
      return 0
    fi
    sleep 1; (( elapsed += 1 ))
  done
  warn "Gateway did not respond on :3200 within ${timeout}s"
  warn "  inspect: tail -50 $LOG_DIR/gateway.log"
  return 1
}

prisma_sync() {
  [[ -d "$ROOT/services/shared" ]] || { warn "services/shared not found — skipping Prisma sync"; return 0; }
  step "Prisma: generating client…"
  (cd "$ROOT/services/shared" && npx --yes prisma generate >/dev/null 2>&1) \
    && ok "Prisma client generated" \
    || warn "prisma generate had warnings"
  step "Prisma: applying pending migrations (deploy)…"
  if (cd "$ROOT/services/shared" && npx --yes prisma migrate deploy >/dev/null 2>&1); then
    ok "Prisma migrations applied"
  else
    warn "prisma migrate deploy failed — DB may be up-to-date OR there's an error"
    warn "  inspect: cd services/shared && npx prisma migrate deploy"
  fi
}

seed_if_empty() {
  local count container=""
  if container_running miamo-postgres;       then container=miamo-postgres
  elif container_running miamo-postgres-local; then container=miamo-postgres-local
  else
    warn "No Postgres container — skipping seed check"
    return 0
  fi
  count=$(docker exec "$container" psql -U "${POSTGRES_USER:-miamo}" -d "${POSTGRES_DB:-miamo}" \
            -tA -c 'SELECT count(*) FROM "User";' 2>/dev/null | tr -d '[:space:]' || echo "0")
  case "$count" in ''|*[!0-9]*) count=0 ;; esac
  if (( count >= 50 )); then
    note "Database already seeded (${count} users) — skipping"
    return 0
  fi
  step "DB has ${count} users (<50) — seeding…"
  if (cd "$ROOT" && npm run db:seed 2>&1 | tail -15); then
    ok "Database seeded"
  else
    warn "db:seed failed — try: cd services/shared && npx prisma db seed"
  fi
}

# ─── LOCAL MODE — bare-metal Node services via tsx watch ─────────────────────

# Local-dev defaults. Overridden by .env (sourced first via load_root_env).
local_export_defaults() {
  export DATABASE_URL="${DATABASE_URL:-postgresql://miamo:miamo@localhost:5432/miamo?schema=public}"
  export JWT_SECRET="${JWT_SECRET:-miamo-dev-jwt-secret-change-in-production-2026}"
  export INTERNAL_SERVICE_KEY="${INTERNAL_SERVICE_KEY:-miamo-internal-dev-key}"
  export ENCRYPTION_KEY="${ENCRYPTION_KEY:-miamo-dev-encrypt-key-32-bytes!!}"
  export NODE_ENV="${NODE_ENV:-development}"
  export FRONTEND_URL="${FRONTEND_URL:-http://localhost:3100}"
  export GATEWAY_URL="${GATEWAY_URL:-http://localhost:3200}"
  export AUTH_SERVICE_URL="${AUTH_SERVICE_URL:-http://localhost:3201}"
  export USER_SERVICE_URL="${USER_SERVICE_URL:-http://localhost:3202}"
  export SOCIAL_SERVICE_URL="${SOCIAL_SERVICE_URL:-http://localhost:3203}"
  export MESSAGING_SERVICE_URL="${MESSAGING_SERVICE_URL:-http://localhost:3204}"
  export CONTENT_SERVICE_URL="${CONTENT_SERVICE_URL:-http://localhost:3205}"
  export NOTIFICATION_SERVICE_URL="${NOTIFICATION_SERVICE_URL:-http://localhost:3206}"
}

local_start() {
  local env="${1:-dev}"
  echo ""
  echo -e "${P}╔════════════════════════════════════════════╗${NC}"
  echo -e "${P}║   Miamo — Local Dev (env=${env})              ${NC}"
  echo -e "${P}╚════════════════════════════════════════════╝${NC}"
  echo ""
  ensure_prereqs_for local
  load_root_env
  load_env_config "$env"
  local_export_defaults
  ensure_infra
  prisma_sync
  seed_if_empty
  mkdir -p "$LOG_DIR" "$PID_DIR"

  hdr "Clearing service ports"
  for entry in $SERVICES; do clear_port "${entry##*:}"; done
  clear_port 3100   # web (Next.js)
  sleep 1

  # because: on Windows Git Bash, `npx` becomes `npx.cmd` and `$!` returns the bash
  # wrapper PID, not the Node process. Calling node_modules/.bin/tsx directly gives a
  # real PID we can later kill. Drop `watch` here — restart via `local restart` instead.
  local tsx_bin="$ROOT/node_modules/.bin/tsx"
  if [[ ! -x "$tsx_bin" ]]; then
    # Belt + suspenders — devDeps should have it, but verify before launch.
    step "tsx not found at $tsx_bin — installing…"
    (cd "$ROOT" && npm install --no-audit --no-fund tsx) >"$LOG_DIR/tsx-install.log" 2>&1 \
      || warn "tsx install had warnings (see $LOG_DIR/tsx-install.log)"
  fi

  hdr "Starting application services"
  for entry in $SERVICES; do
    local svc="${entry%%:*}" port="${entry##*:}"
    if [[ -x "$tsx_bin" ]]; then
      PORT="$port" "$tsx_bin" "services/$svc/src/server.ts" > "$LOG_DIR/$svc.log" 2>&1 &
    else
      PORT="$port" npx --yes tsx "services/$svc/src/server.ts" > "$LOG_DIR/$svc.log" 2>&1 &
    fi
    echo $! > "$PID_DIR/$svc.pid"
    ok "Started $(printf '%-15s' "$svc") :$port  (PID $!)"
  done

  hdr "Starting web (Next.js)"
  if [[ -d "$ROOT/services/web" ]]; then
    if [[ ! -d "$ROOT/services/web/node_modules" ]]; then
      step "First run — installing web deps (npm install in services/web)…"
      (cd "$ROOT/services/web" && npm install --no-audit --no-fund) >"$LOG_DIR/web-install.log" 2>&1 \
        || warn "web npm install had warnings (see $LOG_DIR/web-install.log)"
    fi
    (cd "$ROOT/services/web" && npm run dev >"$LOG_DIR/web.log" 2>&1) &
    echo $! > "$PID_DIR/web.pid"
    ok "Started $(printf '%-15s' "web") :3100  (PID $!)"
  else
    warn "services/web not found — skipping frontend"
  fi

  echo ""; step "Waiting 10s for backend bootup…"; sleep 10
  wait_for_gateway 30 || true
  step "Waiting for web on :3100 (Next.js needs ~15s to compile first time)…"
  local elapsed=0
  while (( elapsed < 60 )); do
    if curl -sS -o /dev/null --max-time 2 "http://localhost:3100" 2>/dev/null; then
      ok "Web ready on :3100 (after ${elapsed}s)"
      break
    fi
    sleep 2; (( elapsed += 2 ))
  done
  (( elapsed >= 60 )) && warn "Web didn't respond on :3100 in 60s — check $LOG_DIR/web.log"
  echo ""
  local_status_all

  # Real readiness gate — only banner SUCCESS if gateway + most backends are 200.
  local healthy=0 total=8
  for entry in $SERVICES; do
    local _port="${entry##*:}" _code
    _code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:$_port/health" 2>/dev/null || echo "000")
    [[ "$_code" == "200" ]] && healthy=$((healthy + 1))
  done
  local _wcode
  _wcode=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:3100" 2>/dev/null || echo "000")
  [[ "$_wcode" =~ ^(200|302|307|404)$ ]] && healthy=$((healthy + 1))

  if (( healthy >= 7 )); then
    print_success_banner "local/$env"
  else
    print_failure_banner "local/$env" "$healthy" "$total"
    return 1
  fi
}

local_stop() {
  hdr "Stopping local services"
  for entry in $SERVICES; do
    local svc="${entry%%:*}" port="${entry##*:}"
    if [[ -f "$PID_DIR/$svc.pid" ]]; then
      local pid; pid=$(cat "$PID_DIR/$svc.pid")
      kill "$pid" 2>/dev/null && echo -e "  ${R}✗${NC} $svc stopped (PID $pid)" || true
      rm -f "$PID_DIR/$svc.pid"
    fi
    clear_port "$port"
  done
  # Stop web (Next.js)
  if [[ -f "$PID_DIR/web.pid" ]]; then
    local wpid; wpid=$(cat "$PID_DIR/web.pid")
    kill "$wpid" 2>/dev/null && echo -e "  ${R}✗${NC} web stopped (PID $wpid)" || true
    rm -f "$PID_DIR/web.pid"
  fi
  clear_port 3100
  # Belt-and-suspenders: tsx watch / npm exec / Next.js spawn child processes that
  # outlive the wrapper PID we tracked. Sweep them by pattern. Mac/Linux only;
  # Windows already gets this via clear_port → taskkill on the bound port.
  # Also handles "watch" mode zombies left over from older script versions.
  if ! is_windows; then
    pkill -f "tsx.*services/.*server\.ts" 2>/dev/null || true
    pkill -f "npm exec tsx" 2>/dev/null || true
    pkill -f "next dev -p 3100" 2>/dev/null || true
    sleep 1
    # If anything survived (rare — stuck watchers from prior runs), -9 them
    pkill -9 -f "tsx watch.*services/" 2>/dev/null || true
    pkill -9 -f "node.*tsx.*services/.*server\.ts" 2>/dev/null || true
  fi
  ok "All local services stopped"
}

local_restart() { local_stop; sleep 2; local_start "${1:-dev}"; }

# Status — table of all 7 services. One row per service, coloured ✓/✗.
local_status_all() {
  echo -e "${B}══ Miamo Service Status (local) ══════════════════${NC}"
  printf "  %-15s %-7s %-9s %s\n" "SERVICE" "PORT" "HEALTH" "PID"
  printf "  %-15s %-7s %-9s %s\n" "───────" "────" "──────" "───"
  for entry in $SERVICES; do
    local svc="${entry%%:*}" port="${entry##*:}" code pid="-"
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:$port/health" 2>/dev/null || echo "000")
    [[ -f "$PID_DIR/$svc.pid" ]] && pid=$(cat "$PID_DIR/$svc.pid")
    if [[ "$code" == "200" ]]
    then printf "  %-15s :%-6s ${G}%-9s${NC} %s\n" "$svc" "$port" "OK" "$pid"
    else printf "  %-15s :%-6s ${R}%-9s${NC} %s\n" "$svc" "$port" "DOWN($code)" "$pid"; fi
  done
  # Web (Next.js) row
  local wpid="-" wcode
  [[ -f "$PID_DIR/web.pid" ]] && wpid=$(cat "$PID_DIR/web.pid")
  wcode=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:3100" 2>/dev/null || echo "000")
  if [[ "$wcode" =~ ^(200|302|307|404)$ ]]
  then printf "  %-15s :%-6s ${G}%-9s${NC} %s\n" "web" "3100" "OK" "$wpid"
  else printf "  %-15s :%-6s ${R}%-9s${NC} %s\n" "web" "3100" "DOWN($wcode)" "$wpid"; fi
  echo ""
}

# Drill-down: state, PID, uptime, listener, log tail.
local_status_one() {
  local svc="$1" port=""
  for entry in $SERVICES; do [[ "${entry%%:*}" == "$svc" ]] && port="${entry##*:}"; done
  if [[ -z "$port" ]]; then
    fail "Unknown service: $svc. Known: $(echo "$SERVICES" | sed 's/:[0-9]*//g')"
    return 1
  fi
  echo ""
  echo -e "${B}══ Service detail: $svc ══════════════════${NC}"
  echo ""
  local code; code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:$port/health" 2>/dev/null || echo "000")
  [[ "$code" == "200" ]] && ok "Status:     OK (HTTP 200)" || fail "Status:     DOWN (HTTP $code)"
  echo -e "  ${C}Port:${NC}       $port"
  if [[ -f "$PID_DIR/$svc.pid" ]]; then
    local pid; pid=$(cat "$PID_DIR/$svc.pid")
    local etime; etime=$(ps -o etime= -p "$pid" 2>/dev/null | tr -d ' ' || echo "?")
    echo -e "  ${C}PID:${NC}        $pid"
    echo -e "  ${C}Uptime:${NC}     ${etime:-?}"
  else
    echo -e "  ${C}PID:${NC}        ${Y}(no pid file)${NC}"
  fi
  local listener; listener=$(lsof -i:"$port" -sTCP:LISTEN -P 2>/dev/null | awk 'NR==2 {print $1" PID="$2}' || echo "")
  echo -e "  ${C}Listener:${NC}   ${listener:-${Y}(nothing bound to :$port)${NC}}"
  if [[ -f "$LOG_DIR/$svc.log" ]]; then
    echo ""
    echo -e "  ${C}Last 5 log lines${NC} ($LOG_DIR/$svc.log):"
    tail -5 "$LOG_DIR/$svc.log" 2>/dev/null | sed 's/^/    /'
  else
    echo ""; warn "No log file at $LOG_DIR/$svc.log"
  fi
  echo ""
}

local_logs() {
  local svc="${1:-gateway}"
  [[ -f "$LOG_DIR/$svc.log" ]] || die "local logs $svc" "no log file at $LOG_DIR/$svc.log — is the service running?"
  echo -e "${C}Tailing $LOG_DIR/$svc.log (Ctrl-C to exit)…${NC}"
  tail -f "$LOG_DIR/$svc.log"
}

local_test() { run_test_suite local; }

# Dispatch verbs for `local`.
local_cmd() {
  local action="${1:-start}"; shift || true
  case "$action" in
    start)      local_start    "${1:-dev}" ;;
    stop|down)  local_stop ;;
    restart)    local_restart  "${1:-dev}" ;;
    status)     [[ -n "${1:-}" ]] && local_status_one "$1" || local_status_all ;;
    logs)       local_logs     "${1:-gateway}" ;;
    test)       local_test ;;
    *)          fail "Unknown local command: $action"; echo "  Try: bash scripts/start.sh help local"; return 1 ;;
  esac
}

# ─── DOCKER MODE — full stack via docker compose ─────────────────────────────

docker_start() {
  local env="${1:-dev}"
  echo ""
  echo -e "${P}╔════════════════════════════════════════════╗${NC}"
  echo -e "${P}║   Miamo — Docker Compose (env=${env})         ${NC}"
  echo -e "${P}╚════════════════════════════════════════════╝${NC}"
  echo ""

  ensure_prereqs_for "docker"
  load_root_env
  load_env_config "$env"

  if container_running miamo-gateway; then
    note "miamo-gateway already up — restarting in place"
    docker compose restart 2>&1 | tail -10 || true
  else
    step "docker compose up -d --build…"
    if ! docker compose up -d --build 2>&1 | tail -40; then
      die "docker compose up -d --build" "check docker-compose.yml and .env"
    fi
  fi
  wait_for_gateway 60 || true
  echo ""
  docker compose ps 2>/dev/null || true

  # Gate banner: gateway /healthz must be 200 before we declare success.
  local _gw_code
  _gw_code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:3200/healthz" 2>/dev/null || echo "000")
  if [[ "$_gw_code" == "200" ]]; then
    print_success_banner "docker/$env"
  else
    print_failure_banner "docker/$env" "0" "1"
    return 1
  fi
}

docker_stop() {
  hdr "Stopping docker stack"
  docker compose down 2>&1 | tail -10 || true
  ok "All docker containers stopped"
}
docker_restart() { docker_stop; sleep 2; docker_start "${1:-dev}"; }

# Status — table of miamo-* containers (filtered docker ps).
docker_status_all() {
  echo ""
  echo -e "${B}══ Miamo Docker Status ═══════════════════════════${NC}"
  echo ""
  if ! has docker || ! docker info &>/dev/null; then
    fail "Docker not running"
    return 1
  fi
  printf "  %-25s %-15s %s\n" "CONTAINER" "STATE" "STATUS"
  printf "  %-25s %-15s %s\n" "─────────" "─────" "──────"
  for c in $DOCKER_CONTAINERS; do
    local state status
    if docker inspect "$c" &>/dev/null; then
      state=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null)
      status=$(docker inspect -f '{{.State.Status}}{{if .State.Health}} ({{.State.Health.Status}}){{end}}' "$c" 2>/dev/null)
    else
      state=absent; status=-
    fi
    case "$state" in
      running) printf "  %-25s ${G}%-15s${NC} %s\n" "$c" "running" "$status" ;;
      exited)  printf "  %-25s ${R}%-15s${NC} %s\n" "$c" "exited" "$status" ;;
      absent)  printf "  %-25s ${Y}%-15s${NC} %s\n" "$c" "(none)"  "-" ;;
      *)       printf "  %-25s ${Y}%-15s${NC} %s\n" "$c" "$state" "$status" ;;
    esac
  done
  echo ""
}

docker_status_one() {
  local svc="$1"; local cname="miamo-$svc"
  echo ""
  echo -e "${B}══ Container detail: $cname ══════════════════════${NC}"
  echo ""
  if ! docker inspect "$cname" &>/dev/null; then
    fail "Container '$cname' does not exist"
    echo "  Known miamo-* containers:"
    for c in $DOCKER_CONTAINERS; do echo "    • $c"; done
    return 1
  fi
  echo -e "  ${C}State:${NC}    $(docker inspect -f '{{.State.Status}}' "$cname")"
  echo -e "  ${C}Health:${NC}   $(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}(no healthcheck){{end}}' "$cname")"
  echo -e "  ${C}Image:${NC}    $(docker inspect -f '{{.Config.Image}}' "$cname")"
  echo -e "  ${C}Started:${NC}  $(docker inspect -f '{{.State.StartedAt}}' "$cname")"
  echo -e "  ${C}Restarts:${NC} $(docker inspect -f '{{.RestartCount}}' "$cname")"
  echo ""
  echo -e "  ${C}Last 10 log lines:${NC}"
  docker logs --tail 10 "$cname" 2>&1 | sed 's/^/    /'
  echo ""
}

docker_logs() {
  local svc="${1:-gateway}"
  local cname="miamo-$svc"
  if ! docker inspect "$cname" &>/dev/null; then
    fail "Container '$cname' does not exist"
    return 1
  fi
  echo -e "${C}Tailing docker logs $cname (Ctrl-C to exit)…${NC}"
  docker compose logs -f --tail=100 "$svc"
}

docker_test() { run_test_suite docker; }

docker_cmd() {
  local action="${1:-start}"; shift || true
  case "$action" in
    start|up)   docker_start   "${1:-dev}" ;;
    stop|down)  docker_stop ;;
    restart)    docker_restart "${1:-dev}" ;;
    status)     [[ -n "${1:-}" ]] && docker_status_one "$1" || docker_status_all ;;
    logs)       docker_logs    "${1:-gateway}" ;;
    test)       docker_test ;;
    build)      docker compose build --parallel ;;
    clean)      docker compose down -v --rmi local ;;
    *)          fail "Unknown docker command: $action"; echo "  Try: bash scripts/start.sh help docker"; return 1 ;;
  esac
}

# ─── K8S MODE — render templates + kubectl apply ─────────────────────────────
# Manifests from k8s/templates/*.yaml + configuration/<env>/values.yaml.

# Populate K8S_* shell variables for the given env, sourced from values.yaml.
k8s_load_config() {
  local env="$1" f="$CONFIG_DIR/$env/values.yaml"
  [[ -f "$f" ]] || die "k8s_load_config" "missing $f"
  # Helper for "$(yaml_get) || default" semantics.
  _g() { local v; v="$(yaml_get "$f" "$1")"; echo "${v:-$2}"; }

  K8S_NS=$(_g namespace "miamo-$env")
  K8S_ENV_LABEL=$(_g env "$env")
  K8S_NODE_ENV=$(_g node_env development)
  K8S_CLUSTER_HOST=$(_g cluster_host localhost)
  K8S_REPLICAS=$(_g replicas 1)
  K8S_IMG_REG=$(_g images.registry "")
  K8S_IMG_TAG=$(_g images.tag latest)
  K8S_PULL_POLICY=$(_g images.pull_policy IfNotPresent)
  K8S_DB_USER=$(_g database.user miamo)
  K8S_DB_PASS=$(_g database.password miamo)
  K8S_DB_NAME=$(_g database.name miamo)
  K8S_DB_PORT=$(_g database.port 5432)
  K8S_REDIS_PORT=$(_g redis.port 6379)
  K8S_JWT_SECRET=$(_g secrets.jwt_secret dev-secret)
  K8S_INTERNAL_KEY=$(_g secrets.internal_service_key dev-key)
  K8S_REQ_MEM=$(_g resources.requests_memory 64Mi)
  K8S_REQ_CPU=$(_g resources.requests_cpu 50m)
  K8S_LIM_MEM=$(_g resources.limits_memory 256Mi)
  K8S_LIM_CPU=$(_g resources.limits_cpu 500m)
  K8S_GATEWAY_NODEPORT=$(_g node_ports.gateway 30080)
  K8S_WEB_NODEPORT=$(_g node_ports.web 30443)
  K8S_SVC_PORT=$(_g service_port 443)
  K8S_GATEWAY_PORT=3200; K8S_WEB_PORT=3100

  K8S_MIN_REPLICAS="$K8S_REPLICAS"
  K8S_MAX_REPLICAS=$(( K8S_REPLICAS * 3 ))
  [[ "$env" == prod ]] && K8S_MAX_REPLICAS=10

  K8S_DB_URL="postgresql://${K8S_DB_USER}:${K8S_DB_PASS}@postgres.${K8S_NS}.svc.cluster.local:${K8S_DB_PORT}/${K8S_DB_NAME}?schema=public"
  K8S_REDIS_URL="redis://redis.${K8S_NS}.svc.cluster.local:${K8S_REDIS_PORT}"
}

# Apply __PLACEHOLDER__ substitutions to a single template file ($1 → stdout).
# Per-svc fields (__SVC_NAME__, __CONTAINER_PORT__) come from SVC_NAME/CPORT
# env vars set by the caller (only used for service/hpa/pdb/network-policy).
k8s_sub() {
  sed \
    -e "s|__SVC_NAME__|${SVC_NAME:-}|g"            -e "s|__CONTAINER_PORT__|${CPORT:-3000}|g" \
    -e "s|__NAMESPACE__|$K8S_NS|g"                  -e "s|__ENV__|$K8S_ENV_LABEL|g" \
    -e "s|__NODE_ENV__|$K8S_NODE_ENV|g"             -e "s|__DATABASE_URL__|$K8S_DB_URL|g" \
    -e "s|__REDIS_URL__|$K8S_REDIS_URL|g"           -e "s|__JWT_SECRET__|$K8S_JWT_SECRET|g" \
    -e "s|__INTERNAL_KEY__|$K8S_INTERNAL_KEY|g"     -e "s|__CLUSTER_HOST__|$K8S_CLUSTER_HOST|g" \
    -e "s|__DB_USER__|$K8S_DB_USER|g"               -e "s|__DB_PASS__|$K8S_DB_PASS|g" \
    -e "s|__DB_NAME__|$K8S_DB_NAME|g"               -e "s|__POSTGRES_PORT__|$K8S_DB_PORT|g" \
    -e "s|__REDIS_PORT__|$K8S_REDIS_PORT|g"         -e "s|__IMAGE_PREFIX__|$K8S_IMG_REG|g" \
    -e "s|__IMAGE_TAG__|$K8S_IMG_TAG|g"             -e "s|__PULL_POLICY__|$K8S_PULL_POLICY|g" \
    -e "s|__REPLICAS__|$K8S_REPLICAS|g"             -e "s|__REQ_MEM__|$K8S_REQ_MEM|g" \
    -e "s|__REQ_CPU__|$K8S_REQ_CPU|g"               -e "s|__LIM_MEM__|$K8S_LIM_MEM|g" \
    -e "s|__LIM_CPU__|$K8S_LIM_CPU|g"               -e "s|__SERVICE_PORT__|$K8S_SVC_PORT|g" \
    -e "s|__GATEWAY_PORT__|$K8S_GATEWAY_PORT|g"     -e "s|__WEB_PORT__|$K8S_WEB_PORT|g" \
    -e "s|__GATEWAY_NODEPORT__|$K8S_GATEWAY_NODEPORT|g" \
    -e "s|__WEB_NODEPORT__|$K8S_WEB_NODEPORT|g"     -e "s|__LOCAL_WEB_PORT__|$K8S_WEB_NODEPORT|g" \
    -e "s|__AUTH_PORT__|3201|g" -e "s|__USERS_PORT__|3202|g" -e "s|__SOCIAL_PORT__|3203|g" \
    -e "s|__MESSAGING_PORT__|3204|g" -e "s|__CONTENT_PORT__|3205|g" -e "s|__NOTIFICATIONS_PORT__|3206|g" \
    -e "s|__MIN_REPLICAS__|$K8S_MIN_REPLICAS|g"     -e "s|__MAX_REPLICAS__|$K8S_MAX_REPLICAS|g" \
    "$1"
}

k8s_render() {
  local env="$1"
  k8s_load_config "$env"
  mkdir -p "$K8S_OUTPUT/$env"
  hdr "Rendering K8s manifests for env=$env"

  local SVC_LIST="auth users social messaging content notifications"
  local PORT_MAP="auth:3201 users:3202 social:3203 messaging:3204 content:3205 notifications:3206"

  for template in "$K8S_TEMPLATES"/*.yaml; do
    local fname; fname=$(basename "$template")
    local out="$K8S_OUTPUT/$env/$fname"

    case "$fname" in
      service.yaml)
        # Render once per microservice (per-svc port + name).
        > "$out"
        for svc in $SVC_LIST; do
          SVC_NAME="$svc"; CPORT=""
          for pm in $PORT_MAP; do [[ "${pm%%:*}" == "$svc" ]] && CPORT="${pm##*:}"; done
          k8s_sub "$template" >> "$out"
          echo "---" >> "$out"
        done
        unset SVC_NAME CPORT
        ;;
      hpa.yaml|pdb.yaml|network-policy.yaml)
        # Render once per service (incl. gateway + web).
        > "$out"
        for svc in $SVC_LIST gateway web; do
          SVC_NAME="$svc" k8s_sub "$template" >> "$out"
          echo "---" >> "$out"
        done
        unset SVC_NAME
        ;;
      *)
        # One-shot render with no per-svc fields.
        k8s_sub "$template" > "$out"
        ;;
    esac
    ok "rendered $fname"
  done
  echo -e "${C}→ output: $K8S_OUTPUT/$env/${NC}"
}

# Bring up minikube if it's installed and not running (best-effort).
k8s_ensure_cluster() {
  if has minikube; then
    if minikube status 2>/dev/null | grep -q "Running"; then
      note "minikube cluster already running"
    else
      step "Starting minikube…"
      minikube start 2>&1 | tail -10 || warn "minikube start failed — proceeding anyway"
    fi
  else
    note "minikube not installed — assuming external cluster (kubectl context: $(kubectl config current-context 2>/dev/null || echo none))"
  fi
}

k8s_start() {
  local env="${1:-dev}"
  echo ""
  echo -e "${P}╔════════════════════════════════════════════╗${NC}"
  echo -e "${P}║   Miamo — Kubernetes (env=${env})             ${NC}"
  echo -e "${P}╚════════════════════════════════════════════╝${NC}"
  echo ""

  ensure_prereqs_for "k8s"
  load_root_env
  load_env_config "$env"
  k8s_ensure_cluster
  k8s_render "$env"
  k8s_load_config "$env"

  hdr "Applying manifests to namespace $K8S_NS"

  # Phase 1: namespace + infra + config (must apply before migrate job).
  for f in namespace postgres redis configmap network-policy; do
    kubectl apply -f "$K8S_OUTPUT/$env/$f.yaml" 2>&1 | sed 's/^/  /' || true
  done

  step "Waiting for postgres…"
  kubectl -n "$K8S_NS" wait --for=condition=ready pod -l service=postgres --timeout=120s 2>/dev/null || true

  step "Running migration job…"
  kubectl delete job miamo-migrate -n "$K8S_NS" 2>/dev/null || true
  kubectl apply -f "$K8S_OUTPUT/$env/migrate-job.yaml" 2>&1 | sed 's/^/  /' || true
  kubectl -n "$K8S_NS" wait --for=condition=complete job/miamo-migrate --timeout=120s 2>/dev/null || true

  # Phase 2: services, gateway, web, autoscaling.
  for f in service gateway web hpa pdb; do
    kubectl apply -f "$K8S_OUTPUT/$env/$f.yaml" 2>&1 | sed 's/^/  /' || true
  done

  echo ""
  hdr "Checking rollout"
  local _rollout_ok=0 _rollout_total=8
  for svc in auth users social messaging content notifications gateway web; do
    if kubectl -n "$K8S_NS" rollout status deployment/"$svc" --timeout=120s 2>/dev/null; then
      ok "$svc"
      _rollout_ok=$((_rollout_ok + 1))
    else
      fail "$svc (still rolling)"
    fi
  done
  if (( _rollout_ok >= 7 )); then
    print_success_banner "k8s/$env"
  else
    print_failure_banner "k8s/$env" "$_rollout_ok" "$_rollout_total"
    return 1
  fi
}

k8s_stop() {
  local env="${1:-dev}"
  k8s_load_config "$env"
  warn "Deleting namespace $K8S_NS (this removes ALL k8s resources for env=$env)"
  kubectl delete namespace "$K8S_NS" --ignore-not-found 2>&1 | sed 's/^/  /'
  ok "Namespace $K8S_NS deleted"
}

k8s_restart() {
  local env="${1:-dev}"
  k8s_load_config "$env"
  step "Rolling restart of all deployments in $K8S_NS"
  for svc in auth users social messaging content notifications gateway web; do
    kubectl -n "$K8S_NS" rollout restart deployment/"$svc" 2>/dev/null && ok "$svc restarted" || warn "$svc not found"
  done
}

k8s_status_all() {
  local env="${1:-dev}"
  k8s_load_config "$env"
  echo ""; echo -e "${B}══ K8s Status — namespace $K8S_NS ════════════════${NC}"; echo ""
  has kubectl || { fail "kubectl not installed"; return 1; }
  if ! kubectl get ns "$K8S_NS" &>/dev/null; then
    warn "Namespace $K8S_NS does not exist — nothing deployed"; return 0
  fi
  for resource in pods svc hpa; do
    echo -e "  ${C}${resource}:${NC}"
    kubectl -n "$K8S_NS" get "$resource" 2>/dev/null | sed 's/^/    /' || echo "    (none)"
    echo ""
  done
}

k8s_status_one() {
  local env="$1" svc="$2"
  k8s_load_config "$env"
  echo ""; echo -e "${B}══ K8s pod detail: $svc (ns=$K8S_NS) ══════════════${NC}"; echo ""
  kubectl -n "$K8S_NS" describe pod -l service="$svc" 2>/dev/null | head -80 || warn "no pods for service=$svc"
  echo ""
}

k8s_logs() {
  k8s_load_config "$1"
  echo -e "${C}Tailing kubectl logs deployment/${2:-gateway} (Ctrl-C to exit)…${NC}"
  kubectl logs -f -n "$K8S_NS" "deployment/${2:-gateway}"
}

k8s_test() { run_test_suite k8s; }

k8s_cmd() {
  local action="${1:-start}"; shift || true
  case "$action" in
    start|deploy) k8s_start   "${1:-dev}" ;;
    stop|destroy) k8s_stop    "${1:-dev}" ;;
    restart)      k8s_restart "${1:-dev}" ;;
    status)       [[ -n "${2:-}" ]] && k8s_status_one "${1:-dev}" "$2" || k8s_status_all "${1:-dev}" ;;
    logs)         k8s_logs    "${1:-dev}" "${2:-gateway}" ;;
    test)         k8s_test ;;
    render)       k8s_render  "${1:-dev}" ;;
    *)            fail "Unknown k8s command: $action"; echo "  Try: bash scripts/start.sh help k8s"; return 1 ;;
  esac
}

# ─── HELP — top-level + per-mode ──────────────────────────────────────────────

help_top() {
  printf "\n${P}╔════════════════════════════════════════════════════════════╗${NC}\n"
  printf "${P}║   Miamo — start.sh ${VERSION}                                      ║${NC}\n"
  printf "${P}╚════════════════════════════════════════════════════════════╝${NC}\n"
  cat <<'HELP'

USAGE     bash scripts/start.sh <mode> <command> [env] [service]

MODES     local    bare-metal Node + Docker for Postgres/Redis (fast, hot-reload)
          docker   full stack via docker compose (13 containers)
          k8s      render templates + kubectl apply (minikube / Docker Desktop)

COMMANDS  start <env>          bring up    (env: dev | staging | prod, default dev)
          stop                 bring down
          restart <env>        stop + start
          status [service]     all-services table, OR drill into one
          logs <service>       tail -f
          test                 typecheck + vitest + QA phase scripts

SHORTHAND bash scripts/start.sh local dev      = local start dev
          bash scripts/start.sh docker dev     = docker start dev
          bash scripts/start.sh k8s dev        = k8s start dev
          bash scripts/start.sh                = local start dev (default)

GLOBAL    help [mode]   rich help; pass mode for deep dive
          setup         install ALL prereqs (auto-detects OS)
          prereq <mode> check prereqs (read-only)
          version       print version

EXAMPLES  bash scripts/start.sh local dev                  # start local
          bash scripts/start.sh local status               # table
          bash scripts/start.sh local status social        # drill in
          bash scripts/start.sh docker dev                 # docker compose
          bash scripts/start.sh k8s staging                # k8s, staging
          bash scripts/start.sh help local                 # deep help

URLS      Frontend  http://localhost:3100
          Gateway   http://localhost:3200       (health: /healthz)
          Demo      miamo10@miamo.test / miamo10

BOOTSTRAP-TRAP (see docs/RUNBOOK.md Incident 2):
  Changing .env flags requires a restart to propagate:
    bash scripts/start.sh local restart dev

HELP
}

help_local() {
  cat <<'HELP'

══ Mode: local — bare-metal dev ═══════════════════════════════

WHAT     7 Node services (gateway/auth/users/social/messaging/content/
         notifications) via `npx tsx watch`. Postgres + Redis in Docker.

PREREQS  Required: node v20 (.nvmrc) · npm · git · docker · python3
         Optional: psql
         Check:    bash scripts/start.sh prereq local
         Install:  bash scripts/start.sh setup

COMMANDS local start <env>     full bootstrap → all services up
         local stop            kill tsx-watch + free ports
         local restart <env>   stop + start
         local status          7-row table (OK/DOWN per service)
         local status <svc>    drill: PID, uptime, listener, log tail
         local logs <svc>      tail -f /tmp/miamo-logs/<svc>.log
         local test            typecheck + vitest + QA scripts

'start'  1. Check prereqs (node 20, npm, docker, python3)
         2. Source .env via `set -a; source .env; set +a` (v8 flags!)
         3. Load configuration/<env>/values.yaml
         4. Export local-dev defaults (DATABASE_URL, JWT_SECRET, URLs)
         5. docker compose up -d postgres redis
         6. Wait for Postgres (pg_isready, up to 30s)
         7. prisma generate && prisma migrate deploy
         8. Seed if <50 users
         9. Kill anything on ports 3200-3206
        10. tsx watch each service → /tmp/miamo-logs/<svc>.log
        Finally: poll /healthz until 200.

GOTCHA   The bootstrap trap. Flags in .env reach services ONLY because step
         2 sources .env. Change a flag → restart so new value propagates.
            bash scripts/start.sh local restart

RECOVERY Postgres won't start  → docker logs miamo-postgres; check .env password
         Gateway never healthy → tail -50 /tmp/miamo-logs/gateway.log
         Port already in use   → bash scripts/start.sh local stop
         Migrations fail       → cd services/shared && npx prisma migrate deploy

WINDOWS  Use Git Bash (not PowerShell/CMD) — bash scripts/start.sh local dev
         Required: Docker Desktop running before launch
         If 'lsof' missing: script falls back to netstat + taskkill
         tsx loader: bundled in node_modules (no global install needed)
         If services don't start: tail -50 /tmp/miamo-logs/<svc>.log

HELP
}

help_docker() {
  cat <<'HELP'

══ Mode: docker — full stack via docker compose ═══════════════

WHAT     13 containers (gateway + 6 services + web + ingest +
         tracking-worker + Postgres + Redis + migrate). Production-shaped:
         real built images, not tsx-watched source.

PREREQS  Required: docker · git
         Check:    bash scripts/start.sh prereq docker

COMMANDS docker start <env>    docker compose up -d --build
         docker stop           docker compose down
         docker restart <env>  stop + start
         docker status         table of miamo-* containers + health
         docker status <svc>   drill: state, image, restarts, last 10 logs
         docker logs <svc>     docker compose logs -f miamo-<svc>
         docker test           typecheck + vitest + QA scripts
         docker build          docker compose build --parallel
         docker clean          down -v --rmi local  (DROPS VOLUMES!)

'start'  1. Check Docker prereqs
         2. Source .env (POSTGRES_PASSWORD, JWT_SECRET, INTERNAL_SERVICE_KEY)
         3. Load configuration/<env>/values.yaml
         4. docker compose up -d --build
         5. Wait for gateway /healthz (up to 60s)
         6. docker compose ps summary

GOTCHA   `docker clean` deletes the postgres volume → ALL DATA LOST.
         Container names fixed → can't run two parallel envs on one host.

RECOVERY Build fails      → docker compose build --no-cache <svc>
         Gateway never up → docker compose logs miamo-gateway | tail -100
         Out of disk      → docker system prune -a

HELP
}

help_k8s() {
  cat <<'HELP'

══ Mode: k8s — Kubernetes deploy ══════════════════════════════

WHAT     Render manifests from k8s/templates/*.yaml using
         configuration/<env>/values.yaml, then `kubectl apply`.
         mac/linux: minikube. Windows: Docker Desktop Kubernetes.

PREREQS  Required: docker · kubectl · git
         Optional: minikube (mac/linux) · helm
         Check:    bash scripts/start.sh prereq k8s

COMMANDS k8s start <env>          render + kubectl apply
         k8s stop <env>           delete namespace (NUKES env!)
         k8s restart <env>        rollout restart on every deployment
         k8s status <env>         pods + services + HPAs table
         k8s status <env> <svc>   kubectl describe pod for that service
         k8s logs <env> <svc>     kubectl logs -f deployment/<svc>
         k8s test                 typecheck + vitest + QA scripts
         k8s render <env>         render only — no apply

'start'  1. Check k8s prereqs (kubectl, docker)
         2. If minikube installed and not running → minikube start
         3. Render manifests for env (10+ template files)
         4. kubectl apply in dep order (ns → infra → config → migrate → svc)
         5. Wait each deployment rollout (up to 120s each)

GOTCHAS  Needs a cluster up FIRST. "connection refused" → start minikube
         or fix kubectl context.
         `stop` deletes the namespace → ALL pods/PVCs/secrets vanish.
         dev: pull-policy IfNotPresent; staging/prod: Always.

RECOVERY CrashLoopBackOff → kubectl describe pod <pod> -n miamo-<env>
                            kubectl logs <pod> -n miamo-<env>
         Image pull error → docker build && minikube image load <image>
         Migration fails  → kubectl logs job/miamo-migrate -n miamo-<env>

HELP
}

# Shared test runner — used by local_test / docker_test / k8s_test.
# Runs typecheck + vitest + QA phase scripts. Does NOT tear down the stack.
run_test_suite() {
  hdr "Test suite (${1:-?}) — stack must already be up"
  step "npm run typecheck"
  (cd "$ROOT" && npm run typecheck 2>&1 | tail -30) || warn "typecheck failed"
  step "npm test (fast)"
  (cd "$ROOT" && npm test 2>&1 | tail -30) || warn "tests failed"
  if has python3; then
    hdr "QA phase scripts"
    for f in "$ROOT"/scripts/qa-runs/phase-*.py; do
      [[ -f "$f" ]] || continue
      step "$(basename "$f")"
      python3 "$f" 2>&1 | tail -10 || warn "$(basename "$f") failed (non-fatal)"
    done
  else
    warn "python3 not installed — skipping QA phase scripts"
  fi
}

# ─── Success banner — printed after every successful start.
print_success_banner() {
  local mode="$1"
  echo ""
  echo -e "${G}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${G}║   Miamo is up (${mode})${NC}"
  echo -e "${G}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${C}Frontend:${NC}   ${B}http://localhost:3100${NC}"
  echo -e "  ${C}Gateway:${NC}    ${B}http://localhost:3200${NC}"
  echo -e "  ${C}Health:${NC}     ${B}http://localhost:3200/healthz${NC}"
  echo -e "  ${C}Demo:${NC}       ${G}miamo10@miamo.test${NC} / ${G}miamo10${NC}"
  echo ""
}

# ─── Failure banner — printed when readiness gate fails.
# Always returns 1 so callers see a non-zero exit code.
print_failure_banner() {
  local mode="$1" healthy="$2" total="$3"
  echo ""
  echo -e "${R}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${R}║   Miamo failed to start cleanly (${healthy}/${total} services healthy) — mode=${mode}${NC}"
  echo -e "${R}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${Y}Next steps:${NC}"
  echo -e "    1. Check logs:    ls -lh $LOG_DIR/"
  echo -e "    2. Tail gateway:  tail -50 $LOG_DIR/gateway.log"
  echo -e "    3. Common fixes:"
  echo -e "       - Postgres not running:  docker start miamo-postgres-local"
  echo -e "       - Port in use:           bash scripts/start.sh local stop && bash scripts/start.sh local dev"
  echo -e "       - Missing deps:          npm install"
  if is_windows; then
    echo -e "       - Windows-specific:"
    echo -e "         * Use Git Bash (not PowerShell or CMD)"
    echo -e "         * Run Docker Desktop before scripts/start.sh"
    echo -e "         * Run as Administrator if 'taskkill' permission denied"
  fi
  echo -e "    4. Full diagnostic:  bash scripts/start.sh local status"
  echo ""
  return 1
}

# ─── GLOBAL DISPATCHER ────────────────────────────────────────────────────────
# Arg shape: <mode> <command> [env] [service]
# Shorthand: <mode> <env> → <mode> start <env>  (env ∈ dev|staging|prod)

OS="$(detect_os)"
OS_FAMILY="$(os_family "$OS")"

ARG1="${1:-}"; ARG2="${2:-}"; ARG3="${3:-}"; ARG4="${4:-}"
is_env() { case "${1:-}" in dev|staging|prod) return 0 ;; *) return 1 ;; esac; }

# Default-to-local-dev: completely empty invocation.
if [[ -z "$ARG1" ]]; then
  echo -e "${Y}● No args — defaulting to: local start dev${NC}"
  ARG1=local; ARG2=start; ARG3=dev
fi

# Global commands first (no mode needed).
case "$ARG1" in
  -h|--help|help)
    if [[ -n "$ARG2" ]]; then
      case "$ARG2" in
        local)  help_local ;;
        docker) help_docker ;;
        k8s)    help_k8s ;;
        *)      help_top; warn "Unknown mode for help: $ARG2" ;;
      esac
    else
      help_top
    fi
    exit 0
    ;;
  -v|--version|version)
    echo "$VERSION"
    exit 0
    ;;
  setup)
    install_prereqs "$OS_FAMILY"
    echo ""
    ok "Setup complete. Next: bash scripts/start.sh local dev"
    exit 0
    ;;
  prereq)
    if [[ -z "$ARG2" ]]; then
      fail "Usage: bash scripts/start.sh prereq <local|docker|k8s>"
      exit 1
    fi
    report_prereqs "$ARG2"
    exit $?
    ;;
esac

MODE="$ARG1"
case "$MODE" in
  local|docker|k8s)
    # 2-arg shorthand: `<mode> <env>` → `<mode> start <env>`.
    if is_env "$ARG2"; then
      CMD=start; ENV_ARG="$ARG2"; EXTRA="${ARG3:-}"
    else
      CMD="${ARG2:-start}"
      # For status/logs the second positional arg is the SERVICE (not env).
      # Everything else uses [env] [extra].
      case "$CMD" in
        status|logs) ENV_ARG=dev; EXTRA="${ARG3:-}" ;;
        *)           ENV_ARG="${ARG3:-dev}"; EXTRA="${ARG4:-}" ;;
      esac
    fi
    echo ""
    echo -e "${P}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${P}║   Miamo — start.sh ${VERSION}   mode=$MODE  cmd=$CMD  env=$ENV_ARG${NC}"
    echo -e "${P}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo -e "  ${C}OS:${NC}  $OS  (family: $OS_FAMILY)"
    echo ""
    case "$MODE" in
      local)
        case "$CMD" in
          status) local_cmd status "$EXTRA" ;;
          logs)   local_cmd logs   "${EXTRA:-${ENV_ARG:-gateway}}" ;;
          *)      local_cmd "$CMD" "$ENV_ARG" ;;
        esac ;;
      docker)
        case "$CMD" in
          status) docker_cmd status "$EXTRA" ;;
          logs)   docker_cmd logs   "${EXTRA:-${ENV_ARG:-gateway}}" ;;
          *)      docker_cmd "$CMD" "$ENV_ARG" ;;
        esac ;;
      k8s)
        case "$CMD" in
          status) k8s_cmd status "$ENV_ARG" "$EXTRA" ;;
          logs)   k8s_cmd logs   "$ENV_ARG" "${EXTRA:-gateway}" ;;
          *)      k8s_cmd "$CMD" "$ENV_ARG" ;;
        esac ;;
    esac
    ;;

  # Back-compat top-level aliases (preserve npm run stop / old docs).
  stop)    local_cmd stop ;;
  status)  local_cmd status "${ARG2:-}" ;;
  restart) local_cmd restart "${ARG2:-dev}" ;;
  logs)    local_cmd logs    "${ARG2:-gateway}" ;;

  *)
    fail "Unknown mode/command: '$MODE'"
    echo "  Try: bash scripts/start.sh help [local|docker|k8s]"
    exit 1
    ;;
esac
