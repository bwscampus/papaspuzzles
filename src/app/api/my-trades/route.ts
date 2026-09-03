import { NextResponse } from 'next/server';
import { query, errorResponse } from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

interface TradeRow {
    id: string;
    given_donation_ids: string[] | null;
    received_donation_id: string | null;
    [key: string]: unknown;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    // Signed-in users always see their own trades; the email param is only honoured when signed out.
    const sessionUser = await getSessionUser();
    const email = sessionUser?.email ?? searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    try {
        const trades = await query<TradeRow>(
            'select * from trades where lower(user_email) = lower($1) order by created_at desc',
            [email]
        );

        // Resolve related donations in one query.
        const ids = new Set<string>();
        for (const t of trades) {
            for (const id of t.given_donation_ids ?? []) ids.add(id);
            if (t.received_donation_id) ids.add(t.received_donation_id);
        }

        const donations = new Map<string, { name: string; image_url: string | null }>();
        if (ids.size > 0) {
            const rows = await query<{ id: string; name: string | null; image_url: string | null }>(
                'select id, name, image_url from donations where id = any($1::uuid[])',
                [Array.from(ids)]
            );
            for (const d of rows) donations.set(d.id, { name: d.name ?? '', image_url: d.image_url ?? null });
        }

        const formattedData = trades.map((trade) => {
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
