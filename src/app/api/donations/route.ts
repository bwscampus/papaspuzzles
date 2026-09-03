import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface PuzzleInput {
    name: string;
    pieces?: string | number;
    difficulty?: string;
    theme?: string;
    condition?: string;
    image_url?: string | null;
}

function toPieces(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const db = supabaseAdmin();

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
            const rows = [];

            for (const puzzle of puzzles) {
                if (!puzzle.name?.trim()) {
                    return NextResponse.json({ error: 'Each puzzle must have a name' }, { status: 400 });
                }
                rows.push({
                    name: puzzle.name.trim(),
                    pieces: toPieces(puzzle.pieces),
                    difficulty: puzzle.difficulty || 'medium',
                    theme: puzzle.theme?.trim() || '',
                    condition: puzzle.condition || 'good',
                    image_url: puzzle.image_url || null,
                    email,
                    uid: uid || null,
                    status: 'pending_admin_review',
                    batch_id: batchId,
                    source: 'user_donation',
                });
            }

            const { error } = await db.from('donations').insert(rows);
            if (error) throw error;

            return NextResponse.json({ message: 'success', batchId });
        }

        // Legacy single-puzzle path (used by old donate form)
        const { name, pieces, difficulty, theme, condition, email } = body;
        if (!name?.trim() || !email?.trim()) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        const { data, error } = await db
            .from('donations')
            .insert({
                name: name.trim(),
                pieces: toPieces(pieces),
                difficulty: difficulty || 'medium',
                theme: theme?.trim() || '',
                condition: condition || 'good',
                email,
                status: 'pending_admin_review',
                source: 'user_donation',
            })
            .select('id')
            .single();
        if (error) throw error;

        return NextResponse.json({ message: 'success', id: data.id });
    } catch (error: unknown) {
        console.error('Donation error:', error);
        return errorResponse(error, 500);
    }
}
