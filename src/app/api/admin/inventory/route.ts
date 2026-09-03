import { NextResponse } from 'next/server';
import { queryOne, errorResponse, toPieces } from '@/lib/db';
import { requireAdminSession } from '@/lib/adminAuth';

export async function POST(request: Request) {
    const authError = await requireAdminSession();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { name, pieces, difficulty, theme, condition, email, image_url } = body;

        const data = await queryOne(
            `insert into donations (name, pieces, difficulty, theme, condition, email, image_url, status, source)
             values ($1, $2, $3, $4, $5, $6, $7, 'available', 'admin')
             returning *`,
            [
                name,
                toPieces(pieces),
                difficulty,
                typeof theme === 'string' ? theme.trim() : theme,
                condition,
                email,
                image_url ?? null,
            ]
        );

        return NextResponse.json({ message: 'success', data });
    } catch (error: unknown) {
        return errorResponse(error);
    }
}
