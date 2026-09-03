import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse } from '@/lib/supabaseAdmin';
import { requireAdminSession } from '@/lib/adminAuth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const authError = await requireAdminSession();
    if (authError) return authError;

    try {
        const { id } = await params;
        const { status } = await request.json();

        if (status !== 'pending_pickup' && status !== 'fulfilled') {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const { error } = await supabaseAdmin().from('redemptions').update({ status }).eq('id', id);
        if (error) throw error;

        return NextResponse.json({ message: 'success' });
    } catch (error: unknown) {
        return errorResponse(error);
    }
}
