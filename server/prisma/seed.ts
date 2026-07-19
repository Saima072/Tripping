import { PrismaClient } from "@prisma/client";
import { SEED_LAST_UPDATED, SEED_SOURCE, expandSeedRows } from "../src/lib/seed-core.js";

const prisma = new PrismaClient();

// Idempotent upsert-based seed for real (persistent) databases; safe to
// re-run on the quarterly pricing refresh.
async function main() {
  for (const record of expandSeedRows()) {
    const { seasons, ...fields } = record;
    const destination = await prisma.destination.upsert({
      where: { city_country: { city: fields.city, country: fields.country } },
      update: fields,
      create: fields,
    });

    for (const s of seasons) {
      await prisma.pricingBySeason.upsert({
        where: { destinationId_season: { destinationId: destination.id, season: s.season } },
        update: {
          priceLow: s.priceLow,
          priceAvg: s.priceAvg,
          priceHigh: s.priceHigh,
          lastUpdated: SEED_LAST_UPDATED,
        },
        create: {
          destinationId: destination.id,
          season: s.season,
          priceLow: s.priceLow,
          priceAvg: s.priceAvg,
          priceHigh: s.priceHigh,
          currency: "USD",
          source: SEED_SOURCE,
          lastUpdated: SEED_LAST_UPDATED,
        },
      });

      await prisma.weatherBySeason.upsert({
        where: { destinationId_season: { destinationId: destination.id, season: s.season } },
        update: {},
        create: {
          destinationId: destination.id,
          season: s.season,
          avgTempC: s.avgTempC,
          rainChancePct: s.rainChancePct,
          isBestTime: s.isBestTime,
        },
      });
    }
  }

  const count = await prisma.destination.count();
  console.log(`Seeded ${count} destinations.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
