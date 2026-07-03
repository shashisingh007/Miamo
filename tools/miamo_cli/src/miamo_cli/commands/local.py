"""Local mode — bare-metal Node services + Docker Postgres/Redis.

Ported from scripts/start.sh (local_start / local_stop / local_status_* / local_logs).
"""

from __future__ import annotations

import os
import signal
import subprocess
import time
from pathlib import Path

import click
import requests
from rich.panel import Panel
from rich.table import Table

from ..config import (
    GATEWAY_HEALTH,
    LOG_DIR,
    PID_DIR,
    POSTGRES_CANDIDATE_NAMES,
    POSTGRES_CANONICAL_NAME,
    POSTGRES_DB,
    POSTGRES_PASSWORD,
    POSTGRES_USER,
    POSTGRES_VOLUME,
    REDIS_CONTAINER,
    ROOT,
    SERVICES,
    WEB_PORT,
    WEB_URL,
)
from ..env import (
    clear_port,
    ensure_dirs,
    ensure_docker_daemon,
    export_local_defaults,
    has,
    load_env,
)
from ..shell import (
    banner_failure,
    banner_success,
    capture,
    console,
    die,
    err,
    hdr,
    note,
    ok,
    run,
    step,
    try_run,
    warn,
)


# ─── Docker infra helpers ────────────────────────────────────────────────────


def _container_running(name: str) -> bool:
    out = capture(["docker", "ps", "--format", "{{.Names}}"])
    return name in out.splitlines()


def _container_exists(name: str) -> bool:
    out = capture(["docker", "ps", "-a", "--format", "{{.Names}}"])
    return name in out.splitlines()


def _pick_postgres_container() -> str:
    """Prefer whichever Postgres container is already present; else canonical."""
    for name in POSTGRES_CANDIDATE_NAMES:
        if _container_running(name):
            return name
    for name in POSTGRES_CANDIDATE_NAMES:
        if _container_exists(name):
            return name
    return POSTGRES_CANONICAL_NAME


def _ensure_infra() -> None:
    """Start (or create) Postgres + Redis containers.

    First: guarantee the Docker daemon is up (auto-start Colima / Docker
    Desktop / systemd if needed). Then start or create the two containers
    against the persistent named volume so data survives across restarts.
    """
    ensure_docker_daemon()

    pg = _pick_postgres_container()
    pg_pw = os.environ.get("POSTGRES_PASSWORD", POSTGRES_PASSWORD)
    pg_user = os.environ.get("POSTGRES_USER", POSTGRES_USER)
    pg_db = os.environ.get("POSTGRES_DB", POSTGRES_DB)

    if _container_running(pg):
        note(f"Postgres already running ({pg})")
    elif _container_exists(pg):
        step(f"Starting existing Postgres container ({pg})…")
        if try_run(["docker", "start", pg]):
            ok("Postgres started")
        else:
            die(f"docker start {pg}", f"check: docker logs {pg}")
    else:
        step(f"Creating Postgres container ({pg})…")
        created = try_run(
            [
                "docker", "run", "-d", "--name", pg,
                "-e", f"POSTGRES_USER={pg_user}",
                "-e", f"POSTGRES_PASSWORD={pg_pw}",
                "-e", f"POSTGRES_DB={pg_db}",
                "-p", "5432:5432",
                "-v", f"{POSTGRES_VOLUME}:/var/lib/postgresql/data",
                "postgres:16-alpine",
            ]
        )
        if not created:
            die("docker run postgres", "port 5432 may be busy; check `lsof -i :5432`")
        ok("Postgres container created")

    if _container_running(REDIS_CONTAINER):
        note(f"Redis already running ({REDIS_CONTAINER})")
    elif _container_exists(REDIS_CONTAINER):
        step(f"Starting existing Redis container ({REDIS_CONTAINER})…")
        try_run(["docker", "start", REDIS_CONTAINER])
        ok("Redis started")
    else:
        step(f"Creating Redis container ({REDIS_CONTAINER})…")
        created = try_run(
            [
                "docker", "run", "-d", "--name", REDIS_CONTAINER,
                "-p", "6379:6379", "redis:7-alpine",
                "redis-server", "--appendonly", "yes",
                "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru",
            ]
        )
        if created:
            ok("Redis container created")
        else:
            warn("redis run failed (port 6379 busy?)")

    _wait_for_postgres(pg, timeout=30)


