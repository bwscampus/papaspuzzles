import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import {
    validateDate,
    validateDropoffSlot,
    validateEmail,
    validateEnum,
    validatePassword,
    validatePuzzleInput,
    validatePuzzleInputs,
    validateUuidArray,
} from './validate';

const goodPuzzle = {
    name: 'Salt Lake Winter',
    pieces: 1000,
    theme: 'Landscape',
    condition: 'good',
    imageUrl: '/uploads/123-photo.jpg',
};

function fieldOf(fn: () => unknown): string | undefined {
    try {
        fn();
    } catch (e) {
        if (e instanceof ApiError) return e.field;
        throw e;
    }
    return undefined;
}

describe('validateEmail', () => {
    it('lowercases and trims', () => {
        expect(validateEmail('  Ada@Example.COM ')).toBe('ada@example.com');
    });
    it('rejects malformed addresses', () => {
        expect(() => validateEmail('nope')).toThrow(ApiError);
        expect(() => validateEmail('')).toThrow(ApiError);
    });
});

describe('validatePassword', () => {
    it('enforces the minimum length', () => {
        expect(() => validatePassword('short')).toThrow(/at least 8/);
        expect(validatePassword('longenough')).toBe('longenough');
    });
});

describe('validateEnum', () => {
    it('accepts numeric strings for numeric lists', () => {
        expect(validateEnum('500', [100, 500] as const, 'pieces')).toBe(500);
    });
    it('rejects values outside the list', () => {
        expect(() => validateEnum('Space', ['Animals', 'Art'] as const, 'theme')).toThrow(/must be one of/);
    });
});

describe('validatePuzzleInput', () => {
    it('returns a normalized PuzzleInput', () => {
        expect(validatePuzzleInput({ ...goodPuzzle, pieces: '1000', name: '  Salt Lake Winter ' })).toEqual(
            goodPuzzle
        );
    });
    it('names the failing field', () => {
        expect(fieldOf(() => validatePuzzleInput({ ...goodPuzzle, theme: 'Space' }, 'puzzles.1'))).toBe(
            'puzzles.1.theme'
        );
        expect(fieldOf(() => validatePuzzleInput({ ...goodPuzzle, condition: 'mint' }))).toBe(
            'puzzle.condition'
        );
    });
    it('rejects difficulty-era and external image urls', () => {
        expect(() => validatePuzzleInput({ ...goodPuzzle, imageUrl: 'https://evil.example/x.png' })).toThrow(
            /upload a photo/
        );
        expect(() => validatePuzzleInput({ ...goodPuzzle, imageUrl: '/uploads/../secret' })).toThrow(
            ApiError
        );
    });
});

describe('validatePuzzleInputs', () => {
    it('enforces min and max counts', () => {
        expect(() => validatePuzzleInputs([], 'puzzles', { min: 1 })).toThrow(/at least one/);
        expect(() => validatePuzzleInputs([goodPuzzle], 'puzzles', { min: 2 })).toThrow(/add 2 puzzles/);
        expect(() => validatePuzzleInputs(Array(21).fill(goodPuzzle), 'puzzles', { min: 1 })).toThrow(
            /at most 20/
        );
        expect(validatePuzzleInputs([goodPuzzle, goodPuzzle], 'puzzles', { min: 2 })).toHaveLength(2);
    });
});

describe('validateUuidArray', () => {
    const id = '0b6a4f4e-6f1d-4a2e-9d0c-1f6c2c9b6f10';
    it('dedupes and lowercases', () => {
        expect(validateUuidArray([id, id.toUpperCase()], 'ids', 5)).toEqual([id]);
    });
    it('rejects bad ids and empty arrays', () => {
        expect(() => validateUuidArray(['nope'], 'ids', 5)).toThrow(ApiError);
        expect(() => validateUuidArray([], 'ids', 5)).toThrow(ApiError);
    });
});

describe('dates and slots', () => {
    it('accepts ISO dates and known slots', () => {
        expect(validateDate('2026-09-10', 'dropoffDate')).toBe('2026-09-10');
        expect(validateDropoffSlot('14:00')).toBe('14:00');
    });
    it('rejects other formats', () => {
        expect(() => validateDate('09/10/2026', 'dropoffDate')).toThrow(ApiError);
        expect(() => validateDropoffSlot('15:00')).toThrow(ApiError);
    });
});
