"""Static configuration — ports, container names, paths.

Every constant that lived in scripts/start.sh lives here.
"""

from __future__ import annotations

from pathlib import Path


def _find_repo_root() -> Path:
    """Walk upward until we find a directory containing package.json + services/."""
    here = Path(__file__).resolve()
    for parent in [here, *here.parents]:
        if (parent / "package.json").exists() and (parent / "services").is_dir():
            return parent
    # Fallback: 4 levels up from this file (src/miamo_cli/config.py -> repo)
    return here.parents[3]


ROOT: Path = _find_repo_root()

# 7 backend services (local mode); Postgres + Redis run in Docker.
SERVICES: list[tuple[str, int]] = [
    ("gateway", 3200),
    ("auth", 3201),
    ("users", 3202),
    ("social", 3203),
    ("messaging", 3204),
    ("content", 3205),
    ("notifications", 3206),
]

WEB_PORT: int = 3100

# Full docker/k8s container list (adds web + ingest + tracking-worker + DBs).
DOCKER_CONTAINERS: list[str] = [
    "miamo-gateway",
    "miamo-auth",
    "miamo-users",
    "miamo-social",
    "miamo-messaging",
    "miamo-content",
    "miamo-notifications",
    "miamo-ingest",
    "miamo-tracking-worker",
    "miamo-web",
    "miamo-postgres",
    "miamo-redis",
]

# Two naming conventions exist in the wild:
#   miamo-postgres        — docker-compose + newer setups
#   miamo-postgres-local  — older bootstrap
# ensure_infra prefers whichever is already present.
POSTGRES_CANDIDATE_NAMES: list[str] = ["miamo-postgres", "miamo-postgres-local"]
POSTGRES_CANONICAL_NAME: str = "miamo-postgres-local"  # created if neither exists
REDIS_CONTAINER: str = "miamo-redis"

LOG_DIR: Path = Path("/tmp/miamo-logs")
PID_DIR: Path = Path("/tmp/miamo-pids")

GATEWAY_URL: str = "http://localhost:3200"
GATEWAY_HEALTH: str = "http://localhost:3200/healthz"
WEB_URL: str = "http://localhost:3100"

# Postgres/Redis defaults (overridden by .env)
POSTGRES_USER: str = "miamo"
POSTGRES_PASSWORD: str = "miamo"
POSTGRES_DB: str = "miamo"
POSTGRES_VOLUME: str = "miamo-pgdata-local"
