import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { queryOne } from '@/lib/db';

const scrypt = promisify(scryptCb);

const SESSION_COOKIE = 'pp_session';
const SESSION_DAYS = 30;

export interface SessionUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: null;
}

interface UserRow {
    uid: string;
    email: string | null;
    display_name: string | null;
}

function secretKey(): Uint8Array {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error('SESSION_SECRET is not set (use a long random string).');
    }
    return new TextEncoder().encode(secret);
}

// ---------- Passwords ----------

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
    if (!stored) return false;
    const [scheme, saltHex, keyHex] = stored.split('$');
    if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;
    const expected = Buffer.from(keyHex, 'hex');
    const actual = (await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)) as Buffer;
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

// ---------- Sessions (httpOnly JWT cookie) ----------

export async function createSession(uid: string): Promise<void> {
    const token = await new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(uid)
        .setIssuedAt()
        .setExpirationTime(`${SESSION_DAYS}d`)
        .sign(secretKey());

    (await cookies()).set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_DAYS * 24 * 60 * 60,
    });
}

export async function clearSession(): Promise<void> {
    (await cookies()).set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
}

/** Returns the uid from a valid session cookie, or null. */
export async function getSessionUid(): Promise<string | null> {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, secretKey());
        return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
        return null;
    }
}

export function toSessionUser(row: UserRow): SessionUser {
    return { uid: row.uid, email: row.email, displayName: row.display_name, photoURL: null };
}

/** Loads the signed-in user from the database, or null when signed out. */
export async function getSessionUser(): Promise<SessionUser | null> {
    const uid = await getSessionUid();
    if (!uid) return null;
    const row = await queryOne<UserRow>('select uid, email, display_name from users where uid = $1', [uid]);
    return row ? toSessionUser(row) : null;
}
