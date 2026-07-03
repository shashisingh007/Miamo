"""Prisma ops: generate, migrate, seed, studio.

Ports docker/migrate-and-seed.sh (migrate deploy + conditional seed) and
adds the everyday dev verbs. All commands shell out to `npx prisma ...`
from services/shared/.
"""

from __future__ import annotations

import shutil
import subprocess
import sys

import click

from ..config import ROOT
from ..shell import die, note, ok, step

PRISMA_CWD = ROOT / "services" / "shared"


def _ensure_prisma() -> None:
    if not shutil.which("npx"):
        die("npx not on PATH", "install Node.js 18+")
    if not (PRISMA_CWD / "prisma" / "schema.prisma").exists():
        die(
            f"schema.prisma not found under {PRISMA_CWD}/prisma",
            "run from a clean checkout of the Miamo repo",
        )


def _npx(args: list[str], *, capture: bool = False) -> subprocess.CompletedProcess:
    """Run `npx <args>` from services/shared/."""
    try:
        return subprocess.run(
            ["npx", *args],
            cwd=str(PRISMA_CWD),
            check=False,
            capture_output=capture,
            text=True,
        )
    except KeyboardInterrupt:
        die("interrupted")


@click.group()
def prisma_group() -> None:
    """Prisma ops: generate, migrate, seed, studio."""


@prisma_group.command()
def generate() -> None:
    """Regenerate the Prisma client (services/shared/node_modules/@prisma/client)."""
    _ensure_prisma()
    step("npx prisma generate")
    r = _npx(["prisma", "generate"])
    if r.returncode != 0:
        die(f"prisma generate exited {r.returncode}")
    ok("prisma client regenerated")


@prisma_group.command()
@click.option("--dev", is_flag=True, help="Use `migrate dev` (creates a new migration) instead of `migrate deploy`.")
@click.option("--name", default=None, help="Migration name (--dev only)")
def migrate(dev: bool, name: str | None) -> None:
    """Apply pending migrations (production-safe by default: `migrate deploy`)."""
    _ensure_prisma()
    if dev:
        args = ["prisma", "migrate", "dev"]
        if name:
            args += ["--name", name]
        step(" ".join(["npx", *args]))
    else:
        args = ["prisma", "migrate", "deploy"]
        step("npx prisma migrate deploy")
    r = _npx(args)
    if r.returncode != 0:
        die(f"prisma migrate exited {r.returncode}")
    ok("migrations applied")


@prisma_group.command()
@click.option("--force", is_flag=True, help="Seed even if User count > 0")
def seed(force: bool) -> None:
    """Run prisma/seed.ts. By default skips if the User table is non-empty."""
    _ensure_prisma()
    seed_script = PRISMA_CWD / "prisma" / "seed.ts"
    if not seed_script.exists():
        die(f"seed script not found: {seed_script}")

    if not force:
        step("checking if seed needed (SELECT COUNT(*) FROM \"User\")")
        try:
            r = subprocess.run(
                ["npx", "prisma", "db", "execute", "--stdin"],
                cwd=str(PRISMA_CWD),
                input='SELECT COUNT(*)::int FROM "User";',
                capture_output=True,
                text=True,
                check=False,
            )
        except KeyboardInterrupt:
            die("interrupted")
        digits = "".join(ch for ch in (r.stdout or "") if ch.isdigit())
        user_count = int(digits or "0")
        if user_count > 0:
            note(f"database already seeded ({user_count} users) — skipping (pass --force to override)")
            return

    step("npx tsx prisma/seed.ts")
    try:
        r = subprocess.run(
            ["npx", "tsx", "prisma/seed.ts"],
            cwd=str(PRISMA_CWD),
            check=False,
        )
    except KeyboardInterrupt:
        die("interrupted mid-seed", "database may be in a partial state")
    if r.returncode != 0:
        die(f"seed exited {r.returncode}")
    ok("seed complete")


@prisma_group.command()
def studio() -> None:
    """Launch Prisma Studio (interactive DB browser on :5555)."""
    _ensure_prisma()
    step("npx prisma studio")
    try:
        r = _npx(["prisma", "studio"])
    except KeyboardInterrupt:
        note("studio stopped")
        return
    if r.returncode != 0:
        sys.exit(r.returncode)


@prisma_group.command("migrate-and-seed")
def migrate_and_seed() -> None:
    """One-shot: `migrate deploy` then conditional seed (mirrors docker/migrate-and-seed.sh)."""
    _ensure_prisma()
    step("npx prisma migrate deploy")
    r = _npx(["prisma", "migrate", "deploy"])
    if r.returncode != 0:
        die(f"prisma migrate deploy exited {r.returncode}")
    ok("migrations applied")

    # Delegate to seed() semantics: re-invoke via Click so behaviour stays in one place.
    ctx = click.get_current_context()
    ctx.invoke(seed, force=False)
    ok("migrate-and-seed complete")
