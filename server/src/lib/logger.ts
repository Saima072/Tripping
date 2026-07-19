// Minimal structured logger. Security events (auth failures, rate-limit hits)
// are logged for monitoring; secrets/passwords/tokens must never be passed in.
type Level = "info" | "warn" | "error";

function log(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const entry = { ts: new Date().toISOString(), level, event, ...fields };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, fields?: Record<string, unknown>) => log("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => log("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => log("error", event, fields),
};
