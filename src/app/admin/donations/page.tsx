'use client';

import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { useAdminData } from '@/components/admin/useAdminData';
import { StatusBadge } from '@/components/StatusBadge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/ui/Spinner';
import { api, errorMessage } from '@/lib/client/api';
import { BATCH_STATUSES, REDEMPTION_STATUSES, pieceLabel } from '@/lib/constants';
import type { AdminDonationBatch, AdminPuzzle, CreditEntry, RedemptionSummary } from '@/lib/types';

const REASONS: Record<CreditEntry['reason'], string> = {
    donation_accepted: 'Donation accepted',
    puzzle_added: 'Puzzle approved',
    puzzle_removed: 'Approved puzzle rejected',
    trade_taken: 'Puzzle taken in a trade',
    trade_cancelled: 'Trade cancelled (refund)',
    redemption: 'Credits spent',
    redemption_cancelled: 'Pick-up cancelled (refund)',
    admin_adjustment: 'Adjustment',
};

function Loading() {
    return (
        <div className="flex justify-center py-12 text-primary-text">
            <Spinner className="h-8 w-8" />
        </div>
    );
}

type ReviewResult = { puzzle: AdminPuzzle; balance: number };

function Batches() {
    const [status, setStatus] = useState('pending_review');
    const { data, error, run, busyId } = useAdminData<AdminDonationBatch[]>(
        `/api/admin/donation-batches${status ? `?status=${status}` : ''}`
    );

    const review = useCallback(
        (b: AdminDonationBatch, p: AdminPuzzle, action: 'accept' | 'reject' | 'restore') =>
            run(
                p.id,
                () => api.post<ReviewResult>(`/api/admin/puzzles/${p.id}/review`, { action }),
                (r) => {
                    const { balance } = r as ReviewResult;
                    const verb =
                        action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'restored';
                    return `Puzzle ${verb}. ${b.donorEmail} now has ${balance} credit${balance === 1 ? '' : 's'}.`;
                }
            ),
        [run]
    );

    const columns = useMemo<Column<AdminDonationBatch>[]>(
        () => [
            {
                key: 'donor',
                header: 'Donor',
                render: (b) => (
                    <div>
                        <p className="font-semibold">{b.donorName}</p>
                        <p className="text-xs text-muted">{b.donorEmail}</p>
                        <p className="text-xs text-muted">{new Date(b.createdAt).toLocaleDateString()}</p>
                    </div>
                ),
            },
            {
                key: 'puzzles',
                header: 'Puzzles',
                render: (b) => (
                    <ul className="flex flex-col gap-2">
                        {b.puzzles.map((p) => {
                            const busy = busyId === p.id;
                            return (
                                <li key={p.id} className="flex flex-wrap items-center gap-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={p.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                                    <span>
                                        {p.name}{' '}
                                        <span className="text-xs text-muted">
                                            ({pieceLabel(p.pieces)} · {p.theme})
                                        </span>
                                    </span>
                                    <StatusBadge status={p.status} />
                                    {p.status === 'pending_review' && (
                                        <span className="flex gap-1">
                                            <Button
                                                size="sm"
                                                loading={busy}
                                                onClick={() => review(b, p, 'accept')}
                                            >
                                                Accept
                                            </Button>
                                            <ConfirmButton
                                                label="Reject"
                                                busy={busy}
                                                onConfirm={() => review(b, p, 'reject')}
                                            />
                                        </span>
                                    )}
                                    {p.status === 'rejected' && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            loading={busy}
                                            onClick={() => review(b, p, 'restore')}
                                        >
                                            Restore
                                        </Button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                ),
            },
            {
                key: 'credits',
                header: 'Credits',
                render: (b) =>
                    b.creditsAwarded === null ? <span className="text-muted">—</span> : b.creditsAwarded,
            },
            { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
            {
                key: 'actions',
                header: 'Actions',
                className: 'text-right',
                render: (b) => {
                    const pending = b.puzzles.filter((p) => p.status === 'pending_review').length;
                    if (pending < 2) return null;
                    return (
                        <div className="flex justify-end gap-1">
                            <Button
                                size="sm"
                                variant="outline"
                                loading={busyId === b.id}
                                onClick={() =>
                                    run(
                                        b.id,
                                        () =>
                                            api.post<{ creditsAwarded: number; puzzlesPublished: number }>(
                                                `/api/admin/donation-batches/${b.id}`,
                                                { action: 'accept' }
                                            ),
                                        (r) => {
                                            const res = r as {
                                                creditsAwarded: number;
                                                puzzlesPublished: number;
                                            };
                                            return `Accepted ${res.puzzlesPublished} puzzle(s); ${res.creditsAwarded} credit(s) for this donation.`;
                                        }
                                    )
                                }
                            >
                                Accept all
                            </Button>
                            <ConfirmButton
                                label="Reject all"
                                confirmLabel="Reject all"
                                busy={busyId === b.id}
                                onConfirm={() =>
                                    run(
                                        b.id,
                                        () =>
                                            api.post(`/api/admin/donation-batches/${b.id}`, {
                                                action: 'reject',
                                            }),
                                        'Remaining puzzles rejected.'
                                    )
                                }
                            />
                        </div>
                    );
                },
            },
        ],
        [busyId, run, review]
    );

    return (
        <section aria-labelledby="donations-h" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="donations-h" className="text-2xl">
                    Donations
                </h2>
                <Select
                    label="Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    placeholder="All"
                    options={BATCH_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
                    className="w-48"
                />
            </div>
            {error ? (
                <Alert tone="error">{error}</Alert>
            ) : data === null ? (
                <Loading />
            ) : (
                <DataTable columns={columns} rows={data} emptyText="No donations with this status." />
            )}
        </section>
    );
}

function Pickups() {
    const [status, setStatus] = useState('pending_pickup');
    const { data, error, run, busyId } = useAdminData<RedemptionSummary[]>(
        `/api/admin/redemptions${status ? `?status=${status}` : ''}`
    );

    const columns = useMemo<Column<RedemptionSummary>[]>(
        () => [
            {
                key: 'who',
                header: 'Member',
                render: (r) => (
                    <div>
                        <p className="font-semibold">{r.email}</p>
                        <p className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                ),
            },
            {
                key: 'puzzles',
                header: 'Puzzles',
                render: (r) => (
                    <ul className="flex flex-col gap-1">
                        {r.puzzles.map((p) => (
                            <li key={p.id} className="flex items-center gap-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                                <span>
                                    {p.name}{' '}
                                    <span className="text-xs text-muted">({pieceLabel(p.pieces)})</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                ),
            },
            { key: 'credits', header: 'Credits', render: (r) => r.creditsSpent },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            {
                key: 'actions',
                header: 'Actions',
                className: 'text-right',
                render: (r) =>
                    r.status === 'pending_pickup' ? (
                        <div className="flex justify-end gap-1">
                            <Button
                                size="sm"
                                loading={busyId === r.id}
                                onClick={() =>
                                    run(
                                        r.id,
                                        () =>
                                            api.post(`/api/admin/redemptions/${r.id}`, { action: 'fulfill' }),
                                        'Pick-up accepted.'
                                    )
                                }
                            >
                                Accept
                            </Button>
                            <ConfirmButton
                                label="Reject"
                                confirmLabel="Reject & refund"
                                busy={busyId === r.id}
                                onConfirm={() =>
                                    run(
                                        r.id,
                                        () =>
                                            api.post(`/api/admin/redemptions/${r.id}`, { action: 'cancel' }),
                                        'Pick-up rejected; credits refunded.'
                                    )
                                }
                            />
                        </div>
                    ) : null,
            },
        ],
        [busyId, run]
    );

    return (
        <section aria-labelledby="pickups-h" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="pickups-h" className="text-2xl">
                    Credit pick-ups
                </h2>
                <Select
                    label="Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    placeholder="All"
                    options={REDEMPTION_STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
                    className="w-48"
                />
            </div>
            {error ? (
                <Alert tone="error">{error}</Alert>
            ) : data === null ? (
                <Loading />
            ) : (
                <DataTable columns={columns} rows={data} emptyText="No pick-ups with this status." />
            )}
        </section>
    );
}

function AdjustCredits({ onDone }: { onDone: () => void }) {
    const toast = useToast();
    const [email, setEmail] = useState('');
    const [delta, setDelta] = useState('1');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const r = await api.post<{ email: string; balance: number }>('/api/admin/credit-entries', {
                email,
                delta: Number(delta),
                note,
            });
            toast.success(`${r.email} now has ${r.balance} credit${r.balance === 1 ? '' : 's'}.`);
            setNote('');
            onDone();
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form
            onSubmit={submit}
            noValidate
            className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-card"
        >
            <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-64"
            />
            <Input
                label="Credits (+/−)"
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                className="w-28"
            />
            <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} className="w-64" />
            <Button type="submit" loading={busy}>
                Adjust
            </Button>
        </form>
    );
}

function Ledger() {
    const { data, error, reload } = useAdminData<CreditEntry[]>('/api/admin/credit-entries');
    const columns = useMemo<Column<CreditEntry>[]>(
        () => [
            { key: 'date', header: 'Date', render: (e) => new Date(e.createdAt).toLocaleString() },
            { key: 'email', header: 'Email', render: (e) => e.email },
            { key: 'reason', header: 'Reason', render: (e) => REASONS[e.reason] },
            {
                key: 'delta',
                header: 'Credits',
                className: 'text-right',
                render: (e) => (
                    <span className={e.delta > 0 ? 'text-success' : 'text-danger'}>
                        {e.delta > 0 ? `+${e.delta}` : e.delta}
                    </span>
                ),
            },
        ],
        []
    );
    return (
        <section aria-labelledby="ledger-h" className="flex flex-col gap-4">
            <h2 id="ledger-h" className="text-2xl">
                Credit ledger
            </h2>
            <AdjustCredits onDone={() => void reload()} />
            {error ? (
                <Alert tone="error">{error}</Alert>
            ) : data === null ? (
                <Loading />
            ) : (
                <DataTable columns={columns} rows={data} emptyText="No credits awarded yet." />
            )}
        </section>
    );
}

export default function AdminDonationsPage() {
    return (
        <div className="flex flex-col gap-12">
            <Batches />
            <Pickups />
            <Ledger />
        </div>
    );
}
