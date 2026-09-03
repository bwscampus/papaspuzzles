import { NextResponse } from 'next/server';
import { queryOne, errorResponse } from '@/lib/db';
import { requireAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const authError = await requireAdminSession();
    if (authError) return authError;

    try {
        const { batchId, donorEmail, donorUid } = await request.json();

        if (!batchId) {
            return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
        }

        // Publishes all pending puzzles in the batch and awards credits in one transaction.
        const row = await queryOne<{ result: Record<string, unknown> }>(
            'select accept_donation_batch($1, $2, $3) as result',
            [batchId, donorUid || null, donorEmail || null]
        );

        return NextResponse.json({ message: 'success', ...(row?.result ?? {}) });
    } catch (error: unknown) {
        console.error('Accept batch error:', error);
        return errorResponse(error, 500);
    }
}
