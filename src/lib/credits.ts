import type { PoolClient } from 'pg';
import { getPool } from './db';

/**
 * Credits earned when an admin accepts a donation batch.
 * A donor who is still "new" (no completed trade, no accepted batch) earns one
 * less than the puzzle count, mirroring the 2-for-1 trade rule. Everyone else
 * earns one credit per puzzle.
 */
export function creditsForBatch(puzzleCount: number, isNewTrader: boolean): number {
    if (!Number.isInteger(puzzleCount) || puzzleCount <= 0) return 0;
    return isNewTrader ? Math.max(0, puzzleCount - 1) : puzzleCount;
}

type Queryable = Pick<PoolClient, 'query'>;

export async function getCreditBalance(email: string, client: Queryable = getPool()): Promise<number> {
    const { rows } = await client.query<{ balance: number }>('select credit_balance($1) as balance', [email]);
    return rows[0]?.balance ?? 0;
}
