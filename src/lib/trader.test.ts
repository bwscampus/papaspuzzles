import { describe, expect, it } from 'vitest';
import { requiredGivenCount } from './trader';

describe('requiredGivenCount', () => {
    it('requires two puzzles from new traders', () => {
        expect(requiredGivenCount(false)).toBe(2);
    });

    it('requires one puzzle from returning traders', () => {
        expect(requiredGivenCount(true)).toBe(1);
    });
});
