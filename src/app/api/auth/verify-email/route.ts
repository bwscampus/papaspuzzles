import { handle, ok, readJson, validationError } from '@/lib/api';
import { toUser, USER_COLUMNS, type UserRow } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { sha256 } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const POST = handle('auth/verify-email', async (request) => {
    rateLimit(`verify:${clientIp(request)}`, 20, 60 * 60 * 1000);
    const body = await readJson(request);
    const token = typeof body.token === 'string' ? body.token : '';
    if (!token) throw validationError('Verification link is missing or invalid.', 'token');
    const tokenHash = sha256(token);

    const user = await withTransaction(async (client) => {
        // Consuming the token and marking the user verified happen together or not at all.
        const { rows: tokens } = await client.query<{ user_id: string }>(
            `update email_verification_tokens set used_at = now()
             where token_hash = $1 and used_at is null and expires_at > now()
             returning user_id`,
            [tokenHash]
        );
        if (!tokens[0]) return null;
        const { rows } = await client.query<UserRow>(
            `update users set email_verified_at = coalesce(email_verified_at, now())
             where id = $1 returning ${USER_COLUMNS}`,
            [tokens[0].user_id]
        );
        return rows[0] ?? null;
    });

    if (!user) {
        throw validationError(
            'This verification link is invalid or has expired. Sign in and request a new one from My Trades.',
            'token'
        );
    }
    return ok({ user: toUser(user) });
});
