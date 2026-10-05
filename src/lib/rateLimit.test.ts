import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { clientIp, rateLimit, resetRateLimits } from './rateLimit';

afterEach(() => resetRateLimits());

describe('clientIp', () => {
    it('prefers X-Real-IP, which Railway overwrites and callers cannot forge', () => {
        const request = new Request('http://x/', {
            headers: { 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '6.6.6.6, 203.0.113.7' },
        });
        expect(clientIp(request)).toBe('203.0.113.7');
    });

    it('falls back to the first X-Forwarded-For entry, then "unknown"', () => {
        expect(
            clientIp(new Request('http://x/', { headers: { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' } }))
        ).toBe('198.51.100.1');
        expect(clientIp(new Request('http://x/'))).toBe('unknown');
    });
});

describe('rateLimit', () => {
    it('throws a 429 rate_limited error once the bucket is empty', () => {
        rateLimit('test', 2, 60_000);
        rateLimit('test', 2, 60_000);
        let caught: unknown;
        try {
            rateLimit('test', 2, 60_000);
        } catch (error) {
            caught = error;
        }
        expect(caught).toBeInstanceOf(ApiError);
        expect((caught as ApiError).code).toBe('rate_limited');
        expect((caught as ApiError).status).toBe(429);
    });

    it('keeps separate buckets per key', () => {
        rateLimit('a', 1, 60_000);
        expect(() => rateLimit('b', 1, 60_000)).not.toThrow();
    });
});
