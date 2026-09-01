/**
 * Model-specific RPM (Requests Per Minute) Rate Limiter.
 * Strictly limits API generation & preview requests to 2 RPM per model with a 1-minute window.
 */

interface RateLimitBucket {
  windowStart: number;
  requestCount: number;
}

const modelBuckets = new Map<string, RateLimitBucket>();
const RPM_LIMIT = 2;
const WINDOW_MS = 60 * 1000; // 60 seconds

export interface RateLimitCheckResult {
  allowed: boolean;
  usedCount: number;
  remainingSlots: number;
  totalLimit: number;
  windowSecondsRemaining: number;
  resetTimeMs: number;
}

/**
 * Checks and registers a request for a specific model.
 * - 1st request starts the 60-second window.
 * - 2nd request is allowed within that 60-second window.
 * - 3rd request within the 60-second window is BLOCKED until the window expires.
 * - After 60 seconds, the window auto-resets to 0 used.
 */
export function checkModelRateLimit(
  modelId: string = 'gemini-2.5-flash-preview-tts',
  recordUsage: boolean = true
): RateLimitCheckResult {
  const now = Date.now();
  const normalizedModel = modelId || 'gemini-2.5-flash-preview-tts';

  let bucket = modelBuckets.get(normalizedModel);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    // Window expired or not started yet -> auto reset
    bucket = { windowStart: 0, requestCount: 0 };
    modelBuckets.set(normalizedModel, bucket);
  }

  // Calculate window remaining time
  const isWindowActive = bucket.windowStart > 0 && now - bucket.windowStart < WINDOW_MS;
  const resetTimeMs = isWindowActive ? bucket.windowStart + WINDOW_MS : now;
  const windowSecondsRemaining = isWindowActive
    ? Math.max(0, Math.ceil((resetTimeMs - now) / 1000))
    : 0;

  // If already used 2 requests in this 1-minute window, block
  if (isWindowActive && bucket.requestCount >= RPM_LIMIT) {
    return {
      allowed: false,
      usedCount: bucket.requestCount,
      remainingSlots: 0,
      totalLimit: RPM_LIMIT,
      windowSecondsRemaining: Math.max(1, windowSecondsRemaining),
      resetTimeMs,
    };
  }

  if (recordUsage) {
    if (!isWindowActive) {
      // 1st request starts the 60s countdown window
      bucket.windowStart = now;
      bucket.requestCount = 1;
    } else {
      // 2nd request in active window
      bucket.requestCount += 1;
    }
  }

  const currentUsed = bucket.requestCount;
  const remainingSlots = Math.max(0, RPM_LIMIT - currentUsed);
  const activeRemainingSeconds = bucket.windowStart > 0
    ? Math.max(0, Math.ceil((bucket.windowStart + WINDOW_MS - now) / 1000))
    : 0;

  return {
    allowed: true,
    usedCount: currentUsed,
    remainingSlots,
    totalLimit: RPM_LIMIT,
    windowSecondsRemaining: activeRemainingSeconds,
    resetTimeMs: bucket.windowStart > 0 ? bucket.windowStart + WINDOW_MS : now,
  };
}
