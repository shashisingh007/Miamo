"""Environment: .env loading, prereq detection, port utilities."""

from __future__ import annotations

import os
import platform
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

from .config import ROOT
from .shell import note, ok, step, warn


def load_env() -> None:
    """Source the repo-root .env (does not override already-set vars)."""
    env_path = ROOT / ".env"
    if env_path.exists():
        load_dotenv(env_path, override=False)
        note(f".env loaded from {env_path}")
        return
    example = ROOT / ".env.example"
    if example.exists():
        warn(".env missing — copying .env.example -> .env")
        shutil.copy(example, env_path)
        load_dotenv(env_path, override=False)
        note(f".env loaded from {env_path}")
    else:
        warn(".env not found — using shell environment only")


def export_local_defaults() -> None:
    """Local-dev defaults; only set if not already exported by .env."""
    defaults = {
        "DATABASE_URL": "postgresql://miamo:miamo@localhost:5432/miamo?schema=public",
        "JWT_SECRET": "miamo-dev-jwt-secret-change-in-production-2026",
        "INTERNAL_SERVICE_KEY": "miamo-internal-dev-key",
        "ENCRYPTION_KEY": "miamo-dev-encrypt-key-32-bytes!!",
        "NODE_ENV": "development",
        "FRONTEND_URL": "http://localhost:3100",
        "GATEWAY_URL": "http://localhost:3200",
        "AUTH_SERVICE_URL": "http://localhost:3201",
        "USER_SERVICE_URL": "http://localhost:3202",
        "SOCIAL_SERVICE_URL": "http://localhost:3203",
        "MESSAGING_SERVICE_URL": "http://localhost:3204",
        "CONTENT_SERVICE_URL": "http://localhost:3205",
        "NOTIFICATION_SERVICE_URL": "http://localhost:3206",
    }
    for k, v in defaults.items():
        os.environ.setdefault(k, v)


def has(cmd: str) -> bool:
    """True iff `cmd` is on PATH."""
    return shutil.which(cmd) is not None


def check_prereqs(required: tuple[str, ...] = ("node", "npm", "docker", "git", "python3")) -> list[str]:
    """Return the list of missing required tools."""
    return [c for c in required if not has(c)]


