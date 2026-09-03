import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface UserRow {
    uid: string;
    email: string | null;
    display_name: string | null;
    completed_trades_count: number;
    credits: number;
    donation_batches_accepted: number;
    created_at: string;
}

/** Keep the camelCase response shape the pages already consume. */
function toResponse(row: UserRow) {
    const completedTradesCount = row.completed_trades_count ?? 0;
    return {
        uid: row.uid,
        email: row.email,
        displayName: row.display_name,
        completedTradesCount,
        credits: row.credits ?? 0,
        donationBatchesAccepted: row.donation_batches_accepted ?? 0,
        createdAt: row.created_at,
        tradeTier: completedTradesCount === 0 ? 'first-time' : 'returning',
    };
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'uid is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin()
            .from('users')
            .select('*')
            .eq('uid', uid)
            .maybeSingle();
        if (error) throw error;

        if (!data) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'success', data: toResponse(data as UserRow) });
    } catch (error: unknown) {
        console.error('GET /api/users error:', error);
        return errorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { uid, email, displayName } = body;

        if (!uid) {
            return NextResponse.json({ error: 'uid is required' }, { status: 400 });
        }

        const db = supabaseAdmin();
        const { data: existing, error: fetchError } = await db
            .from('users')
            .select('uid')
            .eq('uid', uid)
            .maybeSingle();
        if (fetchError) throw fetchError;

        const profile = { email: email || null, display_name: displayName || null };

        if (!existing) {
            const { error } = await db.from('users').insert({ uid, ...profile });
            if (error) throw error;
        } else {
            // Update display info but do not overwrite counters
            const { error } = await db.from('users').update(profile).eq('uid', uid);
            if (error) throw error;
        }

        const { data, error } = await db.from('users').select('*').eq('uid', uid).single();
        if (error) throw error;

        return NextResponse.json({ message: 'success', data: toResponse(data as UserRow) });
    } catch (error: unknown) {
        console.error('POST /api/users error:', error);
        return errorResponse(error);
    }
}
