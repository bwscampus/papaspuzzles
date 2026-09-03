import { NextResponse } from 'next/server';
import { queryOne, withTransaction, errorResponse, isUuid, toPieces } from '@/lib/db';
import { getSessionUid } from '@/lib/session';
import { validateString, validateEmail } from '@/lib/validate';
import { FALLBACK_THEME } from '@/lib/puzzleConstants';

type TradeMode = 'swap' | 'donate_only' | 'claim_with_credit';

interface DonationInput {
    name: string;
    pieces?: string | number;
    type?: string;
    condition?: string;
    image?: string | null;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { userName, userEmail } = body;
        const { donations, wantedPuzzleId, dropoffDatetime, mode } = body;
        const tradeMode: TradeMode = mode === 'donate_only' || mode === 'claim_with_credit' ? mode : 'swap';

        // The signed-in user (if any) is taken from the session cookie, never from the request body.
        const uid = await getSessionUid();

        try {
            userName = validateString(userName, 'User name');
            userEmail = validateEmail(userEmail);
        } catch (e: unknown) {
            return NextResponse.json({ error: e instanceof Error ? e.message : 'Validation error' }, { status: 400 });
        }

        const submittedDonations: DonationInput[] = Array.isArray(donations) ? donations : [];
        const requiresDonation = tradeMode !== 'claim_with_credit';
        const requiresClaim = tradeMode !== 'donate_only';

        if (requiresDonation && submittedDonations.length === 0) {
            return NextResponse.json({ error: 'donations array is required' }, { status: 400 });
        }

        if (tradeMode === 'claim_with_credit' && submittedDonations.length > 0) {
            return NextResponse.json({ error: 'Donations are not required when claiming with credits' }, { status: 400 });
        }

        if (tradeMode === 'claim_with_credit' && !uid) {
            return NextResponse.json({ error: 'You must be signed in to claim with credits' }, { status: 401 });
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

            const wanted = await queryOne<{ status: string }>('select status from donations where id = $1', [wantedPuzzleId]);
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

        const result = await withTransaction(async (client) => {
            // 1. Insert donation rows if this mode includes donated puzzles.
            const donationIds: string[] = [];
            if (requiresDonation) {
                for (const donation of submittedDonations) {
                    const trimmedType = typeof donation.type === 'string' ? donation.type.trim() : '';
                    const { rows } = await client.query(
                        `insert into donations
                            (name, pieces, difficulty, theme, condition, email, image_url, status, uid, source)
                         values ($1, $2, 'medium', $3, $4, $5, $6, 'pending_admin_review', $7, 'trade')
                         returning id`,
                        [
                            donation.name,
                            toPieces(donation.pieces),
                            trimmedType.length > 0 ? trimmedType : FALLBACK_THEME,
                            donation.condition || 'good',
                            userEmail,
                            donation.image || null,
                            uid,
                        ]
                    );
                    donationIds.push(rows[0].id);
                }
            }

            // Ensure a user row exists (does not overwrite existing counters or names).
            if (uid) {
                await client.query(
                    `insert into users (uid, email, display_name) values ($1, $2, $3)
                     on conflict (uid) do nothing`,
                    [uid, userEmail || null, userName || null]
                );
            }

            if (tradeMode === 'donate_only') {
                const creditsEarned = donationIds.length;
                if (uid && creditsEarned > 0) {
                    await client.query('select increment_user_counters($1, $2)', [uid, creditsEarned]);
                }
                return { mode: tradeMode, creditsEarned };
            }

            if (tradeMode === 'claim_with_credit') {
                const { rows } = await client.query('select credits from users where uid = $1 for update', [uid]);
                if (Number(rows[0]?.credits ?? 0) < 1) {
                    throw Object.assign(new Error('Not enough credits to claim a puzzle'), { code: 'P0001' });
                }
                await client.query('update users set credits = credits - 1 where uid = $1', [uid]);
            }

            // 2. Create the Trade record
            const { rows: tradeRows } = await client.query(
                `insert into trades
                    (user_name, user_email, uid, given_donation_ids, received_donation_id, dropoff_datetime, status, mode)
                 values ($1, $2, $3, $4::uuid[], $5, $6, 'pending', $7)
                 returning id`,
                [userName, userEmail, uid, donationIds, requiresClaim ? wantedPuzzleId : null, dropoffDatetime || null, tradeMode]
            );

            // 3. Mark the requested puzzle as 'traded'
            if (requiresClaim) {
                await client.query("update donations set status = 'traded' where id = $1", [wantedPuzzleId]);
            }

            return { tradeId: tradeRows[0].id as string };
        });

        return NextResponse.json({ message: 'success', ...result });
    } catch (error: unknown) {
        console.error('Trade error:', error);
        return errorResponse(error);
    }
}

