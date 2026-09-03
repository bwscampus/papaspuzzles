import { NextResponse } from 'next/server';
import { query, errorResponse } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await query("select * from donations where status = 'available' order by created_at desc");
        return NextResponse.json({ message: 'success', data });
    } catch (error: unknown) {
        console.error('Inventory error:', error);
        return errorResponse(error, 500);
    }
}
