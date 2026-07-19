import { DESTINATIONS, type Season } from "./seed-data.js";

export const SEASONS: Season[] = ["spring", "summer", "fall", "winter"];
export const SEED_LAST_UPDATED = new Date("2026-07-01");
export const SEED_SOURCE = "manual (Numbeo / Budget Your Trip)";

export interface SeasonRecord {
  season: Season;
  priceLow: number;
  priceAvg: number;
  priceHigh: number;
  avgTempC: number;
  rainChancePct: number;
  isBestTime: boolean;
}

export interface DestinationRecord {
  city: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  tags: string[];
  heroImageUrl: string;
  popularityScore: number;
  seasons: SeasonRecord[];
}

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

/** Expand the compact seed rows into full destination + per-season records. */
export function expandSeedRows(): DestinationRecord[] {
  return DESTINATIONS.map(
    ([city, country, region, lat, lng, tags, popularity, summerT, winterT, wetSeasons, nightlyAvg, bestSeasons]) => ({
      city,
      country,
      region,
      lat,
      lng,
      tags,
      heroImageUrl: heroImageUrl(city, country),
      popularityScore: popularity,
      seasons: SEASONS.map((season) => {
        // High season carries an accommodation premium; wet/off seasons a discount.
        const premium = bestSeasons.includes(season) ? 1.2 : wetSeasons.includes(season) ? 0.85 : 1.0;
        const avg = Math.round(nightlyAvg * premium);
        return {
          season,
          priceLow: Math.round(avg * 0.7),
          priceAvg: avg,
          priceHigh: Math.round(avg * 1.45),
          avgTempC: seasonTemp(season, summerT, winterT),
          rainChancePct: wetSeasons.includes(season) ? 62 : 22,
          isBestTime: bestSeasons.includes(season),
        };
      }),
    })
  );
}
