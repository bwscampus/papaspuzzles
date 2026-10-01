import { iso, query } from '@/lib/db';
import type { WaitlistEntry, WaitlistSource } from '@/lib/types';

interface WaitlistRow {
    id: string;
    email: string;
    zip: string;
    source: string;
    created_at: Date;
}

export interface JoinWaitlistInput {
    email: string;
    zip: string;
    source: WaitlistSource;
}

/** Joining twice is not an error: the latest ZIP and source replace the earlier ones. */
export async function joinWaitlist(input: JoinWaitlistInput): Promise<void> {
    await query(
        `insert into waitlist (email, zip, source) values ($1, $2, $3)
         on conflict ((lower(email)))
         do update set zip = excluded.zip, source = excluded.source, updated_at = now()`,
        [input.email, input.zip, input.source]
    );
}

export async function adminListWaitlist(): Promise<WaitlistEntry[]> {
    const rows = await query<WaitlistRow>(
        'select id, email, zip, source, created_at from waitlist order by created_at desc'
    );
    return rows.map((r) => ({
        id: r.id,
        email: r.email,
        zip: r.zip,
        source: r.source as WaitlistSource,
        createdAt: iso(r.created_at) as string,
    }));
}
