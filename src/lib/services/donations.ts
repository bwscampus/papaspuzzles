import { conflict, notFound } from '@/lib/api';
import { awardPuzzles, getCreditBalance } from '@/lib/credits';
import { iso, query, queryOne, withTransaction, type Queryable } from '@/lib/db';
import type { AdminDonationBatch, BatchStatus, DonationBatchSummary, PuzzleInput } from '@/lib/types';
import { PUZZLE_COLUMNS, toAdminPuzzle, type PuzzleRow } from './puzzles';
import { syncBatchStatus } from './review';

interface BatchRow {
    id: string;
    donor_name: string;
    donor_email: string;
    status: string;
    credits_awarded: number | null;
    was_first_batch: boolean | null;
    reviewed_at: Date | null;
    created_at: Date;
    puzzle_count: number;
}

const BATCH_SELECT = `
    select b.id, b.donor_name, b.donor_email, b.status, b.credits_awarded, b.was_first_batch,
           b.reviewed_at, b.created_at,
           (select count(*)::int from puzzles p where p.donation_batch_id = b.id) as puzzle_count
    from donation_batches b`;

function toSummary(row: BatchRow): DonationBatchSummary {
    return {
        id: row.id,
        donorName: row.donor_name,
        donorEmail: row.donor_email,
        status: row.status as BatchStatus,
        puzzleCount: row.puzzle_count,
        creditsAwarded: row.credits_awarded,
        wasFirstBatch: row.was_first_batch,
        reviewedAt: iso(row.reviewed_at),
        createdAt: iso(row.created_at) as string,
    };
}

export interface SubmitDonationInput {
    name: string;
    email: string;
    puzzles: PuzzleInput[];
}

export interface SubmitDonationResult {
    batchId: string;
    puzzleCount: number;
    returning: boolean;
    /** Balance now, before approval. */
    balance: number;
    /** Credits this donation adds once approved (one per puzzle). */
    estimatedCredits: number;
    /** Balance after approval. */
    estimatedBalance: number;
}

export async function submitDonation(input: SubmitDonationInput): Promise<SubmitDonationResult> {
    return withTransaction(async (client) => {
        const batch = await queryOne<{ id: string }>(
            `insert into donation_batches (donor_name, donor_email) values ($1, $2) returning id`,
            [input.name, input.email],
            client
        );
        const batchId = (batch as { id: string }).id;

        for (const p of input.puzzles) {
            await client.query(
                `insert into puzzles
                    (name, pieces, theme, condition, image_url, status, source, donation_batch_id,
                     submitted_by_name, submitted_by_email)
                 values ($1, $2, $3, $4, $5, 'pending_review', 'donation', $6, $7, $8)`,
                [p.name, p.pieces, p.theme, p.condition, p.imageUrl, batchId, input.name, input.email]
            );
        }

        const balance = await getCreditBalance(input.email, client);
        return {
            batchId,
            puzzleCount: input.puzzles.length,
            returning: balance >= 0,
            balance,
            estimatedCredits: input.puzzles.length,
            estimatedBalance: balance + input.puzzles.length,
        };
    });
}

export interface AcceptResult {
    /** Credits the batch has earned so far (one per approved puzzle). */
    creditsAwarded: number;
    puzzlesPublished: number;
}

async function lockBatch(client: Queryable, id: string): Promise<string[]> {
    const batch = await queryOne<{ id: string }>(
        'select id from donation_batches where id = $1 for update',
        [id],
        client
    );
    if (!batch) throw notFound('Donation not found.');
    const pending = await query<{ id: string }>(
        `select id from puzzles where donation_batch_id = $1 and status = 'pending_review' order by created_at for update`,
        [id],
        client
    );
    if (pending.length === 0) throw conflict('Every puzzle in this donation has already been reviewed.');
    return pending.map((r) => r.id);
}

/** Approves every puzzle in the batch still awaiting review. Puzzles can also be reviewed one by one. */
export async function acceptDonationBatch(id: string): Promise<AcceptResult> {
    return withTransaction(async (client) => {
        const pending = await lockBatch(client, id);
        await client.query(
            `update puzzles set status = 'available', reviewed_at = now() where id = any($1::uuid[])`,
            [pending]
        );
        // One credit per approved puzzle, attached to the puzzle so it can never double-count.
        await awardPuzzles(client, pending);
        await syncBatchStatus(client, id);
        const batch = await queryOne<{ credits_awarded: number | null }>(
            'select credits_awarded from donation_batches where id = $1',
            [id],
            client
        );
        return { creditsAwarded: batch?.credits_awarded ?? 0, puzzlesPublished: pending.length };
    });
}

/** Rejects every puzzle in the batch still awaiting review. */
export async function rejectDonationBatch(id: string): Promise<void> {
    await withTransaction(async (client) => {
        const pending = await lockBatch(client, id);
        await client.query(
            `update puzzles set status = 'rejected', reviewed_at = now() where id = any($1::uuid[])`,
            [pending]
        );
        await syncBatchStatus(client, id);
    });
}

export async function adminListBatches(status?: BatchStatus): Promise<AdminDonationBatch[]> {
    const batches = status
        ? await query<BatchRow>(`${BATCH_SELECT} where b.status = $1 order by b.created_at desc`, [status])
        : await query<BatchRow>(`${BATCH_SELECT} order by b.created_at desc`);
    if (batches.length === 0) return [];

    const puzzles = await query<PuzzleRow>(
        `select ${PUZZLE_COLUMNS} from puzzles where donation_batch_id = any($1::uuid[]) order by created_at`,
        [batches.map((b) => b.id)]
    );
    const byBatch = new Map<string, PuzzleRow[]>();
    for (const p of puzzles) {
        const list = byBatch.get(p.donation_batch_id as string) ?? [];
        list.push(p);
        byBatch.set(p.donation_batch_id as string, list);
    }
    return batches.map((b) => ({ ...toSummary(b), puzzles: (byBatch.get(b.id) ?? []).map(toAdminPuzzle) }));
}

export async function listBatchesForEmail(
    email: string,
    client?: Queryable
): Promise<DonationBatchSummary[]> {
    const rows = await query<BatchRow>(
        `${BATCH_SELECT} where lower(b.donor_email) = lower($1) order by b.created_at desc`,
        [email],
        client
    );
    return rows.map(toSummary);
}
