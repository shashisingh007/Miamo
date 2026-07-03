"""`miamo mobile` — control the Expo mobile app in `mobile/`.

Handles Expo dev server, Metro bundler cleanup, EAS builds/submits.
Auto-detects LAN IP so a phone can hit the host's :3200 gateway.
"""

from __future__ import annotations

import os
import shutil
import subprocess

import click
from rich.console import Console
from rich.table import Table

from ..config import ROOT
from ..shell import die, ok, step

MOBILE_DIR = ROOT / "mobile"


def _mobile_dir():
    if not MOBILE_DIR.exists():
        die(f"mobile/ dir not found at {MOBILE_DIR}")
    return MOBILE_DIR


def _metro_pids() -> list[str]:
    """Return PIDs listening on Metro's 8081 port."""
    try:
        r = subprocess.run(
            ["lsof", "-ti", ":8081"], capture_output=True, text=True, timeout=5
        )
    except (subprocess.SubprocessError, FileNotFoundError):
        return []
    return [p for p in (r.stdout or "").strip().split("\n") if p]


@click.group()
def mobile_group() -> None:
    """Manage the Expo mobile app (iOS + Android)."""


@mobile_group.command()
@click.option("--tunnel", is_flag=True, help="Use ngrok tunnel (phones outside LAN)")
@click.option("--clear", is_flag=True, help="Bust Metro cache")
@click.option(
    "--api",
    envvar="EXPO_PUBLIC_API_URL",
    help="Backend URL (defaults to LAN IP:3200)",
)
def start(tunnel: bool, clear: bool, api: str | None) -> None:
    """Start Expo dev server. Scan the QR with Expo Go on your phone."""
    d = _mobile_dir()
    if not api:
        try:
            out = subprocess.run(
                ["ipconfig", "getifaddr", "en0"],
                capture_output=True,
                text=True,
                timeout=3,
            )
            ip = out.stdout.strip() or "localhost"
        except (subprocess.SubprocessError, FileNotFoundError):
            ip = "localhost"
        api = f"http://{ip}:3200"
        step(f"auto-detected API URL: {api}")
    env = {**os.environ, "EXPO_PUBLIC_API_URL": api}
    cmd = ["npx", "expo", "start"]
    if tunnel:
        cmd.append("--tunnel")
    if clear:
        cmd.append("--clear")
    step(f"cd {d} && {' '.join(cmd)}   (EXPO_PUBLIC_API_URL={api})")
    try:
        subprocess.run(cmd, cwd=d, env=env)
    except KeyboardInterrupt:
        ok("expo stopped")


@mobile_group.command()
def stop() -> None:
    """Kill any running Expo/Metro bundler on port 8081."""
    pids = _metro_pids()
    if not pids:
        ok("no Metro bundler running")
        return
    for pid in pids:
        subprocess.run(["kill", "-9", pid], check=False)
    ok(f"Metro bundler stopped ({len(pids)} pid{'s' if len(pids) != 1 else ''})")


@mobile_group.command()
def status() -> None:
    """Show mobile package + node_modules state."""
    d = _mobile_dir()
    pkg_lock = (d / "package-lock.json").exists()
    nm = (d / "node_modules").exists()
    metro_running = bool(_metro_pids())
    t = Table(title="Mobile status")
    t.add_column("Check")
    t.add_column("Value")
    t.add_row("mobile/ dir", str(d))
    t.add_row("package-lock.json", "present" if pkg_lock else "missing")
    t.add_row(
        "node_modules/",
        "present" if nm else "missing (run `miamo mobile install`)",
    )
    t.add_row(
        "Metro bundler",
        "running on :8081" if metro_running else "stopped",
    )
    Console().print(t)


@mobile_group.command()
def install() -> None:
    """npm install inside mobile/ (--legacy-peer-deps)."""
    d = _mobile_dir()
    step(f"cd {d} && npm install --legacy-peer-deps")
    subprocess.run(["npm", "install", "--legacy-peer-deps"], cwd=d, check=True)
    ok("mobile deps installed")


@mobile_group.command()
def typecheck() -> None:
    """npx tsc --noEmit in mobile/."""
    d = _mobile_dir()
    subprocess.run(["npx", "tsc", "--noEmit"], cwd=d, check=True)
    ok("typecheck clean")


@mobile_group.command()
def test() -> None:
    """Run mobile Jest suite (unit + component + parity)."""
    d = _mobile_dir()
    subprocess.run(["npm", "test"], cwd=d, check=True)


@mobile_group.command()
@click.argument(
    "profile",
    type=click.Choice(["development", "preview", "production"]),
    default="preview",
)
@click.option(
    "--platform",
    type=click.Choice(["ios", "android", "all"]),
    default="all",
)
def build(profile: str, platform: str) -> None:
    """EAS Build a signed binary (development/preview/production)."""
    d = _mobile_dir()
    cmd = [
        "eas",
        "build",
        "--profile",
        profile,
        "--platform",
        platform,
        "--non-interactive",
    ]
    step(" ".join(cmd))
    subprocess.run(cmd, cwd=d, check=True)


@mobile_group.command()
@click.argument("platform", type=click.Choice(["ios", "android"]))
def submit(platform: str) -> None:
    """EAS Submit latest production build to the store."""
    d = _mobile_dir()
    cmd = ["eas", "submit", "--platform", platform, "--profile", "production"]
    subprocess.run(cmd, cwd=d, check=True)


@mobile_group.command()
def clean() -> None:
    """Nuke node_modules + .expo + Metro watchman state."""
    d = _mobile_dir()
    for p in [d / "node_modules", d / ".expo"]:
        if p.exists():
            shutil.rmtree(p)
            ok(f"removed {p}")
    subprocess.run(["watchman", "watch-del-all"], check=False)
    ok("mobile workspace clean")
