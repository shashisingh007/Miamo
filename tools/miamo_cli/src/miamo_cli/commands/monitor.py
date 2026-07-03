"""Resource monitoring + troubleshooting commands.

Every command supports a `-n <window>` flag with human-friendly syntax:
    -n 30s    30 seconds
    -n 5m     5 minutes
    -n 1h     1 hour
    -n 5      bare number = minutes

Sampling model — hybrid:
    * Windows ≤ 60s: foreground live sampling (blocks, then prints).
    * Windows > 60s: auto-launch a tiny background collector at
      /tmp/miamo-metrics/collector.pid that writes 1Hz samples to
      /tmp/miamo-metrics/samples.jsonl. `miamo top -n 5m` reads back the
      trailing 5 minutes from that file. The daemon self-exits after 10
      minutes idle (no reader recently) to avoid leaks.

Data sources:
    * Local services (via pidfiles in /tmp/miamo-pids/): psutil.Process → cpu%, rss, create_time
    * Docker containers: `docker stats --no-stream --format json`
    * Active users: SELECT COUNT(DISTINCT userId) FROM "Session" WHERE lastActiveAt > NOW() - INTERVAL 'N min' AND revoked = false
    * Recent activity: SELECT ... FROM "UserActivity" WHERE createdAt > NOW() - INTERVAL 'N min'
"""

from __future__ import annotations

import json
import os
import re
import signal
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import mean
from typing import Any

import click
from rich.console import Console
from rich.live import Live
from rich.table import Table

from ..config import PID_DIR, POSTGRES_CANDIDATE_NAMES, REDIS_CONTAINER, SERVICES
from ..shell import die, note, ok, step, warn

METRICS_DIR = Path("/tmp/miamo-metrics")
SAMPLES_FILE = METRICS_DIR / "samples.jsonl"
COLLECTOR_PID = METRICS_DIR / "collector.pid"
COLLECTOR_HEARTBEAT = METRICS_DIR / "reader.heartbeat"

DAEMON_IDLE_TIMEOUT = 600  # daemon exits after 10min with no reader heartbeat
SAMPLE_INTERVAL = 1.0  # 1 sample/sec — cheap enough

console = Console()


# ─── Window parsing ─────────────────────────────────────────────────────────

_WINDOW_RE = re.compile(r"^\s*(\d+)\s*([smh]?)\s*$", re.I)


def parse_window(spec: str) -> int:
    """Parse '5m', '60s', '1h', or bare number (minutes) → seconds."""
    m = _WINDOW_RE.match(spec)
    if not m:
        raise click.BadParameter(f"bad window: {spec!r} (try 30s, 5m, 1h)")
    n = int(m.group(1))
    unit = (m.group(2) or "m").lower()
    return n * {"s": 1, "m": 60, "h": 3600}[unit]


def _fmt_bytes(n: int | float) -> str:
    """Human-friendly byte formatter."""
    n = float(n)
    for unit in ["B", "KB", "MB", "GB"]:
        if n < 1024 or unit == "GB":
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def _fmt_duration(seconds: float) -> str:
    seconds = int(seconds)
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m{seconds % 60}s"
    h, rem = divmod(seconds, 3600)
    m = rem // 60
    return f"{h}h{m}m"


# ─── Live sampling (no daemon needed) ───────────────────────────────────────


def _read_pid(name: str) -> int | None:
    p = PID_DIR / f"{name}.pid"
    if not p.exists():
        return None
    try:
        return int(p.read_text().strip())
    except (ValueError, OSError):
        return None


