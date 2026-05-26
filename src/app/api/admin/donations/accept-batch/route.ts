import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

function calculateCredits(count: number, isFirstTimeDonor: boolean): number {
    if (!isFirstTimeDonor) return count;
    // First batch: first 2 puzzles cost 2 to earn 1 credit, rest are 1:1
    // Formula: max(0, count - 1)  →  donate 2 → 1 credit, donate 10 → 9 credits
    return Math.max(0, count - 1);
}

export async function POST(request: Request) {
    const authError = await requireAdminSession();
    if (authError) return authError;

    try {
        const { batchId, donorEmail, donorUid } = await request.json();

        if (!batchId) {
            return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
        }

        // Find all pending puzzles in this batch
        const snapshot = await adminDb
            .collection('donations')
            .where('batch_id', '==', batchId)
            .where('status', '==', 'pending_admin_review')
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ error: 'No pending puzzles found for this batch' }, { status: 404 });
        }

        const count = snapshot.docs.length;

        // Look up user to determine first-time vs repeat donor
        let donationBatchesAccepted = 0;
        let userExists = false;

        if (donorUid) {
            const userDoc = await adminDb.collection('users').doc(donorUid).get();
            if (userDoc.exists) {
                userExists = true;
                donationBatchesAccepted = userDoc.data()?.donationBatchesAccepted ?? 0;
            }
        } else if (donorEmail) {
            const userQuery = await adminDb
                .collection('users')
                .where('email', '==', donorEmail)
                .limit(1)
                .get();
            if (!userQuery.empty) {
                userExists = true;
                donationBatchesAccepted = userQuery.docs[0].data()?.donationBatchesAccepted ?? 0;
            }
        }

        const isFirstTime = donationBatchesAccepted === 0;
        const creditsAwarded = calculateCredits(count, isFirstTime);

        // Batch write: publish all puzzles + award credits
        const writeBatch = adminDb.batch();

        for (const doc of snapshot.docs) {
            writeBatch.update(doc.ref, { status: 'available' });
        }

        if (creditsAwarded > 0 && (donorUid || (donorEmail && userExists))) {
            const resolveUserRef = async () => {
                if (donorUid) return adminDb.collection('users').doc(donorUid);
                const q = await adminDb.collection('users').where('email', '==', donorEmail).limit(1).get();
                return q.docs[0]?.ref ?? null;
            };

            const userRef = await resolveUserRef();
            if (userRef) {
                writeBatch.set(
                    userRef,
                    {
                        credits: admin.firestore.FieldValue.increment(creditsAwarded),
                        donationBatchesAccepted: admin.firestore.FieldValue.increment(1),
                    },
                    { merge: true }
                );
            }
        }

        await writeBatch.commit();

        return NextResponse.json({
            message: 'success',
            puzzlesPublished: count,
            creditsAwarded,
            isFirstTimeDonor: isFirstTime,
        });
    } catch (error: unknown) {
        console.error('Accept batch error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
