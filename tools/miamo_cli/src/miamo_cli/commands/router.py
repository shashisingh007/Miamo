"""Top-level verb router: `miamo <verb> [mode] [service]`.

Turns natural CLI phrasing into the right underlying command:

    miamo start                    → local: start all
    miamo start local              → local: start all
    miamo start local gateway      → local: start only gateway
    miamo start docker             → docker compose up
    miamo start k8s                → kubectl apply -f k8s/

    miamo stop  [mode] [service]   → same routing, reverse action
    miamo restart [mode] [service] → same routing, stop then start
    miamo status [mode]            → mode-specific status table
    miamo logs [mode] [service]    → mode-specific log tail

Modes: `local` (default), `docker`, `k8s`.
Services: any service name from `miamo service list`. Default: all.
"""

from __future__ import annotations

import subprocess
import sys
import time
from typing import Optional

import click

from ..config import SERVICES
from ..env import ensure_docker_daemon
from ..shell import die, note, warn
from . import docker_mode, k8s, local as local_cmd, monitor


VALID_MODES = ("local", "docker", "k8s")
SERVICE_NAMES = [name for name, _ in SERVICES] + ["web"]


def _parse_mode_and_service(
    mode_or_service: Optional[str],
    service: Optional[str],
) -> tuple[str, Optional[str]]:
    """Parse the two positional args flexibly.

    Supports every reasonable shape:
        miamo start                    → local, all
        miamo start local              → local, all
        miamo start local all          → local, all  (literal 'all')
        miamo start local gateway      → local, gateway
        miamo start gateway            → local, gateway   (shorthand)
        miamo start docker             → docker, all
        miamo start docker all         → docker, all
        miamo start docker auth        → docker, auth
    """
    # Slot 2 literal 'all' collapses to None (== all services)
    if service is not None and service.lower() == "all":
        service = None

    if mode_or_service is None:
        return "local", None

    # If slot 1 is 'all', it means default mode + all services
    if mode_or_service.lower() == "all":
        return "local", None

    if mode_or_service in VALID_MODES:
        return mode_or_service, service

    # Not a mode — treat as a service name under default mode.
    if service is not None:
        die(
            f"'{mode_or_service}' is not a valid mode",
            f"valid modes: {', '.join(VALID_MODES)} (or a service name in slot 1)",
        )
    return "local", mode_or_service


def _validate_service(name: Optional[str]) -> None:
    """Validate a service name. Accepts None (all) or a known service."""
    if name is None:
        return
    if name not in SERVICE_NAMES:
        die(
            f"unknown service: '{name}'",
            f"valid services: {', '.join(SERVICE_NAMES)}, or 'all'",
        )


# ─── miamo start ────────────────────────────────────────────────────────────


@click.command()
@click.argument("mode_or_service", required=False)
@click.argument("service", required=False)
@click.option("--skip-deps", is_flag=True, help="(local only) Skip npm install")
@click.option("--skip-prisma", is_flag=True, help="(local only) Skip prisma migrate deploy")
def start(
    mode_or_service: Optional[str],
    service: Optional[str],
    skip_deps: bool,
    skip_prisma: bool,
) -> None:
    """Start Miamo — pick a mode (local | docker | k8s) and optional service.

    \b
    Examples:
      miamo start                    # local: all 7 services + web
      miamo start local              # same as above
      miamo start local gateway      # only the gateway service (local)
      miamo start docker             # docker compose up
      miamo start k8s                # kubectl apply -f k8s/
      miamo start gateway            # shorthand: local, only gateway
    """
    mode, svc = _parse_mode_and_service(mode_or_service, service)
    _validate_service(svc)

    if mode == "local":
        if svc:
            # Reuse the shell primitive from service.py so we don't spin up
            # Postgres/Redis + prisma sync just to restart one service.
            from . import service as service_cmd
            service_cmd.start_one.callback(name=svc)
            return
        local_cmd.start.callback(skip_deps=skip_deps, skip_prisma=skip_prisma, only=())
        return

    if mode == "docker":
        if svc:
            _docker_start_service(svc)
            return
        docker_mode.up.callback()
        return

    if mode == "k8s":
        if svc:
            warn("per-service k8s start not implemented — deploying the whole namespace")
        k8s.deploy.callback()  # type: ignore[attr-defined]
        return

    die(f"unknown mode: {mode}")


