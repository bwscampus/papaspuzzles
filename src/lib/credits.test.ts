import { describe, expect, it } from 'vitest';
import { creditsForBatch } from './credits';

describe('creditsForBatch', () => {
    it('gives new traders one less than the puzzle count', () => {
        expect(creditsForBatch(1, true)).toBe(0);
        expect(creditsForBatch(2, true)).toBe(1);
        expect(creditsForBatch(10, true)).toBe(9);
    });

    it('gives returning traders one credit per puzzle', () => {
        expect(creditsForBatch(1, false)).toBe(1);
        expect(creditsForBatch(10, false)).toBe(10);
    });

    it('never goes negative or rewards empty batches', () => {
        expect(creditsForBatch(0, true)).toBe(0);
        expect(creditsForBatch(0, false)).toBe(0);
        expect(creditsForBatch(-3, false)).toBe(0);
        expect(creditsForBatch(2.5, false)).toBe(0);
    });
});
