import { NextResponse } from 'next/server';
import { query, errorResponse } from '@/lib/db';
import { requireAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const authError = await requireAdminSession();
    if (authError) return authError;

    try {
        const data = await query('select * from requests order by created_at desc');
        return NextResponse.json({ message: 'success', data });
    } catch (error: unknown) {
        return errorResponse(error);
    }
}
