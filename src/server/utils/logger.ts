import pino from "pino";

// Maps pino level names to Google Cloud Logging severity strings.
// Cloud Run writes stdout to Cloud Logging; structured JSON with a
// 'severity' field is parsed automatically without any agent setup.
const gcpSeverity: Record<string, string> = {
  trace: "DEBUG",
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
  fatal: "CRITICAL",
};

const isDev = process.env.NODE_ENV !== "production";

const logger = pino({
  messageKey: "message",
  base: undefined, // omit pid / hostname — GCP attaches container metadata at ingest
  // RFC 3339 timestamp so Cloud Logging promotes it to the official entry timestamp.
  // Without this, pino emits epoch ms which GCP ignores, causing ingestion-time drift.
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  formatters: {
    level(label) {
      return { severity: gcpSeverity[label] ?? "DEFAULT" };
    },
  },
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, messageKey: "message" },
    },
  }),
});

export default logger;
