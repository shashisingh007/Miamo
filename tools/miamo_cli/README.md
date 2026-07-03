# miamo-cli

Python Click-based CLI that replaces `scripts/start.sh` and `scripts/setup.sh`.

## Install

```bash
cd tools/miamo_cli
pip install -e .
```

This exposes a `miamo` entry point on your `$PATH`.

## Quickstart

```bash
miamo start                  # local dev: 7 backend services + web + Postgres/Redis
miamo status                 # health table
miamo logs gateway -f        # tail one service
miamo stop                   # kill everything (containers keep running)

miamo docker up              # full docker-compose stack
miamo k8s deploy             # kubectl apply -f k8s/

miamo setup                  # install prereqs (mac/linux)
```

## Layout

```
tools/miamo_cli/
├── pyproject.toml
├── README.md
└── src/miamo_cli/
    ├── cli.py               # root Click group
    ├── config.py            # SERVICES, ports, paths
    ├── shell.py             # subprocess helpers + rich output
    ├── env.py               # .env loading, prereq checks, port clearing
    └── commands/
        ├── local.py         # start/stop/restart/status/logs (local mode)
        ├── docker_mode.py   # docker compose up/down/status/logs
        ├── k8s.py           # kubectl apply/delete/rollout
        └── setup.py         # prereqs installer
```

## Notes

- Local mode runs backend services with `npx tsx services/<name>/src/server.ts`.
- Postgres + Redis run in Docker (`miamo-postgres` or `miamo-postgres-local`, and `miamo-redis`).
- Logs go to `/tmp/miamo-logs/<service>.log`, PIDs to `/tmp/miamo-pids/<service>.pid`.
- Gateway health probe: `GET http://localhost:3200/healthz`.