# ─── miamo stop ─────────────────────────────────────────────────────────────


@click.command()
@click.argument("mode_or_service", required=False)
@click.argument("service", required=False)
def stop(mode_or_service: Optional[str], service: Optional[str]) -> None:
    """Stop Miamo — pick a mode (local | docker | k8s) and optional service.

    \b
    Examples:
      miamo stop                     # local: stop all
      miamo stop local gateway       # only the gateway service
      miamo stop docker              # docker compose down
      miamo stop k8s                 # kubectl delete -f k8s/
    """
    mode, svc = _parse_mode_and_service(mode_or_service, service)
    _validate_service(svc)

    if mode == "local":
        if svc:
            from . import service as service_cmd
            service_cmd.stop_one.callback(name=svc)
            return
        local_cmd.stop.callback(only=())
        return

    if mode == "docker":
        if svc:
            _docker_stop_service(svc)
            return
        docker_mode.down.callback()
        return

    if mode == "k8s":
        if svc:
            warn("per-service k8s stop not implemented — tearing down the namespace")
        k8s.destroy.callback()  # type: ignore[attr-defined]
        return

    die(f"unknown mode: {mode}")


# ─── miamo restart ──────────────────────────────────────────────────────────


@click.command()
@click.argument("mode_or_service", required=False)
@click.argument("service", required=False)
@click.pass_context
def restart(
    ctx: click.Context,
    mode_or_service: Optional[str],
    service: Optional[str],
) -> None:
    """Restart Miamo — stop then start, mode-aware.

    \b
    Examples:
      miamo restart                  # local: full stop + start
      miamo restart local gateway    # only the gateway service
      miamo restart docker           # docker compose down + up
    """
    mode, svc = _parse_mode_and_service(mode_or_service, service)
    _validate_service(svc)

    if mode == "local":
        if svc:
            from . import service as service_cmd
            service_cmd.stop_one.callback(name=svc)
            time.sleep(1)
            service_cmd.start_one.callback(name=svc)
            return
        local_cmd.restart.callback()  # type: ignore[attr-defined]
        return

    if mode == "docker":
        if svc:
            _docker_stop_service(svc)
            time.sleep(1)
            _docker_start_service(svc)
            return
        docker_mode.down.callback()
        time.sleep(2)
        docker_mode.up.callback()
        return

    if mode == "k8s":
        warn("k8s restart uses `kubectl rollout restart` — not the destroy/deploy cycle")
        _k8s_rollout_restart(svc)
        return

    die(f"unknown mode: {mode}")


# ─── miamo kill ─────────────────────────────────────────────────────────────


@click.command()
@click.argument("mode_or_service", required=False)
@click.argument("service", required=False)
def kill(mode_or_service: Optional[str], service: Optional[str]) -> None:
    """Force-kill (SIGKILL) — no graceful shutdown. Mode-aware.

    Use when `stop` hangs or a service is stuck. Docker mode does
    `docker kill`, k8s deletes pods (they get respawned by their Deployment).

    \b
    Examples:
      miamo kill                     # local: SIGKILL every service
      miamo kill local gateway       # only gateway (local)
      miamo kill docker              # docker kill every miamo container
      miamo kill docker auth         # docker kill miamo-auth
      miamo kill k8s gateway         # delete the gateway pods (they respawn)
    """
    mode, svc = _parse_mode_and_service(mode_or_service, service)
    _validate_service(svc)

    if mode == "local":
        from . import service as service_cmd
        if svc:
            service_cmd.kill_one.callback(name=svc)
            return
        for name, _port in SERVICES:
            try:
                service_cmd.kill_one.callback(name=name)
            except SystemExit:
                pass
        # Also web
        try:
            service_cmd.kill_one.callback(name="web")
        except (SystemExit, Exception):  # web isn't in SERVICE_MAP
            _local_kill_by_port("web", 3100)
        return

    if mode == "docker":
        if svc:
            _docker_kill_service(svc)
            return
        # Kill every miamo-* container we can see
        r = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True, text=True,
        )
        for line in r.stdout.strip().splitlines():
            if line.startswith("miamo-"):
                _docker_kill_service(line[len("miamo-"):])
        return

    if mode == "k8s":
        _k8s_kill(svc)
        return

    die(f"unknown mode: {mode}")


