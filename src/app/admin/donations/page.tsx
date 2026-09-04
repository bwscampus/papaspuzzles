'use client';

import { useMemo, useState } from 'react';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { useAdminData } from '@/components/admin/useAdminData';
import { StatusBadge } from '@/components/StatusBadge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/client/api';
import { BATCH_STATUSES, REDEMPTION_STATUSES, pieceLabel } from '@/lib/constants';
import type { AdminDonationBatch, CreditEntry, RedemptionSummary } from '@/lib/types';

const REASONS: Record<CreditEntry['reason'], string> = {
    donation_accepted: 'Donation accepted',
    redemption: 'Credits spent',
    redemption_cancelled: 'Pick-up cancelled (refund)',
    admin_adjustment: 'Adjustment',
};

function Loading() {
    return (
        <div className="flex justify-center py-12 text-primary">
            <Spinner className="h-8 w-8" />
        </div>
    );
}

function Batches() {
    const [status, setStatus] = useState('pending_review');
    const { data, error, run, busyId } = useAdminData<AdminDonationBatch[]>(
        `/api/admin/donation-batches${status ? `?status=${status}` : ''}`
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
                    <ul className="flex flex-col gap-1">
                        {b.puzzles.map((p) => (
                            <li key={p.id} className="flex items-center gap-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                                <span>
                                    {p.name}{' '}
                                    <span className="text-xs text-muted">
                                        ({pieceLabel(p.pieces)} · {p.theme})
                                    </span>
                                </span>
                                {b.status !== 'pending_review' && <StatusBadge status={p.status} />}
                            </li>
                        ))}
                    </ul>
                ),
            },
            {
                key: 'credits',
                header: 'Credits',
                render: (b) =>
                    b.creditsAwarded === null ? (
                        <span className="text-muted">—</span>
                    ) : (
                        <span>
                            {b.creditsAwarded}
                            {b.wasFirstBatch && <span className="block text-xs text-muted">first batch</span>}
                        </span>
                    ),
            },
            { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
            {
                key: 'actions',
                header: 'Actions',
                className: 'text-right',
                render: (b) =>
                    b.status === 'pending_review' ? (
                        <div className="flex justify-end gap-1">
                            <Button
                                size="sm"
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
                                            return `Published ${res.puzzlesPublished} puzzle(s); ${res.creditsAwarded} credit(s) awarded.`;
                                        }
                                    )
                                }
                            >
                                Accept
                            </Button>
                            <ConfirmButton
                                label="Reject"
                                busy={busyId === b.id}
                                onConfirm={() =>
                                    run(
                                        b.id,
                                        () =>
                                            api.post(`/api/admin/donation-batches/${b.id}`, {
                                                action: 'reject',
                                            }),
                                        'Donation rejected.'
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
                    <ul>
                        {r.puzzles.map((p) => (
                            <li key={p.id}>
                                {p.name} <span className="text-xs text-muted">({pieceLabel(p.pieces)})</span>
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
                                        'Pick-up fulfilled.'
                                    )
                                }
                            >
                                Fulfil
                            </Button>
                            <ConfirmButton
                                label="Cancel"
                                confirmLabel="Cancel & refund"
                                busy={busyId === r.id}
                                onConfirm={() =>
                                    run(
                                        r.id,
                                        () =>
                                            api.post(`/api/admin/redemptions/${r.id}`, { action: 'cancel' }),
                                        'Pick-up cancelled; credits refunded.'
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

function Ledger() {
    const { data, error } = useAdminData<CreditEntry[]>('/api/admin/credit-entries');
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
