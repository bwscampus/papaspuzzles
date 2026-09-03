import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface TradeRow {
    id: string;
    given_donation_ids: string[] | null;
    received_donation_id: string | null;
    [key: string]: unknown;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
        const db = supabaseAdmin();
        const { data: trades, error } = await db
            .from('trades')
            .select('*')
            .eq('user_email', email)
            .order('created_at', { ascending: false });
        if (error) throw error;

        // Resolve related donations in one query (SQL join equivalent of the old NoSQL lookups).
        const ids = new Set<string>();
        for (const t of trades as TradeRow[]) {
            for (const id of t.given_donation_ids ?? []) ids.add(id);
            if (t.received_donation_id) ids.add(t.received_donation_id);
        }

        const donations = new Map<string, { name: string; image_url: string | null }>();
        if (ids.size > 0) {
            const { data, error: donationError } = await db
                .from('donations')
                .select('id, name, image_url')
                .in('id', Array.from(ids));
            if (donationError) throw donationError;
            for (const d of data ?? []) donations.set(d.id, { name: d.name ?? '', image_url: d.image_url ?? null });
        }

        const formattedData = (trades as TradeRow[]).map((trade) => {
            const givenNames = (trade.given_donation_ids ?? [])
                .map((id) => donations.get(id)?.name)
                .filter((name): name is string => !!name);
            const received = trade.received_donation_id ? donations.get(trade.received_donation_id) : undefined;

            return {
                ...trade,
                given_name: givenNames.join(', '),
                received_name: received?.name ?? '',
                received_image: received?.image_url ?? '',
            };
        });

        return NextResponse.json({ message: 'success', data: formattedData });
    } catch (error: unknown) {
        console.error('MyTrades error:', error);
        return errorResponse(error);
    }
}
