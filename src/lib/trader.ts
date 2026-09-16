import { getPool, type Queryable } from './db';
import type { TraderStatus } from './types';

/**
 * Taking a puzzle in a trade costs one credit and the pledged puzzles are worth one each once
 * approved, so the trade is allowed when balance + pledged >= 1. Everyone starts at -1, which is
 * why a first trade is two puzzles for one and every later trade is one for one.
 */
export function requiredGivenCount(balance: number): number {
    return Math.max(1, 1 - balance);
}

export async function getTraderStatus(email: string, client: Queryable = getPool()): Promise<TraderStatus> {
    const { rows } = await client.query<{ balance: number; added: number; taken: number }>(
        'select credit_balance($1) as balance, puzzles_added($1) as added, puzzles_taken($1) as taken',
        [email]
    );
    const balance = rows[0]?.balance ?? -1;
    return {
        returning: balance >= 0,
        requiredGiven: requiredGivenCount(balance),
        balance,
        puzzlesAdded: rows[0]?.added ?? 0,
        puzzlesTaken: rows[0]?.taken ?? 0,
    };
}
