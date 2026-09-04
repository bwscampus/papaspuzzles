'use client';

import { useMemo } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { useAdminData } from '@/components/admin/useAdminData';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import type { AdminUser } from '@/lib/types';

export default function AdminUsersPage() {
    const { data, error } = useAdminData<AdminUser[]>('/api/admin/users');

    const columns = useMemo<Column<AdminUser>[]>(
        () => [
            {
                key: 'user',
                header: 'Account',
                render: (u) => (
                    <div>
                        <p className="font-semibold">{u.displayName ?? '—'}</p>
                        <p className="text-xs text-muted">{u.email}</p>
                    </div>
                ),
            },
            { key: 'joined', header: 'Joined', render: (u) => new Date(u.createdAt).toLocaleDateString() },
            { key: 'credits', header: 'Credits', render: (u) => u.creditBalance },
            { key: 'trades', header: 'Completed trades', render: (u) => u.completedTrades },
            { key: 'batches', header: 'Accepted donations', render: (u) => u.acceptedBatches },
            {
                key: 'tier',
                header: 'Trader',
                render: (u) => (
                    <Badge tone={u.returning ? 'success' : 'accent'}>
                        {u.returning ? 'Returning' : 'New'}
                    </Badge>
                ),
            },
            {
                key: 'admin',
                header: 'Role',
                render: (u) =>
                    u.isAdmin ? <Badge tone="rose">Admin</Badge> : <span className="text-muted">Member</span>,
            },
        ],
        []
    );

    return error ? (
        <Alert tone="error">{error}</Alert>
    ) : data === null ? (
        <div className="flex justify-center py-16 text-primary">
            <Spinner className="h-8 w-8" />
        </div>
    ) : (
        <DataTable columns={columns} rows={data} emptyText="No accounts yet." />
    );
}
