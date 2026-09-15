import { createHash, randomBytes } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Sign in with Google via standard OpenID Connect (authorization code + PKCE).
 * No SDK: the authorize URL is built here, the code is exchanged with fetch, and the
 * ID token is verified against Google's published keys with jose.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

export function isGoogleEnabled(): boolean {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.APP_URL);
}

function clientId(): string {
    const id = process.env.GOOGLE_CLIENT_ID;
    if (!id) throw new Error('GOOGLE_CLIENT_ID is not set.');
    return id;
}

export function redirectUri(): string {
    const base = (process.env.APP_URL ?? '').replace(/\/$/, '');
    if (!base) throw new Error('APP_URL is not set.');
    return `${base}/api/auth/google/callback`;
}

function base64url(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomToken(bytes = 32): string {
    return base64url(randomBytes(bytes));
}

/** PKCE: S256 challenge for a verifier. */
export function pkceChallenge(verifier: string): string {
    return base64url(createHash('sha256').update(verifier).digest());
}

export function buildAuthUrl(state: string, verifier: string): string {
    const params = new URLSearchParams({
        client_id: clientId(),
        redirect_uri: redirectUri(),
        response_type: 'code',
        scope: 'openid email profile',
        state,
        code_challenge: pkceChallenge(verifier),
        code_challenge_method: 'S256',
        prompt: 'select_account',
    });
    return `${AUTH_ENDPOINT}?${params}`;
}

export interface GoogleIdentity {
    sub: string;
    email: string;
    emailVerified: boolean;
    name: string | null;
}

/** Exchanges the authorization code and returns the verified identity from the ID token. */
export async function exchangeCode(code: string, verifier: string): Promise<GoogleIdentity> {
    const res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: clientId(),
            client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
            redirect_uri: redirectUri(),
            grant_type: 'authorization_code',
            code_verifier: verifier,
        }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Google token exchange failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const tokens = (await res.json()) as { id_token?: string };
    if (!tokens.id_token) throw new Error('Google response had no id_token.');
    return verifyIdToken(tokens.id_token);
}

export async function verifyIdToken(idToken: string): Promise<GoogleIdentity> {
    jwks ??= createRemoteJWKSet(new URL(JWKS_URL));
    const { payload } = await jwtVerify(idToken, jwks, { issuer: ISSUERS, audience: clientId() });
    const email = typeof payload.email === 'string' ? payload.email : '';
    if (!payload.sub || !email) throw new Error('Google ID token is missing sub or email.');
    return {
        sub: payload.sub,
        email,
        emailVerified: payload.email_verified === true,
        name: typeof payload.name === 'string' ? payload.name : null,
    };
}
