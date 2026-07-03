"""Kubernetes mode — minimal, since the founder mostly uses local mode.

Ported from scripts/start.sh k8s_start / k8s_stop / k8s_status.
Simplification: we `kubectl apply -f k8s/` as a single directory rather than
per-file rendering. Full template rendering lives in the original bash and can
be brought over later if k8s mode becomes common.
"""

from __future__ import annotations

import subprocess

import click

from ..config import ROOT
from ..env import has
from ..shell import console, die, hdr, ok, run, step, try_run, warn


K8S_DIR = ROOT / "k8s"
NAMESPACE = "miamo"


def _require_kubectl() -> None:
    if not has("kubectl"):
        die("kubectl missing", "Run: miamo setup")


@click.group()
def k8s_group() -> None:
    """Kubernetes mode — kubectl apply/delete."""


@k8s_group.command()
def deploy() -> None:
    """kubectl apply -f k8s/."""
    try:
        _require_kubectl()
        if not K8S_DIR.is_dir():
            die("k8s deploy", f"{K8S_DIR} does not exist")
        hdr(f"Applying manifests from {K8S_DIR}")
        try:
            run(["kubectl", "apply", "-f", str(K8S_DIR)], check=True)
            ok("kubectl apply complete")
        except subprocess.CalledProcessError:
            die("kubectl apply", "check kubectl context + manifest syntax")

        # Rollout check
        hdr("Waiting for rollouts")
        for svc in ("auth", "users", "social", "messaging", "content", "notifications", "gateway", "web"):
            if try_run(
                ["kubectl", "-n", NAMESPACE, "rollout", "status",
                 f"deployment/{svc}", "--timeout=120s"],
                quiet=False,
            ):
                ok(svc)
            else:
                warn(f"{svc} (still rolling)")
    except KeyboardInterrupt:
        raise SystemExit(130)


@k8s_group.command()
def destroy() -> None:
    """kubectl delete -f k8s/  (namespace + all resources)."""
    try:
        _require_kubectl()
        if not K8S_DIR.is_dir():
            die("k8s destroy", f"{K8S_DIR} does not exist")
        hdr(f"Deleting manifests from {K8S_DIR}")
        try_run(["kubectl", "delete", "-f", str(K8S_DIR), "--ignore-not-found"], quiet=False)
        ok("kubectl delete complete")
    except KeyboardInterrupt:
        raise SystemExit(130)


@k8s_group.command()
def status() -> None:
    """kubectl get pods -n miamo."""
    try:
        _require_kubectl()
        for resource in ("pods", "svc", "hpa"):
            console.print(f"[cyan]{resource}:[/cyan]")
            try_run(["kubectl", "-n", NAMESPACE, "get", resource], quiet=False)
            console.print()
    except KeyboardInterrupt:
        raise SystemExit(130)
