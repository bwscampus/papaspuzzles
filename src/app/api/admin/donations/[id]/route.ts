import { NextResponse } from 'next/server';
import { query, errorResponse, toPieces } from '@/lib/db';
import { requireAdminSession } from '@/lib/adminAuth';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = await requireAdminSession();
    if (authError) return authError;

    try {
        const { id } = await params;
        await query('delete from donations where id = $1', [id]);
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

        const sets: string[] = [];
        const values: unknown[] = [];
        for (const field of EDITABLE_FIELDS) {
            if (!(field in body)) continue;
            let value: unknown = body[field];
            if (field === 'pieces') value = toPieces(value);
            else if (field === 'theme' && typeof value === 'string') value = value.trim();
            values.push(value);
            sets.push(`${field} = $${values.length}`);
        }

        if (sets.length === 0) {
            return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
        }

        values.push(id);
        await query(`update donations set ${sets.join(', ')} where id = $${values.length}`, values);

        return NextResponse.json({ message: 'success' });
    } catch (error: unknown) {
        return errorResponse(error);
    }
}
