"""`miamo version` / `miamo paths` / `miamo env-check` — meta info commands.

Each is a top-level Click command (not a group). Register individually in cli.py.
"""

from __future__ import annotations

import os
import subprocess
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from .. import __version__
from ..config import (
    GATEWAY_URL,
    LOG_DIR,
    PID_DIR,
    POSTGRES_CANDIDATE_NAMES,
    REDIS_CONTAINER,
    ROOT,
    WEB_URL,
)
from ..env import load_env
from ..shell import ok, warn

console = Console()


def _git_commit() -> str:
    try:
        r = subprocess.run(
            ["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=3,
        )
        return (r.stdout or "").strip() or "?"
    except (subprocess.SubprocessError, FileNotFoundError):
        return "?"


def _git_branch() -> str:
    try:
        r = subprocess.run(
            ["git", "-C", str(ROOT), "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=3,
        )
        return (r.stdout or "").strip() or "?"
    except (subprocess.SubprocessError, FileNotFoundError):
        return "?"


def _repo_version() -> str:
    """Read version from root package.json if present."""
    pkg = ROOT / "package.json"
    if not pkg.exists():
        return "?"
    try:
        import json

        return json.loads(pkg.read_text()).get("version", "?") or "?"
    except Exception:  # noqa: BLE001
        return "?"


@click.command("version")
def version_cmd() -> None:
    """Print CLI + repo version + git commit."""
    t = Table(title="Miamo version", show_header=False)
    t.add_column("Key", style="cyan")
    t.add_column("Value")
    t.add_row("miamo-cli", __version__)
    t.add_row("repo (package.json)", _repo_version())
    t.add_row("git branch", _git_branch())
    t.add_row("git commit", _git_commit())
    console.print(t)


@click.command("paths")
def paths_cmd() -> None:
    """Print all critical paths."""
    mobile_dir = ROOT / "mobile"
    services_dir = ROOT / "services"
    prisma_schema = ROOT / "services" / "shared" / "prisma" / "schema.prisma"
    env_file = ROOT / ".env"
    t = Table(title="Miamo paths", show_header=False)
    t.add_column("Key", style="cyan")
    t.add_column("Path")
    t.add_column("Exists")
    for label, p in [
        ("repo root", ROOT),
        ("services/", services_dir),
        ("mobile/", mobile_dir),
        ("prisma schema", prisma_schema),
        (".env", env_file),
        ("log dir", LOG_DIR),
        ("pid dir", PID_DIR),
    ]:
        exists = Path(p).exists()
        t.add_row(label, str(p), "yes" if exists else "no")
    t.add_row("gateway URL", GATEWAY_URL, "")
    t.add_row("web URL", WEB_URL, "")
    console.print(t)


# Secrets we consider "required" for the fleet to run in local-dev.
# NOTE: we only check presence + length; we never print the value.
REQUIRED_SECRETS = (
    "DATABASE_URL",
    "JWT_SECRET",
    "INTERNAL_SERVICE_KEY",
    "ENCRYPTION_KEY",
)

OPTIONAL_SECRETS = (
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "SENDGRID_API_KEY",
    "S3_BUCKET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "FIREBASE_SERVER_KEY",
    "APNS_KEY_ID",
)


def _docker_running(container: str) -> bool:
    try:
        r = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return container in (r.stdout or "").splitlines()
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


@click.command("env-check")
def env_check_cmd() -> None:
    """Verify .env is loaded + all required secrets exist + infra is up."""
    env_file = ROOT / ".env"
    if env_file.exists():
        ok(f".env present at {env_file}")
        load_env()
    else:
        warn(".env missing — falling back to shell env")

    t = Table(title="Required secrets")
    t.add_column("Var", style="cyan")
    t.add_column("Set")
    t.add_column("Length")
    for var in REQUIRED_SECRETS:
        v = os.environ.get(var)
        t.add_row(
            var,
            "yes" if v else "[red]NO[/red]",
            str(len(v)) if v else "—",
        )
    console.print(t)

    t2 = Table(title="Optional integrations")
    t2.add_column("Var", style="cyan")
    t2.add_column("Set")
    for var in OPTIONAL_SECRETS:
        v = os.environ.get(var)
        t2.add_row(var, "yes" if v else "—")
    console.print(t2)

    # Infra containers
    t3 = Table(title="Infra containers")
    t3.add_column("Container", style="cyan")
    t3.add_column("Running")
    pg_running = any(_docker_running(n) for n in POSTGRES_CANDIDATE_NAMES)
    t3.add_row(" | ".join(POSTGRES_CANDIDATE_NAMES), "yes" if pg_running else "[red]NO[/red]")
    t3.add_row(REDIS_CONTAINER, "yes" if _docker_running(REDIS_CONTAINER) else "[red]NO[/red]")
    console.print(t3)
