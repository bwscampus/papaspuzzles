'use client';

import { useMemo } from 'react';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { useAdminData } from '@/components/admin/useAdminData';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/lib/client/api';
import { pieceLabel } from '@/lib/constants';
import type { AdminPuzzle } from '@/lib/types';

/** Puzzles given to our charity partner. They are hidden from Explore until put back. */
export default function AdminDonatedPage() {
    const { data, error, run, busyId } = useAdminData<AdminPuzzle[]>('/api/admin/puzzles?status=donated');

    const columns = useMemo<Column<AdminPuzzle>[]>(
        () => [
            {
                key: 'puzzle',
                header: 'Puzzle',
                render: (p) => (
                    <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                        <div>
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs text-muted">
                                {pieceLabel(p.pieces)} pcs · {p.theme}
                            </p>
                        </div>
                    </div>
                ),
            },
            {
                key: 'source',
                header: 'From',
                render: (p) => (
                    <div>
                        <p className="capitalize">{p.source}</p>
                        {p.submittedByEmail && <p className="text-xs text-muted">{p.submittedByEmail}</p>}
                    </div>
                ),
            },
            { key: 'date', header: 'Added', render: (p) => new Date(p.createdAt).toLocaleDateString() },
            {
                key: 'actions',
                header: 'Actions',
                className: 'text-right',
                render: (p) => (
                    <div className="flex justify-end">
                        <ConfirmButton
                            label="Add back to Explore"
                            confirmLabel="Add back"
                            variant="secondary"
                            busy={busyId === p.id}
                            onConfirm={() =>
                                run(
                                    p.id,
                                    () => api.post(`/api/admin/puzzles/${p.id}/donated`, { donated: false }),
                                    `${p.name} is back on Explore.`
                                )
                            }
                        />
                    </div>
                ),
            },
        ],
        [busyId, run]
    );

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-xl">Donated Puzzles</h2>
                <p className="mt-1 text-sm text-muted">
                    {data ? `${data.length} puzzle${data.length === 1 ? '' : 's'} given to charity. ` : ''}
                    These are hidden from Explore and cannot be traded or picked up. Add one back when it is
                    in hand again.
                </p>
            </div>

            {error ? (
                <Alert tone="error">{error}</Alert>
            ) : data === null ? (
                <div className="flex justify-center py-16 text-primary-text">
                    <Spinner className="h-8 w-8" />
                </div>
            ) : (
                <DataTable columns={columns} rows={data} emptyText="No donated puzzles." />
            )}
        </div>
    );
}
