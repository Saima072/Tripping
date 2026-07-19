import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { swipeLimiter } from "../middleware/rateLimit.js";
import { nextDeck } from "../services/deck.js";

export const deckRouter = Router();

deckRouter.get("/next", requireAuth, swipeLimiter, async (req, res) => {
  const cards = await nextDeck(req.userId!);
  res.json({ cards });
});
