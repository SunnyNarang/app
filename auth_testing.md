# Auth Testing Playbook — Rotary Club of Gwalior Innovators

## Stack
- FastAPI + Motor + MongoDB (`test_database`), JWT (HS256) via PyJWT, bcrypt hashing
- httpOnly cookies: `access_token` (15 min), `refresh_token` (7 days), SameSite=None, Secure
- Env: JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD in /app/backend/.env
- Demo member account: member@rotarygwalior.org / member123 (role: member)
- Admin account: admin@rotarygwalior.org / admin123 (role: admin)

## Endpoints
- POST /api/auth/login  {email, password} → user object + cookies
- POST /api/auth/logout → clears cookies
- GET  /api/auth/me → current user (401 if guest)
- POST /api/auth/refresh → new access cookie
- GET  /api/members → list; private fields ONLY when authenticated
- GET  /api/members/{id} → biodata; private fields ONLY when authenticated
- POST/PUT/DELETE /api/members, /api/meetings, /api/projects → admin only (403 for member)
- GET  /api/admin/stats → admin only

## Verify via curl
```
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
# guest: private fields must be absent
curl -s "$API_URL/api/members" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['locked'], 'phone' in d[0])"
# login as member
curl -s -c /tmp/c.txt -X POST "$API_URL/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"member@rotarygwalior.org","password":"member123"}'
curl -s -b /tmp/c.txt "$API_URL/api/auth/me"
# member sees full biodata
curl -s -b /tmp/c.txt "$API_URL/api/members" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['locked'], d[0].get('phone'))"
# member cannot use admin endpoints
curl -s -b /tmp/c.txt "$API_URL/api/admin/stats"
# admin CRUD works
curl -s -c /tmp/a.txt -X POST "$API_URL/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@rotarygwalior.org","password":"admin123"}'
curl -s -b /tmp/a.txt "$API_URL/api/admin/stats"
```

## Notes
- Brute force: 5 failed logins per IP:email → 15 min lockout (login_attempts collection)
- Admin seed runs on startup: creates admin if missing, rehashes if ADMIN_PASSWORD changed in .env
- Seed data (members/meetings/projects) only inserted when the collection is empty
