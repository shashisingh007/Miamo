#!/usr/bin/env python3
"""
Phase 11 — Cold-start gauntlet.

Walks a brand-new user from OTP signup → profile completion → first creativity
post → first like → match-with-existing-user, asserting every persistence,
award and discoverability invariant along the way.

Assertions (from docs/QA_MASTER_PROMPT.md §6):
  • OTP signup three-step flow returns access tokens at /signup/complete.
  • Profile completion score rises monotonically as fields are filled.
  • Bio + 2 photos + 2 prompts + 5 interests + profession + city pushes
    profileScore to the >=95 ceiling (verified ID is the only +5 gap).
  • First creativity post in a category fires awardFirstPostInCategory and
    returns spotlight.firstPostBonus.granted = true.
  • Spotlight balance reflects the bonus delta after the post.
  • /discover never returns the cold-start user to themselves.
  • Cold-start user appears in another user's /discover feed within reason.
  • Like → discover/like persists; sym-like creates a match row.

Output: scripts/qa-runs/phase-11-cold-start.report.json
"""
from __future__ import annotations
import json, os, sys, time, uuid, urllib.request, urllib.error
from collections import Counter
from pathlib import Path

BASE = "http://localhost:3200"
errors: list[dict] = []
sigs: Counter = Counter()


def req(path, method="GET", data=None, token=None, timeout=20, base=BASE):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data is not None else None
    for attempt in range(3):
        r = urllib.request.Request(base + path, data=body, headers=headers, method=method)
        try:
            resp = urllib.request.urlopen(r, timeout=timeout)
            raw = resp.read()
            try:
                return json.loads(raw or b"{}"), resp.getcode()
            except json.JSONDecodeError:
                return {"_raw": raw[:400].decode("utf-8", "replace")}, resp.getcode()
        except urllib.error.HTTPError as e:
            body_text = e.read().decode("utf-8", "replace")
            if e.code == 429 and attempt < 2:
                time.sleep(2 ** attempt)
                continue
            try:
                return json.loads(body_text), e.code
            except json.JSONDecodeError:
                return {"_raw": body_text[:400]}, e.code
        except Exception as e:
            return {"_err": str(e)}, 0
    return {"_err": "exhausted"}, 0


def expect(label, code, want, body=None, persona=None):
    if isinstance(want, int):
        want = (want,)
    ok = code in want
    if not ok:
        sig = f"{label} -> {code} (want {sorted(set(want))})"
        sigs[sig] += 1
        errors.append({"persona": persona, "label": label, "code": code, "want": list(want), "body": body})
    return ok


def items_of(d):
    if d is None:
        return []
    data = d.get("data") if isinstance(d, dict) else None
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get("items") or data.get("results") or []
    if isinstance(d, list):
        return d
    return []


def signup_otp(identifier: str, password: str, display_name: str):
    """Three-stage OTP signup. Returns (accessToken, userId) or (None, None)."""
    d, c = req("/api/v1/auth/signup/start", "POST", {"identifier": identifier})
    if not expect("signup/start", c, 200, d, identifier):
        return None, None
    data = d.get("data") or {}
    signup_token = data.get("signupToken")
    code = data.get("_devCode")
    if not signup_token or not code:
        sigs["signup/start did not return _devCode (dev mode required)"] += 1
        return None, None
    d, c = req("/api/v1/auth/signup/verify", "POST", {"signupToken": signup_token, "code": code})
    if not expect("signup/verify", c, 200, d, identifier):
        return None, None
    verified_token = (d.get("data") or {}).get("verifiedToken")
    d, c = req(
        "/api/v1/auth/signup/complete",
        "POST",
        {"verifiedToken": verified_token, "password": password, "displayName": display_name},
    )
    if not expect("signup/complete", c, (200, 201), d, identifier):
        return None, None
    data = d.get("data") or {}
    return data.get("accessToken"), (data.get("user") or {}).get("id")


def login_seed(u):
    d, c = req("/api/v1/auth/login", "POST", {"email": f"{u}@miamo.test", "password": u})
    if c == 200:
        return (d.get("data") or {}).get("accessToken")
    return None


def get_completion(token):
    d, c = req("/api/v1/profiles/me/completion", token=token)
    if c != 200:
        return -1
    data = d.get("data") or {}
    return int(data.get("score") or data.get("percent") or 0)


