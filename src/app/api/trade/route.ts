import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse, isUuid } from '@/lib/supabaseAdmin';
import { validateString, validateEmail } from '@/lib/validate';
import { FALLBACK_THEME } from '@/lib/puzzleConstants';

type TradeMode = 'swap' | 'donate_only' | 'claim_with_credit';

function toPieces(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { userName, userEmail } = body;
        const {
            uid,
            donations, // array of donation objects
            wantedPuzzleId,
            dropoffDatetime,
            mode,
        } = body;
        const tradeMode: TradeMode = mode === 'donate_only' || mode === 'claim_with_credit' ? mode : 'swap';
        const db = supabaseAdmin();

        try {
            userName = validateString(userName, 'User name');
            userEmail = validateEmail(userEmail);
        } catch (e: unknown) {
            return NextResponse.json({ error: e instanceof Error ? e.message : 'Validation error' }, { status: 400 });
        }

        const submittedDonations = Array.isArray(donations) ? donations : [];
        const requiresDonation = tradeMode !== 'claim_with_credit';
        const requiresClaim = tradeMode !== 'donate_only';

        if (requiresDonation && submittedDonations.length === 0) {
            return NextResponse.json({ error: 'donations array is required' }, { status: 400 });
        }

        if (tradeMode === 'claim_with_credit' && submittedDonations.length > 0) {
            return NextResponse.json({ error: 'Donations are not required when claiming with credits' }, { status: 400 });
        }

        if (requiresClaim) {
            try {
                validateString(wantedPuzzleId, 'Wanted puzzle');
            } catch (e: unknown) {
                return NextResponse.json({ error: e instanceof Error ? e.message : 'Validation error' }, { status: 400 });
            }

            if (!isUuid(wantedPuzzleId)) {
                return NextResponse.json({ error: 'Requested puzzle does not exist' }, { status: 404 });
            }

            const { data: wanted, error: wantedError } = await db
                .from('donations')
                .select('id, status')
                .eq('id', wantedPuzzleId)
                .maybeSingle();
            if (wantedError) throw wantedError;
            if (!wanted) {
                return NextResponse.json({ error: 'Requested puzzle does not exist' }, { status: 404 });
            }
            if (wanted.status !== 'available') {
                return NextResponse.json({ error: 'Requested puzzle is no longer available' }, { status: 400 });
            }
        }

        // Validate each donation's name
        for (const donation of submittedDonations) {
            try {
                validateString(donation.name, 'Donation name');
            } catch (e: unknown) {
                return NextResponse.json({ error: e instanceof Error ? e.message : 'Validation error' }, { status: 400 });
            }
        }

        // 1. Insert donation rows if this mode includes donated puzzles.
        const donationIds: string[] = [];
        if (requiresDonation) {
            const rows = submittedDonations.map((donation) => {
                const trimmedType = typeof donation.type === 'string' ? donation.type.trim() : '';
                return {
                    name: donation.name,
                    pieces: toPieces(donation.pieces),
                    difficulty: 'medium',
                    theme: trimmedType.length > 0 ? trimmedType : FALLBACK_THEME,
                    condition: donation.condition || 'good',
                    email: userEmail,
                    image_url: donation.image || null,
                    status: 'pending_admin_review',
                    uid: uid || null,
                    source: 'trade',
                };
            });

            const { data: inserted, error: insertError } = await db.from('donations').insert(rows).select('id');
            if (insertError) throw insertError;
            for (const row of inserted ?? []) donationIds.push(row.id);
        }

        // Ensure a user row exists (does not overwrite existing counters or names).
        if (uid) {
            const { error: upsertError } = await db
                .from('users')
                .upsert(
                    { uid, email: userEmail || null, display_name: userName || null },
                    { onConflict: 'uid', ignoreDuplicates: true }
                );
            if (upsertError) throw upsertError;
        }

        if (tradeMode === 'donate_only') {
            const creditsEarned = donationIds.length;

            if (uid && creditsEarned > 0) {
                const { error: creditError } = await db.rpc('increment_user_counters', {
                    p_uid: uid,
                    p_credits: creditsEarned,
                });
                if (creditError) throw creditError;
            }

            return NextResponse.json({ message: 'success', mode: tradeMode, creditsEarned });
        }

        if (tradeMode === 'claim_with_credit') {
            if (!uid) {
                return NextResponse.json({ error: 'You must be signed in to claim with credits' }, { status: 400 });
            }

            const { data: userRow, error: userError } = await db
                .from('users')
                .select('credits')
                .eq('uid', uid)
                .maybeSingle();
            if (userError) throw userError;

            if (Number(userRow?.credits ?? 0) < 1) {
                return NextResponse.json({ error: 'Not enough credits to claim a puzzle' }, { status: 400 });
            }

            const { error: debitError } = await db.rpc('increment_user_counters', {
                p_uid: uid,
                p_credits: -1,
            });
            if (debitError) throw debitError;
        }

        // 2. Create the Trade record
        const { data: trade, error: tradeError } = await db
            .from('trades')
            .insert({
                user_name: userName,
                user_email: userEmail,
                uid: uid || null,
                given_donation_ids: donationIds,
                received_donation_id: requiresClaim ? wantedPuzzleId : null,
                dropoff_datetime: dropoffDatetime || null,
                status: 'pending',
                mode: tradeMode,
            })
            .select('id')
            .single();
        if (tradeError) throw tradeError;

        // 3. Mark the requested puzzle as 'traded'
        if (requiresClaim) {
            const { error: markError } = await db
                .from('donations')
                .update({ status: 'traded' })
                .eq('id', wantedPuzzleId);
            if (markError) throw markError;
        }

        return NextResponse.json({ message: 'success', tradeId: trade.id });

    } catch (error: unknown) {
        console.error('Trade error:', error);
        return errorResponse(error);
    }
}
