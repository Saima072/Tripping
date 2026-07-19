import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
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

export const config = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === "production",
  accessTokenTtlSec: 15 * 60, // 15 minutes
  refreshTokenTtlSec: 30 * 24 * 60 * 60, // 30 days, rotated on every refresh
};
