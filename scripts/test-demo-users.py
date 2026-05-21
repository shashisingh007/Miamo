#!/usr/bin/env python3
"""Test all demo users - login + key endpoints."""
import requests
import json
import sys

base = 'http://localhost:3200/api/v1'
users = [
    ('miamo1@miamo.test', 'miamo1'),
    ('miamo2@miamo.test', 'miamo2'),
    ('miamo3@miamo.test', 'miamo3'),
    ('miamo4@miamo.test', 'miamo4'),
    ('miamo5@miamo.test', 'miamo5'),
    ('miamo6@miamo.test', 'miamo6'),
    ('miamo7@miamo.test', 'miamo7'),
    ('miamo8@miamo.test', 'miamo8'),
    ('miamo9@miamo.test', 'miamo9'),
    ('miamo10@miamo.test', 'miamo10'),
]

errors = []
passed = 0
total = 0

for email, pw in users:
    print(f'=== {email} ===')
    
    # Login
    total += 1
    try:
        r = requests.post(f'{base}/auth/login', json={'email': email, 'password': pw}, timeout=10)
        if r.status_code != 200:
            print(f'  LOGIN FAILED: {r.status_code} {r.text[:100]}')
            errors.append(f'{email}: login failed {r.status_code}')
            continue
        token = r.json()['data']['accessToken']
        print(f'  Login: OK')
        passed += 1
    except Exception as e:
        print(f'  LOGIN EXCEPTION: {e}')
        errors.append(f'{email}: login exception {e}')
        continue

    headers = {'Authorization': f'Bearer {token}'}

    # Profile (GET /api/v1/profiles/me)
    total += 1
    try:
        r = requests.get(f'{base}/profiles/me', headers=headers, timeout=10)
        if r.status_code == 200:
            profile = r.json()["data"].get("profile") or {}
            print(f'  Profile: age={profile.get("age","?")} city={profile.get("city","?")}')
            passed += 1
        else:
            print(f'  Profile ERROR: {r.status_code} {r.text[:100]}')
            errors.append(f'{email}: profile error {r.status_code}')
    except Exception as e:
        print(f'  Profile EXCEPTION: {e}')
        errors.append(f'{email}: profile exception {e}')

    # Discover (GET /api/v1/discover)
    total += 1
    try:
        r = requests.get(f'{base}/discover', headers=headers, timeout=15)
        if r.status_code == 200:
            d = r.json()['data']
            print(f'  Discover: {len(d)} profiles')
            passed += 1
        else:
            print(f'  Discover ERROR: {r.status_code} {r.text[:200]}')
            errors.append(f'{email}: discover error {r.status_code}')
    except Exception as e:
        print(f'  Discover EXCEPTION: {e}')
        errors.append(f'{email}: discover exception {e}')

    # Matches (GET /api/v1/matches)
    total += 1
    try:
        r = requests.get(f'{base}/matches', headers=headers, timeout=10)
        if r.status_code == 200:
            print(f'  Matches: {len(r.json()["data"])}')
            passed += 1
        else:
            print(f'  Matches ERROR: {r.status_code} {r.text[:200]}')
            errors.append(f'{email}: matches error {r.status_code}')
    except Exception as e:
        print(f'  Matches EXCEPTION: {e}')
        errors.append(f'{email}: matches exception {e}')

    # Messages/Chats (GET /api/v1/messages/chats)
    total += 1
    try:
        r = requests.get(f'{base}/messages/chats', headers=headers, timeout=10)
        if r.status_code == 200:
            print(f'  Chats: {len(r.json()["data"])}')
            passed += 1
        else:
            print(f'  Chats ERROR: {r.status_code} {r.text[:200]}')
            errors.append(f'{email}: chats error {r.status_code}')
    except Exception as e:
        print(f'  Chats EXCEPTION: {e}')
        errors.append(f'{email}: chats exception {e}')

    # Notifications (GET /api/v1/notifications)
    total += 1
    try:
        r = requests.get(f'{base}/notifications', headers=headers, timeout=10)
        if r.status_code == 200:
            print(f'  Notifications: {len(r.json()["data"])}')
            passed += 1
        else:
            print(f'  Notifications ERROR: {r.status_code} {r.text[:200]}')
            errors.append(f'{email}: notifications error {r.status_code}')
    except Exception as e:
        print(f'  Notifications EXCEPTION: {e}')
        errors.append(f'{email}: notifications exception {e}')

    # Content Feed (GET /api/v1/feed)
    total += 1
    try:
        r = requests.get(f'{base}/feed', headers=headers, timeout=10)
        if r.status_code == 200:
            print(f'  Feed: {len(r.json()["data"])} items')
            passed += 1
        else:
            print(f'  Feed ERROR: {r.status_code} {r.text[:200]}')
            errors.append(f'{email}: feed error {r.status_code}')
    except Exception as e:
        print(f'  Feed EXCEPTION: {e}')
        errors.append(f'{email}: feed exception {e}')

    print()

print('=' * 50)
print(f'RESULTS: {passed}/{total} passed')
if errors:
    print(f'\nERRORS ({len(errors)}):')
    for e in errors:
        print(f'  - {e}')
    sys.exit(1)
else:
    print('NO ERRORS - All demo users working perfectly!')
    sys.exit(0)
