import { conflict, notFound, validationError } from '@/lib/api';
import { getCreditBalance } from '@/lib/credits';
import { iso, query, queryOne, withTransaction, type Queryable } from '@/lib/db';
import type { RedemptionStatus, RedemptionSummary, User } from '@/lib/types';
import { PUZZLE_COLUMNS, toPublicPuzzle, type PuzzleRow } from './puzzles';

interface RedemptionRow {
    id: string;
    user_id: string;
    email: string;
    credits_spent: number;
    status: string;
    fulfilled_at: Date | null;
    cancelled_at: Date | null;
    created_at: Date;
}

const REDEMPTION_COLUMNS =
    'id, user_id, email, credits_spent, status, fulfilled_at, cancelled_at, created_at';

async function toSummaries(rows: RedemptionRow[], client?: Queryable): Promise<RedemptionSummary[]> {
    if (rows.length === 0) return [];
    const links = await query<PuzzleRow & { redemption_id: string }>(
        `select rp.redemption_id, ${PUZZLE_COLUMNS.split(', ')
            .map((c) => `p.${c}`)
            .join(', ')}
         from redemption_puzzles rp join puzzles p on p.id = rp.puzzle_id
         where rp.redemption_id = any($1::uuid[])`,
        [rows.map((r) => r.id)],
        client
    );
    const byRedemption = new Map<string, PuzzleRow[]>();
    for (const p of links) {
        const list = byRedemption.get(p.redemption_id) ?? [];
        list.push(p);
        byRedemption.set(p.redemption_id, list);
    }
    return rows.map((r) => ({
        id: r.id,
        email: r.email,
        creditsSpent: r.credits_spent,
        puzzles: (byRedemption.get(r.id) ?? []).map(toPublicPuzzle),
        status: r.status as RedemptionStatus,
        fulfilledAt: iso(r.fulfilled_at),
        cancelledAt: iso(r.cancelled_at),
        createdAt: iso(r.created_at) as string,
    }));
}

export interface RedeemResult {
    redemptionId: string;
    creditsSpent: number;
    balance: number;
}

/** The single credit-spend path. Serialized per email with an advisory lock. */
export async function redeemPuzzles(user: User, puzzleIds: string[]): Promise<RedeemResult> {
    return withTransaction(async (client) => {
        await client.query('select pg_advisory_xact_lock(hashtext(lower($1)))', [user.email]);

        const need = puzzleIds.length;
        const balance = await getCreditBalance(user.email, client);
        if (balance < need) {
            throw validationError(
                `You have ${balance} credit${balance === 1 ? '' : 's'} but selected ${need} puzzle${need === 1 ? '' : 's'}.`,
                'puzzleIds'
            );
        }

        const rows = await query<{ id: string; status: string }>(
            'select id, status from puzzles where id = any($1::uuid[]) for update',
            [puzzleIds],
            client
        );
        if (rows.length !== need || rows.some((r) => r.status !== 'available')) {
            throw conflict('One or more puzzles were just taken. Please refresh and try again.');
        }

        const redemption = await queryOne<{ id: string }>(
            `insert into redemptions (user_id, email, credits_spent) values ($1, $2, $3) returning id`,
            [user.id, user.email, need],
            client
        );
        const redemptionId = (redemption as { id: string }).id;

        for (const id of puzzleIds) {
            await client.query('insert into redemption_puzzles (redemption_id, puzzle_id) values ($1, $2)', [
                redemptionId,
                id,
            ]);
        }
        await client.query(`update puzzles set status = 'reserved' where id = any($1::uuid[])`, [puzzleIds]);
        await client.query(
            `insert into credit_entries (email, delta, reason, redemption_id) values ($1, $2, 'redemption', $3)`,
            [user.email, -need, redemptionId]
        );

        return { redemptionId, creditsSpent: need, balance: balance - need };
    });
}

async function lockPending(id: string, client: Queryable): Promise<RedemptionRow> {
    const row = await queryOne<RedemptionRow>(
        `select ${REDEMPTION_COLUMNS} from redemptions where id = $1 for update`,
        [id],
        client
    );
    if (!row) throw notFound('Pickup not found.');
    if (row.status !== 'pending_pickup') throw conflict('This pickup has already been closed.');
    return row;
}

export async function fulfillRedemption(id: string): Promise<RedemptionSummary> {
    return withTransaction(async (client) => {
        const row = await lockPending(id, client);
        await client.query(
            `update redemptions set status = 'fulfilled', fulfilled_at = now() where id = $1`,
            [id]
        );
        await client.query(
            `update puzzles set status = 'claimed'
             where id in (select puzzle_id from redemption_puzzles where redemption_id = $1)`,
            [id]
        );
        const [summary] = await toSummaries(
            [{ ...row, status: 'fulfilled', fulfilled_at: new Date() }],
            client
        );
        return summary;
    });
}

export async function cancelRedemption(id: string): Promise<RedemptionSummary> {
    return withTransaction(async (client) => {
        const row = await lockPending(id, client);
        await client.query(
            `update redemptions set status = 'cancelled', cancelled_at = now() where id = $1`,
            [id]
        );
        await client.query(
            `update puzzles set status = 'available'
             where status = 'reserved'
               and id in (select puzzle_id from redemption_puzzles where redemption_id = $1)`,
            [id]
        );
        await client.query(
            `insert into credit_entries (email, delta, reason, redemption_id)
             values ($1, $2, 'redemption_cancelled', $3)`,
            [row.email, row.credits_spent, id]
        );
        const [summary] = await toSummaries(
            [{ ...row, status: 'cancelled', cancelled_at: new Date() }],
            client
        );
        return summary;
    });
}

export async function adminListRedemptions(status?: RedemptionStatus): Promise<RedemptionSummary[]> {
    const rows = status
        ? await query<RedemptionRow>(
              `select ${REDEMPTION_COLUMNS} from redemptions where status = $1 order by created_at desc`,
              [status]
          )
        : await query<RedemptionRow>(
              `select ${REDEMPTION_COLUMNS} from redemptions order by created_at desc`
          );
    return toSummaries(rows);
}

export async function listRedemptionsForEmail(
    email: string,
    client?: Queryable
): Promise<RedemptionSummary[]> {
    const rows = await query<RedemptionRow>(
        `select ${REDEMPTION_COLUMNS} from redemptions where lower(email) = lower($1) order by created_at desc`,
        [email],
        client
    );
    return toSummaries(rows, client);
}
