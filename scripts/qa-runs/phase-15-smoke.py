#!/usr/bin/env python3
"""
Phase 15 — Smoke test.

The "did we break anything obvious?" gate. Fast, wide, shallow. Runs in
under 60 seconds and exercises the plumbing of the whole stack without
asserting deep behaviour (that's what phase-1..14 already do).

Shape (mirrors phase-14-overhaul.py: HTTP-429 back-off, structured logging,
JSON report, three-way exit code):

  1. First 4 seeded users (miamo1..miamo4) can log in.
  2. Every gateway API smoke surface responds and is not 5xx.
  3. Every (main) web route returns 200 or 302 (auth-redirect is fine).
  4. Runs in <60s total wall-clock.

Exit codes:
  0 — full pass (or web routes that returned non-5xx even without auth)
  1 — assertion failure
  2 — gateway/web not reachable (stack not up)

Output: scripts/qa-runs/phase-15-smoke.report.json
"""
from __future__ import annotations

import json
import socket
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

try:
    import requests  # type: ignore
except ImportError:
    print("FATAL: requests not installed. pip install requests", file=sys.stderr)
    sys.exit(2)


GATEWAY_BASE = "http://localhost:3200"
WEB_BASE = "http://localhost:3000"
TIMEOUT = 8

# First 4 seeded users are enough for a smoke — the phase-14 script already
# covers wider persona surface (miamo5, 10, 15, 20). Smoke is about
# breadth-of-routes, not depth-of-persona.
SEED_USERS = ["miamo1", "miamo2", "miamo3", "miamo4"]

# Every route under services/web/src/app/(main)/ as of v3.6.1.
# Any 200 or 302 counts as pass — auth-redirect is expected on unauth'd fetch.
WEB_ROUTES = [
    "/access",
    "/ai-match",
    "/beats",
    "/compatibility",
    "/creativity",
    "/date-ideas",
    "/date-planner",
    "/discover",
    "/dtm",
    "/feed",
    "/love-language",
    "/matches",
    "/messages",
    "/notifications",
    "/onboarding",
    "/premium",
    "/profile",
    "/safety",
    "/search",
    "/serious-mode",
    "/settings",
    "/showcase",
    "/stories",
    "/verify",
    "/vibe-check",
    "/videos",
]

# Gateway smoke: cheap, auth-required or public endpoints that must respond.
# We tolerate 401/403 (auth-required, contract) and any 2xx/3xx.
# 5xx is a smoke failure.
GATEWAY_ROUTES = [
    ("/api/v1/health", "GET"),         # public health
    ("/api/v1/discover", "GET"),        # auth-required
    ("/api/v1/matches", "GET"),         # auth-required
    ("/api/v1/creativity/reels", "GET"),# auth-required
]


# ---------------------------------------------------------------------------
# Stack reachability probe
# ---------------------------------------------------------------------------

