import { NextResponse } from 'next/server';
import { supabaseAdmin, errorResponse } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin().from('donations').select('theme');
        if (error) throw error;

        const seen = new Set<string>();
        const themes: string[] = [];

        for (const row of data ?? []) {
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
