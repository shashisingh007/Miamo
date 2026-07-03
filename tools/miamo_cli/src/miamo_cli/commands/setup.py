"""Prerequisites installer — port of scripts/setup.sh.

Deliberately narrower than the bash version:
- Full Homebrew (mac) + apt (linux) coverage.
- Windows path prints manual instructions (founder is on Mac).
- Focuses on the ~5 tools that actually matter for the local dev loop.
"""

from __future__ import annotations

import platform
import subprocess

import click

from ..env import has, tool_version
from ..shell import console, err, hdr, note, ok, run, step, try_run, warn


# (label, cmd_to_check, brew_pkg, apt_pkg)
PREREQS: list[tuple[str, str, str | None, str | None]] = [
    ("Git",       "git",       "git",      "git"),
    ("Node.js 20", "node",     "node",     "nodejs"),
    ("npm",       "npm",       None,       "npm"),          # comes with node on mac
    ("Docker",    "docker",    "--cask docker", "docker.io"),
    ("Python 3",  "python3",   "python@3.11", "python3"),
    ("Watchman",  "watchman",  "watchman", None),           # mac only (RN)
]


def _mac_install(brew_pkg: str, yes: bool) -> bool:
    if brew_pkg is None:
        return False
    # brew_pkg may be "--cask docker" — split.
    argv = ["brew", "install"] + brew_pkg.split()
    if yes:
        argv.insert(2, "-y") if False else None  # brew has no -y; kept for symmetry
    return try_run(argv, quiet=False)


def _linux_install(apt_pkg: str, yes: bool) -> bool:
    if apt_pkg is None:
        return False
    argv = ["sudo", "apt-get", "install"]
    if yes:
        argv.append("-y")
    argv.append(apt_pkg)
    return try_run(argv, quiet=False)


@click.command()
@click.option("--yes", is_flag=True, help="Auto-accept prompts")
def setup(yes: bool) -> None:
    """Install prerequisites (node, docker, python3, git, watchman)."""
    try:
        system = platform.system()
        hdr(f"Miamo setup — {system}")
        console.print()

        if system == "Darwin":
            if not has("brew"):
                warn("Homebrew missing. Install from https://brew.sh then re-run `miamo setup`.")
                raise SystemExit(1)
            installer = lambda pkg: _mac_install(pkg[2], yes)
            skip_key = 3  # skip linux column
        elif system == "Linux":
            if not has("apt-get"):
                warn("Only apt-based Linux is supported here. Install packages manually.")
                raise SystemExit(1)
            if not yes:
                note("Running `sudo apt-get update`…")
                try_run(["sudo", "apt-get", "update"], quiet=False)
            installer = lambda pkg: _linux_install(pkg[3], yes)
            skip_key = 2
        else:
            warn(f"Automatic setup on {system} is not implemented.")
            console.print("  Install manually: node@20, docker, git, python3, watchman (mac only).")
            raise SystemExit(1)

        installed: list[str] = []
        skipped: list[str] = []
        failed: list[str] = []

        for pkg in PREREQS:
            label, cmd, brew_pkg, apt_pkg = pkg
            # Watchman only on mac.
            if label == "Watchman" and system != "Darwin":
                continue
            # If no installer for this platform, skip.
            if system == "Darwin" and brew_pkg is None:
                continue
            if system == "Linux" and apt_pkg is None:
                continue

            step(label)
            if has(cmd):
                skipped.append(f"{label} ({tool_version(cmd)})")
                ok(f"{label} already installed ({tool_version(cmd)})")
                continue
            if installer(pkg):
                if has(cmd):
                    installed.append(f"{label} ({tool_version(cmd)})")
                    ok(f"{label} installed")
                else:
                    failed.append(label)
                    err(f"{label} — install seemed to succeed but binary not on PATH")
            else:
                failed.append(label)
                err(f"{label} install failed")

        console.print()
        hdr("Summary")
        console.print()
        if installed:
            console.print("  [green]Freshly installed:[/green]")
            for i in installed:
                console.print(f"    [green]✓[/green] {i}")
            console.print()
        if skipped:
            console.print("  [cyan]Already had:[/cyan]")
            for s in skipped:
                console.print(f"    [cyan]●[/cyan] {s}")
            console.print()
        if failed:
            console.print("  [red]Need manual install:[/red]")
            for f in failed:
                console.print(f"    [red]✗[/red] {f}")
            console.print()

        console.print("  [green]Next:[/green]  miamo start")
        console.print()

        if failed:
            raise SystemExit(1)

    except KeyboardInterrupt:
        raise SystemExit(130)
