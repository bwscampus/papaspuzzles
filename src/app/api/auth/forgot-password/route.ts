import { randomBytes } from 'node:crypto';
import { handle, ok, readJson } from '@/lib/api';
import { query, queryOne } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { sha256 } from '@/lib/session';
import { validateEmail } from '@/lib/validate';

export const dynamic = 'force-dynamic';

const TOKEN_TTL_MINUTES = 60;

/** Reset links only ever point at APP_URL; a request's Host header is never trusted for this. */
function appOrigin(request: Request): string {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
    if (process.env.NODE_ENV !== 'production') return new URL(request.url).origin;
    throw new Error('APP_URL must be set in production.');
}

export const POST = handle('auth/forgot-password', async (request) => {
    rateLimit(`forgot:${clientIp(request)}`, 5, 60 * 60 * 1000);
    const body = await readJson(request);
    const email = validateEmail(body.email);

    // Same response whether or not the account exists.
    const user = await queryOne<{ id: string; email: string }>(
        'select id, email from users where lower(email) = lower($1)',
        [email]
    );
    if (user) {
        const token = randomBytes(32).toString('hex');
        await query(
            `insert into password_reset_tokens (token_hash, user_id, expires_at)
             values ($1, $2, now() + ($3 || ' minutes')::interval)`,
            [sha256(token), user.id, String(TOKEN_TTL_MINUTES)]
        );
        const link = `${appOrigin(request)}/reset-password?token=${token}`;
        await sendEmail({
            to: user.email,
            subject: "Reset your Papa's Puzzles password",
            text: `We received a request to reset your password.\n\nOpen this link to choose a new one (valid for ${TOKEN_TTL_MINUTES} minutes):\n${link}\n\nIf you did not request this, you can ignore this email.`,
            html: `<p>We received a request to reset your password.</p><p><a href="${link}">Choose a new password</a> (valid for ${TOKEN_TTL_MINUTES} minutes).</p><p>If you did not request this, you can ignore this email.</p>`,
        });
    }
    return ok({});
});
