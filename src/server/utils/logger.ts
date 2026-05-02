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

const logger = pino({
  messageKey: "message",
  base: undefined, // omit pid / hostname — GCP adds those from the container
  formatters: {
    level(label) {
      return { severity: gcpSeverity[label] ?? "DEFAULT" };
    },
  },
});

export default logger;
