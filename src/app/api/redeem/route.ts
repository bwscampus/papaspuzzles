import { NextResponse } from 'next/server';
import { query, queryOne, errorResponse, isUuid } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { donationIds } = await request.json();

        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'You must be signed in to redeem credits' }, { status: 401 });
        }
        if (!Array.isArray(donationIds) || donationIds.length === 0) {
            return NextResponse.json({ error: 'donationIds are required' }, { status: 400 });
        }
        if (!donationIds.every(isUuid)) {
            return NextResponse.json({ error: 'One or more puzzle ids are invalid.' }, { status: 400 });
        }

        // Verifies credits + availability, claims puzzles, deducts credits, and records
        // the redemption in a single transaction.
        const row = await queryOne<{ result: Record<string, unknown> }>(
            'select redeem_puzzles($1, $2, $3::uuid[]) as result',
            [user.uid, user.email, donationIds]
        );

        return NextResponse.json({ message: 'success', ...(row?.result ?? {}) });
    } catch (error: unknown) {
        console.error('Redeem error:', error);
        return errorResponse(error, 500);
    }
}

export async function GET() {
    try {
        const data = await query('select * from redemptions order by created_at desc');
        return NextResponse.json({ message: 'success', data });
    } catch (error: unknown) {
        return errorResponse(error, 500);
    }
}
