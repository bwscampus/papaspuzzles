import { NextResponse } from 'next/server';
import { queryOne, errorResponse } from '@/lib/db';
import { validateString, validateEmail } from '@/lib/validate';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { type, pieces, email } = body;
        const { difficulty } = body;

        try {
            type = validateString(type, 'Type');
            email = validateEmail(email);
            pieces = validateString(pieces, 'Pieces');
        } catch (e: unknown) {
            return NextResponse.json({ error: e instanceof Error ? e.message : 'Validation error' }, { status: 400 });
        }

        const data = await queryOne(
            `insert into requests (type, pieces, difficulty, email, status)
             values ($1, $2, $3, $4, 'pending')
             returning *`,
            [type, pieces, difficulty ?? null, email]
        );

        return NextResponse.json({ message: 'success', data });
    } catch (error: unknown) {
        return errorResponse(error);
    }
}