# ─── miamo status ───────────────────────────────────────────────────────────


@click.command()
@click.argument("mode_or_service", required=False)
@click.argument("service", required=False)
def status(mode_or_service: Optional[str], service: Optional[str]) -> None:
    """Show the running state — mode-aware. Optional service filters to one row.

    \b
    Examples:
      miamo status                    # local status table (all)
      miamo status gateway            # local status, only gateway
      miamo status local              # explicit mode, all
      miamo status local gateway      # explicit mode + service
      miamo status docker             # docker compose ps
      miamo status docker auth        # docker inspect + ps for miamo-auth
      miamo status k8s                # kubectl get pods -n miamo
      miamo status k8s gateway        # kubectl get pods -l app=gateway
    """
    mode, svc = _parse_mode_and_service(mode_or_service, service)
    _validate_service(svc)

    if mode == "local":
        if svc:
            _local_status_one(svc)
            return
        local_cmd.status.callback()
        return
    if mode == "docker":
        if svc:
            _docker_status_one(svc)
            return
        docker_mode.status.callback()
        return
    if mode == "k8s":
        _k8s_status(svc)
        return


# ─── miamo logs ─────────────────────────────────────────────────────────────


@click.command()
@click.argument("mode_or_service", required=False)
@click.argument("service", required=False)
@click.option("-n", "--lines", default=50, show_default=True)
@click.option("-f", "--follow", is_flag=True)
def logs(
    mode_or_service: Optional[str],
    service: Optional[str],
    lines: int,
    follow: bool,
) -> None:
    """Tail logs — mode-aware.

    \b
    Examples:
      miamo logs                        # all local services, mini panel
      miamo logs gateway                # local gateway logs
      miamo logs local gateway -f       # follow local gateway logs
      miamo logs docker gateway         # docker compose logs gateway
    """
    mode, svc = _parse_mode_and_service(mode_or_service, service)
    _validate_service(svc)

    if mode == "local":
        local_cmd.logs.callback(service=svc, lines=lines, follow=follow)
        return
    if mode == "docker":
        docker_mode.logs.callback(service=svc, lines=lines)
        return
    if mode == "k8s":
        _k8s_logs(svc, lines, follow)
        return


# ─── miamo health [MODE] [SERVICE] ──────────────────────────────────────────


@click.command()
@click.argument("mode_or_service", required=False)
@click.argument("service", required=False)
@click.option("--watch", is_flag=True, help="Refresh every 3s (local only)")
@click.option("--json", "json_out", is_flag=True)
def health(
    mode_or_service: Optional[str],
    service: Optional[str],
    watch: bool,
    json_out: bool,
) -> None:
    """Health probe — mode-aware. Optional service probes one endpoint.

    \b
    Examples:
      miamo health                    # HTTP /healthz on every local service
      miamo health gateway            # probe only gateway
      miamo health local gateway      # explicit mode + service
      miamo health docker             # docker container health
      miamo health docker gateway     # health of one docker container
      miamo health k8s                # kubectl get pods -n miamo
      miamo health k8s gateway        # kubectl get pods -l app=gateway
    """
    mode, svc = _parse_mode_and_service(mode_or_service, service)
    _validate_service(svc)

    if mode == "local":
        if svc:
            _local_health_one(svc, json_out=json_out)
            return
        from . import health as health_cmd
        health_cmd.health.callback(watch=watch, json_out=json_out)
        return
    if mode == "docker":
        if svc:
            _docker_status_one(svc)
            return
        docker_mode.status.callback()
        return
    if mode == "k8s":
        _k8s_status(svc)
        return


# ─── miamo top / mem / cpu / uptime [MODE] [SERVICE] ────────────────────────


