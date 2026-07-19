import type { NextFunction, Request, Response } from "express";
import { CSRF_COOKIE } from "../lib/tokens.js";
import { logger } from "../lib/logger.js";

// Double-submit CSRF check for endpoints authenticated by cookie (refresh /
// logout). Everything else authenticates via the Authorization header, which
// browsers never attach cross-site. SameSite=Strict on the cookies is the
// first line of defense; this is defense in depth.
export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers["x-csrf-token"];
  if (!cookieToken || typeof headerToken !== "string" || headerToken !== cookieToken) {
    logger.warn("csrf_rejected", { path: req.path, ip: req.ip });
    res.status(403).json({ error: "CSRF token missing or invalid" });
    return;
  }
  next();
}
