import type { PoolClient } from 'pg';
import { getPool } from './db';
import type { TraderStatus } from './types';

/** New traders give two puzzles to receive one; returning traders trade one for one. */
export function requiredGivenCount(returning: boolean): 1 | 2 {
    return returning ? 1 : 2;
}

type Queryable = Pick<PoolClient, 'query'>;

export async function isReturningTrader(email: string, client: Queryable = getPool()): Promise<boolean> {
    const { rows } = await client.query<{ returning: boolean }>(
        'select is_returning_trader($1) as returning',
        [email]
    );
    return rows[0]?.returning ?? false;
}

export async function getTraderStatus(email: string, client: Queryable = getPool()): Promise<TraderStatus> {
    const returning = await isReturningTrader(email, client);
    return { returning, requiredGiven: requiredGivenCount(returning) };
}
