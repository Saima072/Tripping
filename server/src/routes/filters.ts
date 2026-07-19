import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const filtersRouter = Router();

const ALLOWED_TAGS = [
  "beach", "hiking", "nightlife", "culture", "budget-friendly", "food",
  "adventure", "romantic", "city-break", "nature", "islands", "history",
  "winter-sports", "wellness", "surfing", "diving", "desert", "wildlife",
  "shopping", "architecture",
] as const;

const filtersSchema = z
  .object({
    budgetCap: z.number().positive().max(100000).nullable(),
    preferredSeason: z.enum(["spring", "summer", "fall", "winter"]).nullable(),
    preferredTags: z.array(z.enum(ALLOWED_TAGS)).max(10),
  })
  .strict();

filtersRouter.get("/", requireAuth, async (req, res) => {
  const filters = await prisma.userFilters.findUnique({ where: { userId: req.userId! } });
  res.json({
    filters: {
      budgetCap: filters?.budgetCap ? Number(filters.budgetCap) : null,
      preferredSeason: filters?.preferredSeason ?? null,
      preferredTags: filters?.preferredTags ?? [],
    },
    availableTags: ALLOWED_TAGS,
  });
});

filtersRouter.put("/", requireAuth, async (req, res) => {
  const parsed = filtersSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid filters" });
    return;
  }
  const { budgetCap, preferredSeason, preferredTags } = parsed.data;
  const filters = await prisma.userFilters.upsert({
    where: { userId: req.userId! },
    update: { budgetCap, preferredSeason, preferredTags },
    create: { userId: req.userId!, budgetCap, preferredSeason, preferredTags },
  });
  res.json({
    filters: {
      budgetCap: filters.budgetCap ? Number(filters.budgetCap) : null,
      preferredSeason: filters.preferredSeason,
      preferredTags: filters.preferredTags,
    },
  });
});
