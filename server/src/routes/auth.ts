import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { requireCsrf } from "../middleware/csrf.js";
import { requireAuth } from "../middleware/auth.js";
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  issueRefreshToken,
  newCsrfToken,
  revokeRefreshToken,
  rotateRefreshToken,
  setAuthCookies,
  signAccessToken,
} from "../lib/tokens.js";

export const authRouter = Router();

const credentialsSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(10).max(128),
  })
  .strict();

const BCRYPT_ROUNDS = 12;
// Constant dummy hash so login always performs a bcrypt comparison —
// keeps timing identical whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_ROUNDS);

async function startSession(userId: string) {
  const refreshToken = await issueRefreshToken(userId);
  return { accessToken: signAccessToken(userId), refreshToken, csrfToken: newCsrfToken() };
}

authRouter.post("/signup", authLimiter, async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email and a password of 10+ characters" });
    return;
  }
  const { email, password } = parsed.data;

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const user = await prisma.user.create({ data: { email, passwordHash } });
    const { accessToken, refreshToken, csrfToken } = await startSession(user.id);
    setAuthCookies(res, refreshToken, csrfToken);
    res.status(201).json({ accessToken, user: { id: user.id, email: user.email } });
  } catch (e: unknown) {
    // Unique violation → email taken. Same 400 wording avoids confirming
    // which emails are registered beyond what signup inherently reveals.
    logger.warn("signup_failed", { ip: req.ip });
    res.status(400).json({ error: "Could not create account with that email" });
  }
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    logger.warn("login_failed", { ip: req.ip });
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const { accessToken, refreshToken, csrfToken } = await startSession(user.id);
  setAuthCookies(res, refreshToken, csrfToken);
  res.json({ accessToken, user: { id: user.id, email: user.email } });
});

authRouter.post("/refresh", authLimiter, requireCsrf, async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (typeof raw !== "string" || !raw) {
    res.status(401).json({ error: "No session" });
    return;
  }
  const rotated = await rotateRefreshToken(raw);
  if (!rotated) {
    clearAuthCookies(res);
    logger.warn("refresh_failed", { ip: req.ip });
    res.status(401).json({ error: "Session expired" });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: rotated.userId },
    select: { id: true, email: true },
  });
  if (!user) {
    clearAuthCookies(res);
    res.status(401).json({ error: "Session expired" });
    return;
  }
  setAuthCookies(res, rotated.newToken, newCsrfToken());
  res.json({ accessToken: signAccessToken(user.id), user });
});

authRouter.post("/logout", requireCsrf, async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (typeof raw === "string" && raw) await revokeRefreshToken(raw);
  clearAuthCookies(res);
  res.status(204).end();
});

// GDPR deletion: user row, shortlists, filters and refresh tokens are hard
// deleted (cascades); swipes are anonymized via ON DELETE SET NULL so no
// orphaned PII remains while aggregate stats survive.
authRouter.delete("/account", requireAuth, async (req, res) => {
  await prisma.user.delete({ where: { id: req.userId! } });
  clearAuthCookies(res);
  logger.info("account_deleted");
  res.status(204).end();
});
