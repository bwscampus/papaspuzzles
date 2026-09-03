import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { query, queryOne, errorResponse } from '@/lib/db';
import { sha256 } from '@/lib/session';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const TOKEN_TTL_MINUTES = 60;

function appOrigin(request: Request): string {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        if (!email) {
            return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
        }

        // Always respond the same way so the endpoint cannot be used to enumerate accounts.
        const response = NextResponse.json({
            message: 'If an account exists for that email, a password reset link has been sent.',
        });

        const user = await queryOne<{ uid: string; email: string }>(
            'select uid, email from users where lower(email) = lower($1) and password_hash is not null',
            [email]
        );
        if (!user) return response;

        const token = randomBytes(32).toString('hex');
        await query(
            `insert into password_reset_tokens (token_hash, uid, expires_at)
             values ($1, $2, now() + ($3 || ' minutes')::interval)`,
            [sha256(token), user.uid, String(TOKEN_TTL_MINUTES)]
        );

        const link = `${appOrigin(request)}/reset-password?token=${token}`;
        await sendEmail({
            to: user.email,
            subject: "Reset your Papa's Puzzles password",
            text: `We received a request to reset your password.\n\nOpen this link to choose a new one (valid for ${TOKEN_TTL_MINUTES} minutes):\n${link}\n\nIf you did not request this, you can ignore this email.`,
            html: `<p>We received a request to reset your password.</p><p><a href="${link}">Choose a new password</a> (valid for ${TOKEN_TTL_MINUTES} minutes).</p><p>If you did not request this, you can ignore this email.</p>`,
        });

        return response;
    } catch (error: unknown) {
        console.error('Forgot password error:', error);
        return errorResponse(error, 500);
    }
}
