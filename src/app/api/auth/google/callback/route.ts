import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { UserRow } from '@/lib/auth';
import { withTransaction } from '@/lib/db';
import { exchangeCode, isGoogleEnabled } from '@/lib/google';
import { createSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

function appUrl(path: string): string {
    return `${(process.env.APP_URL ?? '').replace(/\/$/, '')}${path}`;
}

function failure(reason: string): NextResponse {
    return NextResponse.redirect(appUrl(`/?signin=1&auth_error=${encodeURIComponent(reason)}`));
}

/**
 * Completes the Google sign-in: verifies state, exchanges the code, verifies the ID token,
 * then links the Google identity to the account with the same email (creating one if needed).
 */
export async function GET(request: Request) {
    if (!isGoogleEnabled()) return failure('Google sign-in is not configured.');

    const jar = await cookies();
    const expectedState = jar.get('pp_google_state')?.value;
    const verifier = jar.get('pp_google_verifier')?.value;
    const next = jar.get('pp_google_next')?.value ?? '/';
    for (const name of ['pp_google_state', 'pp_google_verifier', 'pp_google_next']) {
        jar.set(name, '', { maxAge: 0, path: '/api/auth/google' });
    }

    const params = new URL(request.url).searchParams;
    const code = params.get('code');
    const state = params.get('state');
    if (params.get('error')) return failure('Google sign-in was cancelled.');
    if (!code || !state || !expectedState || !verifier || state !== expectedState) {
        return failure('Sign-in session expired. Please try again.');
    }

    try {
        const identity = await exchangeCode(code, verifier);
        if (!identity.emailVerified) return failure('Your Google email address is not verified.');
        const email = identity.email.trim().toLowerCase();

        const user = await withTransaction(async (client) => {
            const { rows: bySub } = await client.query<UserRow>(
                'select id, email, display_name, session_version from users where google_sub = $1',
                [identity.sub]
            );
            if (bySub[0]) return bySub[0];

            // Link to the existing account with this email, or create a Google-only account.
            const { rows: byEmail } = await client.query<UserRow>(
                'select id, email, display_name, session_version from users where lower(email) = lower($1) for update',
                [email]
            );
            if (byEmail[0]) {
                const { rows } = await client.query<UserRow>(
                    `update users set google_sub = $2, display_name = coalesce(display_name, $3)
                     where id = $1 returning id, email, display_name, session_version`,
                    [byEmail[0].id, identity.sub, identity.name]
                );
                return rows[0];
            }
            const { rows } = await client.query<UserRow>(
                `insert into users (email, display_name, google_sub)
                 values ($1, $2, $3) returning id, email, display_name, session_version`,
                [email, identity.name, identity.sub]
            );
            return rows[0];
        });

        await createSession(user.id, user.session_version);
        return NextResponse.redirect(appUrl(next.startsWith('/') && !next.startsWith('//') ? next : '/'));
    } catch (error) {
        console.error('[auth/google/callback]', error);
        return failure('Google sign-in failed. Please try again.');
    }
}
