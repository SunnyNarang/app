# PRD — Rotary Club of Gwalior Innovators

## Original problem statement
"Make a website for my club, Rotary Club of Gwalior Innovators. Tell about our club, our work, our mission, and a page with a list of all members; clicking a member shows full biodata. Personal fields (phone number, address, birthday, spouse name) must stay hidden from everyone except club members. A simple member login lets members check everything about club info, schedules and member biodatas."

User choices (via Q&A): email+password login (custom, I create accounts), admin panel to manage members/meetings/events, ~12 realistic sample members, modern dark theme with gold accents, very modern with transitions.

## Architecture
- Backend: FastAPI (0.0.0.0:8001, /api prefix) + MongoDB (motor, DB_NAME=test_database)
  - JWT HS256 auth (PyJWT), bcrypt hashing, httpOnly cookies (access 15 min / refresh 7 days, SameSite=None Secure)
  - Brute-force lockout: 5 failed logins per IP:email → 15 min (login_attempts collection)
  - Privacy gate: member private fields (phone, email, address, birthday, anniversary, spouse) returned ONLY to authenticated users; guests get public fields + locked flag
  - Role-based admin CRUD: members / meetings / projects; /api/admin/stats
  - Startup seed: admin + demo member users, 12 members, 5 meetings (relative dates), 4 projects (only when collections empty)
- Frontend: React (CRA + craco) + Tailwind + framer-motion + lenis smooth scroll + sonner toasts
  - Pages: / (hero + marquee + mission + bento pillars + animated impact counters + schedule preview + leadership + join CTA), /members (search, filters, cards, biodata modal), /login (gold-beam card, demo quick logins), /admin (stats + members/meetings/projects tabs with modals)
  - Design: obsidian-navy #090C15 + royal blue #4169E1, Cinzel display / Plus Jakarta Sans body / JetBrains Mono data, custom SVG rotary-wheel logo + favicon, grain overlay, scroll progress bar, masked-line hero reveal, parallax hero

## Personas
- Guest visitor: reads club info, schedule preview, member public profiles — private biodata locked
- Club member: logs in, sees full biodata, schedules, Call/Email/WhatsApp actions
- Club admin: full CRUD over members, meetings, projects via /admin

## Implemented (2026-09-29)
- Auth (login/logout/me/refresh), roles, lockout, admin+member seeding
- Login accepts username (admin) OR email (members); admin credentials: admin/admin (changeable in-app)
- Credential management: member email = login username (mandatory), 8-char password auto-generated on create, visible & editable in Admin → Members → Edit; member self-service "Change Password" (navbar + admin panel) syncs back to the admin edit panel
- Privacy-gated member directory + biodata modal (locked/unlocked states with animations)
- Member self-service profile editing: Members page → "Edit My Profile" (photo, name, firm, classification, phone, address, birthday, anniversary, spouse, bio); email, role and member-since are admin-only (GET/PUT /api/profile whitelist)
- Photo upload system: POST /api/upload (any logged-in user) → EXIF-orient, centre-square-crop, resize 500×500 JPEG q85 (Pillow) → Emergent object storage (rotary-gwalior/photos/...) → public serving via GET /api/media/{path}; file refs in db.files with soft-delete on replacement; PhotoUpload component with square preview wired into member profile editor + admin member form + admin project form; Avatar resolves relative /api/media URLs across environments
- Home gallery: "Moments from our service" is a STANDALONE gallery (db collection `gallery`, /api/gallery CRUD admin-only) — upload photo + caption per item in Admin → Gallery tab; editorial mosaic on home (up to 6, feature tile 2×2, captions on wide tiles); section hides when empty; NOT fed from projects
- Photo lightbox: click any gallery photo → full-screen viewer with caption, counter, prev/next arrows + keyboard (Esc/←/→), backdrop close
- Project admin form: photo upload only (no caption field)
- Home page (hero, marquee, mission, 4 pillars bento, animated counters, schedule, leadership, join band)
- Admin panel (stats, members table + add/edit/delete incl. private fields + credentials, meetings CRUD, projects CRUD, toasts)
- Royal-blue re-theme (obsidian-navy + #4169E1), static non-flicker buttons, members grid renders instantly on load
- Mobile-responsive layouts, testids on all interactive elements

## Sample data note
All members, meetings, projects, stats and quotes are editable sample data (user chose sample data); manage via /admin.

## Backlog (P0/P1/P2)
- P0: none open
- P1: member self-service password change; forgot-password via email (Resend); photo upload for members (object storage)
- P2: RSVPs per meeting; member portal to edit own biodata; WhatsApp community link; multi-year archive of projects
