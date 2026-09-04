import { handle, ok, readJson, unauthorized } from '@/lib/api';
import { toUser, type UserRow } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { createSession, hashPassword, verifyPassword } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Verified against when the email is unknown so response time does not reveal which emails exist.
let dummyHash: Promise<string> | null = null;

export const POST = handle('auth/signin', async (request) => {
    rateLimit(`signin:${clientIp(request)}`, 10, 15 * 60 * 1000);
    const body = await readJson(request);
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) throw unauthorized('Incorrect email or password.');

    const row = await queryOne<UserRow & { password_hash: string }>(
        'select id, email, display_name, session_version, password_hash from users where lower(email) = lower($1)',
        [email]
    );

    dummyHash ??= hashPassword('dummy-password-for-timing');
    const valid = await verifyPassword(password, row?.password_hash ?? (await dummyHash));
    if (!row || !valid) throw unauthorized('Incorrect email or password.');

    await createSession(row.id, row.session_version);
    return ok({ user: toUser(row) });
});
