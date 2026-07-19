import crypto from "node:crypto";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  // Demo mode: run an embedded in-process Postgres (PGlite) instead of a
  // server. Data is EPHEMERAL — resets on every cold start/redeploy.
  EMBEDDED_DB: z.enum(["0", "1"]).default("0"),
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
const embeddedDb = env.EMBEDDED_DB === "1";

if (!embeddedDb && !env.DATABASE_URL) {
  console.error("Invalid environment configuration: DATABASE_URL is required unless EMBEDDED_DB=1");
  process.exit(1);
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
