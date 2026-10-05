import { describe, expect, it } from 'vitest';
import { sha256 } from './session';
import { newVerificationToken } from './verification';

describe('newVerificationToken', () => {
    it('returns 32 random bytes as hex and stores only their SHA-256', () => {
        const { token, tokenHash } = newVerificationToken();
        expect(token).toMatch(/^[0-9a-f]{64}$/);
        expect(tokenHash).toBe(sha256(token));
        expect(tokenHash).not.toBe(token);
    });

    it('never repeats', () => {
        const tokens = new Set(Array.from({ length: 50 }, () => newVerificationToken().token));
        expect(tokens.size).toBe(50);
    });
});
