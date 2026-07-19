import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { generalLimiter } from "./middleware/rateLimit.js";
import { authRouter } from "./routes/auth.js";
import { deckRouter } from "./routes/deck.js";
import { swipesRouter } from "./routes/swipes.js";
import { shortlistRouter } from "./routes/shortlist.js";
import { filtersRouter } from "./routes/filters.js";

export function createApp() {
  const app = express();

  // Behind a reverse proxy/load balancer in production; needed for correct
  // client IPs in rate limiting.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
        },
      },
      strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
      referrerPolicy: { policy: "no-referrer" },
    })
  );
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    })
  );
  app.use(express.json({ limit: "16kb" }));
  app.use(cookieParser());
  app.use(generalLimiter);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/deck", deckRouter);
  app.use("/api/swipes", swipesRouter);
  app.use("/api/shortlist", shortlistRouter);
  app.use("/api/filters", filtersRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  // Central error handler: log details server-side, return a generic message.
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error("unhandled_error", {
        message: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({ error: "Something went wrong" });
    }
  );

  return app;
}
