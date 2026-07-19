import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { airbnbSearchLink, bookingSearchLink } from "../lib/links.js";

export const shortlistRouter = Router();

shortlistRouter.get("/", requireAuth, async (req, res) => {
  const items = await prisma.shortlist.findMany({
    where: { userId: req.userId! },
    include: {
      destination: { include: { pricing: true, weather: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    items: items.map((item) => {
      const d = item.destination;
      const best = d.weather.find((w) => w.isBestTime) ?? d.weather[0] ?? null;
      const pricing = best ? d.pricing.find((p) => p.season === best.season) ?? null : null;
      const start = item.dateRangeStart?.toISOString().slice(0, 10);
      const end = item.dateRangeEnd?.toISOString().slice(0, 10);
      return {
        id: item.id,
        destinationId: d.id,
        city: d.city,
        country: d.country,
        region: d.region,
        tags: d.tags,
        heroImageUrl: d.heroImageUrl,
        dateRange: start && end ? { start, end } : null,
        season: best?.season ?? null,
        weather: best
          ? {
              avgTempC: Number(best.avgTempC),
              rainChancePct: best.rainChancePct,
              isBestTime: best.isBestTime,
            }
          : null,
        price: pricing
          ? {
              low: Number(pricing.priceLow),
              avg: Number(pricing.priceAvg),
              high: Number(pricing.priceHigh),
              currency: pricing.currency,
              estimated: true as const,
            }
          : null,
        links: {
          airbnb: airbnbSearchLink(d.city, d.country, start, end),
          booking: bookingSearchLink(d.city, d.country, start, end),
        },
        createdAt: item.createdAt.toISOString(),
      };
    }),
  });
});

const idParam = z.object({ id: z.string().uuid() });

shortlistRouter.delete("/:id", requireAuth, async (req, res) => {
  const parsed = idParam.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  // Row-level ownership check: the delete is scoped to the authenticated
  // user, so guessing another user's shortlist id is a no-op 404.
  const { count } = await prisma.shortlist.deleteMany({
    where: { id: parsed.data.id, userId: req.userId! },
  });
  if (count === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).end();
});
