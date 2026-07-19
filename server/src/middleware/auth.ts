import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/tokens.js";
import { logger } from "../lib/logger.js";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) {
    logger.warn("auth_failure", { path: req.path, ip: req.ip });
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = payload.sub;
  next();
}
