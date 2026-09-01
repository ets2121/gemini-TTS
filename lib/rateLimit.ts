/**
 * Shared Global Rate Limiter for Gemini TTS API.
 * Uses globalThis to ensure rate limit state persists across route invocations and Next.js dev bundles.
 *
 * Rules:
 * - Maximum 2 requests per 60-second window across TTS speech generations & live previews.
 * - 1st request starts the 60-second window (0/2 -> 1/2 used).
 * - 2nd request within that 60s window is allowed (1/2 -> 2/2 used).
 * - 3rd request within that 60s window is BLOCKED with the exact remaining cooldown seconds.
 * - When 60s expires, quota automatically resets to 0/2 used.
 */

interface RateLimitBucket {
  windowStart: number;
  requestCount: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __ttsRateLimitBucket: RateLimitBucket | undefined;
}

if (!globalThis.__ttsRateLimitBucket) {
  globalThis.__ttsRateLimitBucket = { windowStart: 0, requestCount: 0 };
}

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
  _modelId: string = 'gemini-2.5-flash-preview-tts',
  recordUsage: boolean = true
): RateLimitCheckResult {
  const now = Date.now();
  const bucket = globalThis.__ttsRateLimitBucket!;

  // Check if the current 60-second window has expired
  if (bucket.windowStart > 0 && now - bucket.windowStart >= WINDOW_MS) {
    bucket.windowStart = 0;
    bucket.requestCount = 0;
  }

  const isWindowActive = bucket.windowStart > 0 && now - bucket.windowStart < WINDOW_MS;
  const resetTimeMs = isWindowActive ? bucket.windowStart + WINDOW_MS : now;
  const windowSecondsRemaining = isWindowActive
    ? Math.max(0, Math.ceil((resetTimeMs - now) / 1000))
    : 0;

  // If 2 requests have already been consumed in the active window, block 3rd attempt
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
      // 1st request: begin the 60s window
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

export function resetRateLimitBucket(): void {
  if (globalThis.__ttsRateLimitBucket) {
    globalThis.__ttsRateLimitBucket.windowStart = 0;
    globalThis.__ttsRateLimitBucket.requestCount = 0;
  }
}
