"""k6 load-test wrapper. Ports scripts/load/run.sh.

Each scenario is a .js file under scripts/load/. This wrapper validates
`k6` is on PATH, enforces per-scenario env-var contracts, then execs k6.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys

import click

from ..config import ROOT
from ..shell import die, note, ok, step, warn

LOAD_DIR = ROOT / "scripts" / "load"


def _list_scenarios() -> list[str]:
    if not LOAD_DIR.exists():
        return []
    return sorted(p.stem for p in LOAD_DIR.glob("*.js"))


@click.group(invoke_without_command=False)
def load_group() -> None:
    """k6 load-test wrapper. Try: `miamo load list` or `miamo load run discover`."""


@load_group.command("list")
def list_scenarios() -> None:
    """List available k6 scenarios (scripts/load/*.js)."""
    scenarios = _list_scenarios()
    if not scenarios:
        warn(f"no k6 scripts found under {LOAD_DIR}")
        return
    click.echo("Available scenarios:")
    for s in scenarios:
        click.echo(f"  - {s}")


@load_group.command("run")
@click.argument("scenario")
@click.option(
    "--target",
    envvar="LOAD_TARGET",
    default=None,
    help="Base URL (default depends on scenario; e.g. gateway :3200, ingest :3260)",
)
@click.option("--token", envvar="LOAD_TOKEN", default=None, help="Bearer token for auth'd endpoints")
@click.option("--chat-id", envvar="LOAD_CHAT_ID", default=None, help="Chat UUID (required for messages scenario)")
@click.option("--personas", envvar="LOAD_PERSONAS", default=None, help="Comma-separated seed usernames (realistic sessions)")
@click.option("--rps", type=int, default=None, help="Override RPS (exported as LOAD_RPS)")
@click.option("--duration", default=None, help="Override duration, e.g. 5m (exported as LOAD_DURATION)")
def run(
    scenario: str,
    target: str | None,
    token: str | None,
    chat_id: str | None,
    personas: str | None,
    rps: int | None,
    duration: str | None,
) -> None:
    """Run a k6 scenario (script under scripts/load/{scenario}.js)."""
    if not shutil.which("k6"):
        die(
            "k6 is not on PATH",
            "install: `brew install k6` (macOS) or see https://k6.io/docs/get-started/installation/",
        )

    script_path = LOAD_DIR / f"{scenario}.js"
    if not script_path.is_file():
        available = _list_scenarios()
        hint = "available: " + ", ".join(available) if available else f"no scripts in {LOAD_DIR}"
        die(f"no such scenario: {scenario}", hint)

    env = os.environ.copy()

    # Per-scenario env contract (mirrors run.sh)
    if scenario == "ingest":
        env["LOAD_TARGET"] = target or env.get("LOAD_TARGET") or "http://localhost:3260"
    elif scenario == "messages":
        env["LOAD_TARGET"] = target or env.get("LOAD_TARGET") or "http://localhost:3200"
        tok = token or env.get("LOAD_TOKEN")
        cid = chat_id or env.get("LOAD_CHAT_ID")
        if not tok:
            die("LOAD_TOKEN required for messages scenario", "pass --token or export LOAD_TOKEN")
        if not cid:
            die("LOAD_CHAT_ID required for messages scenario", "pass --chat-id or export LOAD_CHAT_ID")
        env["LOAD_TOKEN"] = tok
        env["LOAD_CHAT_ID"] = cid
    elif scenario in ("discover", "matches"):
        env["LOAD_TARGET"] = target or env.get("LOAD_TARGET") or "http://localhost:3200"
        tok = token or env.get("LOAD_TOKEN")
        if not tok:
            warn("LOAD_TOKEN unset — requests will hit /login redirects")
        else:
            env["LOAD_TOKEN"] = tok
    elif scenario == "discover-realistic":
        env["LOAD_TARGET"] = target or env.get("LOAD_TARGET") or "http://localhost:3200"
        if token:
            env["LOAD_TOKEN"] = token
        if personas:
            env["LOAD_PERSONAS"] = personas
    else:
        # Unknown scenario — still let k6 run it if the file exists.
        if target:
            env["LOAD_TARGET"] = target
        if token:
            env["LOAD_TOKEN"] = token

    if rps is not None:
        env["LOAD_RPS"] = str(rps)
    if duration:
        env["LOAD_DURATION"] = duration

    step(f"k6 run {script_path} (target: {env.get('LOAD_TARGET', '?')})")
    note(f"cwd: {ROOT}")

    try:
        r = subprocess.run(["k6", "run", str(script_path)], env=env, cwd=str(ROOT), check=False)
    except KeyboardInterrupt:
        die("interrupted")
    if r.returncode == 0:
        ok(f"scenario {scenario} passed")
    else:
        # k6 exits 99 when a threshold fails — surface that verbatim.
        sys.exit(r.returncode)
