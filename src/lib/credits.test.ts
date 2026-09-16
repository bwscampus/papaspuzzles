import { describe, expect, it } from 'vitest';
import { requiredGivenCount } from './trader';

describe('credit ledger rules', () => {
    it('someone at the starting balance (-1) must give two puzzles to take one', () => {
        expect(requiredGivenCount(-1)).toBe(2);
    });
    it('anyone at zero or above trades one for one', () => {
        expect(requiredGivenCount(0)).toBe(1);
        expect(requiredGivenCount(5)).toBe(1);
    });
    it('a pending 2-for-1 trade (balance -2) needs three, never fewer than one', () => {
        expect(requiredGivenCount(-2)).toBe(3);
        expect(requiredGivenCount(100)).toBe(1);
    });
});
