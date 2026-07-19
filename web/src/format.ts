import type { Season } from "./types";

export const SEASON_LABEL: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

export function formatDateRange(range: { start: string; end: string } | null): string {
  if (!range) return "Flexible dates";
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(range.start)} – ${fmt(range.end)}`;
}

// Deterministic fallback gradient per city, used when the hero image fails.
const GRADIENTS = [
  "linear-gradient(135deg,#7c3aed,#db2777)",
  "linear-gradient(135deg,#0ea5e9,#6366f1)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#10b981,#0ea5e9)",
  "linear-gradient(135deg,#ec4899,#f97316)",
  "linear-gradient(135deg,#14b8a6,#8b5cf6)",
];

export function cityGradient(city: string): string {
  let hash = 0;
  for (const ch of city) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length]!;
}
