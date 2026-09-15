import { conflict, handle, ok, readJson } from '@/lib/api';
import { toUser, type UserRow } from '@/lib/auth';
import { MAX_NAME_LENGTH } from '@/lib/constants';
import { queryOne } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { createSession, hashPassword } from '@/lib/session';
import { validateEmail, validatePassword, validateString } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const POST = handle('auth/signup', async (request) => {
    rateLimit(`signup:${clientIp(request)}`, 5, 60 * 60 * 1000);
    const body = await readJson(request);
    const email = validateEmail(body.email);
    const password = validatePassword(body.password);
    const name =
        typeof body.name === 'string' && body.name.trim()
            ? validateString(body.name, 'name', 'Name', MAX_NAME_LENGTH)
            : null;

    const existing = await queryOne('select 1 from users where lower(email) = lower($1)', [email]);
    if (existing) throw conflict('An account with this email already exists.');

    const row = await queryOne<UserRow>(
        `insert into users (email, display_name, password_hash) values ($1, $2, $3)
         returning id, email, display_name, session_version`,
        [email, name, await hashPassword(password)]
    );
    const user = row as UserRow;
    await createSession(user.id, user.session_version);
    return ok({ user: toUser(user) }, 201);
});
