"""`miamo health` — probe every backend service + web in parallel.

Reports HTTP status + latency in a Rich table, or JSON for scripting.
`--watch` refreshes every 3 seconds until Ctrl-C.
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor

import click
import requests
from rich.console import Console
from rich.table import Table

from ..config import SERVICES, WEB_PORT

console = Console()


def _probe(url: str, timeout: float = 2.0):
    """GET `url` once. Return (status_code|None, latency_ms|error_str)."""
    t0 = time.time()
    try:
        r = requests.get(url, timeout=timeout)
        return r.status_code, int((time.time() - t0) * 1000)
    except Exception as e:  # noqa: BLE001 — surface any connection failure
        return None, str(e)


@click.command()
@click.option("--json", "json_out", is_flag=True, help="Emit JSON")
@click.option("--watch", is_flag=True, help="Refresh every 3s")
def health(json_out: bool, watch: bool) -> None:
    """Probe /healthz on every service + / on web."""

    def once():
        rows = []
        with ThreadPoolExecutor(max_workers=8) as pool:
            futs = {}
            for name, port in SERVICES:
                futs[pool.submit(_probe, f"http://localhost:{port}/healthz")] = (name, port)
            futs[pool.submit(_probe, f"http://localhost:{WEB_PORT}")] = ("web", WEB_PORT)
            for fut, (name, port) in futs.items():
                status, meta = fut.result()
                rows.append((name, port, status, meta))
        # Stable ordering: services in config order, web last.
        order = {n: i for i, (n, _) in enumerate(SERVICES)}
        order["web"] = len(SERVICES)
        rows.sort(key=lambda r: order.get(r[0], 999))
        return rows

    def render(rows):
        if json_out:
            import json as _j

            payload = [
                {
                    "service": n,
                    "port": p,
                    "status": s,
                    "latency_ms": m if isinstance(m, int) else None,
                    "error": m if not isinstance(m, int) else None,
                }
                for n, p, s, m in rows
            ]
            print(_j.dumps(payload, indent=2))
            return
        t = Table(title="Miamo health", show_lines=False)
        t.add_column("Service")
        t.add_column("Port")
        t.add_column("Status")
        t.add_column("Latency / Error")
        for name, port, status, meta in rows:
            if status == 200:
                status_str = "[green]200[/green]"
            elif status is None:
                status_str = "[red]DOWN[/red]"
            else:
                status_str = f"[yellow]{status}[/yellow]"
            meta_str = f"{meta}ms" if isinstance(meta, int) else str(meta)
            t.add_row(name, str(port), status_str, meta_str)
        console.print(t)

    if watch:
        try:
            while True:
                console.clear()
                render(once())
                console.print("[dim]refreshing every 3s — Ctrl-C to stop[/dim]")
                time.sleep(3)
        except KeyboardInterrupt:
            console.print("\n[dim]stopped[/dim]")
    else:
        render(once())
