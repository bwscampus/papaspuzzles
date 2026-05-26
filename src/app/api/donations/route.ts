import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

interface PuzzleInput {
    name: string;
    pieces?: string | number;
    difficulty?: string;
    theme?: string;
    condition?: string;
    image_url?: string | null;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Batch submission from the new donate form
        if (Array.isArray(body.puzzles)) {
            const { email, uid, puzzles } = body as {
                email: string;
                uid?: string;
                puzzles: PuzzleInput[];
            };

            if (!email || !puzzles.length) {
                return NextResponse.json({ error: 'Email and at least one puzzle are required' }, { status: 400 });
            }

            const batchId = crypto.randomUUID();
            const now = new Date().toISOString();
            const batch = adminDb.batch();

            for (const puzzle of puzzles) {
                if (!puzzle.name?.trim()) {
                    return NextResponse.json({ error: 'Each puzzle must have a name' }, { status: 400 });
                }
                const ref = adminDb.collection('donations').doc();
                batch.set(ref, {
                    name: puzzle.name.trim(),
                    pieces: puzzle.pieces ? Number(puzzle.pieces) : null,
                    difficulty: puzzle.difficulty || 'medium',
                    theme: puzzle.theme?.trim() || '',
                    condition: puzzle.condition || 'good',
                    image_url: puzzle.image_url || null,
                    email,
                    uid: uid || null,
                    status: 'pending_admin_review',
                    batch_id: batchId,
                    source: 'user_donation',
                    created_at: now,
                });
            }

            await batch.commit();
            return NextResponse.json({ message: 'success', batchId });
        }

        // Legacy single-puzzle path (used by old donate form)
        const { name, pieces, difficulty, theme, condition, email } = body;
        if (!name?.trim() || !email?.trim()) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const docRef = await adminDb.collection('donations').add({
            name: name.trim(),
            pieces: pieces ? Number(pieces) : null,
            difficulty: difficulty || 'medium',
            theme: theme?.trim() || '',
            condition: condition || 'good',
            email,
            status: 'pending_admin_review',
            source: 'user_donation',
            created_at: new Date().toISOString(),
        });

        return NextResponse.json({ message: 'success', id: docRef.id });
    } catch (error: unknown) {
        console.error('Donation error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
