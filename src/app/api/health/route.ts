import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Railway's healthcheck (rule API-9). Pings the database so a deploy that can't reach
 * Postgres never receives traffic. Reports nothing but up/down: no versions or hostnames.
 */
async function check(): Promise<NextResponse> {
    try {
        await query('select 1');
        return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('[health] database check failed', error);
        return NextResponse.json(
            { status: 'unavailable' },
            { status: 503, headers: { 'Cache-Control': 'no-store' } }
        );
    }
}

export const GET = check;

export async function HEAD(): Promise<NextResponse> {
    const response = await check();
    return new NextResponse(null, { status: response.status, headers: response.headers });
}
