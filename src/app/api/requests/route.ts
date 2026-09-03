import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse } from '@/lib/supabaseAdmin';
import { validateString, validateEmail } from '@/lib/validate';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { type, pieces, email } = body;
        const { difficulty } = body;

        try {
            type = validateString(type, 'Type');
            email = validateEmail(email);
            pieces = validateString(pieces, 'Pieces');
        } catch (e: unknown) {
            return NextResponse.json({ error: e instanceof Error ? e.message : 'Validation error' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin()
            .from('requests')
            .insert({
                type,
                pieces,
                difficulty: difficulty ?? null,
                email,
                status: 'pending',
            })
            .select()
            .single();
        if (error) throw error;

        return NextResponse.json({ message: 'success', data });
    } catch (error: unknown) {
        return errorResponse(error);
    }
}
