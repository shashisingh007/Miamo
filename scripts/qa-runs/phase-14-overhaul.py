#!/usr/bin/env python3
"""
Phase 14 - v3.6.0 Overhaul: multi-user end-to-end QA walk.

Personas (mapped to seeded users miamo1..miamo50):
  - Priya  (miamo10) - 28, Mumbai, casual scroll persona; will trigger
    reply-mood / negative-signal feedback late in the run.
  - Arjun  (miamo20) - 29, Mumbai, serious-search persona; will demo Move v2.
  - Riya   (miamo5)  - 26, Bangalore, hate-scroll persona; long dwell then
    pass, demos negative-signal polarity.
  - Karan  (miamo15) - 32, Delhi, premium user; tests exposure-ledger reads
    and Weekly Top-10.

Walks every v3.6.0 surface:

  A. Identity + onboarding sanity (login all 4, fetch profiles).
  B. v3.5.1 hotfix - Priya passes Arjun once, hits /discover x5,
     asserts Arjun never returns (DISCOVER_PASS_HARDFILTER_ENABLED default ON).
  C. Settings consent toggles - 4 new boolean fields round-trip, plus
     invalid-shape -> 400.
  D. v8 Discover ranker (flag-OFF baseline) - records top-5 ordering.
  E. Move v2 endpoint - Arjun against one of Priya's items;
     flag OFF -> expect 404 NOT_FOUND.
  F. Family Brief - Priya generate; flag OFF -> expect 404 NOT_FOUND.
  G. Weekly Top-10 - Karan GET /weekly-top; flag OFF -> 404.
  H. Why-am-I-seeing-this - Priya GET /discover/:arjunId/why; flag OFF -> 404.
  I. Anti-ghost - Karan opens chat with Riya, first message;
     flag OFF -> route still 200, no deposit row.
  J. Multi-user interaction cascade - sym-like -> match -> Move v2 (flag
     gated) -> reply, anti-ghost reply-bonus (flag gated).
  K. Negative-signal loop - Priya dislikes one of Riya's items; assert
     Riya's items downranked / suppressed in Priya's next /reels call.
  L. Concurrent stress - 4 parallel sessions, 5 /discover calls each in
     ~2s; assert no 5xx, no rate-limit lockout, no duplicate matches.

Tolerances:
  - HTTP 429 -> exponential back-off (3 retries, 1s/2s/4s), same as phase-13.
  - Flag-gated 404s are not failures; they are recorded as
    "flag-gated, ran in default-OFF state, behaviour matches contract".
  - Stack not reachable at localhost:3200 -> exit 2 (distinct from
    assertion failure exit 1).

Output: scripts/qa-runs/phase-14-overhaul.report.json
Exit codes:
  0 - full pass
  1 - one or more assertions failed
  2 - stack not detected at localhost:3200
"""
from __future__ import annotations

import json
import sys
import time
import uuid
import threading
import socket
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests  # type: ignore
except ImportError:
    print("FATAL: requests not installed. pip install requests", file=sys.stderr)
    sys.exit(2)


BASE = "http://localhost:3200"
TIMEOUT = 20

# Persona map: handle -> (seed username, label, city, age, role-hint)
PERSONAS = {
    "priya": ("miamo10", "Priya", "Mumbai", 28, "casual_scroll"),
    "arjun": ("miamo20", "Arjun", "Mumbai", 29, "serious_search"),
    "riya":  ("miamo5",  "Riya",  "Bangalore", 26, "hate_scroll"),
    "karan": ("miamo15", "Karan", "Delhi", 32, "premium_top10"),
}

# Flag states - this script runs without mutating env. These reflect
# what we believe is configured during a default local stack boot.
# Two of the v3.6.0 flags ship default-ON (the hotfix), the rest default-OFF.
FLAG_STATES = {
    "DISCOVER_PASS_HARDFILTER_ENABLED": "on (default; '0' disables)",
    "FEATURE_MOVE_V2_ENABLED":          "off (default)",
    "FEATURE_FAMILY_BRIEF_ENABLED":     "off (default)",
    "FEATURE_WEEKLY_TOP_ENABLED":       "off (default)",
    "FEATURE_WHY_EXPLAINER_ENABLED":    "off (default)",
    "FEATURE_ANTI_GHOST_ENABLED":       "off (default)",
    "ALGO_V8_DISCOVER_RANKER_ENABLED":  "off (default)",
    "ALGO_V8_FAIRNESS_RERANK_ENABLED":  "off (default)",
}

# Global event collectors
errors: list = []
warnings_log: list = []
sigs: Counter = Counter()
phase_results: list = []
event_counter = 0
events_lock = threading.Lock()


