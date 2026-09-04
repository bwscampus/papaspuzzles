import { handle, ok, readJson, validationError } from '@/lib/api';
import { toUser, type UserRow } from '@/lib/auth';
import { queryOne, withTransaction } from '@/lib/db';
import { createSession, hashPassword, sha256 } from '@/lib/session';
import { validatePassword } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const POST = handle('auth/reset-password', async (request) => {
    const body = await readJson(request);
    const token = typeof body.token === 'string' ? body.token : '';
    if (!token) throw validationError('Reset link is missing or invalid.', 'token');
    const password = validatePassword(body.password);
    const tokenHash = sha256(token);

    const record = await queryOne<{ user_id: string }>(
        `select user_id from password_reset_tokens
         where token_hash = $1 and used_at is null and expires_at > now()`,
        [tokenHash]
    );
    if (!record) {
        throw validationError(
            'This reset link is invalid or has expired. Please request a new one.',
            'token'
        );
    }

    const passwordHash = await hashPassword(password);
    const user = await withTransaction(async (client) => {
        // Bumping session_version signs out every other device.
        const { rows } = await client.query<UserRow>(
            `update users set password_hash = $1, session_version = session_version + 1
             where id = $2 returning id, email, display_name, session_version`,
            [passwordHash, record.user_id]
        );
        await client.query('update password_reset_tokens set used_at = now() where token_hash = $1', [
            tokenHash,
        ]);
        return rows[0];
    });

    await createSession(user.id, user.session_version);
    return ok({ user: toUser(user) });
});
