import { describe, expect, it } from 'vitest';
import { isEmail, normalizeEmail, pieceLabel } from './constants';

describe('isEmail', () => {
    it('accepts padded and mixed-case addresses', () => {
        expect(isEmail('  Ada@Example.COM ')).toBe(true);
        expect(normalizeEmail('  Ada@Example.COM ')).toBe('ada@example.com');
    });
    it('rejects malformed addresses the server would also reject', () => {
        expect(isEmail('nope')).toBe(false);
        expect(isEmail('a@b')).toBe(false);
        expect(isEmail("o'brien@x.com")).toBe(false);
    });
});

describe('pieceLabel', () => {
    it('labels the top bucket as 2000+', () => {
        expect(pieceLabel(500)).toBe('500');
        expect(pieceLabel(2000)).toBe('2000+');
    });
});
