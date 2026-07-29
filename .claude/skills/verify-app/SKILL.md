---
name: verify-app
description: Verify TripSwipe changes end-to-end by actually running the API and UI. Use this whenever asked to test, verify, smoke-test, or check changes to this repo, before pushing any nontrivial change, or when asked "does it still work?" — even if the request doesn't say "test" explicitly. Covers zero-setup boot (embedded DB), the full curl smoke sequence with expected responses, and driving the UI in a browser including swipe gestures.
---

# Verifying TripSwipe

Typecheck alone proves little here — auth, CSRF, the personalization scoring, and
the swipe UI all have runtime behavior. Verify by running the real thing.

## Boot the API

**Zero-setup path (preferred for verification)** — no Postgres, no env vars:

```bash
cd server && EMBEDDED_DB=1 PORT=4001 npx tsx src/index.ts
```

Wait for `embedded_db_ready` in the log (~300 ms: in-process PGlite Postgres,
schema + 173-destination seed created automatically). Data is ephemeral —
perfect for tests, never for real use.

**Real-Postgres path** (only when testing persistence or migrations): start
Postgres, `cp .env.example .env` (fill secrets ≥32 chars), then
`npx prisma migrate dev && npm run seed`, then `set -a && . ./.env && set +a && npx tsx src/index.ts`.

## API smoke sequence

Run in order against the booted port; each step's expected shape is noted.
All state-changing routes need `Authorization: Bearer <accessToken>`.

```bash
B=localhost:4001
# health — {"ok":true,"db":"embedded"|"postgres"}
curl -s $B/api/health
# signup — 201 {"accessToken":"...","user":{...}}; also sets ts_refresh + ts_csrf cookies
curl -s -c jar.txt -X POST $B/api/auth/signup -H 'Content-Type: application/json' \
  -d '{"email":"t@example.com","password":"supersecret123"}'
# deck — {"cards":[10 items]} each with price.estimated=true, links, whyMatch
curl -s $B/api/deck/next -H "Authorization: Bearer $TOKEN"
# swipe right — 201 {"ok":true}; then shortlist shows the city
curl -s -X POST $B/api/swipes -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"destinationId":"<id from deck>","direction":"right"}'
curl -s $B/api/shortlist -H "Authorization: Bearer $TOKEN"
# filters — PUT then re-fetch deck; cards must respect budgetCap/preferredSeason/tags
curl -s -X PUT $B/api/filters -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"budgetCap":60,"preferredSeason":"summer","preferredTags":["hiking"]}'
# security negatives — all must fail:
#   shortlist without token → 401; unknown field in filters body → 400;
#   refresh without X-CSRF-Token header → 403
CSRF=$(grep ts_csrf jar.txt | awk '{print $NF}')
curl -s -b jar.txt -c jar.txt -X POST $B/api/auth/refresh -H "X-CSRF-Token: $CSRF"  # 200 + new token
```

Personalization check that matters: after setting filters and one right-swipe,
`/api/deck/next` must return only cards within budget, in the preferred season,
and skewed toward the liked card's region/tags. If it returns the same generic
top-popularity deck, scoring is broken.

## UI verification (browser)

Build must pass first: `npm run build` at repo root (typecheck + vite).
Then `npx vite --port 5173` in `web/` (dev server proxies `/api` to :4000 —
adjust `vite.config.ts` proxy or run the API on 4000).

Drive with playwright-core against the preinstalled Chromium
(`executablePath: "/opt/pw-browsers/chromium"`, viewport 390×844). The flow
that catches regressions: signup → deck renders → Save button → detail sheet
("Saved to your shortlist") → drag-left gesture → Shortlist tab shows the item
→ Profile: set filters, "Saved ✓" → Log out returns to auth screen.

Drag gesture that reliably triggers a swipe (threshold is 110 px on x):

```js
const box = await page.locator(".touch-none").first().boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
for (let i = 1; i <= 10; i++)
  await page.mouse.move(box.x + box.width / 2 - i * 30, box.y + box.height / 2, { steps: 2 });
await page.mouse.up();
```

## Known non-bugs

- Hero images render as color gradients in sandboxes: the seeded image host is
  often unreachable; `DestImage` falls back to a deterministic per-city
  gradient by design. Not a failure.
- React StrictMode double-invokes effects in dev; the deck page guards
  duplicate fetches with a ref — don't "fix" apparent double-loads.
