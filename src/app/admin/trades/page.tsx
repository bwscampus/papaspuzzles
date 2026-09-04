'use client';

import { useMemo, useState } from 'react';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { useAdminData } from '@/components/admin/useAdminData';
import { StatusBadge } from '@/components/StatusBadge';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/client/api';
import { TRADE_STATUSES, dropoffSlotLabel, pieceLabel } from '@/lib/constants';
import type { TradeSummary } from '@/lib/types';

export default function AdminTradesPage() {
    const [status, setStatus] = useState('pending');
    const { data, error, run, busyId } = useAdminData<TradeSummary[]>(
        `/api/admin/trades${status ? `?status=${status}` : ''}`
    );

    const columns = useMemo<Column<TradeSummary>[]>(
        () => [
            {
                key: 'trader',
                header: 'Trader',
                render: (t) => (
                    <div>
                        <p className="font-semibold">{t.traderName}</p>
                        <p className="text-xs text-muted">{t.traderEmail}</p>
                        <Badge tone={t.tier === 'new' ? 'accent' : 'success'} className="mt-1">
                            {t.tier === 'new' ? 'New · 2 for 1' : 'Returning · 1 for 1'}
                        </Badge>
                    </div>
                ),
            },
            {
                key: 'given',
                header: 'Gives',
                render: (t) => (
                    <ul className="flex flex-col gap-1">
                        {t.given.map((g) => (
                            <li key={g.id} className="flex items-center gap-2">
                                <span>
                                    {g.name}{' '}
                                    <span className="text-xs text-muted">({pieceLabel(g.pieces)})</span>
                                </span>
                                <StatusBadge status={g.status} />
                            </li>
                        ))}
                    </ul>
                ),
            },
            {
                key: 'received',
                header: 'Receives',
                render: (t) => (
                    <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.received.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        <span>
                            {t.received.name}{' '}
                            <span className="text-xs text-muted">({pieceLabel(t.received.pieces)})</span>
                        </span>
                    </div>
                ),
            },
            {
                key: 'dropoff',
                header: 'Drop-off',
                render: (t) => (
                    <span>
                        {t.dropoffDate}
                        <br />
                        <span className="text-muted">{dropoffSlotLabel(t.dropoffSlot)}</span>
                    </span>
                ),
            },
            { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
            {
                key: 'actions',
                header: 'Actions',
                className: 'text-right',
                render: (t) =>
                    t.status === 'pending' ? (
                        <div className="flex justify-end gap-1">
                            <Button
                                size="sm"
                                loading={busyId === t.id}
                                onClick={() =>
                                    run(
                                        t.id,
                                        () => api.post(`/api/admin/trades/${t.id}`, { action: 'complete' }),
                                        'Trade completed.'
                                    )
                                }
                            >
                                Complete
                            </Button>
                            <ConfirmButton
                                label="Cancel"
                                confirmLabel="Cancel trade"
                                busy={busyId === t.id}
                                onConfirm={() =>
                                    run(
                                        t.id,
                                        () => api.post(`/api/admin/trades/${t.id}`, { action: 'cancel' }),
                                        'Trade cancelled; puzzle released.'
                                    )
                                }
                            />
                        </div>
                    ) : (
                        <span className="text-xs text-muted">
                            {t.completedAt
                                ? new Date(t.completedAt).toLocaleDateString()
                                : t.cancelledAt
                                  ? new Date(t.cancelledAt).toLocaleDateString()
                                  : ''}
                        </span>
                    ),
            },
        ],
        [busyId, run]
    );

    return (
        <div className="flex flex-col gap-6">
            <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="All"
                options={TRADE_STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
                className="w-52"
            />
            {error ? (
                <Alert tone="error">{error}</Alert>
            ) : data === null ? (
                <div className="flex justify-center py-16 text-primary">
                    <Spinner className="h-8 w-8" />
                </div>
            ) : (
                <DataTable columns={columns} rows={data} emptyText="No trades with this status." />
            )}
        </div>
    );
}
