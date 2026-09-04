import { conflict, notFound, validationError } from '@/lib/api';
import { creditsForBatch } from '@/lib/credits';
import { iso, query, queryOne, withTransaction, type Queryable } from '@/lib/db';
import { isReturningTrader } from '@/lib/trader';
import type { AdminDonationBatch, BatchStatus, DonationBatchSummary, PuzzleInput } from '@/lib/types';
import { PUZZLE_COLUMNS, toAdminPuzzle, type PuzzleRow } from './puzzles';

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
    estimatedCredits: number;
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

        const returning = await isReturningTrader(input.email, client);
        return {
            batchId,
            puzzleCount: input.puzzles.length,
            returning,
            estimatedCredits: creditsForBatch(input.puzzles.length, !returning),
        };
    });
}

export interface AcceptResult {
    creditsAwarded: number;
    wasFirstBatch: boolean;
    puzzlesPublished: number;
}

export async function acceptDonationBatch(id: string): Promise<AcceptResult> {
    return withTransaction(async (client) => {
        const batch = await queryOne<{ id: string; donor_email: string; status: string }>(
            'select id, donor_email, status from donation_batches where id = $1 for update',
            [id],
            client
        );
        if (!batch) throw notFound('Donation not found.');
        if (batch.status !== 'pending_review') throw conflict('This donation has already been reviewed.');

        const pending = await queryOne<{ count: number }>(
            `select count(*)::int as count from puzzles where donation_batch_id = $1 and status = 'pending_review'`,
            [id],
            client
        );
        const count = pending?.count ?? 0;
        if (count === 0) {
            throw validationError('No puzzles in this donation are awaiting review. Reject it instead.');
        }

        const wasFirstBatch = !(await isReturningTrader(batch.donor_email, client));
        const credits = creditsForBatch(count, wasFirstBatch);

        await client.query(
            `update puzzles set status = 'available', reviewed_at = now()
             where donation_batch_id = $1 and status = 'pending_review'`,
            [id]
        );
        await client.query(
            `update donation_batches
             set status = 'accepted', credits_awarded = $2, was_first_batch = $3, reviewed_at = now()
             where id = $1`,
            [id, credits, wasFirstBatch]
        );
        if (credits > 0) {
            await client.query(
                `insert into credit_entries (email, delta, reason, donation_batch_id)
                 values ($1, $2, 'donation_accepted', $3)`,
                [batch.donor_email, credits, id]
            );
        }

        return { creditsAwarded: credits, wasFirstBatch, puzzlesPublished: count };
    });
}

export async function rejectDonationBatch(id: string): Promise<void> {
    await withTransaction(async (client) => {
        const batch = await queryOne<{ status: string }>(
            'select status from donation_batches where id = $1 for update',
            [id],
            client
        );
        if (!batch) throw notFound('Donation not found.');
        if (batch.status !== 'pending_review') throw conflict('This donation has already been reviewed.');
        await client.query(
            `update puzzles set status = 'rejected', reviewed_at = now()
             where donation_batch_id = $1 and status = 'pending_review'`,
            [id]
        );
        await client.query(
            `update donation_batches set status = 'rejected', reviewed_at = now() where id = $1`,
            [id]
        );
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