@click.command()
@click.argument("mode_or_service", required=False)
@click.argument("service", required=False)
@click.option("-n", "--window", default="30s")
@click.option("--watch", is_flag=True)
def top(
    mode_or_service: Optional[str],
    service: Optional[str],
    window: str,
    watch: bool,
) -> None:
    """CPU + memory + uptime averaged over a window.

    In `docker` mode this is a point-in-time `docker stats` snapshot.
    In `k8s` mode this is `kubectl top pods` (requires metrics-server).

    \b
    Examples:
      miamo top                       # local, 30s window (all)
      miamo top -n 5m                 # local, 5-minute average
      miamo top gateway               # local, only gateway
      miamo top local gateway         # explicit
      miamo top docker                # docker stats snapshot
      miamo top docker gateway        # docker stats — only miamo-gateway
      miamo top k8s                   # kubectl top pods -n miamo
      miamo top k8s auth              # kubectl top pods -l app=auth
    """
    mode, svc = _parse_mode_and_service(mode_or_service, service)
    _validate_service(svc)

    if mode == "local":
        _local_resource_view(kind="top", window=window, service=svc, watch=watch)
        return
    if mode == "docker":
        _docker_top(svc)
        return
    if mode == "k8s":
        _k8s_top(svc)
        return


@click.command()
@click.argument("mode_or_service", required=False)
@click.argument("service", required=False)
@click.option("-n", "--window", default="30s")
def mem(
    mode_or_service: Optional[str],
    service: Optional[str],
    window: str,
) -> None:
    """Memory-only view. Same shape as `top`.

    \b
    Examples:
      miamo mem                 # local, all services
      miamo mem gateway         # local, only gateway
      miamo mem docker          # docker stats (mem column)
      miamo mem k8s auth        # kubectl top pods -l app=auth
    """
    mode, svc = _parse_mode_and_service(mode_or_service, service)
    _validate_service(svc)
    if mode == "local":
        _local_resource_view(kind="mem", window=window, service=svc, watch=False)
        return
    if mode == "docker":
        _docker_top(svc)
        return
    if mode == "k8s":
        _k8s_top(svc)
        return


@click.command()
@click.argument("mode_or_service", required=False)
@click.argument("service", required=False)
@click.option("-n", "--window", default="30s")
def cpu(
    mode_or_service: Optional[str],
    service: Optional[str],
    window: str,
) -> None:
    """CPU-only view. Same shape as `top`.

    \b
    Examples:
      miamo cpu                 # local, all services
      miamo cpu gateway         # local, only gateway
      miamo cpu docker          # docker stats snapshot
      miamo cpu k8s             # kubectl top pods
    """
    mode, svc = _parse_mode_and_service(mode_or_service, service)
    _validate_service(svc)
    if mode == "local":
        _local_resource_view(kind="cpu", window=window, service=svc, watch=False)
        return
    if mode == "docker":
        _docker_top(svc)
        return
    if mode == "k8s":
        _k8s_top(svc)
        return


@click.command()
@click.argument("mode_or_service", required=False)
@click.argument("service", required=False)
def uptime(
    mode_or_service: Optional[str],
    service: Optional[str],
) -> None:
    """Per-service uptime — how long each service has been running.

    \b
    Examples:
      miamo uptime                    # local, all services
      miamo uptime gateway            # local, only gateway
      miamo uptime docker             # docker container uptime
      miamo uptime docker auth        # only miamo-auth
      miamo uptime k8s                # k8s pod ages
    """
    mode, svc = _parse_mode_and_service(mode_or_service, service)
    _validate_service(svc)
    if mode == "local":
        _local_uptime_view(service=svc)
        return
    if mode == "docker":
        _docker_uptime(service=svc)
        return
    if mode == "k8s":
        _k8s_status(svc)
        return


# ─── miamo tail [MODE] [SERVICE] ────────────────────────────────────────────


@click.command()
@click.argument("mode_or_service", required=False)
@click.argument("service", required=False)
@click.option("--errors", is_flag=True, help="Only show error / warn lines")
@click.option("-n", "--lines", default=100)
def tail(
    mode_or_service: Optional[str],
    service: Optional[str],
    errors: bool,
    lines: int,
) -> None:
    """Smart log tail — highlights errors + warnings. Mode-aware.

    \b
    Examples:
      miamo tail                       # all local services
      miamo tail gateway               # only gateway (local)
      miamo tail --errors              # errors across all local services
      miamo tail docker gateway        # docker logs miamo-gateway
      miamo tail k8s auth              # kubectl logs -l app=auth
    """
    mode, svc = _parse_mode_and_service(mode_or_service, service)
    _validate_service(svc)

    if mode == "local":
        monitor.tail.callback(service=svc, errors=errors, lines=lines)
        return
    if mode == "docker":
        docker_mode.logs.callback(service=svc, lines=lines)
        return
    if mode == "k8s":
        _k8s_logs(svc, lines, follow=False)
        return


