import { describe, expect, it } from 'vitest';
import { requiredGivenCount } from './trader';

describe('requiredGivenCount', () => {
    it('is two at the starting balance and one from zero upward', () => {
        expect(requiredGivenCount(-1)).toBe(2);
        expect(requiredGivenCount(0)).toBe(1);
        expect(requiredGivenCount(3)).toBe(1);
    });
});
