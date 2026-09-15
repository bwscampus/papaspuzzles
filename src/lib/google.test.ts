import { afterEach, describe, expect, it } from 'vitest';
import { buildAuthUrl, isGoogleEnabled, pkceChallenge, randomToken } from './google';

const saved = { ...process.env };
afterEach(() => {
    process.env = { ...saved };
});

describe('pkce', () => {
    it('derives the RFC 7636 S256 challenge', () => {
        // Example from RFC 7636 appendix B.
        expect(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
            'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
        );
    });
    it('produces url-safe random tokens', () => {
        expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{40,}$/);
        expect(randomToken()).not.toBe(randomToken());
    });
});

describe('configuration', () => {
    it('is disabled until all three variables are set', () => {
        delete process.env.GOOGLE_CLIENT_ID;
        expect(isGoogleEnabled()).toBe(false);
        process.env.GOOGLE_CLIENT_ID = 'id';
        process.env.GOOGLE_CLIENT_SECRET = 'secret';
        process.env.APP_URL = 'https://www.papaspuzzles.org/';
        expect(isGoogleEnabled()).toBe(true);
    });
    it('builds an authorize URL with PKCE and the app callback', () => {
        process.env.GOOGLE_CLIENT_ID = 'id';
        process.env.APP_URL = 'https://www.papaspuzzles.org/';
        const url = new URL(buildAuthUrl('state1', 'verifier1'));
        expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
        expect(url.searchParams.get('redirect_uri')).toBe(
            'https://www.papaspuzzles.org/api/auth/google/callback'
        );
        expect(url.searchParams.get('state')).toBe('state1');
        expect(url.searchParams.get('code_challenge')).toBe(pkceChallenge('verifier1'));
        expect(url.searchParams.get('scope')).toContain('email');
    });
});
