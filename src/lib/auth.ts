import { forbidden, unauthorized } from './api';
import { queryOne, type Queryable } from './db';
import { getSession } from './session';
import type { User } from './types';

let cachedAdmins: { raw: string | undefined; set: Set<string> } | null = null;

/** Emails listed in ADMIN_EMAILS (comma-separated) are admins. Parsed once per process. */
export function adminEmails(): Set<string> {
    const raw = process.env.ADMIN_EMAILS;
    if (!cachedAdmins || cachedAdmins.raw !== raw) {
        const set = new Set(
            (raw ?? '')
                .split(',')
                .map((e) => e.trim().toLowerCase())
                .filter(Boolean)
        );
        cachedAdmins = { raw, set };
    }
    return cachedAdmins.set;
}

export function isAdminEmail(email: string | null | undefined): boolean {
    return !!email && adminEmails().has(email.trim().toLowerCase());
}

export interface UserRow {
    id: string;
    email: string;
    display_name: string | null;
    session_version: number;
    email_verified_at: Date | string | null;
}

/** Columns every query that builds a UserRow must select or return. */
export const USER_COLUMNS = 'id, email, display_name, session_version, email_verified_at';

/**
 * Admin requires a listed email *and* proof the account holder owns it. Without the second half,
 * anyone could register an ADMIN_EMAILS address before its owner does and get full admin access.
 */
export function toUser(row: UserRow): User {
    const emailVerified = row.email_verified_at !== null && row.email_verified_at !== undefined;
    return {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        emailVerified,
        isAdmin: emailVerified && isAdminEmail(row.email),
    };
}

export async function findUserById(id: string, client?: Queryable): Promise<UserRow | null> {
    return queryOne<UserRow>(`select ${USER_COLUMNS} from users where id = $1`, [id], client);
}

/** The signed-in user, or null. A session whose version no longer matches is treated as signed out. */
export async function getCurrentUser(): Promise<User | null> {
    const session = await getSession();
    if (!session) return null;
    const row = await findUserById(session.userId);
    if (!row || row.session_version !== session.version) return null;
    return toUser(row);
}

export async function requireUser(): Promise<User> {
    const user = await getCurrentUser();
    if (!user) throw unauthorized();
    return user;
}

/** Signed in with a verified email: required for anything that reads or spends the email's credits. */
export async function requireVerifiedUser(): Promise<User> {
    const user = await requireUser();
    if (!user.emailVerified) {
        throw forbidden(
            'Please verify your email address first. Check your inbox for the link, or resend it from My Trades.'
        );
    }
    return user;
}

export async function requireAdmin(): Promise<User> {
    const user = await requireUser();
    if (!user.isAdmin) throw forbidden();
    return user;
}
