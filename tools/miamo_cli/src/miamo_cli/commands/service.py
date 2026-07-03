"""`miamo service` — start/stop/restart a single backend service.

Complements `miamo start`/`miamo stop` (which act on the full fleet) by
giving per-service control when debugging one worker in isolation.
"""

from __future__ import annotations

import os
import signal
import subprocess
import time

import click
from rich.console import Console
from rich.table import Table

from ..config import LOG_DIR, PID_DIR, ROOT, SERVICES
from ..shell import ok, step, warn

SERVICE_MAP: dict[str, int] = dict(SERVICES)


def _service_names() -> list[str]:
    return [name for name, _ in SERVICES]


@click.group()
def service_group() -> None:
    """Manage individual backend services."""


@service_group.command("start")
@click.argument("name", type=click.Choice(_service_names()))
def start_one(name: str) -> None:
    """Start one service (leaves others running)."""
    port = SERVICE_MAP[name]
    # Kill anything on that port first so we don't fight an orphaned process.
    subprocess.run(
        ["bash", "-c", f"lsof -ti :{port} | xargs kill -9 2>/dev/null"],
        check=False,
    )
    PID_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logf = open(LOG_DIR / f"{name}.log", "ab")
    p = subprocess.Popen(
        ["npx", "tsx", "src/server.ts"],
        cwd=str(ROOT / "services" / name),
        stdout=logf,
        stderr=subprocess.STDOUT,
        env={**os.environ, "PORT": str(port)},
        start_new_session=True,
    )
    (PID_DIR / f"{name}.pid").write_text(str(p.pid))
    ok(f"{name} started on :{port} (pid {p.pid})")


@service_group.command("stop")
@click.argument("name", type=click.Choice(_service_names()))
def stop_one(name: str) -> None:
    """Stop one service."""
    pidfile = PID_DIR / f"{name}.pid"
    if not pidfile.exists():
        warn(f"{name} not tracked (no pidfile)")
        return
    try:
        pid = int(pidfile.read_text().strip())
    except ValueError:
        warn(f"{name} pidfile corrupt")
        pidfile.unlink(missing_ok=True)
        return
    try:
        os.kill(pid, signal.SIGTERM)
        time.sleep(1)
        try:
            os.kill(pid, 0)  # signal 0 = liveness check
        except ProcessLookupError:
            pass
        else:
            os.kill(pid, signal.SIGKILL)
        ok(f"{name} stopped (pid {pid})")
    except ProcessLookupError:
        warn(f"{name} not running (pid {pid} already gone)")
    pidfile.unlink(missing_ok=True)


@service_group.command("restart")
@click.argument("name", type=click.Choice(_service_names()))
@click.pass_context
def restart_one(ctx: click.Context, name: str) -> None:
    """Restart one service."""
    ctx.invoke(stop_one, name=name)
    time.sleep(1)
    ctx.invoke(start_one, name=name)


@service_group.command("kill")
@click.argument("name", type=click.Choice(_service_names()))
def kill_one(name: str) -> None:
    """Force-kill one service (SIGKILL, no graceful shutdown).

    Use when `stop` hangs. Skips the SIGTERM grace period entirely and
    also nukes any straggler on the service's port. Safe when a process
    is stuck; violates in-flight requests.
    """
    pidfile = PID_DIR / f"{name}.pid"
    pid: int | None = None
    if pidfile.exists():
        try:
            pid = int(pidfile.read_text().strip())
        except ValueError:
            pidfile.unlink(missing_ok=True)
    if pid is not None:
        try:
            os.kill(pid, signal.SIGKILL)
            ok(f"{name} killed (pid {pid})")
        except ProcessLookupError:
            warn(f"{name} not running (pid {pid} already gone)")
    else:
        warn(f"{name} not tracked (no pidfile)")
    pidfile.unlink(missing_ok=True)
    # Belt-and-suspenders: nuke anything still listening on the port
    port = SERVICE_MAP.get(name) if name in SERVICE_MAP else None
    if port is not None:
        subprocess.run(
            ["bash", "-c", f"lsof -ti :{port} | xargs kill -9 2>/dev/null || true"],
            check=False,
        )


@service_group.command("list")
def list_services() -> None:
    """List all services + their ports."""
    t = Table(title="Miamo services")
    t.add_column("Name")
    t.add_column("Port")
    for name, port in SERVICES:
        t.add_row(name, str(port))
    Console().print(t)
