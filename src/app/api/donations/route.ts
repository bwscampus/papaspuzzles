import { NextResponse } from 'next/server';
import { queryOne, withTransaction, errorResponse, toPieces } from '@/lib/db';
import { getSessionUid } from '@/lib/session';

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
        // The signed-in user (if any) is taken from the session cookie, never from the request body.
        const uid = await getSessionUid();

        // Batch submission from the new donate form
        if (Array.isArray(body.puzzles)) {
            const { email, puzzles } = body as { email: string; puzzles: PuzzleInput[] };

            if (!email || !puzzles.length) {
                return NextResponse.json({ error: 'Email and at least one puzzle are required' }, { status: 400 });
            }
            for (const puzzle of puzzles) {
                if (!puzzle.name?.trim()) {
                    return NextResponse.json({ error: 'Each puzzle must have a name' }, { status: 400 });
                }
            }

            const batchId = crypto.randomUUID();

            await withTransaction(async (client) => {
                for (const puzzle of puzzles) {
                    await client.query(
                        `insert into donations
                            (name, pieces, difficulty, theme, condition, image_url, email, uid, status, batch_id, source)
                         values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_admin_review', $9, 'user_donation')`,
                        [
                            puzzle.name.trim(),
                            toPieces(puzzle.pieces),
                            puzzle.difficulty || 'medium',
                            puzzle.theme?.trim() || '',
                            puzzle.condition || 'good',
                            puzzle.image_url || null,
                            email,
                            uid,
                            batchId,
                        ]
                    );
                }
            });

            return NextResponse.json({ message: 'success', batchId });
        }

        // Legacy single-puzzle path (used by old donate form)
        const { name, pieces, difficulty, theme, condition, email } = body;
        if (!name?.trim() || !email?.trim()) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const row = await queryOne<{ id: string }>(
            `insert into donations (name, pieces, difficulty, theme, condition, email, uid, status, source)
             values ($1, $2, $3, $4, $5, $6, $7, 'pending_admin_review', 'user_donation')
             returning id`,
            [name.trim(), toPieces(pieces), difficulty || 'medium', theme?.trim() || '', condition || 'good', email, uid]
        );

        return NextResponse.json({ message: 'success', id: row?.id });
    } catch (error: unknown) {
        console.error('Donation error:', error);
        return errorResponse(error, 500);
    }
}

