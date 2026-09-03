import { NextResponse } from 'next/server';
import { queryOne, withTransaction, errorResponse } from '@/lib/db';
import { createSession, hashPassword, sha256, toSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const token = typeof body.token === 'string' ? body.token : '';
        const password = typeof body.password === 'string' ? body.password : '';

        if (!token) {
            return NextResponse.json({ error: 'Reset link is missing or invalid.' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
        }

        const tokenHash = sha256(token);
        const record = await queryOne<{ uid: string }>(
            `select uid from password_reset_tokens
             where token_hash = $1 and used_at is null and expires_at > now()`,
            [tokenHash]
        );
        if (!record) {
            return NextResponse.json({ error: 'This reset link is invalid or has expired. Please request a new one.' }, { status: 400 });
        }

        const passwordHash = await hashPassword(password);
        const user = await withTransaction(async (client) => {
            await client.query('update users set password_hash = $1 where uid = $2', [passwordHash, record.uid]);
            await client.query('update password_reset_tokens set used_at = now() where token_hash = $1', [tokenHash]);
            const { rows } = await client.query('select uid, email, display_name from users where uid = $1', [record.uid]);
            return rows[0];
        });

        await createSession(user.uid);
        return NextResponse.json({ user: toSessionUser(user) });
    } catch (error: unknown) {
        console.error('Reset password error:', error);
        return errorResponse(error, 500);
    }
}
