import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { uid, userEmail, donationIds } = await request.json();

        if (!uid || !donationIds?.length) {
            return NextResponse.json({ error: 'uid and donationIds are required' }, { status: 400 });
        }

        const creditsToSpend = donationIds.length;

        // Verify user has enough credits
        const userDoc = await adminDb.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const currentCredits: number = userDoc.data()?.credits ?? 0;
        if (currentCredits < creditsToSpend) {
            return NextResponse.json({ error: `Not enough credits. You have ${currentCredits}, need ${creditsToSpend}.` }, { status: 400 });
        }

        // Verify all selected puzzles are still available
        const puzzleDocs = await Promise.all(
            donationIds.map((id: string) => adminDb.collection('donations').doc(id).get())
        );
        const names: string[] = [];
        for (const doc of puzzleDocs) {
            if (!doc.exists || doc.data()?.status !== 'available') {
                return NextResponse.json({ error: `Puzzle ${doc.id} is no longer available. Please refresh and try again.` }, { status: 409 });
            }
            names.push(doc.data()?.name ?? doc.id);
        }

        // Commit: mark puzzles as claimed, deduct credits, create redemption record
        const batch = adminDb.batch();

        for (const doc of puzzleDocs) {
            batch.update(doc.ref, { status: 'claimed', claimed_by_uid: uid });
        }

        batch.update(adminDb.collection('users').doc(uid), {
            credits: admin.firestore.FieldValue.increment(-creditsToSpend),
        });

        const redemptionRef = adminDb.collection('redemptions').doc();
        batch.set(redemptionRef, {
            uid,
            user_email: userEmail,
            donation_ids: donationIds,
            donation_names: names,
            credits_spent: creditsToSpend,
            status: 'pending_pickup',
            created_at: new Date().toISOString(),
        });

        await batch.commit();

        return NextResponse.json({ message: 'success', redemptionId: redemptionRef.id });
    } catch (error: unknown) {
        console.error('Redeem error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const snapshot = await adminDb
            .collection('redemptions')
            .orderBy('created_at', 'desc')
            .get();

        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ message: 'success', data });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
