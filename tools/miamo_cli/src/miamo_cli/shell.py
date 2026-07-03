"""Subprocess wrappers + Rich output helpers.

Every subprocess call in the CLI goes through `run()` so we get a single choke point
for logging, cwd handling, and error surfaces.
"""

from __future__ import annotations

import shlex
import subprocess
import sys
from pathlib import Path
from typing import Sequence

from rich.console import Console

console = Console()


def run(
    cmd: str | Sequence[str],
    *,
    check: bool = True,
    capture: bool = False,
    cwd: str | Path | None = None,
    env: dict | None = None,
    quiet: bool = False,
) -> subprocess.CompletedProcess:
    """Run a shell command.

    - `cmd` may be a string (shlex-split) or an argv list.
    - `capture=True` returns stdout/stderr on the CompletedProcess.
    - `check=True` raises CalledProcessError on non-zero exit.
    - `quiet=True` suppresses stdout/stderr (like `>/dev/null 2>&1`).
    """
    args = shlex.split(cmd) if isinstance(cmd, str) else list(cmd)
    stdout = subprocess.DEVNULL if quiet and not capture else None
    stderr = subprocess.DEVNULL if quiet and not capture else None
    return subprocess.run(
        args,
        check=check,
        cwd=str(cwd) if cwd else None,
        env=env,
        capture_output=capture,
        text=True,
        stdout=stdout if not capture else None,
        stderr=stderr if not capture else None,
    )


def try_run(
    cmd: str | Sequence[str],
    *,
    cwd: str | Path | None = None,
    env: dict | None = None,
    quiet: bool = True,
) -> bool:
    """Run a command, return True on exit 0. Never raises."""
    try:
        run(cmd, check=True, cwd=cwd, env=env, quiet=quiet)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def capture(
    cmd: str | Sequence[str],
    *,
    cwd: str | Path | None = None,
    env: dict | None = None,
) -> str:
    """Run, capture stdout, strip. Returns "" on failure."""
    try:
        r = run(cmd, check=False, capture=True, cwd=cwd, env=env)
        return (r.stdout or "").strip()
    except FileNotFoundError:
        return ""


# ─── Rich output helpers ──────────────────────────────────────────────────────


def ok(msg: str) -> None:
    console.print(f"  [green]✓[/green] {msg}")


def note(msg: str) -> None:
    console.print(f"  [cyan]●[/cyan] {msg}")


def warn(msg: str) -> None:
    console.print(f"  [yellow]⚠[/yellow] {msg}")


def err(msg: str) -> None:
    console.print(f"  [red]✗[/red] {msg}")


def step(msg: str) -> None:
    console.print(f"  [yellow]▶[/yellow] {msg}")


def hdr(msg: str) -> None:
    console.print(f"[bold blue]─── {msg} ───[/bold blue]")


def die(what: str, hint: str = "") -> None:
    """Print a red banner + hint, then exit 1."""
    err(f"failed: {what}")
    if hint:
        console.print(f"    [yellow]hint:[/yellow] {hint}")
    sys.exit(1)


def banner_success(mode: str) -> None:
    console.print()
    console.print("[green]" + "═" * 60 + "[/green]")
    console.print(f"[green]  Miamo is up ({mode})[/green]")
    console.print("[green]" + "═" * 60 + "[/green]")
    console.print()
    console.print(f"  [cyan]Frontend:[/cyan]  [blue]http://localhost:3100[/blue]")
    console.print(f"  [cyan]Gateway:[/cyan]   [blue]http://localhost:3200[/blue]")
    console.print(f"  [cyan]Health:[/cyan]    [blue]http://localhost:3200/healthz[/blue]")
    console.print(f"  [cyan]Demo:[/cyan]      [green]miamo10@miamo.test[/green] / [green]miamo10[/green]")
    console.print()


def banner_failure(mode: str, healthy: int, total: int) -> None:
    console.print()
    console.print("[red]" + "═" * 60 + "[/red]")
    console.print(f"[red]  Miamo failed to start cleanly ({healthy}/{total} healthy) — {mode}[/red]")
    console.print("[red]" + "═" * 60 + "[/red]")
    console.print()
    console.print("  [yellow]Next steps:[/yellow]")
    console.print("    1. Check logs:    ls -lh /tmp/miamo-logs/")
    console.print("    2. Tail gateway:  miamo logs gateway")
    console.print("    3. Full status:   miamo status")
    console.print()