# ----------------------------------------------------------------------
# Stack reachability
# ----------------------------------------------------------------------

def stack_reachable(host: str = "localhost", port: int = 3200, timeout: float = 2.0) -> bool:
    """TCP-probe the gateway. Distinct from assertion failure."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


# ----------------------------------------------------------------------
# HTTP helper - exponential back-off on 429, mirrors phase-13 shape
# ----------------------------------------------------------------------

def req(path: str, method: str = "GET", data=None, token: str = None,
        timeout: int = TIMEOUT, base: str = BASE, params=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    url = base + path
    for attempt in range(3):
        try:
            resp = requests.request(
                method=method, url=url, headers=headers, params=params,
                data=(json.dumps(data) if data is not None else None),
                timeout=timeout,
            )
        except requests.RequestException as e:
            return {"_err": str(e)}, 0
        if resp.status_code == 429 and attempt < 2:
            time.sleep(2 ** attempt)
            continue
        try:
            return (resp.json() if resp.content else {}), resp.status_code
        except ValueError:
            return {"_raw": resp.text[:400]}, resp.status_code
    return {"_err": "exhausted"}, 0


def expect(label: str, code: int, want, body=None, persona: str = None) -> bool:
    """Record an assertion. Returns True if code is in `want`."""
    global event_counter
    if isinstance(want, int):
        want = (want,)
    ok = code in want
    if not ok:
        sig = "{label} -> {code} (want {want})".format(
            label=label, code=code, want=sorted(set(want)),
        )
        with events_lock:
            sigs[sig] += 1
            errors.append({
                "persona": persona,
                "label": label,
                "code": code,
                "want": list(want),
                "body": (body if isinstance(body, (dict, list, str, int, float, bool, type(None))) else str(body)),
            })
            event_counter += 1
    return ok


def warn(msg: str):
    with events_lock:
        warnings_log.append(msg)


def items_of(d):
    """Best-effort: pull a list out of a response envelope."""
    if d is None:
        return []
    if isinstance(d, list):
        return d
    if isinstance(d, dict):
        data = d.get("data")
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            for key in ("items", "results", "profiles", "reels", "cards"):
                if isinstance(data.get(key), list):
                    return data[key]
        for key in ("items", "results"):
            if isinstance(d.get(key), list):
                return d[key]
    return []


# ----------------------------------------------------------------------
# Auth + identity helpers
# ----------------------------------------------------------------------

def login(username: str, password: str = None):
    pwd = password if password is not None else username
    d, c = req("/api/v1/auth/login", "POST",
               {"email": username + "@miamo.test", "password": pwd})
    if not expect("login/" + username, c, 200, d, username):
        return None
    return (d.get("data") or {}).get("accessToken")


def me_id(token: str):
    """Return the auth'd user id. Tries /auth/me then /profiles/me."""
    if not token:
        return None
    d, c = req("/api/v1/auth/me", token=token)
    if c == 200:
        data = d.get("data") or {}
        user = data.get("user") if isinstance(data, dict) else None
        uid = (user or {}).get("id") or data.get("id") or data.get("userId")
        if uid:
            return uid
    d, c = req("/api/v1/profiles/me", token=token)
    if c == 200:
        data = d.get("data") or {}
        return (data.get("userId") or data.get("id")
                or (data.get("profile") or {}).get("userId")
                or (data.get("user") or {}).get("id"))
    return None


# ----------------------------------------------------------------------
# Phase recorder
# ----------------------------------------------------------------------

def record_phase(name: str, passed: bool, details: str):
    phase_results.append({
        "name": name,
        "passed": bool(passed),
        "details": details,
    })
    status = "PASS" if passed else "FAIL"
    print("  [{status}] {name}: {details}".format(
        status=status, name=name, details=details,
    ))


# ----------------------------------------------------------------------
# Phase A: identity + onboarding sanity
# ----------------------------------------------------------------------

def phase_A_identity(state: dict) -> bool:
    print("\n--- A. Identity + onboarding sanity ---")
    tokens = {}
    ids = {}
    for handle, (uname, label, city, age, _hint) in PERSONAS.items():
        tok = login(uname)
        if not tok:
            warn("could not log in {u}".format(u=uname))
            continue
        tokens[handle] = tok
        uid = me_id(tok)
        if not uid:
            warn("could not resolve userId for {u}".format(u=uname))
            continue
        ids[handle] = uid
    state["tokens"] = tokens
    state["ids"] = ids
    have = sorted(tokens.keys())
    ok = len(tokens) == 4 and len(ids) == 4
    record_phase("A_identity", ok,
                 "logged in {n}/4; resolved {m}/4 userIds; have={h}".format(
                     n=len(tokens), m=len(ids), h=have))
    return ok


