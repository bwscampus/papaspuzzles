import { NextResponse } from 'next/server';
import { query, errorResponse } from '@/lib/db';
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

        await query('update redemptions set status = $1 where id = $2', [status, id]);

        return NextResponse.json({ message: 'success' });
    } catch (error: unknown) {
        return errorResponse(error);
    }
}
