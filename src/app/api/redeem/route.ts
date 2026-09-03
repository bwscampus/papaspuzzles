import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse, isUuid } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { uid, userEmail, donationIds } = await request.json();

        if (!uid || !Array.isArray(donationIds) || donationIds.length === 0) {
            return NextResponse.json({ error: 'uid and donationIds are required' }, { status: 400 });
        }
        if (!donationIds.every(isUuid)) {
            return NextResponse.json({ error: 'One or more puzzle ids are invalid.' }, { status: 400 });
        }

        // Verifies credits + availability, claims puzzles, deducts credits, and records
        // the redemption in a single transaction.
        const { data, error } = await supabaseAdmin().rpc('redeem_puzzles', {
            p_uid: uid,
            p_user_email: userEmail ?? null,
            p_donation_ids: donationIds,
        });
        if (error) throw error;

        return NextResponse.json({ message: 'success', ...(data as object) });
    } catch (error: unknown) {
        console.error('Redeem error:', error);
        return errorResponse(error, 500);
    }
}

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin()
            .from('redemptions')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;

        return NextResponse.json({ message: 'success', data });
    } catch (error: unknown) {
        return errorResponse(error, 500);
    }
}