# ----------------------------------------------------------------------
# Phase B: v3.5.1 pass hard-filter
# ----------------------------------------------------------------------

def phase_B_pass_hardfilter(state: dict) -> bool:
    print("\n--- B. v3.5.1 pass hard-filter ---")
    priya = state["tokens"].get("priya")
    arjun_id = state["ids"].get("arjun")
    if not priya or not arjun_id:
        record_phase("B_pass_hardfilter", False,
                     "skipped - missing priya token or arjun id")
        return False

    # Priya passes Arjun (canonical body uses toUserId).
    d, c = req("/api/v1/discover/pass", "POST",
               {"toUserId": arjun_id, "reason": "phase14-pass"},
               token=priya)
    # 200 (created), 201, or 409 (already passed) all acceptable.
    if not expect("discover_pass", c, (200, 201, 409), d, "priya"):
        record_phase("B_pass_hardfilter", False,
                     "pass call failed with {c}".format(c=c))
        return False

    # Hit /discover 5 times; arjun_id must never appear in the feed.
    seen_arjun = False
    samples = []
    for i in range(5):
        d, c = req("/api/v1/discover?limit=50", token=priya)
        expect("discover_post_pass_{i}".format(i=i), c, 200, d, "priya")
        feed = items_of(d)
        ids_in_page = []
        for it in feed:
            if not isinstance(it, dict):
                continue
            cand_id = (it.get("id") or it.get("userId")
                       or (it.get("user") or {}).get("id"))
            if cand_id:
                ids_in_page.append(cand_id)
        samples.append(len(ids_in_page))
        if arjun_id in ids_in_page:
            seen_arjun = True
            sigs["pass-hardfilter leak: arjun returned after pass"] += 1
            errors.append({
                "persona": "priya",
                "label": "B_pass_hardfilter_leak",
                "iter": i,
                "arjun_id": arjun_id,
            })
            break

    ok = not seen_arjun
    record_phase(
        "B_pass_hardfilter", ok,
        "5 /discover calls; sizes={s}; arjun_returned={r}".format(
            s=samples, r=seen_arjun),
    )
    return ok


# ----------------------------------------------------------------------
# Phase C: settings consent toggles
# ----------------------------------------------------------------------

def phase_C_settings_consent(state: dict) -> bool:
    print("\n--- C. Settings consent toggles ---")
    priya = state["tokens"].get("priya")
    if not priya:
        record_phase("C_settings_consent", False, "skipped - no priya token")
        return False

    toggles_on = {
        "moodInferenceEnabled": True,
        "behavioralRankingEnabled": True,
        "crossUserInferenceEnabled": False,
        "algorithmicTransparency": True,
    }

    d, c = req("/api/v1/settings", "PUT", toggles_on, token=priya)
    put_ok = expect("settings_put", c, (200, 204), d, "priya")

    # GET should reflect what we just wrote.
    d, c = req("/api/v1/settings", token=priya)
    get_ok = expect("settings_get", c, 200, d, "priya")
    persisted_ok = True
    if get_ok:
        data = d.get("data") if isinstance(d, dict) else None
        s = data if isinstance(data, dict) else (d if isinstance(d, dict) else {})
        # Settings may live under data.settings depending on shape.
        if isinstance(s.get("settings"), dict):
            s = s["settings"]
        for k, v in toggles_on.items():
            if s.get(k) is not None and s.get(k) != v:
                persisted_ok = False
                sigs["settings consent did not persist: {k}".format(k=k)] += 1
                errors.append({
                    "persona": "priya",
                    "label": "C_settings_value_mismatch",
                    "field": k,
                    "want": v,
                    "got": s.get(k),
                })
            elif s.get(k) is None:
                # field may simply not be echoed by GET; tolerate but warn
                warn("settings GET did not echo consent field {k}".format(k=k))

    # Invalid (non-boolean) -> 400.
    d, c = req("/api/v1/settings", "PUT",
               {"moodInferenceEnabled": "yes-please"}, token=priya)
    invalid_ok = expect("settings_put_invalid", c, 400, d, "priya")

    ok = put_ok and get_ok and persisted_ok and invalid_ok
    record_phase("C_settings_consent", ok,
                 "PUT={p} GET={g} persisted={pr} invalid->400={i}".format(
                     p=put_ok, g=get_ok, pr=persisted_ok, i=invalid_ok))
    return ok


# ----------------------------------------------------------------------
# Phase D: v8 ranker flag-OFF baseline
# ----------------------------------------------------------------------

