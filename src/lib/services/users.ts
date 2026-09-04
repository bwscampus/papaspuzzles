import { isAdminEmail } from '@/lib/auth';
import { getCreditBalance } from '@/lib/credits';
import { iso, query } from '@/lib/db';
import type { AdminUser, CreditEntry, History } from '@/lib/types';
import { listBatchesForEmail } from './donations';
import { listRedemptionsForEmail } from './redemptions';
import { listTradesForEmail } from './trades';

interface AdminUserRow {
    id: string;
    email: string;
    display_name: string | null;
    created_at: Date;
    credit_balance: number;
    completed_trades: number;
    accepted_batches: number;
    returning: boolean;
}

export async function adminListUsers(): Promise<AdminUser[]> {
    const rows = await query<AdminUserRow>(`
        select u.id, u.email, u.display_name, u.created_at,
               credit_balance(u.email) as credit_balance,
               (select count(*)::int from trades t
                 where lower(t.trader_email) = lower(u.email) and t.status = 'completed') as completed_trades,
               (select count(*)::int from donation_batches b
                 where lower(b.donor_email) = lower(u.email) and b.status = 'accepted') as accepted_batches,
               is_returning_trader(u.email) as returning
        from users u
        order by u.created_at desc`);
    return rows.map((r) => ({
        id: r.id,
        email: r.email,
        displayName: r.display_name,
        createdAt: iso(r.created_at) as string,
        creditBalance: r.credit_balance,
        completedTrades: r.completed_trades,
        acceptedBatches: r.accepted_batches,
        returning: r.returning,
        isAdmin: isAdminEmail(r.email),
    }));
}

interface CreditEntryRow {
    id: string;
    email: string;
    delta: number;
    reason: CreditEntry['reason'];
    donation_batch_id: string | null;
    redemption_id: string | null;
    note: string | null;
    created_at: Date;
}

function toEntry(r: CreditEntryRow): CreditEntry {
    return {
        id: r.id,
        email: r.email,
        delta: r.delta,
        reason: r.reason,
        donationBatchId: r.donation_batch_id,
        redemptionId: r.redemption_id,
        note: r.note,
        createdAt: iso(r.created_at) as string,
    };
}

const ENTRY_COLUMNS = 'id, email, delta, reason, donation_batch_id, redemption_id, note, created_at';

export async function listCreditEntries(email?: string): Promise<CreditEntry[]> {
    const rows = email
        ? await query<CreditEntryRow>(
              `select ${ENTRY_COLUMNS} from credit_entries where lower(email) = lower($1) order by created_at desc`,
              [email]
          )
        : await query<CreditEntryRow>(`select ${ENTRY_COLUMNS} from credit_entries order by created_at desc`);
    return rows.map(toEntry);
}

export async function getCredits(email: string): Promise<{ balance: number; entries: CreditEntry[] }> {
    const [balance, entries] = await Promise.all([getCreditBalance(email), listCreditEntries(email)]);
    return { balance, entries };
}

export async function getHistory(email: string): Promise<History> {
    const [trades, donations, redemptions] = await Promise.all([
        listTradesForEmail(email),
        listBatchesForEmail(email),
        listRedemptionsForEmail(email),
    ]);
    return { trades, donations, redemptions };
}
