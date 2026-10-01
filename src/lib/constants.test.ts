import { describe, expect, it } from 'vitest';
import { SERVICE_ZIPS, isEmail, isServiceZip, normalizeEmail, normalizeZip, pieceLabel } from './constants';

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

describe('normalizeZip', () => {
    it('returns the 5-digit form', () => {
        expect(normalizeZip(' 90012 ')).toBe('90012');
        expect(normalizeZip('90012-1234')).toBe('90012');
        expect(normalizeZip('00501')).toBe('00501');
    });
    it('rejects anything that is not a ZIP', () => {
        expect(normalizeZip('9001')).toBeNull();
        expect(normalizeZip('900123')).toBeNull();
        expect(normalizeZip('abcde')).toBeNull();
        expect(normalizeZip('')).toBeNull();
    });
});

describe('isServiceZip', () => {
    const list = ['90012', '90210'];
    it('accepts only listed ZIPs once a list is set', () => {
        expect(isServiceZip('90012', list)).toBe(true);
        expect(isServiceZip('90210-4321', list)).toBe(true);
        expect(isServiceZip('10001', list)).toBe(false);
    });
    it('accepts any well-formed ZIP while the list is empty', () => {
        expect(isServiceZip('10001', [])).toBe(true);
    });
    it('never accepts a malformed ZIP', () => {
        expect(isServiceZip('9001', list)).toBe(false);
        expect(isServiceZip('9001', [])).toBe(false);
    });
});

describe('SERVICE_ZIPS', () => {
    it('holds unique 5-digit strings', () => {
        for (const zip of SERVICE_ZIPS) expect(zip).toMatch(/^\d{5}$/);
        expect(new Set(SERVICE_ZIPS).size).toBe(SERVICE_ZIPS.length);
    });
});

describe('pieceLabel', () => {
    it('labels the top bucket as 2000+', () => {
        expect(pieceLabel(500)).toBe('500');
        expect(pieceLabel(2000)).toBe('2000+');
    });
});