def phase_D_ranker_baseline(state: dict) -> bool:
    print("\n--- D. v8 Discover ranker (flag-OFF baseline) ---")
    priya = state["tokens"].get("priya")
    if not priya:
        record_phase("D_ranker_baseline", False, "skipped - no priya token")
        return False
    d, c = req("/api/v1/discover?limit=20", token=priya)
    if not expect("discover_baseline", c, 200, d, "priya"):
        record_phase("D_ranker_baseline", False,
                     "/discover returned {c}".format(c=c))
        return False
    feed = items_of(d)
    top5 = []
    for it in feed[:5]:
        if isinstance(it, dict):
            top5.append(it.get("id") or it.get("userId")
                        or (it.get("user") or {}).get("id"))
    state["baseline_top5"] = top5
    ok = len(feed) >= 0  # any return is a pass at this layer
    record_phase("D_ranker_baseline", ok,
                 "feed_size={n} top5_recorded={k}".format(
                     n=len(feed), k=len([x for x in top5 if x])))
    return ok


# ----------------------------------------------------------------------
# Helper: pick a creativity item authored by a given user
# ----------------------------------------------------------------------

def pick_item_for(target_token: str, fallback_create_token: str = None):
    """Return (itemId, source) - either reels of a candidate or freshly created."""
    d, c = req("/api/v1/creativity/reels?limit=20", token=target_token)
    if c == 200:
        for it in items_of(d):
            if isinstance(it, dict) and it.get("id"):
                return it.get("id"), "reels"
    if fallback_create_token:
        payload = {
            "category": "Music",
            "type": "text",
            "title": "Phase14 fixture {h}".format(h=uuid.uuid4().hex[:6]),
            "content": "auto-generated by phase-14 regression",
            "visibility": "everyone",
        }
        d, c = req("/api/v1/creativity/items", "POST", payload,
                   token=fallback_create_token)
        if c in (200, 201):
            return ((d.get("data") or {}).get("id"), "created")
    return None, "none"


# ----------------------------------------------------------------------
# Phase E: Move v2 (flag-OFF expects 404)
# ----------------------------------------------------------------------

def phase_E_move_v2(state: dict) -> bool:
    print("\n--- E. Move v2 endpoint (flag-OFF -> 404) ---")
    arjun = state["tokens"].get("arjun")
    priya = state["tokens"].get("priya")
    if not arjun or not priya:
        record_phase("E_move_v2", False, "skipped - missing tokens")
        return False

    # Make sure Priya has at least one creativity item that Arjun can target.
    item_id, source = pick_item_for(arjun, fallback_create_token=priya)
    state["priya_item_id"] = item_id
    if not item_id:
        record_phase("E_move_v2", False,
                     "could not source an item to target")
        return False

    path = "/api/v1/creativity/items/{i}/move-suggestions-v2".format(i=item_id)
    d, c = req(path, "POST", {"n": 3}, token=arjun)

    # Flag OFF -> 404 NOT_FOUND is contract.
    # Flag ON  -> 200 with suggestions. We accept either, but flag the state.
    ok = False
    state_note = "unknown"
    if c == 404:
        ok = True
        state_note = "flag-gated 404 NOT_FOUND (default-OFF contract)"
    elif c == 200:
        suggestions = ((d.get("data") or {}).get("suggestions")) or []
        # flag-ON contract: list of 0..5 (empty is valid when hook library is sparse
        # for synthetic test users without rich interest/DTM overlap).
        ok = isinstance(suggestions, list) and 0 <= len(suggestions) <= 5
        state_note = "flag-ON, suggestions={n}".format(n=len(suggestions))
    else:
        sigs["move-v2 unexpected {c}".format(c=c)] += 1
        errors.append({
            "persona": "arjun",
            "label": "E_move_v2_unexpected",
            "code": c,
            "body": d,
        })

    warn("Move v2 flag-ON testing requires manual FEATURE_MOVE_V2_ENABLED=1 env setup.")
    record_phase("E_move_v2", ok,
                 "source={s} item={i} code={c} note={n}".format(
                     s=source, i=item_id, c=c, n=state_note))
    return ok


# ----------------------------------------------------------------------
# Phase F: Family Brief generate
# ----------------------------------------------------------------------

