import { conflict, notFound } from '@/lib/api';
import { awardPuzzles, getCreditBalance, revokePuzzle } from '@/lib/credits';
import { queryOne, withTransaction, type Queryable } from '@/lib/db';
import type { AdminPuzzle } from '@/lib/types';
import { PUZZLE_COLUMNS, toAdminPuzzle, type PuzzleRow } from './puzzles';

/**
 * Reviewing donated puzzles one at a time. Trade puzzles are approved by accepting the
 * trade, and admin inventory is created already approved, so only donations come through here.
 */

export type ReviewAction = 'accept' | 'reject' | 'restore';
export const REVIEW_ACTIONS: readonly ReviewAction[] = ['accept', 'reject', 'restore'];

export interface ReviewResult {
    puzzle: AdminPuzzle;
    /** The submitter's balance after this action. */
    balance: number;
}

/**
 * Keeps a donation batch's status in step with its puzzles: pending while any puzzle is
 * still under review, accepted once at least one puzzle was approved, rejected otherwise.
 * `credits_awarded` is what the ledger holds for the batch's puzzles.
 */
export async function syncBatchStatus(client: Queryable, batchId: string): Promise<void> {
    await client.query(
        `with s as (
            select
                count(*) filter (where status = 'pending_review') as pending,
                count(*) filter (where status <> 'rejected') as kept,
                coalesce((select sum(e.delta) from credit_entries e
                          where e.puzzle_id in (select id from puzzles where donation_batch_id = $1)
                            and e.reason in ('puzzle_added', 'puzzle_removed')), 0) as credits
            from puzzles where donation_batch_id = $1
        )
        update donation_batches b
        set status = case when s.pending > 0 then 'pending_review'
                          when s.kept > 0 then 'accepted'
                          else 'rejected' end,
            credits_awarded = case when s.pending > 0 then null else s.credits::int end,
            reviewed_at = case when s.pending > 0 then null else coalesce(b.reviewed_at, now()) end
        from s
        where b.id = $1`,
        [batchId]
    );
}

async function lockPuzzle(client: Queryable, id: string): Promise<PuzzleRow> {
    const row = await queryOne<PuzzleRow>(
        `select ${PUZZLE_COLUMNS} from puzzles where id = $1 for update`,
        [id],
        client
    );
    if (!row) throw notFound('Puzzle not found.');
    if (row.source === 'trade') throw conflict('Trade puzzles are approved by accepting the trade.');
    if (row.source !== 'donation') throw conflict('Only donated puzzles go through review.');
    return row;
}

/** Applies one review action to a puzzle already locked in `client`; returns whether it changed. */
export async function applyReview(client: Queryable, row: PuzzleRow, action: ReviewAction): Promise<void> {
    const status = row.status;
    if (action === 'accept') {
        if (status !== 'pending_review') throw conflict('This puzzle has already been reviewed.');
    } else if (action === 'reject') {
        if (status !== 'pending_review' && status !== 'available') {
            throw conflict('This puzzle cannot be rejected in its current state.');
        }
    } else if (status !== 'rejected') {
        throw conflict('Only rejected puzzles can be restored.');
    }

    const next = action === 'reject' ? 'rejected' : 'available';
    await client.query(`update puzzles set status = $2, reviewed_at = now() where id = $1`, [row.id, next]);
    if (next === 'available') await awardPuzzles(client, [row.id]);
    else await revokePuzzle(client, row.id);
}

export async function reviewPuzzle(id: string, action: ReviewAction): Promise<ReviewResult> {
    return withTransaction(async (client) => {
        const row = await lockPuzzle(client, id);
        await applyReview(client, row, action);
        await syncBatchStatus(client, row.donation_batch_id as string);
        const updated = await queryOne<PuzzleRow>(
            `select ${PUZZLE_COLUMNS} from puzzles where id = $1`,
            [id],
            client
        );
        const balance = row.submitted_by_email ? await getCreditBalance(row.submitted_by_email, client) : -1;
        return { puzzle: toAdminPuzzle(updated as PuzzleRow), balance };
    });
}
