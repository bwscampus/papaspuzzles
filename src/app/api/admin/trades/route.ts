import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse } from '@/lib/supabaseAdmin';
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
        const db = supabaseAdmin();
        const { data: trades, error } = await db
            .from('trades')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;

        // Resolve donation names in a single query.
        const ids = new Set<string>();
        for (const t of trades as TradeRow[]) {
            for (const id of t.given_donation_ids ?? []) ids.add(id);
            if (t.received_donation_id) ids.add(t.received_donation_id);
        }

        const names = new Map<string, string>();
        if (ids.size > 0) {
            const { data: donations, error: donationError } = await db
                .from('donations')
                .select('id, name')
                .in('id', Array.from(ids));
            if (donationError) throw donationError;
            for (const d of donations ?? []) names.set(d.id, d.name || d.id);
        }

        const data = (trades as TradeRow[]).map((trade) => ({
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
