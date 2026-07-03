"""miamo — root Click group.

Flat verbs (`miamo start`, `miamo stop`, …) target local mode by default.
Mode groups (`miamo local`, `miamo docker`, `miamo k8s`) expose the full menu.
"""

from __future__ import annotations

import sys

import click

from . import __version__
from .commands import (
    chaos,
    data,
    db,
    dev,
    docker_mode,
    health,
    k8s,
    load,
    local,
    mobile,
    monitor,
    prisma,
    release,
    router,
    service,
    setup as setup_cmd,
)


@click.group(context_settings={"help_option_names": ["-h", "--help"]})
@click.version_option(__version__, "-v", "--version", prog_name="miamo")
def main() -> None:
    """Miamo unified operations CLI.

    Every verb accepts an optional MODE (local | docker | k8s) and, where
    it makes sense, an optional SERVICE. Defaults: mode=local, service=all.

    \b
    Quickstart:
        miamo start                        # local: 7 services + web
        miamo start local gateway          # start only the gateway
        miamo start docker                 # docker compose up
        miamo start k8s                    # kubectl apply -f k8s/
        miamo status                       # health/status table (local)
        miamo status docker                # docker compose ps
        miamo restart local auth           # restart auth service
        miamo kill gateway                 # SIGKILL a stuck service
        miamo logs gateway -f              # tail + follow logs
        miamo top -n 5m                    # 5-min CPU + RAM averages
        miamo health docker                # docker compose health
        miamo diagnose                     # full troubleshooting sweep
        miamo data users                   # list live users from DB

    See `miamo <command> -h` for options.
    """


# ─── Top-level verbs — accept [MODE] [SERVICE] positional args ───────────────
# Router turns `miamo start local gateway` into "start only gateway (local)",
# `miamo start docker` into "docker compose up", etc.  See router.py.
main.add_command(router.start)
main.add_command(router.stop)
main.add_command(router.kill)
main.add_command(router.restart)
main.add_command(router.status)
main.add_command(router.logs)

# ─── Mode groups deleted — the router now covers every combination.
#     The `local`, `docker`, `k8s`, and `service` sub-groups are gone from
#     top-level help. Their underlying module functions remain importable so
#     the router can keep dispatching to them internally.

# ─── Mobile (Expo) ──────────────────────────────────────────────────────────
# Kept as a sub-group because mobile is its own runtime (Expo/EAS), not a
# "mode" of the backend services.
main.add_command(mobile.mobile_group, name="mobile")

# ─── Ops: data, db, prisma, chaos, load, release ────────────────────────────
main.add_command(data.data_group, name="data")
main.add_command(db.db_group, name="db")
main.add_command(prisma.prisma_group, name="prisma")
main.add_command(chaos.chaos_group, name="chaos")
main.add_command(load.load_group, name="load")
main.add_command(release.rollback)  # top-level `miamo rollback <tag>`

# ─── Monitoring + troubleshooting (mode-aware via router) ───────────────────
# All of these take an optional [MODE] positional (local | docker | k8s).
main.add_command(router.health)
main.add_command(router.top)
main.add_command(router.mem)
main.add_command(router.cpu)
main.add_command(router.uptime)
main.add_command(router.tail)
main.add_command(router.diagnose)
# `users-live` and `activity` query the DB directly — mode doesn't matter.
main.add_command(monitor.users_live, name="users-live")
main.add_command(monitor.activity)

# ─── Dev conveniences ───────────────────────────────────────────────────────
main.add_command(dev.test)
main.add_command(dev.typecheck)
main.add_command(dev.env)
main.add_command(dev.open_cmd, name="open")
main.add_command(dev.psql)
main.add_command(dev.redis_cmd, name="redis")
main.add_command(dev.ports)
main.add_command(dev.version)
main.add_command(dev.where)

# ─── Setup / prereqs ────────────────────────────────────────────────────────
main.add_command(setup_cmd.setup)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