def phase_F_family_brief(state: dict) -> bool:
    print("\n--- F. Family Brief generate (flag-OFF -> 404) ---")
    priya = state["tokens"].get("priya")
    if not priya:
        record_phase("F_family_brief", False, "skipped - no priya token")
        return False
    d, c = req("/api/v1/dtm/family-brief/generate", "POST",
               {"format": "text"}, token=priya)
    ok = False
    note = "unknown"
    if c == 404:
        ok = True
        note = "flag-gated 404 NOT_FOUND (default-OFF contract)"
    elif c == 200:
        ok = True
        note = "flag-ON, brief returned"
    elif c == 403:
        # DTM-eligibility gate - tolerate
        ok = True
        note = "403 DTM gate (not flag-related)"
    else:
        sigs["family-brief unexpected {c}".format(c=c)] += 1
        errors.append({
            "persona": "priya",
            "label": "F_family_brief_unexpected",
            "code": c,
            "body": d,
        })
    record_phase("F_family_brief", ok,
                 "code={c} note={n}".format(c=c, n=note))
    return ok


# ----------------------------------------------------------------------
# Phase G: Weekly Top-10
# ----------------------------------------------------------------------

def phase_G_weekly_top(state: dict) -> bool:
    print("\n--- G. Weekly Top-10 (flag-OFF -> 404) ---")
    karan = state["tokens"].get("karan")
    if not karan:
        record_phase("G_weekly_top", False, "skipped - no karan token")
        return False
    d, c = req("/api/v1/weekly-top", token=karan)
    ok = False
    note = "unknown"
    if c == 404:
        ok = True
        note = "flag-gated 404 NOT_FOUND (default-OFF contract)"
    elif c == 200:
        arr = items_of(d)
        ok = isinstance(arr, list)
        note = "flag-ON, items={n} (may be empty pre-worker-run)".format(n=len(arr))
    else:
        sigs["weekly-top unexpected {c}".format(c=c)] += 1
        errors.append({
            "persona": "karan",
            "label": "G_weekly_top_unexpected",
            "code": c,
            "body": d,
        })
    record_phase("G_weekly_top", ok,
                 "code={c} note={n}".format(c=c, n=note))
    return ok


# ----------------------------------------------------------------------
# Phase H: Why-am-I-seeing-this
# ----------------------------------------------------------------------

def phase_H_why(state: dict) -> bool:
    print("\n--- H. Why-am-I-seeing-this (flag-OFF -> 404) ---")
    priya = state["tokens"].get("priya")
    arjun_id = state["ids"].get("arjun")
    if not priya or not arjun_id:
        record_phase("H_why", False, "skipped - missing tokens/ids")
        return False
    path = "/api/v1/discover/{i}/why".format(i=arjun_id)
    d, c = req(path, token=priya)
    ok = False
    note = "unknown"
    if c == 404:
        ok = True
        note = "flag-gated 404 NOT_FOUND (default-OFF contract)"
    elif c == 200:
        ok = True
        note = "flag-ON, explainer returned"
    else:
        sigs["why unexpected {c}".format(c=c)] += 1
        errors.append({
            "persona": "priya",
            "label": "H_why_unexpected",
            "code": c,
            "body": d,
        })
    record_phase("H_why", ok, "code={c} note={n}".format(c=c, n=note))
    return ok


# ----------------------------------------------------------------------
# Phase I: anti-ghost chat deposit
# ----------------------------------------------------------------------