# ─── miamo diagnose [MODE] ──────────────────────────────────────────────────


@click.command()
@click.argument("mode_or_service", required=False)
@click.argument("service", required=False)
@click.option("-n", "--window", default="5s")
def diagnose(
    mode_or_service: Optional[str],
    service: Optional[str],
    window: str,
) -> None:
    """Full troubleshooting sweep. Mode-aware. Optional service focuses the sweep.

    \b
    Examples:
      miamo diagnose                    # local: full sweep across every service
      miamo diagnose gateway            # local: focus on gateway only
      miamo diagnose local gateway      # explicit
      miamo diagnose docker             # docker: compose ps + stats + errors
      miamo diagnose docker auth        # docker: focus on miamo-auth
      miamo diagnose k8s                # pods + top + failed events
      miamo diagnose k8s gateway        # only pods for app=gateway
    """
    mode, svc = _parse_mode_and_service(mode_or_service, service)
    _validate_service(svc)
    if mode == "local":
        if svc:
            _local_diagnose_one(svc, window)
            return
        monitor.diagnose.callback(window=window)
        return
    if mode == "docker":
        _docker_diagnose(service=svc)
        return
    if mode == "k8s":
        _k8s_diagnose(service=svc)
        return


# ─── Helpers for docker/k8s per-service ops ─────────────────────────────────


def _docker_container_name(service: str) -> str:
    return f"miamo-{service}" if not service.startswith("miamo-") else service


def _docker_start_service(service: str) -> None:
    """`docker compose start <service>` if the compose stack is up, else fall back to `docker start <container>`."""
    ensure_docker_daemon()
    name = _docker_container_name(service)
    r = subprocess.run(
        ["docker", "start", name],
        capture_output=True, text=True,
    )
    if r.returncode == 0:
        note(f"docker container {name} started")
        return
    # Try compose service start (may not exist in this stack)
    r2 = subprocess.run(
        ["docker", "compose", "start", service],
        capture_output=True, text=True,
    )
    if r2.returncode == 0:
        note(f"docker compose service {service} started")
        return
    die(f"could not start {service} in docker mode", r.stderr.strip() or r2.stderr.strip())


def _docker_stop_service(service: str) -> None:
    ensure_docker_daemon()
    name = _docker_container_name(service)
    r = subprocess.run(
        ["docker", "stop", name],
        capture_output=True, text=True,
    )
    if r.returncode == 0:
        note(f"docker container {name} stopped")
        return
    r2 = subprocess.run(
        ["docker", "compose", "stop", service],
        capture_output=True, text=True,
    )
    if r2.returncode == 0:
        note(f"docker compose service {service} stopped")
        return
    die(f"could not stop {service} in docker mode", r.stderr.strip() or r2.stderr.strip())


