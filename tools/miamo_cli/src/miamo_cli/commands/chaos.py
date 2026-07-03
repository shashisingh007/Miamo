"""Chaos engineering ports of scripts/chaos/*.sh.

Each sub-command mirrors the semantics of its bash counterpart: kill a
container (or partition it off the network), assert graceful behavior,
then restore + healthcheck.
"""

from __future__ import annotations

import subprocess
import time
import urllib.error
import urllib.request

import click

from ..config import GATEWAY_URL, REDIS_CONTAINER
from ..shell import die, err, note, ok, step, warn

POSTGRES_CONTAINER = "miamo-postgres"
TRACKING_WORKER_CONTAINER = "miamo-tracking-worker"
GATEWAY_CONTAINER = "miamo-gateway"
DEFAULT_NETWORK = "miamo_default"


# ─── helpers ──────────────────────────────────────────────────────────


def _container_running(name: str) -> bool:
    r = subprocess.run(
        ["docker", "ps", "--format", "{{.Names}}"],
        capture_output=True,
        text=True,
        check=False,
    )
    return name in (r.stdout or "").splitlines()


def _http_status(url: str, timeout: float = 5.0) -> int:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:  # noqa: S310
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except (urllib.error.URLError, ConnectionError, TimeoutError, OSError):
        return 0


def _wait_for_health(url: str, timeout: int) -> tuple[bool, int]:
    """Poll `url` up to `timeout` seconds. Returns (recovered, elapsed_seconds)."""
    start = time.monotonic()
    while True:
        elapsed = int(time.monotonic() - start)
        if elapsed > timeout:
            return False, elapsed
        code = _http_status(url, timeout=2)
        if code == 200:
            return True, elapsed
        note(f"t={elapsed}s status={code}")
        time.sleep(1)


def _docker_kill(name: str) -> None:
    subprocess.run(["docker", "kill", name], check=False, stdout=subprocess.DEVNULL)


def _docker_start(name: str) -> None:
    subprocess.run(["docker", "start", name], check=False, stdout=subprocess.DEVNULL)


# ─── commands ─────────────────────────────────────────────────────────


@click.group()
def chaos_group() -> None:
    """Chaos engineering: kill infra to test recovery."""


@chaos_group.command("kill-postgres")
@click.option("--recovery-timeout", default=30, show_default=True, help="Seconds to wait for /healthz")
@click.option("--restart-after", default=10, show_default=True, help="Seconds to hold down before restart")
def kill_postgres(recovery_timeout: int, restart_after: int) -> None:
    """SIGKILL miamo-postgres, hold the outage, restart, then poll /healthz."""
    if not _container_running(POSTGRES_CONTAINER):
        die(f"{POSTGRES_CONTAINER} is not running")

    healthz = f"{GATEWAY_URL}/healthz"
    step(f"baseline: GET {healthz}")
    note(f"status: {_http_status(healthz)}")

    try:
        step(f"killing {POSTGRES_CONTAINER}")
        _docker_kill(POSTGRES_CONTAINER)
        step(f"holding outage for {restart_after}s")
        time.sleep(restart_after)
        note(f"status during outage: {_http_status(healthz)}")
        step(f"restarting {POSTGRES_CONTAINER}")
        _docker_start(POSTGRES_CONTAINER)
        step(f"polling /healthz for recovery (timeout {recovery_timeout}s)")
        recovered, elapsed = _wait_for_health(healthz, recovery_timeout)
    except KeyboardInterrupt:
        warn("interrupted — attempting to restart postgres")
        _docker_start(POSTGRES_CONTAINER)
        die("aborted")

    if recovered:
        ok(f"recovered in {elapsed}s")
    else:
        die(f"no recovery within {recovery_timeout}s")


@chaos_group.command("kill-redis")
def kill_redis() -> None:
    """SIGKILL miamo-redis; assert fail-open (healthz + discover stay non-5xx)."""
    if not _container_running(REDIS_CONTAINER):
        die(f"{REDIS_CONTAINER} is not running")

    healthz = f"{GATEWAY_URL}/healthz"
    discover = f"{GATEWAY_URL}/api/v1/discover"

    step(f"baseline: GET {healthz}")
    note(f"status: {_http_status(healthz)}")

    failure: str | None = None
    try:
        step(f"killing {REDIS_CONTAINER}")
        _docker_kill(REDIS_CONTAINER)
        time.sleep(3)

        step("during outage — /healthz MUST return 200 (fail-open)")
        code = _http_status(healthz)
        note(f"status: {code}")
        if code != 200:
            failure = f"/healthz returned {code} while redis was down — must fail-open"

        if failure is None:
            step("during outage — /api/v1/discover MUST NOT 5xx (fail-open cache)")
            code = _http_status(discover)
            note(f"status: {code}")
            if 500 <= code < 600:
                failure = f"/api/v1/discover returned {code} during redis outage — must fail-open"
    except KeyboardInterrupt:
        warn("interrupted — restoring redis")
        failure = "interrupted"

    step(f"restarting {REDIS_CONTAINER}")
    _docker_start(REDIS_CONTAINER)
    time.sleep(3)

    if failure:
        die(failure)
    ok("services stayed responsive during redis outage")