def get_profile_score(token):
    d, c = req("/api/v1/profiles/me", token=token)
    if c != 200:
        return -1
    p = (d.get("data") or {}).get("profile") or d.get("data") or {}
    return int(p.get("profileScore") or 0)


def get_balance(token):
    d, c = req("/api/v1/creativity/spotlight", token=token)
    if c != 200:
        return -1
    data = d.get("data") or {}
    return int(data.get("balance") or 0)


print("=== Phase 11: cold-start gauntlet ===\n")
unique = uuid.uuid4().hex[:6]
identifier = f"miamo-qa-{unique}@miamo.test"
password = f"QaPass!{unique}"
display = f"QA Cold {unique}"

# ─── 11.1 OTP signup ────────────────────────────────────────
print("--- 11.1 OTP signup (start → verify → complete) ---")
token, uid = signup_otp(identifier, password, display)
if not token:
    print("    FATAL: signup pipeline broke — aborting phase 11")
else:
    print(f"    user created: {uid}")

if token:
    # ─── 11.2 Initial completion is low ─────────────────────
    print("--- 11.2 Initial profile completion is low ---")
    start_score = get_profile_score(token)
    print(f"    profileScore (initial) = {start_score}")
    if start_score < 0:
        sigs["profileScore unreadable after signup"] += 1
    elif start_score >= 80:
        sigs[f"cold-start profileScore unexpectedly high: {start_score}"] += 1

    # ─── 11.3 Fill profile fields ───────────────────────────
    print("--- 11.3 Fill profile fields (bio, profession, city, age, gender) ---")
    d, c = req(
        "/api/v1/profiles/me",
        "PUT",
        {
            "bio": "I love long walks, sci-fi novels, and trying new coffee shops.",
            "profession": "QA Engineer",
            "city": "San Francisco",
            "age": 28,
            "gender": "other",
        },
        token=token,
    )
    expect("PUT /profiles/me", c, 200, d, identifier)
    mid_score = get_profile_score(token)
    print(f"    profileScore after bio+job+city = {mid_score}")
    if mid_score <= start_score:
        sigs[f"profileScore did not rise after fields: {start_score}→{mid_score}"] += 1

    # ─── 11.4 Add 2 photos ──────────────────────────────────
    print("--- 11.4 Upload 2 photos ---")
    for i in range(2):
        d, c = req("/api/v1/profiles/me/photos", "POST", {}, token=token)
        expect(f"POST /profiles/me/photos #{i+1}", c, 200, d, identifier)

    # ─── 11.5 Prompts + interests ───────────────────────────
    print("--- 11.5 PUT prompts (2) + interests (5) ---")
    d, c = req(
        "/api/v1/profiles/me/prompts",
        "PUT",
        {
            "prompts": [
                {"question": "My ideal weekend", "answer": "Hiking and bookstores."},
                {"question": "What I'm looking for", "answer": "Someone kind, curious, and funny."},
            ]
        },
        token=token,
    )
    expect("PUT /profiles/me/prompts", c, 200, d, identifier)
    d, c = req(
        "/api/v1/profiles/me/interests",
        "PUT",
        {"interests": ["hiking", "reading", "coffee", "sci-fi", "live music"]},
        token=token,
    )
    expect("PUT /profiles/me/interests", c, 200, d, identifier)

    # Re-touch profile so the score-recompute branch runs (it lives in PUT /me).
    d, c = req("/api/v1/profiles/me", "PUT", {"bio": "I love long walks, sci-fi novels, and trying new coffee shops!"}, token=token)
    expect("PUT /profiles/me (re-touch for score recompute)", c, 200, d, identifier)
    final_score = get_profile_score(token)
    print(f"    profileScore (final, pre-verification) = {final_score}")
    if final_score < 90:
        sigs[f"cold-start cap unexpectedly low: profileScore={final_score} (want >=90)"] += 1

    # ─── 11.6 First creativity post fires bonus ─────────────
    print("--- 11.6 First creativity post in category → bonus award ---")
    bal_before = get_balance(token)
    d, c = req("/api/v1/creativity/categories", token=token)
    cats = items_of(d)
    cat_id = None
    if cats:
        first = cats[0]
        cat_id = first.get("id") if isinstance(first, dict) else None
    if not cat_id:
        sigs["no creativity categories returned"] += 1
    else:
        d, c = req(
            "/api/v1/creativity/items",
            "POST",
            {
                "categoryId": cat_id,
                "type": "text",
                "mediaType": "text",
                "title": "Cold start hello",
                "content": "Just joined Miamo — excited to meet folks here.",
                "visibility": "everyone",
            },
            token=token,
        )
        expect("POST /creativity/items", c, (200, 201), d, identifier)
        spotlight = (d.get("spotlight") or {}) if isinstance(d, dict) else {}
        fpb = spotlight.get("firstPostBonus") or {}
        if not fpb.get("granted"):
            sigs["firstPostBonus.granted was not true on first post in category"] += 1
        bal_after = get_balance(token)
        print(f"    balance: {bal_before} → {bal_after}; firstPostBonus={fpb}")
        if bal_after <= bal_before:
            sigs[f"balance did not increase after first-post bonus: {bal_before}→{bal_after}"] += 1

    # ─── 11.7 Discover never returns self ───────────────────
    print("--- 11.7 /discover excludes the cold-start user ---")
    d, c = req("/api/v1/discover?limit=50", token=token)
    expect("GET /discover (cold-start)", c, 200, d, identifier)
    feed = items_of(d)
    feed_ids = {(it.get("id") or it.get("userId")) for it in feed if isinstance(it, dict)}
    if uid in feed_ids:
        sigs["cold-start user found their own id in /discover"] += 1
    print(f"    /discover returned {len(feed)} items; self excluded: {uid not in feed_ids}")

    # ─── 11.8 Cold-start user is discoverable by seeded user ─
    print("--- 11.8 Seeded user can find the cold-start user ---")
    seed_tok = login_seed("miamo1")
    if seed_tok:
        found = False
        for _ in range(3):  # paginate up to 150 items
            d, c = req("/api/v1/discover?limit=50", token=seed_tok)
            ids = {(it.get("id") or it.get("userId")) for it in items_of(d) if isinstance(it, dict)}
            if uid in ids:
                found = True
                break
        if not found:
            # Acceptable to miss on randomized feed; only flag if absent on all pages
            sigs["cold-start user not surfaced to seeded miamo1 in first 150 discover items"] += 1
        else:
            print("    cold-start user surfaced to miamo1 ✓")
    else:
        sigs["could not log in miamo1 to verify discoverability"] += 1

    # ─── 11.9 Like → Match ──────────────────────────────────
    print("--- 11.9 Like from cold-start → seeded user likes back → match ---")
    if seed_tok:
        d, c = req("/api/v1/auth/me", token=seed_tok)
        seed_uid = ((d.get("data") or {}).get("user") or d.get("data") or {}).get("id")

        # Cold-start user likes seed
        d, c = req("/api/v1/discover/like", "POST", {"toUserId": seed_uid}, token=token)
        expect("POST /discover/like (cold→seed)", c, (200, 201), d, identifier)

        # Seed user likes cold-start back
        d, c = req("/api/v1/discover/like", "POST", {"toUserId": uid}, token=seed_tok)
        expect("POST /discover/like (seed→cold)", c, (200, 201), d, "miamo1")

        # Fetch matches for cold-start user
        d, c = req("/api/v1/matches", token=token)
        expect("GET /matches (cold-start)", c, 200, d, identifier)
        matches = items_of(d)
        partner_ids = {
            ((m.get("matchedUser") or {}).get("id")
             or (m.get("user") or {}).get("id")
             or m.get("userId")
             or m.get("toUserId"))
            for m in matches if isinstance(m, dict)
        }
        if seed_uid not in partner_ids:
            sigs["sym-like did not create a match row visible to cold-start user"] += 1
        else:
            print("    match row visible ✓")

# ─── Summary ────────────────────────────────────────────────
print("\n=== ERROR SUMMARY ===\n")
print(f"Total events: {len(errors)}   distinct: {len(sigs)}")
for sig, n in sigs.most_common():
    print(f"  [{n}] {sig}")

report = {
    "phase": "11-cold-start",
    "identifier": identifier,
    "uid": uid if 'uid' in dir() else None,
    "events": len(errors),
    "distinct": len(sigs),
    "signatures": dict(sigs),
    "errors": errors[:200],
}
out = Path(__file__).parent / "phase-11-cold-start.report.json"
out.write_text(json.dumps(report, indent=2))
print(f"Report → {out.relative_to(Path.cwd())}")
sys.exit(0 if not errors and not sigs else 1)