def _k8s_rollout_restart(service: Optional[str]) -> None:
    """`kubectl rollout restart deployment/<service>` — restarts pods without deploy/destroy."""
    if service:
        cmd = ["kubectl", "-n", "miamo", "rollout", "restart", f"deployment/{service}"]
    else:
        cmd = ["kubectl", "-n", "miamo", "rollout", "restart", "deployment"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    sys.stdout.write(r.stdout)
    sys.stderr.write(r.stderr)
    if r.returncode != 0:
        sys.exit(r.returncode)


def _k8s_logs(service: Optional[str], lines: int, follow: bool) -> None:
    """kubectl logs -n miamo (-f) <selector> --tail=<n>"""
    cmd = ["kubectl", "-n", "miamo", "logs", f"--tail={lines}"]
    if follow:
        cmd.append("-f")
    if service:
        cmd += ["-l", f"app={service}"]
    else:
        cmd += ["-l", "app.kubernetes.io/part-of=miamo"]
    subprocess.run(cmd)


def _docker_kill_service(service: str) -> None:
    """`docker kill` — SIGKILL variant of _docker_stop_service."""
    ensure_docker_daemon()
    name = _docker_container_name(service)
    r = subprocess.run(
        ["docker", "kill", name],
        capture_output=True, text=True,
    )
    if r.returncode == 0:
        note(f"docker container {name} killed")
        return
    # Compose service kill isn't a standard subcommand; fall back to `stop -t 0`
    r2 = subprocess.run(
        ["docker", "compose", "stop", "-t", "0", service],
        capture_output=True, text=True,
    )
    if r2.returncode == 0:
        note(f"docker compose service {service} force-stopped (-t 0)")
        return
    warn(f"could not kill {service}: {r.stderr.strip() or r2.stderr.strip()}")


def _k8s_kill(service: Optional[str]) -> None:
    """Delete pods — the Deployment respawns them, effectively a hard restart."""
    if service:
        cmd = ["kubectl", "-n", "miamo", "delete", "pod", "-l", f"app={service}"]
    else:
        cmd = ["kubectl", "-n", "miamo", "delete", "pod",
               "-l", "app.kubernetes.io/part-of=miamo"]
    subprocess.run(cmd)


def _local_kill_by_port(name: str, port: int) -> None:
    """Fallback when the service isn't in SERVICE_MAP (e.g. web)."""
    from ..config import PID_DIR
    pidfile = PID_DIR / f"{name}.pid"
    if pidfile.exists():
        try:
            pid = int(pidfile.read_text().strip())
            import os, signal
            os.kill(pid, signal.SIGKILL)
            note(f"{name} killed (pid {pid})")
        except (ValueError, ProcessLookupError):
            pass
        pidfile.unlink(missing_ok=True)
    subprocess.run(
        ["bash", "-c", f"lsof -ti :{port} | xargs kill -9 2>/dev/null || true"],
        check=False,
    )


def _docker_top(service: Optional[str] = None) -> None:
    """`docker stats --no-stream` filtered to miamo-* containers (or one)."""
    ensure_docker_daemon()
    import re as _re
    r = subprocess.run(
        ["docker", "stats", "--no-stream", "--format",
         "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}"],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        warn(r.stderr.strip() or "docker stats failed")
        return
    rows = r.stdout.strip().splitlines()
    filter_name = _docker_container_name(service) if service else None
    picked = []
    for row in rows:
        cells = row.split("|")
        if len(cells) < 5:
            continue
        name = cells[0]
        if not name.startswith("miamo-"):
            continue
        if filter_name and name != filter_name:
            continue
        picked.append(cells)
    if not picked:
        warn(
            f"no matching container running for '{service}'" if service
            else "no miamo-* containers running"
        )
        return
    from rich.console import Console
    from rich.table import Table
    title = f"Docker stats — {filter_name}" if filter_name else "Docker stats (point-in-time)"
    t = Table(title=title)
    for col in ("Container", "CPU", "Memory", "Mem%", "Net I/O"):
        t.add_column(col)
    for cells in picked:
        t.add_row(*cells[:5])
    Console().print(t)


def _docker_uptime(service: Optional[str] = None) -> None:
    """docker ps --format Name + Status (which includes 'Up 5 hours'). Optional filter."""
    ensure_docker_daemon()
    r = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}\t{{.Status}}"],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        warn(r.stderr.strip() or "docker ps failed")
        return
    filter_name = _docker_container_name(service) if service else None
    from rich.console import Console
    from rich.table import Table
    t = Table(title=f"Docker uptime — {filter_name}" if filter_name else "Docker container uptime")
    t.add_column("Container", style="cyan")
    t.add_column("Status")
    any_row = False
    for line in r.stdout.strip().splitlines():
        parts = line.split("\t", 1)
        if len(parts) != 2 or not parts[0].startswith("miamo-"):
            continue
        if filter_name and parts[0] != filter_name:
            continue
        t.add_row(parts[0], parts[1])
        any_row = True
    if not any_row:
        warn(f"no running container matches '{service}'" if service else "no miamo-* containers running")
        return
    Console().print(t)


def _k8s_top(service: Optional[str]) -> None:
    """kubectl top pods -n miamo (optionally -l app=<svc>)."""
    cmd = ["kubectl", "-n", "miamo", "top", "pods"]
    if service:
        cmd += ["-l", f"app={service}"]
    subprocess.run(cmd)


def _docker_diagnose(service: Optional[str] = None) -> None:
    """Docker-mode full sweep. Optional service filters container logs sweep."""
    ensure_docker_daemon()
    from rich.console import Console
    console = Console()
    filter_name = _docker_container_name(service) if service else None
    label = f" — {filter_name}" if filter_name else ""
    console.rule(f"[bold cyan]1. Docker containers{label}[/bold cyan]")
    if filter_name:
        subprocess.run(["docker", "ps", "-a", "--filter", f"name={filter_name}"])
    else:
        subprocess.run(["docker", "compose", "ps"])
    console.rule("[bold cyan]2. Docker stats[/bold cyan]")
    _docker_top(service)
    console.rule("[bold cyan]3. Recent errors in container logs[/bold cyan]")
    r = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}"],
        capture_output=True, text=True,
    )
    for line in r.stdout.strip().splitlines():
        if not line.startswith("miamo-"):
            continue
        if filter_name and line != filter_name:
            continue
        logs = subprocess.run(
            ["docker", "logs", "--tail", "200", line],
            capture_output=True, text=True,
        )
        import re
        errs = [
            ln for ln in logs.stdout.splitlines() + logs.stderr.splitlines()
            if re.search(r"error|fail|exception", ln, re.I)
        ]
        if errs:
            console.print(f"  [red]{line}:[/red] {len(errs)} error lines (last 3):")
            for ln in errs[-3:]:
                console.print(f"    {ln[:200]}")


