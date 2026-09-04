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
}

export function toUser(row: UserRow): User {
    return { id: row.id, email: row.email, displayName: row.display_name, isAdmin: isAdminEmail(row.email) };
}

export async function findUserById(id: string, client?: Queryable): Promise<UserRow | null> {
    return queryOne<UserRow>(
        'select id, email, display_name, session_version from users where id = $1',
        [id],
        client
    );
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

export async function requireAdmin(): Promise<User> {
    const user = await requireUser();
    if (!user.isAdmin) throw forbidden();
    return user;
}
