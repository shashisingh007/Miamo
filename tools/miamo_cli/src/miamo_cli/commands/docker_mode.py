"""Docker Compose mode — full stack.

Ported from scripts/start.sh docker_start / docker_stop / docker_status / docker_logs.
"""

from __future__ import annotations

import subprocess

import click
from rich.table import Table

from ..config import DOCKER_CONTAINERS, ROOT
from ..env import ensure_docker_daemon, has, load_env
from ..shell import capture, console, die, hdr, note, ok, run, step, try_run, warn


def _require_docker() -> None:
    """Guarantee the Docker daemon is up. Auto-starts Colima / Docker Desktop
    on Mac and `systemctl start docker` on Linux when the socket is dead."""
    ensure_docker_daemon()


@click.group()
def docker_group() -> None:
    """Docker Compose mode (13-container stack)."""


@docker_group.command()
def up() -> None:
    """docker compose up -d --build."""
    try:
        _require_docker()
        load_env()
        step("docker compose up -d --build…")
        try:
            run(["docker", "compose", "up", "-d", "--build"], cwd=ROOT, check=True)
            ok("docker stack up")
        except subprocess.CalledProcessError:
            die("docker compose up -d --build", "check docker-compose.yml and .env")
    except KeyboardInterrupt:
        raise SystemExit(130)


@docker_group.command()
def down() -> None:
    """docker compose down."""
    try:
        _require_docker()
        hdr("Stopping docker stack")
        try_run(["docker", "compose", "down"], cwd=ROOT, quiet=False)
        ok("All docker containers stopped")
    except KeyboardInterrupt:
        raise SystemExit(130)


@docker_group.command()
def status() -> None:
    """Table of miamo-* containers + state + health."""
    try:
        ensure_docker_daemon()

        table = Table(title="Miamo Docker Status")
        table.add_column("Container", style="cyan")
        table.add_column("State")
        table.add_column("Status")

        for c in DOCKER_CONTAINERS:
            if try_run(["docker", "inspect", c], quiet=True):
                state = capture(["docker", "inspect", "-f", "{{.State.Status}}", c]) or "?"
                status_str = (
                    capture(
                        [
                            "docker",
                            "inspect",
                            "-f",
                            "{{.State.Status}}{{if .State.Health}} ({{.State.Health.Status}}){{end}}",
                            c,
                        ]
                    )
                    or state
                )
            else:
                state, status_str = "absent", "-"
            colour = {
                "running": "green",
                "exited": "red",
            }.get(state, "yellow")
            table.add_row(c, f"[{colour}]{state}[/{colour}]", status_str)

        console.print(table)
    except KeyboardInterrupt:
        raise SystemExit(130)


@docker_group.command()
@click.argument("service", required=False)
@click.option("-n", "--lines", default=100, show_default=True)
def logs(service: str | None, lines: int) -> None:
    """docker compose logs -f (all services, or one)."""
    try:
        _require_docker()
        argv = ["docker", "compose", "logs", "-f", "--tail", str(lines)]
        if service:
            argv.append(service)
        console.print(f"[cyan]Tailing docker compose logs (Ctrl-C to exit)…[/cyan]")
        try:
            subprocess.run(argv, cwd=str(ROOT), check=False)
        except KeyboardInterrupt:
            pass
    except KeyboardInterrupt:
        raise SystemExit(130)