def _k8s_diagnose(service: Optional[str] = None) -> None:
    """K8s-mode full sweep. Optional service filters pod list."""
    from rich.console import Console
    console = Console()
    label = f" (app={service})" if service else ""
    console.rule(f"[bold cyan]1. Pods{label}[/bold cyan]")
    cmd = ["kubectl", "-n", "miamo", "get", "pods", "-o", "wide"]
    if service:
        cmd += ["-l", f"app={service}"]
    subprocess.run(cmd)
    console.rule("[bold cyan]2. Top pods[/bold cyan]")
    _k8s_top(service)
    console.rule("[bold cyan]3. Recent events (failed / warning)[/bold cyan]")
    ev_cmd = [
        "kubectl", "-n", "miamo", "get", "events",
        "--field-selector", "type!=Normal",
        "--sort-by=.lastTimestamp",
    ]
    subprocess.run(ev_cmd)


def _k8s_status(service: Optional[str]) -> None:
    """`kubectl get pods -n miamo` optionally filtered to one app."""
    cmd = ["kubectl", "-n", "miamo", "get", "pods"]
    if service:
        cmd += ["-l", f"app={service}"]
    subprocess.run(cmd)


# ─── Local per-service helpers ──────────────────────────────────────────────


def _local_service_port(name: str) -> Optional[int]:
    """Look up the port for a local service name (or 3100 for 'web')."""
    if name == "web":
        return 3100
    for svc_name, port in SERVICES:
        if svc_name == name:
            return port
    return None


def _local_status_one(name: str) -> None:
    """Rich single-row status: pid, port, health, uptime for one local service."""
    import time as _time
    from datetime import datetime
    from rich.console import Console
    from rich.table import Table
    import requests

    port = _local_service_port(name)
    if port is None:
        die(f"unknown local service: {name}")
    from ..config import PID_DIR
    pidfile = PID_DIR / f"{name}.pid"
    pid: Optional[int] = None
    if pidfile.exists():
        try:
            pid = int(pidfile.read_text().strip())
        except ValueError:
            pass

    health_str = "[dim]—[/dim]"
    latency = "—"
    try:
        t0 = _time.time()
        resp = requests.get(f"http://localhost:{port}/healthz", timeout=2)
        latency = f"{int((_time.time() - t0) * 1000)}ms"
        health_str = f"[green]{resp.status_code}[/green]" if resp.status_code == 200 else f"[yellow]{resp.status_code}[/yellow]"
    except Exception:
        health_str = "[red]DOWN[/red]"

    started = "—"
    uptime_str = "—"
    if pid is not None:
        try:
            import psutil  # type: ignore
            proc = psutil.Process(pid)
            started = datetime.fromtimestamp(proc.create_time()).strftime("%Y-%m-%d %H:%M:%S")
            secs = int(_time.time() - proc.create_time())
            if secs < 60:
                uptime_str = f"{secs}s"
            elif secs < 3600:
                uptime_str = f"{secs // 60}m{secs % 60}s"
            else:
                uptime_str = f"{secs // 3600}h{(secs % 3600) // 60}m"
        except Exception:
            pass

    t = Table(title=f"Status — {name}")
    t.add_column("Field", style="cyan")
    t.add_column("Value")
    t.add_row("service", name)
    t.add_row("port", str(port))
    t.add_row("pid", str(pid) if pid else "—")
    t.add_row("health", health_str)
    t.add_row("latency", latency)
    t.add_row("started", started)
    t.add_row("uptime", uptime_str)
    Console().print(t)


