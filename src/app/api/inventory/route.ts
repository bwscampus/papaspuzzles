import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin()
            .from('donations')
            .select('*')
            .eq('status', 'available')
            .order('created_at', { ascending: false });
        if (error) throw error;

        return NextResponse.json({ message: 'success', data });
    } catch (error: unknown) {
        console.error('Inventory error:', error);
        return errorResponse(error, 500);
    }
}
