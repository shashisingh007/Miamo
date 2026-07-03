"""Basic developer conveniences: test, typecheck, env, open, shells."""

from __future__ import annotations

import os
import subprocess
import sys
import webbrowser
from pathlib import Path

import click

from ..config import GATEWAY_URL, POSTGRES_CANDIDATE_NAMES, REDIS_CONTAINER, ROOT, WEB_URL
from ..shell import die, note, ok, step


def _find_pg_container() -> str | None:
    out = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}"],
        capture_output=True,
        text=True,
    ).stdout.splitlines()
    for name in POSTGRES_CANDIDATE_NAMES:
        if name in out:
            return name
    return None


# ─── miamo test ─────────────────────────────────────────────────────────────
@click.command()
@click.option("--full", is_flag=True, help="Run the full test suite (vitest, not vitest fast)")
@click.option("--mobile", is_flag=True, help="Run the mobile jest suite instead of web")
def test(full: bool, mobile: bool) -> None:
    """Run the test suite.

    Defaults to the fast web suite (`npm test`, ~5s). Use `--full` for the
    complete suite, `--mobile` for the Expo jest suite.
    """
    if mobile:
        d = ROOT / "mobile"
        if not d.exists():
            die("mobile/ dir not found")
        step("running mobile test suite")
        try:
            subprocess.run(["npm", "test"], cwd=d, check=True)
        except subprocess.CalledProcessError as e:
            sys.exit(e.returncode)
        except KeyboardInterrupt:
            sys.exit(130)
        return
    cmd = ["npm", "run", "test:full"] if full else ["npm", "test"]
    step(f"running: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, cwd=ROOT, check=True)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)
    except KeyboardInterrupt:
        sys.exit(130)


# ─── miamo typecheck ────────────────────────────────────────────────────────
@click.command()
@click.option("--mobile", is_flag=True, help="Typecheck mobile/ instead of the web workspace")
def typecheck(mobile: bool) -> None:
    """Run TypeScript typecheck across the workspace (11/11 packages)."""
    if mobile:
        d = ROOT / "mobile"
        step("mobile: npx tsc --noEmit")
        try:
            subprocess.run(["npx", "tsc", "--noEmit"], cwd=d, check=True)
        except subprocess.CalledProcessError as e:
            sys.exit(e.returncode)
        return
    step("web + services: npm run typecheck")
    try:
        subprocess.run(["npm", "run", "typecheck"], cwd=ROOT, check=True)
    except subprocess.CalledProcessError as e:
        sys.exit(e.returncode)


# ─── miamo env ──────────────────────────────────────────────────────────────
@click.command()
@click.option("--show-secrets", is_flag=True, help="Reveal secret values (default: redacted)")
def env(show_secrets: bool) -> None:
    """Show which variables are set in .env (secrets redacted by default)."""
    env_path = ROOT / ".env"
    if not env_path.exists():
        die(".env not found", f"expected at {env_path}")
    from rich.console import Console
    from rich.table import Table

    SECRET_KEYS = {
        "JWT_SECRET",
        "INTERNAL_SERVICE_KEY",
        "ENCRYPTION_KEY",
        "TRACKING_HASH_SECRET",
        "POSTGRES_PASSWORD",
        "REDIS_PASSWORD",
        "RESEND_API_KEY",
        "SENTRY_DSN",
        "GOOGLE_CLIENT_SECRET",
        "APPLE_KEY_PRIVATE",
        "RAZORPAY_KEY_SECRET",
        "RAZORPAY_WEBHOOK_SECRET",
        "MSG91_AUTH_KEY",
        "TWILIO_AUTH_TOKEN",
    }
    t = Table(title=".env variables")
    t.add_column("Key", style="cyan")
    t.add_column("Value")
    with env_path.open() as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k in SECRET_KEYS and not show_secrets and v:
                # Show length + first 3 chars only
                v = f"[dim]<{len(v)} chars: {v[:3]}…>[/dim]"
            t.add_row(k, v or "[dim](empty)[/dim]")
    from rich.console import Console as _C

    _C().print(t)


# ─── miamo open ─────────────────────────────────────────────────────────────
@click.command("open")
@click.argument(
    "target",
    type=click.Choice(["web", "gateway", "studio", "health", "mobile-qr"]),
    default="web",
)
def open_cmd(target: str) -> None:
    """Open a common URL in your browser: web, gateway, studio, health, mobile-qr."""
    urls = {
        "web": WEB_URL,
        "gateway": f"{GATEWAY_URL}/healthz",
        "health": f"{GATEWAY_URL}/healthz",
        "studio": "http://localhost:5555",  # prisma studio default
        "mobile-qr": "http://localhost:8081",  # Expo dev tools
    }
    url = urls[target]
    step(f"opening {url}")
    webbrowser.open(url)


# ─── miamo psql ─────────────────────────────────────────────────────────────
@click.command()
@click.argument("query", required=False)
def psql(query: str | None) -> None:
    """Open an interactive psql shell (or run a one-shot query).

    Examples:
      miamo psql                                 # interactive shell
      miamo psql "SELECT COUNT(*) FROM \"User\""  # one-shot
    """
    container = _find_pg_container()
    if not container:
        die("no running postgres container", "run `miamo start` first")
    if query:
        subprocess.run(
            ["docker", "exec", container, "psql", "-U", "miamo", "-d", "miamo", "-c", query],
            check=False,
        )
    else:
        note(f"connecting to {container} — type \\q to exit")
        subprocess.run(
            ["docker", "exec", "-it", container, "psql", "-U", "miamo", "-d", "miamo"],
            check=False,
        )


# ─── miamo redis ────────────────────────────────────────────────────────────
@click.command("redis")
@click.argument("args", nargs=-1)
def redis_cmd(args: tuple[str, ...]) -> None:
    """Open a redis-cli shell (or run a one-shot command).

    Examples:
      miamo redis                    # interactive
      miamo redis KEYS 'miamo:*'     # one-shot
      miamo redis INFO memory
    """
    cmd = ["docker", "exec"]
    if args:
        cmd += [REDIS_CONTAINER, "redis-cli", *args]
    else:
        note(f"connecting to {REDIS_CONTAINER} — type EXIT or Ctrl-D to leave")
        cmd = ["docker", "exec", "-it", REDIS_CONTAINER, "redis-cli"]
    subprocess.run(cmd, check=False)


# ─── miamo ports ────────────────────────────────────────────────────────────
@click.command()
def ports() -> None:
    """Show what's listening on every Miamo port."""
    from rich.console import Console
    from rich.table import Table

    from ..config import SERVICES, WEB_PORT

    ports_map = {port: name for name, port in SERVICES}
    ports_map[WEB_PORT] = "web"
    ports_map[5432] = "postgres"
    ports_map[6379] = "redis"
    ports_map[8081] = "expo/metro"
    ports_map[5555] = "prisma studio"

    t = Table(title="Miamo ports")
    t.add_column("Port")
    t.add_column("Expected")
    t.add_column("Bound to (pid)")
    t.add_column("Status")

    for port in sorted(ports_map):
        name = ports_map[port]
        r = subprocess.run(
            ["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN"],
            capture_output=True,
            text=True,
        )
        lines = r.stdout.strip().splitlines()
        if len(lines) > 1:
            # First non-header row
            row = lines[1].split()
            pid = row[1] if len(row) > 1 else "?"
            proc = row[0] if row else "?"
            t.add_row(str(port), name, f"{proc} ({pid})", "[green]up[/green]")
        else:
            t.add_row(str(port), name, "[dim]—[/dim]", "[red]free[/red]")
    from rich.console import Console as _C

    _C().print(t)


# ─── miamo version ──────────────────────────────────────────────────────────
@click.command()
def version() -> None:
    """Print CLI version + git commit + Node/Python versions."""
    from .. import __version__

    from rich.console import Console
    from rich.table import Table

    t = Table(show_header=False)
    t.add_column(style="cyan")
    t.add_column()
    t.add_row("miamo CLI", __version__)

    try:
        commit = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        ).stdout.strip()
        tag = subprocess.run(
            ["git", "describe", "--tags", "--exact-match"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        ).stdout.strip()
        t.add_row("git commit", commit or "unknown")
        if tag:
            t.add_row("git tag", tag)
    except Exception:
        pass

    def _bin_version(cmd, args=("--version",)):
        try:
            out = subprocess.run([cmd, *args], capture_output=True, text=True, timeout=3)
            return (out.stdout + out.stderr).strip().split("\n")[0]
        except FileNotFoundError:
            return "[dim]not installed[/dim]"
        except Exception:
            return "?"

    t.add_row("node", _bin_version("node", ("-v",)))
    t.add_row("npm", _bin_version("npm", ("-v",)))
    t.add_row("python", _bin_version("python3", ("--version",)))
    t.add_row("docker", _bin_version("docker", ("--version",)))
    t.add_row("git", _bin_version("git", ("--version",)))

    from rich.console import Console as _C

    _C().print(t)


# ─── miamo where ────────────────────────────────────────────────────────────
@click.command()
def where() -> None:
    """Show critical paths: repo root, logs, pid dir, mobile, .env."""
    from rich.console import Console
    from rich.table import Table

    from ..config import LOG_DIR, PID_DIR

    t = Table(show_header=False)
    t.add_column(style="cyan")
    t.add_column()
    t.add_row("repo", str(ROOT))
    t.add_row(".env", str(ROOT / ".env"))
    t.add_row("mobile/", str(ROOT / "mobile"))
    t.add_row("services/", str(ROOT / "services"))
    t.add_row("logs", str(LOG_DIR))
    t.add_row("pids", str(PID_DIR))
    t.add_row("backups", "/tmp/miamo-backups")
    from rich.console import Console as _C

    _C().print(t)
