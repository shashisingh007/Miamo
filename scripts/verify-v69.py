#!/usr/bin/env python3
"""End-to-end verification flow test for v6.9.

Tests:
 1. Register → email OTP issued
 2. Email OTP verified → emailVerified=true
 3. Phone OTP issued + verified → phoneVerified=true
 4. Login from a *different* user-agent triggers requiresOtp:true
 5. 2FA challenge accepted → JWT issued + device trusted
 6. Login from same UA after trust → no OTP required
 7. Selfie verification submitted → auto-approved in dev
 8. /verify/status returns badges
 9. City autocomplete returns Mumbai for q=mum
"""
import json
import time
import urllib.parse
import urllib.request

BASE = "http://localhost:3200/api/v1"
PASS_COUNT = 0
FAIL_COUNT = 0

def call(method, path, body=None, token=None, ua=None):
    req = urllib.request.Request(f"{BASE}{path}", method=method)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    if ua:
        req.add_header("User-Agent", ua)
    data = json.dumps(body).encode() if body else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=10) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except Exception: return e.code, {}

def check(label, ok, detail=""):
    global PASS_COUNT, FAIL_COUNT
    if ok:
        PASS_COUNT += 1
        print(f"  ✓ {label}")
    else:
        FAIL_COUNT += 1
        print(f"  ✗ {label} — {detail}")

def peek(identifier):
    code, r = call("GET", f"/auth/__dev/otp/peek?identifier={urllib.parse.quote(identifier)}")
    if code == 200: return r["data"]["code"]
    return None

print("== v6.9 Verification & Security E2E ==")
ts = int(time.time())
EMAIL = f"v69qa{ts}@miamo.test"
PASS = "Test1234!"
PHONE = f"+9199{ts % 100000000:08d}"  # synthetic E.164

# 0. OTP-gated signup (3-stage flow)
SIGNUP_EMAIL = f"signup{ts}@miamo.test"
code, r = call("POST", "/auth/signup/start", {"identifier": SIGNUP_EMAIL})
check("signup/start returns signupToken", code == 200 and "signupToken" in r.get("data", {}), str(r)[:200])
stoken = r["data"].get("signupToken")
check("signup/start masks identifier", "***" in r["data"].get("sentTo", ""), r["data"].get("sentTo"))
sc = peek(SIGNUP_EMAIL)
check("signup OTP retrievable via dev peek", sc is not None and len(sc) == 6, f"got {sc}")
code, r = call("POST", "/auth/signup/verify", {"signupToken": stoken, "code": "000000"})
check("signup wrong code rejected", code == 400 and "OTP_INVALID" in str(r), str(r)[:200])
code, r = call("POST", "/auth/signup/verify", {"signupToken": stoken, "code": sc})
check("signup/verify returns verifiedToken", code == 200 and "verifiedToken" in r.get("data", {}), str(r)[:200])
vtoken = r["data"].get("verifiedToken")
code, r = call("POST", "/auth/signup/complete", {"verifiedToken": vtoken, "password": "weak", "displayName": "QA Signup"})
check("signup/complete rejects weak password", code == 400, str(r)[:200])
code, r = call("POST", "/auth/signup/complete", {"verifiedToken": vtoken, "password": PASS, "displayName": "QA Signup"})
check("signup/complete creates account", code == 201 and "accessToken" in r["data"], str(r)[:300])
check("signup account has emailVerified=true", r["data"]["user"].get("emailVerified") is True, str(r["data"].get("user")))
# Replay protection: same verifiedToken cannot create a 2nd account
code, r = call("POST", "/auth/signup/complete", {"verifiedToken": vtoken, "password": PASS, "displayName": "QA Replay"})
check("signup/complete replay rejected", code >= 400, str(r)[:200])

# 1. Register
code, r = call("POST", "/auth/register", {"email": EMAIL, "password": PASS, "displayName": "V69 QA"})
check("register returns 201", code == 201, f"got {code}: {r}")
tok = r["data"]["accessToken"]
check("register response includes verification.emailOtpSentTo", "verification" in r["data"], str(r["data"].keys()))

# 2. Email OTP
ec = peek(EMAIL)
check("email OTP retrievable via dev peek", ec is not None and len(ec) == 6, f"got {ec}")
code, r = call("POST", "/auth/email/verify-otp", {"code": ec}, token=tok)
check("email verify returns success", code == 200 and r["data"].get("emailVerified") is True, str(r))

# 3. Phone OTP
code, r = call("POST", "/auth/phone/send-otp", {"phone": PHONE}, token=tok)
check("phone send-otp returns 200", code == 200 and r["data"].get("phone") == PHONE, str(r))
pc = peek(PHONE)
check("phone OTP retrievable", pc is not None, "no code")
code, r = call("POST", "/auth/phone/verify-otp", {"code": pc}, token=tok)
check("phone verify success", code == 200 and r["data"].get("phoneVerified") is True, str(r))

# 4. Login from new device (different UA)
NEW_UA = "MiamoQA/9.9 (Linux; FirefoxBETA/200.0)"
code, r = call("POST", "/auth/login", {"email": EMAIL, "password": PASS}, ua=NEW_UA)
check("login from new device requires OTP", code == 200 and r["data"].get("requiresOtp") is True, str(r)[:300])
ch = r["data"].get("challengeToken")
chcode = peek(PHONE)  # phone is preferred since verified
check("2FA challenge code retrievable", chcode is not None, "no code")