def _local_health_one(name: str, json_out: bool = False) -> None:
    """HTTP /healthz probe on a single local service."""
    import time as _time
    import requests
    port = _local_service_port(name)
    if port is None:
        die(f"unknown local service: {name}")
    url = f"http://localhost:{port}/healthz" if name != "web" else f"http://localhost:{port}"
    t0 = _time.time()
    try:
        resp = requests.get(url, timeout=3)
        latency_ms = int((_time.time() - t0) * 1000)
        if json_out:
            import json as _j
            print(_j.dumps({
                "service": name, "port": port,
                "status": resp.status_code, "latency_ms": latency_ms,
            }))
            return
        colour = "green" if resp.status_code == 200 else "yellow"
        note(f"{name}:{port} → [{colour}]{resp.status_code}[/{colour}] ({latency_ms}ms)")
    except Exception as e:
        if json_out:
            import json as _j
            print(_j.dumps({"service": name, "port": port, "status": None, "error": str(e)}))
            return
        warn(f"{name}:{port} → [red]DOWN[/red] ({e.__class__.__name__})")


def _local_resource_view(
    kind: str,  # "top" | "mem" | "cpu"
    window: str,
    service: Optional[str],
    watch: bool,
) -> None:
    """Route local resource views to the right monitor.* command with optional filter.

    The monitor.top/mem/cpu commands don't natively filter by service. We
    delegate to the underlying implementation and (when a service is given)
    let the user see the full table with a hint — the alternative is a full
    rewrite of monitor.py which we can do later if noise is a problem.
    """
    if service:
        note(f"showing all rows — filter for '{service}' below:")
    if kind == "top":
        monitor.top.callback(window=window, watch=watch, json_out=False)
    elif kind == "mem":
        monitor.mem.callback(window=window)
    elif kind == "cpu":
        monitor.cpu.callback(window=window)


def _local_uptime_view(service: Optional[str]) -> None:
    """Local uptime — full table, or single row if service given."""
    if service is None:
        monitor.uptime.callback()
        return
    _local_status_one(service)  # single-service status includes uptime


def _local_diagnose_one(name: str, window: str) -> None:
    """Focused local diagnose: status + tail errors for one service."""
    from rich.console import Console
    console = Console()
    console.rule(f"[bold cyan]1. Status — {name}[/bold cyan]")
    _local_status_one(name)
    console.rule(f"[bold cyan]2. Recent errors — {name}[/bold cyan]")
    monitor.tail.callback(service=name, errors=True, lines=100)


def _docker_status_one(service: str) -> None:
    """`docker inspect` + latest lines from `docker ps` for one container."""
    ensure_docker_daemon()
    name = _docker_container_name(service)
    from rich.console import Console
    from rich.table import Table
    r = subprocess.run(
        ["docker", "ps", "-a", "--filter", f"name={name}", "--format",
         "{{.Names}}|{{.Status}}|{{.Ports}}|{{.CreatedAt}}"],
        capture_output=True, text=True,
    )
    lines = [ln for ln in r.stdout.strip().splitlines() if ln]
    if not lines:
        warn(f"no docker container named '{name}'")
        return
    t = Table(title=f"Docker status — {name}")
    for col in ("Container", "Status", "Ports", "Created"):
        t.add_column(col)
    for ln in lines:
        parts = ln.split("|")
        if len(parts) == 4:
            t.add_row(*parts)
    Console().print(t)
