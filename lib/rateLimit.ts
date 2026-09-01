/**
 * Model-specific RPM (Requests Per Minute) Rate Limiter.
 * Strictly limits API generation & preview requests to 2 RPM per model.
 */

interface RateLimitBucket {
  timestamps: number[];
}

const modelBuckets = new Map<string, RateLimitBucket>();
const RPM_LIMIT = 2;
const WINDOW_MS = 60 * 1000; // 60 seconds

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  totalLimit: number;
  retryAfterSeconds: number;
  resetTimeMs: number;
}

/**
 * Checks and registers a request for a specific model.
 * If recordUsage = false, only inspects current status without consuming a slot.
 */
export function checkModelRateLimit(
  modelId: string = 'gemini-3.1-flash-tts-preview',
  recordUsage: boolean = true
): RateLimitCheckResult {
  const now = Date.now();
  const normalizedModel = modelId || 'gemini-3.1-flash-tts-preview';

  let bucket = modelBuckets.get(normalizedModel);
  if (!bucket) {
    bucket = { timestamps: [] };
    modelBuckets.set(normalizedModel, bucket);
  }

  // Filter timestamps within the 60-second window
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);

  if (bucket.timestamps.length >= RPM_LIMIT) {
    // Limit reached
    const oldest = bucket.timestamps[0];
    const resetTimeMs = oldest + WINDOW_MS;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

    return {
      allowed: false,
      remaining: 0,
      totalLimit: RPM_LIMIT,
      retryAfterSeconds,
      resetTimeMs,
    };
  }

  if (recordUsage) {
    bucket.timestamps.push(now);
  }

  const remaining = Math.max(0, RPM_LIMIT - bucket.timestamps.length);
  const oldest = bucket.timestamps.length > 0 ? bucket.timestamps[0] : now;
  const resetTimeMs = oldest + WINDOW_MS;
  const retryAfterSeconds = bucket.timestamps.length > 0 ? Math.max(0, Math.ceil((resetTimeMs - now) / 1000)) : 0;

  return {
    allowed: true,
    remaining,
    totalLimit: RPM_LIMIT,
    retryAfterSeconds,
    resetTimeMs,
  };
}
