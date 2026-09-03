import { NextResponse } from 'next/server';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

let pool: Pool | null = null;

function sslFor(url: string) {
    const override = process.env.DATABASE_SSL;
    if (override === 'true') return { rejectUnauthorized: false };
    if (override === 'false') return undefined;
    const host = new URL(url).hostname;
    const isPrivate = host.endsWith('.railway.internal') || host === 'localhost' || host === '127.0.0.1';
    return isPrivate ? undefined : { rejectUnauthorized: false };
}

/** Lazily created connection pool (Railway Postgres via DATABASE_URL). Server-only. */
export function getPool(): Pool {
    if (pool) return pool;
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is not set. Add the Postgres service variable in Railway.');
    }
    pool = new Pool({ connectionString, max: 5, ssl: sslFor(connectionString) });
    return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = []
): Promise<T[]> {
    const { rows } = await getPool().query<T>(text, params);
    return rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = []
): Promise<T | null> {
    const rows = await query<T>(text, params);
    return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    try {
        await client.query('begin');
        const result = await fn(client);
        await client.query('commit');
        return result;
    } catch (err) {
        await client.query('rollback');
        throw err;
    } finally {
        client.release();
    }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
    return typeof value === 'string' && UUID_RE.test(value);
}

export function toPieces(value: unknown): number | null {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
}

interface PgError {
    code?: string;
    message?: string;
}

/** Map Postgres error codes (including our custom RAISE codes) to HTTP statuses. */
export function errorStatus(error: PgError | null | undefined, fallback = 400): number {
    switch (error?.code) {
        case 'P0002': // not found (custom)
            return 404;
        case 'P0003': // conflict (custom)
        case '23505': // unique violation
            return 409;
        case 'P0001': // validation (custom)
        case '22P02': // invalid text representation (e.g. bad uuid)
        case '23502': // not null violation
        case '23503': // foreign key violation
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
