"""Database ops: backup + restore of the local Miamo Postgres container.

Ports scripts/backup-postgres.sh — but targets the *local* docker Postgres
(what devs actually back up) instead of an S3 upload. The prod path
(pg_dump against $DATABASE_URL + S3 upload) is unchanged and still lives
in the bash script.
"""

from __future__ import annotations

import datetime
import gzip
import subprocess
from pathlib import Path

import click

from ..config import POSTGRES_CANDIDATE_NAMES, POSTGRES_DB, POSTGRES_USER
from ..env import ensure_docker_daemon
from ..shell import die, note, ok, step

BACKUP_DIR = Path("/tmp/miamo-backups")


def _find_postgres_container() -> str | None:
    """Return the first Postgres container name that is currently running.

    Auto-starts the Docker daemon first (Colima on Mac, systemd on Linux)
    so a cold `miamo db backup` after a reboot Just Works.
    """
    ensure_docker_daemon()
    try:
        r = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return None
    running = set((r.stdout or "").splitlines())
    for name in POSTGRES_CANDIDATE_NAMES:
        if name in running:
            return name
    return None


def _prune(keep: int) -> None:
    """Keep only the N most-recent miamo-*.sql.gz backups."""
    if keep <= 0:
        return
    if not BACKUP_DIR.exists():
        return
    files = sorted(
        BACKUP_DIR.glob("miamo-*.sql.gz"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for old in files[keep:]:
        try:
            old.unlink()
            note(f"pruned old backup: {old.name}")
        except OSError:
            pass


@click.command()
@click.option("--output", "-o", type=click.Path(), default=None, help="Custom output path")
@click.option("--keep", default=7, show_default=True, help="Keep N most recent backups")
def backup(output: str | None, keep: int) -> None:
    """Backup Postgres to /tmp/miamo-backups/miamo-<timestamp>.sql.gz."""
    container = _find_postgres_container()
    if not container:
        die(
            "no running postgres container",
            "run `miamo start` first, or `docker ps` to see what's up",
        )
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.datetime.now(datetime.UTC).strftime("%Y%m%dT%H%M%SZ")
    path = Path(output) if output else BACKUP_DIR / f"miamo-{ts}.sql.gz"
    step(f"pg_dumpall -> {path} (via {container})")

    p: subprocess.Popen | None = None
    try:
        with gzip.open(path, "wb") as gz:
            p = subprocess.Popen(
                ["docker", "exec", container, "pg_dumpall", "-U", POSTGRES_USER],
                stdout=subprocess.PIPE,
            )
            assert p.stdout is not None
            for chunk in iter(lambda: p.stdout.read(65536), b""):
                gz.write(chunk)
            p.wait()
    except KeyboardInterrupt:
        if p is not None:
            p.terminate()
        try:
            path.unlink(missing_ok=True)
        except OSError:
            pass
        die("interrupted", "partial dump removed")
    if p is None or p.returncode != 0:
        die(f"pg_dumpall exited {p.returncode if p else '?'}")

    size_bytes = path.stat().st_size
    if size_bytes < 1024:
        try:
            path.unlink()
        except OSError:
            pass
        die(
            f"dump too small ({size_bytes} bytes) — probable silent failure",
            "check `docker logs miamo-postgres`",
        )
    size_mb = size_bytes / (1024 * 1024)
    ok(f"backup complete: {path} ({size_mb:.1f} MB)")
    _prune(keep)


@click.command()
@click.argument("path", type=click.Path(exists=True, dir_okay=False))
@click.confirmation_option(prompt="This will REPLACE the current database — continue?")
def restore(path: str) -> None:
    """Restore Postgres from a .sql.gz backup created by `miamo db backup`."""
    container = _find_postgres_container()
    if not container:
        die("no running postgres container", "run `miamo start` first")
    step(f"restoring from {path} -> {container}")

    p: subprocess.Popen | None = None
    try:
        with gzip.open(path, "rb") as gz:
            p = subprocess.Popen(
                ["docker", "exec", "-i", container, "psql", "-U", POSTGRES_USER, "-d", POSTGRES_DB],
                stdin=subprocess.PIPE,
            )
            assert p.stdin is not None
            for chunk in iter(lambda: gz.read(65536), b""):
                p.stdin.write(chunk)
            p.stdin.close()
            p.wait()
    except KeyboardInterrupt:
        if p is not None:
            p.terminate()
        die("interrupted mid-restore", "database may be in a partial state")
    if p is None or p.returncode != 0:
        die(f"psql restore exited {p.returncode if p else '?'}")
    ok("restore complete")


@click.group()
def db_group() -> None:
    """Database ops (backup, restore)."""


db_group.add_command(backup)
db_group.add_command(restore)
