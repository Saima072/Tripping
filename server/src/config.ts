import crypto from "node:crypto";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  // Demo mode: run an embedded in-process Postgres (PGlite) instead of a
  // server. Data is EPHEMERAL — resets on every cold start/redeploy.
  EMBEDDED_DB: z.string().optional(),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Never echo env values back — only which keys failed validation.
  console.error(
    "Invalid environment configuration:",
    parsed.error.issues.map((i) => i.path.join(".")).join(", ")
  );
  process.exit(1);
}

const env = parsed.data;

const TRUTHY = new Set(["1", "true", "yes", "on"]);
const FALSY = new Set(["0", "false", "no", "off"]);
const embeddedFlag = env.EMBEDDED_DB?.trim().toLowerCase();
// Explicit flag wins; with no flag at all, fall back to embedded demo mode
// when no DATABASE_URL is configured (zero-config deploys), loudly.
const embeddedDb = embeddedFlag
  ? TRUTHY.has(embeddedFlag)
  : !env.DATABASE_URL;

if (embeddedFlag && !TRUTHY.has(embeddedFlag) && !FALSY.has(embeddedFlag)) {
  console.error("Invalid environment configuration: EMBEDDED_DB must be a boolean-like value");
  process.exit(1);
}
if (!embeddedDb && !env.DATABASE_URL) {
  console.error("Invalid environment configuration: DATABASE_URL is required unless EMBEDDED_DB=1");
  process.exit(1);
}
if (embeddedDb && !env.EMBEDDED_DB) {
  console.warn(
    "No DATABASE_URL configured — falling back to the EPHEMERAL embedded demo database (PGlite). " +
      "Set DATABASE_URL for persistent data, or EMBEDDED_DB=1 to silence this warning."
  );
}
if (!embeddedDb && (!env.JWT_ACCESS_SECRET || !env.JWT_REFRESH_SECRET)) {
  console.error(
    "Invalid environment configuration: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required unless EMBEDDED_DB=1"
  );
  process.exit(1);
}

// In embedded demo mode missing JWT secrets fall back to per-boot random
// values: sessions die with the instance, which matches the ephemeral data.
// Real deployments must always set both secrets explicitly.
const randomSecret = () => crypto.randomBytes(48).toString("hex");

export const config = {
  ...env,
  JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET ?? randomSecret(),
  JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET ?? randomSecret(),
  embeddedDb,
  isProd: env.NODE_ENV === "production",
  accessTokenTtlSec: 15 * 60, // 15 minutes
  refreshTokenTtlSec: 30 * 24 * 60 * 60, // 30 days, rotated on every refresh
};
