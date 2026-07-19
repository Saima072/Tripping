import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";

const app = createApp();

app.listen(config.PORT, () => {
  logger.info("server_started", { port: config.PORT, env: config.NODE_ENV });
});
