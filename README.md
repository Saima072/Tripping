# TripSwipe ✈️

A mobile-first web app for discovering your next trip, Tinder-style. Swipe through
destination cards — each one a city + suggested date range with seasonal weather,
an **estimated** nightly price band, and vibe tags. Swipe right to shortlist and
get booking links; swipe left and the deck tunes itself to your taste.

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 19 + TypeScript, Vite, Tailwind CSS 4, Framer Motion (drag gestures) |
| Backend  | Node 22, Express 5 + TypeScript, Zod validation |
| Database | PostgreSQL 16 via Prisma ORM |
| Auth     | bcrypt password hashing, 15-min JWT access tokens + rotating refresh tokens in httpOnly `SameSite=Strict` cookies |
| Deploy   | Dockerized API (non-root, migrations on boot), static frontend build |

## Repo layout

```
server/   Express API + Prisma schema, migrations and seed (~170 destinations)
web/      React SPA (swipe deck, shortlist, filters, auth)
```

## Local development

Prereqs: Node 22+, PostgreSQL 16 (or `docker compose up db`).

```bash
npm install

# 1. Configure the API
cp server/.env.example server/.env   # then edit secrets

# 2. Migrate + seed
cd server
npx prisma migrate dev
npm run seed
cd ..

# 3. Run both apps
npm run dev:server    # API on :4000
npm run dev:web       # Vite on :5173, proxies /api → :4000
```

Or run db + API in containers: `JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... docker compose up`.

## API

```
POST   /api/auth/signup     POST /api/auth/login    POST /api/auth/refresh
POST   /api/auth/logout     DELETE /api/auth/account
GET    /api/deck/next       personalized card batch
POST   /api/swipes          record left/right swipe (right ⇒ shortlist)
GET    /api/shortlist       DELETE /api/shortlist/:id
GET    /api/filters         PUT /api/filters
```

All routes except signup/login/refresh require `Authorization: Bearer <access token>`.

### Deck personalization

`GET /api/deck/next` excludes already-seen destinations, applies the user's hard
filters (budget cap, preferred season/tags), then scores candidates by
popularity + tag/region affinity learned from right-swipe history, with a small
jitter so decks stay fresh. Each card carries a suggested travel window for its
best (or preferred) season plus allowlisted Airbnb/Booking.com deep links.

## Security posture (OWASP ASVS L1 baseline)

- **Passwords:** bcrypt (12 rounds); login does a constant dummy compare so
  timing doesn't reveal whether an email exists.
- **Sessions:** short-lived JWT access tokens held in SPA memory only (never
  localStorage). Opaque refresh tokens are stored hashed (SHA-256) server-side,
  rotated on every refresh; reuse of a rotated token revokes all sessions.
  Cookies are httpOnly + Secure + `SameSite=Strict`, path-scoped to `/api/auth`.
- **CSRF:** double-submit token (`X-CSRF-Token`) required on cookie-authenticated
  endpoints, on top of SameSite=Strict.
- **Authorization:** every query is row-scoped to the authenticated user id —
  ID-guessing another user's shortlist returns 404.
- **Validation:** Zod `.strict()` schemas on every input; unexpected fields rejected.
- **SQLi/XSS:** Prisma parameterized queries only; React default escaping, no
  `dangerouslySetInnerHTML`.
- **Rate limits:** per-IP on auth endpoints, per-user on deck/swipes (anti-scrape),
  plus a global baseline; hits are logged.
- **Headers:** helmet CSP (`default-src 'none'` for the API), HSTS, no-referrer,
  frame-ancestors none, 16 KB JSON body cap.
- **Outbound links:** built server-side against an https + domain allowlist
  (airbnb.com / booking.com) — user data only ever lands in query values.
- **Secrets:** env-only config validated at boot; `.env` git-ignored; production
  images take secrets from the platform's secrets manager.
- **Privacy/GDPR:** email is the only PII. `DELETE /api/auth/account` hard-deletes
  the user, shortlist, filters and sessions; swipes are anonymized (`user_id`
  set NULL) so no orphaned PII remains.
- **Dependency hygiene:** `npm audit` gate + Dependabot in CI.

## Out of scope for v1

No visa data, no live Airbnb/flight pricing (all prices are seeded quarterly
estimates from Numbeo / Budget Your Trip), no native apps.
