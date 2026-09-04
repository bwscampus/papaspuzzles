import { conflict, notFound, validationError } from '@/lib/api';
import { iso, query, queryOne, withTransaction, type Queryable } from '@/lib/db';
import { getTraderStatus } from '@/lib/trader';
import type { PuzzleInput, PuzzleStatus, TradeStatus, TradeSummary, TraderTier } from '@/lib/types';
import { PUZZLE_COLUMNS, getPuzzlesByIds, toPublicPuzzle, type PuzzleRow } from './puzzles';

interface TradeRow {
    id: string;
    trader_name: string;
    trader_email: string;
    tier: string;
    received_puzzle_id: string;
    dropoff_date: string;
    dropoff_slot: string;
    status: string;
    completed_at: Date | null;
    cancelled_at: Date | null;
    created_at: Date;
}

const TRADE_COLUMNS =
    'id, trader_name, trader_email, tier, received_puzzle_id, dropoff_date, dropoff_slot, status, completed_at, cancelled_at, created_at';

async function toSummaries(rows: TradeRow[], client?: Queryable): Promise<TradeSummary[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((t) => t.id);
    const received = await getPuzzlesByIds(
        rows.map((t) => t.received_puzzle_id),
        client
    );
    const given = await query<PuzzleRow>(
        `select ${PUZZLE_COLUMNS} from puzzles where given_in_trade_id = any($1::uuid[]) order by created_at`,
        [ids],
        client
    );
    const receivedById = new Map(received.map((p) => [p.id, p]));
    const givenByTrade = new Map<string, PuzzleRow[]>();
    for (const p of given) {
        const list = givenByTrade.get(p.given_in_trade_id as string) ?? [];
        list.push(p);
        givenByTrade.set(p.given_in_trade_id as string, list);
    }

    return rows.map((t) => {
        const receivedRow = receivedById.get(t.received_puzzle_id) as PuzzleRow;
        return {
            id: t.id,
            traderName: t.trader_name,
            traderEmail: t.trader_email,
            tier: t.tier as TraderTier,
            received: toPublicPuzzle(receivedRow),
            given: (givenByTrade.get(t.id) ?? []).map((p) => ({
                ...toPublicPuzzle(p),
                status: p.status as PuzzleStatus,
            })),
            dropoffDate: t.dropoff_date,
            dropoffSlot: t.dropoff_slot,
            status: t.status as TradeStatus,
            completedAt: iso(t.completed_at),
            cancelledAt: iso(t.cancelled_at),
            createdAt: iso(t.created_at) as string,
        };
    });
}

export interface SubmitTradeInput {
    name: string;
    email: string;
    wantedPuzzleId: string;
    givenPuzzles: PuzzleInput[];
    dropoffDate: string;
    dropoffSlot: string;
}

export async function submitTrade(input: SubmitTradeInput): Promise<{ tradeId: string; tier: TraderTier }> {
    return withTransaction(async (client) => {
        const status = await getTraderStatus(input.email, client);
        if (input.givenPuzzles.length !== status.requiredGiven) {
            throw validationError(
                status.returning
                    ? 'Returning traders trade one puzzle for one.'
                    : 'New traders trade two puzzles for one.',
                'givenPuzzles'
            );
        }

        const wanted = await queryOne<{ status: string }>(
            'select status from puzzles where id = $1 for update',
            [input.wantedPuzzleId],
            client
        );
        if (!wanted) throw notFound('That puzzle no longer exists.');
        if (wanted.status !== 'available') {
            throw conflict('That puzzle was just taken. Please pick another one.');
        }

        const tier: TraderTier = status.returning ? 'returning' : 'new';
        const trade = await queryOne<{ id: string }>(
            `insert into trades (trader_name, trader_email, tier, received_puzzle_id, dropoff_date, dropoff_slot)
             values ($1, $2, $3, $4, $5, $6) returning id`,
            [input.name, input.email, tier, input.wantedPuzzleId, input.dropoffDate, input.dropoffSlot],
            client
        );
        const tradeId = (trade as { id: string }).id;

        for (const p of input.givenPuzzles) {
            await client.query(
                `insert into puzzles
                    (name, pieces, theme, condition, image_url, status, source, given_in_trade_id,
                     submitted_by_name, submitted_by_email)
                 values ($1, $2, $3, $4, $5, 'pending_review', 'trade', $6, $7, $8)`,
                [p.name, p.pieces, p.theme, p.condition, p.imageUrl, tradeId, input.name, input.email]
            );
        }

        await client.query(`update puzzles set status = 'reserved' where id = $1`, [input.wantedPuzzleId]);

        return { tradeId, tier };
    });
}

async function lockPending(id: string, client: Queryable): Promise<TradeRow> {
    const trade = await queryOne<TradeRow>(
        `select ${TRADE_COLUMNS} from trades where id = $1 for update`,
        [id],
        client
    );
    if (!trade) throw notFound('Trade not found.');
    if (trade.status !== 'pending') throw conflict('This trade has already been closed.');
    return trade;
}

export async function completeTrade(id: string): Promise<TradeSummary> {
    return withTransaction(async (client) => {
        const trade = await lockPending(id, client);
        await client.query(`update trades set status = 'completed', completed_at = now() where id = $1`, [
            id,
        ]);
        await client.query(`update puzzles set status = 'traded' where id = $1`, [trade.received_puzzle_id]);
        const [summary] = await toSummaries(
            [{ ...trade, status: 'completed', completed_at: new Date() }],
            client
        );
        return summary;
    });
}

export async function cancelTrade(id: string): Promise<TradeSummary> {
    return withTransaction(async (client) => {
        const trade = await lockPending(id, client);
        await client.query(`update trades set status = 'cancelled', cancelled_at = now() where id = $1`, [
            id,
        ]);
        await client.query(`update puzzles set status = 'available' where id = $1 and status = 'reserved'`, [
            trade.received_puzzle_id,
        ]);
        await client.query(
            `update puzzles set status = 'rejected', reviewed_at = now()
             where given_in_trade_id = $1 and status = 'pending_review'`,
            [id]
        );
        const [summary] = await toSummaries(
            [{ ...trade, status: 'cancelled', cancelled_at: new Date() }],
            client
        );
        return summary;
    });
}

export async function adminListTrades(status?: TradeStatus): Promise<TradeSummary[]> {
    const rows = status
        ? await query<TradeRow>(
              `select ${TRADE_COLUMNS} from trades where status = $1 order by created_at desc`,
              [status]
          )
        : await query<TradeRow>(`select ${TRADE_COLUMNS} from trades order by created_at desc`);
    return toSummaries(rows);
}

export async function listTradesForEmail(email: string, client?: Queryable): Promise<TradeSummary[]> {
    const rows = await query<TradeRow>(
        `select ${TRADE_COLUMNS} from trades where lower(trader_email) = lower($1) order by created_at desc`,
        [email],
        client
    );
    return toSummaries(rows, client);
}
