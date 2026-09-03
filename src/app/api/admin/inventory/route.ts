import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse } from '@/lib/supabaseAdmin';
import { requireAdminSession } from '@/lib/adminAuth';

export async function POST(request: Request) {
    const authError = await requireAdminSession();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { name, pieces, difficulty, theme, condition, email, image_url } = body;

        const { data, error } = await supabaseAdmin()
            .from('donations')
            .insert({
                name,
                pieces: pieces === '' || pieces === null || pieces === undefined ? null : Number(pieces),
                difficulty,
                theme: typeof theme === 'string' ? theme.trim() : theme,
                condition,
                email,
                image_url: image_url ?? null,
                status: 'available', // Explicitly set as available for trade
                source: 'admin',
            })
            .select()
            .single();
        if (error) throw error;

        return NextResponse.json({ message: 'success', data });
    } catch (error: unknown) {
        return errorResponse(error);
    }
}
