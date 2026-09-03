import { NextResponse } from 'next/server';
import { queryOne, errorResponse } from '@/lib/db';
import { createSession, toSessionUser, verifyPassword } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        const row = await queryOne<{ uid: string; email: string | null; display_name: string | null; password_hash: string | null }>(
            'select uid, email, display_name, password_hash from users where lower(email) = lower($1) and password_hash is not null',
            [email]
        );

        if (!row || !(await verifyPassword(password, row.password_hash))) {
            return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
        }

        await createSession(row.uid);
        return NextResponse.json({ user: toSessionUser(row) });
    } catch (error: unknown) {
        console.error('Signin error:', error);
        return errorResponse(error, 500);
    }
}
