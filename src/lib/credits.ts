import { getPool, type Queryable } from './db';

/**
 * Credits are a per-email ledger. Everyone starts at -1 (the constant lives in the
 * credit_balance SQL function). Each approved puzzle you submitted is +1; each puzzle you
 * take costs 1, charged the moment it is requested and refunded if the request is cancelled.
 */

export async function getCreditBalance(email: string, client: Queryable = getPool()): Promise<number> {
    const { rows } = await client.query<{ balance: number }>('select credit_balance($1) as balance', [email]);
    return rows[0]?.balance ?? -1;
}

/**
 * Credits the submitter of each puzzle once it is approved. Idempotent: a puzzle whose
 * ledger already nets +1 is skipped, and a puzzle re-approved after a removal is credited again.
 * Returns how many credits were awarded.
 */
export async function awardPuzzles(client: Queryable, puzzleIds: string[]): Promise<number> {
    if (puzzleIds.length === 0) return 0;
    const { rowCount } = await client.query(
        `insert into credit_entries (email, delta, reason, puzzle_id)
         select p.submitted_by_email, 1, 'puzzle_added', p.id
         from puzzles p
         where p.id = any($1::uuid[])
           and p.submitted_by_email is not null
           and coalesce((select sum(e.delta) from credit_entries e
                          where e.puzzle_id = p.id and e.reason in ('puzzle_added', 'puzzle_removed')), 0) <= 0`,
        [puzzleIds]
    );
    return rowCount ?? 0;
}

/** Takes back the credit for a previously approved puzzle (e.g. admin rejects it later). */
export async function revokePuzzle(client: Queryable, puzzleId: string): Promise<void> {
    await client.query(
        `insert into credit_entries (email, delta, reason, puzzle_id)
         select p.submitted_by_email, -1, 'puzzle_removed', p.id
         from puzzles p
         where p.id = $1
           and p.submitted_by_email is not null
           and coalesce((select sum(e.delta) from credit_entries e
                          where e.puzzle_id = p.id and e.reason in ('puzzle_added', 'puzzle_removed')), 0) > 0`,
        [puzzleId]
    );
}

/** Charges one credit for the puzzle taken in a trade, at request time. */
export async function chargeTrade(client: Queryable, tradeId: string, email: string): Promise<void> {
    await client.query(
        `insert into credit_entries (email, delta, reason, trade_id) values ($1, -1, 'trade_taken', $2)
         on conflict (trade_id) where reason = 'trade_taken' do nothing`,
        [email, tradeId]
    );
}

/** Refunds the trade charge when the trade is cancelled. */
export async function refundTrade(client: Queryable, tradeId: string, email: string): Promise<void> {
    await client.query(
        `insert into credit_entries (email, delta, reason, trade_id)
         select $1, 1, 'trade_cancelled', $2
         where exists (select 1 from credit_entries where trade_id = $2 and reason = 'trade_taken')
         on conflict (trade_id) where reason = 'trade_cancelled' do nothing`,
        [email, tradeId]
    );
}

export async function adjustCredits(
    email: string,
    delta: number,
    note: string | null,
    client: Queryable = getPool()
): Promise<number> {
    await client.query(
        `insert into credit_entries (email, delta, reason, note) values ($1, $2, 'admin_adjustment', $3)`,
        [email, delta, note]
    );
    return getCreditBalance(email, client);
}
