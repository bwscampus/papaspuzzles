import { getPool, type Queryable } from './db';
import type { TraderStatus } from './types';

/**
 * Traders who have not yet added a puzzle to the site give two puzzles to receive one;
 * anyone who has added at least one trades one for one.
 */
export function requiredGivenCount(puzzlesAdded: number): 1 | 2 {
    return puzzlesAdded > 0 ? 1 : 2;
}

export async function getTraderStatus(email: string, client: Queryable = getPool()): Promise<TraderStatus> {
    const { rows } = await client.query<{ added: number; taken: number }>(
        'select puzzles_added($1) as added, puzzles_taken($1) as taken',
        [email]
    );
    const added = rows[0]?.added ?? 0;
    const taken = rows[0]?.taken ?? 0;
    return {
        returning: added > 0,
        requiredGiven: requiredGivenCount(added),
        puzzlesAdded: added,
        puzzlesTaken: taken,
    };
}

export async function isReturningTrader(email: string, client: Queryable = getPool()): Promise<boolean> {
    return (await getTraderStatus(email, client)).returning;
}
