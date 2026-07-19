import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { swipeLimiter } from "../middleware/rateLimit.js";

export const swipesRouter = Router();

const swipeSchema = z
  .object({
    destinationId: z.string().uuid(),
    direction: z.enum(["left", "right"]),
    dateRangeStart: z.string().date().optional(),
    dateRangeEnd: z.string().date().optional(),
  })
  .strict();

swipesRouter.post("/", requireAuth, swipeLimiter, async (req, res) => {
  const parsed = swipeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid swipe payload" });
    return;
  }
  const { destinationId, direction, dateRangeStart, dateRangeEnd } = parsed.data;

  const destination = await prisma.destination.findUnique({ where: { id: destinationId } });
  if (!destination) {
    res.status(404).json({ error: "Destination not found" });
    return;
  }

  await prisma.swipe.create({
    data: { userId: req.userId!, destinationId, direction },
  });

  if (direction === "right") {
    await prisma.shortlist.upsert({
      where: { userId_destinationId: { userId: req.userId!, destinationId } },
      update: {
        dateRangeStart: dateRangeStart ? new Date(dateRangeStart) : undefined,
        dateRangeEnd: dateRangeEnd ? new Date(dateRangeEnd) : undefined,
      },
      create: {
        userId: req.userId!,
        destinationId,
        dateRangeStart: dateRangeStart ? new Date(dateRangeStart) : null,
        dateRangeEnd: dateRangeEnd ? new Date(dateRangeEnd) : null,
      },
    });
  }

  res.status(201).json({ ok: true });
});