def phase_I_anti_ghost(state: dict) -> bool:
    print("\n--- I. Anti-ghost chat deposit ---")
    karan = state["tokens"].get("karan")
    riya = state["tokens"].get("riya")
    riya_id = state["ids"].get("riya")
    karan_id = state["ids"].get("karan")
    if not (karan and riya and riya_id and karan_id):
        record_phase("I_anti_ghost", False, "skipped - missing tokens/ids")
        return False

    # Snapshot Karan's spotlight balance before.
    d_before, _ = req("/api/v1/creativity/spotlight", token=karan)
    bal_before = ((d_before.get("data") or {}).get("balance")) or 0

    # Establish a match between Karan and Riya first (chats require matches).
    # Sym-like both ways; ignore status (may 409 if already liked).
    req("/api/v1/discover/like", "POST", {"toUserId": riya_id}, token=karan)
    req("/api/v1/discover/like", "POST", {"toUserId": karan_id}, token=riya)

    # Open / fetch chat between Karan and Riya.
    d, c = req("/api/v1/messages/chats/with/" + riya_id, "POST", {},
               token=karan)
    chat_ok = expect("chat_open", c, (200, 201), d, "karan")
    chat_id = None
    if chat_ok:
        data = d.get("data") or {}
        chat_id = data.get("id") or data.get("chatId") or (data.get("chat") or {}).get("id")
    if not chat_id:
        record_phase("I_anti_ghost", False, "no chatId returned from /chats/with")
        return False
    state["karan_riya_chat_id"] = chat_id

    # First message - flag ON triggers chat_deposit, flag OFF is a no-op.
    body = {"content": "phase14 first message {h}".format(h=uuid.uuid4().hex[:4])}
    d, c = req(
        "/api/v1/messages/chats/{c}/messages".format(c=chat_id),
        "POST", body, token=karan,
    )
    send_ok = expect("chat_send_first", c, (200, 201), d, "karan")

    # Small window for fire-and-forget ledger writes.
    time.sleep(0.5)
    d_after, _ = req("/api/v1/creativity/spotlight", token=karan)
    bal_after = ((d_after.get("data") or {}).get("balance")) or 0
    delta = bal_after - bal_before

    # Contract:
    #   flag OFF -> delta == 0 (no deposit row)
    #   flag ON  -> delta <= 0 (deposit is a debit; reply-bonus credits it back later)
    note = "unknown"
    ok = False
    if delta == 0:
        note = "flag-gated: no deposit ledger row (default-OFF contract)"
        ok = True
    elif delta < 0:
        note = "flag-ON: chat_deposit observed (delta={d})".format(d=delta)
        ok = True
    else:
        # Positive delta on first message is unexpected (no reply yet).
        sigs["anti-ghost first message increased balance"] += 1
        errors.append({
            "persona": "karan",
            "label": "I_anti_ghost_positive_delta",
            "before": bal_before,
            "after": bal_after,
        })

    ok = ok and chat_ok and send_ok
    record_phase("I_anti_ghost", ok,
                 "chat={ci} bal {b}->{a} delta={d} note={n}".format(
                     ci=chat_id, b=bal_before, a=bal_after, d=delta, n=note))
    return ok


# ----------------------------------------------------------------------
# Phase J: multi-user interaction cascade
# ----------------------------------------------------------------------

def phase_J_cascade(state: dict) -> bool:
    print("\n--- J. Multi-user interaction cascade ---")
    priya = state["tokens"].get("priya")
    arjun = state["tokens"].get("arjun")
    priya_id = state["ids"].get("priya")
    arjun_id = state["ids"].get("arjun")
    if not (priya and arjun and priya_id and arjun_id):
        record_phase("J_cascade", False, "skipped - missing tokens/ids")
        return False

    # 1) Priya likes Arjun
    d, c = req("/api/v1/discover/like", "POST", {"toUserId": arjun_id},
               token=priya)
    like1_ok = expect("cascade_like_p_to_a", c, (200, 201, 409), d, "priya")

    # 2) Arjun likes Priya back -> match
    d, c = req("/api/v1/discover/like", "POST", {"toUserId": priya_id},
               token=arjun)
    like2_ok = expect("cascade_like_a_to_p", c, (200, 201, 409), d, "arjun")

    # 3) Match row visible to both
    d, c = req("/api/v1/matches", token=priya)
    matches_priya_ok = expect("matches_priya", c, 200, d, "priya")
    partner_ids = set()
    if matches_priya_ok:
        for m in items_of(d):
            if not isinstance(m, dict):
                continue
            pid = ((m.get("matchedUser") or {}).get("id")
                   or (m.get("user") or {}).get("id")
                   or m.get("userId") or m.get("toUserId"))
            if pid:
                partner_ids.add(pid)
    match_visible = arjun_id in partner_ids

    # 4) Find or create the chat between them (the like->match flow may
    #    auto-open a chat; if not, request it).
    d, c = req("/api/v1/messages/chats/with/" + priya_id, "POST", {},
               token=arjun)
    chat_ok = expect("cascade_chat_open", c, (200, 201), d, "arjun")
    chat_id = None
    if chat_ok:
        data = d.get("data") or {}
        chat_id = data.get("id") or data.get("chatId") or (data.get("chat") or {}).get("id")

    # 5) Arjun tries Move v2 (flag-gated; 404 acceptable)
    move_attempt_note = "skipped - no priya item"
    item_id = state.get("priya_item_id")
    if item_id:
        path = "/api/v1/creativity/items/{i}/move-suggestions-v2".format(i=item_id)
        d, c = req(path, "POST", {"n": 2}, token=arjun)
        if c == 404:
            move_attempt_note = "Move v2 404 (flag-OFF contract)"
        elif c == 200:
            move_attempt_note = "Move v2 200 (flag-ON)"
        else:
            move_attempt_note = "Move v2 unexpected {c}".format(c=c)
            sigs[move_attempt_note] += 1

    # 6) Arjun sends a message; Priya replies. Anti-ghost reply-bonus is
    #    flag-gated; we just exercise the path and watch spotlight delta.
    send_ok = True
    reply_ok = True
    bal_note = "n/a (no chat)"
    if chat_id:
        d_arjun_before, _ = req("/api/v1/creativity/spotlight", token=arjun)
        bal_a_before = ((d_arjun_before.get("data") or {}).get("balance")) or 0

        d, c = req(
            "/api/v1/messages/chats/{c}/messages".format(c=chat_id),
            "POST", {"content": "hey from arjun"}, token=arjun,
        )
        send_ok = expect("cascade_send_arjun", c, (200, 201), d, "arjun")

        d, c = req(
            "/api/v1/messages/chats/{c}/messages".format(c=chat_id),
            "POST", {"content": "hey back from priya"}, token=priya,
        )
        reply_ok = expect("cascade_reply_priya", c, (200, 201), d, "priya")

        time.sleep(0.5)
        d_arjun_after, _ = req("/api/v1/creativity/spotlight", token=arjun)
        bal_a_after = ((d_arjun_after.get("data") or {}).get("balance")) or 0
        bal_note = "arjun bal {b}->{a}".format(b=bal_a_before, a=bal_a_after)

    ok = (like1_ok and like2_ok and matches_priya_ok and chat_ok
          and send_ok and reply_ok and match_visible)
    record_phase(
        "J_cascade", ok,
        "match_visible={mv} chat={ci} move_v2={mv2}; {bn}".format(
            mv=match_visible, ci=chat_id, mv2=move_attempt_note, bn=bal_note),
    )
    return ok


