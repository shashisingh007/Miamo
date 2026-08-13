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
@click.option(
    "--sequential/--parallel",
    default=True,
    help="Build one service at a time (default) — safe on low-RAM boxes like t3.small (2 GB). Use --parallel on 8 GB+.",
)
@click.option(
    "--skip-build",
    is_flag=True,
    help="Skip `docker compose build` entirely — just `up -d`. Use when images are already built or pulled from a registry.",
)
def up(sequential: bool, skip_build: bool) -> None:
    """docker compose up -d — with sequential build to avoid OOM on small boxes.

    \b
    Build order (sequential mode):
      1. infra    : postgres, redis (needed by others)
      2. backends : gateway, auth, users, social, messaging, content, notifications
      3. workers  : ingest, tracking-worker
      4. web      : Next.js (biggest — built last)
      5. reverse  : nginx reverse proxy (if defined)

    \b
    Then `up -d` brings the whole stack up in one shot using the built images.
    """
    try:
        _require_docker()
        load_env()

        if not skip_build:
            build_order = [
                # Phase 1: infra images are pulled (postgres:16-alpine, redis:7-alpine) — no build needed
                # Phase 2: backend services — small (~150 MB each) — build one at a time
                ["gateway"],
                ["auth"],
                ["users"],
                ["social"],
                ["messaging"],
                ["content"],
                ["notifications"],
                # Phase 3: workers
                ["ingest"],
                ["tracking-worker"],
                # Phase 4: web (Next.js — heaviest, ~500 MB)
                ["web"],
                # Phase 5: migrate (one-shot)
                ["migrate"],
            ]

            if sequential:
                total = sum(len(g) for g in build_order)
                step(f"building {total} services sequentially (safe for 2 GB RAM)…")
                built = 0
                for group in build_order:
                    for svc in group:
                        built += 1
                        step(f"  [{built}/{total}] docker compose build {svc}")
                        try:
                            run(
                                ["docker", "compose", "build", svc],
                                cwd=ROOT,
                                check=True,
                            )
                        except subprocess.CalledProcessError:
                            die(
                                f"docker compose build {svc}",
                                f"check docker/{svc}.Dockerfile and try `miamo tail docker {svc}`",
                            )
                ok(f"built {total} services")
            else:
                step("docker compose build (all services in parallel)…")
                try:
                    run(["docker", "compose", "build"], cwd=ROOT, check=True)
                    ok("built all services")
                except subprocess.CalledProcessError:
                    die(
                        "docker compose build",
                        "parallel build failed — try `--sequential` on low-RAM hosts",
                    )

        step("docker compose up -d…")
        try:
            run(["docker", "compose", "up", "-d"], cwd=ROOT, check=True)
            ok("docker stack up")
        except subprocess.CalledProcessError:
            die("docker compose up -d", "check .env and `miamo status docker`")
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
