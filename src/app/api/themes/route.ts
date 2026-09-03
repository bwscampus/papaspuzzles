import { NextResponse } from 'next/server';
import { query, errorResponse } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const rows = await query<{ theme: string | null }>('select distinct theme from donations');

        const seen = new Set<string>();
        const themes: string[] = [];

        for (const row of rows) {
            const rawTheme = row.theme;
            if (typeof rawTheme !== 'string') continue;

            const trimmedTheme = rawTheme.trim();
            if (!trimmedTheme) continue;

            const key = trimmedTheme.toLowerCase();
            if (seen.has(key)) continue;

            seen.add(key);
            themes.push(trimmedTheme);
        }

        themes.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        return NextResponse.json({ message: 'success', data: themes });
    } catch (error: unknown) {
        console.error('Themes API error:', error);
        return errorResponse(error, 500);
    }
}
