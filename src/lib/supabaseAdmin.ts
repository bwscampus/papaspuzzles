import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the secret (service-role) key.
 * Bypasses RLS, so it must never be imported from client components.
 */
export function supabaseAdmin(): SupabaseClient {
    if (client) return client;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!url || !secretKey) {
        throw new Error(
            'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel.'
        );
    }

    client = createClient(url, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return client;
}

export const PUZZLE_BUCKET = 'puzzles';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
    return typeof value === 'string' && UUID_RE.test(value);
}

interface PgError {
    code?: string;
    message?: string;
}

/** Map Postgres/PostgREST error codes (including our custom RAISE codes) to HTTP statuses. */
export function errorStatus(error: PgError | null | undefined, fallback = 400): number {
    switch (error?.code) {
        case 'P0002': // not found (custom)
        case 'PGRST116': // .single() found no rows
            return 404;
        case 'P0003': // conflict (custom)
            return 409;
        case 'P0001': // validation (custom)
            return 400;
        default:
            return fallback;
    }
}

export function errorResponse(error: unknown, fallback = 400): NextResponse {
    const pg = (error ?? {}) as PgError;
    const message = pg.message ?? (error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: message }, { status: errorStatus(pg, fallback) });
}