@chaos_group.command("oom-tracking-worker")
@click.option("--restart-timeout", default=15, show_default=True, help="Seconds to wait for auto-restart")
@click.option("--passes", default=2, show_default=True, help="Number of SIGKILL passes")
def oom_tracking_worker(restart_timeout: int, passes: int) -> None:
    """SIGKILL miamo-tracking-worker; assert docker-compose revives it (no crash loop)."""
    if not _container_running(TRACKING_WORKER_CONTAINER):
        die(f"{TRACKING_WORKER_CONTAINER} is not running — start stack first")

    try:
        for i in range(1, passes + 1):
            step(f"pass {i}: SIGKILL {TRACKING_WORKER_CONTAINER}")
            _docker_kill(TRACKING_WORKER_CONTAINER)
            step(f"pass {i}: waiting up to {restart_timeout}s for restart")
            start = time.monotonic()
            healthy = False
            while time.monotonic() - start < restart_timeout:
                if _container_running(TRACKING_WORKER_CONTAINER):
                    time.sleep(3)  # let worker begin pulling from Redis
                    healthy = True
                    break
                time.sleep(1)
            if not healthy:
                subprocess.run(
                    ["docker", "logs", "--tail", "40", TRACKING_WORKER_CONTAINER],
                    check=False,
                )
                die(f"pass {i} — {TRACKING_WORKER_CONTAINER} did not restart in time")
            note(f"pass {i}: back up")
    except KeyboardInterrupt:
        die("interrupted")

    r = subprocess.run(
        ["docker", "inspect", "-f", "{{.RestartCount}}", TRACKING_WORKER_CONTAINER],
        capture_output=True,
        text=True,
        check=False,
    )
    restarts_str = (r.stdout or "0").strip()
    try:
        restarts = int(restarts_str)
    except ValueError:
        restarts = 0
    note(f"restart count: {restarts}")
    if restarts > 20:
        die(f"crash loop suspected (RestartCount={restarts})")
    ok(f"tracking-worker survived {passes} SIGKILL passes cleanly")


@chaos_group.command("partition-network")
@click.option("--duration", default=15, show_default=True, help="Seconds to hold the partition")
@click.option("--network", default=DEFAULT_NETWORK, show_default=True, help="Docker network name")
@click.option("--recovery-timeout", default=30, show_default=True)
def partition_network(duration: int, network: str, recovery_timeout: int) -> None:
    """Disconnect postgres from the docker network to simulate a partition."""
    r = subprocess.run(
        ["docker", "network", "ls", "--format", "{{.Name}}"],
        capture_output=True,
        text=True,
        check=False,
    )
    if network not in (r.stdout or "").splitlines():
        die(f"docker network '{network}' not found", "pass --network or set MIAMO_NETWORK")

    healthz = f"{GATEWAY_URL}/healthz"
    discover = f"{GATEWAY_URL}/api/v1/discover"

    step(f"baseline: GET {healthz}")
    note(f"status: {_http_status(healthz)}")

    status_ok = True
    disconnected = False
    try:
        step(f"disconnecting {POSTGRES_CONTAINER} from {network}")
        subprocess.run(
            ["docker", "network", "disconnect", network, POSTGRES_CONTAINER],
            check=False,
            stdout=subprocess.DEVNULL,
        )
        disconnected = True

        step("during partition — /api/v1/discover MUST return 503 (not 500)")
        code = _http_status(discover)
        note(f"status: {code}")
        if code == 500:
            err("got 500 during partition — expected 503")
            status_ok = False
        elif code in (503, 401):
            note("ok: 503 (or 401 if auth ran before DB call)")
        else:
            warn(f"unexpected {code} — inspect logs")

        step(f"holding partition for {duration}s")
        time.sleep(duration)
    except KeyboardInterrupt:
        warn("interrupted — healing partition")

    if disconnected:
        step("healing partition")
        subprocess.run(
            ["docker", "network", "connect", network, POSTGRES_CONTAINER],
            check=False,
            stdout=subprocess.DEVNULL,
        )

    step(f"polling /healthz for auto-recovery ({recovery_timeout}s budget)")
    recovered, elapsed = _wait_for_health(healthz, recovery_timeout)
    if not recovered:
        die("gateway did not auto-recover — connection pool leak?")
    ok(f"recovered in {elapsed}s after partition heal")
    if not status_ok:
        die("partition returned 500 instead of 503 — see above")
