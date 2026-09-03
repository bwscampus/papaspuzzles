import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse } from '@/lib/supabaseAdmin';
import { requireAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const authError = await requireAdminSession();
    if (authError) return authError;

    try {
        const { data, error } = await supabaseAdmin()
            .from('donations')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;

        return NextResponse.json({ message: 'success', data });
    } catch (error: unknown) {
        return errorResponse(error);
    }
}
