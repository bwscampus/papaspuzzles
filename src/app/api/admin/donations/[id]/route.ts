import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse } from '@/lib/supabaseAdmin';
import { requireAdminSession } from '@/lib/adminAuth';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = await requireAdminSession();
    if (authError) return authError;

    try {
        const { id } = await params;

        const { error } = await supabaseAdmin().from('donations').delete().eq('id', id);
        if (error) throw error;

        return NextResponse.json({ message: 'success' });
    } catch (error: unknown) {
        return errorResponse(error);
    }
}

const EDITABLE_FIELDS = ['name', 'pieces', 'difficulty', 'theme', 'condition', 'email', 'image_url', 'status'] as const;

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = await requireAdminSession();
    if (authError) return authError;

    try {
        const { id } = await params;
        const body = await request.json();

        const update: Record<string, unknown> = {};
        for (const field of EDITABLE_FIELDS) {
            if (!(field in body)) continue;
            const value = body[field];
            if (field === 'pieces') {
                update.pieces = value === '' || value === null || value === undefined ? null : Number(value);
            } else if (field === 'theme' && typeof value === 'string') {
                update.theme = value.trim();
            } else {
                update[field] = value;
            }
        }

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
        }

        const { error } = await supabaseAdmin().from('donations').update(update).eq('id', id);
        if (error) throw error;

        return NextResponse.json({ message: 'success' });
    } catch (error: unknown) {
        return errorResponse(error);
    }
}
