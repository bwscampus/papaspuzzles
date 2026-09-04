import { conflict, notFound, validationError } from '@/lib/api';
import { PUZZLE_STATUSES } from '@/lib/constants';
import { iso, query, queryOne, withTransaction, type Queryable } from '@/lib/db';
import type { AdminPuzzle, Pieces, PublicPuzzle, PuzzleInput, PuzzleStatus, Theme } from '@/lib/types';

export interface PuzzleRow {
    id: string;
    name: string;
    pieces: number;
    theme: string;
    condition: string;
    image_url: string;
    status: string;
    source: string;
    donation_batch_id: string | null;
    given_in_trade_id: string | null;
    submitted_by_name: string | null;
    submitted_by_email: string | null;
    reviewed_at: Date | null;
    created_at: Date;
}

export const PUZZLE_COLUMNS =
    'id, name, pieces, theme, condition, image_url, status, source, donation_batch_id, given_in_trade_id, submitted_by_name, submitted_by_email, reviewed_at, created_at';

export function toPublicPuzzle(row: PuzzleRow): PublicPuzzle {
    return {
        id: row.id,
        name: row.name,
        pieces: row.pieces as Pieces,
        theme: row.theme as Theme,
        condition: row.condition as PublicPuzzle['condition'],
        imageUrl: row.image_url,
    };
}

export function toAdminPuzzle(row: PuzzleRow): AdminPuzzle {
    return {
        ...toPublicPuzzle(row),
        status: row.status as PuzzleStatus,
        source: row.source as AdminPuzzle['source'],
        donationBatchId: row.donation_batch_id,
        givenInTradeId: row.given_in_trade_id,
        submittedByName: row.submitted_by_name,
        submittedByEmail: row.submitted_by_email,
        reviewedAt: iso(row.reviewed_at),
        createdAt: iso(row.created_at) as string,
    };
}

export async function listAvailable(filters: { theme?: Theme; pieces?: Pieces }): Promise<PublicPuzzle[]> {
    const where = ["status = 'available'"];
    const params: unknown[] = [];
    if (filters.theme) {
        params.push(filters.theme);
        where.push(`theme = $${params.length}`);
    }
    if (filters.pieces) {
        params.push(filters.pieces);
        where.push(`pieces = $${params.length}`);
    }
    const rows = await query<PuzzleRow>(
        `select ${PUZZLE_COLUMNS} from puzzles where ${where.join(' and ')} order by created_at desc`,
        params
    );
    return rows.map(toPublicPuzzle);
}

export async function getPuzzlesByIds(ids: string[], client?: Queryable): Promise<PuzzleRow[]> {
    if (ids.length === 0) return [];
    return query<PuzzleRow>(
        `select ${PUZZLE_COLUMNS} from puzzles where id = any($1::uuid[])`,
        [ids],
        client
    );
}

export async function adminList(status?: PuzzleStatus): Promise<AdminPuzzle[]> {
    const rows = status
        ? await query<PuzzleRow>(
              `select ${PUZZLE_COLUMNS} from puzzles where status = $1 order by created_at desc`,
              [status]
          )
        : await query<PuzzleRow>(`select ${PUZZLE_COLUMNS} from puzzles order by created_at desc`);
    return rows.map(toAdminPuzzle);
}

export async function adminGet(id: string): Promise<AdminPuzzle> {
    const row = await queryOne<PuzzleRow>(`select ${PUZZLE_COLUMNS} from puzzles where id = $1`, [id]);
    if (!row) throw notFound('Puzzle not found.');
    return toAdminPuzzle(row);
}

export async function adminCreate(input: PuzzleInput): Promise<AdminPuzzle> {
    const row = await queryOne<PuzzleRow>(
        `insert into puzzles (name, pieces, theme, condition, image_url, status, source, reviewed_at)
         values ($1, $2, $3, $4, $5, 'available', 'admin', now())
         returning ${PUZZLE_COLUMNS}`,
        [input.name, input.pieces, input.theme, input.condition, input.imageUrl]
    );
    return toAdminPuzzle(row as PuzzleRow);
}

/** Statuses an admin may set directly. Reservation and completion happen through trades/redemptions. */
const ADMIN_SETTABLE: PuzzleStatus[] = ['pending_review', 'available', 'rejected'];
const LOCKED: PuzzleStatus[] = ['reserved', 'traded', 'claimed'];

export async function adminUpdate(
    id: string,
    patch: Partial<PuzzleInput> & { status?: PuzzleStatus }
): Promise<AdminPuzzle> {
    if (patch.status && !PUZZLE_STATUSES.includes(patch.status)) {
        throw validationError('Invalid status.', 'status');
    }
    if (patch.status && !ADMIN_SETTABLE.includes(patch.status)) {
        throw validationError(
            'Puzzles become reserved, traded, or claimed through trades and pickups.',
            'status'
        );
    }

    return withTransaction(async (client) => {
        const current = await queryOne<PuzzleRow>(
            `select ${PUZZLE_COLUMNS} from puzzles where id = $1 for update`,
            [id],
            client
        );
        if (!current) throw notFound('Puzzle not found.');
        if (patch.status && LOCKED.includes(current.status as PuzzleStatus)) {
            throw conflict('This puzzle is part of a trade or pickup and cannot change status here.');
        }

        const sets: string[] = [];
        const params: unknown[] = [];
        const columns: Array<[keyof typeof patch, string]> = [
            ['name', 'name'],
            ['pieces', 'pieces'],
            ['theme', 'theme'],
            ['condition', 'condition'],
            ['imageUrl', 'image_url'],
            ['status', 'status'],
        ];
        for (const [key, column] of columns) {
            if (patch[key] !== undefined) {
                params.push(patch[key]);
                sets.push(`${column} = $${params.length}`);
            }
        }
        if (patch.status && patch.status !== 'pending_review') {
            sets.push('reviewed_at = now()');
        }
        if (sets.length === 0) throw validationError('Nothing to update.');

        params.push(id);
        const row = await queryOne<PuzzleRow>(
            `update puzzles set ${sets.join(', ')} where id = $${params.length} returning ${PUZZLE_COLUMNS}`,
            params,
            client
        );
        return toAdminPuzzle(row as PuzzleRow);
    });
}

export async function adminDelete(id: string): Promise<void> {
    await withTransaction(async (client) => {
        const current = await queryOne<PuzzleRow>(
            `select ${PUZZLE_COLUMNS} from puzzles where id = $1 for update`,
            [id],
            client
        );
        if (!current) throw notFound('Puzzle not found.');
        if (LOCKED.includes(current.status as PuzzleStatus)) {
            throw conflict('This puzzle is part of a trade or pickup and cannot be deleted.');
        }
        const referenced = await queryOne(
            `select 1 from trades where received_puzzle_id = $1
             union all select 1 from redemption_puzzles where puzzle_id = $1 limit 1`,
            [id],
            client
        );
        if (referenced)
            throw conflict('This puzzle is referenced by a trade or pickup and cannot be deleted.');
        await client.query('delete from puzzles where id = $1', [id]);
    });
}