def tool_version(cmd: str) -> str:
    """Best-effort version string for a tool. Returns '?' if unavailable."""
    if not has(cmd):
        return "?"
    try:
        if cmd in ("node", "npm"):
            r = subprocess.run([cmd, "-v"], capture_output=True, text=True, timeout=5)
            return (r.stdout or "").strip() or "?"
        if cmd == "docker":
            r = subprocess.run(["docker", "--version"], capture_output=True, text=True, timeout=5)
            parts = (r.stdout or "").split()
            return parts[2].rstrip(",") if len(parts) >= 3 else "?"
        if cmd == "git":
            r = subprocess.run(["git", "--version"], capture_output=True, text=True, timeout=5)
            parts = (r.stdout or "").split()
            return parts[2] if len(parts) >= 3 else "?"
        if cmd == "python3":
            r = subprocess.run(["python3", "--version"], capture_output=True, text=True, timeout=5)
            parts = (r.stdout or "").split()
            return parts[1] if len(parts) >= 2 else "?"
        if cmd == "kubectl":
            r = subprocess.run(
                ["kubectl", "version", "--client", "--output=yaml"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            for line in (r.stdout or "").splitlines():
                if "gitVersion" in line:
                    return line.split(":", 1)[1].strip()
            return "?"
    except (subprocess.SubprocessError, FileNotFoundError, IndexError):
        return "?"
    return "?"


def is_port_busy(port: int) -> bool:
    """True iff someone is listening on 127.0.0.1:<port>."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def clear_port(port: int) -> None:
    """Kill whatever process is listening on <port>. Silent on success.

    Tries `lsof` first (mac + most linux), falls back to `fuser` (linux).
    """
    if shutil.which("lsof"):
        try:
            r = subprocess.run(
                ["lsof", "-ti", f":{port}"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            pids = [p for p in (r.stdout or "").strip().split("\n") if p]
            for pid in pids:
                subprocess.run(["kill", "-9", pid], check=False)
            return
        except (subprocess.SubprocessError, FileNotFoundError):
            pass
    if shutil.which("fuser"):
        subprocess.run(["fuser", "-k", f"{port}/tcp"], check=False)
        return
    # Nothing available — best effort ends here.


def ensure_dirs() -> None:
    """Create /tmp/miamo-logs and /tmp/miamo-pids if missing."""
    from .config import LOG_DIR, PID_DIR

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    PID_DIR.mkdir(parents=True, exist_ok=True)


# ─── Docker daemon auto-start ───────────────────────────────────────────────


def _docker_daemon_up(timeout: float = 2.0) -> bool:
    """Return True if `docker info` succeeds within `timeout` seconds."""
    try:
        r = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return r.returncode == 0
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


def _wait_for_daemon(deadline: float) -> bool:
    """Poll `docker info` until it responds or we hit `deadline` (epoch seconds)."""
    while time.time() < deadline:
        if _docker_daemon_up(timeout=2.0):
            return True
        time.sleep(1.5)
    return False


def ensure_docker_daemon(auto_start: bool = True) -> None:
    """Guarantee a working Docker socket. Auto-start Colima / Docker Desktop.

    Order of preference on macOS:
      1. Docker daemon already responding → no-op.
      2. Colima is installed → `colima start` (up to ~60s).
      3. Docker Desktop app is present → `open -a Docker` (up to ~60s).
      4. Give up with a clear error.

    On Linux we try `systemctl start docker` if the user has sudo access; if
    not (or systemctl is absent), we surface a hint and exit.

    Raises SystemExit on failure so callers can just call this at the top of
    their command and assume Docker is reachable afterwards.
    """
    if not shutil.which("docker"):
        from .shell import die
        die("docker not installed", "run `miamo setup` to install prerequisites")

    if _docker_daemon_up():
        return  # happy path — nothing to do

    if not auto_start:
        from .shell import die
        die("docker daemon not running", "start Docker Desktop / Colima and retry")

    system = platform.system().lower()

    if system == "darwin":
        # Prefer Colima if it's installed (matches how the user set up locally).
        if shutil.which("colima"):
            step("Docker not responding — starting Colima (this can take ~30–60s)…")
            r = subprocess.run(
                ["colima", "start"],
                capture_output=True,
                text=True,
                timeout=180,
            )
            if r.returncode == 0 or "already running" in (r.stderr + r.stdout).lower():
                ok("Colima started")
                if _wait_for_daemon(time.time() + 60):
                    ok("Docker daemon reachable")
                    return
                warn("Colima started but Docker socket still not responsive")
            else:
                warn(f"colima start exited {r.returncode}: {r.stderr.strip()[:200]}")

        # Fall back to Docker Desktop (if the app is installed).
        if Path("/Applications/Docker.app").exists():
            step("Starting Docker Desktop (this can take ~30–60s)…")
            subprocess.run(["open", "-a", "Docker"], check=False)
            if _wait_for_daemon(time.time() + 90):
                ok("Docker Desktop is running")
                return
            warn("Docker Desktop launched but daemon not reachable within 90s")

        from .shell import die
        die(
            "docker daemon still not running",
            "install colima (`brew install colima`) or Docker Desktop, then retry",
        )

    elif system == "linux":
        if shutil.which("systemctl"):
            step("Docker not responding — trying `sudo systemctl start docker`…")
            r = subprocess.run(
                ["sudo", "-n", "systemctl", "start", "docker"],
                capture_output=True,
                text=True,
            )
            if r.returncode == 0 and _wait_for_daemon(time.time() + 30):
                ok("Docker service started")
                return
            warn("systemctl start docker failed or sudo requires password")
        from .shell import die
        die(
            "docker daemon not running",
            "run: sudo systemctl start docker  (or fix your Docker install)",
        )

    else:
        from .shell import die
        die(
            "docker daemon not running",
            f"auto-start not implemented for platform '{system}' — please start Docker manually",
        )
