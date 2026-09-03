import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await getSessionUser();
        return NextResponse.json({ user });
    } catch (error: unknown) {
        console.error('Session lookup error:', error);
        return NextResponse.json({ user: null });
    }
}