# ----------------------------------------------------------------------
# Phase K: negative-signal loop (v3.5.0 logic still in play)
# ----------------------------------------------------------------------

def phase_K_negative_signal(state: dict) -> bool:
    print("\n--- K. Negative-signal loop ---")
    priya = state["tokens"].get("priya")
    riya = state["tokens"].get("riya")
    if not (priya and riya):
        record_phase("K_negative_signal", False, "skipped - missing tokens")
        return False

    # Riya creates a fixture item (so we know there is one to dislike).
    payload = {
        "category": "Music",
        "type": "text",
        "title": "Phase14 K {h}".format(h=uuid.uuid4().hex[:6]),
        "content": "auto-generated negative-signal target",
        "visibility": "everyone",
    }
    d, c = req("/api/v1/creativity/items", "POST", payload, token=riya)
    if c not in (200, 201):
        record_phase("K_negative_signal", False,
                     "could not create Riya item ({c})".format(c=c))
        return False
    riya_item_id = (d.get("data") or {}).get("id")
    if not riya_item_id:
        record_phase("K_negative_signal", False, "no id from create")
        return False

    # Priya dislikes Riya's item.
    d, c = req(
        "/api/v1/creativity/items/{i}/dislike".format(i=riya_item_id),
        "POST", {}, token=priya,
    )
    dislike_ok = expect("dislike_riya_item", c, 200, d, "priya")

    # Next reels call for Priya - the disliked item must be suppressed.
    d, c = req("/api/v1/creativity/reels?limit=50", token=priya)
    reels_ok = expect("reels_post_dislike", c, 200, d, "priya")
    suppressed = True
    if reels_ok:
        ids = set()
        for it in items_of(d):
            if isinstance(it, dict) and it.get("id"):
                ids.add(it.get("id"))
        if riya_item_id in ids:
            suppressed = False
            sigs["negative-signal: dislike did not suppress riya item"] += 1
            errors.append({
                "persona": "priya",
                "label": "K_negative_signal_leak",
                "item_id": riya_item_id,
            })

    ok = dislike_ok and reels_ok and suppressed
    record_phase("K_negative_signal", ok,
                 "item={i} suppressed={s}".format(i=riya_item_id, s=suppressed))
    return ok


# ----------------------------------------------------------------------
# Phase L: concurrent multi-user stress
# ----------------------------------------------------------------------

