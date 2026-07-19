import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { Response } from "express";
import { config } from "../config.js";
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

export const REFRESH_COOKIE = "ts_refresh";
export const CSRF_COOKIE = "ts_csrf";

export interface AccessPayload {
  sub: string; // user id
}

export function signAccessToken(userId: string): string {
  return jwt.sign({}, config.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: config.accessTokenTtlSec,
    issuer: "tripswipe",
  });
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET, { issuer: "tripswipe" });
    if (typeof decoded === "object" && typeof decoded.sub === "string") {
      return { sub: decoded.sub };
    }
    return null;
  } catch {
    return null;
  }
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Refresh tokens are opaque random values; only their SHA-256 hash is stored,
// so a database leak does not leak usable tokens.
export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString("base64url");
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + config.refreshTokenTtlSec * 1000),
    },
  });
  return raw;
}

/**
 * Rotate a refresh token: the presented token is revoked and a new one issued.
 * Reuse of an already-revoked token is treated as theft — every session for
 * that user is revoked.
 */
export async function rotateRefreshToken(
  raw: string
): Promise<{ userId: string; newToken: string } | null> {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!record) return null;

  if (record.revokedAt || record.expiresAt < new Date()) {
    if (record.revokedAt) {
      logger.warn("refresh_token_reuse_detected", { userId: record.userId });
      await prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return null;
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });
  const newToken = await issueRefreshToken(record.userId);
  return { userId: record.userId, newToken };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function newCsrfToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function setAuthCookies(res: Response, refreshToken: string, csrfToken: string): void {
  const base = {
    secure: config.isProd,
    sameSite: "strict" as const,
    path: "/api/auth",
    maxAge: config.refreshTokenTtlSec * 1000,
  };
  // Refresh token: httpOnly so scripts can never read it.
  res.cookie(REFRESH_COOKIE, refreshToken, { ...base, httpOnly: true });
  // CSRF token: readable by the SPA, echoed back in the X-CSRF-Token header
  // on cookie-authenticated requests (double-submit pattern).
  res.cookie(CSRF_COOKIE, csrfToken, { ...base, httpOnly: false });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.clearCookie(CSRF_COOKIE, { path: "/api/auth" });
}
