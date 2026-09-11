import { describe, expect, it } from 'vitest';
import { requiredGivenCount } from './trader';

describe('requiredGivenCount', () => {
    it('requires two puzzles from traders who have not added any', () => {
        expect(requiredGivenCount(0)).toBe(2);
    });

    it('requires one puzzle once at least one has been added', () => {
        expect(requiredGivenCount(1)).toBe(1);
        expect(requiredGivenCount(7)).toBe(1);
    });
});
