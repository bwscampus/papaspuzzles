import { NextResponse } from 'next/server';
import { query, errorResponse } from '@/lib/db';
import { requireAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

interface TradeRow {
    id: string;
    given_donation_ids: string[] | null;
    received_donation_id: string | null;
    [key: string]: unknown;
}

export async function GET() {
    const authError = await requireAdminSession();
    if (authError) return authError;

    try {
        const trades = await query<TradeRow>('select * from trades order by created_at desc');

        // Resolve donation names in a single query.
        const ids = new Set<string>();
        for (const t of trades) {
            for (const id of t.given_donation_ids ?? []) ids.add(id);
            if (t.received_donation_id) ids.add(t.received_donation_id);
        }

        const names = new Map<string, string>();
        if (ids.size > 0) {
            const donations = await query<{ id: string; name: string | null }>(
                'select id, name from donations where id = any($1::uuid[])',
                [Array.from(ids)]
            );
            for (const d of donations) names.set(d.id, d.name || d.id);
        }

        const data = trades.map((trade) => ({
            ...trade,
            given_donation_ids: trade.given_donation_ids ?? [],
            given_donation_names: (trade.given_donation_ids ?? [])
                .filter((id) => names.has(id))
                .map((id) => names.get(id) as string),
            received_donation_name: trade.received_donation_id
                ? names.get(trade.received_donation_id) ?? trade.received_donation_id
                : null,
        }));

        return NextResponse.json({ message: 'success', data });
    } catch (error: unknown) {
        console.error('GET /api/admin/trades error:', error);
        return errorResponse(error);
    }
}
