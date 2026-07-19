import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { airbnbSearchLink, bookingSearchLink } from "../lib/links.js";

type Season = "spring" | "summer" | "fall" | "winter";
const SEASON_START_MONTH: Record<Season, number> = { spring: 2, summer: 5, fall: 8, winter: 11 };

export interface DeckCard {
  id: string;
  city: string;
  country: string;
  region: string;
  tags: string[];
  heroImageUrl: string;
  season: Season;
  dateRange: { start: string; end: string };
  weather: { avgTempC: number; rainChancePct: number; isBestTime: boolean } | null;
  price: { low: number; avg: number; high: number; currency: string; estimated: true } | null;
  links: { airbnb: string; booking: string };
  whyMatch: string[];
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Next 8-day window inside the given season, at least 3 weeks out. */
function nextWindowFor(season: Season): { start: string; end: string } {
  const now = new Date();
  const earliest = new Date(now.getTime() + 21 * 24 * 3600 * 1000);
  let start = new Date(Date.UTC(now.getUTCFullYear(), SEASON_START_MONTH[season], 10));
  while (start < earliest) {
    const seasonEnd = new Date(start);
    seasonEnd.setUTCMonth(seasonEnd.getUTCMonth() + 3);
    if (earliest < seasonEnd) {
      start = earliest;
      break;
    }
    start = new Date(Date.UTC(start.getUTCFullYear() + 1, SEASON_START_MONTH[season], 10));
  }
  const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
  return { start: isoDate(start), end: isoDate(end) };
}

type Candidate = Prisma.DestinationGetPayload<{ include: { pricing: true; weather: true } }>;

export async function nextDeck(userId: string, limit = 10): Promise<DeckCard[]> {
  const [filters, swipes] = await Promise.all([
    prisma.userFilters.findUnique({ where: { userId } }),
    prisma.swipe.findMany({
      where: { userId },
      select: { destinationId: true, direction: true },
    }),
  ]);

  const seenIds = [...new Set(swipes.map((s) => s.destinationId))];
  const likedIds = swipes.filter((s) => s.direction === "right").map((s) => s.destinationId);
  const liked = likedIds.length
    ? await prisma.destination.findMany({
        where: { id: { in: likedIds } },
        select: { region: true, tags: true },
      })
    : [];

  // Affinity profile from right-swipe history.
  const tagWeight = new Map<string, number>();
  const regionWeight = new Map<string, number>();
  for (const d of liked) {
    regionWeight.set(d.region, (regionWeight.get(d.region) ?? 0) + 1);
    for (const t of d.tags) tagWeight.set(t, (tagWeight.get(t) ?? 0) + 1);
  }
  const maxTag = Math.max(1, ...tagWeight.values());
  const maxRegion = Math.max(1, ...regionWeight.values());

  const where: Prisma.DestinationWhereInput = { id: { notIn: seenIds } };
  if (filters?.preferredTags?.length) where.tags = { hasSome: filters.preferredTags };

  const candidates: Candidate[] = await prisma.destination.findMany({
    where,
    include: { pricing: true, weather: true },
  });

  const scored = candidates
    .map((dest) => {
      const season = pickSeason(dest, filters?.preferredSeason ?? null);
      const pricing = dest.pricing.find((p) => p.season === season) ?? null;

      // Firm budget filter: skip anything whose seasonal average exceeds the cap.
      if (filters?.budgetCap && pricing && pricing.priceAvg.gt(filters.budgetCap)) {
        return null;
      }

      const tagAffinity =
        dest.tags.reduce((sum, t) => sum + (tagWeight.get(t) ?? 0) / maxTag, 0) /
        Math.max(1, dest.tags.length);
      const regionAffinity = (regionWeight.get(dest.region) ?? 0) / maxRegion;
      const preferredTagBonus = filters?.preferredTags?.length
        ? dest.tags.filter((t) => filters.preferredTags.includes(t)).length /
          filters.preferredTags.length
        : 0;

      const score =
        0.35 * (dest.popularityScore / 100) +
        0.3 * tagAffinity +
        0.15 * regionAffinity +
        0.1 * preferredTagBonus +
        0.1 * Math.random(); // jitter so the deck isn't identical every session

      return { dest, season, pricing, score, tagAffinity, regionAffinity };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ dest, season, pricing, tagAffinity, regionAffinity }) => {
    const weather = dest.weather.find((w) => w.season === season) ?? null;
    const dateRange = nextWindowFor(season);

    const whyMatch: string[] = [];
    if (regionAffinity > 0.5) whyMatch.push(`You've liked other spots in ${dest.region}`);
    if (tagAffinity > 0.3) {
      const top = dest.tags.filter((t) => tagWeight.has(t)).slice(0, 2);
      if (top.length) whyMatch.push(`Matches your taste for ${top.join(" & ")}`);
    }
    if (filters?.preferredTags?.length) {
      const hits = dest.tags.filter((t) => filters.preferredTags.includes(t));
      if (hits.length) whyMatch.push(`Ticks your ${hits.join(", ")} filter`);
    }
    if (weather?.isBestTime) whyMatch.push(`${capitalize(season)} is the best time to visit`);
    if (!whyMatch.length) whyMatch.push("A popular pick to get your deck started");

    return {
      id: dest.id,
      city: dest.city,
      country: dest.country,
      region: dest.region,
      tags: dest.tags.slice(0, 3),
      heroImageUrl: dest.heroImageUrl,
      season,
      dateRange,
      weather: weather
        ? {
            avgTempC: Number(weather.avgTempC),
            rainChancePct: weather.rainChancePct,
            isBestTime: weather.isBestTime,
          }
        : null,
      price: pricing
        ? {
            low: Number(pricing.priceLow),
            avg: Number(pricing.priceAvg),
            high: Number(pricing.priceHigh),
            currency: pricing.currency,
            estimated: true,
          }
        : null,
      links: {
        airbnb: airbnbSearchLink(dest.city, dest.country, dateRange.start, dateRange.end),
        booking: bookingSearchLink(dest.city, dest.country, dateRange.start, dateRange.end),
      },
      whyMatch,
    };
  });
}

function pickSeason(dest: Candidate, preferred: Season | null): Season {
  if (preferred) return preferred;
  const best = dest.weather.filter((w) => w.isBestTime).map((w) => w.season as Season);
  if (best.length) {
    // Prefer the best season whose travel window comes up soonest.
    return best
      .map((s) => ({ s, start: nextWindowFor(s).start }))
      .sort((a, b) => a.start.localeCompare(b.start))[0]!.s;
  }
  return "summer";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
