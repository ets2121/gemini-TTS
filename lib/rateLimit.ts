/**
 * Rate Limiter for Gemini TTS API.
 * Rules:
 * - Exactly 2 requests allowed per 60-second window per model.
 * - 1st request starts the 60-second window (0/2 -> 1/2 used).
 * - 2nd request within that 60s window is allowed (1/2 -> 2/2 used).
 * - 3rd request within that 60s window is BLOCKED with the remaining cooldown seconds.
 * - Once the 60s window expires, quota automatically resets to 0/2 used.
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

export function checkModelRateLimit(
  modelId: string = 'gemini-2.5-flash-preview-tts',
  recordUsage: boolean = true
): RateLimitCheckResult {
  const now = Date.now();
  const normalizedModel = modelId || 'gemini-2.5-flash-preview-tts';

  let bucket = modelBuckets.get(normalizedModel);
  if (!bucket) {
    bucket = { windowStart: 0, requestCount: 0 };
    modelBuckets.set(normalizedModel, bucket);
  }

  // Check if current 60s window has expired
  if (bucket.windowStart > 0 && now - bucket.windowStart >= WINDOW_MS) {
    // 60s window has completed -> reset to 0 used
    bucket.windowStart = 0;
    bucket.requestCount = 0;
  }

  const isWindowActive = bucket.windowStart > 0 && now - bucket.windowStart < WINDOW_MS;
  const resetTimeMs = isWindowActive ? bucket.windowStart + WINDOW_MS : now;
  const windowSecondsRemaining = isWindowActive
    ? Math.max(0, Math.ceil((resetTimeMs - now) / 1000))
    : 0;

  // If 2 requests have already been used in the active window, block 3rd request
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
    if (!isWindowActive || bucket.windowStart === 0) {
      // 1st request -> start the 60s window
      bucket.windowStart = now;
      bucket.requestCount = 1;
    } else {
      // 2nd request in the active window
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
