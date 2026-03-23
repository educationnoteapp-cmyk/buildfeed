// lib/rate-limit.ts — In-memory sliding-window rate limiter.
//
// Designed for Next.js API routes (Node.js runtime only).
// State lives in module-level memory, so it resets on cold starts —
// good enough for MVP without a Redis dependency.
//
// Usage:
//   const result = rateLimit(`checkout:${ip}`, 5, 60_000);
//   if (!result.success) return 429 with Retry-After: result.retryAfter

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/** Prune stale entries from the store to prevent unbounded memory growth. */
function maybeCleanup(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length === 0) store.delete(key);
  }
  lastCleanup = now;
}

/**
 * Sliding-window rate limiter.
 *
 * @param key         Unique key per resource+identity (e.g. `checkout:1.2.3.4`)
 * @param maxRequests Maximum number of requests allowed within `windowMs`
 * @param windowMs    Sliding window size in milliseconds (default: 60 s)
 * @returns `{ success: true }` or `{ success: false, retryAfter: seconds }`
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs = 60_000,
): { success: true } | { success: false; retryAfter: number } {
  const now = Date.now();

  maybeCleanup(windowMs);

  const entry: WindowEntry = store.get(key) ?? { timestamps: [] };

  // Evict timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    // Oldest timestamp tells us when the window opens up again
    const oldestTs = entry.timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldestTs + windowMs - now) / 1000));
    return { success: false, retryAfter };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { success: true };
}

/** Extract the best-effort client IP from a Next.js request. */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}
