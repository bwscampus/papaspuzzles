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
    const row = { id: '1', email: 'a@b.co', display_name: null, session_version: 1 };

    it('computes isAdmin from the email, never from the row', () => {
        process.env.ADMIN_EMAILS = 'a@b.co';
        const user = toUser({ ...row, email_verified_at: new Date() });
        expect(user).toEqual({
            id: '1',
            email: 'a@b.co',
            displayName: null,
            emailVerified: true,
            isAdmin: true,
        });
    });

    it('never makes an unverified account an admin, even with a listed email', () => {
        process.env.ADMIN_EMAILS = 'a@b.co';
        const user = toUser({ ...row, email_verified_at: null });
        expect(user.emailVerified).toBe(false);
        expect(user.isAdmin).toBe(false);
    });

    it('treats a verified, unlisted email as a normal user', () => {
        process.env.ADMIN_EMAILS = 'someone-else@b.co';
        const user = toUser({ ...row, email_verified_at: '2026-10-05T00:00:00Z' });
        expect(user).toMatchObject({ emailVerified: true, isAdmin: false });
    });
});