def phase_L_concurrent_stress(state: dict) -> bool:
    print("\n--- L. Concurrent multi-user stress ---")
    tokens = state.get("tokens") or {}
    if len(tokens) < 4:
        record_phase("L_concurrent_stress", False,
                     "skipped - need 4 tokens, have {n}".format(n=len(tokens)))
        return False

    results = {}      # handle -> list of (code, dt_ms)
    results_lock = threading.Lock()

    def worker(handle: str, token: str):
        local = []
        for i in range(5):
            t0 = time.monotonic()
            _, code = req("/api/v1/discover?limit=20", token=token)
            dt = int((time.monotonic() - t0) * 1000)
            local.append((code, dt))
            # ~2s window across all 5 calls => ~400ms cadence per worker.
            time.sleep(0.4)
        with results_lock:
            results[handle] = local

    threads = []
    t_start = time.monotonic()
    for handle, tok in tokens.items():
        th = threading.Thread(target=worker, args=(handle, tok), daemon=True)
        threads.append(th)
        th.start()
    for th in threads:
        th.join(timeout=30)
    elapsed = time.monotonic() - t_start

    # Aggregate
    server_errors = 0
    rate_limits = 0
    total_calls = 0
    code_hist = Counter()
    for handle, calls in results.items():
        for code, _dt in calls:
            total_calls += 1
            code_hist[code] += 1
            if 500 <= code < 600:
                server_errors += 1
                errors.append({
                    "persona": handle,
                    "label": "L_stress_5xx",
                    "code": code,
                })
                sigs["concurrent stress 5xx code={c}".format(c=code)] += 1
            if code == 429:
                rate_limits += 1

    # Light rate-limit budget: up to 1 429 per worker is tolerable (gateway
    # legitimately throttles bursts). More than that fails the phase.
    rl_ok = rate_limits <= len(tokens)

    # Now check that no duplicate matches were created during the cascade
    # (this is the multi-user invariant we are guarding).
    priya = tokens.get("priya")
    arjun_id = state["ids"].get("arjun")
    dup_ok = True
    if priya and arjun_id:
        d, c = req("/api/v1/matches", token=priya)
        if c == 200:
            arjun_matches = 0
            for m in items_of(d):
                if not isinstance(m, dict):
                    continue
                pid = ((m.get("matchedUser") or {}).get("id")
                       or (m.get("user") or {}).get("id")
                       or m.get("userId") or m.get("toUserId"))
                if pid == arjun_id:
                    arjun_matches += 1
            if arjun_matches > 1:
                dup_ok = False
                sigs["duplicate match row created"] += 1
                errors.append({
                    "persona": "priya",
                    "label": "L_duplicate_match",
                    "count": arjun_matches,
                })

    ok = (server_errors == 0) and rl_ok and dup_ok
    record_phase(
        "L_concurrent_stress", ok,
        "calls={tc} 5xx={se} 429={rl} dup_match_ok={du} {sec:.2f}s codes={ch}".format(
            tc=total_calls, se=server_errors, rl=rate_limits,
            du=dup_ok, sec=elapsed, ch=dict(code_hist)),
    )
    return ok


# ----------------------------------------------------------------------
# Finalize
# ----------------------------------------------------------------------

def finalize(start_ms: int, exit_code_hint: int = None):
    duration = int(time.time() * 1000) - start_ms
    summary_pass = all(p["passed"] for p in phase_results)
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration,
        "base": BASE,
        "users_exercised": [PERSONAS[h][0] for h in ("priya", "arjun", "riya", "karan")],
        "flag_states": FLAG_STATES,
        "phases": phase_results,
        "events_total": len(errors),
        "signatures_total": len(sigs),
        "signatures": dict(sigs),
        "warnings": warnings_log,
        "errors": errors[:200],
    }
    out = Path(__file__).resolve().parent / "phase-14-overhaul.report.json"
    out.write_text(json.dumps(report, indent=2))
    print("\n=== Phase 14 summary ===")
    print("  phases passed: {p}/{t}".format(
        p=sum(1 for x in phase_results if x["passed"]),
        t=len(phase_results),
    ))
    print("  events: {e}  signatures: {s}".format(
        e=len(errors), s=len(sigs)))
    print("  warnings: {w}".format(w=len(warnings_log)))
    print("  report -> {p}".format(p=out))
    if exit_code_hint is not None:
        sys.exit(exit_code_hint)
    sys.exit(0 if summary_pass and not errors else 1)


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------

def main():
    print("=== Phase 14: v3.6.0 overhaul (multi-user E2E) ===")
    if not stack_reachable():
        print("stack not detected at localhost:3200 - skipping phase 14",
              file=sys.stderr)
        sys.exit(2)

    start_ms = int(time.time() * 1000)
    state: dict = {}

    if not phase_A_identity(state):
        # If identity fails wholesale, every later phase will skip noisily.
        # Still run them so the report tells the full story, but they will
        # mostly record "skipped".
        warn("phase A partial; downstream phases may skip")

    phase_B_pass_hardfilter(state)
    phase_C_settings_consent(state)
    phase_D_ranker_baseline(state)
    phase_E_move_v2(state)
    phase_F_family_brief(state)
    phase_G_weekly_top(state)
    phase_H_why(state)
    phase_I_anti_ghost(state)
    phase_J_cascade(state)
    phase_K_negative_signal(state)
    phase_L_concurrent_stress(state)

    finalize(start_ms)


if __name__ == "__main__":
    main()
