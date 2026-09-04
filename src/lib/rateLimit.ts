import { ApiError } from './api';

interface Bucket {
    tokens: number;
    updatedAt: number;
}

const buckets = new Map<string, Bucket>();
const SWEEP_EVERY = 1000;
let opsSinceSweep = 0;

/**
 * In-memory token bucket. Sufficient for a single app instance (see design §10).
 * `key` should combine the action and the client IP.
 */
export function rateLimit(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const refillPerMs = limit / windowMs;

    if (++opsSinceSweep >= SWEEP_EVERY) {
        opsSinceSweep = 0;
        for (const [k, b] of buckets) {
            if (now - b.updatedAt > windowMs) buckets.delete(k);
        }
    }

    const bucket = buckets.get(key) ?? { tokens: limit, updatedAt: now };
    bucket.tokens = Math.min(limit, bucket.tokens + (now - bucket.updatedAt) * refillPerMs);
    bucket.updatedAt = now;

    if (bucket.tokens < 1) {
        buckets.set(key, bucket);
        throw new ApiError('validation', 'Too many attempts. Please wait a moment and try again.');
    }
    bucket.tokens -= 1;
    buckets.set(key, bucket);
}

export function clientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/** Test helper. */
export function resetRateLimits(): void {
    buckets.clear();
}
