import { NextResponse } from 'next/server';
import { queryOne, errorResponse } from '@/lib/db';
import { getSessionUid } from '@/lib/session';

export const dynamic = 'force-dynamic';

interface UserRow {
    uid: string;
    email: string | null;
    display_name: string | null;
    completed_trades_count: number;
    credits: number;
    donation_batches_accepted: number;
    created_at: string;
}

/** Keep the camelCase response shape the pages already consume. */
function toResponse(row: UserRow) {
    const completedTradesCount = row.completed_trades_count ?? 0;
    return {
        uid: row.uid,
        email: row.email,
        displayName: row.display_name,
        completedTradesCount,
        credits: row.credits ?? 0,
        donationBatchesAccepted: row.donation_batches_accepted ?? 0,
        createdAt: row.created_at,
        tradeTier: completedTradesCount === 0 ? 'first-time' : 'returning',
    };
}

/** Returns the signed-in user's profile. The `uid` query param is accepted for compatibility but must match the session. */
export async function GET(request: Request) {
    try {
        const uid = await getSessionUid();
        if (!uid) {
            return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
        }

        const requested = new URL(request.url).searchParams.get('uid');
        if (requested && requested !== uid) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const data = await queryOne<UserRow>('select * from users where uid = $1', [uid]);
        if (!data) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'success', data: toResponse(data) });
    } catch (error: unknown) {
        console.error('GET /api/users error:', error);
        return errorResponse(error);
    }
}

/** Updates the signed-in user's display name. Counters are never touched here. */
export async function POST(request: Request) {
    try {
        const uid = await getSessionUid();
        if (!uid) {
            return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
        }

        const body = await request.json();
        const displayName = typeof body.displayName === 'string' ? body.displayName.trim() || null : null;

        const data = await queryOne<UserRow>(
            'update users set display_name = coalesce($1, display_name) where uid = $2 returning *',
            [displayName, uid]
        );
        if (!data) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'success', data: toResponse(data) });
    } catch (error: unknown) {
        console.error('POST /api/users error:', error);
        return errorResponse(error);
    }
}
