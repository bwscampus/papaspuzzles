import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { handle, notFound } from '@/lib/api';
import { buildAuthUrl, isGoogleEnabled, randomToken } from '@/lib/google';

export const dynamic = 'force-dynamic';

const TEN_MINUTES = 10 * 60;

function safeNext(value: string | null): string {
    return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

/** Starts the Google sign-in. State and PKCE verifier live in short-lived httpOnly cookies. */
export const GET = handle('auth/google/start', async (request) => {
    if (!isGoogleEnabled()) throw notFound('Google sign-in is not configured.');
    const state = randomToken();
    const verifier = randomToken(48);
    const next = safeNext(new URL(request.url).searchParams.get('next'));

    const jar = await cookies();
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/api/auth/google',
        maxAge: TEN_MINUTES,
    };
    jar.set('pp_google_state', state, options);
    jar.set('pp_google_verifier', verifier, options);
    jar.set('pp_google_next', next, options);

    return NextResponse.redirect(buildAuthUrl(state, verifier));
});