def _wait_for_postgres(container: str, timeout: int = 30) -> None:
    pg_user = os.environ.get("POSTGRES_USER", POSTGRES_USER)
    for elapsed in range(timeout):
        if try_run(
            ["docker", "exec", container, "pg_isready", "-U", pg_user], quiet=True
        ):
            ok("Postgres is accepting connections")
            return
        time.sleep(1)
        if elapsed and elapsed % 5 == 0:
            step(f"still waiting for Postgres ({elapsed}s/{timeout}s)")
    die("wait_for_postgres", f"docker logs {container}")


def _prisma_sync() -> None:
    shared = ROOT / "services" / "shared"
    if not shared.is_dir():
        warn("services/shared not found — skipping Prisma sync")
        return
    step("Prisma: generating client…")
    if try_run(["npx", "--yes", "prisma", "generate"], cwd=shared):
        ok("Prisma client generated")
    else:
        warn("prisma generate had warnings")
    step("Prisma: applying pending migrations (deploy)…")
    if try_run(["npx", "--yes", "prisma", "migrate", "deploy"], cwd=shared):
        ok("Prisma migrations applied")
    else:
        warn("prisma migrate deploy failed — DB may be up-to-date OR there's an error")


def _install_deps_if_stale() -> None:
    """`npm install` for repo root + services/web if node_modules missing."""
    if not (ROOT / "node_modules").is_dir():
        step("Root node_modules missing — running `npm install`…")
        try_run(["npm", "install", "--no-audit", "--no-fund"], cwd=ROOT, quiet=False)
    web = ROOT / "services" / "web"
    if web.is_dir() and not (web / "node_modules").is_dir():
        step("services/web node_modules missing — running `npm install`…")
        try_run(
            ["npm", "install", "--no-audit", "--no-fund"], cwd=web, quiet=False
        )


# ─── Service launch / stop ───────────────────────────────────────────────────


def _tsx_bin() -> str | None:
    p = ROOT / "node_modules" / ".bin" / "tsx"
    return str(p) if p.exists() else None


def _spawn_service(name: str, port: int) -> int:
    """Launch a backend service via tsx. Returns PID."""
    log_path = LOG_DIR / f"{name}.log"
    tsx = _tsx_bin()
    server_ts = f"services/{name}/src/server.ts"
    if tsx:
        argv = [tsx, server_ts]
    else:
        argv = ["npx", "--yes", "tsx", server_ts]
    env = os.environ.copy()
    env["PORT"] = str(port)
    with open(log_path, "wb") as logf:
        proc = subprocess.Popen(
            argv,
            cwd=str(ROOT),
            env=env,
            stdout=logf,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            start_new_session=True,
        )
    (PID_DIR / f"{name}.pid").write_text(str(proc.pid))
    return proc.pid


def _spawn_web() -> int | None:
    web = ROOT / "services" / "web"
    if not web.is_dir():
        warn("services/web not found — skipping frontend")
        return None
    log_path = LOG_DIR / "web.log"
    env = os.environ.copy()
    with open(log_path, "wb") as logf:
        proc = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=str(web),
            env=env,
            stdout=logf,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            start_new_session=True,
        )
    (PID_DIR / "web.pid").write_text(str(proc.pid))
    return proc.pid


def _kill_pid(pid: int) -> None:
    try:
        os.kill(pid, signal.SIGTERM)
    except (ProcessLookupError, PermissionError):
        pass


def _pid_from_file(name: str) -> int | None:
    f = PID_DIR / f"{name}.pid"
    if not f.exists():
        return None
    try:
        return int(f.read_text().strip())
    except ValueError:
        return None


def _pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except (ProcessLookupError, PermissionError):
        return False


def _wait_for_gateway(timeout: int = 30) -> bool:
    step(f"Polling {GATEWAY_HEALTH} (up to {timeout}s)…")
    for elapsed in range(timeout):
        try:
            r = requests.get(GATEWAY_HEALTH, timeout=2)
            if r.status_code == 200:
                ok(f"Gateway healthy on :3200 (after {elapsed}s)")
                return True
        except requests.RequestException:
            pass
        time.sleep(1)
    warn(f"Gateway did not respond within {timeout}s")
    warn(f"  inspect: tail -50 {LOG_DIR}/gateway.log")
    return False


