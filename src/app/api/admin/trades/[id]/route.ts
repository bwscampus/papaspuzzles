import { NextResponse } from 'next/server';
import { query, queryOne, errorResponse } from '@/lib/db';
import { requireAdminSession } from '@/lib/adminAuth';

const EDITABLE_FIELDS = ['status', 'dropoff_datetime', 'completed_at'] as const;

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authError = await requireAdminSession();
    if (authError) return authError;

    try {
        const { id } = await params;
        const body = await request.json();
        const { action } = body;

        if (action === 'confirm_dropoff') {
            const trade = await queryOne<{ uid: string | null; user_email: string | null; user_name: string | null }>(
                'select uid, user_email, user_name from trades where id = $1',
                [id]
            );
            if (!trade) {
                return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
            }

            await query("update trades set status = 'completed', completed_at = now() where id = $1", [id]);

            // Bump the user's completed trade count (creates the user row if needed).
            if (trade.uid) {
                await query(
                    'select increment_user_counters($1, 0, 0, 1, $2, $3)',
                    [trade.uid, trade.user_email || null, trade.user_name || null]
                );
            }

            return NextResponse.json({ message: 'success' });
        }

        // Generic update
        const sets: string[] = [];
        const values: unknown[] = [];
        for (const field of EDITABLE_FIELDS) {
            if (!(field in body)) continue;
            values.push(body[field]);
            sets.push(`${field} = $${values.length}`);
        }
        if (sets.length === 0) {
            return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
        }
        values.push(id);
        await query(`update trades set ${sets.join(', ')} where id = $${values.length}`, values);

        return NextResponse.json({ message: 'success' });
    } catch (error: unknown) {
        console.error('PATCH /api/admin/trades/[id] error:', error);
        return errorResponse(error);
    }
}
