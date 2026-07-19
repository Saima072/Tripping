export type Season = "spring" | "summer" | "fall" | "winter";

export interface Weather {
  avgTempC: number;
  rainChancePct: number;
  isBestTime: boolean;
}

export interface Price {
  low: number;
  avg: number;
  high: number;
  currency: string;
  estimated: true;
}

export interface OutboundLinks {
  airbnb: string;
  booking: string;
}

export interface DeckCard {
  id: string;
  city: string;
  country: string;
  region: string;
  tags: string[];
  heroImageUrl: string;
  season: Season;
  dateRange: { start: string; end: string };
  weather: Weather | null;
  price: Price | null;
  links: OutboundLinks;
  whyMatch: string[];
}

export interface ShortlistItem {
  id: string;
  destinationId: string;
  city: string;
  country: string;
  region: string;
  tags: string[];
  heroImageUrl: string;
  dateRange: { start: string; end: string } | null;
  season: Season | null;
  weather: Weather | null;
  price: Price | null;
  links: OutboundLinks;
  createdAt: string;
}

export interface Filters {
  budgetCap: number | null;
  preferredSeason: Season | null;
  preferredTags: string[];
}

export interface User {
  id: string;
  email: string;
}
