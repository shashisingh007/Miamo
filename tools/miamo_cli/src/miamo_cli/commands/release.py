"""Release ops: git-tag-based rollback.

Ports scripts/rollback.sh. The bash version supports docker-compose and
k8s modes; this Python port covers both. Post-rollback it invokes
`miamo start` (if available on PATH) and curls the gateway /healthz.
"""

from __future__ import annotations

import shutil
import subprocess
import time
import urllib.error
import urllib.request

import click

from ..config import GATEWAY_HEALTH, ROOT
from ..shell import die, note, ok, step, warn

SERVICES: list[str] = [
    "gateway",
    "auth",
    "users",
    "social",
    "messaging",
    "content",
    "notifications",
    "tracking-worker",
    "ingest",
    "miamo-web",
]


def _tag_exists(tag: str) -> bool:
    r = subprocess.run(
        ["git", "rev-parse", "-q", "--verify", f"refs/tags/{tag}"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    return r.returncode == 0


def _current_tag() -> str:
    r = subprocess.run(
        ["git", "describe", "--tags", "--exact-match", "HEAD"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    return (r.stdout or "").strip()


def _healthcheck(url: str, timeout: int = 60) -> bool:
    """Poll `url` up to `timeout` seconds for HTTP 200."""
    start = time.monotonic()
    while time.monotonic() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:  # noqa: S310
                if resp.status == 200:
                    return True
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError):
            pass
        time.sleep(2)
    return False


@click.command()
@click.argument("tag")
@click.option(
    "--to-tag",
    default=None,
    help="Only rollback when the current HEAD matches this tag (guardrail).",
)
@click.option("--mode", type=click.Choice(["git", "docker", "k8s"]), default="git", show_default=True)
@click.option("--dry-run", is_flag=True, help="Print the plan, do nothing.")
@click.option("--skip-restart", is_flag=True, help="Skip `miamo start` after checkout.")
def rollback(tag: str, to_tag: str | None, mode: str, dry_run: bool, skip_restart: bool) -> None:
    """Rollback to a previous git tag, then restart local stack + healthcheck.

    \b
    Examples:
      miamo rollback v1                        # git checkout v1
      miamo rollback v0-lkg --to-tag v1        # only if HEAD is currently v1
      miamo rollback v1.0.2 --mode docker      # pull + up docker-compose.prod.yml
      miamo rollback v1.0.2 --mode k8s         # kubectl set image across services
    """
    if to_tag:
        current = _current_tag()
        if current != to_tag:
            die(
                f"guardrail: --to-tag={to_tag} but HEAD is {current or '<no-tag>'}",
                "rollback aborted",
            )

    click.echo(f"--- Miamo rollback (mode={mode}, target={tag}, dry-run={dry_run}) ---")

    if dry_run:
        if mode == "git":
            note(f"[PLAN] git checkout {tag}")
        elif mode == "docker":
            note(f"[PLAN] IMAGE_TAG={tag} docker compose -f docker-compose.prod.yml pull")
            note(f"[PLAN] IMAGE_TAG={tag} docker compose -f docker-compose.prod.yml up -d")
        else:
            for svc in SERVICES:
                note(f"[PLAN] kubectl set image deployment/{svc} {svc}=miamo/{svc}:{tag} -n miamo")
        return

    try:
        if mode == "git":
            if not _tag_exists(tag):
                die(f"tag not found: {tag}", "run `git tag -l` to see available tags")
            step(f"git checkout {tag}")
            r = subprocess.run(["git", "checkout", tag], cwd=str(ROOT), check=False)
            if r.returncode != 0:
                die(f"git checkout failed (exit {r.returncode})", "commit or stash local changes first")
        elif mode == "docker":
            if not shutil.which("docker"):
                die("docker not on PATH")
            step(f"docker compose pull (IMAGE_TAG={tag})")
            env = {"IMAGE_TAG": tag}
            r = subprocess.run(
                ["docker", "compose", "-f", "docker-compose.prod.yml", "pull"],
                cwd=str(ROOT),
                env={**__import__("os").environ, **env},
                check=False,
            )
            if r.returncode != 0:
                die("docker compose pull failed")
            step(f"docker compose up -d (IMAGE_TAG={tag})")
            r = subprocess.run(
                ["docker", "compose", "-f", "docker-compose.prod.yml", "up", "-d"],
                cwd=str(ROOT),
                env={**__import__("os").environ, **env},
                check=False,
            )
            if r.returncode != 0:
                die("docker compose up failed")
        else:  # k8s
            if not shutil.which("kubectl"):
                die("kubectl not on PATH")
            for svc in SERVICES:
                step(f"kubectl set image deployment/{svc}")
                r = subprocess.run(
                    [
                        "kubectl", "set", "image", f"deployment/{svc}",
                        f"{svc}=miamo/{svc}:{tag}", "-n", "miamo",
                    ],
                    check=False,
                )
                if r.returncode != 0:
                    die(f"kubectl set image failed for {svc}")
            for svc in SERVICES:
                step(f"kubectl rollout status deployment/{svc}")
                r = subprocess.run(
                    ["kubectl", "rollout", "status", f"deployment/{svc}", "-n", "miamo", "--timeout=120s"],
                    check=False,
                )
                if r.returncode != 0:
                    die(f"rollout status failed for {svc}")
    except KeyboardInterrupt:
        die("interrupted", "the stack may be in a partial state — check `miamo status`")

    if mode == "git" and not skip_restart:
        if shutil.which("miamo"):
            step("restarting local stack via `miamo start`")
            try:
                subprocess.run(["miamo", "start"], cwd=str(ROOT), check=False)
            except KeyboardInterrupt:
                warn("start interrupted; skipping healthcheck")
                return
        else:
            warn("miamo CLI not on PATH — skipping auto-restart")

    step(f"healthcheck: {GATEWAY_HEALTH}")
    if _healthcheck(GATEWAY_HEALTH, timeout=60):
        ok(f"rollback to {tag} complete — gateway healthy")
    else:
        die(
            "gateway did not return 200 within 60s",
            "check `miamo logs gateway` and `miamo status`",
        )
