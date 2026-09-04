import pg, { Pool, type PoolClient, type QueryResultRow } from 'pg';

// Return DATE columns as 'YYYY-MM-DD' strings instead of local-midnight Date objects.
pg.types.setTypeParser(1082, (value) => value);

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

/** Anything that can run a query: the pool or a transaction client. */
export type Queryable = Pick<PoolClient, 'query'>;

export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
    client: Queryable = getPool()
): Promise<T[]> {
    const { rows } = await client.query<T>(text, params);
    return rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
    client: Queryable = getPool()
): Promise<T | null> {
    const rows = await query<T>(text, params, client);
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

export function iso(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : String(value);
}