def _wait_for_web(timeout: int = 60) -> bool:
    step(f"Waiting for web on :{WEB_PORT} (Next.js needs ~15s first time)…")
    elapsed = 0
    while elapsed < timeout:
        try:
            r = requests.get(WEB_URL, timeout=2)
            if r.status_code in (200, 302, 307, 404):
                ok(f"Web ready on :{WEB_PORT} (after {elapsed}s)")
                return True
        except requests.RequestException:
            pass
        time.sleep(2)
        elapsed += 2
    warn(f"Web didn't respond on :{WEB_PORT} in {timeout}s — check {LOG_DIR}/web.log")
    return False


def _health(port: int) -> tuple[bool, str]:
    """(ok, status_string). Uses /health for backends, / for web."""
    url = f"http://localhost:{port}/health"
    try:
        r = requests.get(url, timeout=3)
        return (r.status_code == 200, f"HTTP {r.status_code}")
    except requests.RequestException:
        return (False, "DOWN")


def _uptime_for(pid: int) -> str:
    r = subprocess.run(
        ["ps", "-o", "etime=", "-p", str(pid)], capture_output=True, text=True
    )
    return (r.stdout or "").strip() or "?"


# ─── Click commands ──────────────────────────────────────────────────────────


def _filter_services(only: tuple[str, ...]) -> list[tuple[str, int]]:
    if not only:
        return SERVICES
    allowed = set(only)
    return [(n, p) for (n, p) in SERVICES if n in allowed]


@click.command()
@click.option("--skip-deps", is_flag=True, help="Skip npm install even if deps look stale")
@click.option("--skip-prisma", is_flag=True, help="Skip prisma generate + migrate deploy")
@click.option(
    "--only",
    multiple=True,
    help="Start only specific services (e.g. --only gateway --only auth)",
)
def start(skip_deps: bool, skip_prisma: bool, only: tuple[str, ...]) -> None:
    """Start Miamo locally: 7 backend services + web + Docker Postgres/Redis."""
    try:
        console.print()
        console.print("[magenta]═" * 46 + "[/magenta]")
        console.print("[magenta]  Miamo — Local Dev[/magenta]")
        console.print("[magenta]═" * 46 + "[/magenta]")
        console.print()

        ensure_dirs()
        load_env()
        export_local_defaults()
        _ensure_infra()
        if not skip_deps:
            _install_deps_if_stale()
        if not skip_prisma:
            _prisma_sync()

        selected = _filter_services(only)

        hdr("Clearing service ports")
        for _, port in selected:
            clear_port(port)
        if not only:
            clear_port(WEB_PORT)
        time.sleep(1)

        hdr("Starting application services")
        for name, port in selected:
            pid = _spawn_service(name, port)
            ok(f"Started {name:<15} :{port}  (PID {pid})")

        if not only:
            hdr("Starting web (Next.js)")
            wpid = _spawn_web()
            if wpid is not None:
                ok(f"Started {'web':<15} :{WEB_PORT}  (PID {wpid})")

        console.print()
        step("Waiting 10s for backend bootup…")
        time.sleep(10)
        _wait_for_gateway(30)
        if not only:
            _wait_for_web(60)

        console.print()
        _print_status_table()

        # Readiness gate — same rule as start.sh: healthy >= 7 of 8.
        healthy = 0
        total = len(selected) + (1 if not only else 0)
        for _, port in selected:
            good, _ = _health(port)
            if good:
                healthy += 1
        if not only:
            try:
                r = requests.get(WEB_URL, timeout=3)
                if r.status_code in (200, 302, 307, 404):
                    healthy += 1
            except requests.RequestException:
                pass

        if healthy >= max(1, total - 1):
            banner_success("local")
        else:
            banner_failure("local", healthy, total)
            raise SystemExit(1)

    except KeyboardInterrupt:
        console.print()
        warn("Interrupted — services may be partially started; run `miamo stop`.")
        raise SystemExit(130)


@click.command()
@click.option("--only", multiple=True, help="Stop only specific services")
def stop(only: tuple[str, ...]) -> None:
    """Stop all local services (Postgres/Redis containers stay running)."""
    try:
        hdr("Stopping local services")
        selected = _filter_services(only)
        for name, port in selected:
            pid = _pid_from_file(name)
            if pid and _pid_alive(pid):
                _kill_pid(pid)
                err(f"{name} stopped (PID {pid})")
            (PID_DIR / f"{name}.pid").unlink(missing_ok=True)
            clear_port(port)
        if not only:
            wpid = _pid_from_file("web")
            if wpid and _pid_alive(wpid):
                _kill_pid(wpid)
                err(f"web stopped (PID {wpid})")
            (PID_DIR / "web.pid").unlink(missing_ok=True)
            clear_port(WEB_PORT)
            # Belt-and-suspenders: sweep tsx/next child processes.
            if has("pkill"):
                for pat in (
                    r"tsx.*services/.*server\.ts",
                    "npm exec tsx",
                    f"next dev -p {WEB_PORT}",
                ):
                    subprocess.run(["pkill", "-f", pat], check=False)
        ok("All local services stopped")
    except KeyboardInterrupt:
        raise SystemExit(130)


