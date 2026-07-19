import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { config } from "../config.js";
import { SCHEMA_SQL } from "../embedded-schema.js";
import { SEED_LAST_UPDATED, SEED_SOURCE, expandSeedRows } from "./seed-core.js";
import { logger } from "./logger.js";

// EMBEDDED_DB=1 runs Postgres in-process via PGlite (WASM) — no external
// database needed. Meant for demo/verification deploys (e.g. Vercel preview):
// the schema and ~170-destination seed are created on cold start and the data
// is ephemeral. Default mode is a real PostgreSQL server via DATABASE_URL.
const pglite = config.embeddedDb ? new PGlite() : null;

// The adapter pins a slightly older @prisma/driver-adapter-utils than our
// Prisma release, so the factory type is nominally incompatible; the runtime
// contract is unchanged (verified by the API smoke tests in embedded mode).
type AdapterFactory = NonNullable<
  NonNullable<ConstructorParameters<typeof PrismaClient>[0]>["adapter"]
>;

export const prisma: PrismaClient = pglite
  ? new PrismaClient({ adapter: new PrismaPGlite(pglite) as unknown as AdapterFactory })
  : new PrismaClient();

let ready: Promise<void> | null = null;

/** Resolves once the database is usable; bootstraps the embedded DB once. */
export function ensureDbReady(): Promise<void> {
  ready ??= init();
  return ready;
}

async function init(): Promise<void> {
  if (!pglite) return;
  const started = Date.now();
  await pglite.exec(SCHEMA_SQL);
  await seedEmbedded();
  logger.info("embedded_db_ready", { ms: Date.now() - started });
}

// Bulk createMany seed (vs the CLI's idempotent upserts) — the embedded DB is
// always empty at this point, and cold-start latency matters.
async function seedEmbedded(): Promise<void> {
  const records = expandSeedRows();
  const destinations = records.map((r) => ({ id: crypto.randomUUID(), ...r }));

  await prisma.destination.createMany({
    data: destinations.map(({ seasons: _seasons, ...fields }) => fields),
  });
  await prisma.pricingBySeason.createMany({
    data: destinations.flatMap((d) =>
      d.seasons.map((s) => ({
        destinationId: d.id,
        season: s.season,
        priceLow: s.priceLow,
        priceAvg: s.priceAvg,
        priceHigh: s.priceHigh,
        currency: "USD",
        source: SEED_SOURCE,
        lastUpdated: SEED_LAST_UPDATED,
      }))
    ),
  });
  await prisma.weatherBySeason.createMany({
    data: destinations.flatMap((d) =>
      d.seasons.map((s) => ({
        destinationId: d.id,
        season: s.season,
        avgTempC: s.avgTempC,
        rainChancePct: s.rainChancePct,
        isBestTime: s.isBestTime,
      }))
    ),
  });
}
