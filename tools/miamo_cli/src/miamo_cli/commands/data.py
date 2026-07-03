"""`miamo data` — inspect the live Postgres database via `docker exec psql`.

No Python DB driver dependency: everything shells out to the running
`miamo-postgres` container and parses `row_to_json` output.

Column names come from services/shared/prisma/schema.prisma. Prisma quotes
mixed-case identifiers, so every mixed-case column here is double-quoted.
"""

from __future__ import annotations

import csv
import json
import subprocess
import sys

import click
from rich.console import Console
from rich.table import Table

from ..config import POSTGRES_CANDIDATE_NAMES, POSTGRES_DB, POSTGRES_USER
from ..env import ensure_docker_daemon
from ..shell import die

console = Console()


def _postgres_container() -> str | None:
    """Return the first running container name that matches our candidates.

    Also ensures the Docker daemon is up before probing — otherwise `docker ps`
    would silently return empty and the caller would report a misleading
    "no postgres container" instead of the real "docker isn't running".
    """
    ensure_docker_daemon()
    try:
        out = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            timeout=5,
        ).stdout.splitlines()
    except (subprocess.SubprocessError, FileNotFoundError):
        return None
    for name in POSTGRES_CANDIDATE_NAMES:
        if name in out:
            return name
    return None


def _psql_json(query: str) -> list[dict]:
    """Run a SELECT and return list of dicts, using row_to_json for stability."""
    container = _postgres_container()
    if not container:
        die("no running postgres container", "run `miamo start` first")
    wrapped = f"SELECT json_agg(row_to_json(t)) FROM ({query}) t;"
    try:
        r = subprocess.run(
            [
                "docker",
                "exec",
                container,
                "psql",
                "-U",
                POSTGRES_USER,
                "-d",
                POSTGRES_DB,
                "-A",
                "-t",
                "-c",
                wrapped,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except subprocess.TimeoutExpired:
        die("psql timed out")
    if r.returncode != 0:
        # Never leak the wrapped query (may contain user input) — just stderr's
        # first line, and never any env/password bytes.
        stderr = (r.stderr or "").strip().splitlines()
        msg = stderr[0] if stderr else "psql exited non-zero"
        # Defensive: strip anything that looks like a URI with credentials.
        msg = msg.replace(f"{POSTGRES_USER}:{POSTGRES_USER}@", "***@")
        die("psql failed", msg)
    raw = (r.stdout or "").strip()
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return parsed or []


@click.group()
def data_group() -> None:
    """Inspect live data: users, matches, messages, activity."""


# ─── users ───────────────────────────────────────────────────────────────────
@data_group.command("users")
@click.option("--limit", "-n", default=20, help="How many rows")
@click.option("--search", "-s", help="Filter by username/email/displayName substring")
@click.option("--admin", is_flag=True, help="Only show admins")
@click.option("--verified", is_flag=True, help="Only show verified users")
@click.option("--json", "json_out", is_flag=True, help="Emit JSON")
@click.option("--csv", "csv_out", is_flag=True, help="Emit CSV")
def users(limit, search, admin, verified, json_out, csv_out) -> None:
    """List users from the live database."""
    where = ["1=1"]
    if search:
        s = search.replace("'", "''")
        where.append(
            f"(username ILIKE '%{s}%' OR email ILIKE '%{s}%' OR \"displayName\" ILIKE '%{s}%')"
        )
    if admin:
        where.append('"isAdmin" = true')
    if verified:
        where.append("verified = true")
    q = f"""
        SELECT id, username, email, "displayName", verified, premium, "isAdmin",
               "miamoId", phone, "createdAt"::text AS "createdAt"
        FROM "User"
        WHERE {' AND '.join(where)}
        ORDER BY "createdAt" DESC
        LIMIT {int(limit)}
    """
    rows = _psql_json(q) or []
    if json_out:
        print(json.dumps(rows, indent=2, default=str))
        return
    if csv_out:
        if not rows:
            return
        w = csv.DictWriter(sys.stdout, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
        return
    t = Table(title=f"Users (showing {len(rows)})")
    for col in [
        "id",
        "username",
        "displayName",
        "email",
        "verified",
        "premium",
        "admin",
        "miamoId",
        "created",
    ]:
        t.add_column(col)
    for r in rows:
        t.add_row(
            (r.get("id") or "")[:8],
            r.get("username") or "",
            r.get("displayName") or "",
            r.get("email") or "",
            "yes" if r.get("verified") else "",
            "yes" if r.get("premium") else "",
            "yes" if r.get("isAdmin") else "",
            r.get("miamoId") or "",
            (r.get("createdAt") or "")[:10],
        )
    console.print(t)


# ─── user (single) ───────────────────────────────────────────────────────────
@data_group.command("user")
@click.argument("identifier")
def user_detail(identifier: str) -> None:
    """Show all fields for one user (id, username, or email)."""
    ident = identifier.replace("'", "''")
    q = f"""
        SELECT * FROM "User"
        WHERE id = '{ident}' OR username = '{ident}' OR email = '{ident}'
        LIMIT 1
    """
    rows = _psql_json(q)
    if not rows:
        die(f"no user matching '{identifier}'")
    u = rows[0]
    t = Table(show_header=False)
    t.add_column("Field", style="cyan")
    t.add_column("Value")
    for k, v in u.items():
        # Never surface a password-hash column even if someone SELECTs *.
        if k == "passwordHash":
            display = "<redacted>"
        elif v is None:
            display = "—"
        else:
            display = str(v)
        t.add_row(k, display)
    console.print(t)


# ─── matches ─────────────────────────────────────────────────────────────────
@data_group.command("matches")
@click.option("--limit", "-n", default=20)
def matches(limit: int) -> None:
    """Recent matches."""
    q = f"""
        SELECT m.id, m."user1Id", m."user2Id", m.active, m."createdAt"::text AS "createdAt",
               (SELECT username FROM "User" WHERE id = m."user1Id") AS user_a,
               (SELECT username FROM "User" WHERE id = m."user2Id") AS user_b
        FROM "Match" m
        ORDER BY m."createdAt" DESC
        LIMIT {int(limit)}
    """
    rows = _psql_json(q) or []
    t = Table(title=f"Recent matches ({len(rows)})")
    for col in ["match id", "user a", "user b", "active", "when"]:
        t.add_column(col)
    for r in rows:
        t.add_row(
            (r.get("id") or "")[:8],
            r.get("user_a") or "?",
            r.get("user_b") or "?",
            "yes" if r.get("active") else "no",
            (r.get("createdAt") or "")[:19],
        )
    console.print(t)


# ─── messages ────────────────────────────────────────────────────────────────
@data_group.command("messages")
@click.option("--limit", "-n", default=20)
def messages(limit: int) -> None:
    """Recent messages (redacted content — shows length only)."""
    q = f"""
        SELECT m.id, m."chatId", m."senderId",
               (SELECT username FROM "User" WHERE id = m."senderId") AS sender,
               LENGTH(m.content) AS chars,
               m.type,
               m."createdAt"::text AS "createdAt"
        FROM "Message" m
        ORDER BY m."createdAt" DESC
        LIMIT {int(limit)}
    """
    rows = _psql_json(q) or []
    t = Table(title=f"Recent messages ({len(rows)})")
    for col in ["msg id", "chat", "sender", "type", "chars", "when"]:
        t.add_column(col)
    for r in rows:
        t.add_row(
            (r.get("id") or "")[:8],
            (r.get("chatId") or "")[:8],
            r.get("sender") or "?",
            r.get("type") or "text",
            str(r.get("chars") or 0),
            (r.get("createdAt") or "")[:19],
        )
    console.print(t)


# ─── stats ───────────────────────────────────────────────────────────────────
@data_group.command("stats")
def stats() -> None:
    """Row counts + latest row for every major table."""
    # Prisma model → table name (Prisma keeps model casing verbatim as table
    # names unless @@map is set; FeedPost is the actual table, not Post.)
    tables = [
        "User",
        "Match",
        "Message",
        "Chat",
        "Notification",
        "Session",
        "NotificationDevice",
        "FeedPost",
        "Story",
    ]
    t = Table(title="Miamo data stats")
    t.add_column("Table")
    t.add_column("Rows", justify="right")
    t.add_column("Latest row")
    for tbl in tables:
        try:
            count = _psql_json(f'SELECT COUNT(*)::int AS n FROM "{tbl}"')
            n = count[0]["n"] if count else 0
            latest = _psql_json(
                f'SELECT "createdAt"::text AS ts FROM "{tbl}" ORDER BY "createdAt" DESC LIMIT 1'
            )
            ts = (latest[0]["ts"][:19]) if latest and latest[0].get("ts") else "—"
            t.add_row(tbl, str(n), ts)
        except SystemExit:
            # _psql_json → die() raises SystemExit; convert to a "?" row instead
            # so a single missing table doesn't kill the whole stats view.
            t.add_row(tbl, "?", "—")
        except Exception:  # noqa: BLE001
            t.add_row(tbl, "?", "—")
    console.print(t)


# ─── sql ─────────────────────────────────────────────────────────────────────
@data_group.command("sql")
@click.argument("query", nargs=-1, required=True)
@click.option("--limit", "-n", default=50, help="Safety cap on rows returned")
def sql(query, limit: int) -> None:
    """Run a read-only SELECT query.

    Example: miamo data sql 'SELECT COUNT(*) FROM "User"'
    """
    q = " ".join(query).strip().rstrip(";")
    stripped = q.lstrip().lower()
    # Reject anything that isn't a straight SELECT / WITH. Also block obvious
    # mutation keywords that could hide inside a CTE.
    if not (stripped.startswith("select") or stripped.startswith("with")):
        die(
            "only SELECT queries allowed",
            "read-only surface; wrap writes in a migration instead",
        )
    banned = (
        " insert ",
        " update ",
        " delete ",
        " drop ",
        " alter ",
        " truncate ",
        " grant ",
        " revoke ",
        " create ",
        " copy ",
    )
    padded = f" {stripped} "
    if any(tok in padded for tok in banned):
        die("mutation keyword detected", "SELECT-only")
    # Only append LIMIT if the query doesn't already have one.
    q_capped = q if " limit " in f" {stripped} " else f"{q} LIMIT {int(limit)}"
    rows = _psql_json(q_capped) or []
    if not rows:
        console.print("[dim](no rows)[/dim]")
        return
    t = Table()
    for col in rows[0].keys():
        t.add_column(col)
    for r in rows:
        t.add_row(*[str(v) if v is not None else "—" for v in r.values()])
    console.print(t)
