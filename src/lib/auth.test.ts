import { afterEach, describe, expect, it } from 'vitest';
import { isAdminEmail, toUser } from './auth';

const original = process.env.ADMIN_EMAILS;

afterEach(() => {
    process.env.ADMIN_EMAILS = original;
});

describe('isAdminEmail', () => {
    it('matches listed emails case-insensitively and ignores whitespace', () => {
        process.env.ADMIN_EMAILS = ' Founder@PapasPuzzles.org , helper@example.com';
        expect(isAdminEmail('founder@papaspuzzles.org')).toBe(true);
        expect(isAdminEmail('HELPER@example.com')).toBe(true);
        expect(isAdminEmail('someone@example.com')).toBe(false);
        expect(isAdminEmail(null)).toBe(false);
    });

    it('treats an unset variable as no admins', () => {
        delete process.env.ADMIN_EMAILS;
        expect(isAdminEmail('founder@papaspuzzles.org')).toBe(false);
    });
});

describe('toUser', () => {
    it('computes isAdmin from the email, never from the row', () => {
        process.env.ADMIN_EMAILS = 'a@b.co';
        const user = toUser({ id: '1', email: 'a@b.co', display_name: null, session_version: 1 });
        expect(user).toEqual({ id: '1', email: 'a@b.co', displayName: null, isAdmin: true });
    });
});
