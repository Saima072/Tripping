// Vercel serverless entry point: the whole Express API runs as one function.
// Routing (/api/*) is preserved because Vercel rewrites pass the original URL.
import { createApp } from "../server/src/app.js";

const app = createApp();

export default app;
