import { PrismaClient } from "@prisma/client";
import { DESTINATIONS, type Season } from "./seed-data.js";

const prisma = new PrismaClient();

const SEASONS: Season[] = ["spring", "summer", "fall", "winter"];
const LAST_UPDATED = new Date("2026-07-01");

function seasonTemp(season: Season, summerT: number, winterT: number): number {
  const mid = (summerT + winterT) / 2;
  switch (season) {
    case "summer": return summerT;
    case "winter": return winterT;
    case "spring": return Math.round((mid - 0.1 * (summerT - winterT)) * 10) / 10;
    case "fall": return Math.round((mid + 0.1 * (summerT - winterT)) * 10) / 10;
  }
}

function heroImageUrl(city: string, country: string): string {
  const q = encodeURIComponent(`${city} ${country} travel`);
  return `https://source.unsplash.com/900x1200/?${q}`;
}

async function main() {
  for (const [
    city, country, region, lat, lng, tags, popularity,
    summerT, winterT, wetSeasons, nightlyAvg, bestSeasons,
  ] of DESTINATIONS) {
    const destination = await prisma.destination.upsert({
      where: { city_country: { city, country } },
      update: {
        region, lat, lng, tags,
        heroImageUrl: heroImageUrl(city, country),
        popularityScore: popularity,
      },
      create: {
        city, country, region, lat, lng, tags,
        heroImageUrl: heroImageUrl(city, country),
        popularityScore: popularity,
      },
    });

    for (const season of SEASONS) {
      // High season carries an accommodation premium; wet/off seasons a discount.
      const premium = bestSeasons.includes(season) ? 1.2 : wetSeasons.includes(season) ? 0.85 : 1.0;
      const avg = Math.round(nightlyAvg * premium);
      const priceLow = Math.round(avg * 0.7);
      const priceHigh = Math.round(avg * 1.45);

      await prisma.pricingBySeason.upsert({
        where: { destinationId_season: { destinationId: destination.id, season } },
        update: { priceLow, priceAvg: avg, priceHigh, lastUpdated: LAST_UPDATED },
        create: {
          destinationId: destination.id,
          season,
          priceLow,
          priceAvg: avg,
          priceHigh,
          currency: "USD",
          source: "manual (Numbeo / Budget Your Trip)",
          lastUpdated: LAST_UPDATED,
        },
      });

      const rain = wetSeasons.includes(season) ? 62 : 22;
      await prisma.weatherBySeason.upsert({
        where: { destinationId_season: { destinationId: destination.id, season } },
        update: {},
        create: {
          destinationId: destination.id,
          season,
          avgTempC: seasonTemp(season, summerT, winterT),
          rainChancePct: rain,
          isBestTime: bestSeasons.includes(season),
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
