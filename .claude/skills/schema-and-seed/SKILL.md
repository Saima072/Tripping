---
name: schema-and-seed
description: Change the TripSwipe database schema or destination seed data safely. Use this whenever editing server/prisma/schema.prisma, creating migrations, adding or updating destinations, doing the quarterly pricing/weather refresh, or touching seed files — the embedded demo database has a hidden coupling to migrations that silently breaks if you skip a step here.
---

# Schema & seed changes

## The trap this skill exists for

The embedded demo database (PGlite, used when `EMBEDDED_DB=1` or no
`DATABASE_URL`) does **not** read `prisma/migrations/` at runtime. It builds
its schema from a generated string module, `server/src/embedded-schema.ts`.
After ANY migration change you must regenerate it:

```bash
cd server && npm run gen:embedded-schema
```

and commit the regenerated file. Skip this and real-Postgres deployments get
the new schema while embedded mode (including the Vercel demo) keeps the old
one — Prisma queries then fail only in embedded mode, which looks like a
PGlite bug and wastes hours. There is no automation guarding this; the
generated file's header comment is the only reminder.

## Schema change checklist

1. Edit `server/prisma/schema.prisma`. Keep `previewFeatures =
   ["driverAdapters"]` (embedded adapter needs it) and the deliberate
   modeling choices: `Swipe.userId` is nullable with `onDelete: SetNull` —
   that is the GDPR anonymize-on-account-delete mechanism, not an oversight.
2. `npx prisma migrate dev --name <change>` (needs local Postgres; DB
   `tripswipe`, see `.env.example`).
3. `npm run gen:embedded-schema` — see above.
4. If the change touches seeded tables, update **both** seed writers (next
   section) and re-run `npm run seed`.
5. Verify in BOTH modes — the whole point is they can drift:
   real Postgres via `npm run seed` + smoke test, embedded via
   `EMBEDDED_DB=1 npx tsx src/index.ts` (it seeds itself; watch for
   `embedded_db_ready`). The verify-app skill has the smoke sequence.

## Seed data anatomy

- `server/src/lib/seed-data.ts` — ~173 destinations as compact tuples, field
  order: `[city, country, region, lat, lng, tags, popularity(0-100),
  avgTempJunAugC, avgTempDecFebC, wetSeasons[], nightlyAvgUSD, bestSeasons[]]`.
  Temps are calendar-anchored (Jun–Aug / Dec–Feb) regardless of hemisphere —
  southern-hemisphere rows already account for it; don't "fix" a Sydney
  winter of 23°C.
- `server/src/lib/seed-core.ts` — `expandSeedRows()` derives 4 seasons of
  pricing/weather per row (best-season premium 1.2×, wet-season 0.85×,
  low = 0.7×avg, high = 1.45×avg). Single source of truth for both writers.
- Two writers consume it, and they must stay behaviorally in sync:
  - `server/prisma/seed.ts` — idempotent upserts, for real databases;
    safe to re-run (this IS the quarterly refresh path).
  - `seedEmbedded()` in `server/src/lib/prisma.ts` — bulk `createMany` into
    the always-empty embedded DB, optimized for cold-start latency.

## Quarterly pricing/weather refresh

Update `nightlyAvgUSD` (and weather fields if needed) in `seed-data.ts` from
Numbeo free tier / Budget Your Trip; bump `SEED_LAST_UPDATED` in
`seed-core.ts`; run `npm run seed` against the real DB (upserts update prices
in place). Embedded mode picks the change up automatically on next boot — no
regeneration needed for data-only changes (only migrations need
`gen:embedded-schema`). New destinations: append rows — `city+country` is the
unique key, and unseeded values must stay plausible estimates labeled as such
in the UI; never present them as live prices (product rule).
