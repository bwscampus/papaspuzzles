import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse } from '@/lib/supabaseAdmin';
import { requireAdminSession } from '@/lib/adminAuth';

const EDITABLE_FIELDS = ['status', 'dropoff_datetime', 'completed_at'] as const;

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = await requireAdminSession();
    if (authError) return authError;

    try {
        const { id } = await params;
        const body = await request.json();
        const { action } = body;
        const db = supabaseAdmin();

        if (action === 'confirm_dropoff') {
            const { data: trade, error: fetchError } = await db
                .from('trades')
                .select('uid, user_email, user_name')
                .eq('id', id)
                .maybeSingle();
            if (fetchError) throw fetchError;
            if (!trade) {
                return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
            }

            const { error: updateError } = await db
                .from('trades')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', id);
            if (updateError) throw updateError;

            // Bump the user's completed trade count (creates the user row if needed).
            if (trade.uid) {
                const { error: rpcError } = await db.rpc('increment_user_counters', {
                    p_uid: trade.uid,
                    p_trades: 1,
                    p_email: trade.user_email || null,
                    p_display_name: trade.user_name || null,
                });
                if (rpcError) throw rpcError;
            }

            return NextResponse.json({ message: 'success' });
        }

        // Generic update
        const update: Record<string, unknown> = {};
        for (const field of EDITABLE_FIELDS) {
            if (field in body) update[field] = body[field];
        }
        if (Object.keys(update).length === 0) {
            return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
        }

        const { error } = await db.from('trades').update(update).eq('id', id);
        if (error) throw error;

        return NextResponse.json({ message: 'success' });
    } catch (error: unknown) {
        console.error('PATCH /api/admin/trades/[id] error:', error);
        return errorResponse(error);
    }
}