@click.command()
@click.pass_context
def restart(ctx: click.Context) -> None:
    """Full stop + start cycle."""
    try:
        ctx.invoke(stop, only=())
        time.sleep(2)
        ctx.invoke(start, skip_deps=False, skip_prisma=False, only=())
    except KeyboardInterrupt:
        raise SystemExit(130)


def _print_status_table() -> None:
    table = Table(title="Miamo Service Status (local)", show_lines=False)
    table.add_column("Service", style="cyan", no_wrap=True)
    table.add_column("Port", justify="right")
    table.add_column("PID", justify="right")
    table.add_column("Health")
    table.add_column("Uptime")

    for name, port in SERVICES:
        pid = _pid_from_file(name)
        pid_str = str(pid) if pid else "-"
        good, code = _health(port)
        health_cell = f"[green]OK[/green]" if good else f"[red]{code}[/red]"
        uptime = _uptime_for(pid) if pid and _pid_alive(pid) else "-"
        table.add_row(name, str(port), pid_str, health_cell, uptime)

    # Web row
    wpid = _pid_from_file("web")
    wpid_str = str(wpid) if wpid else "-"
    try:
        r = requests.get(WEB_URL, timeout=3)
        web_ok = r.status_code in (200, 302, 307, 404)
        web_code = f"HTTP {r.status_code}"
    except requests.RequestException:
        web_ok, web_code = False, "DOWN"
    web_cell = f"[green]OK[/green]" if web_ok else f"[red]{web_code}[/red]"
    web_uptime = _uptime_for(wpid) if wpid and _pid_alive(wpid) else "-"
    table.add_row("web", str(WEB_PORT), wpid_str, web_cell, web_uptime)

    console.print(table)


@click.command()
def status() -> None:
    """Rich table showing service | port | pid | health | uptime."""
    try:
        _print_status_table()
    except KeyboardInterrupt:
        raise SystemExit(130)


@click.command()
@click.argument("service", required=False)
@click.option("-n", "--lines", default=50, show_default=True, help="How many tail lines")
@click.option("-f", "--follow", is_flag=True, help="tail -f")
def logs(service: str | None, lines: int, follow: bool) -> None:
    """Tail logs for a service (or a mini-panel per service if none given)."""
    try:
        if service:
            log_path = LOG_DIR / f"{service}.log"
            if not log_path.exists():
                die(
                    f"local logs {service}",
                    f"no log file at {log_path} — is the service running?",
                )
            argv = ["tail"]
            if follow:
                argv += ["-f"]
            argv += ["-n", str(lines), str(log_path)]
            try:
                subprocess.run(argv, check=False)
            except KeyboardInterrupt:
                pass
            return

        # No service given — print last 20 lines of each in a panel.
        for name, _ in SERVICES + [("web", WEB_PORT)]:
            log_path = LOG_DIR / f"{name}.log"
            if not log_path.exists():
                continue
            try:
                r = subprocess.run(
                    ["tail", "-n", "20", str(log_path)],
                    capture_output=True,
                    text=True,
                    check=False,
                )
                content = r.stdout or "(empty)"
            except FileNotFoundError:
                content = log_path.read_text(errors="replace")[-2000:]
            console.print(Panel(content, title=f"{name}.log (last 20)", expand=False))
    except KeyboardInterrupt:
        raise SystemExit(130)


# ─── `miamo local` sub-group ────────────────────────────────────────────────


@click.group(name="local")
def local_group() -> None:
    """Local mode — bare-metal Node + Docker Postgres/Redis."""


# Register the same commands under `miamo local ...` and add `dev` alias.
local_group.add_command(start)
local_group.add_command(stop)
local_group.add_command(restart)
local_group.add_command(status)
local_group.add_command(logs)
local_group.add_command(start, name="dev")  # `miamo local dev` == `miamo local start`