def _sample_service(name: str, port: int, proc_cache: dict) -> dict[str, Any]:
    """One sample of one service. Returns dict with cpu, rss, uptime, pid."""
    try:
        import psutil  # local import — psutil isn't always installed
    except ImportError:
        die("psutil not installed", "run: pipx install --force -e tools/miamo_cli")

    pid = _read_pid(name)
    if pid is None:
        return {"name": name, "port": port, "pid": None, "cpu": None, "rss": 0, "uptime": 0, "status": "stopped"}

    if pid not in proc_cache:
        try:
            proc_cache[pid] = psutil.Process(pid)
            # Prime cpu_percent — first call always returns 0
            proc_cache[pid].cpu_percent(interval=None)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return {"name": name, "port": port, "pid": pid, "cpu": None, "rss": 0, "uptime": 0, "status": "dead"}

    proc = proc_cache[pid]
    try:
        with proc.oneshot():
            cpu = proc.cpu_percent(interval=None)  # % since last call
            rss = proc.memory_info().rss
            uptime = time.time() - proc.create_time()
            # Count children too (Node forks tsx worker etc.)
            for child in proc.children(recursive=True):
                try:
                    rss += child.memory_info().rss
                    cpu += child.cpu_percent(interval=None)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        return {"name": name, "port": port, "pid": pid, "cpu": cpu, "rss": rss, "uptime": uptime, "status": "up"}
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        return {"name": name, "port": port, "pid": pid, "cpu": None, "rss": 0, "uptime": 0, "status": "dead"}


def _docker_stats() -> dict[str, dict[str, Any]]:
    """Point-in-time stats for every miamo docker container."""
    try:
        r = subprocess.run(
            ["docker", "stats", "--no-stream", "--format",
             "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}"],
            capture_output=True, text=True, timeout=5,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return {}
    out: dict[str, dict[str, Any]] = {}
    for line in r.stdout.strip().splitlines():
        parts = line.split("|")
        if len(parts) != 4:
            continue
        name, cpu, mem, mem_pct = parts
        if not name.startswith("miamo-"):
            continue
        # Parse "123.4MiB / 7.9GiB"
        used_str = mem.split(" / ")[0].strip()
        cpu_f = float(cpu.rstrip("% ") or 0)
        out[name] = {"cpu": cpu_f, "mem": used_str, "mem_pct": float(mem_pct.rstrip("% ") or 0)}
    return out


def _collect_snapshot(proc_cache: dict[int, Any]) -> list[dict[str, Any]]:
    """One full snapshot — every local service + every docker container.

    `proc_cache` must be reused across calls so `psutil.Process.cpu_percent`
    can compute a real delta (its first call always returns 0.0).
    """
    rows = [_sample_service(name, port, proc_cache) for name, port in SERVICES]
    # Include web (port 3100, tracked in PID_DIR/web.pid)
    rows.append(_sample_service("web", 3100, proc_cache))
    ts = time.time()
    for r in rows:
        r["ts"] = ts
    return rows


def _live_sample(window_sec: int, sample_hz: float = 1.0) -> list[list[dict]]:
    """Foreground: sample every 1/hz seconds for window_sec. Returns list of snapshots."""
    interval = 1.0 / sample_hz
    n = max(1, int(window_sec / interval))
    all_snapshots: list[list[dict]] = []
    # `proc_cache` is shared across snapshots so cpu_percent computes a real
    # delta against the previous sample instead of always returning 0.
    proc_cache: dict[int, Any] = {}
    with console.status(f"[cyan]sampling for {window_sec}s ({n} snapshots)…[/cyan]") as _:
        # Prime cpu_percent — first call per process returns 0. Discard.
        _collect_snapshot(proc_cache)
        time.sleep(interval)
        for _ in range(n):
            snap = _collect_snapshot(proc_cache)
            all_snapshots.append(snap)
            time.sleep(interval)
    return all_snapshots


def _average_snapshots(snapshots: list[list[dict]]) -> list[dict]:
    """Average cpu% across the snapshots; take last rss/uptime as representative."""
    by_name: dict[str, list[dict]] = {}
    for snap in snapshots:
        for r in snap:
            by_name.setdefault(r["name"], []).append(r)
    out = []
    for name, rows in by_name.items():
        alive = [r for r in rows if r["cpu"] is not None]
        latest = rows[-1]
        cpu_avg = mean([r["cpu"] for r in alive]) if alive else None
        cpu_max = max([r["cpu"] for r in alive]) if alive else None
        out.append({
            "name": name,
            "port": latest["port"],
            "pid": latest["pid"],
            "status": latest["status"],
            "cpu_avg": cpu_avg,
            "cpu_max": cpu_max,
            "rss": latest["rss"],
            "uptime": latest["uptime"],
            "n": len(alive),
        })
    return out


# ─── Rendering ──────────────────────────────────────────────────────────────


def _render_resource_table(rows: list[dict], window_sec: int, title: str = "Resource usage") -> Table:
    t = Table(title=f"{title} — avg of {window_sec}s window")
    t.add_column("Service", style="cyan")
    t.add_column("Port")
    t.add_column("PID")
    t.add_column("Status")
    t.add_column("CPU avg", justify="right")
    t.add_column("CPU peak", justify="right")
    t.add_column("RSS", justify="right")
    t.add_column("Uptime", justify="right")

    for r in sorted(rows, key=lambda x: x["port"]):
        status = r["status"]
        status_str = {
            "up": "[green]up[/green]",
            "stopped": "[dim]stopped[/dim]",
            "dead": "[red]dead[/red]",
        }.get(status, status)
        cpu_avg = f"{r['cpu_avg']:.1f}%" if r["cpu_avg"] is not None else "—"
        cpu_max = f"{r['cpu_max']:.1f}%" if r["cpu_max"] is not None else "—"
        rss = _fmt_bytes(r["rss"]) if r["rss"] else "—"
        uptime = _fmt_duration(r["uptime"]) if r["uptime"] else "—"
        t.add_row(
            r["name"], str(r["port"]), str(r["pid"] or "—"),
            status_str, cpu_avg, cpu_max, rss, uptime,
        )
    return t


def _render_docker_table(stats: dict[str, dict]) -> Table:
    t = Table(title="Docker containers (point-in-time)")
    t.add_column("Container", style="cyan")
    t.add_column("CPU", justify="right")
    t.add_column("Memory", justify="right")
    t.add_column("Mem %", justify="right")
    for name in sorted(stats):
        s = stats[name]
        t.add_row(name, f"{s['cpu']:.1f}%", s["mem"], f"{s['mem_pct']:.1f}%")
    return t


# ─── Postgres helpers (for users-live + activity) ──────────────────────────


def _pg_container() -> str | None:
    out = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True,
    ).stdout.splitlines()
    for name in POSTGRES_CANDIDATE_NAMES:
        if name in out:
            return name
    return None


