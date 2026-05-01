import { Request, Response, NextFunction } from "express";

interface BucketEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
  /** Human-readable name for the user-facing 429 message. */
  displayName: string;
}

/**
 * Per-user fixed-window counter. Stored in-process, so each Cloud Run
 * instance enforces its own quota — fine for blocking single-user abuse,
 * not a global cost ceiling. Auth middleware must run first; req.user.uid
 * is the bucket key. Falls open (no limit) if uid is missing rather than
 * leaking 429s on misconfigured chains.
 *
 * The bucket map prunes one expired entry per request to bound memory
 * to roughly the active-user count over a window.
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const { limit, windowMs, displayName } = options;
  const buckets = new Map<string, BucketEntry>();

  return (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore — set by authMiddleware
    const uid: string | undefined = req.user?.uid;
    if (!uid) {
      return next();
    }

    const now = Date.now();

    // Opportunistic prune of one expired entry per request, bounding
    // the map to ~active-user count even over long-running processes.
    if (buckets.size > 1) {
      for (const [otherUid, otherEntry] of buckets) {
        if (otherUid !== uid && otherEntry.resetAt <= now) {
          buckets.delete(otherUid);
          break;
        }
      }
    }

    let entry = buckets.get(uid);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(uid, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, limit - entry.count);
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error: `Too many ${displayName} requests. Try again in ${retryAfterSeconds} seconds.`,
      });
    }

    return next();
  };
};

const parseIntEnv = (value: string | undefined, fallback: number, min: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
};

const GEMINI_LIMIT = parseIntEnv(process.env.GEMINI_RATE_LIMIT_PER_USER, 30, 1);
const GEMINI_WINDOW_MS = parseIntEnv(process.env.GEMINI_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000, 1000);

/**
 * Shared limiter for all Gemini-using routes. Both /analyze-task and
 * /tasks/analyze-and-create call the same upstream API and consume the
 * same quota, so they share a bucket per user.
 */
export const geminiRateLimit = createRateLimiter({
  limit: GEMINI_LIMIT,
  windowMs: GEMINI_WINDOW_MS,
  displayName: "AI analysis",
});
