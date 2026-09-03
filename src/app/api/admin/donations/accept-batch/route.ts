import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse } from '@/lib/supabaseAdmin';
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
        const { data, error } = await supabaseAdmin().rpc('accept_donation_batch', {
            p_batch_id: batchId,
            p_uid: donorUid || null,
            p_email: donorEmail || null,
        });
        if (error) throw error;

        return NextResponse.json({ message: 'success', ...(data as object) });
    } catch (error: unknown) {
        console.error('Accept batch error:', error);
        return errorResponse(error, 500);
    }
}