def _psql_json(query: str) -> list[dict]:
    container = _pg_container()
    if not container:
        return []
    wrapped = f"SELECT json_agg(row_to_json(t)) FROM ({query}) t;"
    r = subprocess.run(
        ["docker", "exec", container, "psql", "-U", "miamo", "-d", "miamo",
         "-A", "-t", "-c", wrapped],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        return []
    raw = r.stdout.strip()
    if not raw:
        return []
    try:
        return json.loads(raw) or []
    except json.JSONDecodeError:
        return []


# ─── Commands ───────────────────────────────────────────────────────────────


@click.command()
@click.option("-n", "--window", default="30s", help="Time window: 30s, 5m, 1h, or bare number (minutes)")
@click.option("--watch", is_flag=True, help="Refresh continuously (Ctrl+C to exit)")
@click.option("--json", "json_out", is_flag=True, help="Emit JSON")
def top(window: str, watch: bool, json_out: bool) -> None:
    """Per-service CPU + memory + uptime, averaged over a time window.

    \b
    Examples:
      miamo top -n 30s       # 30-second window
      miamo top -n 5m        # 5-minute window
      miamo top -n 5         # 5 minutes (bare number = minutes)
      miamo top --watch      # live refresh (Ctrl+C to exit)
    """
    window_sec = parse_window(window)

    def one_pass():
        snapshots = _live_sample(window_sec)
        return _average_snapshots(snapshots)

    if json_out:
        rows = one_pass()
        docker_rows = _docker_stats()
        print(json.dumps({"services": rows, "docker": docker_rows, "window_sec": window_sec}, indent=2))
        return

    if watch:
        try:
            while True:
                console.clear()
                rows = one_pass()
                console.print(_render_resource_table(rows, window_sec))
                docker = _docker_stats()
                if docker:
                    console.print(_render_docker_table(docker))
        except KeyboardInterrupt:
            sys.exit(0)
        return

    rows = one_pass()
    console.print(_render_resource_table(rows, window_sec))
    docker = _docker_stats()
    if docker:
        console.print(_render_docker_table(docker))


@click.command()
@click.option("-n", "--window", default="30s")
def mem(window: str) -> None:
    """Memory-only view (RSS) — like `top` but only the memory column."""
    window_sec = parse_window(window)
    rows = _average_snapshots(_live_sample(window_sec))
    t = Table(title=f"Memory (RSS) — window {window_sec}s")
    t.add_column("Service", style="cyan"); t.add_column("PID")
    t.add_column("RSS", justify="right"); t.add_column("Status")
    total = 0
    for r in sorted(rows, key=lambda x: -x["rss"]):
        total += r["rss"] or 0
        rss = _fmt_bytes(r["rss"]) if r["rss"] else "—"
        t.add_row(r["name"], str(r["pid"] or "—"), rss, r["status"])
    t.add_row("[bold]TOTAL[/bold]", "", f"[bold]{_fmt_bytes(total)}[/bold]", "")
    console.print(t)
    # Also show docker
    docker = _docker_stats()
    if docker:
        console.print(_render_docker_table(docker))


@click.command()
@click.option("-n", "--window", default="30s")
def cpu(window: str) -> None:
    """CPU-only view — average + peak over the window."""
    window_sec = parse_window(window)
    rows = _average_snapshots(_live_sample(window_sec))
    t = Table(title=f"CPU — window {window_sec}s")
    t.add_column("Service", style="cyan"); t.add_column("PID")
    t.add_column("CPU avg", justify="right"); t.add_column("CPU peak", justify="right")
    t.add_column("Samples", justify="right")
    for r in sorted(rows, key=lambda x: -(x["cpu_avg"] or 0)):
        cpu_avg = f"{r['cpu_avg']:.1f}%" if r["cpu_avg"] is not None else "—"
        cpu_max = f"{r['cpu_max']:.1f}%" if r["cpu_max"] is not None else "—"
        t.add_row(r["name"], str(r["pid"] or "—"), cpu_avg, cpu_max, str(r["n"]))
    console.print(t)


@click.command()
def uptime() -> None:
    """How long each service has been running (from pidfile / process start time)."""
    try:
        import psutil
    except ImportError:
        die("psutil not installed")

    t = Table(title="Miamo uptime")
    t.add_column("Service", style="cyan"); t.add_column("PID")
    t.add_column("Started"); t.add_column("Uptime", justify="right")
    for name, _ in SERVICES + [("web", 3100)]:
        pid = _read_pid(name)
        if not pid:
            t.add_row(name, "—", "—", "[dim]stopped[/dim]")
            continue
        try:
            proc = psutil.Process(pid)
            created = datetime.fromtimestamp(proc.create_time())
            up = _fmt_duration(time.time() - proc.create_time())
            t.add_row(name, str(pid), created.strftime("%Y-%m-%d %H:%M:%S"), up)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            t.add_row(name, str(pid), "—", "[red]dead[/red]")
    console.print(t)


@click.command("users-live")
@click.option("-n", "--window", default="5m", help="Active-window (default 5m)")
def users_live(window: str) -> None:
    """How many unique users have been active in the last N minutes."""
    window_sec = parse_window(window)
    minutes = window_sec / 60.0
    # Use fractional-minute interval so `-n 30s` also works
    interval_sql = f"'{window_sec} seconds'::interval"

    rows = _psql_json(f'''
        SELECT
          COUNT(DISTINCT "userId") AS unique_users,
          COUNT(*) AS active_sessions
        FROM "Session"
        WHERE "lastActiveAt" > NOW() - {interval_sql}
          AND revoked = false
    ''')
    stats = rows[0] if rows else {"unique_users": 0, "active_sessions": 0}

    # Top-active users
    top_rows = _psql_json(f'''
        SELECT
          s."userId" AS user_id,
          u.username,
          u."displayName" AS display,
          MAX(s."lastActiveAt")::text AS last_active,
          COUNT(s.id) AS session_count
        FROM "Session" s
        JOIN "User" u ON u.id = s."userId"
        WHERE s."lastActiveAt" > NOW() - {interval_sql}
          AND s.revoked = false
        GROUP BY s."userId", u.username, u."displayName"
        ORDER BY MAX(s."lastActiveAt") DESC
        LIMIT 20
    ''')

    # Header table
    h = Table(title=f"Active users — last {_fmt_duration(window_sec)}")
    h.add_column("Metric", style="cyan"); h.add_column("Value", justify="right")
    h.add_row("Window", _fmt_duration(window_sec))
    h.add_row("Unique users", str(stats.get("unique_users") or 0))
    h.add_row("Active sessions", str(stats.get("active_sessions") or 0))
    console.print(h)

    if not top_rows:
        note("no active sessions in this window")
        return

    t = Table(title="Recently-active users")
    for col in ("username", "displayName", "last_active", "sessions"):
        t.add_column(col)
    for r in top_rows:
        t.add_row(
            r.get("username") or "?",
            r.get("display") or "",
            (r.get("last_active") or "")[:19],
            str(r.get("session_count") or 0),
        )
    console.print(t)


@click.command()
@click.option("-n", "--window", default="5m")
@click.option("--action", help="Filter by action (e.g. view, like, pass, match)")
@click.option("--limit", type=int, default=100)
def activity(window: str, action: str | None, limit: int) -> None:
    """Recent user activity events — view/like/pass/match/message counts by action."""
    window_sec = parse_window(window)
    interval_sql = f"'{window_sec} seconds'::interval"
    where = [f'"createdAt" > NOW() - {interval_sql}']
    if action:
        safe = action.replace("'", "''")
        where.append(f"action = '{safe}'")
    where_sql = " AND ".join(where)

    # Summary by action
    summary = _psql_json(f'''
        SELECT action, COUNT(*) AS n
        FROM "UserActivity"
        WHERE {where_sql}
        GROUP BY action
        ORDER BY n DESC
    ''')
    total = sum(r["n"] for r in summary)

    st = Table(title=f"Activity summary — last {_fmt_duration(window_sec)}")
    st.add_column("Action", style="cyan"); st.add_column("Events", justify="right"); st.add_column("% of total", justify="right")
    for r in summary:
        pct = 100.0 * r["n"] / total if total else 0
        st.add_row(r["action"], str(r["n"]), f"{pct:.1f}%")
    st.add_row("[bold]TOTAL[/bold]", f"[bold]{total}[/bold]", "")
    console.print(st)

    # Recent event tail
    recent = _psql_json(f'''
        SELECT
          a."createdAt"::text AS ts,
          a.action,
          a."targetType",
          a."durationMs",
          u.username
        FROM "UserActivity" a
        LEFT JOIN "User" u ON u.id = a."userId"
        WHERE {where_sql}
        ORDER BY a."createdAt" DESC
        LIMIT {int(limit)}
    ''')
    if not recent:
        return
    t = Table(title=f"Recent events (last {len(recent)})")
    for col in ("time", "user", "action", "target", "dwell"):
        t.add_column(col)
    for r in recent:
        dwell = f"{r['durationMs']}ms" if r.get("durationMs") else ""
        t.add_row(
            (r.get("ts") or "")[11:19],
            (r.get("username") or "?")[:20],
            r.get("action") or "",
            r.get("targetType") or "",
            dwell,
        )
    console.print(t)


@click.command()
@click.option("-n", "--window", default="1m", help="Resource window (default 1m)")
def diagnose(window: str) -> None:
    """Full troubleshooting sweep — health, resources, active users, DB, disk, recent errors."""
    window_sec = parse_window(window)

    # 1. Service health
    from .health import health as health_cmd  # avoid cycle
    console.rule("[bold cyan]1. Service health[/bold cyan]")
    try:
        health_cmd.callback(json_out=False, watch=False)
    except Exception as e:
        warn(f"health probe failed: {e}")

    # 2. Resource usage
    console.rule("[bold cyan]2. Resources[/bold cyan]")
    rows = _average_snapshots(_live_sample(min(window_sec, 30)))  # cap at 30s here
    console.print(_render_resource_table(rows, min(window_sec, 30)))
    docker = _docker_stats()
    if docker:
        console.print(_render_docker_table(docker))

    # 3. Active users
    console.rule("[bold cyan]3. Active users (last 5m)[/bold cyan]")
    users_live.callback(window="5m")

    # 4. Database size
    console.rule("[bold cyan]4. Database size[/bold cyan]")
    db_rows = _psql_json('''
        SELECT
          pg_size_pretty(pg_database_size('miamo')) AS db_size,
          (SELECT COUNT(*) FROM "User") AS users,
          (SELECT COUNT(*) FROM "Match") AS matches,
          (SELECT COUNT(*) FROM "Message") AS messages
    ''')
    if db_rows:
        d = db_rows[0]
        t = Table(show_header=False)
        t.add_column(style="cyan"); t.add_column()
        t.add_row("Database size", d.get("db_size", "?"))
        t.add_row("Users", str(d.get("users", 0)))
        t.add_row("Matches", str(d.get("matches", 0)))
        t.add_row("Messages", str(d.get("messages", 0)))
        console.print(t)

    # 5. Disk usage of log dirs
    console.rule("[bold cyan]5. Disk (logs + backups)[/bold cyan]")
    for path in ["/tmp/miamo-logs", "/tmp/miamo-backups", "/tmp/miamo-metrics"]:
        p = Path(path)
        if not p.exists():
            note(f"{path}: does not exist")
            continue
        total = sum(f.stat().st_size for f in p.rglob("*") if f.is_file())
        console.print(f"  [cyan]{path}[/cyan]: {_fmt_bytes(total)}")

    # 6. Recent errors in logs
    console.rule("[bold cyan]6. Recent errors in logs (last 20 lines)[/bold cyan]")
    log_dir = Path("/tmp/miamo-logs")
    if log_dir.exists():
        error_lines = []
        for logf in log_dir.glob("*.log"):
            try:
                lines = logf.read_text(errors="ignore").splitlines()[-500:]
                for line in lines:
                    if re.search(r"error|fail|exception|traceback", line, re.I) and "info" not in line.lower():
                        error_lines.append((logf.stem, line[:200]))
            except OSError:
                pass
        if error_lines:
            for svc, line in error_lines[-20:]:
                console.print(f"  [red]{svc}:[/red] {line}")
        else:
            ok("no recent errors in logs")

    console.rule("[bold green]Diagnosis complete[/bold green]")


@click.command()
@click.argument("service", required=False)
@click.option("--errors", is_flag=True, help="Only show error/warn lines")
@click.option("-n", "--lines", default=100)
def tail(service: str | None, errors: bool, lines: int) -> None:
    """Smart log tail — highlights errors, follows across services if no name given.

    \b
    Examples:
      miamo tail gateway            # last 100 lines from gateway
      miamo tail gateway --errors   # only errors from gateway
      miamo tail --errors           # errors from every service
    """
    log_dir = Path("/tmp/miamo-logs")
    if not log_dir.exists():
        die("no logs at /tmp/miamo-logs", "run `miamo start` first")

    if service:
        files = [log_dir / f"{service}.log"]
        if not files[0].exists():
            die(f"no log for service '{service}'", f"expected {files[0]}")
    else:
        files = sorted(log_dir.glob("*.log"))

    for f in files:
        console.rule(f"[cyan]{f.stem}[/cyan]")
        try:
            all_lines = f.read_text(errors="ignore").splitlines()[-lines:]
        except OSError as e:
            warn(f"could not read {f}: {e}")
            continue
        for line in all_lines:
            is_err = re.search(r"error|fail|exception|traceback", line, re.I)
            if errors and not is_err:
                continue
            if is_err:
                console.print(f"[red]{line}[/red]")
            elif re.search(r"warn", line, re.I):
                console.print(f"[yellow]{line}[/yellow]")
            else:
                console.print(line)