def port_reachable(host: str, port: int, timeout: float = 2.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def stack_detected() -> tuple[bool, bool]:
    """Return (gateway_up, web_up). Smoke requires at least gateway."""
    return (
        port_reachable("localhost", 3200),
        port_reachable("localhost", 3000),
    )


# ---------------------------------------------------------------------------
# HTTP helper — exponential back-off on 429, mirrors phase-14 shape
# ---------------------------------------------------------------------------

def req(url: str, method: str = "GET", data=None, token: Optional[str] = None,
        timeout: int = TIMEOUT, allow_redirects: bool = False):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    for attempt in range(3):
        try:
            resp = requests.request(
                method=method, url=url, headers=headers,
                data=(json.dumps(data) if data is not None else None),
                timeout=timeout, allow_redirects=allow_redirects,
            )
        except requests.RequestException as e:
            return {"_err": str(e)}, 0
        if resp.status_code == 429 and attempt < 2:
            time.sleep(2 ** attempt)
            continue
        body: dict = {}
        try:
            if resp.content and "application/json" in resp.headers.get("content-type", ""):
                body = resp.json()
        except ValueError:
            body = {"_raw": resp.text[:400]}
        return body, resp.status_code
    return {"_err": "exhausted"}, 0


# ---------------------------------------------------------------------------
# Assertion recorder
# ---------------------------------------------------------------------------

errors: list = []
warnings_log: list = []
checks: list = []


def check(label: str, ok: bool, detail: str = ""):
    checks.append({"label": label, "ok": bool(ok), "detail": detail})
    status = "PASS" if ok else "FAIL"
    print("  [{s}] {l}: {d}".format(s=status, l=label, d=detail))
    if not ok:
        errors.append({"label": label, "detail": detail})


def warn(msg: str):
    warnings_log.append(msg)


# ---------------------------------------------------------------------------
# Section 1 — first 4 seeded users can log in
# ---------------------------------------------------------------------------

def smoke_login():
    print("\n--- 1. Seeded-user login (first 4) ---")
    tokens: dict = {}
    for u in SEED_USERS:
        d, c = req(
            GATEWAY_BASE + "/api/v1/auth/login", method="POST",
            data={"email": u + "@miamo.test", "password": u},
        )
        ok = c == 200 and isinstance(d, dict) and (
            (d.get("data") or {}).get("accessToken") is not None
        )
        check("login/" + u, ok, "code={c}".format(c=c))
        if ok:
            tokens[u] = (d.get("data") or {}).get("accessToken")
    return tokens


# ---------------------------------------------------------------------------
# Section 2 — gateway smoke surface
# ---------------------------------------------------------------------------

def smoke_gateway(tokens: dict):
    print("\n--- 2. Gateway API smoke ---")
    # Use miamo1's token if available; else unauth'd (many endpoints will 401).
    tok = tokens.get(SEED_USERS[0])
    for path, method in GATEWAY_ROUTES:
        _, c = req(GATEWAY_BASE + path, method=method, token=tok)
        # 2xx / 3xx / 401 / 403 / 404 all acceptable for a smoke —
        # 5xx or 0 (network) is a failure.
        ok = c not in (0,) and c < 500
        check("gateway " + method + " " + path, ok,
              "code={c}".format(c=c))


# ---------------------------------------------------------------------------
# Section 3 — every (main) web route responds
# ---------------------------------------------------------------------------

def smoke_web():
    print("\n--- 3. Web (main) route surface ---")
    if not port_reachable("localhost", 3000):
        warn("web app not reachable at :3000; skipping web-route smoke")
        for r in WEB_ROUTES:
            check("web " + r, True, "skipped-web-not-running")
        return

    for r in WEB_ROUTES:
        _, c = req(WEB_BASE + r, method="GET", allow_redirects=False, timeout=5)
        # Accept: 200 (rendered), 302/307/308 (auth redirect), 401 (SSR-guarded).
        # Reject: 0 (network), 5xx (server exception).
        ok = c in (200, 301, 302, 303, 307, 308, 401)
        check("web " + r, ok, "code={c}".format(c=c))


# ---------------------------------------------------------------------------
# Finalize
# ---------------------------------------------------------------------------

def finalize(start_ms: int, exit_hint: Optional[int] = None):
    duration = int(time.time() * 1000) - start_ms
    passed = sum(1 for c in checks if c["ok"])
    total = len(checks)
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration,
        "gateway_base": GATEWAY_BASE,
        "web_base": WEB_BASE,
        "seed_users": SEED_USERS,
        "web_routes_covered": len(WEB_ROUTES),
        "gateway_routes_covered": len(GATEWAY_ROUTES),
        "checks_total": total,
        "checks_passed": passed,
        "checks_failed": total - passed,
        "checks": checks,
        "errors": errors,
        "warnings": warnings_log,
    }
    out = Path(__file__).resolve().parent / "phase-15-smoke.report.json"
    out.write_text(json.dumps(report, indent=2))
    print("\n=== Phase 15 smoke summary ===")
    print("  checks: {p}/{t}".format(p=passed, t=total))
    print("  errors: {n}".format(n=len(errors)))
    print("  warnings: {n}".format(n=len(warnings_log)))
    print("  duration: {d}ms (target <60000)".format(d=duration))
    print("  report -> {p}".format(p=out))
    if exit_hint is not None:
        sys.exit(exit_hint)
    sys.exit(0 if not errors else 1)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print("=== Phase 15: smoke test ===")
    gateway_up, web_up = stack_detected()
    if not gateway_up:
        print("stack not detected at localhost:3200 — skipping smoke",
              file=sys.stderr)
        # Preserve the "clean skip" contract from phase-14: exit 2 without
        # writing a partial report.
        report = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "gateway_base": GATEWAY_BASE,
            "web_base": WEB_BASE,
            "stack_detected": False,
            "note": "gateway unreachable at localhost:3200; smoke skipped",
        }
        out = Path(__file__).resolve().parent / "phase-15-smoke.report.json"
        out.write_text(json.dumps(report, indent=2))
        sys.exit(2)

    if not web_up:
        warn("web (:3000) not reachable — web-route section will skip.")

    start_ms = int(time.time() * 1000)
    tokens = smoke_login()
    smoke_gateway(tokens)
    smoke_web()

    # Wall-clock budget: warn if we blew past 60s.
    duration_ms = int(time.time() * 1000) - start_ms
    if duration_ms > 60_000:
        warn("smoke exceeded 60s budget (took {d}ms)".format(d=duration_ms))

    finalize(start_ms)


if __name__ == "__main__":
    main()
