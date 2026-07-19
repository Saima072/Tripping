import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { logger } from "../lib/logger.js";

function onLimit(name: string) {
  return (req: Request) => {
    logger.warn("rate_limit_hit", { limiter: name, path: req.path, ip: req.ip });
  };
}

// Strict per-IP limit on credential endpoints (login/signup/reset).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => {
    onLimit("auth")(req);
    res.status(429).json({ error: "Too many attempts, try again later" });
  },
});

// Per-user (falls back to IP) limit on swipes/deck to deter deck scraping.
export const swipeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? req.ip ?? "unknown",
  handler: (req, res) => {
    onLimit("swipe")(req);
    res.status(429).json({ error: "Slow down a little" });
  },
});

// Baseline limit for everything else.
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
