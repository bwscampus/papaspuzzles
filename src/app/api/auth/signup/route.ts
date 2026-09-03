import { NextResponse } from 'next/server';
import { queryOne, errorResponse } from '@/lib/db';
import { createSession, hashPassword, toSessionUser } from '@/lib/session';
import { validateEmail } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let email: string;
        try {
            email = validateEmail(body.email);
        } catch {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }
        const password = typeof body.password === 'string' ? body.password : '';
        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
        }

        const existing = await queryOne(
            'select uid from users where lower(email) = lower($1) and password_hash is not null',
            [email]
        );
        if (existing) {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }

        const passwordHash = await hashPassword(password);
        const row = await queryOne<{ uid: string; email: string | null; display_name: string | null }>(
            `insert into users (email, password_hash)
             values ($1, $2)
             returning uid, email, display_name`,
            [email, passwordHash]
        );
        if (!row) throw new Error('Failed to create account');

        await createSession(row.uid);
        return NextResponse.json({ user: toSessionUser(row) });
    } catch (error: unknown) {
        console.error('Signup error:', error);
        if ((error as { code?: string }).code === '23505') {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        return errorResponse(error, 500);
    }
}