# 4b. Wrong code rejected (uses same challenge — OTP allows up to 5 attempts).
code, r = call("POST", "/auth/login/2fa", {"challengeToken": ch, "code": "000000"}, ua=NEW_UA)
check("wrong 2FA code rejected", code == 400 and "OTP_INVALID" in str(r), str(r)[:200])

# 5. Verify 2FA → tokens
code, r = call("POST", "/auth/login/2fa", {"challengeToken": ch, "code": chcode}, ua=NEW_UA)
check("2FA verification returns access token", code == 200 and "accessToken" in r["data"], str(r)[:300])

# 6. Login from same UA again (now trusted) — no OTP
code, r = call("POST", "/auth/login", {"email": EMAIL, "password": PASS}, ua=NEW_UA)
check("same-device login skips OTP", code == 200 and r["data"].get("requiresOtp") is None and "accessToken" in r["data"], str(r)[:300])

# 8. Selfie verification
code, r = call("POST", "/profiles/me/verify/submit", {"kind": "selfie", "photoUrl": "https://example.com/x.jpg"}, token=tok)
check("selfie submission accepted", code == 201 and r["data"]["status"] == "pending", str(r))
time.sleep(4)  # auto-approve fires after 3s
code, r = call("GET", "/profiles/me/verify/status", token=tok)
check("verification status shows selfie approved",
      code == 200 and r["data"]["badges"]["selfie"] is True
      and r["data"]["badges"]["email"] is True
      and r["data"]["badges"]["phone"] is True,
      str(r)[:400])

# 9. Trusted devices listed
code, r = call("GET", "/auth/devices", token=tok)
check("trusted devices listed", code == 200 and len(r["data"]) >= 1, str(r)[:300])

# 10. City autocomplete
code, r = call("GET", "/cities/search?q=mum&limit=3")
names = [c["name"] for c in r.get("data", [])]
check("cities/search returns Mumbai for 'mum'", code == 200 and "Mumbai" in names, str(names))
code, r = call("GET", "/cities/search?q=san%20fr&limit=5")
names = [c["name"] for c in r.get("data", [])]
check("cities/search 'san fr' returns San Francisco", code == 200 and any("San Francisco" in n for n in names), str(names))

# 11. Cooldown enforcement
code, r = call("POST", "/auth/email/send-otp", token=tok)
check("send-otp on already-verified email returns 4xx", code >= 400, str(r)[:200])

# 12. Google sign-in (dev token shape: dev:<email>:<sub>:<name>)
GMAIL = f"gqa{ts}@gmail.test"
GSUB = f"google_sub_{ts}"
code, r = call("POST", "/auth/google", {"idToken": f"dev:{GMAIL}:{GSUB}:Google QA"})
check("google sign-in creates account", code == 201 and r["data"].get("created") is True and "accessToken" in r["data"], str(r)[:300])
check("google account marked emailVerified", r["data"]["user"].get("emailVerified") is True, str(r["data"].get("user")))
# Same Google sub → returns existing user (login, not signup)
code, r = call("POST", "/auth/google", {"idToken": f"dev:{GMAIL}:{GSUB}:Google QA"})
check("google repeat sign-in returns existing user", code == 200 and r["data"].get("created") is False, str(r)[:200])
# Different google sub but matching existing email → links account
code, r = call("POST", "/auth/google", {"idToken": f"dev:{GMAIL}:other_sub_{ts}:X"})
# This SHOULD link by email; account exists so created=false
check("google links by existing email", code == 200 and r["data"].get("created") is False, str(r)[:200])

# 13. Apple sign-in (dev)
APMAIL = f"apqa{ts}@privaterelay.test"
ASUB = f"apple_sub_{ts}"
code, r = call("POST", "/auth/apple", {"idToken": f"dev:{APMAIL}:{ASUB}:Apple QA"})
check("apple sign-in creates account", code == 201 and r["data"].get("created") is True, str(r)[:200])

# 14. Passwordless phone OTP (sign-up + sign-in unified)
PWPHONE = f"+9198{(ts + 7) % 100000000:08d}"
code, r = call("POST", "/auth/otp/start", {"identifier": PWPHONE})
check("otp/start phone returns otpToken", code == 200 and "otpToken" in r["data"], str(r)[:200])
otpTok = r["data"].get("otpToken")
oc = peek(PWPHONE)
check("passwordless phone OTP retrievable", oc is not None and len(oc) == 6, f"got {oc}")
code, r = call("POST", "/auth/otp/verify", {"otpToken": otpTok, "code": oc})
check("otp/verify creates new user (sign-up path)", code == 201 and r["data"].get("created") is True and r["data"]["user"].get("phoneVerified") is True, str(r)[:300])
# Wait for cooldown to clear, then sign in with same number → existing path
time.sleep(62)
code, r = call("POST", "/auth/otp/start", {"identifier": PWPHONE})
otpTok2 = r["data"].get("otpToken")
oc2 = peek(PWPHONE)
code, r = call("POST", "/auth/otp/verify", {"otpToken": otpTok2, "code": oc2})
check("otp/verify second time logs in existing user", code == 200 and r["data"].get("created") is False, str(r)[:200])

print(f"\n{PASS_COUNT} passed, {FAIL_COUNT} failed")
exit(0 if FAIL_COUNT == 0 else 1)
